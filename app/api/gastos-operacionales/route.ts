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
  const fechaParam = searchParams.get("fecha")

  let inicio: Date, fin: Date
  if (!fechaParam || fechaParam === "hoy") {
    const rango = getHoyRange()
    inicio = rango.inicio
    fin    = rango.fin
  } else {
    inicio = new Date(fechaParam); inicio.setHours(0, 0, 0, 0)
    fin    = new Date(fechaParam); fin.setHours(23, 59, 59, 999)
  }

  const gastos = await prisma.gastoOperacional.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    orderBy: { fecha: "desc" },
  })
  return NextResponse.json(gastos)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { concepto, monto, categoria } = await req.json()
  if (!concepto || !monto) {
    return NextResponse.json({ error: "Concepto y monto requeridos" }, { status: 400 })
  }

  const gasto = await prisma.gastoOperacional.create({
    data: {
      concepto,
      monto: parseFloat(monto),
      categoria: categoria || "General",
    },
  })
  return NextResponse.json(gasto, { status: 201 })
}
