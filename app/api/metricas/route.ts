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
  if (periodo === "hoy") {
    inicio = getHoyRange().inicio
  } else if (periodo === "30d") {
    inicio = new Date(ahora.getTime() - 30 * 86_400_000)
  } else if (periodo === "mes") {
    inicio = getMesRange().inicio
  } else {
    inicio = new Date(ahora.getTime() - 7 * 86_400_000)
  }

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

  // ── Rentabilidad por operario ─────────────────────────────────────────────
  const porOperario: Record<string, {
    nombre: string; cantidad: number; ingresos: number
    duracionPromedio: number; velocidad: number
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
    const totalMin      = op.duracionPromedio
    op.duracionPromedio = op.cantidad > 0 ? Math.round(totalMin / op.cantidad) : 0
    op.velocidad        = op.duracionPromedio > 0 ? Math.round((60 / op.duracionPromedio) * 10) / 10 : 0
  }

  // ── Participación por etapa (lavado/interior) ─────────────────────────────
  const porEtapaOp: Record<string, { nombre: string; lavado: number; interior: number }> = {}
  for (const s of servicios) {
    const addOp = (opRef: { user: { name: string | null } } | null, etapa: "lavado" | "interior") => {
      if (!opRef) return
      const k = opRef.user.name ?? "?"
      if (!porEtapaOp[k]) porEtapaOp[k] = { nombre: k, lavado: 0, interior: 0 }
      porEtapaOp[k][etapa]++
    }
    addOp(s.opLavado1,  "lavado")
    addOp(s.opInterior,  "interior")
    addOp(s.opInterior2, "interior")
    addOp(s.opInterior3, "interior")
    addOp(s.opInterior4, "interior")
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
      porServicio[nombre].ingresos += (s.total ?? 0) / nombres.length
      porServicio[nombre].duracionPromedio += s.duracionMinutos ?? 0
    }
  }

  for (const sv of Object.values(porServicio)) {
    const totalMin       = sv.duracionPromedio
    sv.duracionPromedio  = sv.cantidad > 0 ? Math.round(totalMin / sv.cantidad) : 0
    sv.margenPorMinuto   = sv.duracionPromedio > 0 ? Math.round((sv.ingresos / totalMin) * 100) / 100 : 0
  }

  // ── Consumo de materiales ─────────────────────────────────────────────────
  const porMaterial: Record<string, { nombre: string; unidad: string; totalUsado: number }> = {}
  for (const s of servicios) {
    for (const c of s.consumos) {
      const k = c.nombre
      if (!porMaterial[k]) porMaterial[k] = { nombre: k, unidad: c.unidad, totalUsado: 0 }
      porMaterial[k].totalUsado += c.cantidad
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
    porOperario:  Object.values(porOperario).filter((o) => o.nombre !== "Sin asignar").sort((a, b) => b.ingresos - a.ingresos),
    porEtapaOp:   Object.values(porEtapaOp).sort((a, b) => (b.lavado + b.interior) - (a.lavado + a.interior)),
    porServicio:  Object.values(porServicio).sort((a, b) => b.ingresos - a.ingresos),
    porMaterial:  Object.values(porMaterial).sort((a, b) => b.totalUsado - a.totalUsado),
    evolucion:    Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha)),
  })
}
