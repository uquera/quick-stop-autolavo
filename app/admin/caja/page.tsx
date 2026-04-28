"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, Clock, DollarSign, Car, Plus, ChevronDown, ChevronUp } from "lucide-react"

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}
function formatHora(d: string) {
  return new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
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
type CajaData = {
  cierresHoy: Cierre[]
  periodoActual: PeriodoActual
  totalDia: TotalDia
  tienePeriodoAbierto: boolean
}

const METODOS = [
  { key: "totalEfectivo" as const,      label: "Efectivo",              color: "#10B981" },
  { key: "totalTransferencia" as const, label: "Transferencia Bancaria", color: "#3B82F6" },
  { key: "totalTarjeta" as const,       label: "Datafono / Tarjeta",    color: "#8B5CF6" },
]

function TarjetaMetodos({ efectivo, transferencia, tarjeta, total }: {
  efectivo: number; transferencia: number; tarjeta: number; total: number
}) {
  return (
    <div className="divide-y divide-gray-100">
      {[
        { label: "Efectivo",             valor: efectivo,      color: "#10B981" },
        { label: "Transferencia Bancaria", valor: transferencia, color: "#3B82F6" },
        { label: "Datafono / Tarjeta",   valor: tarjeta,       color: "#8B5CF6" },
      ].map(({ label, valor, color }) => (
        <div key={label} className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm text-gray-700">{label}</span>
          </div>
          <span className="font-semibold text-gray-800">{formatCOP(valor)}</span>
        </div>
      ))}
      <div className="px-5 py-4 flex items-center justify-between border-t-2 border-gray-200"
        style={{ background: "linear-gradient(135deg, #0F172A08, #1E40AF08)" }}>
        <span className="font-bold text-gray-800 text-lg">Total</span>
        <span className="font-black text-2xl text-blue-700">{formatCOP(total)}</span>
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
          <span className="font-black text-blue-700 text-lg">{formatCOP(cierre.totalIngresos)}</span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <TarjetaMetodos
            efectivo={cierre.totalEfectivo}
            transferencia={cierre.totalTransferencia}
            tarjeta={cierre.totalTarjeta}
            total={cierre.totalIngresos}
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

export default function CajaPage() {
  const [data, setData]         = useState<CajaData | null>(null)
  const [nombre, setNombre]     = useState("")
  const [notas, setNotas]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [cargando, setCargando] = useState(true)

  async function fetchCaja() {
    try {
      const res = await fetch("/api/caja")
      if (res.ok) setData(await res.json())
    } finally { setCargando(false) }
  }

  useEffect(() => { fetchCaja() }, [])

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

  if (cargando) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
  }

  const p  = data?.periodoActual
  const td = data?.totalDia
  const hoy = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Cierre de Caja</h1>
        <p className="text-sm text-gray-500 capitalize">{hoy}</p>
      </div>

      {/* Balance acumulado del día */}
      {td && (data?.cierresHoy.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Balance total del día</h2>
            <span className="text-xs text-gray-400">{td.vehiculos} vehículo(s) · {data?.cierresHoy.length} turno(s) cerrado(s)</span>
          </div>
          <TarjetaMetodos efectivo={td.EFECTIVO} transferencia={td.TRANSFERENCIA} tarjeta={td.TARJETA} total={td.total} />
        </div>
      )}

      {/* Historial de turnos cerrados */}
      {(data?.cierresHoy.length ?? 0) > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Turnos del día</p>
          {data!.cierresHoy.map((c, i) => (
            <CierreCard key={c.id} cierre={c} index={i} />
          ))}
        </div>
      )}

      {/* Turno actual abierto */}
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
            <span className="text-xs text-gray-400">
              Desde {formatHora(p.desde)} · {p.vehiculos} vehículo(s)
            </span>
          </div>

          {p.vehiculos > 0 ? (
            <TarjetaMetodos efectivo={p.EFECTIVO} transferencia={p.TRANSFERENCIA} tarjeta={p.TARJETA} total={p.total} />
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">
              Sin servicios completados desde el último cierre
            </p>
          )}
        </div>
      )}

      {/* Formulario de cierre */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-gray-800">Cerrar turno</h2>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Nombre del turno</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={`Turno ${(data?.cierresHoy.length ?? 0) + 1} (ej: Turno Mañana, Turno Tarde)`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Observaciones del turno (opcional)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Novedades, incidentes, observaciones del turno..."
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <button
          onClick={handleCerrar}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 text-white font-bold rounded-xl transition-all disabled:opacity-60 text-sm"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}
        >
          <CheckCircle2 className="w-5 h-5" />
          {loading ? "Cerrando..." : `Cerrar ${nombre || `Turno ${(data?.cierresHoy.length ?? 0) + 1}`}`}
        </button>

        {(data?.cierresHoy.length ?? 0) > 0 && (
          <p className="text-xs text-center text-gray-400">
            Puedes abrir nuevos turnos libremente durante el día. Cada cierre queda registrado con su horario.
          </p>
        )}
      </div>
    </div>
  )
}
