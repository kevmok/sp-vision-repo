export function money(n: number, opts: { cents?: boolean } = {}) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  })
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}

export function signedPct(n: number) {
  const v = Math.round(n * 100)
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

export function round1(n: number) {
  return Math.round(n * 10) / 10
}
