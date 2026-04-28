"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Search, Car, Clock, ChevronDown, ChevronUp, Pencil, X, Check, Download, Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { useRef } from "react"

type ServicioItem = { id: string; nombre: string; precio: number }
type Servicio = {
  id: string; estado: string; horaIngreso: string; horaInicio: string | null
  horaSalida: string | null; duracionMinutos: number | null; metodoPago: string | null
  total: number | null; observaciones: string | null
  tipoServicio: { nombre: string; precio: number } | null
  items: ServicioItem[]
  operario: { user: { name: string | null } } | null
  bahia: { nombre: string } | null
}
type Vehiculo = {
  id: string; placa: string; marca: string; modelo: string | null; anio: number | null
  color: string | null; tipo: string; clienteNombre: string | null; clienteTelefono: string | null
  clienteEmail: string | null; observaciones: string | null; createdAt: string; updatedAt: string
  _count?: { servicios: number }; servicios?: Servicio[]
}

const TIPOS_VEHICULO = ["SEDAN","SUV","CAMIONETA","MOTO","BUS","OTRO"]
const ESTADO_COLOR: Record<string, string> = {
  COMPLETADO: "bg-green-100 text-green-700",
  EN_PROCESO: "bg-blue-100 text-blue-700",
  EN_ESPERA:  "bg-amber-100 text-amber-700",
  CANCELADO:  "bg-gray-100 text-gray-500",
}

function NombreServicios({ s }: { s: Servicio }) {
  if (s.items?.length) return <>{s.items.map((i) => i.nombre).join(" + ")}</>
  return <>{s.tipoServicio?.nombre ?? "—"}</>
}

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [expandido, setExpandido] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<Vehiculo | null>(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Vehiculo>>({})
  const [guardando, setGuardando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cargarLista() }, [])

  async function cargarLista() {
    setLoading(true)
    try {
      const data = await fetch("/api/vehiculos").then((r) => r.json())
      setVehiculos(data)
    } finally { setLoading(false) }
  }

  async function exportarExcel() {
    setExportando(true)
    try {
      const res = await fetch("/api/vehiculos/exportar")
      if (!res.ok) { toast.error("Error generando Excel"); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `quickstop-clientes-${new Date().toLocaleDateString("es-CO").replace(/\//g, "-")}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Excel descargado correctamente")
    } catch { toast.error("Error descargando") } finally { setExportando(false) }
  }

  async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    try {
      const fd = new FormData()
      fd.append("archivo", file)
      const res  = await fetch("/api/vehiculos/importar", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Error importando"); return }
      toast.success(data.mensaje)
      setShowImport(false)
      cargarLista()
    } catch { toast.error("Error procesando el archivo") }
    finally { setImportando(false); if (fileRef.current) fileRef.current.value = "" }
  }

  async function buscarPorPlaca() {
    if (!busqueda) { cargarLista(); return }
    setLoading(true)
    try {
      const data = await fetch(`/api/vehiculos?placa=${busqueda.toUpperCase()}`).then((r) => r.json())
      setVehiculos(data ? [data] : [])
    } finally { setLoading(false) }
  }

  async function expandirVehiculo(v: Vehiculo) {
    if (expandido === v.id) { setExpandido(null); setDetalle(null); return }
    setExpandido(v.id)
    setDetalle(null)
    setCargandoDetalle(true)
    try {
      const data = await fetch(`/api/vehiculos/${v.id}`).then((r) => r.json())
      setDetalle(data)
    } catch {
      toast.error("Error cargando historial")
    } finally { setCargandoDetalle(false) }
  }

  function iniciarEdicion(v: Vehiculo) {
    setEditando(v.id)
    setEditForm({
      placa: v.placa, marca: v.marca, modelo: v.modelo ?? "",
      anio: v.anio ?? undefined, color: v.color ?? "",
      tipo: v.tipo, clienteNombre: v.clienteNombre ?? "",
      clienteTelefono: v.clienteTelefono ?? "", clienteEmail: v.clienteEmail ?? "",
      observaciones: v.observaciones ?? "",
    })
  }

  async function guardarEdicion(id: string) {
    setGuardando(true)
    try {
      const res = await fetch(`/api/vehiculos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { toast.error("Error guardando"); return }
      toast.success("Vehículo actualizado")
      setEditando(null)
      cargarLista()
      if (expandido === id) {
        const data = await fetch(`/api/vehiculos/${id}`).then((r) => r.json())
        setDetalle(data)
      }
    } finally { setGuardando(false) }
  }

  return (
    <div className="space-y-4">
      {/* Header con título y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Historial de Vehículos</h1>
          <p className="text-sm text-gray-500">Trazabilidad completa · {vehiculos.length} vehículo(s) registrado(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" /> Importar Excel
          </button>
          <button onClick={exportarExcel} disabled={exportando}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-all"
            style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Modal importar */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4"
              style={{ background: "linear-gradient(135deg, #0F172A, #1E3A8A)" }}>
              <div className="flex items-center gap-2 text-white">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="font-semibold">Importar clientes desde Excel</span>
              </div>
              <button onClick={() => setShowImport(false)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Instrucciones */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4" /> Columnas reconocidas en el Excel:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-2 text-blue-700">
                  {[
                    ["Placa *", "requerida"],
                    ["Marca *", "requerida"],
                    ["Modelo", "opcional"],
                    ["Año / Anio", "opcional"],
                    ["Color", "opcional"],
                    ["Tipo", "SEDAN, SUV, MOTO…"],
                    ["Nombre Cliente", "opcional"],
                    ["Teléfono", "opcional"],
                    ["Email", "opcional"],
                    ["Observaciones", "opcional"],
                  ].map(([campo, desc]) => (
                    <div key={campo}>
                      <span className="font-semibold">{campo}</span>
                      <span className="text-blue-500"> — {desc}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Si la placa ya existe, <strong>actualiza</strong> los datos del vehículo y cliente.
                Si no existe, <strong>crea</strong> un nuevo registro.
              </p>
              {/* Botón para descargar plantilla */}
              <button onClick={exportarExcel} disabled={exportando}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Descargar plantilla con datos actuales
              </button>
              {/* Upload */}
              <div>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importarExcel} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={importando}
                  className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold rounded-xl transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #059669, #10B981)" }}>
                  {importando
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                    : <><Upload className="w-4 h-4" /> Seleccionar archivo Excel</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && buscarPorPlaca()}
            placeholder="Buscar por placa (ABC123)"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase" />
        </div>
        <button onClick={buscarPorPlaca} className="px-4 py-2.5 text-white text-sm font-medium rounded-lg" style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>Buscar</button>
        {busqueda && (
          <button onClick={() => { setBusqueda(""); cargarLista() }} className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Limpiar</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
      ) : vehiculos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No se encontraron vehículos</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {vehiculos.map((v) => (
            <div key={v.id}>
              {/* Fila principal */}
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <button className="flex items-center gap-3 flex-1 text-left hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors" onClick={() => expandirVehiculo(v)}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 font-mono">{v.placa}</p>
                    <p className="text-sm text-gray-500 truncate">{v.marca} {v.modelo} {v.anio && `· ${v.anio}`} {v.color && `· ${v.color}`}</p>
                  </div>
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    {v.clienteNombre && <p className="text-sm font-medium text-gray-700">{v.clienteNombre}</p>}
                    <p className="text-xs text-gray-400">{v._count?.servicios ?? 0} servicio(s)</p>
                  </div>
                  <button onClick={() => iniciarEdicion(v)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => expandirVehiculo(v)} className="p-1.5 text-gray-400">
                    {expandido === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Modal edición inline */}
              {editando === v.id && (
                <div className="px-4 pb-4 bg-blue-50 border-t border-blue-100">
                  <div className="flex items-center justify-between py-3">
                    <h3 className="font-semibold text-blue-800 text-sm">Editar vehículo</h3>
                    <button onClick={() => setEditando(null)} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "Placa", key: "placa", upper: true },
                      { label: "Marca", key: "marca" },
                      { label: "Modelo", key: "modelo" },
                      { label: "Año", key: "anio", type: "number" },
                      { label: "Color", key: "color" },
                    ].map(({ label, key, upper, type }) => (
                      <div key={key}>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">{label}</label>
                        <input
                          type={type || "text"}
                          value={(editForm as Record<string, unknown>)[key]?.toString() ?? ""}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: upper ? e.target.value.toUpperCase() : e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-0.5 block">Tipo</label>
                      <select value={editForm.tipo ?? "SEDAN"} onChange={(e) => setEditForm((p) => ({ ...p, tipo: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        {TIPOS_VEHICULO.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Datos del cliente</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { label: "Nombre", key: "clienteNombre" },
                      { label: "Teléfono", key: "clienteTelefono" },
                      { label: "Email", key: "clienteEmail", col2: true },
                      { label: "Observaciones", key: "observaciones", col2: true },
                    ].map(({ label, key, col2 }) => (
                      <div key={key} className={col2 ? "col-span-2" : ""}>
                        <label className="text-xs font-medium text-gray-600 mb-0.5 block">{label}</label>
                        <input
                          value={(editForm as Record<string, unknown>)[key]?.toString() ?? ""}
                          onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditando(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600">Cancelar</button>
                    <button onClick={() => guardarEdicion(v.id)} disabled={guardando}
                      className="flex-1 py-2 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                      <Check className="w-4 h-4" /> {guardando ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Historial expandido */}
              {expandido === v.id && editando !== v.id && (
                <div className="px-4 pb-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide pt-3">Historial de servicios</p>
                  {cargandoDetalle ? (
                    <div className="flex justify-center py-4"><div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
                  ) : !detalle ? null : detalle.servicios!.length === 0 ? (
                    <p className="text-sm text-gray-400">Sin servicios registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {detalle.servicios!.map((s) => (
                        <div key={s.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                <NombreServicios s={s} />
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 flex-wrap">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                {new Date(s.horaIngreso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                                {s.duracionMinutos && ` · ${s.duracionMinutos}min`}
                                {s.operario?.user.name && ` · ${s.operario.user.name}`}
                                {s.bahia?.nombre && ` · ${s.bahia.nombre}`}
                                {s.metodoPago && ` · ${s.metodoPago}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {s.total != null && <p className="text-sm font-bold text-gray-800">${s.total.toLocaleString("es-CO")}</p>}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[s.estado] ?? "bg-gray-100 text-gray-500"}`}>
                                {s.estado.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
