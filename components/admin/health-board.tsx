"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OrgTile, PersonAvatar } from "@/components/sp/brand"
import { BandPill, Chip, Dot, Page, PageHeader, BAND_TONE } from "@/components/sp/ui"
import { useAllHealth, type OrgHealth } from "@/components/admin/use-health"
import type { Band, HealthComponent } from "@/lib/health"
import { SP_TEAM } from "@/lib/data"
import { fmtAgo, fmtDate } from "@/lib/time"
import { cn } from "@/lib/utils"

const SHORT: Record<HealthComponent["key"], string> = {
  usage: "U",
  data: "D",
  machines: "M",
  trend: "S",
  relationship: "R",
}

const COMPONENT_HEADS: [HealthComponent["key"], string][] = [
  ["usage", "Usage"],
  ["data", "Data quality"],
  ["machines", "Machines"],
  ["trend", "Sales trend"],
  ["relationship", "Relationship"],
]

function barTone(r: number) {
  return r >= 0.75 ? "bg-ok" : r >= 0.5 ? "bg-warn" : "bg-bad"
}

export function ComponentBars({ components }: { components: HealthComponent[] }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<div className="flex w-fit items-end gap-[4px]" />}>
        {components.map((c) => {
          const r = c.score / c.max
          return (
            <div key={c.key} className="relative h-[22px] w-[9px] overflow-hidden rounded-[2px] bg-[#eeebe4]">
              <div className={cn("absolute inset-x-0 bottom-0", barTone(r))} style={{ height: `${Math.max(r, 0.04) * 100}%` }} />
            </div>
          )
        })}
      </TooltipTrigger>
      <TooltipContent side="top" className="block px-3 py-2">
        <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
          {components.map((c) => (
            <React.Fragment key={c.key}>
              <span>{c.label}</span>
              <span className="num text-right">
                {c.score}/{c.max}
              </span>
            </React.Fragment>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function SummaryTile({ label, value, total, tone, active, onClick }: { label: string; value: number; total?: number; tone?: "ok" | "warn" | "bad"; active?: boolean; onClick?: () => void }) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3 text-left transition-colors",
        active ? "border-copper shadow-[0_0_0_1px_var(--copper)]" : "border-hairline",
        onClick && "hover:border-[#d6d0c4]"
      )}
    >
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        {tone && <Dot tone={tone} />}
        {label}
      </span>
      <span className="num text-[24px] leading-none font-medium tracking-[-0.03em]">
        {value}
        {total !== undefined && <span className="text-muted-foreground">/{total}</span>}
      </span>
    </Comp>
  )
}

type Filter = "all" | Band

export function HealthBoard() {
  const router = useRouter()
  const rows = useAllHealth()
  const [filter, setFilter] = React.useState<Filter>("all")
  const [dir, setDir] = React.useState<"asc" | "desc">("asc")

  const counts = { Red: 0, Yellow: 0, Green: 0 } as Record<Band, number>
  rows.forEach((r) => counts[r.health.band]++)

  const shown = rows
    .filter((r) => filter === "all" || r.health.band === filter)
    .sort((a, b) => (dir === "asc" ? a.health.score - b.health.score : b.health.score - a.health.score))

  const toggleBand = (b: Band) => setFilter((f) => (f === b ? "all" : b))

  return (
    <Page className="max-w-none">
      <PageHeader title="Operator health" meta={<Chip>Pilot · 10 operators</Chip>} />

      <div className="mb-4 grid grid-cols-5 gap-3">
        <SummaryTile label="Red" value={counts.Red} tone="bad" active={filter === "Red"} onClick={() => toggleBand("Red")} />
        <SummaryTile label="Yellow" value={counts.Yellow} tone="warn" active={filter === "Yellow"} onClick={() => toggleBand("Yellow")} />
        <SummaryTile label="Green" value={counts.Green} tone="ok" active={filter === "Green"} onClick={() => toggleBand("Green")} />
        <SummaryTile label="Activated" value={rows.filter((r) => r.activated).length} total={rows.length} />
        <SummaryTile label="Weekly active" value={rows.filter((r) => r.weeklyActive).length} total={rows.length} />
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="flex h-12 items-center gap-3 border-b border-hairline px-4">
          <ToggleGroup
            value={[filter]}
            onValueChange={(v) => setFilter(((v[0] as Filter | undefined) ?? "all"))}
            variant="outline"
            size="sm"
            spacing={0}
          >
            <ToggleGroupItem value="all" className="px-3 text-[12px] data-pressed:bg-muted">
              All <span className="num ml-1 text-muted-foreground">{rows.length}</span>
            </ToggleGroupItem>
            {(["Red", "Yellow", "Green"] as Band[]).map((b) => (
              <ToggleGroupItem key={b} value={b} className="px-3 text-[12px] data-pressed:bg-muted">
                <Dot tone={BAND_TONE[b]} />
                {b} <span className="num ml-1 text-muted-foreground">{counts[b]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[6%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[6%]" />
            <col className="w-[17%]" />
            <col className="w-[18%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="bg-[#fbfaf7] hover:bg-[#fbfaf7]">
              <TableHead className="pl-4">Operator</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Activation</TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1 font-medium text-foreground"
                  onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  Health
                  {dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                </button>
              </TableHead>
              <TableHead>
                <div className="flex w-fit gap-[4px]">
                  {COMPONENT_HEADS.map(([k, label]) => (
                    <Tooltip key={k}>
                      <TooltipTrigger render={<span className="w-[9px] text-center text-[11px]" />}>{SHORT[k]}</TooltipTrigger>
                      <TooltipContent side="top">{label}</TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TableHead>
              <TableHead>Top signal</TableHead>
              <TableHead>Next play</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="pr-4">Check-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <Row key={r.org.id} r={r} onOpen={() => router.push(`/admin/health/${r.org.id}`)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </Page>
  )
}

function Row({ r, onOpen }: { r: OrgHealth; onOpen: () => void }) {
  const top = r.open[0]
  return (
    <TableRow className="cursor-pointer hover:bg-[#fbfaf6]" onClick={onOpen}>
      <TableCell className="py-3 pl-4">
        <div className="flex items-center gap-2.5">
          <OrgTile name={r.org.name} className="size-7 text-[10px]" />
          <div className="min-w-0">
            <div className="truncate font-medium">{r.org.name}</div>
            <div className="truncate text-[12px] text-muted-foreground">{r.org.city}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="num text-[13px]">
          {r.org.day}
          <span className="text-muted-foreground">/90</span>
        </div>
        <div className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-[#eeebe4]">
          <div className="h-full bg-[#c9b8a0]" style={{ width: `${(r.org.day / 90) * 100}%` }} />
        </div>
      </TableCell>
      <TableCell>
        {r.activated ? (
          <Chip tone="ok">Activated</Chip>
        ) : (
          <Chip tone="warn" className="num">
            Setup {r.setupDone}/4
          </Chip>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="num w-6 text-[15px] font-medium">{r.health.score}</span>
          <BandPill band={r.health.band} />
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <ComponentBars components={r.health.components} />
      </TableCell>
      <TableCell>
        {top ? (
          <div className="min-w-0">
            <div className="truncate font-medium">{top.title}</div>
            <div className="truncate text-[12px] text-muted-foreground">{top.detail}</div>
          </div>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell>
        {top ? (
          <div className="min-w-0">
            <div className="line-clamp-2 leading-snug whitespace-normal">{top.play}</div>
            <div className="truncate text-[12px] text-muted-foreground">{top.owner} · {top.ownerRole}</div>
          </div>
        ) : r.nextCheckpoint ? (
          <div className="min-w-0">
            <div className="truncate">{r.nextCheckpoint.label}</div>
            <div className="truncate text-[12px] text-muted-foreground">{fmtDate(r.nextCheckpoint.at)}</div>
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <PersonAvatar name={SP_TEAM[r.org.owner].name} sp className="size-6 text-[9px]" />
          <span className="truncate">{r.org.owner}</span>
        </div>
      </TableCell>
      <TableCell className="pr-4">
        <div className="text-[13px]">{fmtDate(r.org.lastCheckInMs)}</div>
        <div className="text-[12px] text-muted-foreground">{fmtAgo(r.org.lastCheckInMs)}</div>
      </TableCell>
    </TableRow>
  )
}
