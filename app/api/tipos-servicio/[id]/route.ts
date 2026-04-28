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
  const { nombre, descripcion, precio, duracionMinutos, activo } = body

  const tipo = await prisma.tipoServicio.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(precio !== undefined && { precio: parseFloat(precio) }),
      ...(duracionMinutos !== undefined && { duracionMinutos: parseInt(duracionMinutos) }),
      ...(activo !== undefined && { activo }),
    },
  })
  return NextResponse.json(tipo)
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

  const enUso = await prisma.servicioItem.count({ where: { tipoServicioId: id } })
  if (enUso > 0) {
    // Desactivar en lugar de borrar si tiene registros
    await prisma.tipoServicio.update({ where: { id }, data: { activo: false } })
    return NextResponse.json({ ok: true, desactivado: true })
  }

  await prisma.tipoServicio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
