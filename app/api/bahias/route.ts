import { NextResponse } from "next/server"

// Bahías fue eliminado — la aplicación usa una línea única de lavado.
export async function GET() {
  return NextResponse.json([])
}

export async function POST() {
  return NextResponse.json({ error: "Módulo de Bahías no disponible" }, { status: 410 })
}
