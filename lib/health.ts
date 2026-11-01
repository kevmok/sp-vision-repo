import { ORGS, type Org, type Owner, type Ticket } from "@/lib/data"
import { pct, signedPct, money } from "@/lib/format"
import { DAY, NOW } from "@/lib/time"

export type Band = "Red" | "Yellow" | "Green"

export type ComponentInput = { label: string; value: string; points: number; max: number }

export type HealthComponent = {
  key: "usage" | "data" | "machines" | "trend" | "relationship"
  label: string
  max: number
  score: number
  inputs: ComponentInput[]
}

export type Health = {
  score: number
  band: Band
  components: HealthComponent[]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const RELATIONSHIP_BASE = { Good: 15, Watch: 8, Poor: 0 } as const

export function orgStats(org: Org) {
  const machines = org.machines
  const online = machines.filter((m) => m.status === "online").length
  const lanes = machines.reduce((s, m) => s + m.lanesTotal, 0)
  const empty = machines.reduce((s, m) => s + m.lanesEmpty, 0)
  const empty3d = machines.reduce((s, m) => s + m.lanesEmpty3d, 0)
  const low = machines.reduce((s, m) => s + m.lanesLow, 0)
  const revenueWeek = machines.reduce((s, m) => s + m.revenueWeek, 0)
  const revenueToday = machines.reduce((s, m) => s + m.revenueToday, 0)
  return {
    machines: machines.length,
    online,
    onlineShare: machines.length ? online / machines.length : 0,
    lanes,
    empty,
    low,
    emptyShare: lanes ? empty / lanes : 0,
    empty3dShare: lanes ? empty3d / lanes : 0,
    revenueWeek,
    revenueToday,
    revenuePerMachine: machines.length ? revenueWeek / machines.length : 0,
  }
}

export function ticketsOpen3d(orgId: string, tickets: Ticket[], now = NOW) {
  return tickets.filter((t) => t.orgId === orgId && t.status === "open" && now - t.openedAt >= 3 * DAY)
}

export function setupSteps(org: Org) {
  const s = org.setup
  return [
    { key: "vtm", label: "VTM connected", done: s.vtmConnectedMs !== null },
    { key: "mapped", label: "Sales mapped", done: s.salesMappedShare >= 0.95 },
    { key: "purchases", label: "Purchase costs entered", done: s.purchasesEntered },
    { key: "hosts", label: "Host deals set", done: s.hostDeals.set >= s.hostDeals.total },
  ]
}

export function isActivated(org: Org) {
  return setupSteps(org).every((s) => s.done)
}

export function isWeeklyActive(org: Org) {
  return NOW - org.usage.lastLoginMs < 7 * DAY
}

export function bandOf(score: number): Band {
  return score >= 75 ? "Green" : score >= 50 ? "Yellow" : "Red"
}

export function computeHealth(org: Org, tickets: Ticket[]): Health {
  const st = orgStats(org)
  const s = org.setup
  const r1 = (n: number) => Math.round(n * 10) / 10

  const usage = 25 * Math.min(org.usage.daysActive14 / 8, 1)

  const hostDealsSet = s.hostDeals.set >= s.hostDeals.total
  const dq = [
    { label: "Sales mapped", value: pct(s.salesMappedShare), points: 8 * s.salesMappedShare, max: 8 },
    { label: "Purchases current", value: org.purchasesCurrent ? "Yes" : "No", points: org.purchasesCurrent ? 4 : 0, max: 4 },
    { label: "Host deals set", value: `${s.hostDeals.set} of ${s.hostDeals.total}`, points: hostDealsSet ? 4 : 0, max: 4 },
    { label: "VTM sync current", value: org.vtmSyncCurrent ? "Yes" : "Stale", points: org.vtmSyncCurrent ? 4 : 0, max: 4 },
  ]

  const machinesIn = [
    { label: "Online", value: `${st.online} of ${st.machines}`, points: 12 * st.onlineShare, max: 12 },
    { label: "Lanes not empty", value: pct(1 - st.emptyShare), points: 8 * (1 - st.emptyShare), max: 8 },
  ]

  const trend = clamp(10 + 40 * org.revenueChange4w, 0, 20)
  const open3d = ticketsOpen3d(org.id, tickets).length
  const relBase = RELATIONSHIP_BASE[org.relationship]
  const relationship = Math.max(0, relBase - 4 * open3d)

  const components: HealthComponent[] = [
    {
      key: "usage",
      label: "Usage",
      max: 25,
      score: usage,
      inputs: [{ label: "Active days, last 14", value: `${org.usage.daysActive14} of 8 target`, points: usage, max: 25 }],
    },
    { key: "data", label: "Data quality", max: 20, score: dq.reduce((a, b) => a + b.points, 0), inputs: dq },
    { key: "machines", label: "Machines", max: 20, score: machinesIn.reduce((a, b) => a + b.points, 0), inputs: machinesIn },
    {
      key: "trend",
      label: "Sales trend",
      max: 20,
      score: trend,
      inputs: [{ label: "Revenue, 4-week change", value: signedPct(org.revenueChange4w), points: trend, max: 20 }],
    },
    {
      key: "relationship",
      label: "Relationship",
      max: 15,
      score: relationship,
      inputs: [
        { label: "Rapport", value: org.relationship, points: relBase, max: 15 },
        { label: "Tickets open 3d+", value: String(open3d), points: -4 * open3d, max: 0 },
      ],
    },
  ]
  for (const c of components) {
    c.score = r1(c.score)
    c.inputs = c.inputs.map((i) => ({ ...i, points: r1(i.points) }))
  }
  const score = Math.round(components.reduce((a, c) => a + c.score, 0))
  return { score, band: bandOf(score), components }
}

// ---------------------------------------------------------------------------
// Signals and plays
// ---------------------------------------------------------------------------

export type SignalType = "offline" | "escalate" | "nologin" | "revenue" | "data" | "lanes" | "growth"

export type Signal = {
  key: string
  type: SignalType
  severity: number
  title: string
  detail: string
  play: string
  owner: Owner
  ownerRole: string
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export const MEDIAN_REV_PER_MACHINE = median(ORGS.map((o) => orgStats(o).revenuePerMachine))

export function computeSignals(org: Org, tickets: Ticket[], health: Health): Signal[] {
  const out: Signal[] = []
  const st = orgStats(org)
  const lead = org.owner
  const add = (s: Omit<Signal, "key">) => out.push({ ...s, key: `${org.id}:${s.type}` })

  const offline = org.machines.filter((m) => m.status === "offline" && m.offlineHours >= 24)
  if (offline.length) {
    const m = offline[0]!
    add({
      type: "offline",
      severity: 100,
      title: "Machine offline 24h+",
      detail: `${m.venue} offline ${m.offlineHours}h`,
      play: "Tell them first",
      owner: lead,
      ownerRole: "Success lead",
    })
  }

  const stale = ticketsOpen3d(org.id, tickets)
  if (stale.length || org.repeatIssue) {
    const t = stale[0]
    const days = t ? Math.floor((NOW - t.openedAt) / DAY) : 0
    const tech = t ? ["Lane fault", "Machine offline", "Payments", "Sales mapping"].includes(t.category) : true
    add({
      type: "escalate",
      severity: 90,
      title: org.repeatIssue ? "Repeat issue" : "Ticket open 3+ days",
      detail: org.repeatIssue ?? `${t!.id} open ${days} days`,
      play: "Escalate",
      owner: tech ? "Alex" : "Kevin",
      ownerRole: tech ? "Engineering" : "Success",
    })
  }

  const daysSinceLogin = Math.floor((NOW - org.usage.lastLoginMs) / DAY)
  if (daysSinceLogin >= 7) {
    add({
      type: "nologin",
      severity: 80,
      title: "No login 7 days",
      detail: `Last login ${daysSinceLogin} days ago`,
      play: "Personal message + 15-min screen share",
      owner: lead,
      ownerRole: "Success lead",
    })
  }

  if (org.revenueChange4w <= -0.25) {
    add({
      type: "revenue",
      severity: 70,
      title: "Revenue per machine down 25%+",
      detail: `${signedPct(org.revenueChange4w)} over 4 weeks`,
      play: "Location & product review",
      owner: lead === "Andrew" ? "Andrew" : lead === "Sahib" ? "Sahib" : org.id.length % 2 ? "Sahib" : "Andrew",
      ownerRole: "Field",
    })
  }

  const unmapped = 1 - org.setup.salesMappedShare
  const noPurchases = !org.setup.purchasesEntered && org.day >= 14
  if (unmapped > 0.1 || noPurchases) {
    add({
      type: "data",
      severity: 60,
      title: unmapped > 0.1 ? "Sales unmapped >10%" : "No purchases by day 14",
      detail:
        unmapped > 0.1 && noPurchases
          ? `${pct(unmapped)} unmapped, no purchases by day ${org.day}`
          : unmapped > 0.1
            ? `${pct(unmapped)} of sales unmapped`
            : `No purchases entered by day ${org.day}`,
      play: "Data setup session",
      owner: lead,
      ownerRole: "Success lead",
    })
  }

  if (st.empty3dShare >= 0.2) {
    add({
      type: "lanes",
      severity: 50,
      title: "Lanes empty 3+ days",
      detail: `${pct(st.empty3dShare)} of lanes empty 3+ days`,
      play: "Restock planning help",
      owner: lead,
      ownerRole: "Success lead",
    })
  }

  if (health.band === "Green" && st.revenuePerMachine > MEDIAN_REV_PER_MACHINE) {
    add({
      type: "growth",
      severity: 10,
      title: "Ready to grow",
      detail: `${money(st.revenuePerMachine)}/machine/wk vs ${money(MEDIAN_REV_PER_MACHINE)} median`,
      play: "Ready for another machine? VapeTM referral",
      owner: "Sahib",
      ownerRole: "Partnerships",
    })
  }

  return out.sort((a, b) => b.severity - a.severity)
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export function timeline(org: Org) {
  const kickoff = NOW - org.day * DAY
  const items = [
    { day: 0, label: "Kickoff" },
    { day: 3, label: "Walkthrough: sales mapping" },
    { day: 10, label: "Walkthrough: restocks and P&L" },
    { day: 30, label: "Day 30 checkpoint" },
    { day: 60, label: "Day 60 checkpoint" },
    { day: 90, label: "Day 90 review" },
  ]
  const nextIdx = items.findIndex((i) => i.day > org.day)
  return items.map((i, idx) => ({
    ...i,
    at: kickoff + i.day * DAY,
    state: i.day <= org.day ? ("done" as const) : idx === nextIdx ? ("next" as const) : ("upcoming" as const),
  }))
}
