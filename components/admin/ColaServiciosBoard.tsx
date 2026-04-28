"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Car, User, Wrench, CheckCircle2, ChevronRight, X, DollarSign,
  MoreVertical, Pencil, Trash2, ArrowRightLeft,
} from "lucide-react"
import ServicioTimer from "./ServicioTimer"
import RegistroServicioForm from "./RegistroServicioForm"

type ServicioItem = { id: string; nombre: string; precio: number }
type Servicio = {
  id: string
  estado: string
  horaIngreso: string
  horaInicio: string | null
  horaSalida: string | null
  duracionMinutos: number | null
  monto: number | null
  total: number | null
  metodoPago: string | null
  observaciones: string | null
  vehiculo: { placa: string; marca: string; modelo: string | null; tipo: string; color: string | null }
  tipoServicio: { nombre: string; precio: number; duracionMinutos: number } | null
  items: ServicioItem[]
  operario: { id?: string; user: { name: string | null } } | null
  bahia: { id: string; nombre: string; color: string } | null
}
type Bahia = { id: string; nombre: string; color: string }
type Operario = { id: string; user: { name: string | null } }

const METODOS_PAGO = [
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA",       label: "Tarjeta débito / crédito" },
]

function nombreServicios(s: Servicio) {
  if (s.items?.length) return s.items.map((i) => i.nombre).join(" + ")
  return s.tipoServicio?.nombre ?? "Servicio"
}
function duracionEstimada(s: Servicio) {
  return s.tipoServicio?.duracionMinutos ?? 30
}

// ── Modal completar + pago ──────────────────────────────────────────────────
function ModalCompletar({ servicio, onConfirmar, onCerrar }: {
  servicio: Servicio
  onConfirmar: (metodoPago: string, total: number) => void
  onCerrar: () => void
}) {
  const [metodo, setMetodo] = useState("EFECTIVO")
  const [total, setTotal]   = useState(String(servicio.total ?? servicio.monto ?? 0))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
          <div className="flex items-center gap-2 text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Completar servicio</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-gray-800">{servicio.vehiculo.placa} — {servicio.vehiculo.marca}</p>
            <p className="text-xs text-gray-500 mt-0.5">{nombreServicios(servicio)}</p>
            {servicio.operario && <p className="text-xs text-gray-400">Operario: {servicio.operario.user.name}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Método de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((m) => (
                <button key={m.value} type="button" onClick={() => setMetodo(m.value)}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${metodo === m.value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Total a cobrar (COP)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} min="0"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onConfirmar(metodo, parseFloat(total) || 0)}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}>
              <CheckCircle2 className="w-4 h-4" /> Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar servicio ───────────────────────────────────────────────────
function ModalEditar({ servicio, bahias, operarios, onGuardar, onCerrar }: {
  servicio: Servicio
  bahias: Bahia[]
  operarios: Operario[]
  onGuardar: (id: string, data: Record<string, string>) => void
  onCerrar: () => void
}) {
  const [bahiaId,    setBahiaId]    = useState(servicio.bahia?.id ?? "")
  const [operarioId, setOperarioId] = useState("")
  const [observaciones, setObs]     = useState(servicio.observaciones ?? "")

  // Cargar operarioId desde la relación
  useEffect(() => {
    const op = operarios.find((o) => o.user.name === servicio.operario?.user.name)
    if (op) setOperarioId(op.id)
  }, [operarios, servicio.operario])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
          <div className="flex items-center gap-2 text-white">
            <Pencil className="w-4 h-4" />
            <span className="font-semibold">Editar servicio</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-gray-800 font-mono">{servicio.vehiculo.placa}</p>
            <p className="text-xs text-gray-500">{nombreServicios(servicio)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Bahía *</label>
            <select value={bahiaId} onChange={(e) => setBahiaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">— Selecciona bahía —</option>
              {bahias.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Operario *</label>
            <select value={operarioId} onChange={(e) => setOperarioId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">— Selecciona operario —</option>
              {operarios.map((o) => <option key={o.id} value={o.id}>{o.user.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Instrucciones especiales..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onGuardar(servicio.id, { bahiaId, operarioId, observaciones })}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
              <CheckCircle2 className="w-4 h-4" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal reasignar (bahía + operario rápido) ───────────────────────────────
function ModalReasignar({ servicio, bahias, operarios, onGuardar, onCerrar }: {
  servicio: Servicio
  bahias: Bahia[]
  operarios: Operario[]
  onGuardar: (id: string, data: Record<string, string>) => void
  onCerrar: () => void
}) {
  const [bahiaId,    setBahiaId]    = useState(servicio.bahia?.id ?? "")
  const [operarioId, setOperarioId] = useState("")

  useEffect(() => {
    const op = operarios.find((o) => o.user.name === servicio.operario?.user.name)
    if (op) setOperarioId(op.id)
  }, [operarios, servicio.operario])

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
          <div className="flex items-center gap-2 text-white">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="font-semibold">Reasignar servicio</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
            <p className="font-bold text-gray-800 font-mono">{servicio.vehiculo.placa} — {servicio.vehiculo.marca}</p>
            <p className="text-xs text-gray-500">{nombreServicios(servicio)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Actual: {servicio.bahia?.nombre ?? "Sin bahía"} · {servicio.operario?.user.name ?? "Sin operario"}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Nueva bahía</label>
            <div className="grid grid-cols-2 gap-2">
              {bahias.map((b) => (
                <button key={b.id} type="button" onClick={() => setBahiaId(b.id)}
                  className={`py-2.5 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${bahiaId === b.id ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  style={bahiaId === b.id ? { background: b.color } : {}}>
                  {b.nombre}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Nuevo operario</label>
            <div className="space-y-1.5">
              {operarios.map((o) => (
                <button key={o.id} type="button" onClick={() => setOperarioId(o.id)}
                  className={`w-full py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left flex items-center gap-2 ${operarioId === o.id ? "border-purple-600 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:border-purple-300"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${operarioId === o.id ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {(o.user.name ?? "?")[0].toUpperCase()}
                  </div>
                  {o.user.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onGuardar(servicio.id, { bahiaId, operarioId })}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
              <ArrowRightLeft className="w-4 h-4" /> Reasignar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card de servicio con menú 3 puntos ─────────────────────────────────────
function ServicioCard({
  servicio: s,
  onCompletar,
  onEditar,
  onReasignar,
  onEliminar,
}: {
  servicio: Servicio
  onCompletar: (s: Servicio) => void
  onEditar: (s: Servicio) => void
  onReasignar: (s: Servicio) => void
  onEliminar: (id: string) => void
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar al click fuera
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAbierto(false)
      }
    }
    if (menuAbierto) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuAbierto])

  const estadoEstilo =
    s.estado === "EN_ESPERA"
      ? "border-amber-300 bg-amber-50/60"
      : "border-emerald-400 bg-emerald-50/60"

  return (
    <div className={`rounded-xl border-2 p-3 space-y-2 ${estadoEstilo}`}>
      {/* Encabezado: placa + cronómetro + menú */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-black text-gray-800 tracking-wider font-mono">{s.vehiculo.placa}</p>
          <p className="text-xs text-gray-500">{s.vehiculo.marca} {s.vehiculo.modelo}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ServicioTimer
            horaInicio={s.horaInicio}
            horaIngreso={s.horaIngreso}
            duracionEstimada={duracionEstimada(s)}
            estado={s.estado}
            duracionFinal={s.duracionMinutos}
          />
          {/* Menú 3 puntos */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuAbierto((v) => !v)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors text-gray-500 hover:text-gray-700"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuAbierto && (
              <div className="absolute right-0 top-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-44 overflow-hidden">
                <button
                  onClick={() => { setMenuAbierto(false); onEditar(s) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => { setMenuAbierto(false); onReasignar(s) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Reasignar
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setMenuAbierto(false); onEliminar(s.id) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
        <Wrench className="w-3 h-3 flex-shrink-0 text-gray-400" />
        <span className="truncate">{nombreServicios(s)}</span>
      </div>

      {s.total != null && (
        <div className="flex items-center gap-1 text-xs text-blue-700 font-bold">
          <DollarSign className="w-3 h-3" />
          <span>${s.total.toLocaleString("es-CO")}</span>
        </div>
      )}

      {s.operario && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User className="w-3 h-3" />
          <span>{s.operario.user.name}</span>
        </div>
      )}

      {s.estado === "EN_PROCESO" && (
        <button onClick={() => onCompletar(s)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg text-white hover:opacity-90 transition-all"
          style={{ background: "#10B981" }}>
          <CheckCircle2 className="w-3.5 h-3.5" /> Completar y cobrar <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────
interface Props { bahias: Bahia[]; userRole: string }

export default function ColaServiciosBoard({ bahias, userRole }: Props) {
  const [activos, setActivos]         = useState<Servicio[]>([])
  const [historial, setHistorial]     = useState<Servicio[]>([])
  const [operarios, setOperarios]     = useState<Operario[]>([])
  const [tab, setTab]                 = useState<"activos" | "historial">("activos")
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [completando, setCompletando] = useState<Servicio | null>(null)
  const [editando, setEditando]       = useState<Servicio | null>(null)
  const [reasignando, setReasignando] = useState<Servicio | null>(null)
  const intervalRef                   = useRef<NodeJS.Timeout | null>(null)

  const fetchActivos = useCallback(async () => {
    try {
      const res = await fetch("/api/servicios?activos=true")
      if (res.ok) setActivos(await res.json())
    } catch { /* silencioso */ } finally { setLoading(false) }
  }, [])

  const fetchHistorial = useCallback(async () => {
    try {
      const res = await fetch("/api/servicios?historial=true")
      if (res.ok) setHistorial(await res.json())
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    fetch("/api/operarios").then((r) => r.json()).then((d) => setOperarios(Array.isArray(d) ? d : [])).catch(() => {})
    fetchActivos()
    fetchHistorial()
    intervalRef.current = setInterval(() => {
      fetchActivos()
      fetchHistorial()
    }, 10000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchActivos, fetchHistorial])

  // ── Completar ──────────────────────────────────────────────────────────
  async function completarServicio(metodoPago: string, total: number) {
    if (!completando) return
    const id = completando.id
    try {
      const res = await fetch(`/api/servicios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "COMPLETADO", metodoPago, total }),
      })
      if (!res.ok) { toast.error("Error completando servicio"); return }
      const updated = await res.json()
      setActivos((prev) => prev.filter((s) => s.id !== id))
      setHistorial((prev) => [updated, ...prev])
      setCompletando(null)
      toast.success(`✅ Completado · ${metodoPago} · $${total.toLocaleString("es-CO")}`)
    } catch { toast.error("Error de conexión") }
  }

  // ── Editar ─────────────────────────────────────────────────────────────
  async function guardarEdicion(id: string, data: Record<string, string>) {
    try {
      const res = await fetch(`/api/servicios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error("Error guardando cambios"); return }
      const updated = await res.json()
      setActivos((prev) => prev.map((s) => s.id === id ? updated : s))
      setEditando(null)
      toast.success("Servicio actualizado")
    } catch { toast.error("Error de conexión") }
  }

  // ── Reasignar ──────────────────────────────────────────────────────────
  async function guardarReasignacion(id: string, data: Record<string, string>) {
    try {
      const res = await fetch(`/api/servicios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error("Error reasignando"); return }
      const updated = await res.json()
      setActivos((prev) => prev.map((s) => s.id === id ? updated : s))
      setReasignando(null)
      toast.success("Servicio reasignado")
    } catch { toast.error("Error de conexión") }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────
  async function eliminarServicio(id: string) {
    if (!confirm("¿Eliminar este servicio? Esta acción no se puede deshacer.")) return
    try {
      const res = await fetch(`/api/servicios/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error eliminando servicio"); return }
      setActivos((prev) => prev.filter((s) => s.id !== id))
      toast.success("Servicio eliminado")
    } catch { toast.error("Error de conexión") }
  }

  const activosPorBahia = (id: string) => activos.filter((s) => s.bahia?.id === id)
  const sinBahia = activos.filter((s) => !s.bahia)

  return (
    <div className="space-y-4">
      {/* Tabs + botón */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setTab("activos")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "activos" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            Activos ({activos.length})
          </button>
          <button onClick={() => { setTab("historial"); fetchHistorial() }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "historial" ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
            Historial hoy ({historial.length})
          </button>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Car className="w-4 h-4" /> Nuevo Ingreso
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Kanban activos */}
      {!loading && tab === "activos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {bahias.map((bahia) => {
            const enBahia = activosPorBahia(bahia.id)
            return (
              <div key={bahia.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 flex items-center justify-between"
                  style={{ backgroundColor: bahia.color + "18", borderBottom: `3px solid ${bahia.color}` }}>
                  <span className="font-bold text-sm" style={{ color: bahia.color }}>{bahia.nombre}</span>
                  <span className="text-xs text-gray-400">{enBahia.length} activo(s)</span>
                </div>
                <div className="p-3 space-y-3 flex-1 min-h-[100px]">
                  {enBahia.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">Disponible</p>
                  ) : enBahia.map((s) => (
                    <ServicioCard key={s.id} servicio={s}
                      onCompletar={setCompletando}
                      onEditar={setEditando}
                      onReasignar={setReasignando}
                      onEliminar={eliminarServicio}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {sinBahia.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-sm text-gray-500">Sin Bahía</span>
                <span className="text-xs text-gray-400">{sinBahia.length} pendiente(s)</span>
              </div>
              <div className="p-3 space-y-3">
                {sinBahia.map((s) => (
                  <ServicioCard key={s.id} servicio={s}
                    onCompletar={setCompletando}
                    onEditar={setEditando}
                    onReasignar={setReasignando}
                    onEliminar={eliminarServicio}
                  />
                ))}
              </div>
            </div>
          )}

          {activos.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
              <Car className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">Sin servicios activos</p>
              <p className="text-xs mt-1">Usa "Nuevo Ingreso" para registrar un vehículo</p>
            </div>
          )}
        </div>
      )}

      {/* Historial */}
      {!loading && tab === "historial" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {historial.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Sin servicios completados hoy</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {historial.map((s) => (
                <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Car className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 font-mono">
                        {s.vehiculo.placa} <span className="font-normal text-gray-500 text-sm">— {s.vehiculo.marca}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {nombreServicios(s)}{s.operario && ` · ${s.operario.user.name}`}{s.bahia && ` · ${s.bahia.nombre}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ServicioTimer
                      horaInicio={s.horaInicio}
                      horaIngreso={s.horaIngreso}
                      duracionEstimada={duracionEstimada(s)}
                      estado={s.estado}
                      duracionFinal={s.duracionMinutos}
                    />
                    {s.total != null && <span className="font-bold text-gray-800 text-sm">${s.total.toLocaleString("es-CO")}</span>}
                    {s.metodoPago && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{s.metodoPago}</span>}
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Completado</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {completando && (
        <ModalCompletar servicio={completando} onConfirmar={completarServicio} onCerrar={() => setCompletando(null)} />
      )}
      {editando && (
        <ModalEditar servicio={editando} bahias={bahias} operarios={operarios} onGuardar={guardarEdicion} onCerrar={() => setEditando(null)} />
      )}
      {reasignando && (
        <ModalReasignar servicio={reasignando} bahias={bahias} operarios={operarios} onGuardar={guardarReasignacion} onCerrar={() => setReasignando(null)} />
      )}
      {showForm && (
        <RegistroServicioForm bahias={bahias} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchActivos() }} />
      )}
    </div>
  )
}
