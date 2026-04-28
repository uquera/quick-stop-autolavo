"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, X, Pencil, Check, Trash2 } from "lucide-react"

type Operario = { id: string; activo: boolean; createdAt: string; user: { name: string | null; email: string } }

export default function OperariosPage() {
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  // Crear
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [loading, setLoading] = useState(false)

  // Editar
  const [editName, setEditName] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [editPassword2, setEditPassword2] = useState("")
  const [editActivo, setEditActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetch("/api/operarios").then((r) => r.json()).then(setOperarios)
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) { toast.error("Las contraseñas no coinciden"); return }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/operarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      const nuevo = await res.json()
      setOperarios((prev) => [nuevo, ...prev])
      setName(""); setEmail(""); setPassword(""); setPassword2(""); setShowForm(false)
      toast.success("Operario creado")
    } finally { setLoading(false) }
  }

  function iniciarEdicion(op: Operario) {
    setEditando(op.id)
    setEditName(op.user.name ?? "")
    setEditPassword("")
    setEditPassword2("")
    setEditActivo(op.activo)
  }

  async function guardarEdicion(id: string) {
    if (editPassword && editPassword !== editPassword2) { toast.error("Las contraseñas no coinciden"); return }
    if (editPassword && editPassword.length < 6) { toast.error("Contraseña mínimo 6 caracteres"); return }
    setGuardando(true)
    try {
      const body: Record<string, unknown> = { activo: editActivo }
      if (editName) body.name = editName
      if (editPassword) body.password = editPassword
      const res = await fetch(`/api/operarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error("Error actualizando"); return }
      const updated = await res.json()
      setOperarios((prev) => prev.map((op) => op.id === id ? { ...op, ...updated } : op))
      setEditando(null)
      toast.success("Operario actualizado")
    } finally { setGuardando(false) }
  }

  async function eliminarOperario(id: string, nombre: string) {
    if (!confirm(`¿Eliminar al operario "${nombre}"?\n\nSi tiene servicios registrados, será desactivado. Si no tiene historial, se eliminará permanentemente.`)) return
    try {
      const res = await fetch(`/api/operarios/${id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Error eliminando operario"); return }
      const data = await res.json()
      if (data.desactivado) {
        setOperarios((prev) => prev.map((op) => op.id === id ? { ...op, activo: false } : op))
        toast.success(`${nombre} desactivado (tiene historial de servicios)`)
      } else {
        setOperarios((prev) => prev.filter((op) => op.id !== id))
        toast.success(`${nombre} eliminado`)
      }
    } catch { toast.error("Error de conexión") }
  }

  const senalContraseña = (p: string) =>
    p.length === 0 ? "" : p.length < 6 ? "text-red-500" : "text-emerald-600"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Operarios</h1>
          <p className="text-sm text-gray-500">Gestión del equipo de trabajo</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
          <Plus className="w-4 h-4" /> Nuevo Operario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {operarios.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Sin operarios registrados</p>
        ) : operarios.map((op) => (
          <div key={op.id}>
            {/* Fila */}
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {(op.user.name ?? op.user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">{op.user.name}</p>
                  <p className="text-xs text-gray-500">{op.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${op.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {op.activo ? "Activo" : "Inactivo"}
                </span>
                <button onClick={() => iniciarEdicion(op)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => eliminarOperario(op.id, op.user.name ?? op.user.email)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Edición inline */}
            {editando === op.id && (
              <div className="px-5 pb-4 bg-blue-50 border-t border-blue-100">
                <div className="flex justify-between items-center py-3">
                  <p className="text-sm font-semibold text-blue-800">Editar operario</p>
                  <button onClick={() => setEditando(null)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-0.5 block">Nombre</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-0.5 block">Nueva contraseña (dejar vacío para no cambiar)</label>
                    <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="••••••••" className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editPassword ? (editPassword.length < 6 ? "border-red-300" : "border-emerald-400") : "border-gray-300"}`} />
                    {editPassword && <p className={`text-xs mt-0.5 ${senalContraseña(editPassword)}`}>{editPassword.length < 6 ? "Mínimo 6 caracteres" : "Contraseña válida ✓"}</p>}
                  </div>
                  {editPassword && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-0.5 block">Confirmar contraseña</label>
                      <input type="password" value={editPassword2} onChange={(e) => setEditPassword2(e.target.value)} placeholder="••••••••" className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${editPassword2 ? (editPassword !== editPassword2 ? "border-red-300" : "border-emerald-400") : "border-gray-300"}`} />
                      {editPassword2 && editPassword !== editPassword2 && <p className="text-xs text-red-500 mt-0.5">Las contraseñas no coinciden</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`activo-${op.id}`} checked={editActivo} onChange={(e) => setEditActivo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor={`activo-${op.id}`} className="text-sm text-gray-700">Operario activo</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditando(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                  <button onClick={() => guardarEdicion(op.id)} disabled={guardando}
                    className="flex-1 py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                    <Check className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal crear operario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Nuevo Operario</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nombre completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Correo electrónico</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operario@quickstop.com" required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${password && password.length < 6 ? "border-red-300" : password ? "border-emerald-400" : "border-gray-300"}`} />
                {password && <p className={`text-xs mt-0.5 ${senalContraseña(password)}`}>{password.length < 6 ? "Mínimo 6 caracteres" : "Contraseña válida ✓"}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Confirmar contraseña</label>
                <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" required
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${password2 && password !== password2 ? "border-red-300" : password2 && password === password2 ? "border-emerald-400" : "border-gray-300"}`} />
                {password2 && password !== password2 && <p className="text-xs text-red-500 mt-0.5">Las contraseñas no coinciden</p>}
                {password2 && password === password2 && password2.length >= 6 && <p className="text-xs text-emerald-600 mt-0.5">Contraseñas coinciden ✓</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                <button type="submit" disabled={loading || password !== password2 || password.length < 6}
                  className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                  {loading ? "Creando..." : "Crear Operario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
