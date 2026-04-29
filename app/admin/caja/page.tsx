"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle2, DollarSign, Plus, ChevronDown, ChevronUp,
  Users, Trash2, TrendingUp, TrendingDown, Minus, X,
} from "lucide-react"

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n)
}
function formatHora(d: string) {
  return new Date(d).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
}

type Cierre = {
  id: string; nombre: string; periodoDesde: string; periodoHasta: string
  totalEfectivo: number; totalTransferencia: number; totalTarjeta: number
  totalIngresos: number; totalVehiculos: number; notas: string | null
  createdAt: string
  operario?: { user: { name: string | null } } | null
}
type PeriodoActual = {
  desde: string; hasta: string; turnoNumero: number
  EFECTIVO: number; TRANSFERENCIA: number; TARJETA: number
  total: number; vehiculos: number
}
type TotalDia = {
  EFECTIVO: number; TRANSFERENCIA: number; TARJETA: number; total: number; vehiculos: number
}
type PagoOp = {
  id: string; monto: number; nota: string | null; fecha: string
  operario: { user: { name: string | null } }
}
type Operario = { id: string; user: { name: string | null } }
type DetalleInsumo = { nombre: string; unidad: string; cantidadTotal: number; costoTotal: number }
type CajaData = {
  cierresHoy:       Cierre[]
  periodoActual:    PeriodoActual
  totalDia:         TotalDia
  pagosOperarios:   PagoOp[]
  totalPagos:       number
  costoInsumos:     number
  detalleInsumos:   DetalleInsumo[]
  gananciaNeta:     number
  tienePeriodoAbierto: boolean
}

function TarjetaMetodos({ efectivo, transferencia, tarjeta, total }: {
  efectivo: number; transferencia: number; tarjeta: number; total: number
}) {
  return (
    <div className="divide-y divide-gray-100">
      {[
        { label: "Efectivo",              valor: efectivo,      color: "#10B981" },
        { label: "Transferencia Bancaria", valor: transferencia, color: "#3B82F6" },
        { label: "Datafono / Tarjeta",    valor: tarjeta,       color: "#8B5CF6" },
      ].map(({ label, valor, color }) => (
        <div key={label} className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
          <span className="font-semibold text-gray-800">{formatARS(valor)}</span>
        </div>
      ))}
      <div className="px-5 py-4 flex items-center justify-between border-t-2 border-gray-200"
        style={{ background: "linear-gradient(135deg, #0F172A08, #1E40AF08)" }}>
        <span className="font-bold text-gray-800 text-lg">Total ingresos</span>
        <span className="font-black text-2xl text-blue-700">{formatARS(total)}</span>
      </div>
    </div>
  )
}

function CierreCard({ cierre, index }: { cierre: Cierre; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
            {index + 1}
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800">{cierre.nombre}</p>
            <p className="text-xs text-gray-400">
              {formatHora(cierre.periodoDesde)} → {formatHora(cierre.periodoHasta)}
              {cierre.totalVehiculos > 0 && ` · ${cierre.totalVehiculos} vehículo(s)`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black text-blue-700 text-lg">{formatARS(cierre.totalIngresos)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100">
          <TarjetaMetodos
            efectivo={cierre.totalEfectivo} transferencia={cierre.totalTransferencia}
            tarjeta={cierre.totalTarjeta}   total={cierre.totalIngresos}
          />
          {cierre.notas && (
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500"><span className="font-semibold">Nota:</span> {cierre.notas}</p>
            </div>
          )}
          <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Cerrado a las {formatHora(cierre.createdAt)}
              {cierre.operario && ` · por ${cierre.operario.user.name}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal registrar pago operario ─────────────────────────────────────────────
function ModalPagoOperario({ operarios, onGuardar, onCerrar }: {
  operarios: Operario[]
  onGuardar: (operarioId: string, monto: number, nota: string) => void
  onCerrar: () => void
}) {
  const [operarioId, setOperarioId] = useState("")
  const [monto,      setMonto]      = useState("")
  const [nota,       setNota]       = useState("")

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4"
          style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5" />
            <span className="font-semibold">Registrar pago a operario</span>
          </div>
          <button onClick={onCerrar} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Operario *</label>
            <select value={operarioId} onChange={(e) => setOperarioId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500">
              <option value="">— Selecciona operario —</option>
              {operarios.map((o) => (
                <option key={o.id} value={o.id}>{o.user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Monto a pagar *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)}
                placeholder="0" min="0"
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Nota (opcional)</label>
            <input value={nota} onChange={(e) => setNota(e.target.value)}
              placeholder="Turno completo, horas extras, etc."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              disabled={!operarioId || !monto}
              onClick={() => onGuardar(operarioId, parseFloat(monto), nota)}
              className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
              Registrar pago
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CajaPage() {
  const [data,        setData]        = useState<CajaData | null>(null)
  const [operarios,   setOperarios]   = useState<Operario[]>([])
  const [nombre,      setNombre]      = useState("")
  const [notas,       setNotas]       = useState("")
  const [loading,     setLoading]     = useState(false)
  const [cargando,    setCargando]    = useState(true)
  const [showPagoModal, setShowPagoModal] = useState(false)

  async function fetchCaja() {
    try {
      const res = await fetch("/api/caja")
      if (res.ok) setData(await res.json())
    } finally { setCargando(false) }
  }

  useEffect(() => {
    fetchCaja()
    fetch("/api/operarios").then((r) => r.json()).then((d) => setOperarios(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function handleCerrar() {
    if (!confirm(`¿Confirmar cierre de "${nombre || `Turno ${(data?.cierresHoy.length ?? 0) + 1}`}"?`)) return
    setLoading(true)
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre || undefined, notas }),
      })
      if (!res.ok) { toast.error("Error cerrando caja"); return }
      toast.success("✅ Turno cerrado correctamente")
      setNombre(""); setNotas("")
      fetchCaja()
    } finally { setLoading(false) }
  }

  async function registrarPago(operarioId: string, monto: number, nota: string) {
    try {
      const res = await fetch("/api/pagos-operarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operarioId, monto, nota }),
      })
      if (!res.ok) { toast.error("Error registrando pago"); return }
      setShowPagoModal(false)
      await fetchCaja()
      toast.success(`💸 Pago registrado — ${formatARS(monto)}`)
    } catch { toast.error("Error de conexión") }
  }

  async function eliminarPago(id: string) {
    if (!confirm("¿Eliminar este pago?")) return
    try {
      await fetch(`/api/pagos-operarios/${id}`, { method: "DELETE" })
      await fetchCaja()
      toast.success("Pago eliminado")
    } catch { toast.error("Error de conexión") }
  }

  if (cargando) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
  }

  const p   = data?.periodoActual
  const td  = data?.totalDia
  const hoy = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const totalPagos    = data?.totalPagos    ?? 0
  const costoInsumos  = data?.costoInsumos  ?? 0
  const gananciaNeta  = data?.gananciaNeta  ?? 0
  const ingresosDia   = td?.total ?? 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Cierre de Caja</h1>
        <p className="text-sm text-gray-500 capitalize">{hoy}</p>
      </div>

      {/* ── Resumen del día ── */}
      {td && (data?.cierresHoy.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Balance total del día</h2>
            <span className="text-xs text-gray-400">{td.vehiculos} vehículo(s) · {data?.cierresHoy.length} turno(s)</span>
          </div>
          <TarjetaMetodos efectivo={td.EFECTIVO} transferencia={td.TRANSFERENCIA} tarjeta={td.TARJETA} total={ingresosDia} />

          {/* Gastos y resultado neto */}
          <div className="border-t-2 border-dashed border-gray-200">
            {/* Insumos */}
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-gray-700">Costo de insumos</span>
                {costoInsumos === 0 && <span className="text-xs text-gray-400">(sin costo unitario configurado)</span>}
              </div>
              <span className="font-semibold text-orange-500">− {formatARS(costoInsumos)}</span>
            </div>
            {/* Detalle insumos colapsable */}
            {(data?.detalleInsumos ?? []).filter(d => d.costoTotal > 0).length > 0 && (
              <div className="px-5 pb-2 space-y-0.5">
                {(data?.detalleInsumos ?? []).filter(d => d.costoTotal > 0).map(d => (
                  <div key={d.nombre} className="flex justify-between text-xs text-gray-400 pl-6">
                    <span>{d.nombre} ({d.cantidadTotal.toFixed(2)} {d.unidad})</span>
                    <span>{formatARS(d.costoTotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Operarios */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-dashed border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-700">Pagos a operarios</span>
              </div>
              <span className="font-semibold text-red-500">− {formatARS(totalPagos)}</span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: gananciaNeta >= 0 ? "linear-gradient(135deg, #ECFDF508, #059669 0.3%, #ECFDF5)" : "linear-gradient(135deg, #FEF2F2, #DC2626 0.3%, #FEF2F2)" }}>
              <div className="flex items-center gap-2">
                {gananciaNeta >= 0
                  ? <TrendingUp className="w-5 h-5 text-emerald-600" />
                  : <Minus className="w-5 h-5 text-red-500" />}
                <span className="font-bold text-gray-800 text-lg">Ganancia neta</span>
              </div>
              <span className={`font-black text-2xl ${gananciaNeta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatARS(gananciaNeta)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Turnos cerrados ── */}
      {(data?.cierresHoy.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Turnos del día</p>
          {data!.cierresHoy.map((c, i) => (
            <CierreCard key={c.id} cierre={c} index={i} />
          ))}
        </div>
      )}

      {/* ── Turno actual ── */}
      {p && (
        <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-100 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #1E40AF08, #38BDF808)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-bold text-gray-800">
                {p.vehiculos > 0 ? `Turno ${p.turnoNumero} — En curso` : `Turno ${p.turnoNumero} — Sin movimientos`}
              </h2>
            </div>
            <span className="text-xs text-gray-400">Desde {p.vehiculos > 0 ? formatHora(p.desde) : "—"} · {p.vehiculos} vehículo(s)</span>
          </div>
          {p.vehiculos > 0 ? (
            <TarjetaMetodos efectivo={p.EFECTIVO} transferencia={p.TRANSFERENCIA} tarjeta={p.TARJETA} total={p.total} />
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">Sin servicios completados desde el último cierre</p>
          )}
        </div>
      )}

      {/* ── Pagos a operarios ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-600" />
            <h2 className="font-bold text-gray-800">Pagos a operarios</h2>
            {totalPagos > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {formatARS(totalPagos)}
              </span>
            )}
          </div>
          <button onClick={() => setShowPagoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
            <Plus className="w-3.5 h-3.5" /> Registrar pago
          </button>
        </div>

        {(data?.pagosOperarios ?? []).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Sin pagos registrados hoy</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {(data?.pagosOperarios ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{p.operario.user.name}</p>
                    {p.nota && <p className="text-xs text-gray-400 truncate">{p.nota}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-red-500">{formatARS(p.monto)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => eliminarPago(p.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Subtotal pagos */}
            <div className="px-5 py-3 flex items-center justify-between bg-red-50/60 border-t border-red-100">
              <span className="text-sm font-semibold text-gray-700">Total pagado hoy</span>
              <span className="font-black text-red-500 text-lg">{formatARS(totalPagos)}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Cerrar turno ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-gray-800">Cerrar turno</h2>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del turno</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            placeholder={`Turno ${(data?.cierresHoy.length ?? 0) + 1} (ej: Turno Mañana, Turno Tarde)`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Observaciones (opcional)</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
            placeholder="Novedades, incidentes, observaciones del turno..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
        </div>
        <button onClick={handleCerrar} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-60 text-sm"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <CheckCircle2 className="w-5 h-5" />
          {loading ? "Cerrando..." : `Cerrar ${nombre || `Turno ${(data?.cierresHoy.length ?? 0) + 1}`}`}
        </button>
        {(data?.cierresHoy.length ?? 0) > 0 && (
          <p className="text-xs text-center text-gray-400">
            Puedes abrir nuevos turnos libremente durante el día. Cada cierre queda registrado con su horario.
          </p>
        )}
      </div>

      {/* Modal pago operario */}
      {showPagoModal && (
        <ModalPagoOperario
          operarios={operarios}
          onGuardar={registrarPago}
          onCerrar={() => setShowPagoModal(false)}
        />
      )}
    </div>
  )
}
