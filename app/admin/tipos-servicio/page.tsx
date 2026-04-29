"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X, Tag, Pencil, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react"

type Tipo = { id: string; nombre: string; descripcion: string | null; precio: number; duracionMinutos: number; activo: boolean }
type Material = { id: string; nombre: string; unidad: string; stockTotal: number }
type ConsumibleConfig = { id: string; materialId: string; cantidadPorServicio: number; material: Material }

export default function TiposServicioPage() {
  const [tipos,     setTipos]     = useState<Tipo[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [showForm,  setShowForm]  = useState(false)
  const [editando,  setEditando]  = useState<Tipo | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [consumibles, setConsumibles] = useState<Record<string, ConsumibleConfig[]>>({})

  // Form
  const [nombre,    setNombre]    = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precio,    setPrecio]    = useState("")
  const [duracion,  setDuracion]  = useState("30")
  const [loading,   setLoading]   = useState(false)

  // Consumible nuevo
  const [selMat,    setSelMat]    = useState("")
  const [selCant,   setSelCant]   = useState("1")

  useEffect(() => {
    fetch("/api/tipos-servicio").then((r) => r.json()).then(setTipos)
    fetch("/api/materiales").then((r) => r.json()).then(setMateriales)
  }, [])

  async function cargarConsumibles(tipoId: string) {
    if (consumibles[tipoId]) return
    const res = await fetch(`/api/material-servicio?tipoServicioId=${tipoId}`)
    if (res.ok) {
      const data = await res.json()
      setConsumibles((prev) => ({ ...prev, [tipoId]: data }))
    }
  }

  function toggleExpand(tipoId: string) {
    if (expandido === tipoId) {
      setExpandido(null)
    } else {
      setExpandido(tipoId)
      cargarConsumibles(tipoId)
    }
  }

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
        body: JSON.stringify({ nombre: editando.nombre, descripcion: editando.descripcion, precio: editando.precio, duracionMinutos: editando.duracionMinutos }),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setTipos((prev) => prev.map((t) => t.id === updated.id ? updated : t))
      setEditando(null)
      toast.success("Servicio actualizado")
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar el servicio "${nombre}"?`)) return
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

  async function agregarConsumible(tipoId: string) {
    if (!selMat || !selCant) return
    try {
      const res = await fetch("/api/material-servicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoServicioId: tipoId, materialId: selMat, cantidadPorServicio: parseFloat(selCant) }),
      })
      if (!res.ok) { toast.error("Error agregando consumible"); return }
      const nuevo = await res.json()
      setConsumibles((prev) => ({ ...prev, [tipoId]: [...(prev[tipoId] ?? []), nuevo] }))
      setSelMat(""); setSelCant("1")
      toast.success("Consumible agregado")
    } catch { toast.error("Error de conexión") }
  }

  async function quitarConsumible(tipoId: string, configId: string) {
    try {
      await fetch("/api/material-servicio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: configId }),
      })
      setConsumibles((prev) => ({ ...prev, [tipoId]: prev[tipoId]?.filter((c) => c.id !== configId) ?? [] }))
      toast.success("Consumible quitado")
    } catch { toast.error("Error de conexión") }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Tipos de Servicio</h1>
          <p className="text-sm text-gray-500">Catálogo de servicios y consumibles asignados</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      <div className="space-y-3">
        {tipos.map((t) => (
          <div key={t.id} className={`bg-white rounded-xl border overflow-hidden ${!t.activo ? "opacity-60 border-gray-200" : "border-blue-100"}`}>
            {/* Header del tipo */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">{t.nombre}</h3>
                    {!t.activo && <span className="text-xs text-red-500">Inactivo</span>}
                  </div>
                  <p className="text-sm text-blue-600 font-bold">${t.precio.toLocaleString("es-CO")} <span className="text-xs text-gray-400 font-normal">· {t.duracionMinutos}min</span></p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleExpand(t.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <Package className="w-3.5 h-3.5" /> Consumibles
                  {expandido === t.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button onClick={() => setEditando({ ...t })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(t.id, t.nombre)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Panel consumibles */}
            {expandido === t.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consumibles por servicio</p>

                {/* Lista actual */}
                {(consumibles[t.id] ?? []).length === 0 ? (
                  <p className="text-xs text-gray-400">Sin consumibles configurados</p>
                ) : (
                  <div className="space-y-1.5">
                    {(consumibles[t.id] ?? []).map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-sm text-gray-700">{c.material.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-blue-600">
                            {c.cantidadPorServicio} {c.material.unidad}
                          </span>
                          <button onClick={() => quitarConsumible(t.id, c.id)}
                            className="p-1 rounded hover:bg-red-50 text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar consumible */}
                <div className="flex gap-2 pt-1">
                  <select value={selMat} onChange={(e) => setSelMat(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                    <option value="">— Material —</option>
                    {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.unidad})</option>)}
                  </select>
                  <input type="number" value={selCant} onChange={(e) => setSelCant(e.target.value)}
                    placeholder="Cant." min="0.01" step="0.01"
                    className="w-20 border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => agregarConsumible(t.id)} disabled={!selMat}
                    className="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                    style={{ background: "#1E40AF" }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Lavado Premium" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Incluye..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio *</label>
                  <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="15000" required min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duración (min) *</label>
                  <input type="number" value={duracion} onChange={(e) => setDuracion(e.target.value)} placeholder="30" min="5" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
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
                <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input value={editando.descripcion ?? ""} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio</label>
                  <input type="number" value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: parseFloat(e.target.value) })} min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duración (min)</label>
                  <input type="number" value={editando.duracionMinutos} onChange={(e) => setEditando({ ...editando, duracionMinutos: parseInt(e.target.value) })} min="5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
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
