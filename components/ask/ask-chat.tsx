"use client"

import * as React from "react"
import { ArrowUp, Bookmark, BookmarkCheck, ChevronRight, Code2, Pin, PinOff, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AnswerVisual } from "@/components/ask/answer-visual"
import { EXAMPLES, MORE_EXAMPLES } from "@/lib/ask"
import { useAsk, type AskMessage } from "@/lib/ask-store"
import { cn } from "@/lib/utils"

function Thinking() {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-bounce rounded-full bg-copper" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </span>
      Querying your data
    </span>
  )
}

function AssistantMessage({ m, compact, context }: { m: AskMessage; compact?: boolean; context?: string }) {
  const { ask, togglePin, toggleSave, busy } = useAsk()
  const [sqlOpen, setSqlOpen] = React.useState(false)
  const a = m.answer
  return (
    <div className="flex gap-3" data-testid="ask-answer">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-copper-tint text-copper">
        <Sparkles className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        {m.status === "thinking" || !a ? (
          <Thinking />
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[13px] font-semibold">{a.title}</div>
              <p className="mt-0.5 text-[13.5px] leading-[1.5] text-[#2a2925]">
                {m.text.slice(0, m.shown)}
                {m.status === "streaming" && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-copper" />}
              </p>
            </div>
            {m.status === "done" && (
              <>
                <div className="rounded-xl border border-hairline bg-card p-3.5" data-testid="ask-visual" data-kind={a.visual.kind}>
                  <AnswerVisual v={a.visual} compact={compact} />
                </div>
                <div>
                  <button
                    onClick={() => setSqlOpen((o) => !o)}
                    className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight className={cn("size-3.5 transition-transform", sqlOpen && "rotate-90")} />
                    <Code2 className="size-3.5" />
                    SQL
                  </button>
                  {sqlOpen && (
                    <pre className="num mt-1.5 overflow-x-auto rounded-lg bg-ink px-3.5 py-3 text-[11.5px] leading-[1.55] text-[#efe9dd]">{a.sql}</pre>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {a.followups.map((f) => (
                    <button
                      key={f}
                      disabled={busy}
                      onClick={() => ask(f, context)}
                      className="rounded-full border border-hairline bg-card px-2.5 py-1 text-[12px] hover:border-[#d6d0c4] disabled:opacity-50"
                    >
                      {f}
                    </button>
                  ))}
                  <span className="ml-auto flex gap-1">
                    <Button size="xs" variant={m.pinned ? "secondary" : "ghost"} onClick={() => togglePin(m.id)}>
                      {m.pinned ? <PinOff /> : <Pin />}
                      {m.pinned ? "Pinned" : "Pin to dashboard"}
                    </Button>
                    <Button size="xs" variant={m.saved ? "secondary" : "ghost"} onClick={() => toggleSave(m.id)}>
                      {m.saved ? <BookmarkCheck /> : <Bookmark />}
                      {m.saved ? "Saved" : "Save as report"}
                    </Button>
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function AskChat({ compact, context }: { compact?: boolean; context?: string }) {
  const { messages, ask, busy } = useAsk()
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]

  React.useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight })
  }, [messages.length, last?.shown, last?.status])

  const submit = () => {
    if (!draft.trim() || busy) return
    ask(draft, context)
    setDraft("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className={cn("min-h-0 flex-1 overflow-y-auto", compact ? "px-4 py-4" : "px-6 py-6")}>
        {messages.length === 0 ? (
          <div className={cn("mx-auto flex flex-col gap-4", compact ? "pt-2" : "max-w-2xl pt-16")}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-copper-tint text-copper">
              <Sparkles className="size-5" />
            </span>
            <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-2")}>
              {[...EXAMPLES, ...(compact ? [] : MORE_EXAMPLES)].map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q, context)}
                  className="rounded-lg border border-hairline bg-card px-3 py-2.5 text-left text-[13px] transition-colors hover:border-[#d6d0c4]"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("mx-auto flex flex-col gap-6", !compact && "max-w-3xl")}>
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex flex-col items-end gap-1">
                  {m.context && <span className="text-[11px] text-muted-foreground">from {m.context}</span>}
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13.5px] text-white">{m.text}</div>
                </div>
              ) : (
                <AssistantMessage key={m.id} m={m} compact={compact} context={context} />
              )
            )}
          </div>
        )}
      </div>
      <div className={cn("shrink-0", compact ? "px-4 pb-4" : "px-6 pb-5")}>
        <div className={cn("mx-auto flex items-end gap-2 rounded-xl border border-input bg-card p-2 focus-within:border-[#cdbfae]", !compact && "max-w-3xl")}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="Ask about sales, machines, hosts, money or support"
            className="max-h-32 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
          <Button size="icon-sm" onClick={submit} disabled={!draft.trim() || busy} aria-label="Ask">
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  )
}
