"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  Package, Plus, X, Pencil, AlertTriangle, TrendingDown, TrendingUp,
  BarChart3, ChevronDown, ChevronUp,
} from "lucide-react"

type Material = {
  id: string
  nombre: string
  unidad: string
  stockTotal: number
  stockAlerta: number
  costoUnitario: number
  activo: boolean
}
type Movimiento = {
  id: string
  cantidad: number
  tipo: "ENTRADA" | "SALIDA"
  nota: string | null
  createdAt: string
  material: { nombre: string; unidad: string }
}

export default function BodegaPage() {
  const [materiales,   setMateriales]   = useState<Material[]>([])
  const [movimientos,  setMovimientos]  = useState<Movimiento[]>([])
  const [showForm,     setShowForm]     = useState(false)
  const [editando,     setEditando]     = useState<Material | null>(null)
  const [ajustando,    setAjustando]    = useState<Material | null>(null)
  const [showMovs,     setShowMovs]     = useState(false)
  const [loading,      setLoading]      = useState(false)

  // Form estado
  const [nombre,        setNombre]        = useState("")
  const [unidad,        setUnidad]        = useState("unidades")
  const [stockTotal,    setStockTotal]    = useState("")
  const [stockAlerta,   setStockAlerta]   = useState("5")
  const [costoUnitario, setCostoUnitario] = useState("0")

  // Ajuste stock
  const [ajusteQty,   setAjusteQty]   = useState("")
  const [ajusteNota,  setAjusteNota]  = useState("")

  useEffect(() => { cargarMateriales() }, [])

  async function cargarMateriales() {
    try {
      const res = await fetch("/api/materiales")
      if (res.ok) setMateriales(await res.json())
    } catch { toast.error("Error cargando bodega") }
  }

  async function cargarMovimientos() {
    try {
      const res = await fetch("/api/materiales/movimientos")
      if (res.ok) setMovimientos(await res.json())
    } catch { toast.error("Error cargando movimientos") }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/materiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, unidad, stockTotal, stockAlerta, costoUnitario }),
      })
      if (!res.ok) { toast.error("Error creando material"); return }
      const nuevo = await res.json()
      setMateriales((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setNombre(""); setUnidad("unidades"); setStockTotal(""); setStockAlerta("5"); setCostoUnitario("0")
      setShowForm(false)
      toast.success("Material creado")
    } finally { setLoading(false) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    try {
      const res = await fetch(`/api/materiales/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editando.nombre,
          unidad: editando.unidad,
          stockAlerta:   editando.stockAlerta,
          costoUnitario: editando.costoUnitario,
        }),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setMateriales((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m))
      setEditando(null)
      toast.success("Material actualizado")
    } finally { setLoading(false) }
  }

  async function handleAjuste(e: React.FormEvent) {
    e.preventDefault()
    if (!ajustando || !ajusteQty) return
    setLoading(true)
    try {
      const res = await fetch(`/api/materiales/${ajustando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ajusteStock: parseFloat(ajusteQty), notaAjuste: ajusteNota }),
      })
      if (!res.ok) { toast.error("Error ajustando stock"); return }
      await cargarMateriales()
      setAjustando(null); setAjusteQty(""); setAjusteNota("")
      toast.success("Stock ajustado")
    } finally { setLoading(false) }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Desactivar "${nombre}"?`)) return
    try {
      await fetch(`/api/materiales/${id}`, { method: "DELETE" })
      setMateriales((prev) => prev.filter((m) => m.id !== id))
      toast.success("Material desactivado")
    } catch { toast.error("Error de conexión") }
  }

  const bajoStock  = materiales.filter((m) => m.stockTotal <= m.stockAlerta)
  const totalItems = materiales.length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Bodega</h1>
          <p className="text-sm text-gray-500">{totalItems} materiales · {bajoStock.length} bajo stock de alerta</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nuevo Material
        </button>
      </div>

      {/* Alerta stock bajo */}
      {bajoStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Stock bajo en {bajoStock.length} material(es)</p>
            <p className="text-xs text-amber-700 mt-1">{bajoStock.map((m) => m.nombre).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Grid de materiales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materiales.map((m) => {
          const bajo = m.stockTotal <= m.stockAlerta
          const pct  = Math.min(100, m.stockAlerta > 0 ? (m.stockTotal / (m.stockAlerta * 4)) * 100 : 100)
          return (
            <div key={m.id} className={`bg-white rounded-xl border p-4 relative ${bajo ? "border-amber-300" : "border-gray-200"}`}>
              {bajo && (
                <span className="absolute top-3 right-10 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  ⚠ Bajo
                </span>
              )}
              <div className="absolute top-3 right-3 flex gap-1">
                <button onClick={() => setAjustando(m)} title="Ajustar stock"
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditando({ ...m })} title="Editar"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-3 pr-16">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{m.nombre}</h3>
                  <p className="text-xs text-gray-400">{m.unidad}</p>
                </div>
              </div>

              {/* Stock bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Stock actual</span>
                  <span className={`font-bold ${bajo ? "text-amber-600" : "text-gray-800"}`}>
                    {m.stockTotal.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {m.unidad}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${bajo ? "bg-amber-400" : "bg-blue-500"}`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Alerta: {m.stockAlerta} {m.unidad} · Costo: ${m.costoUnitario.toLocaleString("es-CO")}/{m.unidad}</p>
              </div>

              <button
                onClick={() => { setAjustando(m); setAjusteQty(""); setAjusteNota("") }}
                className="w-full py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                + Agregar stock
              </button>
            </div>
          )
        })}
      </div>

      {/* Historial de movimientos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => { setShowMovs((v) => !v); if (!showMovs) cargarMovimientos() }}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
          <span className="font-semibold text-gray-700 text-sm">Historial de movimientos</span>
          {showMovs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {showMovs && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {movimientos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin movimientos</p>
            ) : movimientos.slice(0, 50).map((mv) => (
              <div key={mv.id} className="flex items-center justify-between px-5 py-2.5 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {mv.tipo === "ENTRADA"
                    ? <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    : <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{mv.material.nombre}</p>
                    {mv.nota && <p className="text-xs text-gray-400 truncate">{mv.nota}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${mv.tipo === "ENTRADA" ? "text-emerald-600" : "text-red-500"}`}>
                    {mv.tipo === "ENTRADA" ? "+" : "−"}{mv.cantidad.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {mv.material.unidad}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(mv.createdAt).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Nuevo Material</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Shampoo para autos" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Unidad</label>
                  <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="litros"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Stock inicial</label>
                  <input type="number" value={stockTotal} onChange={(e) => setStockTotal(e.target.value)} placeholder="0" min="0" step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Alerta de stock mínimo</label>
                <input type="number" value={stockAlerta} onChange={(e) => setStockAlerta(e.target.value)} placeholder="5" min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Costo unitario ($)</label>
                <input type="number" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)} placeholder="0" min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Costo por {unidad || "unidad"} — usado para calcular gastos diarios</p>
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
              <h2 className="font-bold text-gray-800">Editar Material</h2>
              <button onClick={() => setEditando(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre *</label>
                <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Unidad</label>
                  <input value={editando.unidad} onChange={(e) => setEditando({ ...editando, unidad: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Alerta mínimo</label>
                  <input type="number" value={editando.stockAlerta}
                    onChange={(e) => setEditando({ ...editando, stockAlerta: parseFloat(e.target.value) })} min="0" step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Costo unitario ($)</label>
                <input type="number" value={editando.costoUnitario}
                  onChange={(e) => setEditando({ ...editando, costoUnitario: parseFloat(e.target.value) || 0 })} min="0" step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Costo por {editando.unidad} — impacta el reporte diario</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditando(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajustar stock */}
      {ajustando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Ajustar Stock</h2>
              <button onClick={() => setAjustando(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="font-semibold text-gray-800 text-sm">{ajustando.nombre}</p>
              <p className="text-xs text-gray-500">Stock actual: {ajustando.stockTotal} {ajustando.unidad}</p>
            </div>
            <form onSubmit={handleAjuste} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Cantidad (+ para agregar, − para restar)
                </label>
                <input type="number" value={ajusteQty} onChange={(e) => setAjusteQty(e.target.value)}
                  placeholder="+10 o -5" step="0.01" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nota (opcional)</label>
                <input value={ajusteNota} onChange={(e) => setAjusteNota(e.target.value)}
                  placeholder="Compra del día, merma, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAjustando(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading || !ajusteQty}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Ajustando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
