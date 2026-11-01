import { CHAINS, ORGS, chainOf, type Chain, type Machine, type Org } from "@/lib/data"
import { DAY, NOW } from "@/lib/time"

// ---------------------------------------------------------------------------
// Chart palette (validated with the dataviz palette checker: lightness band,
// chroma floor, CVD separation and normal-vision floor all pass on white).
// ---------------------------------------------------------------------------

export const SERIES = ["#b3631c", "#3f6fb0", "#2a9d8f", "#8e5aa8", "#c99a14", "#c25d7b"] as const
export const CHAIN_COLOR: Record<Chain, string> = Object.fromEntries(CHAINS.map((c, i) => [c, SERIES[i]!])) as Record<Chain, string>

// ---------------------------------------------------------------------------
// Products (internal unit values are only used to turn revenue into units;
// they are never displayed)
// ---------------------------------------------------------------------------

export type Category = "TCG packs" | "Squishies" | "Snacks" | "Drinks"
export const CATEGORIES: Category[] = ["TCG packs", "Squishies", "Snacks", "Drinks"]
export const CATEGORY_COLOR: Record<Category, string> = {
  "TCG packs": SERIES[0],
  Squishies: SERIES[1],
  Snacks: SERIES[2],
  Drinks: SERIES[3],
}

export type Product = { name: string; category: Category; weight: number; cogsRatio: number; unitValue: number }

export const PRODUCTS: Product[] = [
  { name: "Pokémon booster — Set A", category: "TCG packs", weight: 20, cogsRatio: 0.56, unitValue: 7.2 },
  { name: "Pokémon booster — Set B", category: "TCG packs", weight: 13, cogsRatio: 0.57, unitValue: 7.2 },
  { name: "One Piece booster", category: "TCG packs", weight: 11, cogsRatio: 0.58, unitValue: 7.8 },
  { name: "Pokémon mini tin", category: "TCG packs", weight: 6, cogsRatio: 0.52, unitValue: 14 },
  { name: "Mochi squishy", category: "Squishies", weight: 9, cogsRatio: 0.34, unitValue: 5 },
  { name: "Jumbo squishy", category: "Squishies", weight: 7, cogsRatio: 0.36, unitValue: 9 },
  { name: "Squishy keychain", category: "Squishies", weight: 5, cogsRatio: 0.3, unitValue: 4 },
  { name: "Hot chili chips", category: "Snacks", weight: 6, cogsRatio: 0.38, unitValue: 2.5 },
  { name: "Sour gummy belts", category: "Snacks", weight: 5, cogsRatio: 0.36, unitValue: 2.5 },
  { name: "Chocolate bar", category: "Snacks", weight: 4, cogsRatio: 0.4, unitValue: 2.25 },
  { name: "Sparkling water", category: "Drinks", weight: 4, cogsRatio: 0.28, unitValue: 2.5 },
  { name: "Iced tea", category: "Drinks", weight: 4, cogsRatio: 0.3, unitValue: 3 },
  { name: "Cola can", category: "Drinks", weight: 3, cogsRatio: 0.32, unitValue: 2 },
]

// ---------------------------------------------------------------------------
// Fleet time series
// ---------------------------------------------------------------------------

export const DAYS = 210 // history length; index DAYS-1 is today

export type FleetMachine = Machine & {
  org: Org
  chain: Chain
  deployedAgo: number
  hostShare: number
  rev: number[]
  mix: number[] // product revenue shares, same order as PRODUCTS
  restockDays: number[] // day indexes with a restock visit
  offlineFrom?: number
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function buildMachine(org: Org, m: Machine, orgIdx: number, i: number): FleetMachine {
  const r = rng(hash(m.id + org.id))
  const deployedAgo = m.addedFromVtmMs
    ? Math.max(1, Math.round((NOW - m.addedFromVtmMs) / DAY))
    : Math.round(org.day + 20 + r() * 110 + (i % 3) * 12)
  const base = m.revenueWeek / 7
  const offlineDays = m.status === "offline" ? Math.ceil(m.offlineHours / 24) : 0
  const rev: number[] = []
  const restockDays: number[] = []
  let sinceRestock = Math.floor(r() * 6)
  const cadence = 5 + Math.floor(r() * 4)
  for (let d = 0; d < DAYS; d++) {
    const ago = DAYS - 1 - d
    if (ago >= deployedAgo) {
      rev.push(0)
      continue
    }
    // ramp-up during the first two weeks after deployment
    const age = deployedAgo - ago
    const ramp = Math.min(1, 0.45 + age / 25)
    // org trend over the last 28 days, flat before that
    const trend = ago < 28 ? 1 + org.revenueChange4w * (1 - ago / 28) : 1 + org.revenueChange4w * 0
    const pre = ago >= 28 ? 1 - org.revenueChange4w * 0.15 : 1
    const dow = (new Date(NOW - ago * DAY).getUTCDay() + 7) % 7
    const weekend = dow === 0 || dow === 6 ? 1.28 : dow === 5 ? 1.12 : 0.92
    // lanes run down between restocks
    sinceRestock++
    if (sinceRestock >= cadence) {
      sinceRestock = 0
      restockDays.push(d)
    }
    const depletion = 1 - Math.max(0, sinceRestock - 3) * 0.06
    const noise = 0.78 + r() * 0.44
    let v = base * ramp * trend * pre * weekend * depletion * noise
    if (ago < offlineDays) v = ago === offlineDays - 1 ? v * 0.4 : 0
    if (ago === 0) v = m.revenueToday
    rev.push(Math.max(0, Math.round(v * 100) / 100))
  }
  const mix = PRODUCTS.map((p) => p.weight * (0.6 + r() * 0.8) * (orgIdx % 2 && p.category === "TCG packs" ? 1.15 : 1))
  const total = mix.reduce((a, b) => a + b, 0)
  return {
    ...m,
    org,
    chain: chainOf(m.venue),
    deployedAgo,
    hostShare: chainOf(m.venue) === "Independents" ? 0.1 + Math.round(r() * 6) / 100 : 0.15 + Math.round(r() * 5) / 100,
    rev,
    mix: mix.map((x) => x / total),
    restockDays,
    offlineFrom: offlineDays ? DAYS - offlineDays : undefined,
  }
}

let FLEET: FleetMachine[] | null = null
export function fleet(): FleetMachine[] {
  if (!FLEET) FLEET = ORGS.flatMap((org, oi) => org.machines.map((m, i) => buildMachine(org, m, oi, i)))
  return FLEET
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------

export type Period = 7 | 30 | 90 | "all"
export const PERIODS: Period[] = [7, 30, 90, "all"]
export const periodDays = (p: Period) => (p === "all" ? DAYS : p)
export const periodLabel = (p: Period) => (p === "all" ? "All" : `${p}d`)

export function scopeMachines(scope: string) {
  const all = fleet()
  return scope === "all" ? all : all.filter((m) => m.org.id === scope)
}

const sumRange = (xs: number[], from: number, to: number) => {
  let s = 0
  for (let i = Math.max(0, from); i < Math.min(xs.length, to); i++) s += xs[i]!
  return s
}

export function periodWindow(p: Period) {
  const n = periodDays(p)
  return { from: DAYS - n, to: DAYS, prevFrom: DAYS - 2 * n, prevTo: DAYS - n, n }
}

export function machineRevenue(m: FleetMachine, from: number, to: number) {
  return sumRange(m.rev, from, to)
}

/** Days the machine was deployed inside [from, to). */
export function activeDays(m: FleetMachine, from: number, to: number) {
  const start = DAYS - m.deployedAgo
  return Math.max(0, Math.min(to, DAYS) - Math.max(from, start))
}

export function unitsFor(m: FleetMachine, revenue: number) {
  return PRODUCTS.reduce((s, p, i) => s + (revenue * m.mix[i]!) / p.unitValue, 0)
}

/** Supplier cost drift over time, so margin moves a little from day to day. */
export const costDrift = (d: number) => 1 + 0.035 * Math.sin(d / 6.5) + 0.018 * Math.sin(d / 2.3)

export function cogsFor(m: FleetMachine, revenue: number, d?: number) {
  const mapped = m.org.setup.salesMappedShare
  return PRODUCTS.reduce((s, p, i) => s + revenue * m.mix[i]! * p.cogsRatio, 0) * mapped * (d === undefined ? 1 : costDrift(d))
}

export type Totals = { revenue: number; units: number; cogs: number; profit: number; margin: number; unmapped: number }

export function totals(ms: FleetMachine[], from: number, to: number): Totals {
  let revenue = 0
  let units = 0
  let cogs = 0
  let unmapped = 0
  for (const m of ms) {
    const r = machineRevenue(m, from, to)
    revenue += r
    units += unitsFor(m, r)
    for (let d = Math.max(0, from); d < Math.min(DAYS, to); d++) cogs += cogsFor(m, m.rev[d]!, d)
    unmapped += r * (1 - m.org.setup.salesMappedShare)
  }
  const profit = revenue - cogs
  return { revenue, units, cogs, profit, margin: revenue ? profit / revenue : 0, unmapped }
}

/** Daily totals for the scope over the last n days (for sparklines and charts). */
export function dailySeries(ms: FleetMachine[], from: number, to: number, f: (m: FleetMachine, rev: number) => number = (_, r) => r) {
  const out: number[] = []
  for (let d = from; d < to; d++) out.push(ms.reduce((s, m) => s + f(m, m.rev[d]!), 0))
  return out
}

export function perDay(m: FleetMachine, from: number, to: number) {
  const days = activeDays(m, from, to)
  return days ? machineRevenue(m, from, to) / days : 0
}

export function median(xs: number[]) {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export function chainStats(ms: FleetMachine[], from: number, to: number) {
  const fleetPerDay = median(ms.map((m) => perDay(m, from, to)).filter((x) => x > 0)) || 1
  return CHAINS.map((chain) => {
    const cm = ms.filter((m) => m.chain === chain)
    if (!cm.length) return null
    const t = totals(cm, from, to)
    const pd = cm.map((m) => ({ m, pd: perDay(m, from, to) })).sort((a, b) => b.pd - a.pd)
    const avgPerDay = pd.reduce((s, x) => s + x.pd, 0) / cm.length
    return {
      chain,
      machines: cm,
      count: cm.length,
      multiplier: avgPerDay / fleetPerDay,
      revenue: t.revenue,
      perDay: pd.reduce((s, x) => s + x.pd, 0),
      plPerMachine: t.profit / cm.length,
      best: pd[0]!,
      worst: pd[pd.length - 1]!,
      totals: t,
    }
  }).filter((x): x is NonNullable<typeof x> => !!x)
}

export function categoryStats(ms: FleetMachine[], from: number, to: number) {
  return CATEGORIES.map((cat) => {
    let revenue = 0
    let units = 0
    let cogs = 0
    const byProduct: Record<string, number> = {}
    for (const m of ms) {
      const r = machineRevenue(m, from, to)
      PRODUCTS.forEach((p, i) => {
        if (p.category !== cat) return
        const pr = r * m.mix[i]!
        revenue += pr
        units += pr / p.unitValue
        cogs += pr * p.cogsRatio * m.org.setup.salesMappedShare
        byProduct[p.name] = (byProduct[p.name] ?? 0) + pr
      })
    }
    const top = Object.entries(byProduct).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
    return { category: cat, revenue, units, profit: revenue - cogs, margin: revenue ? (revenue - cogs) / revenue : 0, top }
  })
}

export function productStats(ms: FleetMachine[], from: number, to: number) {
  return PRODUCTS.map((p, i) => {
    let revenue = 0
    let cogs = 0
    for (const m of ms) {
      const pr = machineRevenue(m, from, to) * m.mix[i]!
      revenue += pr
      cogs += pr * p.cogsRatio * m.org.setup.salesMappedShare
    }
    return { product: p, revenue, units: revenue / p.unitValue, profit: revenue - cogs }
  }).sort((a, b) => b.revenue - a.revenue)
}

const HOUR_CURVE = [
  0.05, 0.03, 0.02, 0.02, 0.02, 0.04, 0.12, 0.25, 0.38, 0.5, 0.62, 0.78, 0.92, 0.95, 0.98, 1.08, 1.2, 1.25, 1.18, 1.02,
  0.82, 0.58, 0.34, 0.14,
]

/** 7 x 24 grid of units, rows Monday..Sunday. */
export function heatmap(ms: FleetMachine[], from: number, to: number) {
  const units = ms.reduce((s, m) => s + unitsFor(m, machineRevenue(m, from, to)), 0)
  const dayW = [0.92, 0.9, 0.95, 1.0, 1.15, 1.42, 1.3] // Mon..Sun
  const grid = dayW.map((w, di) =>
    HOUR_CURVE.map((h, hi) => {
      const late = di >= 4 && hi >= 19 ? 1.25 : 1
      const morning = di >= 5 && hi <= 10 ? 0.75 : 1
      const jitter = 0.9 + ((di * 31 + hi * 17) % 9) / 40
      return w * h * late * morning * jitter
    })
  )
  const sum = grid.flat().reduce((a, b) => a + b, 0)
  return grid.map((row) => row.map((v) => Math.round((v / sum) * units)))
}

export function lostSales(ms: FleetMachine[], n: number) {
  return ms
    .map((m) => {
      const laneRevPerDay = (m.revenueWeek / 7 / m.lanesTotal) * 1.4
      const emptyLaneDays = (m.lanesEmpty3d * 3.5 + (m.lanesEmpty - m.lanesEmpty3d) * 1.2) * (n / 7) * 0.55
      return { m, lost: laneRevPerDay * emptyLaneDays, laneDays: Math.round(emptyLaneDays) }
    })
    .sort((a, b) => b.lost - a.lost)
}

export function dayLabel(d: number) {
  const ms = NOW - (DAYS - 1 - d) * DAY
  const date = new Date(ms)
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getUTCMonth()]} ${date.getUTCDate()}`
}

export type ChartEvent = { d: number; kind: "offline" | "restock" | "new"; label: string }

export function eventsFor(ms: FleetMachine[], from: number) {
  const ev: ChartEvent[] = []
  for (const m of ms) {
    if (m.offlineFrom !== undefined && m.offlineFrom >= from) ev.push({ d: m.offlineFrom, kind: "offline", label: `${m.venue} offline` })
    const dep = DAYS - m.deployedAgo
    if (dep >= from && dep < DAYS) ev.push({ d: dep, kind: "new", label: `${m.venue} added` })
  }
  // one fleet restock marker: the most recent day with the most restock visits
  const counts = new Map<number, number>()
  for (const m of ms) for (const d of m.restockDays) if (d >= from) counts.set(d, (counts.get(d) ?? 0) + 1)
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  if (best) ev.push({ d: best[0], kind: "restock", label: `Restock run · ${best[1]} machines` })
  return ev.sort((a, b) => a.d - b.d).slice(-4)
}

export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => (typeof c === "string" && /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n")
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
