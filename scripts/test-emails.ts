import "dotenv/config"
import { enviarEmailServicioIniciado, enviarEmailServicioCompletado } from "../lib/email"

const DEST = "uquera.uq@gmail.com"

async function main() {
  console.log("📧 Enviando correo 1: Servicio Iniciado...")
  await enviarEmailServicioIniciado({
    email:         DEST,
    clienteNombre: "Juan García",
    placa:         "ABC123",
    marca:         "Toyota Corolla",
    servicios:     ["Lavado Completo", "Lavado de Tapicería"],
    operario:      "Carlos Ramírez",
    total:         75000,
    horaInicio:    new Date(),
  })
  console.log("✅ Correo 1 enviado")

  console.log("📧 Enviando correo 2: Servicio Completado...")
  await enviarEmailServicioCompletado({
    email:           DEST,
    clienteNombre:   "Juan García",
    placa:           "ABC123",
    marca:           "Toyota Corolla",
    servicios:       ["Lavado Completo", "Lavado de Tapicería"],
    duracionMinutos: 47,
    total:           75000,
    metodoPago:      "MERCADOPAGO",
  })
  console.log("✅ Correo 2 enviado")
  console.log(`\n🎉 Ambos correos enviados a ${DEST}`)
}

main().catch(console.error)
