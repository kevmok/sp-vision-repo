"use client"

import * as React from "react"

import { SEED_BANK, ruleKey, type Account, type BankCategory, type BankState, type Rule, type Split, type Txn } from "@/lib/bank"
import { useOperatorOrg } from "@/lib/store"

type BankStore = {
  state: BankState
  inbox: Txn[]
  reconciled: Txn[]
  accept: (id: string, category?: BankCategory) => void
  acceptSplit: (id: string, splits: Split[]) => void
  bulkAccept: (ids: string[]) => void
  setSuggested: (id: string, category: BankCategory) => void
  addRule: (txnId: string, category: BankCategory) => Rule | undefined
  removeRule: (id: string) => void
  connect: (accounts: Omit<Account, "id" | "syncedMinsAgo">[]) => void
}

const Ctx = React.createContext<BankStore | null>(null)

const RECORD: Partial<Record<BankCategory, string>> = {
  "Inventory purchase": "New purchase · FIFO",
  "Host payout": "Host payout",
  "Sales deposit": "Sales",
  "Employee earnings": "Payroll",
  "Loader pay": "Loader pay",
  Maintenance: "Maintenance",
  "One-off expense": "One-off expense",
  "One-off gain": "One-off gain",
}

export function BankProvider({ children }: { children: React.ReactNode }) {
  const org = useOperatorOrg()
  const [all, setAll] = React.useState<Record<string, BankState>>(SEED_BANK)
  const state = all[org.id]!

  const update = React.useCallback(
    (fn: (s: BankState) => BankState) => setAll((a) => ({ ...a, [org.id]: fn(a[org.id]!) })),
    [org.id]
  )

  const reconcile = (t: Txn, category: BankCategory, splits?: Split[]): Txn => ({
    ...t,
    status: "reconciled",
    category,
    splits,
    record: t.match?.ref ?? (splits ? `Split · ${splits.length} records` : RECORD[category] ?? "—"),
  })

  const store: BankStore = {
    state,
    inbox: state.txns.filter((t) => t.status === "inbox").sort((a, b) => b.date - a.date),
    reconciled: state.txns.filter((t) => t.status === "reconciled").sort((a, b) => b.date - a.date),
    accept: (id, category) =>
      update((s) => ({ ...s, txns: s.txns.map((t) => (t.id === id ? reconcile(t, category ?? t.suggested) : t)) })),
    acceptSplit: (id, splits) =>
      update((s) => ({ ...s, txns: s.txns.map((t) => (t.id === id ? reconcile(t, splits[0]!.category, splits) : t)) })),
    bulkAccept: (ids) =>
      update((s) => ({ ...s, txns: s.txns.map((t) => (ids.includes(t.id) ? reconcile(t, t.suggested) : t)) })),
    setSuggested: (id, category) =>
      update((s) => ({ ...s, txns: s.txns.map((t) => (t.id === id ? { ...t, suggested: category } : t)) })),
    addRule: (txnId, category) => {
      const t = state.txns.find((x) => x.id === txnId)
      if (!t) return
      const match = ruleKey(t.descriptor)
      const rule: Rule = { id: `rule-${Date.now().toString(36)}`, match, category, createdBy: org.operators[0]!.name, applied: 0 }
      update((s) => {
        let applied = 0
        const txns = s.txns.map((x) => {
          if (x.status === "inbox" && ruleKey(x.descriptor) === match) {
            applied++
            return reconcile(x, category)
          }
          return x
        })
        return { ...s, txns, rules: [{ ...rule, applied }, ...s.rules.filter((r) => r.match !== match)] }
      })
      return rule
    },
    removeRule: (id) => update((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) })),
    connect: (accounts) =>
      update((s) => ({
        ...s,
        accounts: [
          ...s.accounts,
          ...accounts.map((a, i) => ({ ...a, id: `acc-${Date.now().toString(36)}-${i}`, syncedMinsAgo: 0 })),
        ],
      })),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useBank() {
  const s = React.useContext(Ctx)
  if (!s) throw new Error("useBank outside BankProvider")
  return s
}
