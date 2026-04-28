"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X, Car } from "lucide-react"

type Bahia = { id: string; nombre: string; color: string }
type TipoServicio = { id: string; nombre: string; precio: number; duracionMinutos: number }
type Operario = { id: string; user: { name: string | null } }

interface Props {
  bahias: Bahia[]
  onClose: () => void
  onSuccess: () => void
}

const TIPOS_VEHICULO = [
  { value: "SEDAN", label: "Sedán" },
  { value: "SUV", label: "SUV" },
  { value: "CAMIONETA", label: "Camioneta" },
  { value: "MOTO", label: "Moto" },
  { value: "BUS", label: "Bus" },
  { value: "OTRO", label: "Otro" },
]

export default function RegistroServicioForm({ bahias, onClose, onSuccess }: Props) {
  const [tiposServicio, setTiposServicio] = useState<TipoServicio[]>([])
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"vehiculo" | "servicio">("vehiculo")

  // Vehículo
  const [placa, setPlaca] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [anio, setAnio] = useState("")
  const [color, setColor] = useState("")
  const [tipoVehiculo, setTipoVehiculo] = useState("SEDAN")
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")

  // Servicio
  const [tipoServicioId, setTipoServicioId] = useState("")
  const [bahiaId, setBahiaId] = useState("")
  const [operarioId, setOperarioId] = useState("")
  const [observaciones, setObservaciones] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/tipos-servicio").then((r) => r.json()),
      fetch("/api/operarios").then((r) => r.json()),
    ]).then(([tipos, ops]) => {
      setTiposServicio(tipos)
      setOperarios(ops)
    })
  }, [])

  async function buscarVehiculo() {
    if (!placa) return
    const res = await fetch(`/api/vehiculos?placa=${placa.toUpperCase()}`)
    if (res.ok) {
      const vh = await res.json()
      if (vh) {
        setMarca(vh.marca || "")
        setModelo(vh.modelo || "")
        setAnio(vh.anio?.toString() || "")
        setColor(vh.color || "")
        setTipoVehiculo(vh.tipo || "SEDAN")
        setClienteNombre(vh.clienteNombre || "")
        setClienteTelefono(vh.clienteTelefono || "")
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!placa || !marca || !tipoServicioId) {
      toast.error("Placa, marca y tipo de servicio son requeridos")
      return
    }
    setLoading(true)
    try {
      const vhRes = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa, marca, modelo, anio, color, tipo: tipoVehiculo, clienteNombre, clienteTelefono }),
      })
      if (!vhRes.ok) { toast.error("Error creando vehículo"); return }
      const vehiculo = await vhRes.json()

      const svcRes = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehiculoId: vehiculo.id,
          tipoServicioId,
          bahiaId: bahiaId || null,
          operarioId: operarioId || null,
          observaciones,
        }),
      })
      if (!svcRes.ok) { toast.error("Error creando servicio"); return }
      toast.success(`Vehículo ${placa.toUpperCase()} registrado`)
      onSuccess()
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const tipoSeleccionado = tiposServicio.find((t) => t.id === tipoServicioId)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
          <div className="flex items-center gap-2 text-white">
            <Car className="w-5 h-5" />
            <span className="font-semibold">Registro de Vehículo</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Datos del vehículo */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
              Datos del vehículo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Placa *</label>
                <div className="flex gap-2">
                  <input
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    onBlur={buscarVehiculo}
                    placeholder="ABC123"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Marca *</label>
                <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Toyota" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Modelo</label>
                <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Corolla" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Año</label>
                <input type="number" value={anio} onChange={(e) => setAnio(e.target.value)} placeholder="2020" min="1990" max="2030" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Color</label>
                <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanco" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de vehículo</label>
                <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  {TIPOS_VEHICULO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del cliente</label>
                <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Juan García" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                <input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} placeholder="3001234567" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Datos del servicio */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
              Tipo de servicio
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {tiposServicio.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTipoServicioId(t.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${tipoServicioId === t.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  <p className="text-xs font-semibold text-gray-800">{t.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">${t.precio.toLocaleString("es-CO")} · {t.duracionMinutos}min</p>
                </button>
              ))}
            </div>
          </div>

          {/* Asignación */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
              Asignación
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Bahía</label>
                <select value={bahiaId} onChange={(e) => setBahiaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Sin asignar</option>
                  {bahias.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Operario</label>
                <select value={operarioId} onChange={(e) => setOperarioId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Sin asignar</option>
                  {operarios.map((o) => <option key={o.id} value={o.id}>{o.user.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Observaciones</label>
                <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Manchas, rallones, instrucciones especiales..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
          </div>

          {/* Resumen */}
          {tipoSeleccionado && (
            <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-gray-600">Total a cobrar:</span>
              <span className="font-bold text-blue-700 text-lg">${tipoSeleccionado.precio.toLocaleString("es-CO")}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !tipoServicioId}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}
            >
              {loading ? "Registrando..." : "Registrar Ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
