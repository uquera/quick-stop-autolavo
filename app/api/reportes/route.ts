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
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  const { inicio: inicioHoy, fin: finHoy } = getHoyRange()
  const inicio = desde ? new Date(desde) : inicioHoy
  const fin    = hasta ? new Date(hasta) : finHoy

  // Servicios completados: filtrar por horaSalida (igual que cierre de caja)
  // Así reportes y caja siempre cuadran en los mismos montos
  const completados = await prisma.servicio.findMany({
    where: {
      estado: "COMPLETADO",
      horaSalida: { gte: inicio, lte: fin },
    },
    include: { tipoServicio: true, vehiculo: true, items: true, operario: { include: { user: { select: { name: true } } } } },
    orderBy: { horaSalida: "asc" },
  })

  // Para el flujo de vehículos por hora usamos horaIngreso (cuándo llegaron)
  const ingresados = await prisma.servicio.findMany({
    where: { horaIngreso: { gte: inicio, lte: fin } },
    select: { horaIngreso: true },
  })

  // Ingresos por método de pago
  const porMetodo: Record<string, number> = {}
  for (const s of completados) {
    const m = s.metodoPago ?? "SIN_REGISTRAR"
    porMetodo[m] = (porMetodo[m] ?? 0) + (s.total ?? 0)
  }

  // Servicios por tipo
  const porTipo: Record<string, { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number }> = {}
  for (const s of completados) {
    const nombres: string[] = s.items?.length
      ? s.items.map((i: { nombre: string }) => i.nombre)
      : [s.tipoServicio?.nombre ?? "Sin clasificar"]
    for (const nombre of nombres) {
      if (!porTipo[nombre]) porTipo[nombre] = { nombre, cantidad: 0, ingresos: 0, duracionPromedio: 0 }
      porTipo[nombre].cantidad++
      porTipo[nombre].ingresos += (s.total ?? 0) / nombres.length
      porTipo[nombre].duracionPromedio += s.duracionMinutos ?? 0
    }
  }
  for (const k of Object.keys(porTipo)) {
    const t = porTipo[k]
    if (t.cantidad > 0) t.duracionPromedio = Math.round(t.duracionPromedio / t.cantidad)
  }

  // Vehículos por hora de ingreso
  const tz = process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Bogota"
  const porHora: Record<number, number> = {}
  for (const s of ingresados) {
    const h = parseInt(new Date(s.horaIngreso).toLocaleString("en-US", { timeZone: tz, hour: "2-digit", hour12: false }))
    porHora[h] = (porHora[h] ?? 0) + 1
  }

  const totalIngresos = completados.reduce((a, s) => a + (s.total ?? 0), 0)
  const conDuracion   = completados.filter((s) => s.duracionMinutos)
  const duracionPromedio = conDuracion.length > 0
    ? Math.round(conDuracion.reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) / conDuracion.length)
    : 0

  return NextResponse.json({
    totalVehiculos:   ingresados.length,
    totalCompletados: completados.length,
    totalIngresos,
    duracionPromedio,
    porMetodo,
    porTipo: Object.values(porTipo).sort((a, b) => b.cantidad - a.cantidad),
    porHora,
  })
}
