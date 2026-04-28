import { prisma } from "@/lib/prisma"
import ColaServiciosBoard from "@/components/admin/ColaServiciosBoard"

export default async function OperarioServiciosPage() {
  const bahias = await prisma.bahia.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Cola de Servicios</h1>
        <p className="text-sm text-gray-500">Estado general del auto lavado</p>
      </div>
      <ColaServiciosBoard bahias={bahias} userRole="OPERARIO" />
    </div>
  )
}
