"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X, Tag, Pencil, Trash2 } from "lucide-react"

type Tipo = { id: string; nombre: string; descripcion: string | null; precio: number; duracionMinutos: number; activo: boolean }

export default function TiposServicioPage() {
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Tipo | null>(null)

  // Crear
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio, setPrecio] = useState("")
  const [duracion, setDuracion] = useState("30")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/tipos-servicio").then((r) => r.json()).then(setTipos)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/tipos-servicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, precio, duracionMinutos: duracion }),
      })
      if (!res.ok) { toast.error("Error creando servicio"); return }
      const nuevo = await res.json()
      setTipos((prev) => [...prev, nuevo])
      setNombre(""); setDescripcion(""); setPrecio(""); setDuracion("30"); setShowForm(false)
      toast.success("Servicio creado")
    } finally { setLoading(false) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tipos-servicio/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editando.nombre,
          descripcion: editando.descripcion,
          precio: editando.precio,
          duracionMinutos: editando.duracionMinutos,
        }),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setTipos((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setEditando(null)
      toast.success("Servicio actualizado")
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el servicio "${nombre}"? Si tiene registros, se desactivará.`)) return
    try {
      const res = await fetch(`/api/tipos-servicio/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error eliminando"); return }
      const data = await res.json()
      if (data.desactivado) {
        setTipos((prev) => prev.map((t) => t.id === id ? { ...t, activo: false } : t))
        toast.success("Servicio desactivado (tiene registros históricos)")
      } else {
        setTipos((prev) => prev.filter((t) => t.id !== id))
        toast.success("Servicio eliminado")
      }
    } catch { toast.error("Error de conexión") }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tipos de Servicio</h1>
          <p className="text-sm text-gray-500">Catálogo de servicios y precios</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tipos.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl border p-5 relative ${!t.activo ? "opacity-60 border-gray-200" : "border-blue-100"}`}>
            {/* Acciones */}
            <div className="absolute top-3 right-3 flex gap-1">
              <button onClick={() => setEditando({ ...t })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(t.id, t.nombre)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-start gap-3 mb-3 pr-16">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">{t.nombre}</h3>
                {!t.activo && <span className="text-xs text-red-500">Inactivo</span>}
              </div>
            </div>
            {t.descripcion && <p className="text-xs text-gray-500 mb-3">{t.descripcion}</p>}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">${t.precio.toLocaleString("es-CO")}</p>
                <p className="text-xs text-gray-400">COP · {t.duracionMinutos}min</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Nuevo Tipo de Servicio</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre del servicio *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Lavado Premium" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Incluye..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio (COP) *</label>
                  <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="15000" required min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duración (min) *</label>
                  <input type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="30" min="5" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
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
              <h2 className="font-bold text-gray-800">Editar Servicio</h2>
              <button onClick={() => setEditando(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input value={editando.descripcion ?? ""} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio (COP)</label>
                  <input type="number" value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: parseFloat(e.target.value) })} min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duración (min)</label>
                  <input type="number" value={editando.duracionMinutos} onChange={(e) => setEditando({ ...editando, duracionMinutos: parseInt(e.target.value) })} min="5" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
