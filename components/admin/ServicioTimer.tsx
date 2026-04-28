"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

interface Props {
  horaInicio: string | null
  horaIngreso: string
  duracionEstimada: number
  estado: string
  duracionFinal: number | null
}

function formatMs(ms: number) {
  const totalSeg = Math.floor(ms / 1000)
  const min = Math.floor(totalSeg / 60)
  const seg = totalSeg % 60
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`
}

export default function ServicioTimer({ horaInicio, horaIngreso, duracionEstimada, estado, duracionFinal }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (estado === "COMPLETADO" || estado === "CANCELADO") return

    const ref = estado === "EN_PROCESO" ? horaInicio : horaIngreso
    if (!ref) return

    const refTime = new Date(ref).getTime()
    const tick = () => setElapsed(Date.now() - refTime)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [estado, horaInicio, horaIngreso])

  if (estado === "COMPLETADO") {
    const mins = duracionFinal ?? 0
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock className="w-3 h-3" />
        {mins}min
      </span>
    )
  }

  if (estado === "CANCELADO") {
    return <span className="text-xs text-gray-400">Cancelado</span>
  }

  const elapsedMin = elapsed / 60000
  const pct = estado === "EN_PROCESO" && duracionEstimada > 0
    ? (elapsedMin / duracionEstimada) * 100
    : 0

  const colorClass =
    estado === "EN_ESPERA"
      ? "text-amber-600 bg-amber-50"
      : pct >= 100
      ? "text-red-600 bg-red-50 animate-pulse"
      : pct >= 85
      ? "text-orange-600 bg-orange-50"
      : pct >= 50
      ? "text-yellow-600 bg-yellow-50"
      : "text-emerald-600 bg-emerald-50"

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
      <Clock className="w-3 h-3" />
      {formatMs(elapsed)}
    </span>
  )
}
