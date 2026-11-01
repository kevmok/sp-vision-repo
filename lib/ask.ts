import {
  CATEGORIES,
  CHAIN_COLOR,
  CATEGORY_COLOR,
  DAYS,
  PRODUCTS,
  SERIES,
  heatmap,
  machineRevenue,
  perDay,
  scopeMachines,
  unitsFor,
} from "@/lib/analytics"
import { CHAINS, type Org, type Ticket } from "@/lib/data"
import type { Txn } from "@/lib/bank"
import { money } from "@/lib/format"
import { DAY, NOW, fmtDate } from "@/lib/time"

export type Unit = "money" | "count"

export type Visual =
  | { kind: "bar"; data: { label: string; value: number }[]; unit: Unit; color?: string }
  | { kind: "stacked"; data: Record<string, string | number>[]; x: string; keys: { key: string; color: string }[]; unit: Unit }
  | { kind: "line"; data: Record<string, string | number>[]; x: string; keys: { key: string; color: string }[]; unit: Unit }
  | { kind: "heatmap"; grid: number[][] }
  | { kind: "table"; columns: string[]; rows: (string | number)[][]; numeric?: number[] }
  | { kind: "number"; value: string; label: string; detail?: { columns: string[]; rows: (string | number)[][]; numeric?: number[] } }

export type Answer = { title: string; text: string; visual: Visual; sql: string; followups: string[] }

export type AskContext = { org: Org; tickets: Ticket[]; bankInbox: Txn[]; page?: string }

export const EXAMPLES = [
  "Which products sold best per machine over the last 30 days?",
  "Weekly revenue by chain since August",
  "Which lanes are out of stock right now, by venue?",
  "Compare Pokémon vs One Piece revenue by month",
]

export const MORE_EXAMPLES = [
  "Which host is owed the most this quarter?",
  "Which machines went quiet this week?",
  "Support tickets by category",
  "Uncategorized bank transactions this month",
  "Restock forecast for next week",
  "When do my machines sell?",
]

const today = DAYS - 1

function weeksSinceAug() {
  const aug1 = Date.UTC(2026, 7, 3) // first Monday of August
  const weeks: { label: string; from: number; to: number }[] = []
  for (let start = aug1; start + 7 * DAY <= NOW + DAY; start += 7 * DAY) {
    const from = DAYS - 1 - Math.round((NOW - start) / DAY)
    weeks.push({ label: fmtDate(start), from, to: from + 7 })
  }
  return weeks
}

const MONTHS = [
  { label: "May", m: 4 },
  { label: "Jun", m: 5 },
  { label: "Jul", m: 6 },
  { label: "Aug", m: 7 },
  { label: "Sep", m: 8 },
  { label: "Oct", m: 9 },
]

function monthRange(m: number) {
  const start = Date.UTC(2026, m, 1)
  const end = Date.UTC(2026, m + 1, 1)
  const idx = (ms: number) => DAYS - 1 - Math.round((NOW - ms) / DAY)
  return { from: idx(start), to: idx(end) }
}

type Rule = { test: RegExp; build: (ctx: AskContext) => Answer }

const RULES: Rule[] = [
  {
    test: /cost basis|unmapped|not mapped|mapping/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const share = 1 - org.setup.salesMappedShare
      const rev = ms.reduce((s, m) => s + machineRevenue(m, today - 29, today + 1), 0)
      const names = ["Squishy keychain — glow", "Mochi squishy — peach", "Jumbo squishy — cat", "Sour belts — blue razz", "Iced tea — peach", "Pokémon booster — promo"]
      const count = Math.max(1, Math.round(share * 30))
      const weights = names.slice(0, Math.min(names.length, count)).map((_, i) => 1 / (i + 1.5))
      const wsum = weights.reduce((a, b) => a + b, 0)
      const rows = weights.map((w, i) => [names[i]!, Math.round((rev * share * w) / wsum / 4.5), money((rev * share * w) / wsum)])
      return {
        title: "Products with no cost basis",
        text: `${money(rev * share)} of the last 30 days of revenue comes from ${count} products that aren't mapped to a purchase, so their profit counts as 100% margin. Mapping these closes the gap.`,
        visual: { kind: "table", columns: ["Product (as sold)", "Units", "Revenue"], rows, numeric: [1, 2] },
        sql: `SELECT s.raw_product_name, sum(s.qty) AS units, sum(s.amount) AS revenue
FROM sales s
JOIN machines m ON m.id = s.machine_id
LEFT JOIN product_map pm ON pm.raw_name = s.raw_product_name
WHERE m.org_id = :org AND pm.product_id IS NULL
  AND s.sold_at >= now() - interval '30 days'
GROUP BY 1 ORDER BY revenue DESC;`,
        followups: ["Which products sold best per machine over the last 30 days?", "How did revenue and gross profit trend by week?"],
      }
    },
  },
  {
    test: /profit|margin|cogs/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const weeks = weeksSinceAug()
      const data = weeks.map((w) => {
        let rev = 0
        let cogs = 0
        for (const m of ms) {
          const r = machineRevenue(m, w.from, w.to)
          rev += r
          cogs += PRODUCTS.reduce((s, p, i) => s + r * m.mix[i]! * p.cogsRatio, 0) * m.org.setup.salesMappedShare
        }
        return { week: w.label, Revenue: Math.round(rev), "Gross profit": Math.round(rev - cogs) }
      })
      const last = data[data.length - 1]!
      return {
        title: "Revenue and gross profit by week",
        text: `Last week: ${money(last.Revenue)} revenue and ${money(last["Gross profit"])} gross profit, a ${Math.round((last["Gross profit"] / Math.max(1, last.Revenue)) * 100)}% margin.`,
        visual: {
          kind: "line",
          data,
          x: "week",
          keys: [
            { key: "Revenue", color: SERIES[0] },
            { key: "Gross profit", color: SERIES[1] },
          ],
          unit: "money",
        },
        sql: `SELECT date_trunc('week', s.sold_at) AS week,
       sum(s.amount) AS revenue,
       sum(s.amount) - sum(f.fifo_cost) AS gross_profit
FROM sales s
JOIN machines m ON m.id = s.machine_id
LEFT JOIN fifo_costs f ON f.sale_id = s.id
WHERE m.org_id = :org AND s.sold_at >= '2026-08-03'
GROUP BY 1 ORDER BY 1;`,
        followups: ["Weekly revenue by chain since August", "Which products have no cost basis?"],
      }
    },
  },
  {
    test: /chain/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const chains = CHAINS.filter((c) => ms.some((m) => m.chain === c))
      const weeks = weeksSinceAug()
      const data = weeks.map((w) => {
        const row: Record<string, string | number> = { week: w.label }
        for (const c of chains) row[c] = Math.round(ms.filter((m) => m.chain === c).reduce((s, m) => s + machineRevenue(m, w.from, w.to), 0))
        return row
      })
      const last = data[data.length - 1]!
      const lead = chains.reduce((a, b) => ((last[a] as number) >= (last[b] as number) ? a : b))
      return {
        title: "Weekly revenue by chain",
        text: `${lead} led last week with ${money(last[lead] as number)}. ${chains.length} chains across ${ms.length} machines, ${weeks.length} weeks since August.`,
        visual: { kind: "stacked", data, x: "week", keys: chains.map((c) => ({ key: c, color: CHAIN_COLOR[c] })), unit: "money" },
        sql: `SELECT date_trunc('week', s.sold_at) AS week,
       coalesce(c.name, 'Independents') AS chain,
       sum(s.amount) AS revenue
FROM sales s
JOIN machines m ON m.id = s.machine_id
LEFT JOIN chains c ON c.id = m.chain_id
WHERE m.org_id = :org AND s.sold_at >= '2026-08-03'
GROUP BY 1, 2
ORDER BY 1, 2;`,
        followups: ["Which machines went quiet this week?", "Which products sold best per machine over the last 30 days?"],
      }
    },
  },
  {
    test: /(best|top).*(product)|product.*(per machine|best)/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const rows = ms
        .map((m) => {
          const r = machineRevenue(m, today - 29, today + 1)
          const i = m.mix.indexOf(Math.max(...m.mix))
          const p = PRODUCTS[i]!
          return [m.venue, p.name, Math.round((r * m.mix[i]!) / p.unitValue), Math.round(r * m.mix[i]!)] as (string | number)[]
        })
        .sort((a, b) => (b[3] as number) - (a[3] as number))
      return {
        title: "Best product per machine, last 30 days",
        text: `${rows[0]![1]} is the top seller at ${rows.filter((r) => String(r[1]).startsWith("Pokémon")).length} of ${rows.length} machines. ${rows[0]![0]} sold the most of any single product.`,
        visual: { kind: "table", columns: ["Machine", "Best product", "Units", "Revenue"], rows: rows.map((r) => [r[0]!, r[1]!, r[2]!, money(r[3] as number)]), numeric: [2, 3] },
        sql: `SELECT m.venue, p.name AS best_product, sum(s.qty) AS units, sum(s.amount) AS revenue
FROM sales s
JOIN machines m ON m.id = s.machine_id
JOIN products p ON p.id = s.product_id
WHERE m.org_id = :org AND s.sold_at >= now() - interval '30 days'
GROUP BY m.venue, p.name
QUALIFY row_number() OVER (PARTITION BY m.venue ORDER BY sum(s.amount) DESC) = 1
ORDER BY revenue DESC;`,
        followups: ["Compare Pokémon vs One Piece revenue by month", "Restock forecast for next week"],
      }
    },
  },
  {
    test: /out of stock|empty lanes?|lanes? out|\bstock\b/i,
    build: ({ org }) => {
      const data = org.machines
        .filter((m) => m.lanesEmpty > 0)
        .map((m) => ({ label: m.venue, value: m.lanesEmpty }))
        .sort((a, b) => b.value - a.value)
      const total = data.reduce((s, d) => s + d.value, 0)
      return {
        title: "Lanes out of stock right now",
        text: `${total} lanes are empty across ${data.length} venues. ${data[0]?.label ?? "None"} has the most with ${data[0]?.value ?? 0}.`,
        visual: { kind: "bar", data, unit: "count", color: SERIES[0] },
        sql: `SELECT m.venue, count(*) AS lanes_out
FROM lanes l
JOIN machines m ON m.id = l.machine_id
WHERE m.org_id = :org AND l.on_hand = 0
GROUP BY m.venue
ORDER BY lanes_out DESC;`,
        followups: ["Restock forecast for next week", "Which machines went quiet this week?"],
      }
    },
  },
  {
    test: /pok[eé]mon|one piece/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const pk = PRODUCTS.map((p, i) => (p.name.startsWith("Pokémon") ? i : -1)).filter((i) => i >= 0)
      const op = PRODUCTS.findIndex((p) => p.name === "One Piece booster")
      const data = MONTHS.map(({ label, m }) => {
        const { from, to } = monthRange(m)
        let a = 0
        let b = 0
        for (const mm of ms) {
          const r = machineRevenue(mm, from, to)
          a += pk.reduce((s, i) => s + r * mm.mix[i]!, 0)
          b += r * mm.mix[op]!
        }
        return { month: label, "Pokémon": Math.round(a), "One Piece": Math.round(b) }
      }).filter((row, i, rows) => rows.slice(0, i + 1).some((r) => r["Pokémon"] + r["One Piece"] > 0))
      const last = data[data.length - 1]!
      return {
        title: "Pokémon vs One Piece, monthly revenue",
        text: `Pokémon brought in ${money(last["Pokémon"])} in October, ${(last["Pokémon"] / Math.max(1, last["One Piece"])).toFixed(1)}× One Piece at ${money(last["One Piece"])}.`,
        visual: {
          kind: "line",
          data,
          x: "month",
          keys: [
            { key: "Pokémon", color: SERIES[0] },
            { key: "One Piece", color: SERIES[1] },
          ],
          unit: "money",
        },
        sql: `SELECT date_trunc('month', s.sold_at) AS month,
       CASE WHEN p.name ILIKE 'Pokémon%' THEN 'Pokémon' ELSE 'One Piece' END AS line,
       sum(s.amount) AS revenue
FROM sales s
JOIN products p ON p.id = s.product_id
JOIN machines m ON m.id = s.machine_id
WHERE m.org_id = :org AND (p.name ILIKE 'Pokémon%' OR p.name ILIKE 'One Piece%')
GROUP BY 1, 2 ORDER BY 1;`,
        followups: ["Which products sold best per machine over the last 30 days?", "Weekly revenue by chain since August"],
      }
    },
  },
  {
    test: /host|owed|payout/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const from = DAYS - 1 - Math.round((NOW - Date.UTC(2026, 9, 1)) / DAY)
      const rows = ms
        .map((m) => [m.venue, `${Math.round(m.hostShare * 100)}%`, machineRevenue(m, from, today + 1) * m.hostShare] as [string, string, number])
        .sort((a, b) => b[2] - a[2])
      return {
        title: "Host payouts owed, Q4 to date",
        text: `${rows[0]![0]} is owed the most this quarter. Total owed across ${rows.length} hosts is ${money(rows.reduce((s, r) => s + r[2], 0))}.`,
        visual: {
          kind: "number",
          value: money(rows[0]![2]),
          label: rows[0]![0],
          detail: { columns: ["Host", "Share", "Owed"], rows: rows.slice(0, 6).map((r) => [r[0], r[1], money(r[2])]), numeric: [1, 2] },
        },
        sql: `SELECT h.name AS host, d.share_pct, sum(s.amount) * d.share_pct / 100 AS owed
FROM sales s
JOIN machines m ON m.id = s.machine_id
JOIN host_deals d ON d.machine_id = m.id
JOIN hosts h ON h.id = d.host_id
WHERE m.org_id = :org AND s.sold_at >= date_trunc('quarter', now())
GROUP BY h.name, d.share_pct
ORDER BY owed DESC;`,
        followups: ["Uncategorized bank transactions this month", "Weekly revenue by chain since August"],
      }
    },
  },
  {
    test: /quiet|no sales|slow|stopped/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const rows = ms
        .map((m) => {
          const tw = machineRevenue(m, today - 6, today + 1)
          const lw = machineRevenue(m, today - 13, today - 6)
          return { m, tw, lw, ch: lw ? tw / lw - 1 : 0 }
        })
        .filter((x) => x.ch < -0.15 || x.m.status === "offline" || x.m.lastSaleHoursAgo > x.m.usualGapHours * 2)
        .sort((a, b) => a.ch - b.ch)
      return {
        title: "Machines that went quiet this week",
        text: rows.length
          ? `${rows.length} machines slowed down or stopped this week. ${rows[0]!.m.venue} dropped the most.`
          : "No machine dropped more than 15% this week.",
        visual: {
          kind: "table",
          columns: ["Machine", "Status", "Last sale", "This week", "vs last week"],
          rows: rows.map(({ m, tw, ch }) => [
            m.venue,
            m.status === "offline" ? `Offline ${m.offlineHours}h` : "Online",
            `${Math.round(m.lastSaleHoursAgo)}h ago`,
            money(tw),
            `${ch < 0 ? "−" : "+"}${Math.abs(Math.round(ch * 100))}%`,
          ]),
          numeric: [2, 3, 4],
        },
        sql: `WITH w AS (
  SELECT machine_id,
         sum(amount) FILTER (WHERE sold_at >= now() - interval '7 days') AS this_week,
         sum(amount) FILTER (WHERE sold_at <  now() - interval '7 days') AS last_week
  FROM sales WHERE sold_at >= now() - interval '14 days' GROUP BY 1)
SELECT m.venue, m.status, m.last_sale_at, w.this_week, w.this_week / nullif(w.last_week, 0) - 1 AS change
FROM w JOIN machines m ON m.id = w.machine_id
WHERE m.org_id = :org AND (w.this_week < 0.85 * w.last_week OR m.status = 'offline')
ORDER BY change;`,
        followups: ["Which lanes are out of stock right now, by venue?", "Support tickets by category"],
      }
    },
  },
  {
    test: /ticket|support/i,
    build: ({ org, tickets }) => {
      const mine = tickets.filter((t) => t.orgId === org.id)
      const all = mine.length >= 3 ? mine : tickets
      const by: Record<string, number> = {}
      for (const t of all) by[t.category] = (by[t.category] ?? 0) + 1
      const data = Object.entries(by)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
      return {
        title: all === mine ? "Support tickets by category" : "Support tickets by category, all operators",
        text: `${data[0]!.label} is the most common category with ${data[0]!.value} of ${all.length} tickets. ${all.filter((t) => t.status === "open").length} are still open.`,
        visual: { kind: "bar", data, unit: "count", color: SERIES[1] },
        sql: `SELECT category, count(*) AS tickets, count(*) FILTER (WHERE status = 'open') AS open
FROM support_tickets
WHERE org_id = :org
GROUP BY category
ORDER BY tickets DESC;`,
        followups: ["Which machines went quiet this week?", "Which lanes are out of stock right now, by venue?"],
      }
    },
  },
  {
    test: /bank|uncategori[sz]ed|transaction/i,
    build: ({ bankInbox }) => {
      const total = bankInbox.reduce((s, t) => s + Math.abs(t.amount), 0)
      return {
        title: "Uncategorized bank transactions",
        text: `${bankInbox.length} transactions are waiting in Bank sync, ${bankInbox.filter((t) => t.confidence >= 0.9).length} of them with a high-confidence suggestion.`,
        visual: {
          kind: "number",
          value: String(bankInbox.length),
          label: `${money(total)} to categorize`,
          detail: {
            columns: ["Date", "Descriptor", "Amount", "Suggested"],
            rows: bankInbox.slice(0, 6).map((t) => [fmtDate(t.date), t.descriptor, money(t.amount, { cents: true }), t.suggested]),
            numeric: [2],
          },
        },
        sql: `SELECT posted_at, descriptor, amount, suggested_category, confidence
FROM bank_transactions
WHERE org_id = :org AND category IS NULL
  AND posted_at >= date_trunc('month', now() - interval '1 day')
ORDER BY posted_at DESC;`,
        followups: ["Which host is owed the most this quarter?", "Weekly revenue by chain since August"],
      }
    },
  },
  {
    test: /restock|forecast|next week/i,
    build: ({ org }) => {
      const ms = scopeMachines(org.id)
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const w = [0.92, 0.9, 0.95, 1.0, 1.15, 1.42, 1.3]
      const weekUnits = ms.reduce((s, m) => s + unitsFor(m, machineRevenue(m, today - 6, today + 1)), 0)
      const share = CATEGORIES.map((c) => PRODUCTS.filter((p) => p.category === c).reduce((s, p) => s + p.weight / p.unitValue, 0))
      const shareSum = share.reduce((a, b) => a + b, 0)
      const wSum = w.reduce((a, b) => a + b, 0)
      const data = days.map((d, i) => {
        const row: Record<string, string | number> = { day: d }
        CATEGORIES.forEach((c, ci) => (row[c] = Math.round(weekUnits * 1.04 * (w[i]! / wSum) * (share[ci]! / shareSum))))
        return row
      })
      return {
        title: "Restock forecast, next week",
        text: `Plan for about ${Math.round(weekUnits * 1.04)} units next week. Saturday is the heaviest day, so the Friday run matters most.`,
        visual: { kind: "stacked", data, x: "day", keys: CATEGORIES.map((c) => ({ key: c, color: CATEGORY_COLOR[c] })), unit: "count" },
        sql: `SELECT extract(isodow FROM d) AS weekday, p.category,
       avg(units) * 1.04 AS forecast_units
FROM daily_product_units
WHERE org_id = :org AND d >= now() - interval '8 weeks'
GROUP BY 1, 2 ORDER BY 1;`,
        followups: ["Which lanes are out of stock right now, by venue?", "When do my machines sell?"],
      }
    },
  },
  {
    test: /when|hour|busiest|time of day|heat/i,
    build: ({ org }) => {
      const grid = heatmap(scopeMachines(org.id), today - 29, today + 1)
      const flat = grid.flatMap((r, d) => r.map((v, h) => ({ v, d, h })))
      const peak = flat.reduce((a, b) => (b.v > a.v ? b : a))
      const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      return {
        title: "When machines sell, last 30 days",
        text: `Sales peak ${names[peak.d]} around ${peak.h % 12 || 12} ${peak.h >= 12 ? "PM" : "AM"}. Weekends carry ${Math.round(((grid[5]!.reduce((a, b) => a + b, 0) + grid[6]!.reduce((a, b) => a + b, 0)) / flat.reduce((s, x) => s + x.v, 0)) * 100)}% of units.`,
        visual: { kind: "heatmap", grid },
        sql: `SELECT extract(isodow FROM sold_at) AS weekday, extract(hour FROM sold_at) AS hour, sum(qty) AS units
FROM sales s JOIN machines m ON m.id = s.machine_id
WHERE m.org_id = :org AND sold_at >= now() - interval '30 days'
GROUP BY 1, 2;`,
        followups: ["Restock forecast for next week", "Weekly revenue by chain since August"],
      }
    },
  },
]

function generic(q: string, { org, page }: AskContext): Answer {
  const ms = scopeMachines(org.id)
  const rows = ms
    .map((m) => [m.venue, money(machineRevenue(m, today - 29, today + 1)), money(perDay(m, today - 29, today + 1))])
    .sort((a, b) => Number(String(b[1]).replace(/[$,]/g, "")) - Number(String(a[1]).replace(/[$,]/g, "")))
  return {
    title: "Machines, last 30 days",
    text: `I don't have a saved metric for "${q.length > 60 ? q.slice(0, 57) + "…" : q}" yet${page ? ` on ${page}` : ""}, so here is the closest thing I can answer from your data: every machine ranked by revenue over the last 30 days. Try narrowing it to a product, machine, host or date range.`,
    visual: { kind: "table", columns: ["Machine", "Revenue", "$/day"], rows, numeric: [1, 2] },
    sql: `SELECT m.venue, sum(s.amount) AS revenue, sum(s.amount) / 30 AS per_day
FROM sales s JOIN machines m ON m.id = s.machine_id
WHERE m.org_id = :org AND s.sold_at >= now() - interval '30 days'
GROUP BY m.venue
ORDER BY revenue DESC;`,
    followups: EXAMPLES.slice(0, 2),
  }
}

export function answerFor(q: string, ctx: AskContext): Answer {
  const rule = RULES.find((r) => r.test.test(q))
  return rule ? rule.build(ctx) : generic(q, ctx)
}
