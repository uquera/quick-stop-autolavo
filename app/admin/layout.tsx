import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AdminShell from "@/components/admin/AdminShell"
import { getLicenciaStatus } from "@/lib/licencia"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/operario")

  const licencia = await getLicenciaStatus()
  const mostrarAlerta = licencia.existe && licencia.diasRestantes <= 3 && !licencia.suspendida
  const esCritico    = licencia.existe && (licencia.suspendida || licencia.diasRestantes <= 0)

  return (
    <div className="flex flex-col h-screen">
      {(mostrarAlerta || esCritico) && (
        <div className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white text-center ${esCritico ? "bg-red-600" : "bg-red-500"}`}>
          <span>⚠️</span>
          <span>
            {esCritico
              ? "Tu suscripción ha vencido. El sistema será suspendido en breve."
              : `Tu suscripción vence en ${licencia.diasRestantes} día${licencia.diasRestantes !== 1 ? "s" : ""}. Realiza tu pago y envía el comprobante a`}
            {" "}
            {!esCritico && (
              <a href="mailto:hypnosapps@gmail.com" className="underline underline-offset-2 font-bold">
                hypnosapps@gmail.com
              </a>
            )}
          </span>
          <Link href="/admin/licencia" className="ml-2 underline underline-offset-2 text-white/80 hover:text-white text-xs">
            Ver licencia →
          </Link>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <AdminShell user={session.user}>
          {children}
        </AdminShell>
      </div>
    </div>
  )
}
