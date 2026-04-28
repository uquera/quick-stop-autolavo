import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getHoyRange } from "@/lib/timezone"

function inicioHoy() { return getHoyRange().inicio }
function finHoy()    { return getHoyRange().fin }

function calcularTotales(servicios: { metodoPago: string | null; total: number | null }[]) {
  const t = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, total: 0, vehiculos: servicios.length }
  for (const s of servicios) {
    const monto = s.total ?? 0
    t.total += monto
    if (s.metodoPago === "EFECTIVO")      t.EFECTIVO      += monto
    if (s.metodoPago === "TRANSFERENCIA") t.TRANSFERENCIA += monto
    if (s.metodoPago === "TARJETA")       t.TARJETA       += monto
  }
  return t
}

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Todos los cierres del día — siempre en orden ASC para mostrar historial
    const cierresHoy = await prisma.cierreCaja.findMany({
      where: { createdAt: { gte: inicioHoy(), lte: finHoy() } },
      orderBy: { createdAt: "asc" },
      include: { operario: { include: { user: { select: { name: true } } } } },
    })

    // Último cierre = el más reciente (último en orden ASC)
    const ultimoCierre = cierresHoy.length > 0 ? cierresHoy[cierresHoy.length - 1] : null
    const periodoDesde = ultimoCierre ? ultimoCierre.periodoHasta : inicioHoy()

    // Servicios del periodo actual (desde último cierre hasta ahora)
    const serviciosPeriodo = await prisma.servicio.findMany({
      where: {
        estado: "COMPLETADO",
        horaSalida: { gte: periodoDesde, lte: finHoy() },
      },
      select: { metodoPago: true, total: true },
    })

    const totalesPeriodo = calcularTotales(serviciosPeriodo)

    // Totales acumulados del día (todos los cierres + periodo actual)
    const totalDia = {
      EFECTIVO:      cierresHoy.reduce((a, c) => a + c.totalEfectivo, 0)      + totalesPeriodo.EFECTIVO,
      TRANSFERENCIA: cierresHoy.reduce((a, c) => a + c.totalTransferencia, 0) + totalesPeriodo.TRANSFERENCIA,
      TARJETA:       cierresHoy.reduce((a, c) => a + c.totalTarjeta, 0)       + totalesPeriodo.TARJETA,
      total:         cierresHoy.reduce((a, c) => a + c.totalIngresos, 0)      + totalesPeriodo.total,
      vehiculos:     cierresHoy.reduce((a, c) => a + c.totalVehiculos, 0)     + totalesPeriodo.vehiculos,
    }

    return NextResponse.json({
      cierresHoy,
      periodoActual: {
        desde: periodoDesde,
        hasta: new Date(),
        ...totalesPeriodo,
        turnoNumero: cierresHoy.length + 1,
      },
      totalDia,
      tienePeriodoAbierto: serviciosPeriodo.length > 0 || cierresHoy.length === 0,
    })
  } catch (err) {
    console.error("[caja GET]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const { nombre, notas } = body

  try {
    // Mismo orden ASC — el último del array es el cierre más reciente
    const cierresHoy = await prisma.cierreCaja.findMany({
      where: { createdAt: { gte: inicioHoy(), lte: finHoy() } },
      orderBy: { createdAt: "asc" },
    })

    const ultimoCierre = cierresHoy.length > 0 ? cierresHoy[cierresHoy.length - 1] : null
    const periodoDesde = ultimoCierre ? ultimoCierre.periodoHasta : inicioHoy()
    const periodoHasta = new Date()

    const serviciosPeriodo = await prisma.servicio.findMany({
      where: {
        estado: "COMPLETADO",
        horaSalida: { gte: periodoDesde, lte: periodoHasta },
      },
      select: { metodoPago: true, total: true },
    })

    const totales = calcularTotales(serviciosPeriodo)

    const cierre = await prisma.cierreCaja.create({
      data: {
        nombre: nombre || `Turno ${cierresHoy.length + 1}`,
        periodoDesde,
        periodoHasta,
        totalEfectivo:      totales.EFECTIVO,
        totalTransferencia: totales.TRANSFERENCIA,
        totalTarjeta:       totales.TARJETA,
        totalIngresos:      totales.total,
        totalVehiculos:     totales.vehiculos,
        totalServicios:     serviciosPeriodo.length,
        notas:              notas || null,
      },
      include: { operario: { include: { user: { select: { name: true } } } } },
    })

    return NextResponse.json(cierre, { status: 201 })
  } catch (err) {
    console.error("[caja POST]", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
