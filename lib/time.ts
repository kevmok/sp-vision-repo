// Fixed demo clock so server and client render the same values.
// All timestamps are treated as wall-clock UTC and formatted with UTC getters.
export const NOW = Date.UTC(2026, 10, 1, 15, 20) // Sun Nov 1 2026, 3:20 PM

export const MIN = 60_000
export const HOUR = 60 * MIN
export const DAY = 24 * HOUR

export const at = (month: number, day: number, h: number, m = 0) =>
  Date.UTC(2026, month - 1, day, h, m)

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function fmtTime(ms: number) {
  const d = new Date(ms)
  let h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  h = h % 12 || 12
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`
}

export function fmtDate(ms: number) {
  const d = new Date(ms)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function fmtDay(ms: number) {
  const d = new Date(ms)
  return `${WEEKDAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function dayKey(ms: number) {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export function fmtDuration(ms: number) {
  const abs = Math.abs(ms)
  const mins = Math.round(abs / MIN)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d}d ${rh}h` : `${d}d`
}

export function fmtAgo(ms: number, now = NOW) {
  const diff = now - ms
  if (diff < MIN) return "now"
  if (diff < DAY) return `${fmtDuration(diff)} ago`
  const days = Math.floor(diff / DAY)
  if (days === 1) return "yesterday"
  return `${days}d ago`
}

export function fmtStamp(ms: number, now = NOW) {
  return dayKey(ms) === dayKey(now) ? fmtTime(ms) : `${fmtDate(ms)}, ${fmtTime(ms)}`
}
