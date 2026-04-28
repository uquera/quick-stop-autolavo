import { prisma } from "@/lib/prisma"
import { Warehouse, Car, Clock } from "lucide-react"

const ESTADO_COLOR: Record<string, string> = {
  EN_ESPERA:  "bg-amber-100 text-amber-700",
  EN_PROCESO: "bg-blue-100 text-blue-700",
  COMPLETADO: "bg-green-100 text-green-700",
}

export default async function OperarioBahiasPage() {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0)
  const fin    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999)

  const bahias = await prisma.bahia.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      servicios: {
        where: { horaIngreso: { gte: inicio, lte: fin } },
        include: {
          vehiculo: true,
          operario: { include: { user: { select: { name: true } } } },
          items: true,
          tipoServicio: true,
        },
        orderBy: { horaIngreso: "asc" },
      },
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Bahías</h1>
        <p className="text-sm text-gray-500">Estado de las estaciones de lavado — hoy</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bahias.map((b) => {
          const activos    = b.servicios.filter((s) => ["EN_ESPERA","EN_PROCESO"].includes(s.estado))
          const completados = b.servicios.filter((s) => s.estado === "COMPLETADO")
          return (
            <div key={b.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: b.color + "18", borderBottom: `3px solid ${b.color}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: b.color + "30" }}>
                    <Warehouse className="w-5 h-5" style={{ color: b.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{b.nombre}</p>
                    <p className="text-xs" style={{ color: b.color }}>
                      {activos.length} en curso · {completados.length} completado(s)
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${activos.length > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                  {activos.length > 0 ? "Ocupada" : "Disponible"}
                </span>
              </div>

              <div className="p-3 space-y-2 min-h-[80px]">
                {b.servicios.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Sin servicios hoy</p>
                ) : (
                  <>
                    {activos.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 font-mono">{s.vehiculo.placa}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {s.items.length ? s.items.map((i) => i.nombre).join(" + ") : s.tipoServicio?.nombre}
                            {s.operario && ` · ${s.operario.user.name}`}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ESTADO_COLOR[s.estado]}`}>
                          {s.estado.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                    {completados.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mt-2 mb-1 uppercase tracking-wide">Completados hoy</p>
                        {completados.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 text-xs text-gray-400 px-1 py-0.5">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="font-mono font-semibold text-gray-500">{s.vehiculo.placa}</span>
                            <span>·</span>
                            <span>{new Date(s.horaIngreso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
