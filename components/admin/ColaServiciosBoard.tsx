"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Car, User, Wrench, CheckCircle2, ChevronRight, X, DollarSign,
  MoreVertical, Pencil, Trash2, Droplets, Wind, Sparkles, CreditCard,
  ArrowRight, Clock,
} from "lucide-react"
import ServicioTimer from "./ServicioTimer"
import RegistroServicioForm from "./RegistroServicioForm"

type ServicioItem = { id: string; nombre: string; precio: number }
type OpRef = { id?: string; user: { name: string | null } } | null
type Servicio = {
  id: string
  estado: string
  etapa: string | null
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
  operario:   OpRef
  opExterior: OpRef
  opSecado:   OpRef
  opInterior: OpRef
}
type Operario = { id: string; user: { name: string | null } }

const METODOS_PAGO = [
  { value: "EFECTIVO",      label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA",       label: "Tarjeta débito/crédito" },
  { value: "MERCADOPAGO",   label: "MercadoPago" },
]

const ETAPAS = [
  { key: "EN_ESPERA",  label: "En Espera",      icon: Clock,      color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
  { key: "EXTERIOR",   label: "Lav. Exterior",  icon: Droplets,   color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { key: "SECADO",     label: "Secado",          icon: Wind,       color: "#0284C7", bg: "#F0F9FF", border: "#BAE6FD" },
  { key: "INTERIOR",   label: "Lav. Interior",  icon: Sparkles,   color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { key: "POR_COBRAR", label: "Por Cobrar",      icon: CreditCard, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
]

function nombreServicios(s: Servicio) {
  if (s.items?.length) return s.items.map((i) => i.nombre).join(" + ")
  return s.tipoServicio?.nombre ?? "Servicio"
}
function duracionEstimada(s: Servicio) {
  return s.tipoServicio?.duracionMinutos ?? 30
}

// ── Modal cobrar ──────────────────────────────────────────────────────────────
function ModalCobrar({ servicio, onConfirmar, onCerrar }: {
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
          style={{ background: "linear-gradient(135deg, #065F46, #059669)" }}>
          <div className="flex items-center gap-2 text-white">
            <CreditCard className="w-5 h-5" />
            <span className="font-semibold">Registrar pago</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="font-bold text-gray-800">{servicio.vehiculo.placa} — {servicio.vehiculo.marca}</p>
            <p className="text-xs text-gray-500 mt-0.5">{nombreServicios(servicio)}</p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              {servicio.opExterior && <span>Ext: {servicio.opExterior.user.name}</span>}
              {servicio.opSecado   && <span>Sec: {servicio.opSecado.user.name}</span>}
              {servicio.opInterior && <span>Int: {servicio.opInterior.user.name}</span>}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-2 block">Método de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_PAGO.map((m) => (
                <button key={m.value} type="button" onClick={() => setMetodo(m.value)}
                  className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${metodo === m.value ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-emerald-300"}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Total a cobrar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} min="0"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onConfirmar(metodo, parseFloat(total) || 0)}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #065F46, #059669)" }}>
              <CheckCircle2 className="w-4 h-4" /> Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal editar ──────────────────────────────────────────────────────────────
function ModalEditar({ servicio, operarios, onGuardar, onCerrar }: {
  servicio: Servicio
  operarios: Operario[]
  onGuardar: (id: string, data: Record<string, string>) => void
  onCerrar: () => void
}) {
  const [operarioId,    setOperarioId]    = useState("")
  const [observaciones, setObs]           = useState(servicio.observaciones ?? "")

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
            <Pencil className="w-4 h-4" /><span className="font-semibold">Editar servicio</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-gray-800 font-mono">{servicio.vehiculo.placa}</p>
            <p className="text-xs text-gray-500">{nombreServicios(servicio)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Operario principal</label>
            <select value={operarioId} onChange={(e) => setOperarioId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">— Sin asignar —</option>
              {operarios.map((o) => <option key={o.id} value={o.id}>{o.user.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObs(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => onGuardar(servicio.id, { operarioId, observaciones })}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl"
              style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Card de servicio ───────────────────────────────────────────────────────────
function ServicioCard({
  servicio: s, operarios, onSiguiente, onCobrar, onEditar, onEliminar,
}: {
  servicio: Servicio
  operarios: Operario[]
  onSiguiente: (s: Servicio, opId: string | null) => void
  onCobrar: (s: Servicio) => void
  onEditar: (s: Servicio) => void
  onEliminar: (id: string) => void
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [opSeleccionado, setOpSeleccionado] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAbierto(false)
    }
    if (menuAbierto) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [menuAbierto])

  // Calcular texto y color del botón según etapa
  const botonSiguiente = () => {
    if (s.estado === "EN_ESPERA") return { label: "Iniciar lavado", icon: Droplets, color: "#2563EB" }
    if (s.etapa === "EXTERIOR")   return { label: "Listo exterior →", icon: Wind,     color: "#0284C7" }
    if (s.etapa === "SECADO")     return { label: "Listo secado →",   icon: Sparkles, color: "#7C3AED" }
    if (s.etapa === "INTERIOR")   return { label: "Servicio listo ✓", icon: CheckCircle2, color: "#059669" }
    return null
  }
  const btn = botonSiguiente()

  // Etiqueta del operario de la etapa actual
  const opEtapaActual = s.etapa === "EXTERIOR" ? s.opExterior
    : s.etapa === "SECADO" ? s.opSecado
    : s.etapa === "INTERIOR" ? s.opInterior
    : s.operario

  const estadoEstilo =
    s.estado === "EN_ESPERA"  ? "border-amber-300 bg-amber-50/60"   :
    s.estado === "POR_COBRAR" ? "border-emerald-400 bg-emerald-50/60" :
    "border-blue-300 bg-blue-50/60"

  return (
    <div className={`rounded-xl border-2 p-3 space-y-2.5 ${estadoEstilo}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="font-black text-gray-800 tracking-wider font-mono text-sm">{s.vehiculo.placa}</p>
          <p className="text-xs text-gray-500">{s.vehiculo.marca} {s.vehiculo.modelo}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ServicioTimer
            horaInicio={s.horaInicio} horaIngreso={s.horaIngreso}
            duracionEstimada={duracionEstimada(s)} estado={s.estado} duracionFinal={s.duracionMinutos}
          />
          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuAbierto((v) => !v)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors text-gray-500">
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuAbierto && (
              <div className="absolute right-0 top-7 z-30 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40">
                <button onClick={() => { setMenuAbierto(false); onEditar(s) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => { setMenuAbierto(false); onEliminar(s.id) }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
        <Wrench className="w-3 h-3 flex-shrink-0 text-gray-400" />
        <span className="truncate">{nombreServicios(s)}</span>
      </div>

      {/* Total */}
      {s.total != null && (
        <div className="flex items-center gap-1 text-xs text-blue-700 font-bold">
          <DollarSign className="w-3 h-3" /><span>${s.total.toLocaleString("es-CO")}</span>
        </div>
      )}

      {/* Operario etapa actual */}
      {opEtapaActual && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User className="w-3 h-3" /><span>{opEtapaActual.user.name}</span>
        </div>
      )}

      {/* Selector operario para la siguiente etapa */}
      {btn && operarios.length > 0 && (
        <select value={opSeleccionado} onChange={(e) => setOpSeleccionado(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 bg-white focus:ring-1 focus:ring-blue-400 focus:border-transparent">
          <option value="">— Operario (opcional) —</option>
          {operarios.map((o) => <option key={o.id} value={o.id}>{o.user.name}</option>)}
        </select>
      )}

      {/* Botón avanzar etapa */}
      {btn && (
        <button onClick={() => onSiguiente(s, opSeleccionado || null)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg text-white hover:opacity-90 transition-all"
          style={{ background: btn.color }}>
          <btn.icon className="w-3.5 h-3.5" /> {btn.label} <ChevronRight className="w-3 h-3" />
        </button>
      )}

      {/* Botón cobrar */}
      {s.estado === "POR_COBRAR" && (
        <button onClick={() => onCobrar(s)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg text-white hover:opacity-90 transition-all"
          style={{ background: "linear-gradient(135deg, #065F46, #059669)" }}>
          <CreditCard className="w-3.5 h-3.5" /> Registrar pago <DollarSign className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
interface Props { userRole: string }

export default function ColaServiciosBoard({ userRole }: Props) {
  const [activos, setActivos]       = useState<Servicio[]>([])
  const [historial, setHistorial]   = useState<Servicio[]>([])
  const [operarios, setOperarios]   = useState<Operario[]>([])
  const [tab, setTab]               = useState<"activos" | "historial">("activos")
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [cobrando, setCobrando]     = useState<Servicio | null>(null)
  const [editando, setEditando]     = useState<Servicio | null>(null)
  const intervalRef                 = useRef<NodeJS.Timeout | null>(null)

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
    intervalRef.current = setInterval(() => { fetchActivos(); fetchHistorial() }, 10000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchActivos, fetchHistorial])

  // ── Avanzar etapa ──────────────────────────────────────────────────────────
  async function avanzarEtapa(s: Servicio, operarioEtapaId: string | null) {
    try {
      const res = await fetch(`/api/servicios/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siguiente: true, operarioEtapaId }),
      })
      if (!res.ok) { toast.error("Error avanzando etapa"); return }
      const updated = await res.json()
      if (updated.estado === "POR_COBRAR") {
        setActivos((prev) => prev.map((x) => x.id === s.id ? updated : x))
        toast.success(`✅ ${s.vehiculo.placa} listo — pendiente de cobro`)
      } else {
        setActivos((prev) => prev.map((x) => x.id === s.id ? updated : x))
        const etapaLabel =
          updated.etapa === "SECADO"   ? "Secado" :
          updated.etapa === "INTERIOR" ? "Interior" : "Exterior"
        toast.success(`${s.vehiculo.placa} → ${etapaLabel}`)
      }
    } catch { toast.error("Error de conexión") }
  }

  // ── Cobrar ─────────────────────────────────────────────────────────────────
  async function cobrarServicio(metodoPago: string, total: number) {
    if (!cobrando) return
    try {
      const res = await fetch(`/api/servicios/${cobrando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "COMPLETADO", metodoPago, total }),
      })
      if (!res.ok) { toast.error("Error registrando pago"); return }
      const updated = await res.json()
      setActivos((prev) => prev.filter((x) => x.id !== cobrando.id))
      setHistorial((prev) => [updated, ...prev])
      setCobrando(null)
      toast.success(`💰 Cobrado · $${total.toLocaleString("es-CO")} · ${metodoPago}`)
    } catch { toast.error("Error de conexión") }
  }

  // ── Editar ─────────────────────────────────────────────────────────────────
  async function guardarEdicion(id: string, data: Record<string, string>) {
    try {
      const res = await fetch(`/api/servicios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { toast.error("Error guardando cambios"); return }
      const updated = await res.json()
      setActivos((prev) => prev.map((x) => x.id === id ? updated : x))
      setEditando(null)
      toast.success("Servicio actualizado")
    } catch { toast.error("Error de conexión") }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────
  async function eliminarServicio(id: string) {
    if (!confirm("¿Eliminar este servicio?")) return
    try {
      const res = await fetch(`/api/servicios/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error eliminando"); return }
      setActivos((prev) => prev.filter((x) => x.id !== id))
      toast.success("Servicio eliminado")
    } catch { toast.error("Error de conexión") }
  }

  // ── Clasificar en columnas ─────────────────────────────────────────────────
  const col = {
    EN_ESPERA:  activos.filter((s) => s.estado === "EN_ESPERA"),
    EXTERIOR:   activos.filter((s) => s.estado === "EN_PROCESO" && s.etapa === "EXTERIOR"),
    SECADO:     activos.filter((s) => s.estado === "EN_PROCESO" && s.etapa === "SECADO"),
    INTERIOR:   activos.filter((s) => s.estado === "EN_PROCESO" && s.etapa === "INTERIOR"),
    POR_COBRAR: activos.filter((s) => s.estado === "POR_COBRAR"),
  }

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

      {/* ── Pipeline activos ── */}
      {!loading && tab === "activos" && (
        <>
          {/* Indicador de flujo */}
          <div className="hidden md:flex items-center gap-1 px-1 overflow-x-auto pb-1">
            {ETAPAS.map((e, i) => (
              <div key={e.key} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: e.bg, color: e.color, border: `1px solid ${e.border}` }}>
                  <e.icon className="w-3.5 h-3.5" />
                  {e.label}
                  <span className="ml-1 bg-white/70 px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ color: e.color }}>
                    {col[e.key as keyof typeof col]?.length ?? 0}
                  </span>
                </div>
                {i < ETAPAS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
              </div>
            ))}
          </div>

          {/* Columnas del pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {ETAPAS.map((etapa) => {
              const cards = col[etapa.key as keyof typeof col] ?? []
              return (
                <div key={etapa.key} className="rounded-xl border overflow-hidden flex flex-col"
                  style={{ borderColor: etapa.border, backgroundColor: etapa.bg }}>
                  {/* Header columna */}
                  <div className="px-3 py-2.5 flex items-center justify-between border-b"
                    style={{ borderColor: etapa.border }}>
                    <div className="flex items-center gap-1.5">
                      <etapa.icon className="w-4 h-4" style={{ color: etapa.color }} />
                      <span className="font-bold text-sm" style={{ color: etapa.color }}>{etapa.label}</span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: etapa.color }}>
                      {cards.length}
                    </span>
                  </div>
                  {/* Cards */}
                  <div className="p-2.5 space-y-2.5 flex-1 min-h-[120px]">
                    {cards.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Sin vehículos</p>
                    ) : cards.map((s) => (
                      <ServicioCard key={s.id} servicio={s} operarios={operarios}
                        onSiguiente={avanzarEtapa}
                        onCobrar={setCobrando}
                        onEditar={setEditando}
                        onEliminar={eliminarServicio}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {activos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Car className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">Sin servicios activos</p>
              <p className="text-xs mt-1">Usa "Nuevo Ingreso" para registrar un vehículo</p>
            </div>
          )}
        </>
      )}

      {/* ── Historial ── */}
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
                        {nombreServicios(s)}
                        {s.opExterior && ` · Ext: ${s.opExterior.user.name}`}
                        {s.opSecado   && ` · Sec: ${s.opSecado.user.name}`}
                        {s.opInterior && ` · Int: ${s.opInterior.user.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ServicioTimer
                      horaInicio={s.horaInicio} horaIngreso={s.horaIngreso}
                      duracionEstimada={duracionEstimada(s)} estado={s.estado} duracionFinal={s.duracionMinutos}
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
      {cobrando && <ModalCobrar servicio={cobrando} onConfirmar={cobrarServicio} onCerrar={() => setCobrando(null)} />}
      {editando  && <ModalEditar servicio={editando} operarios={operarios} onGuardar={guardarEdicion} onCerrar={() => setEditando(null)} />}
      {showForm  && <RegistroServicioForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchActivos() }} />}
    </div>
  )
}
