import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

const TIPOS_VALIDOS = ["SEDAN", "SUV", "CAMIONETA", "MOTO", "BUS", "OTRO"]

function normalizarTipo(raw: string): "SEDAN" | "SUV" | "CAMIONETA" | "MOTO" | "BUS" | "OTRO" {
  const t = raw?.toString().toUpperCase().trim()
  return (TIPOS_VALIDOS.includes(t) ? t : "SEDAN") as "SEDAN" | "SUV" | "CAMIONETA" | "MOTO" | "BUS" | "OTRO"
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("archivo") as File | null
    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })

    const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el límite de 5 MB" }, { status: 413 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      return NextResponse.json({ error: "Formato no soportado. Usa .xlsx, .xls o .csv" }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const wb  = XLSX.read(buf, { type: "buffer" })

    // Leer primera hoja
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

    if (!rows.length) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 })
    }

    const resultados = { creados: 0, actualizados: 0, errores: 0, detalles: [] as string[] }

    for (const row of rows) {
      // Normalizar nombres de columna (case-insensitive)
      const get = (keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find((r) => r.toLowerCase().trim() === k.toLowerCase())
          if (found) return row[found]?.toString().trim() ?? ""
        }
        return ""
      }

      const placa = get(["placa", "plate", "matricula"]).toUpperCase()
      const marca = get(["marca", "brand", "make"])

      if (!placa || !marca) {
        resultados.errores++
        resultados.detalles.push(`Fila omitida: placa o marca vacía`)
        continue
      }

      const data = {
        marca,
        modelo:          get(["modelo", "model"]) || undefined,
        anio:            parseInt(get(["año", "anio", "year"])) || undefined,
        color:           get(["color"]) || undefined,
        tipo:            normalizarTipo(get(["tipo", "tipo vehiculo", "tipo vehículo", "type"])),
        clienteNombre:   get(["nombre cliente", "cliente", "client", "nombre"]) || undefined,
        clienteTelefono: get(["teléfono", "telefono", "phone", "tel"]) || undefined,
        clienteEmail:    get(["email", "correo", "correo electrónico"]) || undefined,
        observaciones:   get(["observaciones", "notes", "notas"]) || undefined,
      }

      try {
        const existing = await prisma.vehiculo.findUnique({ where: { placa } })
        if (existing) {
          await prisma.vehiculo.update({ where: { placa }, data })
          resultados.actualizados++
        } else {
          await prisma.vehiculo.create({ data: { placa, ...data } })
          resultados.creados++
        }
      } catch {
        resultados.errores++
        resultados.detalles.push(`Error procesando placa ${placa}`)
      }
    }

    return NextResponse.json({
      ok: true,
      mensaje: `Importación completada: ${resultados.creados} nuevo(s), ${resultados.actualizados} actualizado(s), ${resultados.errores} error(es)`,
      ...resultados,
    })
  } catch (err) {
    console.error("[importar]", err)
    return NextResponse.json({ error: "Error procesando el archivo" }, { status: 500 })
  }
}
