import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET: consumibles de un tipo de servicio
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipoServicioId = searchParams.get("tipoServicioId")
  if (!tipoServicioId) return NextResponse.json({ error: "tipoServicioId requerido" }, { status: 400 })

  const configs = await prisma.materialServicio.findMany({
    where: { tipoServicioId },
    include: { material: true },
  })
  return NextResponse.json(configs)
}

// POST: asignar un consumible a un tipo de servicio
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { tipoServicioId, materialId, cantidadPorServicio } = await req.json()
  if (!tipoServicioId || !materialId) {
    return NextResponse.json({ error: "tipoServicioId y materialId requeridos" }, { status: 400 })
  }

  const config = await prisma.materialServicio.upsert({
    where: { tipoServicioId_materialId: { tipoServicioId, materialId } },
    update: { cantidadPorServicio: parseFloat(cantidadPorServicio) || 1 },
    create: { tipoServicioId, materialId, cantidadPorServicio: parseFloat(cantidadPorServicio) || 1 },
    include: { material: true },
  })

  return NextResponse.json(config, { status: 201 })
}

// DELETE: quitar un consumible de un tipo de servicio
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await req.json()
  await prisma.materialServicio.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
