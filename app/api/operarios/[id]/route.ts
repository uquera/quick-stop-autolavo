import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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
  const { name, password, activo } = body

  const operario = await prisma.operario.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!operario) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const userUpdate: Record<string, unknown> = {}
  if (name) userUpdate.name = name
  if (password) userUpdate.password = await bcrypt.hash(password, 10)

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: operario.userId }, data: userUpdate })
  }

  const updated = await prisma.operario.update({
    where: { id },
    data: { ...(activo !== undefined && { activo }) },
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(updated)
}
