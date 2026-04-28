import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST — registra un pago de licencia (llamado desde Hypnos Panel)
export async function POST(req: NextRequest) {
  const masterKey = req.headers.get("x-master-key")
  const expected  = process.env.GOBERNANZA_MASTER_KEY

  if (!expected || masterKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { monto, moneda, periodoInicio, periodoFin, notas } = body

  if (!monto || !periodoInicio || !periodoFin) {
    return NextResponse.json({ error: "monto, periodoInicio y periodoFin son requeridos" }, { status: 400 })
  }

  let licencia = await prisma.licencia.findFirst()
  if (!licencia) {
    licencia = await prisma.licencia.create({
      data: {
        plan: "PRO",
        fechaVencimiento: new Date(periodoFin),
        suspendida: false,
      },
    })
  }

  const pago = await prisma.pagoLicencia.create({
    data: {
      licenciaId: licencia.id,
      monto: parseFloat(monto),
      moneda: moneda ?? "COP",
      periodoInicio: new Date(periodoInicio),
      periodoFin: new Date(periodoFin),
      notas: notas ?? null,
    },
  })

  return NextResponse.json({ ok: true, pago })
}
