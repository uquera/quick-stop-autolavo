# QuickStop Multiservicio — Sistema de Gestión

> Auto lavado ubicado en Colombia · 3–5 bahías · 20–30 vehículos diarios

## Stack
- Framework: Next.js 16 App Router + React 19 + TypeScript
- Estilos: Tailwind CSS 4 + shadcn/ui
- Auth: NextAuth v5 (JWT) — roles: ADMIN / OPERARIO
- BD: Prisma ORM + SQLite (better-sqlite3) — `npx prisma db push` (NO migrate)
- Emails: Nodemailer (Gmail SMTP)
- NO usa Supabase · NO usa Vercel · NO usa Polar

## Credenciales demo
- Admin:    admin@quickstop.demo  / quick2024
- Operario: juan@quickstop.demo   / demo1234
- Operario: maria@quickstop.demo  / demo1234
- Operario: carlos@quickstop.demo / demo1234

## Branding
- Nombre: QuickStop Multiservicio
- Color primario: #1E40AF (azul cobalto)
- Color acento:   #38BDF8 (cian)
- Logo: public/logo.jpeg
- Variables en .env → NEXT_PUBLIC_BRAND_*

## Comandos
- `npm run dev`  — desarrollo (puerto 3010)
- `npm run seed` — poblar BD demo
- `npx prisma db push` — sincronizar schema

## Tipos de servicio configurados (seed)
| Servicio            | Precio COP | Duración |
|---------------------|-----------|----------|
| Lavado Básico       | $15.000   | 20 min   |
| Lavado Completo     | $25.000   | 40 min   |
| Detailing / Full    | $80.000   | 120 min  |
| Lavado de Motos     | $10.000   | 15 min   |
| Lavado de Chasis    | $20.000   | 30 min   |
| Lavado de Tapicería | $50.000   | 90 min   |

## Módulos principales
- `/admin/servicios`      — Cola Kanban con cronómetro en tiempo real por bahía
- `/admin/vehiculos`      — Historial y trazabilidad por placa
- `/admin/reportes`       — Estadísticas de ingresos y servicios
- `/admin/caja`           — Cierre de caja diario
- `/admin/operarios`      — Gestión del equipo
- `/admin/bahias`         — Estaciones de lavado
- `/admin/tipos-servicio` — Catálogo y precios
- `/admin/promociones`    — Descuentos y ofertas
- `/operario`             — Panel del operario (cola + registro)

## Cronómetro de servicio
- EN_ESPERA: cuenta tiempo desde horaIngreso (fondo amarillo)
- EN_PROCESO: cuenta desde horaInicio (fondo verde, pulsa cada segundo)
- Alerta roja si supera la duración estimada del tipo de servicio
- Al completar: guarda duracionMinutos real (para estadísticas de tiempo promedio)

## Patrones clave
- Roles → src/middleware.ts
- API Routes → app/api/*
- Server Components por defecto en /admin
- Client Components ("use client") para tablas reactivas y formularios
- Polling de 10s en ColaServiciosBoard + timer local de 1s para cronómetro
