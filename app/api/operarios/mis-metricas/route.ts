import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "OPERARIO") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const operario = await prisma.operario.findUnique({
    where: { userId: session.user.id },
  })
  if (!operario) return NextResponse.json({ error: "Operario no encontrado" }, { status: 404 })

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0)
  const finHoy    = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999)

  const [serviciosHoy, totalHistorico, activos] = await Promise.all([
    prisma.servicio.findMany({
      where: {
        operarioId: operario.id,
        estado: "COMPLETADO",
        horaIngreso: { gte: inicioHoy, lte: finHoy },
      },
    }),
    prisma.servicio.count({
      where: { operarioId: operario.id, estado: "COMPLETADO" },
    }),
    prisma.servicio.count({
      where: { operarioId: operario.id, estado: { in: ["EN_ESPERA", "EN_PROCESO"] } },
    }),
  ])

  const ingresosHoy = serviciosHoy.reduce((a, s) => a + (s.total ?? 0), 0)
  const tiempoPromedio =
    serviciosHoy.filter((s) => s.duracionMinutos).length > 0
      ? Math.round(
          serviciosHoy.reduce((a, s) => a + (s.duracionMinutos ?? 0), 0) /
            serviciosHoy.filter((s) => s.duracionMinutos).length
        )
      : 0

  return NextResponse.json({
    operarioId: operario.id,
    completadosHoy: serviciosHoy.length,
    ingresosHoy,
    tiempoPromedio,
    totalHistorico,
    activosAhora: activos,
  })
}
