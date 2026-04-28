import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { enviarEmailPromocion } from "@/lib/email"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { nombre, descripcion, tipoDescuento, valor, fechaInicio, fechaFin, activa } = body

  const promo = await prisma.promocion.update({
    where: { id },
    data: {
      ...(nombre !== undefined && { nombre }),
      ...(descripcion !== undefined && { descripcion }),
      ...(tipoDescuento !== undefined && { tipoDescuento }),
      ...(valor !== undefined && { valor: parseFloat(valor) }),
      ...(fechaInicio !== undefined && { fechaInicio: new Date(fechaInicio) }),
      ...(fechaFin !== undefined && { fechaFin: new Date(fechaFin) }),
      ...(activa !== undefined && { activa }),
    },
  })
  return NextResponse.json(promo)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }
  const { id } = await params
  await prisma.promocion.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

// POST /api/promociones/[id] — envío de correo publicitario
// Recibe multipart/form-data con: asunto, mensaje, destinatarios (JSON), imagen? (File)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { id } = await params
  const promo = await prisma.promocion.findUnique({ where: { id } })
  if (!promo) return NextResponse.json({ error: "Promoción no encontrada" }, { status: 404 })

  const formData = await req.formData()
  const asunto       = formData.get("asunto") as string
  const mensaje      = formData.get("mensaje") as string
  const destinatariosRaw = formData.get("destinatarios") as string
  const imagenFile   = formData.get("imagen") as File | null

  if (!asunto || !mensaje || !destinatariosRaw) {
    return NextResponse.json({ error: "Asunto, mensaje y destinatarios requeridos" }, { status: 400 })
  }

  const destinatarios: string[] = JSON.parse(destinatariosRaw)
  if (!destinatarios.length) {
    return NextResponse.json({ error: "Debes indicar al menos un destinatario" }, { status: 400 })
  }

  let imagenBuffer: Buffer | undefined
  let imagenNombre: string | undefined
  let imagenMime: string | undefined

  if (imagenFile && imagenFile.size > 0) {
    const bytes = await imagenFile.arrayBuffer()
    imagenBuffer = Buffer.from(bytes)
    imagenNombre = imagenFile.name
    imagenMime   = imagenFile.type
  }

  const valorDescuento = promo.tipoDescuento === "PORCENTAJE"
    ? `${promo.valor}%`
    : `$${promo.valor.toLocaleString("es-CO")} COP`

  const vigencia = `${new Date(promo.fechaInicio).toLocaleDateString("es-CO")} al ${new Date(promo.fechaFin).toLocaleDateString("es-CO")}`

  try {
    const resultados = await enviarEmailPromocion({
      asunto,
      mensaje,
      nombrePromocion: promo.nombre,
      descripcionPromocion: promo.descripcion ?? "",
      valorDescuento,
      vigencia,
      destinatarios,
      imagenBuffer,
      imagenNombre,
      imagenMime,
    })

    const enviados = resultados.filter((r) => r.ok).length
    const fallidos = resultados.filter((r) => !r.ok).length

    return NextResponse.json({ ok: true, enviados, fallidos, detalle: resultados })
  } catch (err) {
    console.error("[email-promo]", err)
    return NextResponse.json({ error: "Error enviando correos" }, { status: 500 })
  }
}
