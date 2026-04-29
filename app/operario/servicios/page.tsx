import ColaServiciosBoard from "@/components/admin/ColaServiciosBoard"

export default async function OperarioServiciosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Línea de Lavado</h1>
        <p className="text-sm text-gray-500">Estado en tiempo real del pipeline</p>
      </div>
      <ColaServiciosBoard userRole="OPERARIO" />
    </div>
  )
}
