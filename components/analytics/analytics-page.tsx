"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Download, Settings2, Sparkles } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip as RTooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { ChartContainer } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Heatmap, SeriesChart, fmtAxis } from "@/components/charts/charts"
import { AnalyticsDrawer, type DrawerTarget } from "@/components/analytics/drawer"
import { Chip, Page, PageHeader } from "@/components/sp/ui"
import {
  CATEGORY_COLOR,
  CHAIN_COLOR,
  DAYS,
  PERIODS,
  PRODUCTS,
  activeDays,
  categoryStats,
  chainStats,
  cogsFor,
  dayLabel,
  downloadCsv,
  eventsFor,
  heatmap,
  lostSales,
  machineRevenue,
  median,
  perDay,
  periodLabel,
  periodWindow,
  productStats,
  scopeMachines,
  totals,
  unitsFor,
  type FleetMachine,
  type Period,
} from "@/lib/analytics"
import { CHAINS, ORGS } from "@/lib/data"
import { money, pct } from "@/lib/format"
import { useAsk } from "@/lib/ask-store"
import { useOperatorOrg } from "@/lib/store"
import { cn } from "@/lib/utils"
import { useQueryParam } from "@/lib/use-url"

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Seg<T extends string | number>({
  value,
  onChange,
  options,
  label = (v: T) => String(v),
}: {
  value: T
  onChange: (v: T) => void
  options: readonly T[]
  label?: (v: T) => string
}) {
  return (
    <ToggleGroup
      value={[String(value)]}
      onValueChange={(v) => {
        const hit = options.find((o) => String(o) === v[0])
        if (hit !== undefined) onChange(hit)
      }}
      variant="outline"
      size="sm"
      spacing={0}
    >
      {options.map((o) => (
        <ToggleGroupItem key={String(o)} value={String(o)} className="h-7 px-2.5 text-[12px] data-pressed:bg-muted data-pressed:font-medium">
          {label(o)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function MiniSelect({ value, onChange, items, className }: { value: string; onChange: (v: string) => void; items: { value: string; label: string }[]; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)} items={items}>
      <SelectTrigger size="sm" className={cn("h-7 bg-card text-[12px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value} className="text-[12.5px]">
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Section({
  title,
  controls,
  ask,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode
  controls?: React.ReactNode
  ask?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  const { openSheet } = useAsk()
  return (
    <section className={cn("flex flex-col rounded-xl border border-hairline bg-card", className)}>
      <header className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-hairline px-4 py-2">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {controls}
          {ask && (
            <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => openSheet(ask, "Analytics")} aria-label={`Ask about ${typeof title === "string" ? title : "this"}`}>
              <Sparkles className="text-copper" />
              Ask about this
            </Button>
          )}
        </div>
      </header>
      <div className={cn("min-h-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

function Delta({ v, invert }: { v: number; invert?: boolean }) {
  if (!isFinite(v)) return null
  const up = v >= 0
  const good = invert ? !up : up
  return (
    <span className={cn("num inline-flex items-center gap-0.5 text-[11.5px] font-medium", good ? "text-ok" : "text-bad")}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(v * 100).toFixed(1)}%
    </span>
  )
}

function Sparkline({ values, color = "#b3631c" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const w = 96
  const h = 28
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * (h - 2) - 1}`)
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// KPI row
// ---------------------------------------------------------------------------

function Kpis({ ms, period }: { ms: FleetMachine[]; period: Period }) {
  const w = periodWindow(period)
  const cur = totals(ms, w.from, w.to)
  const prev = totals(ms, w.prevFrom, w.prevTo)
  const ch = (a: number, b: number) => (b ? a / b - 1 : NaN)
  const bucket = Math.max(1, Math.round(w.n / 14))
  const spark = (f: (t: ReturnType<typeof totals>) => number) => {
    const out: number[] = []
    for (let d = w.from; d < w.to; d += bucket) {
      const t = totals(ms, d, Math.min(w.to, d + bucket))
      out.push(f(t))
    }
    return out
  }
  const tiles = [
    { label: "Revenue", value: money(cur.revenue), sub: `${Math.round(cur.units).toLocaleString("en-US")} units · delivered`, d: ch(cur.revenue, prev.revenue), s: spark((t) => t.revenue) },
    { label: "COGS (FIFO)", value: money(cur.cogs), sub: pct(cur.revenue ? cur.cogs / cur.revenue : 0) + " of revenue", d: ch(cur.cogs, prev.cogs), s: spark((t) => t.cogs), invert: true },
    { label: "Gross profit", value: money(cur.profit), sub: `${money(cur.profit / Math.max(1, ms.length))} per machine`, d: ch(cur.profit, prev.profit), s: spark((t) => t.profit) },
    { label: "Gross margin", value: pct(cur.margin, 1), sub: `${((cur.margin - prev.margin) * 100 >= 0 ? "+" : "−") + Math.abs((cur.margin - prev.margin) * 100).toFixed(1)} pts`, d: cur.margin - prev.margin, s: spark((t) => t.margin) },
  ]
  return (
    <div className="grid grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-card px-4 py-3.5">
          <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            {t.label}
            {t.label !== "Gross margin" ? <Delta v={t.d} invert={t.invert} /> : <Delta v={t.d} />}
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="num text-[24px] leading-none font-medium tracking-[-0.05em]">{t.value}</span>
              <span className="text-[12px] text-muted-foreground">{t.sub}</span>
            </div>
            <Sparkline values={t.s} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

function Groups({ ms, scope, onOpen }: { ms: FleetMachine[]; scope: string; onOpen: (t: DrawerTarget) => void }) {
  const [mode, setMode] = React.useState<"Chains" | "Categories">("Chains")
  const [period, setPeriod] = React.useState<Period>(30)
  const [manage, setManage] = React.useState(false)
  const w = periodWindow(period)
  const chains = chainStats(ms, w.from, w.to)
  const cats = categoryStats(ms, w.from, w.to)
  return (
    <Section
      title="Groups"
      ask="Weekly revenue by chain since August"
      controls={
        <>
          <Seg value={mode} onChange={setMode} options={["Chains", "Categories"] as const} />
          <Seg value={period} onChange={setPeriod} options={PERIODS} label={periodLabel} />
          <Button size="xs" variant="outline" className="h-7" onClick={() => setManage(true)}>
            <Settings2 />
            Manage
          </Button>
        </>
      }
    >
      {mode === "Chains" ? (
        <div className="grid grid-cols-3 gap-3">
          {chains.map((c) => (
            <button
              key={c.chain}
              onClick={() => onOpen({ kind: "chain", chain: c.chain, scope })}
              className="flex flex-col gap-3 rounded-lg border border-hairline bg-[#fdfcfa] p-3.5 text-left transition-colors hover:border-[#d6d0c4] hover:bg-card"
              data-testid="chain-card"
            >
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: CHAIN_COLOR[c.chain] }} />
                <span className="truncate text-[13px] font-semibold">{c.chain}</span>
                <span className="num text-[11.5px] text-muted-foreground">{c.count} {c.count === 1 ? "machine" : "machines"}</span>
                <Chip tone={c.multiplier >= 1.05 ? "ok" : c.multiplier <= 0.9 ? "warn" : "muted"} className="num ml-auto">
                  {c.multiplier.toFixed(1)}× fleet
                </Chip>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="num text-[22px] leading-none font-medium tracking-[-0.04em]">{money(c.revenue)}</span>
                <span className="num text-[12px] text-muted-foreground">{money(c.perDay)}/day</span>
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                <dt className="text-muted-foreground">P&L / machine</dt>
                <dd className="num text-right">{money(c.plPerMachine)}</dd>
                {c.count > 1 ? (
                  <>
                    <dt className="text-muted-foreground">Best</dt>
                    <dd className="truncate text-right">
                      {c.best.m.venue} <span className="num text-muted-foreground">{money(c.best.pd)}/d</span>
                    </dd>
                    <dt className="text-muted-foreground">Slowest</dt>
                    <dd className="truncate text-right">
                      {c.worst.m.venue} <span className="num text-muted-foreground">{money(c.worst.pd)}/d</span>
                    </dd>
                  </>
                ) : (
                  <>
                    <dt className="text-muted-foreground">Machine</dt>
                    <dd className="truncate text-right">{c.best.m.venue}</dd>
                    <dt className="text-muted-foreground">Host share</dt>
                    <dd className="num text-right">{Math.round(c.best.m.hostShare * 100)}%</dd>
                  </>
                )}
              </dl>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {cats.map((c) => (
            <div key={c.category} className="flex flex-col gap-3 rounded-lg border border-hairline bg-[#fdfcfa] p-3.5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-[3px]" style={{ background: CATEGORY_COLOR[c.category] }} />
                <span className="text-[13px] font-semibold">{c.category}</span>
                <span className="num ml-auto text-[11.5px] text-muted-foreground">{Math.round(c.units).toLocaleString("en-US")} units</span>
              </div>
              <span className="num text-[22px] leading-none font-medium tracking-[-0.04em]">{money(c.revenue)}</span>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                <dt className="text-muted-foreground">Gross profit</dt>
                <dd className="num text-right">{money(c.profit)}</dd>
                <dt className="text-muted-foreground">Margin</dt>
                <dd className="num text-right">{pct(c.margin)}</dd>
                <dt className="text-muted-foreground">Top</dt>
                <dd className="truncate text-right">{c.top}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
      <Dialog open={manage} onOpenChange={setManage}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Groups</DialogTitle>
          </DialogHeader>
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {CHAINS.map((c) => (
              <li key={c} className="flex items-center gap-2 px-3 py-2 text-[13px]">
                <span className="size-2.5 rounded-[3px]" style={{ background: CHAIN_COLOR[c] }} />
                <span className="font-medium">{c}</span>
                <span className="ml-auto text-[12px] text-muted-foreground">
                  {c === "Independents" ? "Everything else" : `Venue starts with “${c}”`}
                </span>
                <span className="num w-6 text-right text-[12px]">{ms.filter((m) => m.chain === c).length}</span>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="self-start" onClick={() => setManage(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Top 10 machines
// ---------------------------------------------------------------------------

const EVENT_STROKE = { offline: "#bf4a3c", restock: "#3f8f53", new: "#3f6fb0" } as const

function TopMachines({ ms, onOpen }: { ms: FleetMachine[]; onOpen: (t: DrawerTarget) => void }) {
  const [period, setPeriod] = React.useState<7 | 30 | 90>(30)
  const [mode, setMode] = React.useState<"Daily" | "Cumulative">("Daily")
  const [focus, setFocus] = React.useState(0)
  const from = DAYS - period
  const top = [...ms].sort((a, b) => machineRevenue(b, from, DAYS) - machineRevenue(a, from, DAYS)).slice(0, 10)
  const med = median(ms.map((m) => perDay(m, from, DAYS)).filter((x) => x > 0))
  const events = eventsFor(top, from)
  const acc = top.map(() => 0)
  const data = Array.from({ length: period }, (_, i) => {
    const d = from + i
    const row: Record<string, string | number> = { day: dayLabel(d) }
    top.forEach((m, k) => {
      acc[k]! += m.rev[d]!
      row[`m${k}`] = Math.round(mode === "Daily" ? m.rev[d]! : acc[k]!)
    })
    row.median = Math.round(mode === "Daily" ? med : med * (i + 1))
    return row
  })
  const f = Math.min(focus, top.length - 1)
  const order = top.map((_, k) => k).filter((k) => k !== f).concat(f)

  return (
    <Section
      title="Top 10 machines"
      ask="Which machines went quiet this week?"
      controls={
        <>
          <Seg value={mode} onChange={setMode} options={["Daily", "Cumulative"] as const} />
          <Seg value={period} onChange={setPeriod} options={[7, 30, 90] as const} label={(p) => `${p}d`} />
        </>
      }
    >
      <div className="grid grid-cols-[1fr_260px] gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-copper" />
              {top[f]?.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-[#d9d3c7]" />
              Other top machines
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#8c877c]" />
              Fleet median {money(med)}/day
            </span>
            {events.map((e) => (
              <span key={e.label + e.d} className="flex items-center gap-1.5">
                <span className="h-3 w-0.5" style={{ background: EVENT_STROKE[e.kind] }} />
                {e.label}
              </span>
            ))}
          </div>
          <ChartContainer config={{}} className="aspect-auto h-[260px] w-full">
            <LineChart data={data} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#efece5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} width={48} fontSize={11} tickFormatter={(v) => fmtAxis(v, "money")} />
              {events.map((e) => (
                <ReferenceLine key={e.label + e.d} x={dayLabel(e.d)} stroke={EVENT_STROKE[e.kind]} strokeOpacity={0.55} strokeDasharray="2 3" />
              ))}
              <RTooltip
                cursor={{ stroke: "#d6d0c4" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-[11.5px] shadow-md">
                      <div className="font-medium">{label}</div>
                      <div className="mt-1 flex justify-between gap-4">
                        <span className="text-muted-foreground">{top[f]?.venue}</span>
                        <span className="num">{money(Number(payload.find((p) => p.dataKey === `m${f}`)?.value ?? 0))}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Fleet median</span>
                        <span className="num">{money(Number(payload.find((p) => p.dataKey === "median")?.value ?? 0))}</span>
                      </div>
                    </div>
                  ) : null
                }
              />
              <Line dataKey="median" stroke="#8c877c" strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              {order.map((k) => (
                <Line
                  key={k}
                  dataKey={`m${k}`}
                  type="monotone"
                  stroke={k === f ? "#b3631c" : "#d9d3c7"}
                  strokeWidth={k === f ? 2.25 : 1.25}
                  dot={false}
                  activeDot={k === f ? { r: 4 } : false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </div>
        <ol className="flex flex-col">
          {top.map((m, k) => (
            <li key={m.id}>
              <button
                onMouseEnter={() => setFocus(k)}
                onFocus={() => setFocus(k)}
                onClick={() => onOpen({ kind: "machine", id: m.id })}
                className={cn("grid w-full grid-cols-[18px_1fr_auto] items-center gap-2 rounded-md px-2 py-[5px] text-left text-[12.5px]", k === f ? "bg-copper-tint/60" : "hover:bg-muted")}
              >
                <span className="num text-[11px] text-muted-foreground">{k + 1}</span>
                <span className="truncate">{m.venue}</span>
                <span className="num">{money(machineRevenue(m, from, DAYS))}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Heatmap, data quality, lost sales
// ---------------------------------------------------------------------------

function WhenMachinesSell({ ms }: { ms: FleetMachine[] }) {
  const [period, setPeriod] = React.useState<7 | 30 | 90>(30)
  const grid = heatmap(ms, DAYS - period, DAYS)
  return (
    <Section className="h-full" title="When machines sell" ask="When do my machines sell?" controls={<Seg value={period} onChange={setPeriod} options={[7, 30, 90] as const} label={(p) => `${p}d`} />}>
      <Heatmap grid={grid} />
    </Section>
  )
}

function DataQuality({ ms, period }: { ms: FleetMachine[]; period: Period }) {
  const { openSheet } = useAsk()
  const w = periodWindow(period)
  const t = totals(ms, w.from, w.to)
  if (t.unmapped < 1) return null
  const orgs = [...new Set(ms.map((m) => m.org))]
  const products = orgs.reduce((s, o) => s + Math.max(1, Math.round((1 - o.setup.salesMappedShare) * 30)), 0)
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#ead9ad] bg-[#fbf5e6] px-4 py-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-[#f5ecd3] text-warn">
        <AlertTriangle className="size-4" />
      </span>
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{money(t.unmapped)} of revenue has no cost basis</div>
        <div className="text-[12px] text-[#6d5a2b]">
          {products} {products === 1 ? "product" : "products"} not mapped · profit overstated until fixed
        </div>
      </div>
      <Button size="sm" variant="ghost" className="text-[#6d5a2b]" onClick={() => openSheet("Which products have no cost basis?", "Analytics")}>
        <Sparkles />
        Ask about this
      </Button>
      <Link href="/pnl" className="inline-flex h-7 items-center rounded-md bg-ink px-3 text-[12.5px] font-medium text-white">
        Map products
      </Link>
    </div>
  )
}

function LostSales({ ms, period, onOpen }: { ms: FleetMachine[]; period: Period; onOpen: (t: DrawerTarget) => void }) {
  const n = periodWindow(period).n
  const rows = lostSales(ms, n)
  const total = rows.reduce((s, r) => s + r.lost, 0)
  const top = rows.slice(0, 5)
  const max = Math.max(1, ...top.map((r) => r.lost))
  return (
    <Section className="h-full" title="Lost sales from empty lanes" ask="Which lanes are out of stock right now, by venue?">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="num text-[28px] leading-none font-medium tracking-[-0.04em]">{money(total)}</span>
          <span className="text-[12px] text-muted-foreground">est. over {periodLabel(period)}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {top.map((r) => (
            <li key={r.m.id}>
              <button onClick={() => onOpen({ kind: "machine", id: r.m.id })} className="grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-left text-[12.5px]">
                <span className="truncate">{r.m.venue}</span>
                <span className="num text-right">{money(r.lost)}</span>
                <div className="col-span-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1ede5]">
                    <div className="h-full rounded-full bg-bad/70" style={{ width: `${(r.lost / max) * 100}%` }} />
                  </div>
                  <span className="num w-20 text-right text-[11px] text-muted-foreground">{r.laneDays} lane-days</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Revenue over time
// ---------------------------------------------------------------------------

function RevenueOverTime({ ms }: { ms: FleetMachine[] }) {
  const [range, setRange] = React.useState("all")
  const [machine, setMachine] = React.useState("all")
  const [client, setClient] = React.useState("all")
  const [product, setProduct] = React.useState("all")
  const [fromDeploy, setFromDeploy] = React.useState(false)
  const [metric, setMetric] = React.useState<"Revenue" | "Gross profit">("Revenue")
  const [mode, setMode] = React.useState<"Daily" | "Cumulative">("Daily")

  let sel = ms
  if (machine !== "all") sel = sel.filter((m) => m.id === machine)
  if (client !== "all") sel = sel.filter((m) => m.chain === client)
  const pIdx = product === "all" ? -1 : PRODUCTS.findIndex((p) => p.name === product)
  const value = (m: FleetMachine, r: number) => {
    const base = pIdx >= 0 ? r * m.mix[pIdx]! : r
    if (metric === "Revenue") return base
    const cogs = pIdx >= 0 ? base * PRODUCTS[pIdx]!.cogsRatio * m.org.setup.salesMappedShare : cogsFor(m, r)
    return base - cogs
  }

  let data: Record<string, string | number>[]
  if (fromDeploy) {
    const maxAge = range === "all" ? 180 : Number(range)
    let acc = 0
    data = Array.from({ length: maxAge }, (_, age) => {
      const vals = sel
        .filter((m) => m.deployedAgo > age)
        .map((m) => value(m, m.rev[DAYS - m.deployedAgo + age] ?? 0))
      const v = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      acc += v
      return { x: `Day ${age + 1}`, v: Math.round(mode === "Daily" ? v : acc) }
    })
  } else {
    const n = range === "all" ? DAYS : Number(range)
    let acc = 0
    data = Array.from({ length: n }, (_, i) => {
      const d = DAYS - n + i
      const v = sel.reduce((s, m) => s + value(m, m.rev[d]!), 0)
      acc += v
      return { x: dayLabel(d), v: Math.round(mode === "Daily" ? v : acc) }
    })
  }

  const machineItems = [{ value: "all", label: "All machines" }, ...ms.map((m) => ({ value: m.id, label: m.venue }))]
  const clientItems = [{ value: "all", label: "All clients" }, ...CHAINS.filter((c) => ms.some((m) => m.chain === c)).map((c) => ({ value: c, label: c }))]
  const productItems = [{ value: "all", label: "All products" }, ...PRODUCTS.map((p) => ({ value: p.name, label: p.name }))]
  const rangeItems = [
    { value: "all", label: "All dates" },
    { value: "90", label: "Last 90 days" },
    { value: "30", label: "Last 30 days" },
  ]

  return (
    <Section
      title="Revenue over time"
      ask="How did revenue and gross profit trend by week?"
      controls={
        <>
          <Seg value={metric} onChange={setMetric} options={["Revenue", "Gross profit"] as const} />
          <Seg value={mode} onChange={setMode} options={["Daily", "Cumulative"] as const} />
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MiniSelect value={range} onChange={setRange} items={rangeItems} />
        <MiniSelect value={machine} onChange={setMachine} items={machineItems} className="max-w-52" />
        <MiniSelect value={client} onChange={setClient} items={clientItems} />
        <MiniSelect value={product} onChange={setProduct} items={productItems} className="max-w-52" />
        <label className="ml-auto flex items-center gap-2 text-[12px] text-muted-foreground">
          <Switch size="sm" checked={fromDeploy} onCheckedChange={setFromDeploy} />
          From deployment
        </label>
      </div>
      <SeriesChart kind="line" data={data} x="x" keys={[{ key: "v", color: metric === "Revenue" ? "#b3631c" : "#3f6fb0", label: metric }]} unit="money" height={220} legend={false} />
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Top products and machine performance
// ---------------------------------------------------------------------------

function TopProducts({ ms, period }: { ms: FleetMachine[]; period: Period }) {
  const w = periodWindow(period)
  const rows = productStats(ms, w.from, w.to)
  return (
    <Section title="Top products" ask="Compare Pokémon vs One Piece revenue by month" bodyClassName="p-0">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-muted-foreground">
            <th className="px-4 py-2 text-left font-medium">Product</th>
            <th className="px-2 py-2 text-right font-medium">Units</th>
            <th className="px-2 py-2 text-right font-medium">Revenue</th>
            <th className="px-4 py-2 text-right font-medium">Gross profit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product.name} className="border-t border-hairline">
              <td className="px-4 py-[7px]">
                <span className="flex items-center gap-2">
                  <span className="size-2 shrink-0 rounded-[2px]" style={{ background: CATEGORY_COLOR[r.product.category] }} />
                  <span className="truncate">{r.product.name}</span>
                </span>
              </td>
              <td className="num px-2 text-right">{Math.round(r.units).toLocaleString("en-US")}</td>
              <td className="num px-2 text-right">{money(r.revenue)}</td>
              <td className="num px-4 text-right">{money(r.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

function MachinePerformance({ ms, onOpen }: { ms: FleetMachine[]; onOpen: (t: DrawerTarget) => void }) {
  const [period, setPeriod] = React.useState<Period>(30)
  const [metric, setMetric] = React.useState("revenue")
  const [dir, setDir] = React.useState("best")
  const [count, setCount] = React.useState("10")
  const [open, setOpen] = React.useState<string | null>(null)
  const w = periodWindow(period)
  const rows = ms.map((m) => {
    const rev = machineRevenue(m, w.from, w.to)
    const prev = machineRevenue(m, w.prevFrom, w.prevTo)
    const days = activeDays(m, w.from, w.to) || 1
    return { m, rev, pd: rev / days, units: unitsFor(m, rev), ch: prev > 0 ? rev / prev - 1 : NaN }
  })
  const key = metric === "revenue" ? "rev" : metric === "perday" ? "pd" : "units"
  rows.sort((a, b) => (dir === "best" ? b[key] - a[key] : a[key] - b[key]))
  const shown = count === "all" ? rows : rows.slice(0, Number(count))

  return (
    <Section
      title="Machine performance"
      ask="Which machines went quiet this week?"
      bodyClassName="p-0"
      controls={
        <>
          <MiniSelect value={String(period)} onChange={(v) => setPeriod(v === "all" ? "all" : (Number(v) as Period))} items={PERIODS.map((p) => ({ value: String(p), label: periodLabel(p) }))} />
          <MiniSelect value={metric} onChange={setMetric} items={[{ value: "revenue", label: "Revenue" }, { value: "perday", label: "$/day" }, { value: "units", label: "Units" }]} />
          <MiniSelect value={dir} onChange={setDir} items={[{ value: "best", label: "Best" }, { value: "worst", label: "Worst" }]} />
          <MiniSelect value={count} onChange={setCount} items={[{ value: "10", label: "10" }, { value: "20", label: "20" }, { value: "all", label: "All" }]} />
        </>
      }
    >
      <ul className="divide-y divide-hairline" data-testid="machine-performance">
        {shown.map((r, i) => {
          const isOpen = open === r.m.id
          const spark = Array.from({ length: 14 }, (_, k) => r.m.rev[DAYS - 14 + k]!)
          const topProducts = PRODUCTS.map((p, pi) => ({ p, v: r.m.mix[pi]! })).sort((a, b) => b.v - a.v).slice(0, 3)
          return (
            <li key={r.m.id}>
              <button onClick={() => setOpen(isOpen ? null : r.m.id)} className="grid w-full grid-cols-[28px_1fr_90px_80px_70px_20px] items-center gap-2 px-4 py-2 text-left text-[12.5px] hover:bg-[#fbfaf6]">
                <span className="num text-[11px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate">{r.m.venue}</span>
                  {ms.some((x) => x.org.id !== r.m.org.id) && <span className="block truncate text-[11px] text-muted-foreground">{r.m.org.name}</span>}
                </span>
                <span className="num text-right">{metric === "units" ? Math.round(r.units).toLocaleString("en-US") : money(r.rev)}</span>
                <span className="num text-right text-muted-foreground">{money(r.pd)}/d</span>
                <span className={cn("num text-right text-[12px]", r.ch >= 0 ? "text-ok" : "text-bad")}>
                  {isFinite(r.ch) ? `${r.ch >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(r.ch * 100))}%` : "new"}
                </span>
                <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 bg-[#fbfaf6] px-4 pt-1 pb-3 pl-12 text-[12px]">
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Last 14 days</div>
                    <Sparkline values={spark} />
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] text-muted-foreground">Top products</div>
                    <div className="truncate">{topProducts.map((t) => t.p.name).join(" · ")}</div>
                    <div className="mt-1 text-muted-foreground">
                      {r.m.lanesEmpty} out · {r.m.lanesLow} low · host {Math.round(r.m.hostShare * 100)}%
                    </div>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => onOpen({ kind: "machine", id: r.m.id })}>
                    Details
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  const org = useOperatorOrg()
  const urlScope = useQueryParam("scope")
  const [scopeSel, setScope] = React.useState<string | null>(null)
  const scope = scopeSel ?? (urlScope === "all" || ORGS.some((o) => o.id === urlScope) ? urlScope! : org.id)
  const [period, setPeriod] = React.useState<Period>(30)
  const [drawer, setDrawer] = React.useState<DrawerTarget>(null)
  const ms = scopeMachines(scope)
  const scopeItems = [{ value: "all", label: "All orgs (combined)" }, ...ORGS.map((o) => ({ value: o.id, label: o.name }))]

  const exportCsv = () => {
    const w = periodWindow(period)
    downloadCsv(`sp-analytics-${scope}-${periodLabel(period)}.csv`, [
      ["Machine", "Org", "Chain", "Revenue", "$/day", "Units", "Gross profit"],
      ...ms.map((m) => {
        const r = machineRevenue(m, w.from, w.to)
        return [m.venue, m.org.name, m.chain, r.toFixed(2), perDay(m, w.from, w.to).toFixed(2), Math.round(unitsFor(m, r)), (r - cogsFor(m, r)).toFixed(2)]
      }),
    ])
  }

  return (
    <Page className="max-w-[1400px] pb-20">
      <PageHeader title="Analytics" meta={<MiniSelect value={scope} onChange={setScope} items={scopeItems} className="h-8 min-w-48 text-[13px]" />}>
        <Seg value={period} onChange={setPeriod} options={PERIODS} label={periodLabel} />
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download />
          Export CSV
        </Button>
      </PageHeader>
      <div className="flex flex-col gap-4">
        <Kpis ms={ms} period={period} />
        <Groups ms={ms} scope={scope} onOpen={setDrawer} />
        <TopMachines ms={ms} onOpen={setDrawer} />
        <div className="grid grid-cols-12 items-stretch gap-4">
          <div className="col-span-8">
            <WhenMachinesSell ms={ms} />
          </div>
          <div className="col-span-4">
            <LostSales ms={ms} period={period} onOpen={setDrawer} />
          </div>
        </div>
        <DataQuality ms={ms} period={period} />
        <RevenueOverTime ms={ms} />
        <div className="grid grid-cols-12 items-start gap-4">
          <div className="col-span-5">
            <TopProducts ms={ms} period={period} />
          </div>
          <div className="col-span-7">
            <MachinePerformance ms={ms} onOpen={setDrawer} />
          </div>
        </div>
      </div>
      <AnalyticsDrawer target={drawer} onClose={() => setDrawer(null)} />
    </Page>
  )
}
