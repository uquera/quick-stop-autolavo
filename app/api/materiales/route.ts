import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const materiales = await prisma.material.findMany({
    where: { activo: true },
    include: {
      configuraciones: { include: { tipoServicio: { select: { nombre: true } } } },
    },
    orderBy: { nombre: "asc" },
  })
  return NextResponse.json(materiales)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { nombre, unidad, stockTotal, stockAlerta } = await req.json()
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const material = await prisma.material.create({
    data: {
      nombre,
      unidad: unidad || "unidades",
      stockTotal: parseFloat(stockTotal) || 0,
      stockAlerta: parseFloat(stockAlerta) || 5,
    },
  })

  if (material.stockTotal > 0) {
    await prisma.movimientoMaterial.create({
      data: { materialId: material.id, cantidad: material.stockTotal, tipo: "ENTRADA", nota: "Stock inicial" },
    })
  }

  return NextResponse.json(material, { status: 201 })
}
