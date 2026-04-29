import { jsPDF } from "jspdf"

type ReporteData = {
  totalVehiculos: number
  totalCompletados: number
  totalIngresos: number
  duracionPromedio: number
  porMetodo: Record<string, number>
  porTipo: { nombre: string; cantidad: number; ingresos: number; duracionPromedio: number }[]
  porHora: Record<number, number>
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia Bancaria",
  TARJETA: "Datafono / Tarjeta",
  MERCADOPAGO: "Mercado Pago",
  BILLETERA: "Billetera",
  SIN_REGISTRAR: "Sin registrar",
}

function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", minimumFractionDigits: 0,
  }).format(n)
}

function labelFecha(desde: string, hasta: string) {
  if (desde === hasta) {
    const d = new Date(desde + "T00:00:00")
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }
  const d1 = new Date(desde + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
  const d2 = new Date(hasta + "T00:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
  return `${d1} al ${d2}`
}

export async function generarReportePDF(data: ReporteData, desde: string, hasta: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()

  // ── Paleta de colores ──────────────────────────────────────────────────────
  const AZUL   = [30, 64, 175]   as [number, number, number]  // #1E40AF
  const CIAN   = [56, 189, 248]  as [number, number, number]  // #38BDF8
  const NEGRO  = [15, 23, 42]    as [number, number, number]  // #0F172A
  const GRIS   = [107, 114, 128] as [number, number, number]
  const GRIS_L = [249, 250, 251] as [number, number, number]

  // ── Header con gradiente ───────────────────────────────────────────────────
  doc.setFillColor(...NEGRO)
  doc.rect(0, 0, W, 42, "F")

  // Intentar cargar logo desde /logo.jpeg vía fetch
  try {
    const resp = await fetch("/logo.jpeg")
    const blob = await resp.blob()
    const b64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
    doc.addImage(b64, "JPEG", 10, 5, 30, 30)
  } catch {
    // Si no carga el logo, dibuja un placeholder
    doc.setFillColor(...AZUL)
    doc.roundedRect(10, 7, 28, 28, 4, 4, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("QS", 24, 25, { align: "center" })
  }

  // Nombre empresa
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("QuickStop Multiservicio", 46, 16)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(...CIAN)
  doc.text("Auto Lavado · Limpieza · Rapidez · Calidad", 46, 23)

  // Título del reporte
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("REPORTE DE GESTIÓN", 46, 32)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(labelFecha(desde, hasta).toUpperCase(), 46, 38)

  // Fecha de generación (esquina derecha)
  doc.setFontSize(7)
  doc.setTextColor(...CIAN)
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, W - 10, 38, { align: "right" })

  let y = 52

  // ── Sección: KPIs ─────────────────────────────────────────────────────────
  const kpis = [
    { label: "Vehículos atendidos", value: String(data.totalVehiculos) },
    { label: "Servicios completados", value: String(data.totalCompletados) },
    { label: "Ingresos totales", value: formatARS(data.totalIngresos) },
    { label: "Tiempo promedio", value: `${data.duracionPromedio} min` },
  ]

  const kpiW = (W - 20) / 4
  kpis.forEach((k, i) => {
    const x = 10 + i * kpiW
    doc.setFillColor(...GRIS_L)
    doc.roundedRect(x, y, kpiW - 2, 22, 2, 2, "F")
    doc.setDrawColor(...AZUL)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, y, kpiW - 2, 22, 2, 2, "S")

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...AZUL)
    const cx = x + (kpiW - 2) / 2
    doc.text(k.value, cx, y + 11, { align: "center" })

    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(...GRIS)
    doc.text(k.label, cx, y + 18, { align: "center" })
  })

  y += 30

  // ── Sección: Ingresos por método de pago ──────────────────────────────────
  const metodos = Object.entries(data.porMetodo).sort((a, b) => b[1] - a[1])
  if (metodos.length > 0) {
    // Título
    doc.setFillColor(...AZUL)
    doc.rect(10, y, W - 20, 7, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("INGRESOS POR MÉTODO DE PAGO", 14, y + 5)
    y += 11

    metodos.forEach(([metodo, total], idx) => {
      const bg = idx % 2 === 0 ? GRIS_L : [255, 255, 255] as [number, number, number]
      doc.setFillColor(...bg)
      doc.rect(10, y, W - 20, 8, "F")

      const label = METODO_LABEL[metodo] ?? metodo
      const pct = data.totalIngresos > 0 ? Math.round((total / data.totalIngresos) * 100) : 0

      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...NEGRO)
      doc.text(label, 14, y + 5.5)

      // Barra de progreso
      const barX = 80, barW = 80
      doc.setFillColor(229, 231, 235)
      doc.roundedRect(barX, y + 2, barW, 4, 1, 1, "F")
      if (pct > 0) {
        doc.setFillColor(...AZUL)
        doc.roundedRect(barX, y + 2, Math.max(barW * pct / 100, 2), 4, 1, 1, "F")
      }

      doc.setFont("helvetica", "bold")
      doc.text(formatARS(total), W - 12, y + 5.5, { align: "right" })
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...GRIS)
      doc.setFontSize(7)
      doc.text(`${pct}%`, barX + barW + 2, y + 5.5)

      y += 8
    })

    // Total
    doc.setFillColor(...AZUL)
    doc.rect(10, y, W - 20, 9, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL", 14, y + 6)
    doc.text(formatARS(data.totalIngresos), W - 12, y + 6, { align: "right" })
    y += 14
  }

  // ── Sección: Servicios por tipo ───────────────────────────────────────────
  if (data.porTipo.length > 0) {
    doc.setFillColor(...AZUL)
    doc.rect(10, y, W - 20, 7, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("DETALLE POR TIPO DE SERVICIO", 14, y + 5)
    y += 11

    // Encabezados de tabla
    doc.setFillColor(219, 234, 254) // blue-100
    doc.rect(10, y, W - 20, 7, "F")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...AZUL)
    doc.text("Servicio", 14, y + 5)
    doc.text("Cant.", 110, y + 5, { align: "center" })
    doc.text("T.Prom.", 135, y + 5, { align: "center" })
    doc.text("Ingresos", W - 12, y + 5, { align: "right" })
    y += 7

    data.porTipo.forEach((t, idx) => {
      const bg = idx % 2 === 0 ? GRIS_L : [255, 255, 255] as [number, number, number]
      doc.setFillColor(...bg)
      doc.rect(10, y, W - 20, 8, "F")

      doc.setFontSize(8.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...NEGRO)
      doc.text(t.nombre, 14, y + 5.5)
      doc.text(String(t.cantidad), 110, y + 5.5, { align: "center" })
      doc.text(`${t.duracionPromedio}min`, 135, y + 5.5, { align: "center" })
      doc.setFont("helvetica", "bold")
      doc.text(formatARS(t.ingresos), W - 12, y + 5.5, { align: "right" })

      y += 8
    })
    y += 6
  }

  // ── Sección: Flujo por hora ───────────────────────────────────────────────
  const horasConDatos = Object.entries(data.porHora).filter(([, v]) => v > 0)
  if (horasConDatos.length > 0) {
    if (y > 230) { doc.addPage(); y = 20 }

    doc.setFillColor(...AZUL)
    doc.rect(10, y, W - 20, 7, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("FLUJO DE VEHÍCULOS POR HORA", 14, y + 5)
    y += 11

    const horas = Array.from({ length: 12 }, (_, i) => i + 7)
    const maxVal = Math.max(...Object.values(data.porHora), 1)
    const colW = (W - 20) / horas.length
    const barMaxH = 25

    horas.forEach((h, i) => {
      const cant = data.porHora[h] ?? 0
      const barH = cant > 0 ? Math.max((cant / maxVal) * barMaxH, 2) : 0
      const x = 10 + i * colW

      if (cant > 0) {
        doc.setFillColor(...AZUL)
        doc.roundedRect(x + 1, y + barMaxH - barH, colW - 2, barH, 1, 1, "F")
        doc.setFontSize(7)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(...AZUL)
        doc.text(String(cant), x + colW / 2, y + barMaxH - barH - 1, { align: "center" })
      }

      doc.setFontSize(6.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...GRIS)
      doc.text(`${h}h`, x + colW / 2, y + barMaxH + 5, { align: "center" })
    })

    y += barMaxH + 10
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFillColor(...NEGRO)
  doc.rect(0, pageH - 14, W, 14, "F")
  doc.setTextColor(...CIAN)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text("QuickStop Multiservicio · Sistema de Gestión · Reporte generado automáticamente", W / 2, pageH - 5, { align: "center" })

  // Descargar
  const nombreArchivo = desde === hasta
    ? `reporte-quickstop-${desde}.pdf`
    : `reporte-quickstop-${desde}-al-${hasta}.pdf`
  doc.save(nombreArchivo)
}
