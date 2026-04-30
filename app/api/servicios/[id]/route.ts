import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { registrarCambio } from "@/lib/audit"
import { enviarEmailServicioIniciado, enviarEmailServicioCompletado } from "@/lib/email"

const include = {
  vehiculo: true,
  operario:  { include: { user: { select: { name: true } } } },
  opLavado1: { include: { user: { select: { name: true } } } },
  opLavado2: { include: { user: { select: { name: true } } } },
  opLavado3: { include: { user: { select: { name: true } } } },
  opInterior:{ include: { user: { select: { name: true } } } },
  tipoServicio: true,
  items: { include: { tipoServicio: true } },
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    estado, metodoPago, monto, descuento, total,
    operarioId, observaciones,
    // etapa pipeline — ahora acepta array de IDs
    siguiente, operariosEtapaIds,
  } = body

  const actual = await prisma.servicio.findUnique({ where: { id } })
  if (!actual) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  const data: Record<string, unknown> = {}
  let enviarEmailAlIniciar = false

  // ── Avance de etapa ────────────────────────────────────────────────────────
  if (siguiente) {
    // operariosEtapaIds: string[] con 1-3 IDs
    const opIds: (string | null)[] = Array.isArray(operariosEtapaIds)
      ? [operariosEtapaIds[0] ?? null, operariosEtapaIds[1] ?? null, operariosEtapaIds[2] ?? null]
      : [null, null, null]

    if (actual.estado === "EN_ESPERA") {
      // EN_ESPERA → LAVADO
      data.estado     = "EN_PROCESO"
      data.etapa      = "LAVADO"
      data.horaInicio = new Date()
      data.opLavado1Id = opIds[0]
      data.opLavado2Id = opIds[1]
      data.opLavado3Id = opIds[2]
      enviarEmailAlIniciar = true

    } else if (actual.etapa === "LAVADO") {
      // LAVADO → INTERIOR
      data.etapa = "INTERIOR"
      data.opLavado1Id = opIds[0]
      data.opLavado2Id = opIds[1]
      data.opLavado3Id = opIds[2]

    } else if (actual.etapa === "INTERIOR") {
      // INTERIOR → POR_COBRAR + descontar consumibles
      data.estado      = "POR_COBRAR"
      data.etapa       = null
      data.opInteriorId = opIds[0]
      await descontarConsumiblbles(id, actual.tipoServicioId)
    }

    await registrarCambio({
      entidadTipo: "servicio", entidadId: id,
      campo: "etapa",
      valorAntes: actual.etapa ?? actual.estado,
      valorDespues: (data.etapa as string) ?? (data.estado as string),
      userId: session.user.id, userName: session.user.name ?? session.user.email,
    })
  }

  // ── Cambio directo de estado ───────────────────────────────────────────────
  if (estado && estado !== actual.estado && !siguiente) {
    data.estado = estado

    if (estado === "EN_PROCESO" && !actual.horaInicio) {
      data.horaInicio = new Date()
      data.etapa = "LAVADO"
    }

    if (estado === "COMPLETADO" && !actual.horaSalida) {
      data.horaSalida = new Date()
      if (actual.horaInicio) {
        data.duracionMinutos = Math.round((Date.now() - actual.horaInicio.getTime()) / 60000)
      }
    }

    await registrarCambio({
      entidadTipo: "servicio", entidadId: id,
      campo: "estado", valorAntes: actual.estado, valorDespues: estado,
      userId: session.user.id, userName: session.user.name ?? session.user.email,
    })
  }

  // ── POR_COBRAR → COMPLETADO (registrar pago) ───────────────────────────────
  if (estado === "COMPLETADO" && actual.estado === "POR_COBRAR") {
    data.estado     = "COMPLETADO"
    data.horaSalida = new Date()
    if (actual.horaInicio) {
      data.duracionMinutos = Math.round((Date.now() - actual.horaInicio.getTime()) / 60000)
    }
    await registrarCambio({
      entidadTipo: "servicio", entidadId: id,
      campo: "estado", valorAntes: "POR_COBRAR", valorDespues: "COMPLETADO",
      userId: session.user.id, userName: session.user.name ?? session.user.email,
    })
  }

  if (metodoPago !== undefined)    data.metodoPago    = metodoPago
  if (monto !== undefined)         data.monto         = isNaN(parseFloat(monto))     ? null : parseFloat(monto)
  if (descuento !== undefined)     data.descuento     = isNaN(parseFloat(descuento)) ? 0    : Math.max(0, parseFloat(descuento))
  if (total !== undefined)         data.total         = isNaN(parseFloat(total))     ? null : Math.max(0, parseFloat(total))
  if (operarioId !== undefined)    data.operarioId    = operarioId || null
  if (observaciones !== undefined) data.observaciones = observaciones

  const servicio = await prisma.servicio.update({ where: { id }, data, include })

  const v = servicio.vehiculo
  const nombresServicios = (servicio as typeof servicio & { items?: { nombre: string }[] })
    .items?.map((i) => i.nombre) ?? [servicio.tipoServicio?.nombre ?? "Servicio"]

  // Correo: servicio iniciado
  if (enviarEmailAlIniciar && v?.clienteEmail) {
    const opNombre = [servicio.opLavado1, servicio.opLavado2, servicio.opLavado3]
      .filter(Boolean).map((o) => o!.user.name).join(", ") || servicio.operario?.user.name || "Equipo QuickStop"
    enviarEmailServicioIniciado({
      email: v.clienteEmail as string,
      clienteNombre: v.clienteNombre ?? "",
      placa: v.placa,
      marca: v.marca,
      servicios: nombresServicios,
      operario: opNombre,
      total: servicio.total ?? servicio.monto ?? 0,
      horaInicio: servicio.horaInicio ?? new Date(),
    }).catch(() => {})
  }

  // Correo: servicio completado
  if (servicio.estado === "COMPLETADO" && v?.clienteEmail) {
    enviarEmailServicioCompletado({
      email: v.clienteEmail as string,
      clienteNombre: v.clienteNombre ?? "",
      placa: v.placa,
      marca: v.marca,
      servicios: nombresServicios,
      duracionMinutos: servicio.duracionMinutos,
      total: servicio.total ?? servicio.monto ?? 0,
      metodoPago: servicio.metodoPago,
    }).catch(() => {})
  }

  return NextResponse.json(servicio)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  await prisma.servicio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// ── Helper: descontar consumibles al marcar listo ──────────────────────────
async function descontarConsumiblbles(servicioId: string, tipoServicioId: string | null) {
  if (!tipoServicioId) return

  const configs = await prisma.materialServicio.findMany({
    where: { tipoServicioId },
    include: { material: true },
  })
  if (!configs.length) return

  for (const cfg of configs) {
    if (cfg.cantidadPorServicio <= 0) continue

    await prisma.consumibleUsado.create({
      data: {
        servicioId,
        materialId: cfg.materialId,
        cantidad: cfg.cantidadPorServicio,
        nombre: cfg.material.nombre,
        unidad: cfg.material.unidad,
      },
    })

    const mat = await prisma.material.findUnique({ where: { id: cfg.materialId } })
    if (!mat) continue
    const nuevoStock = Math.max(0, mat.stockTotal - cfg.cantidadPorServicio)
    await prisma.material.update({ where: { id: cfg.materialId }, data: { stockTotal: nuevoStock } })
    await prisma.movimientoMaterial.create({
      data: {
        materialId: cfg.materialId,
        cantidad: cfg.cantidadPorServicio,
        tipo: "SALIDA",
        nota: `Servicio ${servicioId.slice(-6)} completado`,
      },
    })
  }
}
