"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, MessagesSquare, RotateCcw, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OrgTile, PersonAvatar } from "@/components/sp/brand"
import { ButtonLink } from "@/components/sp/button-link"
import { BandPill, Chip, Dot, Page, Panel, type Tone } from "@/components/sp/ui"
import { useAllHealth } from "@/components/admin/use-health"
import { SP_TEAM } from "@/lib/data"
import { timeline, type HealthComponent, type Signal } from "@/lib/health"
import { useStore } from "@/lib/store"
import { fmtDate } from "@/lib/time"
import { cn } from "@/lib/utils"

const SEG: Record<HealthComponent["key"], string> = {
  usage: "bg-[#1b1a17]",
  data: "bg-[#6b5a43]",
  machines: "bg-[#b3631c]",
  trend: "bg-[#d9a066]",
  relationship: "bg-[#e9d2b4]",
}

function ratioTone(r: number): Tone {
  return r >= 0.75 ? "ok" : r >= 0.5 ? "warn" : "bad"
}

function ScoreBreakdown({ components, score }: { components: HealthComponent[]; score: number }) {
  return (
    <div>
      <div className="flex items-center gap-4 border-b border-hairline px-4 py-4">
        <div className="num text-[40px] leading-none font-medium tracking-[-0.04em]">{score}</div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#eeebe4]">
            {components.map((c) => (
              <div key={c.key} className={cn("h-full border-r-2 border-card last:border-0", SEG[c.key])} style={{ width: `${c.score}%` }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
            {components.map((c) => (
              <span key={c.key} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-[2px]", SEG[c.key])} />
                {c.label}
                <span className="num text-foreground">
                  {c.score}
                  <span className="text-muted-foreground">/{c.max}</span>
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="divide-y divide-hairline">
        {components.map((c) => {
          const r = c.score / c.max
          return (
            <div key={c.key} className="grid grid-cols-[150px_1fr] gap-4 px-4 py-3">
              <div>
                <div className="flex items-center gap-1.5 text-[13px] font-medium">
                  <Dot tone={ratioTone(r)} />
                  {c.label}
                </div>
                <div className="num mt-1 pl-3 text-[12px] text-muted-foreground">
                  {c.score} / {c.max}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {c.inputs.map((i) => (
                  <div key={i.label} className="grid grid-cols-[1fr_110px_120px] items-center gap-3 text-[13px]">
                    <span className="text-muted-foreground">{i.label}</span>
                    <span className="num text-right">{i.value}</span>
                    <div className="flex items-center gap-2">
                      {i.max > 0 ? (
                        <>
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eeebe4]">
                            <div
                              className={cn("h-full rounded-full", { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" }[ratioTone(i.points / i.max) as "ok"])}
                              style={{ width: `${(i.points / i.max) * 100}%` }}
                            />
                          </div>
                          <span className="num w-9 text-right text-[12px]">{i.points}</span>
                        </>
                      ) : (
                        <span className={cn("num ml-auto text-[12px]", i.points < 0 ? "text-bad" : "text-muted-foreground")}>
                          {i.points < 0 ? `−${Math.abs(i.points)}` : "0"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SIGNAL_TONE: Record<Signal["type"], Tone> = {
  offline: "bad",
  escalate: "bad",
  nologin: "bad",
  revenue: "warn",
  data: "warn",
  lanes: "warn",
  growth: "ok",
}

function SignalRow({ s, done, onToggle }: { s: Signal; done?: boolean; onToggle: () => void }) {
  return (
    <li className={cn("grid grid-cols-[1fr_1fr_150px_auto] items-center gap-4 px-4 py-3", done && "opacity-55")}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[13px] font-medium">
          <Dot tone={SIGNAL_TONE[s.type]} />
          <span className={cn("truncate", done && "line-through")}>{s.title}</span>
        </div>
        <div className="mt-0.5 truncate pl-3 text-[12px] text-muted-foreground">{s.detail}</div>
      </div>
      <div className="min-w-0 text-[13px]">{s.play}</div>
      <div className="flex min-w-0 items-center gap-2">
        <PersonAvatar name={SP_TEAM[s.owner].name} sp className="size-6 text-[10px]" />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px]">{s.owner}</div>
          <div className="truncate text-[11px] text-muted-foreground">{s.ownerRole}</div>
        </div>
      </div>
      <Button size="sm" variant={done ? "ghost" : "outline"} onClick={onToggle} className="w-[100px]">
        {done ? <RotateCcw /> : <Check />}
        {done ? "Undo" : "Mark done"}
      </Button>
    </li>
  )
}

export function HealthDetail({ orgId }: { orgId: string }) {
  const router = useRouter()
  const all = useAllHealth()
  const { toggleSignal, setOperatorOrgId, tickets } = useStore()
  const r = all.find((x) => x.org.id === orgId)
  if (!r) {
    return (
      <Page>
        <Link href="/admin/health" className="text-copper">
          Back to operator health
        </Link>
      </Page>
    )
  }
  const { org, health } = r
  const tl = timeline(org)
  const openTickets = tickets.filter((t) => t.orgId === org.id && t.status !== "resolved")

  return (
    <Page className="max-w-[1360px]">
      <div className="mb-4 flex items-center gap-3">
        <OrgTile name={org.name} className="size-10 rounded-[9px] text-[13px]" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] leading-tight font-semibold tracking-[-0.01em]">{org.name}</h1>
            <BandPill band={health.band} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground">
            <span>{org.city}</span>
            <span>·</span>
            <span className="num">Day {org.day} of 90</span>
            <span>·</span>
            <span>{r.activated ? "Activated" : `Setup ${r.setupDone}/4`}</span>
            <span>·</span>
            <span>{org.machines.length} machines</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOperatorOrgId(org.id)
              router.push("/")
            }}
          >
            <Eye />
            View as operator
          </Button>
          <ButtonLink size="sm" href={`/admin/inbox?chat=${org.id}`}>
            <MessagesSquare />
            Open support chat
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-12 items-start gap-4">
        <div className="col-span-8 flex flex-col gap-4">
          <Panel title="Signals" count={r.open.length}>
            {r.signals.length === 0 ? (
              <div className="px-4 py-5 text-[13px] text-muted-foreground">No active signals</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {r.open.map((s) => (
                  <SignalRow key={s.key} s={s} onToggle={() => toggleSignal(s.key)} />
                ))}
                {r.done.map((s) => (
                  <SignalRow key={s.key} s={s} done onToggle={() => toggleSignal(s.key)} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Health score">
            <ScoreBreakdown components={health.components} score={health.score} />
          </Panel>
        </div>

        <div className="col-span-4 flex flex-col gap-4">
          <Panel title="Goals">
            <ol className="divide-y divide-hairline">
              {org.goals.map((g, i) => (
                <li key={g.text} className="flex items-start gap-3 px-4 py-3">
                  <span className="num mt-px text-[12px] text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 text-[13px]">{g.text}</span>
                  <Chip tone={g.status === "Done" ? "ok" : g.status === "At risk" ? "warn" : "muted"}>{g.status}</Chip>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Timeline">
            <ol className="relative px-4 py-3">
              {tl.map((t, i) => (
                <li key={t.label} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < tl.length - 1 && (
                    <span className={cn("absolute top-4 left-[5px] h-full w-px", t.state === "done" ? "bg-[#cfc6b6]" : "bg-hairline")} />
                  )}
                  <span
                    className={cn(
                      "relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2",
                      t.state === "done" && "border-ink bg-ink",
                      t.state === "next" && "border-copper bg-card",
                      t.state === "upcoming" && "border-[#d6d0c4] bg-card"
                    )}
                  />
                  <div className="flex flex-1 items-baseline justify-between gap-2">
                    <span className={cn("text-[13px]", t.state === "upcoming" && "text-muted-foreground", t.state === "next" && "font-medium")}>
                      {t.label}
                    </span>
                    <span className="num text-[12px] text-muted-foreground">
                      {t.state === "next" ? <span className="text-copper">{fmtDate(t.at)}</span> : fmtDate(t.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="People">
            <ul className="divide-y divide-hairline">
              {org.operators.map((p) => (
                <li key={p.name} className="flex items-center gap-2.5 px-4 py-2.5">
                  <PersonAvatar name={p.name} />
                  <span className="text-[13px]">{p.name}</span>
                  <span className="ml-auto text-[12px] text-muted-foreground">{p.role}</span>
                </li>
              ))}
              <li className="flex items-center gap-2.5 px-4 py-2.5">
                <PersonAvatar name={SP_TEAM[org.owner].name} sp />
                <span className="text-[13px]">{SP_TEAM[org.owner].name}</span>
                <span className="ml-auto text-[12px] text-muted-foreground">Success lead</span>
              </li>
            </ul>
          </Panel>

          <Panel title="Open tickets" count={openTickets.length}>
            {openTickets.length === 0 ? (
              <div className="px-4 py-3 text-[13px] text-muted-foreground">None</div>
            ) : (
              <ul className="divide-y divide-hairline">
                {openTickets.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 px-4 py-2.5 text-[13px]">
                    <span className="num text-[12px] text-muted-foreground">{t.id}</span>
                    <span className="flex-1 truncate">{t.summary}</span>
                    <Chip tone={t.status === "open" ? "copper" : "muted"}>{t.status}</Chip>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  )
}
