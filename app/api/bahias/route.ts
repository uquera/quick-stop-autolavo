import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conServicios = searchParams.get("conServicios") === "true"

  try {
    if (conServicios) {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      const finHoy = new Date()
      finHoy.setHours(23, 59, 59, 999)

      const bahias = await prisma.bahia.findMany({
        orderBy: { nombre: "asc" },
        include: {
          servicios: {
            where: { horaIngreso: { gte: hoy, lte: finHoy } },
            include: {
              vehiculo: true,
              operario: { include: { user: { select: { name: true } } } },
              items: { include: { tipoServicio: true } },
              tipoServicio: true,
            },
            orderBy: { horaIngreso: "asc" },
          },
        },
      })
      return NextResponse.json(bahias)
    }

    const bahias = await prisma.bahia.findMany({ orderBy: { nombre: "asc" } })
    return NextResponse.json(bahias)
  } catch (err) {
    console.error("[bahias GET]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { nombre, color } = body
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const bahia = await prisma.bahia.create({ data: { nombre, color: color || "#3B82F6" } })
  return NextResponse.json(bahia, { status: 201 })
}
