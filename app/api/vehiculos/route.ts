import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const placa = searchParams.get("placa")

  if (placa) {
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { placa: { contains: placa.toUpperCase() } },
      include: {
        servicios: {
          include: {
            items: { include: { tipoServicio: true } },
            tipoServicio: true,
            operario: { include: { user: { select: { name: true } } } },
          },
          orderBy: { horaIngreso: "desc" },
          take: 30,
        },
      },
    })
    return NextResponse.json(vehiculo)
  }

  const vehiculos = await prisma.vehiculo.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      placa: true,
      marca: true,
      modelo: true,
      anio: true,
      color: true,
      tipo: true,
      clienteNombre: true,
      clienteTelefono: true,
      clienteEmail: true,
      observaciones: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { servicios: true } },
    },
  })
  return NextResponse.json(vehiculos)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { placa, marca, modelo, anio, color, tipo, clienteNombre, clienteTelefono, clienteEmail, observaciones } = body

  if (!placa || !marca) {
    return NextResponse.json({ error: "Placa y marca requeridas" }, { status: 400 })
  }

  const placaNorm = placa.toUpperCase().trim()

  // Upsert: si ya existe la placa, actualizar datos del cliente
  const vehiculo = await prisma.vehiculo.upsert({
    where: { placa: placaNorm },
    update: {
      marca,
      modelo: modelo || undefined,
      anio: anio ? parseInt(anio) : undefined,
      color: color || undefined,
      tipo: tipo || undefined,
      clienteNombre: clienteNombre || undefined,
      clienteTelefono: clienteTelefono || undefined,
      clienteEmail: clienteEmail || undefined,
      observaciones: observaciones || undefined,
    },
    create: {
      placa: placaNorm,
      marca,
      modelo: modelo || null,
      anio: anio ? parseInt(anio) : null,
      color: color || null,
      tipo: tipo || "SEDAN",
      clienteNombre: clienteNombre || null,
      clienteTelefono: clienteTelefono || null,
      clienteEmail: clienteEmail || null,
      observaciones: observaciones || null,
    },
  })

  return NextResponse.json(vehiculo, { status: 201 })
}
