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
  console.log("✅ Operarios creados (Juan=Exterior, María=Secado, Carlos=Interior)")

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

  // ── Materiales de bodega ──────────────────────────────────────────────────
  const materialesData = [
    { nombre: "Shampoo para autos",       unidad: "litros",   stockTotal: 20,  stockAlerta: 3  },
    { nombre: "Cera líquida",             unidad: "litros",   stockTotal: 10,  stockAlerta: 2  },
    { nombre: "Desengrasante",            unidad: "litros",   stockTotal: 15,  stockAlerta: 3  },
    { nombre: "Limpiador de vidrios",     unidad: "litros",   stockTotal: 8,   stockAlerta: 2  },
    { nombre: "Microfibra (paños)",       unidad: "unidades", stockTotal: 30,  stockAlerta: 5  },
    { nombre: "Esponja de lavado",        unidad: "unidades", stockTotal: 20,  stockAlerta: 5  },
    { nombre: "Ambientador interior",     unidad: "unidades", stockTotal: 50,  stockAlerta: 10 },
    { nombre: "Protector de llantas",     unidad: "litros",   stockTotal: 5,   stockAlerta: 1  },
    { nombre: "Limpiador de tapicería",   unidad: "litros",   stockTotal: 6,   stockAlerta: 1  },
  ]
  const materialIds: string[] = []
  for (const m of materialesData) {
    const mat = await prisma.material.create({ data: m })
    materialIds.push(mat.id)
    // Registrar entrada inicial de stock
    await prisma.movimientoMaterial.create({
      data: { materialId: mat.id, cantidad: m.stockTotal, tipo: "ENTRADA", nota: "Stock inicial (seed)" },
    })
  }
  console.log("✅ Materiales de bodega creados")

  // ── Asignar consumibles a tipos de servicio ────────────────────────────────
  // Lavado Básico (idx 0): shampoo + esponja
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[0], materialId: materialIds[0], cantidadPorServicio: 0.1 },  // shampoo 100ml
      { tipoServicioId: tipoIds[0], materialId: materialIds[5], cantidadPorServicio: 1 },    // esponja
    ],
  })
  // Lavado Completo (idx 1): shampoo + cera + microfibra + limpiador vidrios + ambientador
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[1], materialId: materialIds[0], cantidadPorServicio: 0.15 }, // shampoo 150ml
      { tipoServicioId: tipoIds[1], materialId: materialIds[1], cantidadPorServicio: 0.1  }, // cera 100ml
      { tipoServicioId: tipoIds[1], materialId: materialIds[4], cantidadPorServicio: 2    }, // 2 microfibras
      { tipoServicioId: tipoIds[1], materialId: materialIds[3], cantidadPorServicio: 0.1  }, // limpia vidrios
      { tipoServicioId: tipoIds[1], materialId: materialIds[6], cantidadPorServicio: 1    }, // ambientador
    ],
  })
  // Detailing Full (idx 2): todo
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[2], materialId: materialIds[0], cantidadPorServicio: 0.2  }, // shampoo
      { tipoServicioId: tipoIds[2], materialId: materialIds[1], cantidadPorServicio: 0.2  }, // cera
      { tipoServicioId: tipoIds[2], materialId: materialIds[2], cantidadPorServicio: 0.15 }, // desengrasante
      { tipoServicioId: tipoIds[2], materialId: materialIds[3], cantidadPorServicio: 0.2  }, // vidrios
      { tipoServicioId: tipoIds[2], materialId: materialIds[4], cantidadPorServicio: 4    }, // microfibras
      { tipoServicioId: tipoIds[2], materialId: materialIds[6], cantidadPorServicio: 1    }, // ambientador
      { tipoServicioId: tipoIds[2], materialId: materialIds[7], cantidadPorServicio: 0.1  }, // llantas
      { tipoServicioId: tipoIds[2], materialId: materialIds[8], cantidadPorServicio: 0.15 }, // tapicería
    ],
  })
  // Lavado Motos (idx 3): shampoo + esponja
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[3], materialId: materialIds[0], cantidadPorServicio: 0.05 },
      { tipoServicioId: tipoIds[3], materialId: materialIds[5], cantidadPorServicio: 1    },
    ],
  })
  // Lavado Chasis (idx 4): desengrasante + shampoo
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[4], materialId: materialIds[2], cantidadPorServicio: 0.2  }, // desengrasante
      { tipoServicioId: tipoIds[4], materialId: materialIds[0], cantidadPorServicio: 0.1  }, // shampoo
    ],
  })
  // Lavado Tapicería (idx 5): limpiador tapicería + microfibras
  await prisma.materialServicio.createMany({
    data: [
      { tipoServicioId: tipoIds[5], materialId: materialIds[8], cantidadPorServicio: 0.3  }, // limpiador tap.
      { tipoServicioId: tipoIds[5], materialId: materialIds[4], cantidadPorServicio: 3    }, // microfibras
    ],
  })
  console.log("✅ Consumibles asignados a tipos de servicio")

  // ── Vehículos de ejemplo ──────────────────────────────────────────────────
  const vehiculosData = [
    { placa: "ABC123", marca: "Toyota",    modelo: "Corolla",  anio: 2020, color: "Blanco",  tipo: "SEDAN"    as const, clienteNombre: "Pedro García",    clienteTelefono: "3001234567" },
    { placa: "DEF456", marca: "Mazda",     modelo: "CX-5",     anio: 2021, color: "Negro",   tipo: "SUV"      as const, clienteNombre: "Laura Martínez",  clienteTelefono: "3009876543" },
    { placa: "GHI789", marca: "Renault",   modelo: "Logan",    anio: 2019, color: "Rojo",    tipo: "SEDAN"    as const, clienteNombre: "Andrés López",    clienteTelefono: "3101112233" },
    { placa: "JKL012", marca: "Yamaha",    modelo: "FZ 150",   anio: 2022, color: "Azul",    tipo: "MOTO"     as const, clienteNombre: "Sofía Herrera",   clienteTelefono: "3204455667" },
    { placa: "MNO345", marca: "Ford",      modelo: "Explorer", anio: 2018, color: "Gris",    tipo: "SUV"      as const, clienteNombre: "Roberto Díaz",    clienteTelefono: "3157788990" },
    { placa: "PQR678", marca: "Chevrolet", modelo: "Spark",    anio: 2023, color: "Verde",   tipo: "SEDAN"    as const, clienteNombre: "Diana Torres",    clienteTelefono: "3112345678" },
    { placa: "STU901", marca: "Ram",       modelo: "700",      anio: 2020, color: "Blanco",  tipo: "CAMIONETA"as const, clienteNombre: "Carlos Jiménez", clienteTelefono: "3001122334" },
  ]

  const vehiculoIds: string[] = []
  for (const v of vehiculosData) {
    const vh = await prisma.vehiculo.create({ data: v })
    vehiculoIds.push(vh.id)
  }
  console.log("✅ Vehículos creados")

  // ── Servicios de ejemplo (últimos 3 días) ─────────────────────────────────
  const now = new Date()
  const estados = ["COMPLETADO", "COMPLETADO", "COMPLETADO", "POR_COBRAR", "EN_PROCESO"] as ("COMPLETADO" | "POR_COBRAR" | "EN_PROCESO" | "EN_ESPERA" | "CANCELADO")[]
  const etapas  = [null, null, null, null, "LAVADO"] as (null | "LAVADO" | "INTERIOR")[]
  const metodos = ["EFECTIVO", "TRANSFERENCIA", "TARJETA", "MERCADOPAGO", "EFECTIVO"] as const

  for (let dia = 0; dia < 3; dia++) {
    const fechaDia = new Date(now)
    fechaDia.setDate(fechaDia.getDate() - dia)

    for (let i = 0; i < 7; i++) {
      const vh = vehiculoIds[i % vehiculoIds.length]
      const tipo = tipoIds[i % tipoIds.length]
      const operario = operarioIds[i % operarioIds.length]
      const tipoServicio = tiposData[i % tiposData.length]

      const horaIngreso = new Date(fechaDia)
      horaIngreso.setHours(8 + i, i * 5, 0, 0)

      const esActivo = dia === 0 && i >= 4
      const horaInicio = esActivo ? (i === 4 ? new Date(horaIngreso.getTime() + 5 * 60000) : null) : new Date(horaIngreso.getTime() + 5 * 60000)
      const horaSalida = esActivo ? null : (horaInicio ? new Date(horaInicio.getTime() + tipoServicio.duracionMinutos * 60000) : null)
      const duracion = horaInicio && horaSalida
        ? Math.round((horaSalida.getTime() - horaInicio.getTime()) / 60000)
        : null

      const estado = dia === 0 ? estados[i % estados.length] : "COMPLETADO"
      const etapa  = dia === 0 ? etapas[i % etapas.length] : null
      const metodoPago = estado === "COMPLETADO" ? metodos[i % metodos.length] : null

      await prisma.servicio.create({
        data: {
          vehiculoId: vh,
          tipoServicioId: tipo,
          operarioId: operario,
          opLavado1Id:   estado !== "EN_ESPERA" ? operarioIds[0] : null,
          opInteriorId:  ["POR_COBRAR","COMPLETADO"].includes(estado) ? operarioIds[1] : null,
          opInterior2Id: ["POR_COBRAR","COMPLETADO"].includes(estado) ? operarioIds[2] : null,
          horaIngreso,
          horaInicio,
          horaSalida,
          duracionMinutos: duracion,
          estado,
          etapa,
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
  console.log("─────────────────────────────────────────────────")
  console.log("Admin:    admin@quickstop.demo / quick2024")
  console.log("Exterior: juan@quickstop.demo  / demo1234")
  console.log("Secado:   maria@quickstop.demo / demo1234")
  console.log("Interior: carlos@quickstop.demo / demo1234")
  console.log("─────────────────────────────────────────────────")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
