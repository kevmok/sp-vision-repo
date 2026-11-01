"use client"

import * as React from "react"

import { answerFor, type Answer } from "@/lib/ask"
import { useBank } from "@/lib/bank-store"
import { useOperatorOrg, useStore } from "@/lib/store"

export type AskMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  context?: string
  answer?: Answer
  status: "thinking" | "streaming" | "done"
  shown: number
  pinned?: boolean
  saved?: boolean
}

type AskStore = {
  messages: AskMessage[]
  busy: boolean
  ask: (q: string, context?: string) => void
  reset: () => void
  togglePin: (id: string) => void
  toggleSave: (id: string) => void
  sheetOpen: boolean
  setSheetOpen: (o: boolean) => void
  openSheet: (q?: string, context?: string) => void
}

const Ctx = React.createContext<AskStore | null>(null)

let n = 0
const uid = () => `ask-${Date.now().toString(36)}-${n++}`

export function AskProvider({ children }: { children: React.ReactNode }) {
  const org = useOperatorOrg()
  const { tickets } = useStore()
  const { inbox } = useBank()
  const [messages, setMessages] = React.useState<AskMessage[]>([])
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const ctxRef = React.useRef({ org, tickets, inbox })
  React.useEffect(() => {
    ctxRef.current = { org, tickets, inbox }
  })

  // Stream any assistant message that is mid-answer.
  const streaming = messages.some((m) => m.status === "streaming")
  React.useEffect(() => {
    if (!streaming) return
    const id = setInterval(() => {
      setMessages((ms) =>
        ms.map((m) => {
          if (m.status !== "streaming") return m
          const shown = Math.min(m.text.length, m.shown + 5)
          return { ...m, shown, status: shown >= m.text.length ? "done" : "streaming" }
        })
      )
    }, 24)
    return () => clearInterval(id)
  }, [streaming])

  const ask = React.useCallback((q: string, context?: string) => {
    const text = q.trim()
    if (!text) return
    const aid = uid()
    setMessages((ms) => [
      ...ms,
      { id: uid(), role: "user", text, context, status: "done", shown: text.length },
      { id: aid, role: "assistant", text: "", status: "thinking", shown: 0 },
    ])
    setTimeout(() => {
      const c = ctxRef.current
      const answer = answerFor(text, { org: c.org, tickets: c.tickets, bankInbox: c.inbox, page: context })
      setMessages((ms) => ms.map((m) => (m.id === aid ? { ...m, answer, text: answer.text, status: "streaming" } : m)))
    }, 650)
  }, [])

  const store: AskStore = {
    messages,
    busy: messages.some((m) => m.status !== "done"),
    ask,
    reset: () => setMessages([]),
    togglePin: (id) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))),
    toggleSave: (id) => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, saved: !m.saved } : m))),
    sheetOpen,
    setSheetOpen,
    openSheet: (q, context) => {
      setSheetOpen(true)
      if (q) ask(q, context)
    },
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useAsk() {
  const s = React.useContext(Ctx)
  if (!s) throw new Error("useAsk outside AskProvider")
  return s
}
