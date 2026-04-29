import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const vehiculos = await prisma.vehiculo.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      servicios: {
        where: { estado: "COMPLETADO" },
        orderBy: { horaIngreso: "desc" },
        include: {
          items: true,
          tipoServicio: true,
          operario: { include: { user: { select: { name: true } } } },
        },
      },
    },
  })

  // ── Hoja 1: Clientes y Vehículos ──────────────────────────────────────────
  const wsVehiculos = vehiculos.map((v) => {
    const ultimoServicio = v.servicios[0]
    const totalGastado   = v.servicios.reduce((a, s) => a + (s.total ?? 0), 0)

    return {
      "Placa":             v.placa,
      "Marca":             v.marca,
      "Modelo":            v.modelo ?? "",
      "Año":               v.anio ?? "",
      "Color":             v.color ?? "",
      "Tipo Vehículo":     v.tipo,
      "Nombre Cliente":    v.clienteNombre ?? "",
      "Teléfono":          v.clienteTelefono ?? "",
      "Email":             v.clienteEmail ?? "",
      "Observaciones":     v.observaciones ?? "",
      "Total Servicios":   v.servicios.length,
      "Total Gastado ARS": totalGastado,
      "Último Servicio":   ultimoServicio
        ? new Date(ultimoServicio.horaIngreso).toLocaleDateString("es-AR")
        : "",
      "Fecha Registro":    new Date(v.createdAt).toLocaleDateString("es-AR"),
    }
  })

  // ── Hoja 2: Historial de servicios ───────────────────────────────────────
  const wsHistorial: Record<string, unknown>[] = []
  for (const v of vehiculos) {
    for (const s of v.servicios) {
      const nombreServicio = s.items.length
        ? s.items.map((i) => i.nombre).join(" + ")
        : s.tipoServicio?.nombre ?? ""

      wsHistorial.push({
        "Placa":           v.placa,
        "Marca":           v.marca,
        "Cliente":         v.clienteNombre ?? "",
        "Teléfono":        v.clienteTelefono ?? "",
        "Servicio(s)":     nombreServicio,
        "Operario":        s.operario?.user.name ?? "",
        "Fecha":           new Date(s.horaIngreso).toLocaleDateString("es-AR"),
        "Hora Ingreso":    new Date(s.horaIngreso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        "Duración (min)":  s.duracionMinutos ?? "",
        "Método Pago":     s.metodoPago ?? "",
        "Total ARS":       s.total ?? 0,
        "Estado":          s.estado,
      })
    }
  }

  // ── Crear workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  const sheetVehiculos = XLSX.utils.json_to_sheet(wsVehiculos)
  // Ancho de columnas
  sheetVehiculos["!cols"] = [
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 6 }, { wch: 10 }, { wch: 12 },
    { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ]
  XLSX.utils.book_append_sheet(wb, sheetVehiculos, "Clientes y Vehículos")

  const sheetHistorial = XLSX.utils.json_to_sheet(wsHistorial)
  sheetHistorial["!cols"] = [
    { wch: 10 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 30 },
    { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, sheetHistorial, "Historial de Servicios")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const fecha = new Date().toLocaleDateString("es-AR").replace(/\//g, "-")

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="quickstop-clientes-${fecha}.xlsx"`,
    },
  })
}
