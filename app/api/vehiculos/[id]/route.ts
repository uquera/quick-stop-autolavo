import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const vehiculo = await prisma.vehiculo.findUnique({
    where: { id },
    include: {
      servicios: {
        include: {
          items: { include: { tipoServicio: true } },
          tipoServicio: true,
          operario: { include: { user: { select: { name: true } } } },
          bahia: true,
        },
        orderBy: { horaIngreso: "desc" },
      },
    },
  })

  if (!vehiculo) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(vehiculo)
}

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
  const { placa, marca, modelo, anio, color, tipo, clienteNombre, clienteTelefono, clienteEmail, observaciones } = body

  const vehiculo = await prisma.vehiculo.update({
    where: { id },
    data: {
      ...(placa !== undefined && { placa: placa.toUpperCase().trim() }),
      ...(marca !== undefined && { marca }),
      ...(modelo !== undefined && { modelo }),
      ...(anio !== undefined && { anio: anio ? parseInt(anio) : null }),
      ...(color !== undefined && { color }),
      ...(tipo !== undefined && { tipo }),
      ...(clienteNombre !== undefined && { clienteNombre }),
      ...(clienteTelefono !== undefined && { clienteTelefono }),
      ...(clienteEmail !== undefined && { clienteEmail }),
      ...(observaciones !== undefined && { observaciones }),
    },
  })

  return NextResponse.json(vehiculo)
}
