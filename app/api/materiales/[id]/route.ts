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
  const { nombre, unidad, stockAlerta, ajusteStock, notaAjuste } = body

  const data: Record<string, unknown> = {}
  if (nombre !== undefined)     data.nombre      = nombre
  if (unidad !== undefined)     data.unidad      = unidad
  if (stockAlerta !== undefined) data.stockAlerta = parseFloat(stockAlerta)

  if (ajusteStock !== undefined && ajusteStock !== 0) {
    const cant = parseFloat(ajusteStock)
    data.stockTotal = { increment: cant }
    await prisma.movimientoMaterial.create({
      data: {
        materialId: id,
        cantidad: Math.abs(cant),
        tipo: cant > 0 ? "ENTRADA" : "SALIDA",
        nota: notaAjuste || (cant > 0 ? "Ajuste manual +" : "Ajuste manual -"),
      },
    })
  }

  const material = await prisma.material.update({ where: { id }, data })
  return NextResponse.json(material)
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
  // Soft delete
  const material = await prisma.material.update({ where: { id }, data: { activo: false } })
  return NextResponse.json(material)
}
