"use client"

import { useCallback, useEffect, useState } from "react"
import { TrendingUp, DollarSign, Clock, Award, Users, Droplets, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}

type OpProductividad = {
  nombre: string; lavados: number; interiores: number; totalServicios: number
  ingresos: number; tPromLavado: number; tPromInterior: number
}
type ServicioMetrica = { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number; margenPorMinuto: number }
type DiaMetrica      = { fecha: string; ingresos: number; cantidad: number }
type MetricasData = {
  resumen: { totalIngresos: number; totalServicios: number; duracionPromedio: number; ticketPromedio: number }
  productividadOperarios: OpProductividad[]
  porServicio: ServicioMetrica[]
  evolucion: DiaMetrica[]
}

const PERIODOS = [
  { value: "hoy", label: "Hoy" },
  { value: "7d",  label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "mes", label: "Este mes" },
]

function Barra({ valor, max, color = "#1E40AF" }: { valor: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }} />
    </div>
  )
}

function Medal({ pos }: { pos: number }) {
  return <span className="text-base">{["🥇","🥈","🥉"][pos] ?? `${pos+1}°`}</span>
}

export default function RentabilidadPanel() {
  const [data,    setData]    = useState<MetricasData | null>(null)
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

  const maxOp  = Math.max(...(data?.productividadOperarios.map((o) => o.ingresos) ?? [1]), 1)
  const maxSv  = Math.max(...(data?.porServicio.map((s) => s.ingresos) ?? [1]), 1)
  const maxEv  = Math.max(...(data?.evolucion.map((d) => d.ingresos) ?? [1]), 1)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" /> Rentabilidad
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {PERIODOS.map(({ value, label }) => (
              <button key={value} onClick={() => { setPeriodo(value); fetchData(value) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${periodo === value ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>
          <Link href="/admin/metricas"
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap">
            Ver detalle →
          </Link>
        </div>
      </div>

      {loading && !data && (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Ingresos período",  value: formatARS(data.resumen.totalIngresos),  icon: DollarSign, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Ticket promedio",   value: formatARS(data.resumen.ticketPromedio),  icon: Award,      color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Tiempo promedio",   value: `${data.resumen.duracionPromedio} min`, icon: Clock,      color: "#D97706", bg: "#FFFBEB" },
              { label: "Completados",       value: data.resumen.totalServicios,             icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
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

          {/* Evolución */}
          {data.evolucion.length > 1 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Evolución de ingresos</p>
              <div className="flex items-end gap-1 h-24">
                {data.evolucion.map((d) => {
                  const pct   = maxEv > 0 ? Math.round((d.ingresos / maxEv) * 100) : 0
                  const fecha = new Date(d.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                  return (
                    <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {fecha}: {formatARS(d.ingresos)}
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

          {/* Productividad operarios */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" /> Productividad por operario
            </p>
            {data.productividadOperarios.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {data.productividadOperarios.slice(0, 5).map((op, i) => (
                  <div key={op.nombre}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Medal pos={i} />
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#1E40AF,#38BDF8)" }}>
                          {op.nombre[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{op.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-0.5">
                            <Droplets className="w-3 h-3 text-blue-400" />{op.lavados}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3 text-purple-400" />{op.interiores}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">{formatARS(op.ingresos)}</span>
                      </div>
                    </div>
                    <Barra valor={op.ingresos} max={maxOp} />
                    <div className="flex justify-between mt-0.5 text-xs text-gray-400">
                      <span>{op.totalServicios} servicios</span>
                      <span>
                        {op.tPromLavado > 0 && `Lav. ${op.tPromLavado}min`}
                        {op.tPromLavado > 0 && op.tPromInterior > 0 && " · "}
                        {op.tPromInterior > 0 && `Int. ${op.tPromInterior}min`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Servicios */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Servicios más rentables
            </p>
            {data.porServicio.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {data.porServicio.slice(0, 4).map((s, i) => (
                  <div key={s.nombre} className="flex items-center gap-3">
                    <Medal pos={i} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 truncate">{s.nombre}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">{s.cantidad}×</span>
                          <span className="text-sm font-bold text-gray-800">{formatARS(s.ingresos)}</span>
                        </div>
                      </div>
                      <Barra valor={s.ingresos} max={maxSv} color="#7C3AED" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
