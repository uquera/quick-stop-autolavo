import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getLicenciaStatus } from "@/lib/licencia"
import { prisma } from "@/lib/prisma"
import { BRAND } from "@/lib/brand"
import { Shield, CheckCircle, AlertTriangle, XCircle, CalendarDays, Tag, Receipt } from "lucide-react"

function formatARS(monto: number, moneda: string) {
  const currency = moneda === "ARS" ? "ARS" : moneda
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency, minimumFractionDigits: 0,
  }).format(monto)
}

function formatFecha(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
}

function formatPeriodo(inicio: Date, fin: Date) {
  if (inicio.getUTCMonth() === fin.getUTCMonth() && inicio.getUTCFullYear() === fin.getUTCFullYear()) {
    const label = inicio.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }
  return (
    inicio.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }) +
    " – " +
    fin.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
  )
}

export default async function LicenciaPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/login")

  const [lic, pagos] = await Promise.all([
    getLicenciaStatus(),
    prisma.pagoLicencia.findMany({ orderBy: { fechaPago: "desc" }, take: 8 }),
  ])

  const contacto = BRAND.email || null

  let estadoChip: { label: string; color: string; bg: string; icon: typeof Shield }
  if (!lic.existe)       estadoChip = { label: "Sin configurar", color: "#6B7280", bg: "#F9FAFB", icon: Shield }
  else if (lic.suspendida)     estadoChip = { label: "Suspendida",     color: "#DC2626", bg: "#FEF2F2", icon: XCircle }
  else if (lic.mostrarBanner)  estadoChip = { label: "Por vencer",     color: "#D97706", bg: "#FFFBEB", icon: AlertTriangle }
  else                         estadoChip = { label: "Activa",         color: "#059669", bg: "#ECFDF5", icon: CheckCircle }

  const IconEstado = estadoChip.icon

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Licencia de uso
        </h1>
        <p className="text-sm text-gray-500 mt-1">Estado de tu suscripción a {BRAND.name}</p>
      </div>

      {/* Estado de la licencia */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Estado</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{ color: estadoChip.color, backgroundColor: estadoChip.bg }}>
            <IconEstado className="w-3.5 h-3.5" />
            {estadoChip.label}
          </span>
        </div>

        {lic.existe && (
          <>
            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
              <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" /> Plan
              </span>
              <span className="text-sm font-bold text-gray-800">{lic.plan}</span>
            </div>

            {lic.fechaVencimiento && (
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400" /> Vencimiento
                </span>
                <span className="text-sm text-gray-800">{formatFecha(lic.fechaVencimiento)}</span>
              </div>
            )}

            {!lic.suspendida && (
              <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <span className="text-sm font-medium text-gray-600">Días restantes</span>
                <span className={`text-sm font-bold ${lic.diasRestantes <= 7 ? "text-amber-600" : "text-emerald-600"}`}>
                  {Math.max(lic.diasRestantes, 0)} días
                </span>
              </div>
            )}
          </>
        )}

        {/* Barra de progreso */}
        {lic.existe && !lic.suspendida && lic.diasRestantes > 0 && (
          <div className="border-t border-gray-50 pt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(2, (lic.diasRestantes / 365) * 100))}%`,
                  background: lic.diasRestantes <= 7
                    ? "linear-gradient(90deg, #F59E0B, #D97706)"
                    : "linear-gradient(90deg, #1E40AF, #38BDF8)",
                }} />
            </div>
          </div>
        )}
      </div>

      {/* Mensaje contextual */}
      {lic.suspendida ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 space-y-1">
          <p className="font-bold">Cuenta suspendida</p>
          <p>Comunícate con el equipo de Hypnos para reactivar el acceso.</p>
          {contacto && <p className="font-medium"><a href={`mailto:${contacto}`} className="underline">{contacto}</a></p>}
        </div>
      ) : lic.mostrarBanner ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 space-y-1">
          <p className="font-bold">Suscripción próxima a vencer</p>
          <p>Quedan <strong>{lic.diasRestantes}</strong> días. Realiza el pago para evitar la suspensión.</p>
          {contacto && <p>Contacto: <a href={`mailto:${contacto}`} className="underline font-medium">{contacto}</a></p>}
        </div>
      ) : lic.existe ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
          <p>Tu suscripción está activa y vigente. No se requiere ninguna acción.</p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
          <p>No hay licencia configurada. Contacta a Hypnos para activar tu suscripción.</p>
        </div>
      )}

      {/* Historial de pagos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          Historial de pagos
        </h2>
        {pagos.length === 0 ? (
          <p className="text-sm text-gray-400">Sin pagos registrados aún.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{formatPeriodo(p.periodoInicio, p.periodoFin)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatFecha(p.fechaPago)}</p>
                  {p.notas && <p className="text-xs text-gray-400 mt-0.5">{p.notas}</p>}
                </div>
                <span className="text-sm font-bold text-gray-700">{formatARS(p.monto, p.moneda)}</span>
              </div>
            ))}
          </div>
        )}
        {contacto && (
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
            Consultas: <a href={`mailto:${contacto}`} className="text-blue-500 hover:underline">{contacto}</a>
          </p>
        )}
      </div>

      {/* Info técnica para Hypnos */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Información técnica</p>
        <div className="space-y-1 text-xs text-gray-500 font-mono">
          <p>Endpoint: <span className="text-gray-700">/api/gobernanza/licencia</span></p>
          <p>App: <span className="text-gray-700">quickstop.srv1485601.hstgr.cloud</span></p>
          <p>Puerto interno: <span className="text-gray-700">3011</span></p>
        </div>
      </div>
    </div>
  )
}
