"use client"

import {
  AlertTriangle,
  Check,
  CircleDashed,
  CirclePlus,
  Landmark,
  MoonStar,
  PlugZap,
  RotateCcw,
  WifiOff,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ButtonLink } from "@/components/sp/button-link"
import { Chip, Dot, Meter, Page, PageHeader, Panel, Spark, Stat, type Tone } from "@/components/sp/ui"
import type { Machine, Org } from "@/lib/data"
import { money, pct } from "@/lib/format"
import { orgStats, setupSteps } from "@/lib/health"
import { useOperatorOrg, useStore } from "@/lib/store"
import { useBank } from "@/lib/bank-store"
import { HOUR, NOW, fmtDate, fmtStamp } from "@/lib/time"
import { cn } from "@/lib/utils"

type Alert = {
  key: string
  severity: number
  tone: Tone
  icon: LucideIcon
  title: string
  machine?: Machine
  detail: string
  action: { label: string; href: string }
}

function alertsFor(org: Org): Alert[] {
  const out: Alert[] = []
  for (const m of org.machines) {
    if (m.status === "offline" && m.offlineHours >= 24) {
      out.push({
        key: `${m.id}-off`,
        severity: 0,
        tone: "bad",
        icon: WifiOff,
        title: `Offline ${m.offlineHours}h`,
        machine: m,
        detail: `Last heartbeat ${fmtStamp(NOW - m.offlineHours * HOUR)}`,
        action: { label: "Message SP", href: "/support" },
      })
    }
    if (m.fault) {
      out.push({
        key: `${m.id}-fault`,
        severity: 1,
        tone: "bad",
        icon: AlertTriangle,
        title: `Lane ${m.fault.lane} fault`,
        machine: m,
        detail: m.fault.detail,
        action: { label: "View", href: "/machines" },
      })
    }
    if (m.status === "online" && m.lastSaleHoursAgo > m.usualGapHours * 2) {
      out.push({
        key: `${m.id}-quiet`,
        severity: 2,
        tone: "warn",
        icon: MoonStar,
        title: "Quiet machine",
        machine: m,
        detail: `Online, but no sales in ${Math.round(m.lastSaleHoursAgo)}h — usually under ${m.usualGapHours}h`,
        action: { label: "View", href: "/machines" },
      })
    }
    if (m.addedFromVtmMs) {
      out.push({
        key: `${m.id}-new`,
        severity: 3,
        tone: "copper",
        icon: CirclePlus,
        title: "New machine from VTM",
        machine: m,
        detail: `Auto-added ${fmtDate(m.addedFromVtmMs)} · no host deal yet`,
        action: { label: "Set up", href: "/hosts" },
      })
    }
  }
  return out.sort((a, b) => a.severity - b.severity)
}

const TONE_ICON: Record<Tone, string> = {
  bad: "bg-[#f6e3df] text-bad",
  warn: "bg-[#f5ecd3] text-warn",
  ok: "bg-[#e2efe3] text-ok",
  copper: "bg-copper-tint text-copper",
  muted: "bg-muted text-muted-foreground",
}

function SetupChecklist({ org }: { org: Org }) {
  const steps = setupSteps(org)
  const done = steps.filter((s) => s.done).length
  if (done === steps.length) return null
  const s = org.setup

  const detail: Record<string, React.ReactNode> = {
    vtm: s.vtmConnectedMs ? (
      <span className="text-muted-foreground">Connected {fmtDate(s.vtmConnectedMs)}</span>
    ) : (
      <Button size="xs" variant="outline">Connect</Button>
    ),
    mapped: (
      <div className="flex w-full items-center gap-2">
        <Meter value={s.salesMappedShare} max={0.95} tone={s.salesMappedShare >= 0.95 ? "ok" : "copper"} className="max-w-28" />
        <span className="num text-muted-foreground">{pct(s.salesMappedShare)} / 95%</span>
      </div>
    ),
    purchases: s.purchasesEntered ? (
      <span className="text-muted-foreground">Up to date</span>
    ) : (
      <ButtonLink size="xs" variant="outline" href="/pnl">
        Enter costs
      </ButtonLink>
    ),
    hosts: (
      <div className="flex w-full items-center gap-2">
        <Meter value={s.hostDeals.set} max={s.hostDeals.total} tone="copper" className="max-w-20 min-w-0 flex-1" />
        <span className="num whitespace-nowrap text-muted-foreground">
          {s.hostDeals.set} of {s.hostDeals.total}
        </span>
        <ButtonLink size="xs" variant="outline" className="ml-auto" href="/hosts">
          Set deals
        </ButtonLink>
      </div>
    ),
  }

  return (
    <Panel
      className="mb-4"
      title="Pilot setup"
      action={
        <>
          <span className="num text-[12px] text-muted-foreground">
            {done} of {steps.length}
          </span>
          <div className="flex gap-1">
            {steps.map((st) => (
              <span key={st.key} className={cn("h-1.5 w-6 rounded-full", st.done ? "bg-ok" : "bg-[#e6e1d7]")} />
            ))}
          </div>
          <Chip className="ml-2">Day {org.day} of 90</Chip>
        </>
      }
    >
      <ol className="grid grid-cols-4 divide-x divide-hairline">
        {steps.map((st, i) => (
          <li key={st.key} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              {st.done ? (
                <span className="flex size-[18px] items-center justify-center rounded-full bg-ok text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : (
                <span className="num flex size-[18px] items-center justify-center rounded-full border border-dashed border-[#bdb5a6] text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
              )}
              <span className={st.done ? "text-muted-foreground" : ""}>{st.label}</span>
            </div>
            <div className="flex min-h-6 items-center pl-[26px] text-[12px]">{detail[st.key]}</div>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function RestockList({ org }: { org: Org }) {
  const { restocked, toggleRestocked } = useStore()
  const rows = org.machines
    .filter((m) => m.lanesEmpty >= 1 || m.lanesLow >= 4)
    .sort((a, b) => b.lanesEmpty * 3 + b.lanesLow - (a.lanesEmpty * 3 + a.lanesLow))
    .slice(0, 6)
    .sort((a, b) => Number(!!restocked[a.id]) - Number(!!restocked[b.id]))

  return (
    <Panel
      title="Needs you today"
      count={rows.filter((r) => !restocked[r.id]).length}
      action={
        <ButtonLink size="xs" variant="ghost" href="/restocks">
          Plan route
        </ButtonLink>
      }
    >
      <ul className="divide-y divide-hairline">
        {rows.map((m) => {
          const fill = 1 - (m.lanesEmpty + m.lanesLow * 0.5) / m.lanesTotal
          const done = !!restocked[m.id]
          return (
            <li key={m.id} className={cn("flex gap-3 px-4 py-3 transition-opacity", done && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-[13px] font-medium", done && "line-through")}>{m.venue}</span>
                  <span className="num text-[11px] text-muted-foreground">{m.id}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {m.lanesEmpty > 0 && <Chip tone="bad">{m.lanesEmpty} out</Chip>}
                  {m.lanesLow > 0 && <Chip tone="warn">{m.lanesLow} low</Chip>}
                  <Meter value={fill} tone={fill < 0.75 ? "warn" : "ok"} className="w-20" />
                  <span className="num text-[11px] text-muted-foreground">{pct(fill)}</span>
                </div>
                <div className="mt-1.5 truncate text-[12px] text-muted-foreground">
                  {m.restock.map((r) => `${r.name} ×${r.qty}`).join(" · ")}
                </div>
              </div>
              <Button
                size="sm"
                variant={done ? "ghost" : "outline"}
                className="self-center"
                onClick={() => toggleRestocked(m.id)}
              >
                {done ? <RotateCcw /> : <Check />}
                {done ? "Undo" : "Restocked"}
              </Button>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function TopMachines({ org }: { org: Org }) {
  const rows = [...org.machines].sort((a, b) => b.revenueWeek - a.revenueWeek).slice(0, 5)
  const max = rows[0]?.revenueWeek ?? 1
  return (
    <Panel
      title="Top machines, 7 days"
      action={
        <ButtonLink size="xs" variant="ghost" href="/machines">
          All {org.machines.length}
        </ButtonLink>
      }
    >
      <ul className="divide-y divide-hairline">
        {rows.map((m) => (
          <li key={m.id} className="grid grid-cols-[1fr_2fr_80px] items-center gap-4 px-4 py-2.5 text-[13px]">
            <span className="truncate">{m.venue}</span>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f1ede5]">
              <div className="h-full rounded-full bg-copper/80" style={{ width: `${(m.revenueWeek / max) * 100}%` }} />
            </div>
            <span className="num text-right">{money(m.revenueWeek)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function OperatorHome() {
  const org = useOperatorOrg()
  const st = orgStats(org)
  const { inbox } = useBank()
  const alerts = alertsFor(org)
  if (inbox.length) {
    alerts.push({
      key: "bank",
      severity: 4,
      tone: "copper",
      icon: Landmark,
      title: `${inbox.length} new bank transactions to categorize`,
      detail: `${inbox.filter((t) => t.confidence >= 0.9).length} ready to accept · ${inbox.filter((t) => t.match).length} match records already in SP`,
      action: { label: "Review", href: "/money/bank" },
    })
  }
  const vends = Math.round(st.revenueToday / 6.4)

  return (
    <Page>
      <PageHeader
        title="Today"
        meta={
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Dot tone={org.vtmSyncCurrent ? "ok" : "warn"} />
            {org.vtmSyncCurrent ? "VTM synced 4m ago" : "VTM sync stale"}
          </span>
        }
      >
        <ButtonLink variant="outline" size="sm" href="/machines">
          <PlugZap />
          Machines
        </ButtonLink>
        <ButtonLink size="sm" href="/restocks">
          Start restock run
        </ButtonLink>
      </PageHeader>

      <SetupChecklist org={org} />

      <div className="mb-4 grid grid-cols-5 gap-3">
        <Stat label="Revenue today" value={money(st.revenueToday)} sub={`${vends} vends`} />
        <Stat label="This week" value={money(st.revenueWeek)}>
          <Spark values={org.daily14.slice(7)} className="h-7" />
        </Stat>
        <Stat
          label="Machines online"
          value={
            <>
              {st.online}
              <span className="text-muted-foreground">/{st.machines}</span>
            </>
          }
          tone={st.online === st.machines ? "ok" : "bad"}
        />
        <Stat label="Lanes low" value={st.low} sub={`of ${st.lanes}`} tone={st.low > 0 ? "warn" : "ok"} />
        <Stat label="Lanes out" value={st.empty} sub={`of ${st.lanes}`} tone={st.empty > 0 ? "bad" : "ok"} />
      </div>

      <div className="grid grid-cols-12 items-start gap-4">
        <div className="col-span-7 flex flex-col gap-4">
        <Panel title="Alerts" count={alerts.length}>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-muted-foreground">
              <CircleDashed className="size-4" /> All machines normal
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {alerts.map((a) => (
                <li key={a.key} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_ICON[a.tone])}>
                    <a.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold">{a.title}</span>
                      {a.machine && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="truncate">{a.machine.venue}</span>
                          <span className="num text-[11px] text-muted-foreground">{a.machine.id}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{a.detail}</div>
                  </div>
                  <ButtonLink size="sm" variant="outline" href={a.action.href}>
                    {a.action.label}
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <TopMachines org={org} />
        </div>
        <div className="col-span-5">
          <RestockList org={org} />
        </div>
      </div>
    </Page>
  )
}
