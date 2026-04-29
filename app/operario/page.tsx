"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, DollarSign, Wrench, TrendingUp, Car } from "lucide-react"

type Metricas = {
  completadosHoy: number
  ingresosHoy: number
  tiempoPromedio: number
  totalHistorico: number
  activosAhora: number
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}

export default function OperarioDashboard() {
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch("/api/operarios/mis-metricas")
      .then((r) => r.json())
      .then(setMetricas)
      .finally(() => setLoading(false))
  }, [])

  const hoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Mi Dashboard</h1>
        <p className="text-sm text-gray-500 capitalize">{hoy}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : metricas ? (
        <>
          {/* KPIs personales */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: "Completados hoy",
                value: metricas.completadosHoy,
                icon: CheckCircle2,
                color: "#059669",
                bg: "#ECFDF5",
                suffix: "servicios",
              },
              {
                label: "En proceso ahora",
                value: metricas.activosAhora,
                icon: Wrench,
                color: "#D97706",
                bg: "#FFFBEB",
                suffix: "activos",
              },
              {
                label: "Ingresos generados hoy",
                value: formatARS(metricas.ingresosHoy),
                icon: DollarSign,
                color: "#1E40AF",
                bg: "#EFF6FF",
                suffix: "",
              },
              {
                label: "Tiempo promedio",
                value: metricas.tiempoPromedio > 0 ? `${metricas.tiempoPromedio} min` : "—",
                icon: Clock,
                color: "#7C3AED",
                bg: "#F5F3FF",
                suffix: "por servicio",
              },
              {
                label: "Total histórico",
                value: metricas.totalHistorico,
                icon: TrendingUp,
                color: "#0891B2",
                bg: "#ECFEFF",
                suffix: "completados",
              },
            ].map(({ label, value, icon: Icon, color, bg, suffix }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-2xl font-black text-gray-800">{value}</p>
                {suffix && <p className="text-xs text-gray-400 mt-0.5">{suffix}</p>}
                <p className="text-xs font-medium text-gray-500 mt-2">{label}</p>
              </div>
            ))}
          </div>

          {/* Mensaje motivacional */}
          <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-[#38BDF8]" />
              </div>
              <div>
                <p className="font-bold text-lg">
                  {metricas.completadosHoy === 0
                    ? "¡Listo para empezar!"
                    : metricas.completadosHoy < 5
                    ? "¡Buen comienzo!"
                    : metricas.completadosHoy < 10
                    ? "¡Excelente ritmo!"
                    : "¡Día productivo!"}
                </p>
                <p className="text-white/70 text-sm mt-0.5">
                  {metricas.completadosHoy === 0
                    ? "Ve a la cola de servicios para empezar a atender vehículos."
                    : `Has completado ${metricas.completadosHoy} servicio(s) hoy generando ${formatARS(metricas.ingresosHoy)}.`}
                </p>
              </div>
            </div>
          </div>

          {/* Acceso rápido */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acceso rápido</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/operario/servicios", label: "Cola de Servicios", icon: Wrench, color: "#1E40AF" },
                { href: "/operario/bahias",    label: "Ver Bahías",        icon: Car,   color: "#059669" },
              ].map(({ href, label, icon: Icon, color }) => (
                <a key={href} href={href}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "18" }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-400 text-center py-12">No se pudieron cargar las métricas</p>
      )}
    </div>
  )
}
