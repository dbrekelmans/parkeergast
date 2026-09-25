// Parkeren Delft works in Dutch local time, wherever this code runs.
export const TZ = 'Europe/Amsterdam'
export const MINUTE = 60_000

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const offsetFormat = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
const clockFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('nl-NL', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })

function localParts(d: Date) {
  const p = Object.fromEntries(partsFormat.formatToParts(d).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute }
}

function offsetMinutes(d: Date): number {
  const name = offsetFormat.formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? ''
  const m = name.match(/([+-])(\d{2}):(\d{2})/)
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
}

const pad = (n: number) => String(n).padStart(2, '0')

/** `2026-09-25T12:05:00.000+02:00`, the format the DVS API expects. */
export function toDvsIso(d: Date): string {
  const off = offsetMinutes(d)
  const local = new Date(d.getTime() + off * MINUTE).toISOString().slice(0, 23)
  const a = Math.abs(off)
  return `${local}${off < 0 ? '-' : '+'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`
}

/** The moment it is `h:min` in Delft on the same local day as `ref`, plus `addDays`. */
export function wallTime(ref: Date, h: number, min: number, addDays = 0): Date {
  const p = localParts(ref)
  const guess = Date.UTC(p.y, p.m - 1, p.d + addDays, h, min)
  return new Date(guess - offsetMinutes(new Date(guess)) * MINUTE)
}

export const floorMinute = (d: Date) => new Date(Math.floor(d.getTime() / MINUTE) * MINUTE)
export const ceilMinute = (d: Date) => new Date(Math.ceil(d.getTime() / MINUTE) * MINUTE)

export const clock = (d: Date) => clockFormat.format(d)

export function dayDiff(d: Date, ref: Date): number {
  const a = localParts(d)
  const b = localParts(ref)
  return Math.round((Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d)) / 86_400_000)
}

export function dayLabel(d: Date, ref: Date): string {
  const diff = dayDiff(d, ref)
  if (diff === 0) return 'vandaag'
  if (diff === 1) return 'morgen'
  if (diff === -1) return 'gisteren'
  return dayFormat.format(d)
}

/** "vandaag" is implied, so it's left out. */
export const dayLabelSuffix = (d: Date, ref: Date) => (dayDiff(d, ref) === 0 ? '' : ` ${dayLabel(d, ref)}`)

/** Minutes as "2 u 5 min", "2 u" or "45 min". */
export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (!h) return `${r} min`
  return r ? `${h} u ${r} min` : `${h} u`
}

export const euro = (amount: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
