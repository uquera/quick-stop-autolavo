import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailBienvenida } from "@/lib/email"
import { getHoyRange } from "@/lib/timezone"

const include = {
  vehiculo: true,
  operario:  { include: { user: { select: { name: true } } } },
  opLavado1: { include: { user: { select: { name: true } } } },
  opLavado2: { include: { user: { select: { name: true } } } },
  opLavado3: { include: { user: { select: { name: true } } } },
  opInterior:{ include: { user: { select: { name: true } } } },
  tipoServicio: true,
  items: { include: { tipoServicio: true } },
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const activos   = searchParams.get("activos")   === "true"
  const historial = searchParams.get("historial") === "true"

  try {
    if (activos) {
      const servicios = await prisma.servicio.findMany({
        where: { estado: { in: ["EN_ESPERA", "EN_PROCESO", "POR_COBRAR"] } },
        include,
        orderBy: { horaIngreso: "asc" },
      })
      return NextResponse.json(servicios)
    }

    if (historial) {
      const { inicio, fin } = getHoyRange()
      const servicios = await prisma.servicio.findMany({
        where: {
          estado: { in: ["COMPLETADO", "CANCELADO"] },
          horaIngreso: { gte: inicio, lte: fin },
        },
        include,
        orderBy: { horaSalida: "desc" },
      })
      return NextResponse.json(servicios)
    }

    const { inicio, fin } = getHoyRange()
    const servicios = await prisma.servicio.findMany({
      where: { horaIngreso: { gte: inicio, lte: fin } },
      include,
      orderBy: { horaIngreso: "desc" },
    })
    return NextResponse.json(servicios)

  } catch (err) {
    console.error("[servicios GET]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { vehiculoId, tiposServicioIds, operarioId, observaciones } = body

  if (!vehiculoId || !tiposServicioIds?.length) {
    return NextResponse.json({ error: "Vehículo y al menos un tipo de servicio requeridos" }, { status: 400 })
  }

  try {
    const tipos = await prisma.tipoServicio.findMany({
      where: { id: { in: tiposServicioIds } },
    })
    if (!tipos.length) return NextResponse.json({ error: "Tipos de servicio no encontrados" }, { status: 404 })

    const totalMonto = tipos.reduce((sum, t) => sum + t.precio, 0)

    const servicio = await prisma.servicio.create({
      data: {
        vehiculoId,
        tipoServicioId: tipos[0].id,
        operarioId: operarioId || null,
        monto: totalMonto,
        total: totalMonto,
        observaciones,
        estado: "EN_ESPERA",
        items: {
          create: tipos.map((t) => ({
            tipoServicioId: t.id,
            nombre: t.nombre,
            precio: t.precio,
          })),
        },
      },
      include,
    })

    // Correo de bienvenida solo en primera visita (fire & forget)
    const vehiculo = servicio.vehiculo
    if (vehiculo?.clienteEmail) {
      const totalServicios = await prisma.servicio.count({ where: { vehiculoId } })
      if (totalServicios === 1) {
        enviarEmailBienvenida({
          email: vehiculo.clienteEmail,
          clienteNombre: vehiculo.clienteNombre ?? "",
          placa: vehiculo.placa,
        }).catch(() => {})
      }
    }

    return NextResponse.json(servicio, { status: 201 })
  } catch (err) {
    console.error("[servicios POST]", err)
    return NextResponse.json({ error: "Error creando servicio" }, { status: 500 })
  }
}
