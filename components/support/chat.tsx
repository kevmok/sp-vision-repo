"use client"

import * as React from "react"
import {
  FileSpreadsheet,
  FileText,
  ImageIcon,
  Paperclip,
  Pin,
  PinOff,
  SendHorizontal,
  SmilePlus,
  Ticket,
  Video,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PersonAvatar } from "@/components/sp/brand"
import type { Attachment, Message } from "@/lib/data"
import { useStore } from "@/lib/store"
import { dayKey, fmtDay, fmtTime } from "@/lib/time"
import { cn } from "@/lib/utils"

const EMOJI = ["👍", "✅", "👀", "🙏", "❤️", "😂"]

export type Viewer = { name: string; side: "operator" | "sp" }

function AttachmentChip({ a, onRemove }: { a: Attachment; onRemove?: () => void }) {
  const Icon = a.kind === "image" ? ImageIcon : a.kind === "sheet" ? FileSpreadsheet : FileText
  return (
    <span className="inline-flex h-8 max-w-[260px] items-center gap-2 rounded-lg border border-hairline bg-[#fbfaf7] pr-2.5 pl-2 text-[12px]">
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded",
          a.kind === "image" ? "bg-copper-tint text-copper" : a.kind === "sheet" ? "bg-[#e2efe3] text-ok" : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-3" />
      </span>
      <span className="truncate font-medium">{a.name}</span>
      <span className="num shrink-0 text-[11px] text-muted-foreground">{a.size}</span>
      {onRemove && (
        <button onClick={onRemove} className="-mr-1 rounded p-0.5 text-muted-foreground hover:bg-muted">
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

function CallCard({ m }: { m: Message }) {
  return (
    <div className="mt-1.5 flex w-[380px] items-center gap-3 rounded-lg border border-hairline bg-[#fbfaf7] p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ink text-white">
        <Video className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">Teams meeting</div>
        <div className="truncate text-[12px] text-muted-foreground">{m.call!.title}</div>
        <div className="num truncate text-[11px] text-muted-foreground/80">{m.call!.link.replace("https://", "")}</div>
      </div>
      <a
        href={m.call!.link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-7 items-center rounded-md bg-ink px-3 text-[12px] font-medium text-white hover:bg-ink/85"
      >
        Join
      </a>
    </div>
  )
}

function TriageTag({ m }: { m: Message }) {
  const { triage } = useStore()
  const t = triage[m.id]
  if (!t) {
    return (
      <span className="inline-flex h-5 items-center gap-1 rounded-md bg-muted px-1.5 text-[11px] text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-copper" />
        Triaging
      </span>
    )
  }
  if (t.kind === "none") {
    return <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[11px] text-muted-foreground">Not a ticket</span>
  }
  if (t.state === "accepted" && t.ticketId) {
    return (
      <span className="num inline-flex h-5 items-center gap-1 rounded-md bg-copper-tint px-1.5 text-[11px] font-medium text-[#8a4913]">
        <Ticket className="size-3" />
        {t.ticketId}
      </span>
    )
  }
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-md border border-dashed border-copper/50 px-1.5 text-[11px] text-[#8a4913]">
      <Ticket className="size-3" />
      Proposed
    </span>
  )
}

function MessageRow({
  m,
  compact,
  viewer,
  highlight,
  showTriage,
}: {
  m: Message
  compact: boolean
  viewer: Viewer
  highlight: boolean
  showTriage: boolean
}) {
  const { toggleReaction, togglePin } = useStore()
  const [pickerOpen, setPickerOpen] = React.useState(false)

  if (m.side === "system") {
    return (
      <div id={`msg-${m.id}`} className="my-2 flex items-center gap-3 px-5">
        <span className="h-px flex-1 bg-hairline" />
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Ticket className="size-3.5 text-copper" />
          <span className="max-w-[520px] truncate">{m.text}</span>
          <span className="num text-[11px]">{fmtTime(m.at)}</span>
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </div>
    )
  }

  const isSp = m.side === "sp"
  return (
    <div
      id={`msg-${m.id}`}
      className={cn(
        "group relative flex gap-3 px-5 transition-colors hover:bg-[#f9f7f2]",
        compact ? "py-0.5" : "pt-2.5 pb-0.5",
        highlight && "bg-copper-tint/60 hover:bg-copper-tint/60"
      )}
    >
      <div className="w-8 shrink-0">
        {!compact && <PersonAvatar name={m.author} sp={isSp} className="size-8 text-[11px]" />}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        {!compact && (
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{m.author}</span>
            {isSp && <span className="rounded bg-ink px-1 text-[9px] leading-[15px] font-bold tracking-wide text-white">SP</span>}
            <span className="num text-[11px] text-muted-foreground">{fmtTime(m.at)}</span>
            {m.pinned && <Pin className="size-3 text-copper" />}
            {showTriage && m.side === "operator" && !m.call && <TriageTag m={m} />}
          </div>
        )}
        {m.call ? (
          <CallCard m={m} />
        ) : (
          <p className="text-[13.5px] leading-[1.5] whitespace-pre-wrap text-[#2a2925]">{m.text}</p>
        )}
        {m.attachments && m.attachments.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.attachments.map((a) => (
              <AttachmentChip key={a.name} a={a} />
            ))}
          </div>
        )}
        {m.reactions && m.reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.reactions.map((r) => {
              const mine = r.by.includes(viewer.name)
              return (
                <Tooltip key={r.emoji}>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => toggleReaction(m.id, r.emoji, viewer.name)}
                        className={cn(
                          "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px]",
                          mine ? "border-copper/40 bg-copper-tint" : "border-hairline bg-card hover:border-[#d6d0c4]"
                        )}
                      />
                    }
                  >
                    <span>{r.emoji}</span>
                    <span className="num text-[11px] text-muted-foreground">{r.by.length}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{r.by.join(", ")}</TooltipContent>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>

      <div
        className={cn(
          "absolute -top-3 right-4 z-10 flex items-center rounded-lg border border-hairline bg-card p-0.5 shadow-sm",
          pickerOpen ? "flex" : "hidden group-hover:flex"
        )}
      >
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="React" />}>
            <SmilePlus />
          </PopoverTrigger>
          <PopoverContent side="top" align="end" className="flex w-auto gap-0.5 p-1">
            {EMOJI.map((e) => (
              <button
                key={e}
                className="flex size-8 items-center justify-center rounded-md text-[17px] hover:bg-muted"
                onClick={() => {
                  toggleReaction(m.id, e, viewer.name)
                  setPickerOpen(false)
                }}
              >
                {e}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="icon-xs" aria-label={m.pinned ? "Unpin" : "Pin"} onClick={() => togglePin(m.id)}>
          {m.pinned ? <PinOff /> : <Pin />}
        </Button>
      </div>
    </div>
  )
}

function PinnedBar({ pinned, onJump }: { pinned: Message[]; onJump: (id: string) => void }) {
  if (!pinned.length) return null
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-hairline bg-[#fbfaf7] px-5">
      <Pin className="size-3.5 shrink-0 text-copper" />
      <span className="num shrink-0 text-[12px] font-medium">{pinned.length} pinned</span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-hidden">
        {pinned.map((p) => (
          <button
            key={p.id}
            onClick={() => onJump(p.id)}
            className="flex h-6 max-w-[48%] min-w-0 shrink items-center gap-1.5 rounded-md border border-hairline bg-card px-2 text-[12px] hover:border-[#d6d0c4]"
          >
            {p.attachments?.[0] ? (
              <FileSpreadsheet className="size-3 shrink-0 text-ok" />
            ) : p.call ? (
              <Video className="size-3 shrink-0" />
            ) : null}
            <span className="truncate">{p.attachments?.[0]?.name ?? p.call?.title ?? p.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Composer({ onSend, orgName }: { onSend: (text: string, attachments: Attachment[]) => void; orgName: string }) {
  const [text, setText] = React.useState("")
  const [files, setFiles] = React.useState<Attachment[]>([])
  const fileRef = React.useRef<HTMLInputElement>(null)

  const submit = () => {
    if (!text.trim() && !files.length) return
    onSend(text.trim(), files)
    setText("")
    setFiles([])
  }

  return (
    <div className="shrink-0 px-5 pt-2 pb-4">
      <div className="rounded-xl border border-input bg-card focus-within:border-[#cdbfae] focus-within:ring-3 focus-within:ring-copper/10">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {files.map((f) => (
              <AttachmentChip key={f.name} a={f} onRemove={() => setFiles((fs) => fs.filter((x) => x.name !== f.name))} />
            ))}
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={2}
          placeholder={`Message ${orgName}`}
          className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[13.5px] outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 px-2 pb-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? [])
              setFiles((fs) => [
                ...fs,
                ...list.map((f) => ({
                  name: f.name,
                  kind: f.type.startsWith("image/") ? ("image" as const) : /sheet|excel|csv/.test(f.type) ? ("sheet" as const) : ("file" as const),
                  size: f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`,
                })),
              ])
              e.target.value = ""
            }}
          />
          <Button variant="ghost" size="icon-sm" aria-label="Attach" onClick={() => fileRef.current?.click()}>
            <Paperclip />
          </Button>
          <Button size="sm" className="ml-auto" onClick={submit} disabled={!text.trim() && !files.length}>
            Send
            <SendHorizontal />
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ChatThread({
  orgId,
  orgName,
  viewer,
  header,
  showTriage = false,
  composerTarget,
}: {
  orgId: string
  orgName: string
  viewer: Viewer
  header: React.ReactNode
  showTriage?: boolean
  composerTarget?: string
}) {
  const { messages, send } = useStore()
  const thread = messages.filter((m) => m.orgId === orgId)
  const pinned = thread.filter((m) => m.pinned)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [highlight, setHighlight] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, orgId])

  const jump = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    setHighlight(id)
    setTimeout(() => setHighlight(null), 1600)
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      {header}
      <PinnedBar pinned={pinned} onJump={jump} />
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pt-2 pb-3">
        {thread.map((m, i) => {
          const prev = thread[i - 1]
          const newDay = !prev || dayKey(prev.at) !== dayKey(m.at)
          const compact =
            !newDay && !!prev && prev.side !== "system" && prev.author === m.author && m.at - prev.at < 5 * 60_000 && !m.call
          return (
            <React.Fragment key={m.id}>
              {newDay && (
                <div className="flex justify-center py-2">
                  <span className="rounded-full border border-hairline bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {fmtDay(m.at)}
                  </span>
                </div>
              )}
              <MessageRow m={m} compact={compact} viewer={viewer} highlight={highlight === m.id} showTriage={showTriage} />
            </React.Fragment>
          )
        })}
      </div>
      <Composer orgName={composerTarget ?? orgName} onSend={(text, att) => send(orgId, viewer.name, viewer.side, text || "Shared files", att.length ? att : undefined)} />
    </div>
  )
}
