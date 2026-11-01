"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OrgTile, PersonAvatar } from "@/components/sp/brand"
import { BandPill } from "@/components/sp/ui"
import { ChatThread } from "@/components/support/chat"
import { useInboxSummary, type InboxRow } from "@/components/support/inbox-summary"
import { TicketList, TriagePanel } from "@/components/support/triage-panel"
import { useAllHealth } from "@/components/admin/use-health"
import { ORG_BY_ID, type Priority } from "@/lib/data"
import { useStore } from "@/lib/store"
import { fmtAgo, fmtDuration } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useHydrated, useQueryParam } from "@/lib/use-url"

const SP_VIEWER = { name: "Kevin Mok", side: "sp" as const }

function SlaChip({ sla, now }: { sla: NonNullable<InboxRow["sla"]>; now: number }) {
  const left = sla.due - now
  const total = sla.due - sla.since
  const overdue = left < 0
  const tight = !overdue && left < total * 0.35
  const label: Record<Priority, string> = { Urgent: "Urgent", Normal: "Normal", Question: "Question" }
  return (
    <span
      className={cn(
        "num inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap",
        overdue ? "bg-bad text-white" : tight ? "bg-[#f6e3df] text-[#9c3528]" : sla.priority === "Question" ? "bg-muted text-muted-foreground" : "bg-[#f5ecd3] text-[#87600b]"
      )}
    >
      {label[sla.priority]} · {overdue ? `${fmtDuration(-left)} over` : sla.priority === "Question" && left > 6 * 3_600_000 ? "tomorrow" : `${fmtDuration(left)} left`}
    </span>
  )
}

export function SupportInbox() {
  const { now, markRead, startCall } = useStore()
  const rows = useInboxSummary()
  const health = useAllHealth()
  const [query, setQuery] = React.useState("")
  const [chosen, setSelected] = React.useState<string | null>(null)
  const urlChat = useQueryParam("chat")
  const ready = useHydrated()
  const selected = chosen ?? (urlChat && ORG_BY_ID[urlChat] ? urlChat : null)

  const sorted = [...rows].sort((a, b) => {
    if (a.sla && b.sla) return a.sla.due - b.sla.due
    if (a.sla) return -1
    if (b.sla) return 1
    return (b.last?.at ?? 0) - (a.last?.at ?? 0)
  })
  const filtered = sorted.filter((r) => ORG_BY_ID[r.orgId]!.name.toLowerCase().includes(query.toLowerCase()))
  const activeId = selected ?? sorted[0]!.orgId
  const org = ORG_BY_ID[activeId]!
  const h = health.find((x) => x.org.id === activeId)!

  React.useEffect(() => {
    if (ready) markRead(activeId)
  }, [ready, activeId, markRead])

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-[640px]">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-hairline bg-[#fbfaf7]">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline px-4">
          <h1 className="text-[15px] font-semibold">Inbox</h1>
          <span className="num rounded-md bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground">
            {rows.filter((r) => r.sla).length} waiting
          </span>
        </div>
        <div className="border-b border-hairline p-2">
          <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-card px-2.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find an operator"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {filtered.map((r) => {
            const o = ORG_BY_ID[r.orgId]!
            const active = r.orgId === activeId
            const unread = active ? 0 : r.unread
            return (
              <li key={r.orgId}>
                <button
                  onClick={() => setSelected(r.orgId)}
                  className={cn(
                    "flex w-full gap-2.5 border-b border-hairline px-3 py-2.5 text-left transition-colors",
                    active ? "bg-card shadow-[inset_2px_0_0_var(--copper)]" : "hover:bg-[#f6f4ee]"
                  )}
                >
                  <OrgTile name={o.name} className="mt-0.5 size-7 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("truncate text-[13px]", unread ? "font-semibold" : "font-medium")}>{o.name}</span>
                      <span className="num ml-auto shrink-0 text-[11px] text-muted-foreground">{r.last ? fmtAgo(r.last.at, now) : ""}</span>
                    </div>
                    <div className={cn("mt-0.5 truncate text-[12px]", unread ? "text-foreground" : "text-muted-foreground")}>
                      {r.last ? `${r.last.side === "sp" ? "You: " : ""}${r.last.call ? "Teams meeting" : r.last.text}` : ""}
                    </div>
                    {(r.sla || unread > 0) && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        {r.sla && <SlaChip sla={r.sla} now={now} />}
                        {unread > 0 && (
                          <span className="num ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-copper px-1 text-[10.5px] font-semibold text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <ChatThread
        key={activeId}
        orgId={activeId}
        orgName={org.name}
        viewer={SP_VIEWER}
        showTriage
        header={
          <div className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-5">
            <span className="text-[14px] font-semibold">{org.name}</span>
            <Link href={`/admin/health/${org.id}`} className="flex items-center gap-1.5">
              <span className="num text-[12px] text-muted-foreground">{h.health.score}</span>
              <BandPill band={h.health.band} />
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex -space-x-1.5">
                {org.operators.map((p) => (
                  <PersonAvatar key={p.name} name={p.name} className="size-6 border-2 border-card text-[9px]" />
                ))}
                <PersonAvatar name="Kevin Mok" sp className="size-6 border-2 border-card text-[9px]" />
              </div>
              <Button size="sm" variant="outline" onClick={() => startCall(org.id, SP_VIEWER.name, "sp")}>
                <Video />
                Start a call
              </Button>
            </div>
          </div>
        }
      />

      <aside className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-hairline bg-cream p-3">
        <TriagePanel orgId={activeId} />
        <TicketList orgId={activeId} editable />
      </aside>
    </div>
  )
}
