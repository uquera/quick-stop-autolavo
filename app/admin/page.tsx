import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Car, Wrench, DollarSign, Users, Clock, TrendingUp } from "lucide-react"

function formatCOP(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount)
}

export default async function AdminDashboard() {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const finHoy = new Date()
  finHoy.setHours(23, 59, 59, 999)

  const [
    vehiculosHoy,
    serviciosCompletadosHoy,
    serviciosActivosHoy,
    ingresosHoy,
    totalVehiculosMes,
    serviciosMes,
    bahiasActivas,
    operariosActivos,
  ] = await Promise.all([
    prisma.servicio.count({ where: { horaIngreso: { gte: hoy, lte: finHoy } } }),
    prisma.servicio.count({ where: { estado: "COMPLETADO", horaIngreso: { gte: hoy, lte: finHoy } } }),
    prisma.servicio.count({ where: { estado: { in: ["EN_ESPERA", "EN_PROCESO"] } } }),
    prisma.servicio.aggregate({
      _sum: { total: true },
      where: { estado: "COMPLETADO", horaIngreso: { gte: hoy, lte: finHoy } },
    }),
    prisma.vehiculo.count(),
    prisma.servicio.findMany({
      where: { estado: "COMPLETADO", horaIngreso: { gte: hoy, lte: finHoy } },
      include: { tipoServicio: true, vehiculo: true, operario: { include: { user: { select: { name: true } } } } },
      orderBy: { horaSalida: "desc" },
      take: 10,
    }),
    prisma.bahia.count({ where: { activo: true } }),
    prisma.operario.count({ where: { activo: true } }),
  ])

  const ingresosTotal = ingresosHoy._sum.total ?? 0

  const duracionPromedio =
    serviciosMes.filter((s) => s.duracionMinutos).length > 0
      ? Math.round(serviciosMes.filter((s) => s.duracionMinutos).reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) /
          serviciosMes.filter((s) => s.duracionMinutos).length)
      : 0

  const kpis = [
    { label: "Vehículos hoy", value: vehiculosHoy, icon: Car, color: "#1E40AF", bg: "#EFF6FF" },
    { label: "Servicios activos", value: serviciosActivosHoy, icon: Wrench, color: "#D97706", bg: "#FFFBEB" },
    { label: "Completados hoy", value: serviciosCompletadosHoy, icon: TrendingUp, color: "#059669", bg: "#ECFDF5" },
    { label: "Ingresos hoy", value: formatCOP(ingresosTotal), icon: DollarSign, color: "#7C3AED", bg: "#F5F3FF" },
    { label: "Bahías activas", value: bahiasActivas, icon: Users, color: "#0891B2", bg: "#ECFEFF" },
    { label: "Tiempo promedio", value: `${duracionPromedio}min`, icon: Clock, color: "#BE185D", bg: "#FDF2F8" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Últimos servicios */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Últimos servicios completados hoy</h2>
        </div>
        {serviciosMes.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Sin servicios completados hoy</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {serviciosMes.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                    <Car className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{s.vehiculo.placa} — {s.vehiculo.marca}</p>
                    <p className="text-xs text-gray-500">{s.tipoServicio?.nombre ?? "—"} {s.operario?.user.name && `· ${s.operario.user.name}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-gray-800">{formatCOP(s.total ?? 0)}</p>
                  {s.duracionMinutos && <p className="text-xs text-gray-400">{s.duracionMinutos}min</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
