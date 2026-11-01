"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

export type SeriesKey = { key: string; color: string; label?: string }
export type Unit = "money" | "count"

export function fmtAxis(v: number, unit: Unit) {
  const abs = Math.abs(v)
  const s = abs >= 1000 ? `${(v / 1000).toFixed(abs >= 10000 ? 0 : 1)}k` : String(Math.round(v))
  return unit === "money" ? `$${s}` : s
}

export function fmtValue(v: number, unit: Unit) {
  return unit === "money" ? money(v) : Math.round(v).toLocaleString("en-US")
}

/** Recharts needs CSS-safe keys for shadcn's color variables, so series are re-keyed s0..sN. */
function rekey(data: Record<string, string | number>[], x: string, keys: SeriesKey[]) {
  const config: ChartConfig = {}
  keys.forEach((k, i) => (config[`s${i}`] = { label: k.label ?? k.key, color: k.color }))
  const rows = data.map((d) => {
    const r: Record<string, string | number> = { [x]: d[x]! }
    keys.forEach((k, i) => (r[`s${i}`] = d[k.key] ?? 0))
    return r
  })
  return { config, rows }
}

export function Legend({ keys, className }: { keys: SeriesKey[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground", className)}>
      {keys.map((k) => (
        <span key={k.key} className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px]" style={{ background: k.color }} />
          {k.label ?? k.key}
        </span>
      ))}
    </div>
  )
}

export function SeriesChart({
  kind,
  data,
  x,
  keys,
  unit,
  height = 220,
  legend = true,
}: {
  kind: "line" | "stacked" | "bar"
  data: Record<string, string | number>[]
  x: string
  keys: SeriesKey[]
  unit: Unit
  height?: number
  legend?: boolean
}) {
  const { config, rows } = rekey(data, x, keys)
  const axis = {
    tickLine: false,
    axisLine: false,
    tickMargin: 8,
    fontSize: 11,
  } as const
  const tooltip = (
    <ChartTooltip
      cursor={kind === "line" ? { stroke: "var(--hairline)" } : { fill: "#f4f1ea" }}
      content={<ChartTooltipContent className="min-w-44 gap-2" indicator={kind === "line" ? "line" : "dot"} valueFormatter={(v: number) => fmtValue(v, unit)} />}
    />
  )
  return (
    <div className="flex flex-col gap-2">
      {legend && keys.length > 1 && <Legend keys={keys} />}
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        {kind === "line" ? (
          <LineChart data={rows} margin={{ left: 4, right: 8, top: 6 }}>
            <CartesianGrid vertical={false} stroke="#efece5" />
            <XAxis dataKey={x} {...axis} minTickGap={24} />
            <YAxis {...axis} width={48} tickFormatter={(v) => fmtAxis(v, unit)} />
            {tooltip}
            {keys.map((_, i) => (
              <Line key={i} dataKey={`s${i}`} type="monotone" stroke={`var(--color-s${i})`} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={rows} margin={{ left: 4, right: 8, top: 6 }}>
            <CartesianGrid vertical={false} stroke="#efece5" />
            <XAxis dataKey={x} {...axis} minTickGap={12} />
            <YAxis {...axis} width={48} tickFormatter={(v) => fmtAxis(v, unit)} />
            {tooltip}
            {keys.map((_, i) => (
              <Bar
                key={i}
                dataKey={`s${i}`}
                stackId={kind === "stacked" ? "a" : undefined}
                fill={`var(--color-s${i})`}
                stroke="#fff"
                strokeWidth={kind === "stacked" ? 1 : 0}
                radius={kind === "stacked" ? (i === keys.length - 1 ? [3, 3, 0, 0] : 0) : [3, 3, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ChartContainer>
    </div>
  )
}

export function HBars({ data, unit, color = "#b3631c" }: { data: { label: string; value: number }[]; unit: Unit; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="flex flex-col gap-1.5">
      {data.map((d) => (
        <li key={d.label} className="grid grid-cols-[minmax(0,180px)_1fr_64px] items-center gap-3 text-[12.5px]" title={`${d.label}: ${fmtValue(d.value, unit)}`}>
          <span className="truncate">{d.label}</span>
          <div className="h-3 overflow-hidden rounded-r-[3px]">
            <div className="h-full rounded-r-[3px]" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          <span className="num text-right">{fmtValue(d.value, unit)}</span>
        </li>
      ))}
    </ul>
  )
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
// sequential copper ramp, light -> dark
const RAMP = ["#f7f1e8", "#f1e0c8", "#e8c9a2", "#dba872", "#c98444", "#b3631c", "#8a4913"]

export function Heatmap({ grid, compact }: { grid: number[][]; compact?: boolean }) {
  const max = Math.max(1, ...grid.flat())
  const shade = (v: number) => RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 0.01)))]!
  const totals = grid.map((r) => r.reduce((a, b) => a + b, 0))
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("grid items-center gap-[3px]", compact ? "grid-cols-[30px_repeat(24,minmax(0,1fr))_44px]" : "grid-cols-[36px_repeat(24,minmax(0,1fr))_56px]")}>
        {grid.map((row, d) => (
          <React.Fragment key={d}>
            <span className="text-[11px] text-muted-foreground">{DAY_NAMES[d]}</span>
            {row.map((v, h) => (
              <div
                key={h}
                title={`${DAY_NAMES[d]} ${h % 12 || 12}${h < 12 ? "am" : "pm"}: ${v} units`}
                className={cn("rounded-[3px] transition-transform hover:scale-110", compact ? "h-4" : "h-6")}
                style={{ background: shade(v) }}
              />
            ))}
            <span className="num text-right text-[11px]">{totals[d]!.toLocaleString("en-US")}</span>
          </React.Fragment>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="num text-center text-[10px] text-muted-foreground">
            {h % 6 === 0 ? (h === 0 ? "12a" : h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`) : ""}
          </span>
        ))}
        <span />
      </div>
      <div className="flex items-center gap-1.5 self-end text-[11px] text-muted-foreground">
        <span>Fewer units</span>
        {RAMP.map((c) => (
          <span key={c} className="h-2.5 w-4 rounded-[2px]" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

export function DataTable({ columns, rows, numeric = [], maxRows }: { columns: string[]; rows: (string | number)[][]; numeric?: number[]; maxRows?: number }) {
  const shown = maxRows ? rows.slice(0, maxRows) : rows
  return (
    <div className="overflow-hidden rounded-lg border border-hairline">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="bg-[#fbfaf7] text-muted-foreground">
            {columns.map((c, i) => (
              <th key={c} className={cn("px-3 py-2 font-medium", numeric.includes(i) ? "text-right" : "text-left")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r, ri) => (
            <tr key={ri} className="border-t border-hairline">
              {r.map((c, ci) => (
                <td key={ci} className={cn("px-3 py-1.5", numeric.includes(ci) ? "num text-right" : "", ci === 0 && "max-w-[240px] truncate")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {maxRows && rows.length > maxRows && (
        <div className="border-t border-hairline px-3 py-1.5 text-[11.5px] text-muted-foreground">+{rows.length - maxRows} more</div>
      )}
    </div>
  )
}
