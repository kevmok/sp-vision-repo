"use client"

import { Download, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Page, PageHeader, Panel, Stat } from "@/components/sp/ui"
import { ORGS, type Org } from "@/lib/data"
import { money, pct } from "@/lib/format"
import { orgStats } from "@/lib/health"
import { useOperatorOrg } from "@/lib/store"

type Config = {
  title: string
  action?: { label: string; icon?: "plus" | "download" }
  stats: (org: Org) => [string, string][]
  table: string[]
  side?: string
  chart?: boolean
}

const CONFIGS: Record<string, Config> = {
  restocks: {
    title: "Restocks",
    action: { label: "New run", icon: "plus" },
    stats: (o) => {
      const s = orgStats(o)
      const due = o.machines.filter((m) => m.lanesEmpty >= 1 || m.lanesLow >= 4)
      return [
        ["Machines due", String(due.length)],
        ["Units to load", String(due.reduce((a, m) => a + m.restock.reduce((b, r) => b + r.qty, 0), 0))],
        ["Lanes out", String(s.empty)],
        ["Avg fill", pct(1 - (s.empty + s.low * 0.5) / s.lanes)],
      ]
    },
    table: ["Run", "Machines", "Units", "Driver", "Status"],
    side: "Load list",
  },
  pnl: {
    title: "P&L",
    action: { label: "Export", icon: "download" },
    stats: (o) => {
      const rev = orgStats(o).revenueWeek * 4
      return [
        ["Revenue, 4 wk", money(rev)],
        ["Cost of goods", money(rev * 0.41)],
        ["Host payouts", money(rev * 0.15)],
        ["Net profit", money(rev * 0.44)],
      ]
    },
    table: ["Machine", "Revenue", "COGS", "Host", "Profit"],
    chart: true,
  },
  statements: {
    title: "Statements",
    action: { label: "Export", icon: "download" },
    stats: (o) => {
      const rev = orgStats(o).revenueWeek * 4.3
      return [
        ["October revenue", money(rev)],
        ["Host statements", String(o.setup.hostDeals.total)],
        ["Payouts due", money(rev * 0.15)],
        ["Closed months", "2"],
      ]
    },
    table: ["Month", "Revenue", "Host payouts", "Status"],
  },
  "sales-tax": {
    title: "Sales tax",
    stats: (o) => {
      const rev = orgStats(o).revenueWeek * 4.3
      return [
        ["Collected, Oct", money(rev * 0.07)],
        ["Jurisdictions", "3"],
        ["Next filing", "Nov 20"],
      ]
    },
    table: ["Jurisdiction", "Rate", "Taxable sales", "Due"],
  },
  hosts: {
    title: "Hosts",
    action: { label: "Add host", icon: "plus" },
    stats: (o) => [
      ["Hosts", String(o.machines.length)],
      ["Deals set", `${o.setup.hostDeals.set} of ${o.setup.hostDeals.total}`],
      ["Payouts this month", money(orgStats(o).revenueWeek * 4.3 * 0.15)],
    ],
    table: ["Host", "Machines", "Deal", "Last payout"],
    side: "Deal terms",
  },
  team: {
    title: "Team",
    action: { label: "Invite", icon: "plus" },
    stats: (o) => [
      ["Members", String(o.operators.length)],
      ["Active this week", String(o.operators.length)],
      ["Pending invites", "0"],
    ],
    table: ["Name", "Role", "Last active"],
  },
  growth: {
    title: "Growth",
    stats: (o) => {
      const s = orgStats(o)
      const median = [...ORGS.map((x) => orgStats(x).revenuePerMachine)].sort((a, b) => a - b)[5]!
      return [
        ["Revenue / machine / wk", money(s.revenuePerMachine)],
        ["Pilot median", money(median)],
        ["Locations in pipeline", "2"],
      ]
    },
    table: ["Location", "Type", "Est. weekly", "Stage"],
    chart: true,
  },
  plays: {
    title: "Pilot plays",
    stats: () => [
      ["Open plays", "11"],
      ["Done this week", "6"],
      ["Overdue", "2"],
      ["Avg time to done", "1.8d"],
    ],
    table: ["Play", "Operator", "Owner", "Due"],
    side: "Playbook",
  },
}

function SkeletonTable({ columns }: { columns: string[] }) {
  return (
    <div>
      <div className="grid border-b border-hairline px-4 py-2.5" style={{ gridTemplateColumns: `2fr repeat(${columns.length - 1}, 1fr)` }}>
        {columns.map((c) => (
          <span key={c} className="text-[12px] font-medium text-muted-foreground">
            {c}
          </span>
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, r) => (
        <div
          key={r}
          className="grid items-center border-b border-hairline px-4 py-3.5 last:border-0"
          style={{ gridTemplateColumns: `2fr repeat(${columns.length - 1}, 1fr)` }}
        >
          {columns.map((c, i) => (
            <Skeleton
              key={c}
              className="h-3 rounded bg-[#efece5]"
              style={{ width: i === 0 ? `${55 + ((r * 17) % 35)}%` : `${35 + ((r * 13 + i * 7) % 30)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SkeletonChart() {
  const bars = [42, 55, 48, 61, 58, 66, 52, 70, 64, 73, 69, 78]
  return (
    <div className="flex h-44 items-end gap-2 px-4 pt-4 pb-3">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-[#efe6d8]" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

export function Placeholder({ id }: { id: keyof typeof CONFIGS | string }) {
  const org = useOperatorOrg()
  const c = CONFIGS[id]!
  const stats = c.stats(org)
  return (
    <Page>
      <PageHeader title={c.title}>
        {c.action && (
          <Button size="sm" variant={c.action.icon === "download" ? "outline" : "default"}>
            {c.action.icon === "download" ? <Download /> : <Plus />}
            {c.action.label}
          </Button>
        )}
      </PageHeader>
      <div className="mb-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
        {stats.map(([label, value]) => (
          <Stat key={label} label={label} value={value} />
        ))}
      </div>
      {c.chart && (
        <Panel className="mb-4" title="Last 12 weeks">
          <SkeletonChart />
        </Panel>
      )}
      <div className="grid grid-cols-12 items-start gap-4">
        <Panel className={c.side ? "col-span-8" : "col-span-12"}>
          <SkeletonTable columns={c.table} />
        </Panel>
        {c.side && (
          <Panel className="col-span-4" title={c.side}>
            <div className="flex flex-col gap-3 p-4">
              {[80, 64, 72, 50, 68].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-7 rounded-md bg-[#efece5]" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3 rounded bg-[#efece5]" style={{ width: `${w}%` }} />
                    <Skeleton className="h-2.5 rounded bg-[#f3f1ec]" style={{ width: `${w - 25}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </Page>
  )
}
