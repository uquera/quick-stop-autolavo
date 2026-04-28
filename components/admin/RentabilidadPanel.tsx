"use client"

import { useCallback, useEffect, useState } from "react"
import { TrendingUp, DollarSign, Clock, Award, Zap, Loader2 } from "lucide-react"

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

type BahiaMetrica     = { nombre: string; color: string; cantidad: number; ingresos: number; duracionPromedio: number; ingresoPorMinuto: number }
type OperarioMetrica  = { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number; velocidad: number }
type ServicioMetrica  = { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number; margenPorMinuto: number }
type DiaMetrica       = { fecha: string; ingresos: number; cantidad: number }
type MetricasData = {
  resumen: { totalIngresos: number; totalServicios: number; duracionPromedio: number; ticketPromedio: number }
  porBahia: BahiaMetrica[]; porOperario: OperarioMetrica[]
  porServicio: ServicioMetrica[]; evolucion: DiaMetrica[]
}

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "7d",  label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "mes", label: "Este mes" },
]

function Barra({ valor, max, color }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color ?? "#1E40AF" }} />
    </div>
  )
}

function Medalla({ pos }: { pos: number }) {
  return <span className="text-base">{["🥇","🥈","🥉"][pos] ?? `${pos + 1}°`}</span>
}

export default function RentabilidadPanel() {
  const [data, setData]       = useState<MetricasData | null>(null)
  const [periodo, setPeriodo] = useState("7d")
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async (p: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/metricas?periodo=${p}`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData("7d") }, [fetchData])

  const maxBahia     = Math.max(...(data?.porBahia.map((b) => b.ingresos) ?? [1]), 1)
  const maxOperario  = Math.max(...(data?.porOperario.map((o) => o.ingresos) ?? [1]), 1)
  const maxServicio  = Math.max(...(data?.porServicio.map((s) => s.ingresos) ?? [1]), 1)
  const maxEvolucion = Math.max(...(data?.evolucion.map((d) => d.ingresos) ?? [1]), 1)

  return (
    <div className="space-y-5">
      {/* Header con selector */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> Rentabilidad
        </h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODOS.map(({ value, label }) => (
            <button key={value} onClick={() => { setPeriodo(value); fetchData(value) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodo === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPIs de rentabilidad */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Ingresos período",   value: formatCOP(data.resumen.totalIngresos),   icon: DollarSign, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Ticket promedio",    value: formatCOP(data.resumen.ticketPromedio),   icon: Award,      color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Tiempo promedio",    value: `${data.resumen.duracionPromedio} min`,  icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
              { label: "Serv. completados",  value: data.resumen.totalServicios,              icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-xl font-black text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Evolución de ingresos */}
          {data.evolucion.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Evolución de ingresos</p>
              <div className="flex items-end gap-1 h-24">
                {data.evolucion.map((d) => {
                  const pct   = maxEvolucion > 0 ? Math.round((d.ingresos / maxEvolucion) * 100) : 0
                  const fecha = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {fecha}: {formatCOP(d.ingresos)}
                      </div>
                      <div className="w-full rounded-t cursor-pointer transition-all"
                        style={{ height: `${Math.max(pct, 4)}%`, background: pct > 70 ? "linear-gradient(180deg,#38BDF8,#1E40AF)" : pct > 40 ? "#3B82F6" : "#BFDBFE" }} />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{fecha}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Por bahía */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" /> Rentabilidad por bahía
              </p>
              {data.porBahia.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                : <div className="space-y-3">
                    {data.porBahia.map((b, i) => (
                      <div key={b.nombre}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Medalla pos={i} />
                            <span className="text-sm font-semibold text-gray-800">{b.nombre}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-800">{formatCOP(b.ingresos)}</span>
                            <span className="text-xs text-gray-400 ml-1.5">{b.cantidad} serv.</span>
                          </div>
                        </div>
                        <Barra valor={b.ingresos} max={maxBahia} color={b.color} />
                        <div className="flex justify-between mt-0.5 text-xs text-gray-400">
                          <span>Prom. {b.duracionPromedio}min</span>
                          <span style={{ color: b.ingresoPorMinuto > 500 ? "#059669" : "#6B7280" }}>
                            {formatCOP(b.ingresoPorMinuto)}/min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Por operario */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-blue-600" /> Rendimiento por operario
              </p>
              {data.porOperario.length === 0
                ? <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
                : <div className="space-y-3">
                    {data.porOperario.map((op, i) => (
                      <div key={op.nombre}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Medalla pos={i} />
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#1E40AF,#38BDF8)" }}>
                              {op.nombre[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{op.nombre}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-800">{formatCOP(op.ingresos)}</span>
                            <span className="text-xs text-gray-400 ml-1.5">{op.cantidad} serv.</span>
                          </div>
                        </div>
                        <Barra valor={op.ingresos} max={maxOperario} />
                        <div className="flex justify-between mt-0.5 text-xs text-gray-400">
                          <span>Prom. {op.duracionPromedio}min</span>
                          <span style={{ color: op.velocidad > 2 ? "#059669" : "#6B7280" }}>
                            {op.velocidad} serv/hora
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Servicios más rentables */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Servicios más rentables
            </p>
            {data.porServicio.length === 0
              ? <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
              : <div className="space-y-3">
                  {data.porServicio.map((s, i) => (
                    <div key={s.nombre} className="flex items-center gap-3">
                      <Medalla pos={i} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-400">{s.cantidad}× · {s.duracionPromedio}min</span>
                            <span className="text-sm font-bold text-gray-800">{formatCOP(s.ingresos)}</span>
                          </div>
                        </div>
                        <Barra valor={s.ingresos} max={maxServicio} color="#7C3AED" />
                        <div className="flex justify-end mt-0.5">
                          <span className="text-xs" style={{ color: s.margenPorMinuto > 500 ? "#059669" : "#6B7280" }}>
                            {formatCOP(s.margenPorMinuto)}/min trabajado
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Insights automáticos */}
          {data.porBahia.length > 0 && data.porOperario.length > 0 && data.porServicio.length > 0 && (
            <div className="rounded-2xl p-5 text-white"
              style={{ background: "linear-gradient(135deg,#0F172A,#1E3A8A)" }}>
              <p className="font-bold mb-3">💡 Insights del período</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Bahía más productiva", nombre: data.porBahia[0].nombre, detalle: `${formatCOP(data.porBahia[0].ingresos)} · ${data.porBahia[0].cantidad} servicios` },
                  { label: "Operario estrella",    nombre: data.porOperario[0].nombre, detalle: `${data.porOperario[0].velocidad} serv/hora · ${formatCOP(data.porOperario[0].ingresos)}` },
                  { label: "Servicio más rentable",nombre: data.porServicio[0].nombre, detalle: `${formatCOP(data.porServicio[0].margenPorMinuto)}/min trabajado` },
                ].map(({ label, nombre, detalle }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3">
                    <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">{label}</p>
                    <p className="font-bold truncate">{nombre}</p>
                    <p className="text-white/70 text-xs">{detalle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
