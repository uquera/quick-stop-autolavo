"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, Clock, DollarSign, Car, TrendingUp, FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"

type ReporteData = {
  totalVehiculos: number
  totalCompletados: number
  totalIngresos: number
  duracionPromedio: number
  porMetodo: Record<string, number>
  porTipo: { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number }[]
  porHora: Record<number, number>
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo", TRANSFERENCIA: "Transferencia", TARJETA: "Tarjeta/Débito",
  MERCADOPAGO: "Mercado Pago", BILLETERA: "Billetera", SIN_REGISTRAR: "Sin registrar",
}

function hoy() { return new Date().toISOString().split("T")[0] }
function ayer() {
  const d = new Date(); d.setDate(d.getDate() - 1)
  return d.toISOString().split("T")[0]
}
function inicioSemana() {
  const d = new Date(); d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1))
  return d.toISOString().split("T")[0]
}
function inicioMes() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

const FILTROS_RAPIDOS = [
  { label: "Hoy",   desde: hoy,         hasta: hoy },
  { label: "Ayer",  desde: ayer,        hasta: ayer },
  { label: "Semana", desde: inicioSemana, hasta: hoy },
  { label: "Mes",   desde: inicioMes,   hasta: hoy },
]

export default function ReportesPage() {
  const [data, setData] = useState<ReporteData | null>(null)
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [loading, setLoading] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [filtroActivo, setFiltroActivo] = useState("Hoy")

  const fetchData = useCallback(async (d = desde, h = hasta) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reportes?desde=${d}&hasta=${h}T23:59:59`)
      if (res.ok) setData(await res.json())
    } finally { setLoading(false) }
  }, [desde, hasta])

  useEffect(() => { fetchData() }, [])

  function aplicarFiltro(label: string, desdeF: () => string, hastaF: () => string) {
    const d = desdeF(), h = hastaF()
    setDesde(d); setHasta(h)
    setFiltroActivo(label)
    fetchData(d, h)
  }

  async function handleGenerarPDF() {
    if (!data) return
    setGenerandoPDF(true)
    try {
      const { generarReportePDF } = await import("@/lib/generarReportePDF")
      await generarReportePDF(data, desde, hasta)
      toast.success("PDF descargado correctamente")
    } catch (err) {
      console.error(err)
      toast.error("Error generando el PDF")
    } finally { setGenerandoPDF(false) }
  }

  const maxPorHora = data ? Math.max(...Object.values(data.porHora), 1) : 1

  return (
    <div className="space-y-5">
      {/* Título + botón PDF */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Reportes</h1>
          <p className="text-sm text-gray-500">Estadísticas de ingresos y servicios</p>
        </div>
        <button
          onClick={handleGenerarPDF}
          disabled={!data || generandoPDF}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 shadow-sm"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}
        >
          {generandoPDF
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
            : <><FileDown className="w-4 h-4" /> Descargar PDF</>}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FILTROS_RAPIDOS.map(({ label, desde: d, hasta: h }) => (
            <button
              key={label}
              onClick={() => aplicarFiltro(label, d, h)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filtroActivo === label
                  ? "text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={filtroActivo === label ? { background: "linear-gradient(135deg, #1E40AF, #38BDF8)" } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Rango personalizado */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Rango personalizado</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Desde</label>
              <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setFiltroActivo("") }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hasta</label>
              <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setFiltroActivo("") }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <button
              onClick={() => { setFiltroActivo(""); fetchData() }}
              disabled={loading}
              className="px-5 py-2 text-white text-sm font-semibold rounded-lg disabled:opacity-60 flex items-center gap-2"
              style={{ background: "#1E40AF" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Aplicar rango
            </button>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {loading && !data && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Vehículos atendidos", value: data.totalVehiculos, icon: Car, color: "#1E40AF", bg: "#EFF6FF" },
              { label: "Completados", value: data.totalCompletados, icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
              { label: "Ingresos totales", value: formatARS(data.totalIngresos), icon: DollarSign, color: "#7C3AED", bg: "#F5F3FF" },
              { label: "Tiempo promedio", value: `${data.duracionPromedio}min`, icon: Clock, color: "#D97706", bg: "#FFFBEB" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Ingresos por método */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" /> Ingresos por método de pago
              </h2>
              {Object.keys(data.porMetodo).length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin pagos registrados</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.porMetodo).sort((a, b) => b[1] - a[1]).map(([metodo, total]) => {
                    const pct = data.totalIngresos > 0 ? Math.round((total / data.totalIngresos) * 100) : 0
                    return (
                      <div key={metodo}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{METODO_LABEL[metodo] ?? metodo}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{pct}%</span>
                            <span className="font-semibold text-gray-800">{formatARS(total)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #1E40AF, #38BDF8)" }} />
                        </div>
                      </div>
                    )
                  })}
                  {/* Total */}
                  <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-blue-700">{formatARS(data.totalIngresos)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Por tipo de servicio */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" /> Servicios por tipo
              </h2>
              {data.porTipo.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.porTipo.map((t) => {
                    const maxCantidad = Math.max(...data.porTipo.map((x) => x.cantidad), 1)
                    const pct = Math.round((t.cantidad / maxCantidad) * 100)
                    return (
                      <div key={t.nombre}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 truncate max-w-[140px]">{t.nombre}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs text-gray-400">{t.duracionPromedio}min prom.</span>
                            <span className="font-semibold text-gray-800">{t.cantidad} serv.</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatARS(t.ingresos)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Flujo por hora */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Flujo de vehículos por hora del día
            </h2>
            <div className="flex items-end gap-1 h-28">
              {Array.from({ length: 13 }, (_, i) => i + 7).map((hora) => {
                const cantidad = data.porHora[hora] ?? 0
                const pct = Math.round((cantidad / maxPorHora) * 100)
                return (
                  <div key={hora} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-xs text-gray-600 font-semibold">{cantidad || ""}</span>
                    <div className="w-full rounded-t" style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: cantidad > 0
                        ? "linear-gradient(180deg, #38BDF8 0%, #1E40AF 100%)"
                        : "#E5E7EB",
                    }} />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{hora}h</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
