import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { nombre, color, activo } = body

  const bahia = await prisma.bahia.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(color !== undefined && { color }),
      ...(activo !== undefined && { activo }),
    },
  })
  return NextResponse.json(bahia)
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

  const serviciosActivos = await prisma.servicio.count({
    where: { bahiaId: id, estado: { in: ["EN_ESPERA", "EN_PROCESO"] } },
  })
  if (serviciosActivos > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: la bahía tiene servicios activos" },
      { status: 409 }
    )
  }

  await prisma.bahia.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
