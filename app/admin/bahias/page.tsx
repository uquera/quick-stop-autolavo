"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X, Warehouse, Pencil, Trash2, Car, Clock } from "lucide-react"

type ServicioEnBahia = {
  id: string; estado: string; horaIngreso: string
  vehiculo: { placa: string; marca: string }
  items: { nombre: string }[]
  tipoServicio: { nombre: string } | null
  operario: { user: { name: string | null } } | null
}
type Bahia = {
  id: string; nombre: string; color: string; activo: boolean
  servicios?: ServicioEnBahia[]
}

const COLORES = ["#1E40AF","#0891B2","#059669","#7C3AED","#D97706","#DC2626","#BE185D","#374151"]
const ESTADO_COLOR: Record<string, string> = {
  EN_ESPERA:  "bg-amber-100 text-amber-700 border-amber-200",
  EN_PROCESO: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETADO: "bg-green-100 text-green-700 border-green-200",
  CANCELADO:  "bg-gray-100 text-gray-500 border-gray-200",
}

export default function BahiasPage() {
  const [bahias, setBahias] = useState<Bahia[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Bahia | null>(null)
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState(COLORES[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    try {
      const res = await fetch("/api/bahias?conServicios=true")
      if (!res.ok) { toast.error("Error cargando bahías"); return }
      const data = await res.json()
      setBahias(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      toast.error("Error de conexión")
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/bahias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, color }),
      })
      if (!res.ok) { toast.error("Error creando bahía"); return }
      const nueva = await res.json()
      setBahias((prev) => [...prev, { ...nueva, servicios: [] }])
      setNombre(""); setShowForm(false)
      toast.success("Bahía creada")
    } finally { setLoading(false) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bahias/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editando.nombre, color: editando.color }),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setBahias((prev) => prev.map((b) => b.id === updated.id ? { ...b, ...updated } : b))
      setEditando(null)
      toast.success("Bahía actualizada")
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la ${nombre}? Solo es posible si no tiene servicios activos.`)) return
    try {
      const res = await fetch(`/api/bahias/${id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      setBahias((prev) => prev.filter((b) => b.id !== id))
      toast.success("Bahía eliminada")
    } catch { toast.error("Error de conexión") }
  }

  const totalServicios = bahias.reduce((a, b) => a + (b.servicios?.length ?? 0), 0)
  const activos = bahias.reduce((a, b) => a + (b.servicios?.filter((s) => ["EN_ESPERA","EN_PROCESO"].includes(s.estado)).length ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Bahías de Lavado</h1>
          <p className="text-sm text-gray-500">
            {activos} activo(s) · {totalServicios} servicio(s) hoy
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nueva Bahía
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bahias.map((b) => {
          const sActivos = b.servicios?.filter((s) => ["EN_ESPERA","EN_PROCESO"].includes(s.estado)) ?? []
          const sCompletados = b.servicios?.filter((s) => s.estado === "COMPLETADO") ?? []
          return (
            <div key={b.id} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!b.activo ? "opacity-60" : ""}`}>
              {/* Header de la bahía */}
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: b.color + "18", borderBottom: `3px solid ${b.color}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: b.color + "30" }}>
                    <Warehouse className="w-5 h-5" style={{ color: b.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{b.nombre}</p>
                    <p className="text-xs" style={{ color: b.color }}>
                      {sActivos.length} en curso · {sCompletados.length} completado(s)
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditando({ ...b })} className="p-1.5 rounded-lg hover:bg-white/60 text-gray-600 transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(b.id, b.nombre)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Servicios del día */}
              <div className="p-3 space-y-2 min-h-[80px]">
                {(!b.servicios || b.servicios.length === 0) ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sin servicios hoy</p>
                ) : (
                  <>
                    {sActivos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Activos</p>
                        <div className="space-y-1.5">
                          {sActivos.map((s) => (
                            <div key={s.id} className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 ${ESTADO_COLOR[s.estado]}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <Car className="w-3.5 h-3.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{s.vehiculo.placa} — {s.vehiculo.marca}</p>
                                  <p className="text-xs opacity-80 truncate">
                                    {s.items?.length ? s.items.map((i) => i.nombre).join(" + ") : s.tipoServicio?.nombre}
                                    {s.operario?.user.name && ` · ${s.operario.user.name}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-medium whitespace-nowrap">{s.estado.replace("_"," ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {sCompletados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Completados hoy</p>
                        <div className="space-y-1">
                          {sCompletados.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 text-xs text-gray-500 px-2">
                              <Clock className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{s.vehiculo.placa} · {new Date(s.horaIngreso).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Nueva Bahía</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Bahía 5" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Color identificador</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map((c) => (
                    <button type="button" key={c} onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="mt-2 rounded-lg h-8 flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: color }}>
                  Vista previa
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Creando..." : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Editar Bahía</h2>
              <button onClick={() => setEditando(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORES.map((c) => (
                    <button type="button" key={c} onClick={() => setEditando({ ...editando, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${editando.color === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="mt-2 rounded-lg h-8 flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: editando.color }}>
                  Vista previa — {editando.nombre}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="activo-edit" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                <label htmlFor="activo-edit" className="text-sm text-gray-700">Bahía activa</label>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditando(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
