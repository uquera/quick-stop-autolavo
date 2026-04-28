import { prisma } from "@/lib/prisma"
import { Tag, Clock } from "lucide-react"

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n)
}

export default async function OperarioTiposServicioPage() {
  const tipos = await prisma.tipoServicio.findMany({
    where: { activo: true },
    orderBy: { precio: "asc" },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Tipos de Servicio</h1>
        <p className="text-sm text-gray-500">Catálogo de servicios y precios vigentes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tipos.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">{t.nombre}</h3>
                {t.descripcion && <p className="text-xs text-gray-500 mt-0.5">{t.descripcion}</p>}
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black text-blue-600">{formatCOP(t.precio)}</p>
                <p className="text-xs text-gray-400 mt-0.5">precio COP</p>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-600">{t.duracionMinutos} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
