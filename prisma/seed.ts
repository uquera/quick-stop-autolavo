import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed QuickStop Multiservicio...")

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@quickstop.demo"
  const adminPass  = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "quick2024", 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: process.env.SEED_ADMIN_NAME || "Administrador", email: adminEmail, password: adminPass, role: "ADMIN" },
  })
  console.log("✅ Admin creado:", adminEmail)

  // ── Operarios ─────────────────────────────────────────────────────────────
  const operariosData = [
    { name: "Juan Pérez",      email: "juan@quickstop.demo" },
    { name: "María González",  email: "maria@quickstop.demo" },
    { name: "Carlos Ramírez",  email: "carlos@quickstop.demo" },
  ]

  const operarioIds: string[] = []
  for (const op of operariosData) {
    const pass = await bcrypt.hash("demo1234", 10)
    const user = await prisma.user.upsert({
      where: { email: op.email },
      update: {},
      create: { name: op.name, email: op.email, password: pass, role: "OPERARIO" },
    })
    const operario = await prisma.operario.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })
    operarioIds.push(operario.id)
  }
  console.log("✅ Operarios creados")

  // ── Bahías ────────────────────────────────────────────────────────────────
  const bahiasData = [
    { nombre: "Bahía 1", color: "#1E40AF" },
    { nombre: "Bahía 2", color: "#0891B2" },
    { nombre: "Bahía 3", color: "#059669" },
    { nombre: "Bahía 4", color: "#7C3AED" },
  ]
  const bahiaIds: string[] = []
  for (const b of bahiasData) {
    const bahia = await prisma.bahia.create({ data: b })
    bahiaIds.push(bahia.id)
  }
  console.log("✅ Bahías creadas")

  // ── Tipos de servicio ─────────────────────────────────────────────────────
  const tiposData = [
    { nombre: "Lavado Básico",        precio: 15000, duracionMinutos: 20 },
    { nombre: "Lavado Completo",      precio: 25000, duracionMinutos: 40 },
    { nombre: "Detailing / Full",     precio: 80000, duracionMinutos: 120 },
    { nombre: "Lavado de Motos",      precio: 10000, duracionMinutos: 15 },
    { nombre: "Lavado de Chasis",     precio: 20000, duracionMinutos: 30 },
    { nombre: "Lavado de Tapicería",  precio: 50000, duracionMinutos: 90 },
  ]
  const tipoIds: string[] = []
  for (const t of tiposData) {
    const tipo = await prisma.tipoServicio.create({ data: t })
    tipoIds.push(tipo.id)
  }
  console.log("✅ Tipos de servicio creados")

  // ── Vehículos de ejemplo ──────────────────────────────────────────────────
  const vehiculosData = [
    { placa: "ABC123", marca: "Toyota",  modelo: "Corolla",   anio: 2020, color: "Blanco",  tipo: "SEDAN"    as const, clienteNombre: "Pedro García",    clienteTelefono: "3001234567" },
    { placa: "DEF456", marca: "Mazda",   modelo: "CX-5",      anio: 2021, color: "Negro",   tipo: "SUV"      as const, clienteNombre: "Laura Martínez",   clienteTelefono: "3009876543" },
    { placa: "GHI789", marca: "Renault", modelo: "Logan",     anio: 2019, color: "Rojo",    tipo: "SEDAN"    as const, clienteNombre: "Andrés López",     clienteTelefono: "3101112233" },
    { placa: "JKL012", marca: "Yamaha",  modelo: "FZ 150",    anio: 2022, color: "Azul",    tipo: "MOTO"     as const, clienteNombre: "Sofía Herrera",    clienteTelefono: "3204455667" },
    { placa: "MNO345", marca: "Ford",    modelo: "Explorer",  anio: 2018, color: "Gris",    tipo: "SUV"      as const, clienteNombre: "Roberto Díaz",     clienteTelefono: "3157788990" },
    { placa: "PQR678", marca: "Chevrolet", modelo: "Spark",   anio: 2023, color: "Verde",   tipo: "SEDAN"    as const, clienteNombre: "Diana Torres",     clienteTelefono: "3112345678" },
    { placa: "STU901", marca: "Ram",     modelo: "700",       anio: 2020, color: "Blanco",  tipo: "CAMIONETA"as const, clienteNombre: "Carlos Jiménez",   clienteTelefono: "3001122334" },
  ]

  const vehiculoIds: string[] = []
  for (const v of vehiculosData) {
    const vh = await prisma.vehiculo.create({ data: v })
    vehiculoIds.push(vh.id)
  }
  console.log("✅ Vehículos creados")

  // ── Servicios de ejemplo (últimos 3 días) ─────────────────────────────────
  const now = new Date()
  const estados = ["COMPLETADO", "COMPLETADO", "COMPLETADO", "EN_PROCESO", "EN_ESPERA"] as const
  const metodos = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "NEQUI", "EFECTIVO"] as const

  for (let dia = 0; dia < 3; dia++) {
    const fechaDia = new Date(now)
    fechaDia.setDate(fechaDia.getDate() - dia)

    for (let i = 0; i < 7; i++) {
      const vh = vehiculoIds[i % vehiculoIds.length]
      const tipo = tipoIds[i % tipoIds.length]
      const operario = operarioIds[i % operarioIds.length]
      const bahia = bahiaIds[i % bahiaIds.length]
      const tipoServicio = tiposData[i % tiposData.length]

      const horaIngreso = new Date(fechaDia)
      horaIngreso.setHours(8 + i, i * 5, 0, 0)

      const horaInicio = dia === 0 && i >= 3 ? null : new Date(horaIngreso.getTime() + 5 * 60000)
      const horaSalida = dia === 0 && i >= 3 ? null : (horaInicio ? new Date(horaInicio.getTime() + tipoServicio.duracionMinutos * 60000) : null)
      const duracion = horaInicio && horaSalida
        ? Math.round((horaSalida.getTime() - horaInicio.getTime()) / 60000)
        : null

      const estado = dia === 0 ? estados[i % estados.length] : "COMPLETADO"
      const metodoPago = estado === "COMPLETADO" ? metodos[i % metodos.length] : null

      await prisma.servicio.create({
        data: {
          vehiculoId: vh,
          tipoServicioId: tipo,
          operarioId: operario,
          bahiaId: bahia,
          horaIngreso,
          horaInicio,
          horaSalida,
          duracionMinutos: duracion,
          estado,
          metodoPago,
          monto: tipoServicio.precio,
          total: tipoServicio.precio,
        },
      })
    }
  }
  console.log("✅ Servicios de ejemplo creados")

  // ── Licencia ──────────────────────────────────────────────────────────────
  const vencimiento = new Date()
  vencimiento.setFullYear(vencimiento.getFullYear() + 1)
  await prisma.licencia.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", plan: "PRO", fechaVencimiento: vencimiento },
  })

  console.log("\n🚀 Seed completado!")
  console.log("─────────────────────────────────")
  console.log("Admin:    admin@quickstop.demo / quick2024")
  console.log("Operario: juan@quickstop.demo  / demo1234")
  console.log("Operario: maria@quickstop.demo / demo1234")
  console.log("─────────────────────────────────")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
