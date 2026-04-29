"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, TrendingUp, DollarSign, Clock, Zap, Award, Loader2 } from "lucide-react"

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}

type BahiaMetrica = {
  nombre: string; color: string; cantidad: number; ingresos: number
  duracionPromedio: number; ingresoPorMinuto: number
}
type OperarioMetrica = {
  nombre: string; cantidad: number; ingresos: number
  duracionPromedio: number; velocidad: number
}
type ServicioMetrica = {
  nombre: string; cantidad: number; ingresos: number
  duracionPromedio: number; margenPorMinuto: number
}
type DiaMetrica = { fecha: string; ingresos: number; cantidad: number }
type MetricasData = {
  periodo: string
  resumen: { totalIngresos: number; totalServicios: number; duracionPromedio: number; ticketPromedio: number }
  porBahia: BahiaMetrica[]
  porOperario: OperarioMetrica[]
  porServicio: ServicioMetrica[]
  evolucion: DiaMetrica[]
}

const PERIODOS = [
  { value: "hoy",  label: "Hoy" },
  { value: "7d",   label: "7 días" },
  { value: "30d",  label: "30 días" },
  { value: "mes",  label: "Este mes" },
]

function BarraHorizontal({ valor, max, color }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color ?? "#1E40AF" }} />
    </div>
  )
}

function MedalIcon({ pos }: { pos: number }) {
  const colors = ["#F59E0B", "#94A3B8", "#92400E"]
  const labels = ["🥇", "🥈", "🥉"]
  return <span className="text-lg">{labels[pos] ?? `${pos + 1}°`}</span>
  void colors
}

export default function MetricasPage() {
  const [data, setData]       = useState<MetricasData | null>(null)
  const [periodo, setPeriodo] = useState("7d")
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (p = periodo) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/metricas?periodo=${p}`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [periodo])

  useEffect(() => { fetchData() }, [])

  function cambiarPeriodo(p: string) {
    setPeriodo(p)
    fetchData(p)
  }

  const maxIngresosBahia    = Math.max(...(data?.porBahia.map((b) => b.ingresos) ?? [1]), 1)
  const maxIngresosOperario = Math.max(...(data?.porOperario.map((o) => o.ingresos) ?? [1]), 1)
  const maxIngresosServicio = Math.max(...(data?.porServicio.map((s) => s.ingresos) ?? [1]), 1)
  const maxEvolucion        = Math.max(...(data?.evolucion.map((d) => d.ingresos) ?? [1]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Rentabilidad
          </h1>
          <p className="text-sm text-gray-500">Análisis detallado por bahía, operario y tipo de servicio</p>
        </div>
        {/* Filtro de periodo */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
          {PERIODOS.map(({ value, label }) => (
            <button key={value} onClick={() => cambiarPeriodo(value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${periodo === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPIs resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Ingresos totales",   value: formatARS(data.resumen.totalIngresos),     icon: DollarSign, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Servicios completados", value: data.resumen.totalServicios,              icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
              { label: "Ticket promedio",    value: formatARS(data.resumen.ticketPromedio),     icon: Award,      color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Tiempo promedio",    value: `${data.resumen.duracionPromedio} min`,     icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-2xl font-black text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Evolución de ingresos */}
          {data.evolucion.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Evolución de ingresos
              </h2>
              <div className="flex items-end gap-1.5 h-32">
                {data.evolucion.map((d) => {
                  const pct = maxEvolucion > 0 ? Math.round((d.ingresos / maxEvolucion) * 100) : 0
                  const fecha = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatARS(d.ingresos)}
                      </div>
                      <div title={`${fecha}: ${formatARS(d.ingresos)}`}
                        className="w-full rounded-t cursor-pointer transition-all"
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          background: pct > 70
                            ? "linear-gradient(180deg, #38BDF8, #1E40AF)"
                            : pct > 40
                            ? "linear-gradient(180deg, #60A5FA, #3B82F6)"
                            : "#BFDBFE",
                        }} />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{fecha}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Rentabilidad por bahía */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" /> Rentabilidad por bahía
              </h2>
              {data.porBahia.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin datos para el período</p>
              ) : (
                <div className="space-y-4">
                  {data.porBahia.map((b, i) => (
                    <div key={b.nombre}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <MedalIcon pos={i} />
                          <span className="text-sm font-semibold text-gray-800">{b.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{formatARS(b.ingresos)}</span>
                          <span className="text-xs text-gray-400 ml-2">{b.cantidad} serv.</span>
                        </div>
                      </div>
                      <BarraHorizontal valor={b.ingresos} max={maxIngresosBahia} color={b.color} />
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>Prom. {b.duracionPromedio}min / servicio</span>
                        <span className="font-medium" style={{ color: b.ingresoPorMinuto > 500 ? "#059669" : "#6B7280" }}>
                          {formatARS(b.ingresoPorMinuto)}/min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rendimiento por operario */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" /> Rendimiento por operario
              </h2>
              {data.porOperario.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin datos para el período</p>
              ) : (
                <div className="space-y-4">
                  {data.porOperario.map((op, i) => (
                    <div key={op.nombre}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <MedalIcon pos={i} />
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                            {op.nombre[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{op.nombre}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{formatARS(op.ingresos)}</span>
                          <span className="text-xs text-gray-400 ml-2">{op.cantidad} serv.</span>
                        </div>
                      </div>
                      <BarraHorizontal valor={op.ingresos} max={maxIngresosOperario} />
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>Prom. {op.duracionPromedio}min / servicio</span>
                        <span className="font-medium" style={{ color: op.velocidad > 2 ? "#059669" : "#6B7280" }}>
                          {op.velocidad} serv/hora
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Servicios más rentables */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" /> Servicios más rentables (ingreso por minuto de trabajo)
            </h2>
            {data.porServicio.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin datos para el período</p>
            ) : (
              <div className="space-y-3">
                {data.porServicio.map((s, i) => (
                  <div key={s.nombre} className="flex items-center gap-4">
                    <div className="w-7 text-center flex-shrink-0"><MedalIcon pos={i} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</span>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">{s.cantidad} veces · {s.duracionPromedio}min prom.</span>
                          <span className="text-sm font-bold text-gray-800">{formatARS(s.ingresos)}</span>
                        </div>
                      </div>
                      <BarraHorizontal valor={s.ingresos} max={maxIngresosServicio} color="#7C3AED" />
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-gray-400">Total facturado</span>
                        <span className="text-xs font-medium" style={{ color: s.margenPorMinuto > 500 ? "#059669" : "#6B7280" }}>
                          {formatARS(s.margenPorMinuto)}/min trabajado
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insight automático */}
          {data.porBahia.length > 0 && data.porOperario.length > 0 && data.porServicio.length > 0 && (
            <div className="rounded-2xl p-5 text-white"
              style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
              <p className="font-bold text-lg mb-3">💡 Insights del período</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Bahía más productiva</p>
                  <p className="font-bold">{data.porBahia[0].nombre}</p>
                  <p className="text-white/70 text-xs">{formatARS(data.porBahia[0].ingresos)} · {data.porBahia[0].cantidad} servicios</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Operario estrella</p>
                  <p className="font-bold">{data.porOperario[0].nombre}</p>
                  <p className="text-white/70 text-xs">{data.porOperario[0].velocidad} serv/hora · {formatARS(data.porOperario[0].ingresos)}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Servicio más rentable</p>
                  <p className="font-bold truncate">{data.porServicio[0].nombre}</p>
                  <p className="text-white/70 text-xs">{formatARS(data.porServicio[0].margenPorMinuto)}/min trabajado</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
