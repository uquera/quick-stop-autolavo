import { redirect } from "next/navigation"

// Bahías fue reemplazado por la Línea de Lavado (pipeline único) y Bodega.
export default function BahiasPage() {
  redirect("/admin/bodega")
}
