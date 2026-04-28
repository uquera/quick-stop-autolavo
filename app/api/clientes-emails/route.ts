import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const vehiculos = await prisma.vehiculo.findMany({
    where: { clienteEmail: { not: null } },
    select: { clienteNombre: true, clienteEmail: true },
    orderBy: { clienteNombre: "asc" },
  })

  const unicos = new Map<string, string>()
  for (const v of vehiculos) {
    if (v.clienteEmail && !unicos.has(v.clienteEmail)) {
      unicos.set(v.clienteEmail, v.clienteNombre ?? v.clienteEmail)
    }
  }

  return NextResponse.json(
    Array.from(unicos.entries()).map(([email, nombre]) => ({ email, nombre }))
  )
}
