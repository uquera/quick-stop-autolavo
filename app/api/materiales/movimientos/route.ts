import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const materialId = searchParams.get("materialId")

  const where = materialId ? { materialId } : {}

  const movimientos = await prisma.movimientoMaterial.findMany({
    where,
    include: { material: { select: { nombre: true, unidad: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json(movimientos)
}
