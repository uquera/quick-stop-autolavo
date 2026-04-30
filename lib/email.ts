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
  const wa = process.env.NEXT_PUBLIC_BRAND_WHATSAPP ?? "5493512138362"
  return `
    <tr>
      <td style="background:#0F172A;padding:20px 40px;text-align:center;">
        <p style="color:#38BDF8;font-size:13px;margin:0 0 4px;font-weight:600;">QuickStop Multiservicio</p>
        <p style="color:#64748b;font-size:11px;margin:0 0 10px;">Limpieza · Rapidez · Calidad</p>
        <a href="https://wa.me/${wa}" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;padding:7px 16px;border-radius:20px;">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Escribinos al WhatsApp
        </a>
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

// ── Correo 1: Bienvenida (solo primera visita del cliente) ───────────────────

export async function enviarEmailBienvenida(opts: {
  email: string
  clienteNombre: string
  placa: string
}) {
  const html = wrapHtml("Bienvenido a QuickStop", `
    <tr>
      <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🎉 Primera visita</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 24px;text-align:center;">
        <h2 style="color:#0F172A;font-size:22px;margin:0 0 12px;font-weight:800;">
          Hola${opts.clienteNombre ? `, ${opts.clienteNombre}` : ""}!
        </h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">
          Nos alegra tenerte como cliente. Registramos tu vehículo
          <strong style="color:#1E40AF;">${opts.placa}</strong> en nuestro sistema.
          A partir de ahora podremos atenderte más rápido en cada visita.
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

// ── Correo 2: Servicio iniciado (cuando el auto entra a Lavado Exterior) ──────

export async function enviarEmailServicioIniciado(opts: {
  email: string
  clienteNombre: string
  placa: string
  marca: string
  servicios: string[]
  operario: string
  total: number
  horaInicio: Date
}) {
  const serviciosHtml = opts.servicios
    .map(s => `<li style="margin:4px 0;color:#374151;">${s}</li>`)
    .join("")

  const horaTexto = opts.horaInicio.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })

  const html = wrapHtml("Tu vehículo está en servicio", `
    <tr>
      <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🚿 Servicio en proceso</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 16px;text-align:center;">
        <h2 style="color:#0F172A;font-size:22px;margin:0 0 8px;font-weight:800;">
          ¡Empezamos con tu vehículo!
        </h2>
        <p style="color:#374151;font-size:15px;margin:0;">
          Hola${opts.clienteNombre ? ` <strong>${opts.clienteNombre}</strong>` : ""}!
          Tu <strong>${opts.marca}</strong> con placa <strong style="color:#1E40AF;">${opts.placa}</strong>
          acaba de ingresar a la línea de lavado.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr style="background:#f0f9ff;">
            <td style="padding:12px 16px;font-size:13px;color:#1d4ed8;font-weight:600;border-bottom:1px solid #e5e7eb;">
              DETALLE DEL SERVICIO
            </td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Servicios:</strong></p>
              <ul style="margin:0 0 12px;padding-left:20px;">${serviciosHtml}</ul>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;">
                <strong>Operario:</strong> ${opts.operario}
              </p>
              <p style="margin:0 0 6px;font-size:14px;color:#374151;">
                <strong>Hora de inicio:</strong> ${horaTexto}
              </p>
              <p style="margin:0;font-size:14px;color:#374151;">
                <strong>Total estimado:</strong>
                <span style="color:#1E40AF;font-weight:700;">$${opts.total.toLocaleString("es-AR")}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 12px;">
        <div style="background:#f0f9ff;border-radius:10px;padding:14px 16px;border-left:4px solid #38BDF8;text-align:center;">
          <p style="color:#1d4ed8;font-size:13px;margin:0;">
            ⏱ Estamos trabajando en tu vehículo. Te avisamos cuando esté listo.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <p style="color:#64748b;font-size:12px;margin:0;">
          Podés esperar en nuestras instalaciones o regresar cuando recibas el aviso de finalización.
        </p>
      </td>
    </tr>
  `)
  await enviar(
    opts.email,
    `🚿 Tu ${opts.marca} está en lavado ahora — QuickStop`,
    html
  )
}

// ── Correo 3: Servicio completado (cuando se registra el pago) ───────────────

export async function enviarEmailServicioCompletado(opts: {
  email: string
  clienteNombre: string
  placa: string
  marca?: string
  servicios: string[]
  duracionMinutos: number | null
  total: number
  metodoPago: string | null
}) {
  const metodoLabel: Record<string, string> = {
    EFECTIVO:      "Efectivo",
    TRANSFERENCIA: "Transferencia bancaria",
    TARJETA:       "Tarjeta débito/crédito",
    MERCADOPAGO:   "MercadoPago",
    BILLETERA:     "Billetera digital",
  }
  const metodoPagoTexto = opts.metodoPago
    ? (metodoLabel[opts.metodoPago] ?? opts.metodoPago)
    : "—"
  const duracionTexto  = opts.duracionMinutos ? `${opts.duracionMinutos} min` : "—"
  const serviciosHtml  = opts.servicios.map(s => `<li style="margin:4px 0;color:#374151;">${s}</li>`).join("")
  const marcaTexto     = opts.marca ? `tu <strong>${opts.marca}</strong> con placa` : "la placa"

  const html = wrapHtml("Tu vehículo está listo", `
    <tr>
      <td style="background:linear-gradient(135deg,#065f46,#10b981);padding:10px 40px;text-align:center;">
        <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">✅ Servicio completado</span>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px 16px;text-align:center;">
        <div style="width:64px;height:64px;background:#d1fae5;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:32px;">🏁</span>
        </div>
        <h2 style="color:#0F172A;font-size:22px;margin:0 0 8px;font-weight:800;">
          ¡Listo para retirar!
        </h2>
        <p style="color:#374151;font-size:15px;margin:0;">
          Hola${opts.clienteNombre ? ` <strong>${opts.clienteNombre}</strong>` : ""}!
          ${marcaTexto} <strong style="color:#065f46;">${opts.placa}</strong> ya está listo.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
          <tr style="background:#f0fdf4;">
            <td style="padding:12px 16px;font-size:13px;color:#166534;font-weight:600;border-bottom:1px solid #e5e7eb;">
              RESUMEN DEL SERVICIO
            </td>
          </tr>
          <tr>
            <td style="padding:16px;">
              <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Servicios realizados:</strong></p>
              <ul style="margin:0 0 14px;padding-left:20px;">${serviciosHtml}</ul>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;"><strong>Duración total:</strong></td>
                  <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">${duracionTexto}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;font-size:14px;color:#374151;"><strong>Método de pago:</strong></td>
                  <td style="padding:6px 0;font-size:14px;color:#374151;text-align:right;">${metodoPagoTexto}</td>
                </tr>
                <tr style="border-top:2px solid #d1fae5;">
                  <td style="padding:10px 0 0;font-size:16px;color:#065f46;font-weight:700;"><strong>Total cobrado:</strong></td>
                  <td style="padding:10px 0 0;font-size:18px;color:#065f46;font-weight:900;text-align:right;">
                    $${opts.total.toLocaleString("es-AR")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px;text-align:center;">
        <p style="color:#374151;font-size:14px;margin:0 0 8px;font-weight:600;">
          ¡Gracias por confiar en QuickStop! 🚗✨
        </p>
        <p style="color:#64748b;font-size:12px;margin:0;">
          Esperamos verte pronto. Recordá que tu historial de servicios está siempre disponible.
        </p>
      </td>
    </tr>
  `)
  await enviar(
    opts.email,
    `✅ ${opts.placa} listo para retirar — QuickStop`,
    html
  )
}

// ── Correo 4: Promoción masiva ───────────────────────────────────────────────

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

  const html = `<!DOCTYPE html>
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
        <tr>
          <td style="background:linear-gradient(135deg,#0F172A,#1E3A8A);padding:32px 40px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;">QuickStop</h1>
            <p style="color:#38BDF8;margin:4px 0 0;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Multiservicio</p>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#1E40AF,#38BDF8);padding:12px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">🚗 Promoción Especial</span>
          </td>
        </tr>
        ${opts.imagenNombre ? `
        <tr>
          <td style="padding:0;text-align:center;background:#f8fafc;">
            <img src="cid:promo_image" alt="${opts.nombrePromocion}"
              style="width:100%;max-height:320px;object-fit:cover;display:block;" />
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:32px 40px 16px;text-align:center;">
            <h2 style="color:#0F172A;font-size:26px;margin:0 0 8px;font-weight:800;">${opts.nombrePromocion}</h2>
            <p style="color:#64748b;font-size:15px;margin:0;">${opts.descripcionPromocion}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 24px;text-align:center;">
            <div style="display:inline-block;background:linear-gradient(135deg,#1E40AF,#38BDF8);border-radius:12px;padding:20px 40px;">
              <p style="color:#ffffff;margin:0;font-size:13px;opacity:0.85;text-transform:uppercase;letter-spacing:1px;">Descuento especial</p>
              <p style="color:#ffffff;margin:4px 0 0;font-size:42px;font-weight:900;line-height:1;">${opts.valorDescuento}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 24px;">
            <div style="background:#f8fafc;border-radius:10px;padding:20px;border-left:4px solid #38BDF8;">
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0;">${opts.mensaje.replace(/\n/g, "<br>")}</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 32px;text-align:center;">
            <p style="color:#64748b;font-size:13px;margin:0;">📅 <strong>Válido:</strong> ${opts.vigencia}</p>
          </td>
        </tr>
        <tr>
          <td style="background:#0F172A;padding:24px 40px;text-align:center;">
            <p style="color:#38BDF8;font-size:13px;margin:0 0 4px;font-weight:600;">QuickStop Multiservicio</p>
            <p style="color:#64748b;font-size:11px;margin:0;">Limpieza · Rapidez · Calidad</p>
            <p style="color:#374151;font-size:10px;margin:12px 0 0;">Este correo fue enviado porque eres cliente de QuickStop.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

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
