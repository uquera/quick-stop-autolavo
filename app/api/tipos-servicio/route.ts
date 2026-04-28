import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tipos = await prisma.tipoServicio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  })
  return NextResponse.json(tipos)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { nombre, descripcion, precio, duracionMinutos } = body
  if (!nombre || !precio) return NextResponse.json({ error: "Nombre y precio requeridos" }, { status: 400 })

  const tipo = await prisma.tipoServicio.create({
    data: { nombre, descripcion, precio: parseFloat(precio), duracionMinutos: parseInt(duracionMinutos) || 30 },
  })
  return NextResponse.json(tipo, { status: 201 })
}
