import nodemailer from "nodemailer"

type Attachment = {
  filename?: string
  content?: Buffer
  contentType?: string
  cid?: string
}

function crearTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

function headerHtml() {
  return `
    <tr>
      <td style="background:linear-gradient(135deg,#0F172A,#1E3A8A);padding:28px 40px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px;">QuickStop</h1>
        <p style="color:#38BDF8;margin:4px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Multiservicio</p>
      </td>
    </tr>`
}

function footerHtml() {
  return `
    <tr>
      <td style="background:#0F172A;padding:20px 40px;text-align:center;">
        <p style="color:#38BDF8;font-size:13px;margin:0 0 4px;font-weight:600;">QuickStop Multiservicio</p>
        <p style="color:#64748b;font-size:11px;margin:0;">Limpieza · Rapidez · Calidad</p>
      </td>
    </tr>`
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        ${headerHtml()}
        ${body}
        ${footerHtml()}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function enviar(to: string, subject: string, html: string) {
  const transporter = crearTransporter()
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"QuickStop Multiservicio" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

// ── Correo 1: Bienvenida (primer ingreso del cliente) ────────────────────────

export async function enviarEmailBienvenida(opts: {
  email: string
  clienteNombre: string
  placa: string
}) {
  const html = wrapHtml("Bienvenido a QuickStop", `
    <tr>
      <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🎉 Bienvenido</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 24px;text-align:center;">
        <h2 style="color:#0F172A;font-size:22px;margin:0 0 12px;font-weight:800;">
          Hola${opts.clienteNombre ? `, ${opts.clienteNombre}` : ""}!
        </h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Nos alegra tenerte como cliente. Registramos tu vehículo con placa
          <strong style="color:#1E40AF;">${opts.placa}</strong> en nuestro sistema.
          A partir de ahora podremos atenderte más rápido cada vez que nos visites.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <div style="background:#f0f9ff;border-radius:10px;padding:16px;border:1px solid #bae6fd;">
          <p style="color:#0369a1;font-size:14px;margin:0;">
            🚗 En QuickStop te ofrecemos lavado de calidad, rapidez y atención personalizada.
          </p>
        </div>
      </td>
    </tr>
  `)
  await enviar(opts.email, "Bienvenido a QuickStop Multiservicio 🚗", html)
}

// ── Correo 2: Confirmación de servicio ───────────────────────────────────────

export async function enviarEmailConfirmacion(opts: {
  email: string
  clienteNombre: string
  placa: string
  servicios: string[]
  bahia: string
  operario: string
  total: number
}) {
  const serviciosHtml = opts.servicios
    .map(s => `<li style="margin:4px 0;color:#374151;">${s}</li>`)
    .join("")

  const html = wrapHtml("Confirmación de servicio", `
    <tr>
      <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">✅ Servicio Registrado</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 16px;">
        <p style="color:#374151;font-size:15px;margin:0 0 20px;">
          Hola${opts.clienteNombre ? ` <strong>${opts.clienteNombre}</strong>` : ""}! Tu vehículo
          <strong style="color:#1E40AF;">${opts.placa}</strong> ya está en nuestras instalaciones.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr style="background:#f8fafc;">
            <td style="padding:12px 16px;font-size:13px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">DETALLE DEL SERVICIO</td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Servicios:</strong></p>
              <ul style="margin:0 0 12px;padding-left:20px;">${serviciosHtml}</ul>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Bahía:</strong> ${opts.bahia}</p>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Operario:</strong> ${opts.operario}</p>
              <p style="margin:0;font-size:14px;color:#374151;"><strong>Total estimado:</strong>
                <span style="color:#1E40AF;font-weight:700;">$${opts.total.toLocaleString("es-CO")} COP</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <p style="color:#64748b;font-size:13px;margin:0;">Te avisaremos cuando tu vehículo esté listo. 🚿</p>
      </td>
    </tr>
  `)
  await enviar(opts.email, `Tu vehículo ${opts.placa} está en servicio — QuickStop`, html)
}

// ── Correo 3: Servicio completado ────────────────────────────────────────────

export async function enviarEmailServicioCompletado(opts: {
  email: string
  clienteNombre: string
  placa: string
  servicios: string[]
  duracionMinutos: number | null
  total: number
  metodoPago: string | null
}) {
  const metodoLabel: Record<string, string> = {
    EFECTIVO: "Efectivo",
    TRANSFERENCIA: "Transferencia",
    TARJETA: "Tarjeta débito/crédito",
  }
  const metodoPagoTexto = opts.metodoPago ? metodoLabel[opts.metodoPago] ?? opts.metodoPago : "Por definir"
  const duracionTexto = opts.duracionMinutos ? `${opts.duracionMinutos} min` : "—"
  const serviciosHtml = opts.servicios.map(s => `<li style="margin:4px 0;color:#374151;">${s}</li>`).join("")

  const html = wrapHtml("Tu vehículo está listo", `
    <tr>
      <td style="background:linear-gradient(135deg,#065f46,#10b981);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🏁 Servicio Completado</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 16px;text-align:center;">
        <h2 style="color:#0F172A;font-size:22px;margin:0 0 8px;font-weight:800;">
          ¡Tu vehículo está listo!
        </h2>
        <p style="color:#374151;font-size:15px;margin:0;">
          Hola${opts.clienteNombre ? ` <strong>${opts.clienteNombre}</strong>` : ""}!
          El servicio para la placa <strong style="color:#065f46;">${opts.placa}</strong> ha finalizado.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr style="background:#f0fdf4;">
            <td style="padding:12px 16px;font-size:13px;color:#166534;font-weight:600;border-bottom:1px solid #e5e7eb;">RESUMEN</td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Servicios realizados:</strong></p>
              <ul style="margin:0 0 12px;padding-left:20px;">${serviciosHtml}</ul>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Duración:</strong> ${duracionTexto}</p>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;"><strong>Método de pago:</strong> ${metodoPagoTexto}</p>
              <p style="margin:0;font-size:16px;color:#065f46;font-weight:700;"><strong>Total cobrado:</strong> $${opts.total.toLocaleString("es-CO")} COP</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <p style="color:#64748b;font-size:13px;margin:0;">Gracias por confiar en QuickStop. ¡Vuelve pronto! 🚗✨</p>
      </td>
    </tr>
  `)
  await enviar(opts.email, `✅ Tu vehículo ${opts.placa} está listo — QuickStop`, html)
}

export interface OpcionesEmailPromocion {
  asunto: string
  mensaje: string
  nombrePromocion: string
  descripcionPromocion: string
  valorDescuento: string
  vigencia: string
  destinatarios: string[]
  imagenBuffer?: Buffer
  imagenNombre?: string
  imagenMime?: string
}

export async function enviarEmailPromocion(opts: OpcionesEmailPromocion) {
  const transporter = crearTransporter()

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.asunto}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A,#1E3A8A);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;">QuickStop</h1>
            <p style="color:#38BDF8;margin:4px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Multiservicio</p>
          </td>
        </tr>

        <!-- Etiqueta PROMOCIÓN -->
        <tr>
          <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:12px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🚗 Promoción Especial</span>
          </td>
        </tr>

        <!-- Imagen si existe -->
        ${opts.imagenNombre ? `
        <tr>
          <td style="padding:0;text-align:center;background:#f8fafc;">
            <img src="cid:promo_image" alt="${opts.nombrePromocion}"
              style="width:100%;max-height:320px;object-fit:cover;display:block;" />
          </td>
        </tr>` : ""}

        <!-- Nombre de la promo -->
        <tr>
          <td style="padding:32px 40px 16px;text-align:center;">
            <h2 style="color:#0F172A;font-size:26px;margin:0 0 8px;font-weight:800;">${opts.nombrePromocion}</h2>
            <p style="color:#64748b;font-size:15px;margin:0;">${opts.descripcionPromocion}</p>
          </td>
        </tr>

        <!-- Descuento destacado -->
        <tr>
          <td style="padding:8px 40px 24px;text-align:center;">
            <div style="display:inline-block;background:linear-gradient(135deg,#1E40AF,#38BDF8);border-radius:12px;padding:20px 40px;">
              <p style="color:#ffffff;margin:0;font-size:13px;opacity:0.85;text-transform:uppercase;letter-spacing:1px;">Descuento especial</p>
              <p style="color:#ffffff;margin:4px 0 0;font-size:42px;font-weight:900;line-height:1;">${opts.valorDescuento}</p>
            </div>
          </td>
        </tr>

        <!-- Mensaje personalizado -->
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#f8fafc;border-radius:10px;padding:20px;border-left:4px solid #38BDF8;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${opts.mensaje.replace(/\n/g, "<br>")}</p>
            </div>
          </td>
        </tr>

        <!-- Vigencia -->
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="color:#64748b;font-size:13px;margin:0;">
              📅 <strong>Válido:</strong> ${opts.vigencia}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0F172A;padding:24px 40px;text-align:center;">
            <p style="color:#38BDF8;font-size:13px;margin:0 0 4px;font-weight:600;">QuickStop Multiservicio</p>
            <p style="color:#64748b;font-size:11px;margin:0;">Limpieza · Rapidez · Calidad</p>
            <p style="color:#374151;font-size:10px;margin:12px 0 0;">Este correo fue enviado porque eres cliente de QuickStop. Si no deseas recibir más promociones, contáctanos.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()

  const attachments: Attachment[] = []
  if (opts.imagenBuffer && opts.imagenNombre) {
    attachments.push({
      filename: opts.imagenNombre,
      content: opts.imagenBuffer,
      contentType: opts.imagenMime || "image/jpeg",
      cid: "promo_image",
    })
  }

  const resultados: { email: string; ok: boolean; error?: string }[] = []

  for (const destinatario of opts.destinatarios) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"QuickStop Multiservicio" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: opts.asunto,
        html,
        attachments,
      })
      resultados.push({ email: destinatario, ok: true })
    } catch (err) {
      resultados.push({ email: destinatario, ok: false, error: String(err) })
    }
  }

  return resultados
}
