"use client"

import * as React from "react"
import { Bot, Check, Ticket as TicketIcon, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Chip, Panel, type Tone } from "@/components/sp/ui"
import {
  CATEGORIES,
  ORG_BY_ID,
  PRIORITIES,
  type Category,
  type Message,
  type Priority,
  type Ticket,
  type TicketDraft,
  type TicketStatus,
} from "@/lib/data"
import { useStore } from "@/lib/store"
import { fmtAgo, fmtStamp } from "@/lib/time"
import { cn } from "@/lib/utils"

const PRIORITY_TONE: Record<Priority, Tone> = { Urgent: "bad", Normal: "warn", Question: "muted" }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[72px_1fr] items-center gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Proposal({ msg, draft }: { msg: Message; draft: TicketDraft }) {
  const { acceptTicket, markNotTicket } = useStore()
  const org = ORG_BY_ID[msg.orgId]!
  const [d, setD] = React.useState<TicketDraft>(draft)

  const machineItems = [
    { value: "none", label: "No machine" },
    ...org.machines.map((m) => ({ value: m.id, label: m.venue })),
  ]

  return (
    <div className="flex flex-col gap-2.5">
      <Field label="Category">
        <Select
          value={d.category}
          onValueChange={(v) => v && setD({ ...d, category: v as Category })}
          items={CATEGORIES.map((c) => ({ value: c, label: c }))}
        >
          <SelectTrigger size="sm" className="w-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Machine">
        <Select
          value={d.machineId ?? "none"}
          onValueChange={(v) => setD({ ...d, machineId: !v || v === "none" ? undefined : v })}
          items={machineItems}
        >
          <SelectTrigger size="sm" className="w-full min-w-0 bg-card">
            <SelectValue className="truncate" />
          </SelectTrigger>
          <SelectContent>
            {machineItems.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
                {m.value !== "none" && <span className="num text-[11px] text-muted-foreground">{m.value}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Priority">
        <ToggleGroup
          value={[d.priority]}
          onValueChange={(v) => v[0] && setD({ ...d, priority: v[0] as Priority })}
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
        >
          {PRIORITIES.map((p) => (
            <ToggleGroupItem key={p} value={p} className="flex-1 text-[12px] data-pressed:bg-ink data-pressed:text-white">
              {p}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <label className="grid grid-cols-[72px_1fr] items-start gap-2">
        <span className="pt-1.5 text-[12px] text-muted-foreground">Summary</span>
        <Textarea
          value={d.summary}
          onChange={(e) => setD({ ...d, summary: e.target.value })}
          rows={2}
          className="min-h-0 resize-none bg-card px-2.5 py-1.5 text-[13px] leading-snug md:text-[13px]"
        />
      </label>
      <div className="mt-1 flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={() => acceptTicket(msg.id, d, org.owner)}>
          <TicketIcon />
          Create ticket
        </Button>
        <Button size="sm" variant="outline" onClick={() => markNotTicket(msg.id)}>
          Not a ticket
        </Button>
      </div>
    </div>
  )
}

function Outcome({ msg }: { msg: Message }) {
  const { triage } = useStore()
  const t = triage[msg.id]
  if (!t) return <Chip>Triaging</Chip>
  if (t.kind === "none") return <Chip>Not a ticket</Chip>
  if (t.ticketId) return <Chip tone="copper" className="num">{t.ticketId}</Chip>
  return <Chip tone="copper">Proposed</Chip>
}

export function TriagePanel({ orgId }: { orgId: string }) {
  const { messages, triage, makeTicketAnyway } = useStore()
  const opMsgs = messages.filter((m) => m.orgId === orgId && m.side === "operator" && !m.call)
  const latest = opMsgs[opMsgs.length - 1]
  const earlier = opMsgs.slice(0, -1).reverse().slice(0, 4)
  const t = latest ? triage[latest.id] : undefined

  return (
    <Panel
      title={
        <span className="flex items-center gap-1.5">
          <Bot className="size-4 text-copper" />
          AI triage
        </span>
      }
    >
      {latest && (
        <div className="border-b border-hairline px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2 text-[12px]">
            <span className="font-medium">{latest.author}</span>
            <span className="num text-muted-foreground">{fmtStamp(latest.at)}</span>
            <span className="ml-auto">
              <Outcome msg={latest} />
            </span>
          </div>
          <p className="line-clamp-3 border-l-2 border-copper/40 pl-2.5 text-[12.5px] leading-[1.45] text-[#3b3934]">{latest.text}</p>
          <div className="mt-3">
            {!t && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-7 rounded-md bg-[#efece5]" />
                <Skeleton className="h-7 rounded-md bg-[#efece5]" />
                <Skeleton className="h-7 w-2/3 rounded-md bg-[#efece5]" />
              </div>
            )}
            {t?.kind === "ticket" && t.state === "proposed" && <Proposal key={latest.id} msg={latest} draft={t.draft} />}
            {t?.kind === "ticket" && t.state === "accepted" && (
              <div className="flex items-center gap-2 rounded-lg bg-[#e2efe3] px-3 py-2 text-[12.5px] text-[#2f6e3f]">
                <Check className="size-4" />
                <span className="num font-semibold">{t.ticketId}</span>
                <span className="truncate">{t.draft.summary}</span>
              </div>
            )}
            {t?.kind === "none" && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[12.5px] text-muted-foreground">
                <span className="flex-1">{t.reason}</span>
                <Button size="xs" variant="ghost" onClick={() => makeTicketAnyway(latest.id)}>
                  <Undo2 />
                  Make ticket
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      <ul className="divide-y divide-hairline">
        {earlier.map((m) => {
          const tr = triage[m.id]
          return (
            <li key={m.id} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{m.text}</span>
                <Outcome msg={m} />
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {m.author} · {fmtAgo(m.at)}
                {tr?.kind === "none" && ` · ${tr.reason}`}
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

const STATUS_TONE: Record<TicketStatus, Tone> = { open: "copper", waiting: "warn", resolved: "ok" }
const STATUS_ITEMS = [
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
]

export function TicketList({ orgId, editable }: { orgId: string; editable?: boolean }) {
  const { tickets, setTicketStatus } = useStore()
  const org = ORG_BY_ID[orgId]!
  const order: Record<TicketStatus, number> = { open: 0, waiting: 1, resolved: 2 }
  const list = tickets.filter((t) => t.orgId === orgId).sort((a, b) => order[a.status] - order[b.status] || b.openedAt - a.openedAt)

  return (
    <Panel title="Tickets" count={list.filter((t) => t.status !== "resolved").length}>
      {list.length === 0 ? (
        <div className="px-4 py-4 text-[13px] text-muted-foreground">None yet</div>
      ) : (
        <ul className="divide-y divide-hairline">
          {list.map((t: Ticket) => {
            const machine = org.machines.find((m) => m.id === t.machineId)
            return (
              <li key={t.id} className={cn("px-4 py-2.5", t.status === "resolved" && "opacity-60")}>
                <div className="flex items-center gap-2">
                  <span className="num text-[11.5px] text-muted-foreground">{t.id}</span>
                  <Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip>
                  <span className="ml-auto">
                    {editable ? (
                      <Select value={t.status} onValueChange={(v) => v && setTicketStatus(t.id, v as TicketStatus)} items={STATUS_ITEMS}>
                        <SelectTrigger size="sm" className="h-6! gap-1 border-hairline px-2 text-[11.5px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end" alignItemWithTrigger={false}>
                          {STATUS_ITEMS.map((s) => (
                            <SelectItem key={s.value} value={s.value} className="text-[12.5px]">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Chip tone={STATUS_TONE[t.status]} className="capitalize">
                        {t.status}
                      </Chip>
                    )}
                  </span>
                </div>
                <div className="mt-1 text-[13px] leading-snug">{t.summary}</div>
                <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                  {t.category}
                  {machine && ` · ${machine.venue}`} · {fmtAgo(t.openedAt)} · {t.assignee}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
