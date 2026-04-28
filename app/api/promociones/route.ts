import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const promociones = await prisma.promocion.findMany({ orderBy: { fechaInicio: "desc" } })
  return NextResponse.json(promociones)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { nombre, descripcion, tipoDescuento, valor, fechaInicio, fechaFin } = body

  if (!nombre || !valor || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "Campos requeridos incompletos" }, { status: 400 })
  }

  const promo = await prisma.promocion.create({
    data: {
      nombre,
      descripcion: descripcion || null,
      tipoDescuento: tipoDescuento || "PORCENTAJE",
      valor: parseFloat(valor),
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
    },
  })
  return NextResponse.json(promo, { status: 201 })
}
