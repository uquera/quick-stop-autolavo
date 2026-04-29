import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getHoyRange } from "@/lib/timezone"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fechaParam = searchParams.get("fecha") // "hoy" o una fecha ISO

  let inicio: Date
  let fin: Date

  if (!fechaParam || fechaParam === "hoy") {
    const rango = getHoyRange()
    inicio = rango.inicio
    fin    = rango.fin
  } else {
    inicio = new Date(fechaParam)
    inicio.setHours(0, 0, 0, 0)
    fin = new Date(fechaParam)
    fin.setHours(23, 59, 59, 999)
  }

  const pagos = await prisma.pagoOperario.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    include: { operario: { include: { user: { select: { name: true } } } } },
    orderBy: { fecha: "desc" },
  })

  return NextResponse.json(pagos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { operarioId, monto, nota } = await req.json()

  if (!operarioId || !monto) {
    return NextResponse.json({ error: "operarioId y monto son requeridos" }, { status: 400 })
  }

  const pago = await prisma.pagoOperario.create({
    data: {
      operarioId,
      monto: parseFloat(monto),
      nota: nota || null,
    },
    include: { operario: { include: { user: { select: { name: true } } } } },
  })

  return NextResponse.json(pago, { status: 201 })
}
