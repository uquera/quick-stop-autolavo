import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import ColaServiciosBoard from "@/components/admin/ColaServiciosBoard"

export default async function ServiciosPage() {
  const session = await auth()
  const bahias = await prisma.bahia.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Cola de Servicios</h1>
        <p className="text-sm text-gray-500">Control en tiempo real de los lavados del día</p>
      </div>
      <ColaServiciosBoard
        bahias={bahias}
        userRole={session!.user.role}
      />
    </div>
  )
}
