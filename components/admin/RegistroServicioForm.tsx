"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { X, Car, Search, Check } from "lucide-react"

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
  const [buscando, setBuscando] = useState(false)
  const [vehiculoEncontrado, setVehiculoEncontrado] = useState(false)

  const [placa, setPlaca] = useState("")
  const [marca, setMarca] = useState("")
  const [modelo, setModelo] = useState("")
  const [anio, setAnio] = useState("")
  const [color, setColor] = useState("")
  const [tipoVehiculo, setTipoVehiculo] = useState("SEDAN")
  const [clienteNombre, setClienteNombre] = useState("")
  const [clienteTelefono, setClienteTelefono] = useState("")
  const [clienteEmail, setClienteEmail] = useState("")

  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([])
  const [bahiaId, setBahiaId] = useState("")
  const [operarioId, setOperarioId] = useState("")
  const [observaciones, setObservaciones] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/tipos-servicio").then((r) => r.json()),
      fetch("/api/operarios").then((r) => r.json()),
    ]).then(([tipos, ops]) => {
      setTiposServicio(Array.isArray(tipos) ? tipos : [])
      setOperarios(Array.isArray(ops) ? ops : [])
    }).catch(() => { setTiposServicio([]); setOperarios([]) })
  }, [])

  async function buscarPorPlaca() {
    const placaNorm = placa.toUpperCase().trim()
    if (!placaNorm) return
    setBuscando(true)
    try {
      const res = await fetch(`/api/vehiculos?placa=${placaNorm}`)
      if (res.ok) {
        const vh = await res.json()
        if (vh) {
          setPlaca(vh.placa)
          setMarca(vh.marca || "")
          setModelo(vh.modelo || "")
          setAnio(vh.anio?.toString() || "")
          setColor(vh.color || "")
          setTipoVehiculo(vh.tipo || "SEDAN")
          setClienteNombre(vh.clienteNombre || "")
          setClienteTelefono(vh.clienteTelefono || "")
          setClienteEmail(vh.clienteEmail || "")
          setVehiculoEncontrado(true)
          toast.success(`Vehículo ${placaNorm} encontrado — datos completados`)
        } else {
          setVehiculoEncontrado(false)
        }
      }
    } finally {
      setBuscando(false)
    }
  }

  function toggleTipo(id: string) {
    setTiposSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const totalSeleccionado = tiposSeleccionados.reduce((sum, id) => {
    const t = tiposServicio.find((x) => x.id === id)
    return sum + (t?.precio ?? 0)
  }, 0)

  const duracionTotal = tiposSeleccionados.reduce((sum, id) => {
    const t = tiposServicio.find((x) => x.id === id)
    return sum + (t?.duracionMinutos ?? 0)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!placa || !marca) {
      toast.error("La placa y la marca del vehículo son obligatorias")
      return
    }
    if (!tiposSeleccionados.length) {
      toast.error("Selecciona al menos un tipo de servicio")
      return
    }
    if (!bahiaId) {
      toast.error("Debes asignar una bahía al servicio")
      return
    }
    if (!operarioId) {
      toast.error("Debes asignar un operario al servicio")
      return
    }
    setLoading(true)
    try {
      const vhRes = await fetch("/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa, marca, modelo, anio, color, tipo: tipoVehiculo, clienteNombre, clienteTelefono, clienteEmail }),
      })
      if (!vhRes.ok) { toast.error("Error registrando vehículo"); return }
      const vehiculo = await vhRes.json()

      const svcRes = await fetch("/api/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehiculoId: vehiculo.id, tiposServicioIds: tiposSeleccionados, bahiaId: bahiaId || null, operarioId: operarioId || null, observaciones }),
      })
      if (!svcRes.ok) { toast.error("Error creando servicio"); return }
      toast.success(`✅ ${placa.toUpperCase()} registrado en cola`)
      onSuccess()
    } catch {
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10" style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
          <div className="flex items-center gap-2 text-white">
            <Car className="w-5 h-5" />
            <span className="font-semibold">Nuevo Ingreso de Vehículo</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Datos del vehículo */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Datos del vehículo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Placa *</label>
                <div className="flex gap-2">
                  <input
                    value={placa}
                    onChange={(e) => { setPlaca(e.target.value.toUpperCase()); setVehiculoEncontrado(false) }}
                    placeholder="ABC123"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase font-mono tracking-wider"
                    required
                  />
                  <button type="button" onClick={buscarPorPlaca} disabled={buscando || !placa}
                    className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: "#1E40AF" }}>
                    {buscando
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Search className="w-4 h-4" />}
                    Buscar
                  </button>
                </div>
                {vehiculoEncontrado && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Cliente recurrente — datos completados automáticamente
                  </p>
                )}
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
            </div>
          </div>

          {/* Datos del cliente */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Datos del cliente
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre</label>
                <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Juan García" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Teléfono</label>
                <input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} placeholder="3001234567" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Correo electrónico</label>
                <input type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="cliente@email.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Tipo(s) de servicio — multi-select */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Tipo(s) de servicio *
              <span className="text-xs text-gray-400 font-normal">(selección múltiple)</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {tiposServicio.map((t) => {
                const sel = tiposSeleccionados.includes(t.id)
                return (
                  <button type="button" key={t.id} onClick={() => toggleTipo(t.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all relative ${sel ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"}`}>
                    {sel && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-gray-800 pr-6">{t.nombre}</p>
                    <p className="text-xs text-gray-500 mt-0.5">${t.precio.toLocaleString("es-CO")} · {t.duracionMinutos}min</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Asignación */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
              Asignación <span className="text-red-500 text-xs font-normal">(obligatorio)</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Bahía <span className="text-red-500">*</span>
                </label>
                <select
                  value={bahiaId}
                  onChange={(e) => setBahiaId(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!bahiaId ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                >
                  <option value="">— Selecciona bahía —</option>
                  {bahias.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Operario <span className="text-red-500">*</span>
                </label>
                <select
                  value={operarioId}
                  onChange={(e) => setOperarioId(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${!operarioId ? "border-red-300 bg-red-50" : "border-gray-300"}`}
                >
                  <option value="">— Selecciona operario —</option>
                  {operarios.map((o) => <option key={o.id} value={o.id}>{o.user.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Observaciones</label>
                <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Instrucciones especiales..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
            </div>
          </div>

          {/* Resumen total */}
          {tiposSeleccionados.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
              <div className="space-y-1 mb-3">
                {tiposSeleccionados.map((id) => {
                  const t = tiposServicio.find((x) => x.id === id)
                  if (!t) return null
                  return (
                    <div key={id} className="flex justify-between text-xs text-gray-600">
                      <span>{t.nombre}</span>
                      <span>${t.precio.toLocaleString("es-CO")}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <span className="text-sm text-gray-600">Total · ~{duracionTotal}min</span>
                <span className="font-bold text-blue-700 text-xl">${totalSeleccionado.toLocaleString("es-CO")}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={loading || !tiposSeleccionados.length || !bahiaId || !operarioId}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
              {loading ? "Registrando..." : "Registrar Ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
