"use client"

import * as React from "react"

import { ORGS, type Message, type Priority } from "@/lib/data"
import { useStore } from "@/lib/store"
import { slaDue } from "@/lib/triage"

export type InboxRow = {
  orgId: string
  unread: number
  last?: Message
  sla?: { priority: Priority; due: number; since: number }
}

const RANK: Record<Priority, number> = { Urgent: 0, Normal: 1, Question: 2 }

export function useInboxSummary(): InboxRow[] {
  const { messages, readAt, triage } = useStore()
  return React.useMemo(() => {
    return ORGS.map((org) => {
      const thread = messages.filter((m) => m.orgId === org.id && m.side !== "system")
      const last = thread[thread.length - 1]
      const unread = thread.filter((m) => m.side === "operator" && m.at > (readAt[org.id] ?? 0)).length
      const lastSp = [...thread].reverse().find((m) => m.side === "sp")
      const waiting = thread.filter((m) => m.side === "operator" && !m.call && m.at > (lastSp?.at ?? 0))
      let sla: InboxRow["sla"]
      for (const m of waiting) {
        const t = triage[m.id]
        if (t && t.kind === "none") continue
        const priority: Priority = t?.kind === "ticket" ? t.draft.priority : "Normal"
        const due = slaDue(priority, m.at)
        if (!sla || due < sla.due || RANK[priority] < RANK[sla.priority]) sla = { priority, due, since: m.at }
      }
      return { orgId: org.id, unread, last, sla }
    })
  }, [messages, readAt, triage])
}
