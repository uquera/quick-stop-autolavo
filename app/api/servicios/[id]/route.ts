import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { registrarCambio } from "@/lib/audit"

const include = {
  vehiculo: true,
  operario: { include: { user: { select: { name: true } } } },
  bahia: true,
  tipoServicio: true,
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { estado, metodoPago, monto, descuento, total, operarioId, bahiaId, observaciones } = body

  const actual = await prisma.servicio.findUnique({ where: { id } })
  if (!actual) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (estado && estado !== actual.estado) {
    data.estado = estado
    if (estado === "EN_PROCESO" && !actual.horaInicio) {
      data.horaInicio = new Date()
    }
    if (estado === "COMPLETADO" && !actual.horaSalida) {
      data.horaSalida = new Date()
      if (actual.horaInicio) {
        const inicio = actual.horaInicio
        const duracion = Math.round((Date.now() - inicio.getTime()) / 60000)
        data.duracionMinutos = duracion
      }
    }
    await registrarCambio({
      entidadTipo: "servicio",
      entidadId: id,
      campo: "estado",
      valorAntes: actual.estado,
      valorDespues: estado,
      userId: session.user.id,
      userName: session.user.name ?? session.user.email,
    })
  }

  if (metodoPago !== undefined) data.metodoPago = metodoPago
  if (monto !== undefined) data.monto = monto
  if (descuento !== undefined) data.descuento = descuento
  if (total !== undefined) data.total = total
  if (operarioId !== undefined) data.operarioId = operarioId
  if (bahiaId !== undefined) data.bahiaId = bahiaId
  if (observaciones !== undefined) data.observaciones = observaciones

  const servicio = await prisma.servicio.update({ where: { id }, data, include })
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
