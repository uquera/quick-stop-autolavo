import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const include = {
  vehiculo: true,
  operario: { include: { user: { select: { name: true } } } },
  bahia: true,
  tipoServicio: true,
  items: { include: { tipoServicio: true } },
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const activos  = searchParams.get("activos") === "true"
  const historial = searchParams.get("historial") === "true"

  try {
    // ── Activos: EN_ESPERA + EN_PROCESO, sin filtro de fecha ──────────────
    if (activos) {
      const servicios = await prisma.servicio.findMany({
        where: { estado: { in: ["EN_ESPERA", "EN_PROCESO"] } },
        include,
        orderBy: { horaIngreso: "asc" },
      })
      return NextResponse.json(servicios)
    }

    // ── Historial de hoy: COMPLETADO + CANCELADO ──────────────────────────
    if (historial) {
      // Usar fecha local del servidor
      const ahora = new Date()
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0)
      const fin    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999)

      const servicios = await prisma.servicio.findMany({
        where: {
          estado: { in: ["COMPLETADO", "CANCELADO"] },
          horaIngreso: { gte: inicio, lte: fin },
        },
        include,
        orderBy: { horaSalida: "desc" },
      })
      return NextResponse.json(servicios)
    }

    // ── Fallback: todos los de hoy (para reportes/caja) ───────────────────
    const ahora = new Date()
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0)
    const fin    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999)

    const servicios = await prisma.servicio.findMany({
      where: { horaIngreso: { gte: inicio, lte: fin } },
      include,
      orderBy: { horaIngreso: "desc" },
    })
    return NextResponse.json(servicios)

  } catch (err) {
    console.error("[servicios GET]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { vehiculoId, tiposServicioIds, bahiaId, operarioId, observaciones } = body

  if (!vehiculoId || !tiposServicioIds?.length) {
    return NextResponse.json({ error: "Vehículo y al menos un tipo de servicio requeridos" }, { status: 400 })
  }

  try {
    const tipos = await prisma.tipoServicio.findMany({
      where: { id: { in: tiposServicioIds } },
    })
    if (!tipos.length) return NextResponse.json({ error: "Tipos de servicio no encontrados" }, { status: 404 })

    const totalMonto = tipos.reduce((sum, t) => sum + t.precio, 0)

    const ahora = new Date()
    const servicio = await prisma.servicio.create({
      data: {
        vehiculoId,
        tipoServicioId: tipos[0].id,
        bahiaId: bahiaId || null,
        operarioId: operarioId || null,
        monto: totalMonto,
        total: totalMonto,
        observaciones,
        estado: "EN_PROCESO",
        horaInicio: ahora,
        items: {
          create: tipos.map((t) => ({
            tipoServicioId: t.id,
            nombre: t.nombre,
            precio: t.precio,
          })),
        },
      },
      include,
    })
    return NextResponse.json(servicio, { status: 201 })
  } catch (err) {
    console.error("[servicios POST]", err)
    return NextResponse.json({ error: "Error creando servicio" }, { status: 500 })
  }
}
