import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getLicenciaStatus } from "@/lib/licencia"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const status = await getLicenciaStatus()
  return NextResponse.json(status)
}

// PATCH — solo con X-Master-Key (llamado desde Hypnos Panel)
export async function PATCH(req: NextRequest) {
  const masterKey = req.headers.get("x-master-key")
  const expected  = process.env.GOBERNANZA_MASTER_KEY

  if (!expected || masterKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { fechaVencimiento, suspendida, plan, notasAdmin } = body

  const data: Record<string, unknown> = {}
  if (fechaVencimiento !== undefined) data.fechaVencimiento = new Date(fechaVencimiento)
  if (suspendida !== undefined)       data.suspendida = Boolean(suspendida)
  if (plan !== undefined)             data.plan = plan
  if (notasAdmin !== undefined)       data.notasAdmin = notasAdmin

  const existing = await prisma.licencia.findFirst()

  const licencia = existing
    ? await prisma.licencia.update({ where: { id: existing.id }, data })
    : await prisma.licencia.create({
        data: {
          plan: ((plan as string) ?? "PRO") as "BASICO" | "PRO" | "ENTERPRISE",
          fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : new Date(),
          suspendida: Boolean(suspendida ?? false),
          notasAdmin: (notasAdmin as string) ?? null,
        },
      })

  return NextResponse.json({ ok: true, licencia })
}
