"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, TrendingUp, DollarSign, Clock, Award, Loader2, Droplets, Sparkles, Users } from "lucide-react"

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}

type OpProductividad = {
  nombre:           string
  lavados:          number
  interiores:       number
  totalServicios:   number
  ingresos:         number
  tPromLavado:      number
  tPromInterior:    number
  tPromServicio:    number
}
type ServicioMetrica = {
  nombre: string; cantidad: number; ingresos: number
  duracionPromedio: number; margenPorMinuto: number
}
type DiaMetrica   = { fecha: string; ingresos: number; cantidad: number }
type MatMetrica   = { nombre: string; unidad: string; totalUsado: number }
type MetricasData = {
  periodo: string
  resumen: { totalIngresos: number; totalServicios: number; duracionPromedio: number; ticketPromedio: number }
  productividadOperarios: OpProductividad[]
  porServicio: ServicioMetrica[]
  porMaterial: MatMetrica[]
  evolucion: DiaMetrica[]
}

const PERIODOS = [
  { value: "hoy", label: "Hoy"      },
  { value: "7d",  label: "7 días"   },
  { value: "30d", label: "30 días"  },
  { value: "mes", label: "Este mes" },
]

function Barra({ valor, max, color = "#1E40AF" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
    </div>
  )
}

function Medal({ pos }: { pos: number }) {
  return <span className="text-lg">{["🥇","🥈","🥉"][pos] ?? `${pos+1}°`}</span>
}

function Avatar({ nombre, color = "#1E40AF" }: { nombre: string; color?: string }) {
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}, #38BDF8)` }}>
      {nombre[0]?.toUpperCase()}
    </div>
  )
}

export default function MetricasPage() {
  const [data,    setData]    = useState<MetricasData | null>(null)
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

  function cambiarPeriodo(p: string) { setPeriodo(p); fetchData(p) }

  const maxIngrOp  = Math.max(...(data?.productividadOperarios.map((o) => o.ingresos) ?? [1]), 1)
  const maxIngrSv  = Math.max(...(data?.porServicio.map((s) => s.ingresos) ?? [1]), 1)
  const maxEvol    = Math.max(...(data?.evolucion.map((d) => d.ingresos) ?? [1]), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Rentabilidad
          </h1>
          <p className="text-sm text-gray-500">Análisis de ingresos, operarios y servicios</p>
        </div>
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
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Ingresos totales",      value: formatARS(data.resumen.totalIngresos),    icon: DollarSign, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Servicios completados", value: data.resumen.totalServicios,               icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
              { label: "Ticket promedio",       value: formatARS(data.resumen.ticketPromedio),    icon: Award,      color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Tiempo promedio",       value: `${data.resumen.duracionPromedio} min`,    icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
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

          {/* Evolución */}
          {data.evolucion.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Evolución de ingresos
              </h2>
              <div className="flex items-end gap-1.5 h-32">
                {data.evolucion.map((d) => {
                  const pct   = maxEvol > 0 ? Math.round((d.ingresos / maxEvol) * 100) : 0
                  const fecha = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatARS(d.ingresos)}
                      </div>
                      <div className="w-full rounded-t cursor-pointer transition-all"
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          background: pct > 70 ? "linear-gradient(180deg,#38BDF8,#1E40AF)"
                            : pct > 40 ? "linear-gradient(180deg,#60A5FA,#3B82F6)" : "#BFDBFE",
                        }} />
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{fecha}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Productividad por operario ─────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-800">Productividad por operario</h2>
            </div>

            {data.productividadOperarios.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Sin datos para el período</p>
            ) : (
              <>
                {/* Tabla desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                        <th className="text-left px-5 py-3 font-semibold">Operario</th>
                        <th className="text-center px-4 py-3 font-semibold">
                          <span className="flex items-center justify-center gap-1"><Droplets className="w-3 h-3 text-blue-500"/>Lavados</span>
                        </th>
                        <th className="text-center px-4 py-3 font-semibold">
                          <span className="flex items-center justify-center gap-1"><Sparkles className="w-3 h-3 text-purple-500"/>Interiores</span>
                        </th>
                        <th className="text-center px-4 py-3 font-semibold">Total</th>
                        <th className="text-center px-4 py-3 font-semibold">T. Lavado</th>
                        <th className="text-center px-4 py-3 font-semibold">T. Interior</th>
                        <th className="text-right px-5 py-3 font-semibold">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.productividadOperarios.map((op, i) => (
                        <tr key={op.nombre} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Medal pos={i} />
                              <Avatar nombre={op.nombre} color={i === 0 ? "#1E40AF" : i === 1 ? "#059669" : "#7C3AED"} />
                              <span className="font-semibold text-gray-800">{op.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-blue-600">{op.lavados}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-purple-600">{op.interiores}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-gray-800">{op.totalServicios}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {op.tPromLavado > 0
                              ? <span className="text-gray-700">{op.tPromLavado} min</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {op.tPromInterior > 0
                              ? <span className="text-gray-700">{op.tPromInterior} min</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div>
                              <p className="font-bold text-gray-800">{formatARS(op.ingresos)}</p>
                              <div className="mt-1">
                                <Barra valor={op.ingresos} max={maxIngrOp}
                                  color={i === 0 ? "#1E40AF" : i === 1 ? "#059669" : "#7C3AED"} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards mobile */}
                <div className="md:hidden divide-y divide-gray-100">
                  {data.productividadOperarios.map((op, i) => (
                    <div key={op.nombre} className="px-4 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Medal pos={i} />
                          <Avatar nombre={op.nombre} />
                          <span className="font-semibold text-gray-800">{op.nombre}</span>
                        </div>
                        <span className="font-bold text-gray-800">{formatARS(op.ingresos)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50 rounded-lg py-2">
                          <p className="font-bold text-blue-700 text-lg">{op.lavados}</p>
                          <p className="text-xs text-blue-400">Lavados</p>
                          {op.tPromLavado > 0 && <p className="text-xs text-blue-500">{op.tPromLavado}min prom</p>}
                        </div>
                        <div className="bg-purple-50 rounded-lg py-2">
                          <p className="font-bold text-purple-700 text-lg">{op.interiores}</p>
                          <p className="text-xs text-purple-400">Interiores</p>
                          {op.tPromInterior > 0 && <p className="text-xs text-purple-500">{op.tPromInterior}min prom</p>}
                        </div>
                        <div className="bg-gray-50 rounded-lg py-2">
                          <p className="font-bold text-gray-700 text-lg">{op.totalServicios}</p>
                          <p className="text-xs text-gray-400">Total</p>
                        </div>
                      </div>
                      <Barra valor={op.ingresos} max={maxIngrOp} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Servicios más rentables */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" /> Servicios más rentables
            </h2>
            {data.porServicio.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {data.porServicio.map((s, i) => (
                  <div key={s.nombre} className="flex items-center gap-4">
                    <div className="w-7 text-center flex-shrink-0"><Medal pos={i} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</span>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">{s.cantidad}× · {s.duracionPromedio}min prom</span>
                          <span className="text-sm font-bold text-gray-800">{formatARS(s.ingresos)}</span>
                        </div>
                      </div>
                      <Barra valor={s.ingresos} max={maxIngrSv} color="#7C3AED" />
                      <div className="flex justify-between mt-0.5">
                        <span className="text-xs text-gray-400">Total facturado</span>
                        <span className="text-xs font-medium" style={{ color: s.margenPorMinuto > 500 ? "#059669" : "#6B7280" }}>
                          {formatARS(s.margenPorMinuto)}/min
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insight */}
          {data.productividadOperarios.length > 0 && data.porServicio.length > 0 && (
            <div className="rounded-2xl p-5 text-white"
              style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
              <p className="font-bold text-lg mb-3">💡 Insights del período</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Operario más activo</p>
                  <p className="font-bold">{data.productividadOperarios[0].nombre}</p>
                  <p className="text-white/70 text-xs">
                    {data.productividadOperarios[0].totalServicios} servicios ·{" "}
                    {formatARS(data.productividadOperarios[0].ingresos)}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Servicio estrella</p>
                  <p className="font-bold truncate">{data.porServicio[0].nombre}</p>
                  <p className="text-white/70 text-xs">
                    {data.porServicio[0].cantidad} veces · {formatARS(data.porServicio[0].ingresos)}
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[#38BDF8] text-xs font-semibold uppercase tracking-wide mb-1">Tiempo promedio total</p>
                  <p className="font-bold">{data.resumen.duracionPromedio} min</p>
                  <p className="text-white/70 text-xs">Ticket promedio {formatARS(data.resumen.ticketPromedio)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
