import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getHoyRange, getMesRange, formatFechaEnTZ } from "@/lib/timezone"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const periodo = searchParams.get("periodo") ?? "7d"

  const ahora = new Date()
  let inicio: Date
  if (periodo === "hoy")       inicio = getHoyRange().inicio
  else if (periodo === "30d")  inicio = new Date(ahora.getTime() - 30 * 86_400_000)
  else if (periodo === "mes")  inicio = getMesRange().inicio
  else                         inicio = new Date(ahora.getTime() - 7 * 86_400_000)

  const servicios = await prisma.servicio.findMany({
    where: { estado: "COMPLETADO", horaSalida: { gte: inicio } },
    include: {
      operario:   { include: { user: { select: { name: true } } } },
      opLavado1:  { include: { user: { select: { name: true } } } },
      opInterior: { include: { user: { select: { name: true } } } },
      opInterior2:{ include: { user: { select: { name: true } } } },
      opInterior3:{ include: { user: { select: { name: true } } } },
      opInterior4:{ include: { user: { select: { name: true } } } },
      items: true,
      tipoServicio: true,
      consumos: true,
    },
  })

  // ── Productividad por operario ────────────────────────────────────────────
  // Para cada operario: cuántos lavados hizo, cuántos interiores,
  // tiempo promedio en cada etapa, e ingresos asociados.
  type OpStats = {
    nombre:         string
    lavados:        number
    interiores:     number
    totalServicios: number
    ingresos:       number
    durLavadoTotal: number   // suma minutos lavado
    durInteriorTotal: number // suma minutos interior
    durTotalServicio: number // suma duración total de servicios donde participó
    tPromLavado:    number   // promedio calculado al final
    tPromInterior:  number
    tPromServicio:  number
  }
  const prodOperario: Record<string, OpStats> = {}

  function initOp(k: string, nombre: string) {
    if (!prodOperario[k]) {
      prodOperario[k] = {
        nombre, lavados: 0, interiores: 0, totalServicios: 0,
        ingresos: 0, durLavadoTotal: 0, durInteriorTotal: 0,
        durTotalServicio: 0, tPromLavado: 0, tPromInterior: 0, tPromServicio: 0,
      }
    }
  }

  for (const s of servicios) {
    // Lavado (1 operario)
    if (s.opLavado1) {
      const k = s.opLavado1.user.name ?? "?"
      initOp(k, k)
      prodOperario[k].lavados++
      prodOperario[k].ingresos += s.total ?? 0
      prodOperario[k].durTotalServicio += s.duracionMinutos ?? 0
      if (s.duracionLavadoMin) prodOperario[k].durLavadoTotal += s.duracionLavadoMin
    }
    // Interior (hasta 4 operarios)
    const intOps = [s.opInterior, s.opInterior2, s.opInterior3, s.opInterior4].filter(Boolean)
    for (const op of intOps) {
      const k = op!.user.name ?? "?"
      initOp(k, k)
      prodOperario[k].interiores++
      // Ingresos divididos entre los que participaron en interior
      prodOperario[k].ingresos += (s.total ?? 0) / (intOps.length || 1)
      prodOperario[k].durTotalServicio += s.duracionMinutos ?? 0
      if (s.duracionInteriorMin) prodOperario[k].durInteriorTotal += s.duracionInteriorMin
    }
  }

  // Calcular promedios
  for (const op of Object.values(prodOperario)) {
    op.totalServicios = op.lavados + op.interiores
    op.tPromLavado    = op.lavados    > 0 ? Math.round(op.durLavadoTotal    / op.lavados)    : 0
    op.tPromInterior  = op.interiores > 0 ? Math.round(op.durInteriorTotal  / op.interiores) : 0
    op.tPromServicio  = op.totalServicios > 0 ? Math.round(op.durTotalServicio / op.totalServicios) : 0
  }

  // ── Rentabilidad por servicio ─────────────────────────────────────────────
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
      porServicio[nombre].ingresos += (s.total ?? 0) / nombres.length
      porServicio[nombre].duracionPromedio += s.duracionMinutos ?? 0
    }
  }

  for (const sv of Object.values(porServicio)) {
    const totalMin      = sv.duracionPromedio
    sv.duracionPromedio = sv.cantidad > 0 ? Math.round(totalMin / sv.cantidad) : 0
    sv.margenPorMinuto  = totalMin > 0 ? Math.round((sv.ingresos / totalMin) * 100) / 100 : 0
  }

  // ── Consumo de materiales ─────────────────────────────────────────────────
  const porMaterial: Record<string, { nombre: string; unidad: string; totalUsado: number }> = {}
  for (const s of servicios) {
    for (const c of s.consumos) {
      if (!porMaterial[c.nombre]) porMaterial[c.nombre] = { nombre: c.nombre, unidad: c.unidad, totalUsado: 0 }
      porMaterial[c.nombre].totalUsado += c.cantidad
    }
  }

  // ── Evolución diaria ──────────────────────────────────────────────────────
  const porDia: Record<string, { fecha: string; ingresos: number; cantidad: number }> = {}
  for (const s of servicios) {
    const key = formatFechaEnTZ(s.horaSalida!)
    if (!porDia[key]) porDia[key] = { fecha: key, ingresos: 0, cantidad: 0 }
    porDia[key].ingresos += s.total ?? 0
    porDia[key].cantidad++
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const totalIngresos    = servicios.reduce((a, s) => a + (s.total ?? 0), 0)
  const totalServicios   = servicios.length
  const conDuracion      = servicios.filter((s) => s.duracionMinutos)
  const duracionPromedio = conDuracion.length > 0
    ? Math.round(conDuracion.reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) / conDuracion.length)
    : 0
  const ticketPromedio   = totalServicios > 0 ? Math.round(totalIngresos / totalServicios) : 0

  return NextResponse.json({
    periodo,
    resumen: { totalIngresos, totalServicios, duracionPromedio, ticketPromedio },
    productividadOperarios: Object.values(prodOperario).sort((a, b) => b.totalServicios - a.totalServicios),
    porServicio: Object.values(porServicio).sort((a, b) => b.ingresos - a.ingresos),
    porMaterial: Object.values(porMaterial).sort((a, b) => b.totalUsado - a.totalUsado),
    evolucion:   Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  })
}
