import type { Org, Triage, TicketDraft, Category, Priority } from "@/lib/data"

const CHITCHAT = /\b(thanks|thank you|thx|appreciate|awesome|great|nice|lol|haha|cool|love it|sounds good|ok|okay)\b/i

const RULES: { re: RegExp; category: Category; priority: Priority }[] = [
  { re: /\b(offline|down|dead|no power|not connecting|won'?t connect|disconnected)\b/i, category: "Machine offline", priority: "Urgent" },
  { re: /\b(declin\w*|card reader|tap|payment|refund\w*|charged|cashless)\b/i, category: "Payments", priority: "Urgent" },
  { re: /\b(jam\w*|stuck|eating|ate|coil|motor|stall\w*|lane [a-z]?\d)\b/i, category: "Lane fault", priority: "Normal" },
  { re: /\b(map\w*|unmapped|sku|product name)\b/i, category: "Sales mapping", priority: "Question" },
  { re: /\b(restock\w*|planogram|inventory|sold out|lane of)\b/i, category: "Restock", priority: "Question" },
  { re: /\b(host|commission|revenue share|payout)\b/i, category: "Host deal", priority: "Question" },
  { re: /\b(login|password|invite|export|statement|p&l)\b/i, category: "Account", priority: "Question" },
]

export function summarize(text: string) {
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text
  return first.length > 90 ? `${first.slice(0, 87).trimEnd()}…` : first.replace(/[.!?]$/, "")
}

export function triageText(text: string, org: Org): Triage {
  const rule = RULES.find((r) => r.re.test(text))
  if (!rule) {
    if (CHITCHAT.test(text) || text.length < 40) {
      return { kind: "none", reason: "Chit-chat, no issue raised", state: "accepted" }
    }
    const draft: TicketDraft = { category: "Other", priority: text.includes("?") ? "Question" : "Normal", summary: summarize(text) }
    return { kind: "ticket", draft, state: "proposed" }
  }
  const lower = text.toLowerCase()
  const machine = org.machines.find(
    (m) => lower.includes(m.id.toLowerCase()) || lower.includes(m.venue.toLowerCase().split(" ").slice(0, 2).join(" "))
  )
  return {
    kind: "ticket",
    state: "proposed",
    draft: { category: rule.category, priority: rule.priority, machineId: machine?.id, summary: summarize(text) },
  }
}

export const SLA_MS: Record<Priority, number> = {
  Urgent: 60 * 60_000,
  Normal: 4 * 60 * 60_000,
  Question: 0, // next business day, see slaDue
}

export function slaDue(priority: Priority, fromMs: number) {
  if (priority !== "Question") return fromMs + SLA_MS[priority]
  const d = new Date(fromMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 17, 0)
}
