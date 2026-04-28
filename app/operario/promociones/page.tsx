import { prisma } from "@/lib/prisma"
import { Megaphone, Tag } from "lucide-react"

export default async function OperarioPromocionesPage() {
  const promociones = await prisma.promocion.findMany({
    where: { activa: true },
    orderBy: { fechaFin: "asc" },
  })

  const ahora = new Date()
  const vigentes   = promociones.filter((p) => new Date(p.fechaFin) >= ahora)
  const vencidas   = promociones.filter((p) => new Date(p.fechaFin) < ahora)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Promociones</h1>
        <p className="text-sm text-gray-500">Descuentos y ofertas activas para informar a los clientes</p>
      </div>

      {vigentes.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <Megaphone className="w-10 h-10 mb-3 text-gray-300" />
          <p className="text-sm">Sin promociones activas actualmente</p>
        </div>
      )}

      {vigentes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vigentes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vigentes.map((p) => {
              const diasRestantes = Math.ceil((new Date(p.fechaFin).getTime() - ahora.getTime()) / 86400000)
              return (
                <div key={p.id} className="bg-white rounded-xl border-2 border-blue-100 p-5 relative overflow-hidden">
                  {/* Ribbon */}
                  <div className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)", borderBottomLeftRadius: "8px" }}>
                    {diasRestantes === 0 ? "¡Hoy!" : `${diasRestantes}d`}
                  </div>

                  <div className="flex items-start gap-3 mb-4 pr-12">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{p.nombre}</h3>
                      {p.descripcion && <p className="text-xs text-gray-500 mt-0.5">{p.descripcion}</p>}
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-black text-blue-600">
                        {p.tipoDescuento === "PORCENTAJE" ? `${p.valor}%` : `$${p.valor.toLocaleString("es-CO")}`}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">de descuento</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Válido hasta</p>
                      <p className="text-xs font-semibold text-gray-600">
                        {new Date(p.fechaFin).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {vencidas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vencidas</p>
          <div className="space-y-2">
            {vencidas.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between opacity-60">
                <span className="text-sm font-medium text-gray-600">{p.nombre}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-500">
                    {p.tipoDescuento === "PORCENTAJE" ? `${p.valor}%` : `$${p.valor.toLocaleString("es-CO")}`}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Vencida</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
