"use client"

import { DataTable, Heatmap, HBars, SeriesChart } from "@/components/charts/charts"
import type { Visual } from "@/lib/ask"

export function AnswerVisual({ v, compact }: { v: Visual; compact?: boolean }) {
  switch (v.kind) {
    case "bar":
      return <HBars data={v.data} unit={v.unit} color={v.color} />
    case "stacked":
      return <SeriesChart kind="stacked" data={v.data} x={v.x} keys={v.keys} unit={v.unit} height={compact ? 190 : 240} />
    case "line":
      return <SeriesChart kind="line" data={v.data} x={v.x} keys={v.keys} unit={v.unit} height={compact ? 190 : 240} />
    case "heatmap":
      return <Heatmap grid={v.grid} compact={compact} />
    case "table":
      return <DataTable columns={v.columns} rows={v.rows} numeric={v.numeric} maxRows={compact ? 6 : 10} />
    case "number":
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="num text-[34px] leading-none font-medium tracking-[-0.04em]">{v.value}</span>
            <span className="text-[13px] text-muted-foreground">{v.label}</span>
          </div>
          {v.detail && <DataTable columns={v.detail.columns} rows={v.detail.rows} numeric={v.detail.numeric} maxRows={6} />}
        </div>
      )
  }
}
