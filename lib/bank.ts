import { ORGS, chainOf, type Org } from "@/lib/data"
import { at } from "@/lib/time"

export type BankCategory =
  | "Inventory purchase"
  | "One-off expense"
  | "One-off gain"
  | "Employee earnings"
  | "Loader pay"
  | "Maintenance"
  | "Host payout"
  | "Sales deposit"
  | "Transfer / ignore"

export const BANK_CATEGORIES: BankCategory[] = [
  "Inventory purchase",
  "One-off expense",
  "One-off gain",
  "Employee earnings",
  "Loader pay",
  "Maintenance",
  "Host payout",
  "Sales deposit",
  "Transfer / ignore",
]

export type Account = {
  id: string
  bank: string
  name: string
  mask: string
  balance: number
  syncedMinsAgo: number
}

export type Split = { category: BankCategory; amount: number }

export type Txn = {
  id: string
  orgId: string
  date: number
  descriptor: string
  amount: number
  accountId: string
  suggested: BankCategory
  confidence: number
  reasonKind: "rule" | "ai" | "match"
  reason: string
  match?: { ref: string; text: string }
  status: "inbox" | "reconciled"
  category?: BankCategory
  splits?: Split[]
  record?: string
}

export type Rule = { id: string; match: string; category: BankCategory; createdBy: string; applied: number }

export type BankState = { accounts: Account[]; txns: Txn[]; rules: Rule[] }

export const BANKS = [
  { name: "Prairie First Bank", tone: "#1b1a17" },
  { name: "Northstar Credit Union", tone: "#3f6fb0" },
  { name: "Harborline Bank", tone: "#2a9d8f" },
  { name: "Summit Federal", tone: "#8e5aa8" },
  { name: "Cobalt Card", tone: "#b3631c" },
  { name: "Great Plains Trust", tone: "#c99a14" },
  { name: "Keystone Community Bank", tone: "#c25d7b" },
  { name: "Riverbend Savings", tone: "#6e6a61" },
]

export const MOCK_ACCOUNTS: Record<string, Omit<Account, "id" | "syncedMinsAgo">[]> = Object.fromEntries(
  BANKS.map((b, i) => [
    b.name,
    [
      { bank: b.name, name: "Business checking", mask: String(4100 + i * 137).slice(-4), balance: 9200 + i * 1830.25 },
      { bank: b.name, name: "Business savings", mask: String(7300 + i * 91).slice(-4), balance: 22000 + i * 2410.5 },
      { bank: b.name, name: "Operating reserve", mask: String(2200 + i * 53).slice(-4), balance: 5100 + i * 712.8 },
    ],
  ])
)

/** Normalise a bank descriptor into the stable part a rule matches on. */
export function ruleKey(descriptor: string) {
  return descriptor
    .replace(/[#••]?\d[\d/.-]*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 2)
    .join(" ")
}

function seed(org: Org): BankState {
  const k = Math.max(0.6, org.machines.length / 4)
  const amt = (n: number) => Math.round(n * k * 100) / 100
  const city = org.city.split(",")[0]!.toUpperCase()
  const hostVenue = org.machines.find((m) => chainOf(m.venue) !== "Independents")?.venue ?? org.machines[0]!.venue
  const host = chainOf(hostVenue) !== "Independents" ? chainOf(hostVenue) : hostVenue
  const id = (n: number) => `${org.id}-tx${n}`
  const chk = `${org.id}-chk`
  const card = `${org.id}-card`

  const inbox: Omit<Txn, "orgId" | "status">[] = [
    {
      id: id(1),
      date: at(10, 30, 9),
      descriptor: "CARDHAVEN DISTRIBUTION INV 88213",
      amount: -amt(1284.6),
      accountId: chk,
      suggested: "Inventory purchase",
      confidence: 0.97,
      reasonKind: "match",
      reason: "Same vendor, amount and date as a purchase already in the CRM",
      match: { ref: "P-1042", text: "Matches purchase P-1042 already logged — confirm, don't duplicate" },
    },
    {
      id: id(2),
      date: at(10, 31, 6),
      descriptor: "TAPWAVE PAYOUT 10/28-10/30",
      amount: amt(1962.35),
      accountId: chk,
      suggested: "Sales deposit",
      confidence: 0.99,
      reasonKind: "match",
      reason: "Card processor payout",
      match: { ref: "Sales Oct 28–30", text: `Card processor payout matches ${Math.round(312 * k)} sales Oct 28–30` },
    },
    {
      id: id(3),
      date: at(10, 29, 11),
      descriptor: `ACH ${host.toUpperCase()} HOSTPAY`,
      amount: -amt(418.2),
      accountId: chk,
      suggested: "Host payout",
      confidence: 0.92,
      reasonKind: "match",
      reason: "Host payout to a host with a statement on file",
      match: { ref: `Q3 statement · ${host}`, text: `Matches Q3 host statement for ${host}` },
    },
    {
      id: id(4),
      date: at(11, 1, 8),
      descriptor: "SQUISH SUPPLY CO 20931",
      amount: -amt(538.4),
      accountId: card,
      suggested: "Inventory purchase",
      confidence: 0.93,
      reasonKind: "ai",
      reason: "AI: squishy supplier, the last 4 orders were inventory",
    },
    {
      id: id(5),
      date: at(10, 31, 12),
      descriptor: "PAYROLL LEDGERLY 10/31",
      amount: -amt(1140),
      accountId: chk,
      suggested: "Employee earnings",
      confidence: 0.95,
      reasonKind: "rule",
      reason: "Matches rule: LEDGERLY → Employee earnings",
    },
    {
      id: id(6),
      date: at(10, 29, 15),
      descriptor: "TRANSFER TO SAVINGS ••0392",
      amount: -amt(2000),
      accountId: chk,
      suggested: "Transfer / ignore",
      confidence: 0.99,
      reasonKind: "rule",
      reason: "Matches rule: transfers between your own accounts",
    },
    {
      id: id(7),
      date: at(10, 31, 16),
      descriptor: "VTM PARTS ORDER 55120",
      amount: -amt(212),
      accountId: card,
      suggested: "Maintenance",
      confidence: 0.9,
      reasonKind: "rule",
      reason: "Matches rule: VTM PARTS → Maintenance",
    },
    {
      id: id(8),
      date: at(10, 30, 14),
      descriptor: "SWEETLINE WHOLESALE #4471",
      amount: -amt(362.18),
      accountId: card,
      suggested: "Inventory purchase",
      confidence: 0.88,
      reasonKind: "ai",
      reason: "AI: looks like an inventory purchase from a snack wholesaler",
    },
    {
      id: id(9),
      date: at(10, 31, 18),
      descriptor: "P2P TO RILEY CHEN",
      amount: -180,
      accountId: chk,
      suggested: "Loader pay",
      confidence: 0.74,
      reasonKind: "ai",
      reason: "AI: weekly transfer to Riley Chen, same amount as the last 3 weeks",
    },
    {
      id: id(10),
      date: at(10, 27, 10),
      descriptor: `CITY OF ${city} LICENSE`,
      amount: -150,
      accountId: chk,
      suggested: "One-off expense",
      confidence: 0.81,
      reasonKind: "ai",
      reason: "AI: city vending permit renewal",
    },
    {
      id: id(11),
      date: at(10, 26, 13),
      descriptor: "MERIDIAN MUTUAL CLAIM REFUND",
      amount: 640,
      accountId: chk,
      suggested: "One-off gain",
      confidence: 0.77,
      reasonKind: "ai",
      reason: "AI: insurance claim refund",
    },
    {
      id: id(12),
      date: at(10, 28, 17),
      descriptor: "NORTHERN LOCK & KEY",
      amount: -96.5,
      accountId: card,
      suggested: "Maintenance",
      confidence: 0.68,
      reasonKind: "ai",
      reason: "AI: locksmith, likely a machine lock repair",
    },
    {
      id: id(13),
      date: at(11, 1, 11),
      descriptor: "ORDERPOINT MARKETPLACE 7731",
      amount: -64.99,
      accountId: card,
      suggested: "One-off expense",
      confidence: 0.52,
      reasonKind: "ai",
      reason: "AI: unclear marketplace purchase",
    },
  ]

  const done: Omit<Txn, "orgId" | "status" | "confidence" | "reasonKind" | "reason">[] = [
    { id: id(20), date: at(10, 3, 9), descriptor: "TAPWAVE PAYOUT 09/30-10/02", amount: amt(1712.4), accountId: chk, suggested: "Sales deposit", category: "Sales deposit", record: "312 sales" },
    { id: id(21), date: at(10, 6, 10), descriptor: "CARDHAVEN DISTRIBUTION INV 87990", amount: -amt(1102.75), accountId: chk, suggested: "Inventory purchase", category: "Inventory purchase", record: "P-1031" },
    { id: id(22), date: at(10, 10, 9), descriptor: "TAPWAVE PAYOUT 10/07-10/09", amount: amt(1845.1), accountId: chk, suggested: "Sales deposit", category: "Sales deposit", record: "334 sales" },
    { id: id(23), date: at(10, 12, 12), descriptor: "PAYROLL LEDGERLY 10/15", amount: -amt(1140), accountId: chk, suggested: "Employee earnings", category: "Employee earnings", record: "Payroll Oct 1–15" },
    { id: id(24), date: at(10, 14, 15), descriptor: "SWEETLINE WHOLESALE #4402", amount: -amt(298.6), accountId: card, suggested: "Inventory purchase", category: "Inventory purchase", record: "P-1035" },
    { id: id(25), date: at(10, 17, 9), descriptor: "TAPWAVE PAYOUT 10/14-10/16", amount: amt(1890.8), accountId: chk, suggested: "Sales deposit", category: "Sales deposit", record: "341 sales" },
    { id: id(26), date: at(10, 20, 16), descriptor: "VTM PARTS ORDER 54871", amount: -amt(145), accountId: card, suggested: "Maintenance", category: "Maintenance", record: "Lane motor" },
    { id: id(27), date: at(10, 22, 11), descriptor: "P2P TO RILEY CHEN", amount: -180, accountId: chk, suggested: "Loader pay", category: "Loader pay", record: "Loader pay wk 42" },
    { id: id(28), date: at(10, 24, 9), descriptor: "TAPWAVE PAYOUT 10/21-10/23", amount: amt(1931.15), accountId: chk, suggested: "Sales deposit", category: "Sales deposit", record: "349 sales" },
  ]

  return {
    accounts: [
      { id: chk, bank: "Prairie First Bank", name: "Business checking", mask: "4821", balance: amt(18240.55), syncedMinsAgo: 4 },
      { id: card, bank: "Cobalt Card", name: "Business card", mask: "1107", balance: -amt(2315.4), syncedMinsAgo: 4 },
    ],
    txns: [
      ...inbox.map((t) => ({ ...t, orgId: org.id, status: "inbox" as const })),
      ...done.map((t) => ({ ...t, orgId: org.id, status: "reconciled" as const, confidence: 1, reasonKind: "rule" as const, reason: "" })),
    ],
    rules: [
      { id: `${org.id}-r1`, match: "PAYROLL LEDGERLY", category: "Employee earnings", createdBy: "Andrew Park", applied: 4 },
      { id: `${org.id}-r2`, match: "TRANSFER TO", category: "Transfer / ignore", createdBy: "Andrew Park", applied: 7 },
      { id: `${org.id}-r3`, match: "VTM PARTS", category: "Maintenance", createdBy: org.operators[0]!.name, applied: 3 },
      { id: `${org.id}-r4`, match: "TAPWAVE PAYOUT", category: "Sales deposit", createdBy: "Andrew Park", applied: 12 },
    ],
  }
}

export const SEED_BANK: Record<string, BankState> = Object.fromEntries(ORGS.map((o) => [o.id, seed(o)]))
