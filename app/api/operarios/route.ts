import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const operarios = await prisma.operario.findMany({
    where: { activo: true },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(operarios)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { name, email, password } = body
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nombre, email y contraseña requeridos" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email ya registrado" }, { status: 409 })

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "OPERARIO" },
  })
  const operario = await prisma.operario.create({ data: { userId: user.id } })

  return NextResponse.json({ ...operario, user: { name, email } }, { status: 201 })
}
