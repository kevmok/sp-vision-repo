import * as React from "react"

import { cn } from "@/lib/utils"
import type { Band } from "@/lib/health"

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto w-full max-w-[1320px] px-6 py-5", className)}>{children}</main>
}

export function PageHeader({
  title,
  children,
  meta,
}: {
  title: React.ReactNode
  children?: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex min-h-8 items-center gap-3">
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
      {meta}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function Panel({
  title,
  count,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("flex flex-col rounded-xl border border-hairline bg-card", className)}>
      {title && (
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-hairline px-4">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {count !== undefined && (
            <span className="num rounded-md bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground">{count}</span>
          )}
          {action && <div className="ml-auto flex items-center gap-1.5">{action}</div>}
        </header>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
  children,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: "ok" | "warn" | "bad"
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-hairline bg-card px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        {tone && <Dot tone={tone} />}
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="num text-[24px] leading-none font-medium tracking-[-0.05em]">{value}</span>
          {sub && <span className="num text-[12px] text-muted-foreground">{sub}</span>}
        </div>
        {children}
      </div>
    </div>
  )
}

const TONE_BG = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", muted: "bg-[#c9c3b6]", copper: "bg-copper" } as const
const TONE_TEXT = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground", copper: "text-copper" } as const
export type Tone = keyof typeof TONE_BG

export function Dot({ tone, className }: { tone: Tone; className?: string }) {
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", TONE_BG[tone], className)} />
}

export function toneText(tone: Tone) {
  return TONE_TEXT[tone]
}

export const BAND_TONE: Record<Band, Tone> = { Red: "bad", Yellow: "warn", Green: "ok" }

const BAND_STYLE: Record<Band, string> = {
  Red: "bg-[#f6e3df] text-[#9c3528]",
  Yellow: "bg-[#f5ecd3] text-[#87600b]",
  Green: "bg-[#e2efe3] text-[#2f6e3f]",
}

export function BandPill({ band, className }: { band: Band; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold",
        BAND_STYLE[band],
        className
      )}
    >
      <Dot tone={BAND_TONE[band]} />
      {band}
    </span>
  )
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode
  tone?: Tone | "ink"
  className?: string
}) {
  const style =
    tone === "ok"
      ? "bg-[#e2efe3] text-[#2f6e3f]"
      : tone === "warn"
        ? "bg-[#f5ecd3] text-[#87600b]"
        : tone === "bad"
          ? "bg-[#f6e3df] text-[#9c3528]"
          : tone === "copper"
            ? "bg-copper-tint text-[#8a4913]"
            : tone === "ink"
              ? "bg-ink text-white"
              : "bg-muted text-muted-foreground"
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap", style, className)}>
      {children}
    </span>
  )
}

export function Meter({ value, max = 1, tone, className }: { value: number; max?: number; tone?: Tone; className?: string }) {
  const r = Math.max(0, Math.min(1, value / max))
  const t: Tone = tone ?? (r >= 0.75 ? "ok" : r >= 0.5 ? "warn" : "bad")
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#eeebe4]", className)}>
      <div className={cn("h-full rounded-full", TONE_BG[t])} style={{ width: `${r * 100}%` }} />
    </div>
  )
}

export function Spark({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values)
  return (
    <div className={cn("flex h-8 items-end gap-[3px]", className)}>
      {values.map((v, i) => (
        <div
          key={i}
          className={cn("w-[5px] rounded-[1.5px]", i === values.length - 1 ? "bg-copper" : "bg-[#e3d6c4]")}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}
