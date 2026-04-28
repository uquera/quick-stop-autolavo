"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Car, User, Wrench, CheckCircle2, XCircle, PlayCircle, ChevronRight } from "lucide-react"
import ServicioTimer from "./ServicioTimer"
import RegistroServicioForm from "./RegistroServicioForm"

type Servicio = {
  id: string
  estado: string
  horaIngreso: string
  horaInicio: string | null
  horaSalida: string | null
  duracionMinutos: number | null
  vehiculo: { placa: string; marca: string; modelo: string | null; tipo: string; color: string | null }
  tipoServicio: { nombre: string; precio: number; duracionMinutos: number }
  operario: { user: { name: string | null } } | null
  bahia: { id: string; nombre: string; color: string } | null
  observaciones: string | null
}

type Bahia = { id: string; nombre: string; color: string }

const ESTADO_LABEL: Record<string, string> = {
  EN_ESPERA: "En Espera",
  EN_PROCESO: "En Proceso",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
}

const ESTADO_NEXT: Record<string, string> = {
  EN_ESPERA: "EN_PROCESO",
  EN_PROCESO: "COMPLETADO",
}

const ESTADO_ICON: Record<string, typeof PlayCircle> = {
  EN_ESPERA: PlayCircle,
  EN_PROCESO: CheckCircle2,
}

interface Props {
  bahias: Bahia[]
  userRole: string
  operarioId?: string
}

export default function ColaServiciosBoard({ bahias, userRole, operarioId }: Props) {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>("activos")

  const fetchServicios = useCallback(async () => {
    try {
      const hoy = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/servicios?fecha=${hoy}`)
      if (!res.ok) return
      const data = await res.json()
      setServicios(data)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServicios()
    const id = setInterval(fetchServicios, 10000)
    return () => clearInterval(id)
  }, [fetchServicios])

  async function cambiarEstado(servicioId: string, nuevoEstado: string) {
    try {
      const res = await fetch(`/api/servicios/${servicioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) { toast.error("Error actualizando estado"); return }
      const updated = await res.json()
      setServicios((prev) => prev.map((s) => (s.id === servicioId ? updated : s)))
      toast.success(`Servicio marcado como ${ESTADO_LABEL[nuevoEstado]}`)
    } catch {
      toast.error("Error de conexión")
    }
  }

  const activos = servicios.filter((s) => s.estado === "EN_ESPERA" || s.estado === "EN_PROCESO")
  const completados = servicios.filter((s) => s.estado === "COMPLETADO" || s.estado === "CANCELADO")

  const serviciosMostrados = filtroEstado === "activos" ? activos : completados

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltroEstado("activos")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "activos"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Activos ({activos.length})
          </button>
          <button
            onClick={() => setFiltroEstado("historial")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtroEstado === "historial"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Historial hoy ({completados.length})
          </button>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}
        >
          <Car className="w-4 h-4" />
          Nuevo Ingreso
        </button>
      </div>

      {/* Vista por bahías (solo activos) */}
      {filtroEstado === "activos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bahias.map((bahia) => {
            const enBahia = serviciosMostrados.filter((s) => s.bahia?.id === bahia.id)
            const sinBahia = serviciosMostrados.filter((s) => !s.bahia)
            return (
              <div key={bahia.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: bahia.color + "20", borderBottom: `2px solid ${bahia.color}` }}
                >
                  <span className="font-semibold text-sm" style={{ color: bahia.color }}>
                    {bahia.nombre}
                  </span>
                  <span className="text-xs text-gray-500">{enBahia.length} servicio(s)</span>
                </div>
                <div className="p-3 space-y-3 min-h-[120px]">
                  {enBahia.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Disponible</p>
                  ) : (
                    enBahia.map((s) => <ServicioCard key={s.id} servicio={s} onCambiarEstado={cambiarEstado} userRole={userRole} />)
                  )}
                </div>
              </div>
            )
            // suppress unused sinBahia
            void sinBahia
          })}

          {/* Sin bahía asignada */}
          {serviciosMostrados.filter((s) => !s.bahia).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b-2 border-gray-300 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-600">Sin Bahía</span>
              </div>
              <div className="p-3 space-y-3">
                {serviciosMostrados
                  .filter((s) => !s.bahia)
                  .map((s) => <ServicioCard key={s.id} servicio={s} onCambiarEstado={cambiarEstado} userRole={userRole} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial (lista) */}
      {filtroEstado === "historial" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {completados.length === 0 ? (
            <p className="text-center text-gray-400 py-12">Sin servicios completados hoy</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {completados.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Car className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{s.vehiculo.placa} — {s.vehiculo.marca}</p>
                      <p className="text-xs text-gray-500">{s.tipoServicio.nombre}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <ServicioTimer
                      horaInicio={s.horaInicio}
                      horaIngreso={s.horaIngreso}
                      duracionEstimada={s.tipoServicio.duracionMinutos}
                      estado={s.estado}
                      duracionFinal={s.duracionMinutos}
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.estado === "COMPLETADO" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {ESTADO_LABEL[s.estado]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <RegistroServicioForm
          bahias={bahias}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchServicios() }}
        />
      )}
    </div>
  )
}

function ServicioCard({
  servicio: s,
  onCambiarEstado,
  userRole,
}: {
  servicio: Servicio
  onCambiarEstado: (id: string, estado: string) => void
  userRole: string
}) {
  const nextEstado = ESTADO_NEXT[s.estado]
  const NextIcon = ESTADO_ICON[s.estado]

  const estadoBg =
    s.estado === "EN_ESPERA"
      ? "border-amber-300 bg-amber-50/50"
      : "border-emerald-300 bg-emerald-50/50"

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${estadoBg}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm text-gray-800">{s.vehiculo.placa}</p>
          <p className="text-xs text-gray-500">{s.vehiculo.marca} {s.vehiculo.modelo}</p>
        </div>
        <ServicioTimer
          horaInicio={s.horaInicio}
          horaIngreso={s.horaIngreso}
          duracionEstimada={s.tipoServicio.duracionMinutos}
          estado={s.estado}
          duracionFinal={s.duracionMinutos}
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-600">
        <Wrench className="w-3 h-3" />
        <span>{s.tipoServicio.nombre}</span>
      </div>

      {s.operario && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>{s.operario.user.name}</span>
        </div>
      )}

      {nextEstado && (
        <button
          onClick={() => onCambiarEstado(s.id, nextEstado)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-all text-white"
          style={{ background: nextEstado === "EN_PROCESO" ? "#F59E0B" : "#10B981" }}
        >
          {NextIcon && <NextIcon className="w-3.5 h-3.5" />}
          {nextEstado === "EN_PROCESO" ? "Iniciar" : "Completar"}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
