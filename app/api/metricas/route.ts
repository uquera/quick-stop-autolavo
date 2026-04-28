import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get("periodo") ?? "7d"

  const ahora = new Date()
  let inicio: Date
  if (periodo === "hoy") {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0)
  } else if (periodo === "30d") {
    inicio = new Date(ahora.getTime() - 30 * 86_400_000)
  } else if (periodo === "mes") {
    inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  } else {
    // 7d por defecto
    inicio = new Date(ahora.getTime() - 7 * 86_400_000)
  }

  const servicios = await prisma.servicio.findMany({
    where: {
      estado: "COMPLETADO",
      horaSalida: { gte: inicio },
    },
    include: {
      bahia: true,
      operario: { include: { user: { select: { name: true } } } },
      items: true,
      tipoServicio: true,
    },
  })

  // ── Rentabilidad por bahía ─────────────────────────────────────────────────
  const porBahia: Record<string, {
    nombre: string; color: string; cantidad: number; ingresos: number
    duracionTotal: number; duracionPromedio: number; ingresoPorMinuto: number
  }> = {}

  for (const s of servicios) {
    const key   = s.bahia?.id ?? "sin-bahia"
    const label = s.bahia?.nombre ?? "Sin bahía"
    const color = s.bahia?.color ?? "#6B7280"
    if (!porBahia[key]) porBahia[key] = { nombre: label, color, cantidad: 0, ingresos: 0, duracionTotal: 0, duracionPromedio: 0, ingresoPorMinuto: 0 }
    porBahia[key].cantidad++
    porBahia[key].ingresos     += s.total ?? 0
    porBahia[key].duracionTotal += s.duracionMinutos ?? 0
  }

  for (const b of Object.values(porBahia)) {
    b.duracionPromedio  = b.cantidad > 0 ? Math.round(b.duracionTotal / b.cantidad) : 0
    b.ingresoPorMinuto  = b.duracionTotal > 0 ? Math.round((b.ingresos / b.duracionTotal) * 100) / 100 : 0
  }

  // ── Rentabilidad por operario ─────────────────────────────────────────────
  const porOperario: Record<string, {
    nombre: string; cantidad: number; ingresos: number
    duracionPromedio: number; velocidad: number // servicios completados / hora trabajada
  }> = {}

  for (const s of servicios) {
    const key   = s.operario?.id ?? "sin-operario"
    const label = s.operario?.user.name ?? "Sin asignar"
    if (!porOperario[key]) porOperario[key] = { nombre: label, cantidad: 0, ingresos: 0, duracionPromedio: 0, velocidad: 0 }
    porOperario[key].cantidad++
    porOperario[key].ingresos += s.total ?? 0
    porOperario[key].duracionPromedio += s.duracionMinutos ?? 0
  }

  for (const op of Object.values(porOperario)) {
    const totalMin         = op.duracionPromedio
    op.duracionPromedio    = op.cantidad > 0 ? Math.round(totalMin / op.cantidad) : 0
    // Velocidad: servicios por hora (60 / duracion promedio)
    op.velocidad           = op.duracionPromedio > 0 ? Math.round((60 / op.duracionPromedio) * 10) / 10 : 0
  }

  // ── Servicio más rentable ─────────────────────────────────────────────────
  const porServicio: Record<string, {
    nombre: string; cantidad: number; ingresos: number; duracionPromedio: number; margenPorMinuto: number
  }> = {}

  for (const s of servicios) {
    const nombres: string[] = s.items?.length
      ? s.items.map((i) => i.nombre)
      : [s.tipoServicio?.nombre ?? "Sin clasificar"]
    for (const nombre of nombres) {
      if (!porServicio[nombre]) porServicio[nombre] = { nombre, cantidad: 0, ingresos: 0, duracionPromedio: 0, margenPorMinuto: 0 }
      porServicio[nombre].cantidad++
      porServicio[nombre].ingresos     += (s.total ?? 0) / nombres.length
      porServicio[nombre].duracionPromedio += s.duracionMinutos ?? 0
    }
  }

  for (const sv of Object.values(porServicio)) {
    const totalMin          = sv.duracionPromedio
    sv.duracionPromedio     = sv.cantidad > 0 ? Math.round(totalMin / sv.cantidad) : 0
    sv.margenPorMinuto      = sv.duracionPromedio > 0 ? Math.round((sv.ingresos / totalMin) * 100) / 100 : 0
  }

  // ── Evolución diaria de ingresos ──────────────────────────────────────────
  const porDia: Record<string, { fecha: string; ingresos: number; cantidad: number }> = {}
  for (const s of servicios) {
    const d   = new Date(s.horaSalida!)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!porDia[key]) porDia[key] = { fecha: key, ingresos: 0, cantidad: 0 }
    porDia[key].ingresos += s.total ?? 0
    porDia[key].cantidad++
  }

  // ── Resumen general ───────────────────────────────────────────────────────
  const totalIngresos   = servicios.reduce((a, s) => a + (s.total ?? 0), 0)
  const totalServicios  = servicios.length
  const conDuracion     = servicios.filter((s) => s.duracionMinutos)
  const duracionPromedio = conDuracion.length > 0
    ? Math.round(conDuracion.reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) / conDuracion.length)
    : 0
  const ticketPromedio  = totalServicios > 0 ? Math.round(totalIngresos / totalServicios) : 0

  return NextResponse.json({
    periodo,
    resumen: { totalIngresos, totalServicios, duracionPromedio, ticketPromedio },
    porBahia:     Object.values(porBahia).sort((a, b) => b.ingresos - a.ingresos),
    porOperario:  Object.values(porOperario).filter((o) => o.nombre !== "Sin asignar").sort((a, b) => b.ingresos - a.ingresos),
    porServicio:  Object.values(porServicio).sort((a, b) => b.ingresos - a.ingresos),
    evolucion:    Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  })
}
