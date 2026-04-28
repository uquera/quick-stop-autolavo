import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")

  const inicio = desde ? new Date(desde) : (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()
  const fin    = hasta ? new Date(hasta) : (() => { const d = new Date(); d.setHours(23,59,59,999); return d })()

  const servicios = await prisma.servicio.findMany({
    where: { horaIngreso: { gte: inicio, lte: fin } },
    include: { tipoServicio: true, vehiculo: true, bahia: true, items: true },
    orderBy: { horaIngreso: "asc" },
  })

  const completados = servicios.filter((s) => s.estado === "COMPLETADO")

  // Ingresos por método de pago
  const porMetodo: Record<string, number> = {}
  for (const s of completados) {
    const m = s.metodoPago ?? "SIN_REGISTRAR"
    porMetodo[m] = (porMetodo[m] ?? 0) + (s.total ?? 0)
  }

  // Servicios por tipo (usa items si existen, si no el tipoServicio principal)
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

  // Vehículos por hora
  const porHora: Record<number, number> = {}
  for (const s of servicios) {
    const h = new Date(s.horaIngreso).getHours()
    porHora[h] = (porHora[h] ?? 0) + 1
  }

  const totalIngresos = completados.reduce((a, s) => a + (s.total ?? 0), 0)
  const duracionPromedio = completados.filter((s) => s.duracionMinutos).length > 0
    ? Math.round(completados.reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) / completados.filter((s) => s.duracionMinutos).length)
    : 0

  return NextResponse.json({
    totalVehiculos: servicios.length,
    totalCompletados: completados.length,
    totalIngresos,
    duracionPromedio,
    porMetodo,
    porTipo: Object.values(porTipo).sort((a, b) => b.cantidad - a.cantidad),
    porHora,
  })
}
