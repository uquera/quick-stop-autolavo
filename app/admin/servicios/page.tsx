import { auth } from "@/auth"
import ColaServiciosBoard from "@/components/admin/ColaServiciosBoard"

export default async function ServiciosPage() {
  const session = await auth()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Línea de Lavado</h1>
        <p className="text-sm text-gray-500">Pipeline en tiempo real — Exterior → Secado → Interior → Cobro</p>
      </div>
      <ColaServiciosBoard userRole={session!.user.role} />
    </div>
  )
}
