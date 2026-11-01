"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { DataTable, SeriesChart } from "@/components/charts/charts"
import { Chip } from "@/components/sp/ui"
import {
  CHAIN_COLOR,
  DAYS,
  PRODUCTS,
  activeDays,
  cogsFor,
  dayLabel,
  machineRevenue,
  median,
  perDay,
  scopeMachines,
  type FleetMachine,
} from "@/lib/analytics"
import type { Chain } from "@/lib/data"
import { money, pct } from "@/lib/format"
import { useAsk } from "@/lib/ask-store"

export type DrawerTarget = { kind: "machine"; id: string } | { kind: "chain"; chain: Chain; scope: string } | null

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-card px-3 py-2.5">
      <div className="text-[11.5px] text-muted-foreground">{label}</div>
      <div className="num mt-1 text-[18px] leading-none font-medium tracking-[-0.03em]">{value}</div>
      {sub && <div className="mt-1 text-[11.5px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

export function AnalyticsDrawer({ target, onClose }: { target: DrawerTarget; onClose: () => void }) {
  const { openSheet } = useAsk()
  const focusRef = React.useRef<HTMLDivElement>(null)
  const n = 30
  const from = DAYS - n
  const to = DAYS

  let title = ""
  let ms: FleetMachine[] = []
  let chain: Chain | undefined
  if (target?.kind === "machine") {
    const m = scopeMachines("all").find((x) => x.id === target.id)
    if (m) {
      ms = [m]
      title = m.venue
      chain = m.chain
    }
  } else if (target?.kind === "chain") {
    ms = scopeMachines(target.scope).filter((m) => m.chain === target.chain)
    title = target.chain
    chain = target.chain
  }

  const revenue = ms.reduce((s, m) => s + machineRevenue(m, from, to), 0)
  const profit = revenue - ms.reduce((s, m) => s + cogsFor(m, machineRevenue(m, from, to)), 0)
  const days = Math.max(1, ...ms.map((m) => activeDays(m, from, to)))
  const hostOwed = ms.reduce((s, m) => s + machineRevenue(m, from, to) * m.hostShare, 0)
  const hostPct = revenue ? hostOwed / revenue : 0
  const fleetMedian = median(scopeMachines(ms[0]?.org.id ?? "all").map((m) => perDay(m, from, to)).filter((x) => x > 0))
  const data = Array.from({ length: n }, (_, i) => {
    const d = from + i
    const v = ms.reduce((s, m) => s + m.rev[d]!, 0) / (target?.kind === "chain" ? Math.max(1, ms.length) : 1)
    return { day: dayLabel(d), Revenue: Math.round(v), "Fleet median": Math.round(fleetMedian) }
  })
  const products = PRODUCTS.map((p, i) => {
    const r = ms.reduce((s, m) => s + machineRevenue(m, from, to) * m.mix[i]!, 0)
    return { p, r }
  })
    .sort((a, b) => b.r - a.r)
    .slice(0, 5)
  const emptyLaneDays = Math.round(ms.reduce((s, m) => s + (m.lanesEmpty3d * 3.5 + (m.lanesEmpty - m.lanesEmpty3d) * 1.2) * (n / 7) * 0.55, 0))

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-[560px] gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-[560px]" data-testid="analytics-drawer" initialFocus={focusRef}>
        <div ref={focusRef} tabIndex={-1} className="flex items-center gap-2 border-b border-hairline py-3.5 pr-12 pl-5 outline-none">
          {chain && <span className="size-2.5 rounded-[3px]" style={{ background: CHAIN_COLOR[chain] }} />}
          <SheetTitle className="text-[15px] font-semibold">{title}</SheetTitle>
          {target?.kind === "machine" && ms[0] && (
            <>
              <Chip>{ms[0].chain}</Chip>
              <span className="num text-[11.5px] text-muted-foreground">{ms[0].id}</span>
            </>
          )}
          {target?.kind === "chain" && <Chip className="num">{ms.length} {ms.length === 1 ? "machine" : "machines"}</Chip>}
        </div>
        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-4 gap-2">
            <Tile label="Revenue, 30d" value={money(revenue)} />
            <Tile label="$/day" value={money(revenue / days / (target?.kind === "chain" ? Math.max(1, ms.length) : 1))} sub={target?.kind === "chain" ? "per machine" : undefined} />
            <Tile label="Gross profit" value={money(profit)} sub={pct(revenue ? profit / revenue : 0)} />
            <Tile label="Host share" value={money(hostOwed)} sub={pct(hostPct)} />
          </div>
          <section>
            <h3 className="mb-2 text-[12.5px] font-semibold">Daily revenue{target?.kind === "chain" ? " per machine" : ""}</h3>
            <SeriesChart
              kind="line"
              data={data}
              x="day"
              unit="money"
              height={180}
              keys={[
                { key: "Revenue", color: "#b3631c" },
                { key: "Fleet median", color: "#b9b2a5" },
              ]}
            />
          </section>
          <section>
            <h3 className="mb-2 text-[12.5px] font-semibold">Top products</h3>
            <DataTable
              columns={["Product", "Units", "Revenue"]}
              rows={products.map(({ p, r }) => [p.name, Math.round(r / p.unitValue), money(r)])}
              numeric={[1, 2]}
            />
          </section>
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Empty lane-days, 30d" value={String(emptyLaneDays)} />
            <Tile label="Lanes out now" value={String(ms.reduce((s, m) => s + m.lanesEmpty, 0))} />
            <Tile label="Lanes low now" value={String(ms.reduce((s, m) => s + m.lanesLow, 0))} />
          </div>
          {target?.kind === "chain" && (
            <section>
              <h3 className="mb-2 text-[12.5px] font-semibold">Machines</h3>
              <DataTable
                columns={["Machine", "$/day", "Revenue, 30d"]}
                rows={[...ms]
                  .sort((a, b) => perDay(b, from, to) - perDay(a, from, to))
                  .map((m) => [m.venue, money(perDay(m, from, to)), money(machineRevenue(m, from, to))])}
                numeric={[1, 2]}
              />
            </section>
          )}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              onClose()
              openSheet(`Which machines went quiet this week?`, "Analytics")
            }}
          >
            <Sparkles />
            Ask about this
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
