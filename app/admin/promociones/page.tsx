"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Megaphone, Plus, X, Tag, Pencil, Trash2,
  Mail, Upload, Send, Users, ChevronDown, ChevronUp, Loader2, Check,
} from "lucide-react"

type Promocion = {
  id: string; nombre: string; descripcion: string | null
  tipoDescuento: string; valor: number
  fechaInicio: string; fechaFin: string; activa: boolean
}
type ClienteEmail = { email: string; nombre: string }

const hoy = new Date().toISOString().split("T")[0]

function valorDisplay(p: Promocion) {
  return p.tipoDescuento === "PORCENTAJE"
    ? `${p.valor}%`
    : `$${p.valor.toLocaleString("es-CO")}`
}

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [clientesEmail, setClientesEmail] = useState<ClienteEmail[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Promocion | null>(null)
  const [emailPanel, setEmailPanel] = useState<string | null>(null)   // id de promo abierta en el panel email
  const [loading, setLoading] = useState(false)

  // Campos crear/editar
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [tipo, setTipo] = useState("PORCENTAJE")
  const [valor, setValor] = useState("")
  const [fechaInicio, setFechaInicio] = useState(hoy)
  const [fechaFin, setFechaFin] = useState("")

  // Campos email
  const [asunto, setAsunto] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [destinatariosManual, setDestinatariosManual] = useState("")
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [imagen, setImagen] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ enviados: number; fallidos: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/promociones").then((r) => r.json()).then(setPromociones)
    fetch("/api/clientes-emails").then((r) => r.json()).then(setClientesEmail)
  }, [])

  // ── Crear ────────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion, tipoDescuento: tipo, valor: parseFloat(valor), fechaInicio, fechaFin }),
      })
      if (!res.ok) { toast.error("Error creando promoción"); return }
      const nueva = await res.json()
      setPromociones((prev) => [nueva, ...prev])
      resetForm(); setShowForm(false)
      toast.success("Promoción creada")
    } finally { setLoading(false) }
  }

  // ── Editar ───────────────────────────────────────────────────────────────
  function abrirEdicion(p: Promocion) {
    setEditando({ ...p })
    setEmailPanel(null)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    setLoading(true)
    try {
      const res = await fetch(`/api/promociones/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: editando.nombre,
          descripcion: editando.descripcion,
          tipoDescuento: editando.tipoDescuento,
          valor: editando.valor,
          fechaInicio: editando.fechaInicio.split("T")[0],
          fechaFin: editando.fechaFin.split("T")[0],
          activa: editando.activa,
        }),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setPromociones((prev) => prev.map((p) => p.id === updated.id ? updated : p))
      setEditando(null)
      toast.success("Promoción actualizada")
    } finally { setLoading(false) }
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────
  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la promoción "${nombre}"?`)) return
    try {
      const res = await fetch(`/api/promociones/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error eliminando"); return }
      setPromociones((prev) => prev.filter((p) => p.id !== id))
      toast.success("Promoción eliminada")
    } catch { toast.error("Error de conexión") }
  }

  // ── Email ─────────────────────────────────────────────────────────────────
  function abrirEmail(promoId: string) {
    setEmailPanel(emailPanel === promoId ? null : promoId)
    setEditando(null)
    setResultado(null)
    setAsunto("")
    setMensaje("")
    setDestinatariosManual("")
    setSeleccionados(new Set())
    setImagen(null)
    setImagenPreview(null)
  }

  function onImagenChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); return }
    setImagen(file)
    const url = URL.createObjectURL(file)
    setImagenPreview(url)
  }

  function toggleCliente(email: string) {
    setSeleccionados((prev) => {
      const n = new Set(prev)
      n.has(email) ? n.delete(email) : n.add(email)
      return n
    })
  }

  function toggleTodos() {
    if (seleccionados.size === clientesEmail.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(clientesEmail.map((c) => c.email)))
    }
  }

  function destinatariosFinales(promo: Promocion): string[] {
    const lista = new Set<string>(seleccionados)
    // Agregar emails manuales
    destinatariosManual.split(/[\n,;]/).map((e) => e.trim()).filter(Boolean).forEach((e) => lista.add(e))
    return Array.from(lista)
  }

  async function handleEnviarEmail(promo: Promocion) {
    const dests = destinatariosFinales(promo)
    if (!asunto) { toast.error("El asunto es obligatorio"); return }
    if (!mensaje) { toast.error("El mensaje es obligatorio"); return }
    if (!dests.length) { toast.error("Agrega al menos un destinatario"); return }

    setEnviando(true)
    setResultado(null)
    try {
      const fd = new FormData()
      fd.append("asunto", asunto)
      fd.append("mensaje", mensaje)
      fd.append("destinatarios", JSON.stringify(dests))
      if (imagen) fd.append("imagen", imagen)

      const res = await fetch(`/api/promociones/${promo.id}`, { method: "POST", body: fd })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? "Error"); return }
      const data = await res.json()
      setResultado({ enviados: data.enviados, fallidos: data.fallidos })
      if (data.enviados > 0) toast.success(`✅ ${data.enviados} correo(s) enviado(s)`)
      if (data.fallidos > 0) toast.error(`⚠️ ${data.fallidos} correo(s) fallaron`)
    } finally { setEnviando(false) }
  }

  function resetForm() {
    setNombre(""); setDescripcion(""); setTipo("PORCENTAJE"); setValor(""); setFechaInicio(hoy); setFechaFin("")
  }

  const ahora = new Date()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Promociones</h1>
          <p className="text-sm text-gray-500">Descuentos y correos publicitarios</p>
        </div>
        <button onClick={() => { setShowForm(true); resetForm() }}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nueva Promoción
        </button>
      </div>

      {/* Lista de promociones */}
      {promociones.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <Megaphone className="w-10 h-10 mb-3 text-gray-300" />
          <p className="text-sm">Sin promociones. Crea la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promociones.map((p) => {
            const vencida = new Date(p.fechaFin) < ahora
            const estaEditando = editando?.id === p.id
            const estaEmailAbierto = emailPanel === p.id

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Cabecera de la promo */}
                <div className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #1E40AF18, #38BDF818)", border: "1px solid #1E40AF30" }}>
                      <Tag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{p.nombre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          vencida ? "bg-gray-100 text-gray-500" : p.activa ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {vencida ? "Vencida" : p.activa ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      {p.descripcion && <p className="text-xs text-gray-500 mt-0.5">{p.descripcion}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-lg font-black text-blue-600">{valorDisplay(p)}</span>
                        <span className="text-xs text-gray-400">
                          📅 {new Date(p.fechaInicio).toLocaleDateString("es-CO")} → {new Date(p.fechaFin).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEmail(p.id)} title="Enviar por correo"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${estaEmailAbierto ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                      <Mail className="w-3.5 h-3.5" />
                      Email
                      {estaEmailAbierto ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button onClick={() => abrirEdicion(p)} title="Editar"
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id, p.nombre)} title="Eliminar"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Panel edición */}
                {estaEditando && (
                  <div className="border-t border-blue-100 bg-blue-50 px-5 py-4">
                    <div className="flex justify-between items-center mb-3">
                      <p className="font-semibold text-blue-800 text-sm">Editar promoción</p>
                      <button onClick={() => setEditando(null)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Nombre</label>
                        <input value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Descripción</label>
                        <input value={editando.descripcion ?? ""} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Tipo de descuento</label>
                        <select value={editando.tipoDescuento} onChange={(e) => setEditando({ ...editando, tipoDescuento: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                          <option value="PORCENTAJE">Porcentaje (%)</option>
                          <option value="VALOR_FIJO">Valor fijo ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Valor</label>
                        <input type="number" value={editando.valor} onChange={(e) => setEditando({ ...editando, valor: parseFloat(e.target.value) })} min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Desde</label>
                        <input type="date" value={editando.fechaInicio.split("T")[0]} onChange={(e) => setEditando({ ...editando, fechaInicio: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">Hasta</label>
                        <input type="date" value={editando.fechaFin.split("T")[0]} onChange={(e) => setEditando({ ...editando, fechaFin: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" id={`activa-${p.id}`} checked={editando.activa} onChange={(e) => setEditando({ ...editando, activa: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                        <label htmlFor={`activa-${p.id}`} className="text-sm text-gray-700">Promoción activa</label>
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <button type="button" onClick={() => setEditando(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                        <button type="submit" disabled={loading}
                          className="flex-1 py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60"
                          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                          <Check className="w-4 h-4" /> {loading ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Panel email */}
                {estaEmailAbierto && !estaEditando && (
                  <div className="border-t border-blue-200 bg-gradient-to-b from-blue-50 to-white px-5 py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm">Enviar correo publicitario</p>
                        <p className="text-xs text-gray-500">Promoción: <strong>{p.nombre}</strong> · Descuento: <strong>{valorDisplay(p)}</strong></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Columna izquierda: contenido del email */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Asunto del correo *</label>
                          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej: 🚗 ¡20% de descuento este fin de semana!"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Mensaje *</label>
                          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={5} placeholder="Hola, queremos invitarte a aprovechar nuestra promoción especial..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                        </div>

                        {/* Imagen */}
                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Imagen adjunta (opcional · máx. 5MB)</label>
                          <input ref={fileRef} type="file" accept="image/*" onChange={onImagenChange} className="hidden" />
                          {imagenPreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-blue-200">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imagenPreview} alt="preview" className="w-full h-40 object-cover" />
                              <button type="button" onClick={() => { setImagen(null); setImagenPreview(null); if (fileRef.current) fileRef.current.value = "" }}
                                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80">
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                                {imagen?.name}
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => fileRef.current?.click()}
                              className="w-full border-2 border-dashed border-blue-200 rounded-xl py-6 flex flex-col items-center gap-2 text-blue-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
                              <Upload className="w-6 h-6" />
                              <span className="text-sm font-medium">Haz clic para subir imagen</span>
                              <span className="text-xs">JPG, PNG, WebP</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Columna derecha: destinatarios */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-700">
                              Clientes registrados ({clientesEmail.length} con email)
                            </label>
                            {clientesEmail.length > 0 && (
                              <button type="button" onClick={toggleTodos} className="text-xs text-blue-600 hover:underline">
                                {seleccionados.size === clientesEmail.length ? "Deseleccionar todos" : "Seleccionar todos"}
                              </button>
                            )}
                          </div>
                          {clientesEmail.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-xs border border-dashed border-gray-200 rounded-lg">
                              <Users className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                              Sin clientes con email registrado aún.<br />
                              Agrégalos al registrar vehículos.
                            </div>
                          ) : (
                            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                              {clientesEmail.map((c) => (
                                <label key={c.email} className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-sm ${seleccionados.has(c.email) ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                                  <input type="checkbox" checked={seleccionados.has(c.email)} onChange={() => toggleCliente(c.email)}
                                    className="w-4 h-4 accent-blue-600 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{c.nombre}</p>
                                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-700 mb-1 block">Correos adicionales</label>
                          <textarea value={destinatariosManual} onChange={(e) => setDestinatariosManual(e.target.value)} rows={3}
                            placeholder="uno@correo.com&#10;otro@correo.com&#10;(separar por línea o coma)"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
                        </div>

                        {/* Resumen */}
                        <div className="bg-blue-50 rounded-lg px-3 py-2.5 flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total destinatarios:</span>
                          <span className="font-bold text-blue-700">{destinatariosFinales(p).length}</span>
                        </div>

                        {/* Resultado del envío */}
                        {resultado && (
                          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${resultado.fallidos === 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            ✅ {resultado.enviados} enviado(s)
                            {resultado.fallidos > 0 && ` · ⚠️ ${resultado.fallidos} fallido(s)`}
                          </div>
                        )}

                        {/* Botón enviar */}
                        <button type="button" onClick={() => handleEnviarEmail(p)} disabled={enviando}
                          className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-60 text-sm"
                          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                          {enviando
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                            : <><Send className="w-4 h-4" /> Enviar correo publicitario</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Nueva Promoción</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre de la promoción *</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Promo fin de semana" required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Descripción</label>
                <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Detalles de la promoción..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo de descuento</label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="PORCENTAJE">Porcentaje (%)</option>
                    <option value="VALOR_FIJO">Valor fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor *</label>
                  <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "PORCENTAJE" ? "10" : "5000"} required min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Desde *</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Hasta *</label>
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
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
    </div>
  )
}
