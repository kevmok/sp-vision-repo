"use client"

import * as React from "react"

import {
  ORG_BY_ID,
  SEED_MESSAGES,
  SEED_READ_AT,
  SEED_TICKETS,
  SEED_TRIAGE,
  TICKET_START,
  type Attachment,
  type Message,
  type Owner,
  type Ticket,
  type TicketDraft,
  type TicketStatus,
  type Triage,
} from "@/lib/data"
import { NOW } from "@/lib/time"
import { triageText } from "@/lib/triage"
import { useInitialQueryParam } from "@/lib/use-url"

type Store = {
  now: number
  operatorOrgId: string
  setOperatorOrgId: (id: string) => void
  messages: Message[]
  triage: Record<string, Triage>
  tickets: Ticket[]
  readAt: Record<string, number>
  doneSignals: Record<string, number>
  restocked: Record<string, boolean>
  send: (orgId: string, author: string, side: "operator" | "sp", text: string, attachments?: Attachment[]) => void
  startCall: (orgId: string, author: string, side: "operator" | "sp") => void
  toggleReaction: (msgId: string, emoji: string, by: string) => void
  togglePin: (msgId: string) => void
  acceptTicket: (msgId: string, draft: TicketDraft, by: Owner) => void
  markNotTicket: (msgId: string) => void
  makeTicketAnyway: (msgId: string) => void
  setTicketStatus: (id: string, status: TicketStatus) => void
  markRead: (orgId: string) => void
  toggleSignal: (key: string) => void
  toggleRestocked: (machineId: string) => void
}

const StoreContext = React.createContext<Store | null>(null)

let seq = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [now, setNow] = React.useState(NOW)
  const urlOrg = useInitialQueryParam("org")
  const [chosenOrg, setOperatorOrgId] = React.useState<string | null>(null)
  const fromUrl = urlOrg && ORG_BY_ID[urlOrg] ? urlOrg : null
  const operatorOrgId = chosenOrg ?? fromUrl ?? "northline"
  const [messages, setMessages] = React.useState<Message[]>(SEED_MESSAGES)
  const [triage, setTriage] = React.useState<Record<string, Triage>>(SEED_TRIAGE)
  const [tickets, setTickets] = React.useState<Ticket[]>(SEED_TICKETS)
  const [readAt, setReadAt] = React.useState(SEED_READ_AT)
  const [doneSignals, setDoneSignals] = React.useState<Record<string, number>>({})
  const [restocked, setRestocked] = React.useState<Record<string, boolean>>({})
  const nextTicket = React.useRef(TICKET_START)

  // Demo clock: starts at the fixed NOW and advances in real time.
  React.useEffect(() => {
    const started = Date.now()
    const id = setInterval(() => setNow(NOW + (Date.now() - started)), 15_000)
    return () => clearInterval(id)
  }, [])

  const nowRef = React.useRef(now)
  const messagesRef = React.useRef(messages)
  React.useEffect(() => {
    nowRef.current = now
    messagesRef.current = messages
  })

  const send: Store["send"] = React.useCallback((orgId, author, side, text, attachments) => {
    const msg: Message = { id: uid("m"), orgId, author, side, at: nowRef.current, text, attachments }
    setMessages((ms) => [...ms, msg])
    if (side === "sp") {
      setReadAt((r) => ({ ...r, [orgId]: msg.at }))
    } else {
      // The triage agent looks at every operator message.
      const org = ORG_BY_ID[orgId]!
      setTimeout(() => setTriage((t) => ({ ...t, [msg.id]: triageText(text, org) })), 1400)
    }
  }, [])

  const startCall: Store["startCall"] = React.useCallback((orgId, author, side) => {
    const code = Math.random().toString(36).slice(2, 10)
    const org = ORG_BY_ID[orgId]!
    setMessages((ms) => [
      ...ms,
      {
        id: uid("call"),
        orgId,
        author,
        side,
        at: nowRef.current,
        text: "Started a call",
        call: {
          title: `${org.name} × SP`,
          link: `https://teams.microsoft.com/l/meetup-join/19%3Ameeting_${code}%40thread.v2/0`,
        },
      },
    ])
  }, [])

  const toggleReaction: Store["toggleReaction"] = React.useCallback((msgId, emoji, by) => {
    setMessages((ms) =>
      ms.map((m) => {
        if (m.id !== msgId) return m
        const reactions = [...(m.reactions ?? [])]
        const i = reactions.findIndex((r) => r.emoji === emoji)
        if (i === -1) reactions.push({ emoji, by: [by] })
        else {
          const r = reactions[i]!
          const by2 = r.by.includes(by) ? r.by.filter((b) => b !== by) : [...r.by, by]
          if (by2.length) reactions[i] = { ...r, by: by2 }
          else reactions.splice(i, 1)
        }
        return { ...m, reactions }
      })
    )
  }, [])

  const togglePin: Store["togglePin"] = React.useCallback((msgId) => {
    setMessages((ms) => ms.map((m) => (m.id === msgId ? { ...m, pinned: !m.pinned } : m)))
  }, [])

  const acceptTicket: Store["acceptTicket"] = React.useCallback((msgId, draft, by) => {
    const src = messagesRef.current.find((m) => m.id === msgId)
    if (!src) return
    const id = `T-${nextTicket.current++}`
    const t = nowRef.current
    setTickets((ts) => [
      { ...draft, id, orgId: src.orgId, status: "open", openedAt: t, messageId: msgId, assignee: by },
      ...ts,
    ])
    setMessages((ms) => [
      ...ms,
      {
        id: uid("sys"),
        orgId: src.orgId,
        author: "SP",
        side: "system",
        at: t,
        text: `${id} opened · ${draft.category} · ${draft.summary}`,
      },
    ])
    setTriage((tr) => ({ ...tr, [msgId]: { kind: "ticket", draft, state: "accepted", ticketId: id } }))
  }, [])

  const markNotTicket: Store["markNotTicket"] = React.useCallback((msgId) => {
    setTriage((t) => ({ ...t, [msgId]: { kind: "none", reason: "Marked not a ticket", state: "accepted" } }))
  }, [])

  const makeTicketAnyway: Store["makeTicketAnyway"] = React.useCallback((msgId) => {
    const src = messagesRef.current.find((m) => m.id === msgId)
    if (!src) return
    const t = triageText(src.text.replace(/\b(thanks|thank you|lol|haha)\b/gi, ""), ORG_BY_ID[src.orgId]!)
    const draft: TicketDraft =
      t.kind === "ticket" ? t.draft : { category: "Other", priority: "Question", summary: src.text.slice(0, 90) }
    setTriage((tr) => ({ ...tr, [msgId]: { kind: "ticket", draft, state: "proposed" } }))
  }, [])

  const setTicketStatus: Store["setTicketStatus"] = React.useCallback((id, status) => {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)))
  }, [])

  const markRead: Store["markRead"] = React.useCallback((orgId) => {
    setReadAt((r) => ({ ...r, [orgId]: nowRef.current }))
  }, [])

  const toggleSignal: Store["toggleSignal"] = React.useCallback((key) => {
    setDoneSignals((d) => {
      const next = { ...d }
      if (next[key]) delete next[key]
      else next[key] = nowRef.current
      return next
    })
  }, [])

  const toggleRestocked: Store["toggleRestocked"] = React.useCallback((id) => {
    setRestocked((r) => ({ ...r, [id]: !r[id] }))
  }, [])

  const value: Store = {
    now,
    operatorOrgId,
    setOperatorOrgId,
    messages,
    triage,
    tickets,
    readAt,
    doneSignals,
    restocked,
    send,
    startCall,
    toggleReaction,
    togglePin,
    acceptTicket,
    markNotTicket,
    makeTicketAnyway,
    setTicketStatus,
    markRead,
    toggleSignal,
    toggleRestocked,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const s = React.useContext(StoreContext)
  if (!s) throw new Error("useStore outside StoreProvider")
  return s
}

export function useOperatorOrg() {
  const { operatorOrgId } = useStore()
  return ORG_BY_ID[operatorOrgId]!
}
