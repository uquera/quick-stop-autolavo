const TZ = process.env.NEXT_PUBLIC_TIMEZONE ?? "America/Argentina/Cordoba"

function getUTCOffsetMs(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => {
    const v = parseInt(parts.find((p) => p.type === type)!.value)
    return type === "hour" && v === 24 ? 0 : v
  }
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  return asUTC - date.getTime()
}

export function getHoyRange(tz: string = TZ): { inicio: Date; fin: Date } {
  const now = new Date()
  const offsetMs = getUTCOffsetMs(now, tz)
  const nowInTZ = new Date(now.getTime() + offsetMs)
  const y = nowInTZ.getUTCFullYear()
  const m = nowInTZ.getUTCMonth()
  const d = nowInTZ.getUTCDate()
  return {
    inicio: new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - offsetMs),
    fin:    new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - offsetMs),
  }
}

export function getMesRange(tz: string = TZ): { inicio: Date } {
  const now = new Date()
  const offsetMs = getUTCOffsetMs(now, tz)
  const nowInTZ = new Date(now.getTime() + offsetMs)
  return {
    inicio: new Date(Date.UTC(nowInTZ.getUTCFullYear(), nowInTZ.getUTCMonth(), 1, 0, 0, 0, 0) - offsetMs),
  }
}

export function formatFechaEnTZ(date: Date, tz: string = TZ): string {
  return date.toLocaleDateString("en-CA", { timeZone: tz })
}
