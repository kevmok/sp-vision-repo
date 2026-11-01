"use client"

import * as React from "react"
import { Bot, CheckCheck, Link2, ListChecks, MoreHorizontal, Plus, Repeat, Scissors, Trash2, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTile, ConnectDialog } from "@/components/bank/connect-dialog"
import { Chip, Page, PageHeader, Panel } from "@/components/sp/ui"
import { BANK_CATEGORIES, ruleKey, type BankCategory, type Txn } from "@/lib/bank"
import { useBank } from "@/lib/bank-store"
import { money } from "@/lib/format"
import { fmtDate } from "@/lib/time"
import { cn } from "@/lib/utils"

const CAT_ITEMS = BANK_CATEGORIES.map((c) => ({ value: c, label: c }))

function CategorySelect({ value, onChange, className }: { value: BankCategory; onChange: (c: BankCategory) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v as BankCategory)} items={CAT_ITEMS}>
      <SelectTrigger size="sm" className={cn("h-7 w-full bg-card text-[12.5px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {BANK_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c} className="text-[12.5px]">
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Amount({ v, className }: { v: number; className?: string }) {
  return <span className={cn("num", v > 0 ? "text-ok" : "", className)}>{v > 0 ? "+" : "−"}{money(Math.abs(v), { cents: true })}</span>
}

function Confidence({ c }: { c: number }) {
  const tone = c >= 0.9 ? "ok" : c >= 0.75 ? "warn" : "muted"
  return (
    <Chip tone={tone} className="num">
      {Math.round(c * 100)}%
    </Chip>
  )
}

function SplitDialog({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  const { acceptSplit } = useBank()
  const total = Math.abs(txn?.amount ?? 0)
  const [cat2, setCat2] = React.useState<BankCategory>("One-off expense")
  const [first, setFirst] = React.useState("")
  const [cat1, setCat1] = React.useState<BankCategory>("Inventory purchase")
  const a1 = Math.min(total, Math.max(0, Number(first) || 0))
  const a2 = Math.round((total - a1) * 100) / 100
  return (
    <Dialog open={!!txn} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split transaction</DialogTitle>
        </DialogHeader>
        {txn && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-[12.5px]">
              <span className="num truncate">{txn.descriptor}</span>
              <Amount v={txn.amount} />
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <CategorySelect value={cat1} onChange={setCat1} />
              <Input value={first} onChange={(e) => setFirst(e.target.value)} placeholder={(total * 0.7).toFixed(2)} className="num h-7 text-right text-[12.5px]" inputMode="decimal" />
              <CategorySelect value={cat2} onChange={setCat2} />
              <div className="num flex h-7 items-center justify-end rounded-md border border-hairline bg-muted px-2.5 text-[12.5px]">{a2.toFixed(2)}</div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!a1 || !a2}
            onClick={() => {
              if (!txn) return
              const sign = txn.amount < 0 ? -1 : 1
              acceptSplit(txn.id, [
                { category: cat1, amount: sign * a1 },
                { category: cat2, amount: sign * a2 },
              ])
              onClose()
            }}
          >
            Save split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InboxRow({
  t,
  selected,
  onSelect,
  onSplit,
  onFlash,
}: {
  t: Txn
  selected: boolean
  onSelect: (on: boolean) => void
  onSplit: () => void
  onFlash: (msg: string) => void
}) {
  const { accept, setSuggested, addRule, state } = useBank()
  const account = state.accounts.find((a) => a.id === t.accountId)
  const ReasonIcon = t.reasonKind === "rule" ? Repeat : t.reasonKind === "match" ? Link2 : Bot
  return (
    <li className={cn("grid grid-cols-[20px_52px_1fr_244px_120px_auto] items-start gap-3 px-4 py-3", selected && "bg-copper-tint/40")} data-testid="txn-row">
      <Checkbox checked={selected} onCheckedChange={(c) => onSelect(!!c)} className="mt-0.5" aria-label="Select" />
      <span className="num pt-px text-[12px] text-muted-foreground">{fmtDate(t.date)}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="num truncate text-[12.5px] font-medium">{t.descriptor}</span>
          {account && <span className="shrink-0 text-[11px] text-muted-foreground">{account.bank.split(" ")[0]} ••{account.mask}</span>}
        </div>
        {!t.match && (
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <ReasonIcon className="size-3.5 shrink-0" />
            <span className="truncate">{t.reason}</span>
          </div>
        )}
        {t.match && (
          <div className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-copper/30 bg-copper-tint/60 px-2 py-1 text-[12px] text-[#7a3f10]">
            <Link2 className="size-3.5 shrink-0" />
            <span className="truncate">{t.match.text}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Confidence c={t.confidence} />
        <CategorySelect value={t.suggested} onChange={(c) => setSuggested(t.id, c)} />
      </div>
      <Amount v={t.amount} className="pt-1 text-right text-[13px] font-medium" />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={t.confidence >= 0.9 ? "default" : "outline"}
          onClick={() => {
            accept(t.id)
            onFlash(t.match ? `Confirmed ${t.match.ref}` : `${t.suggested} recorded`)
          }}
        >
          {t.match ? "Confirm" : "Accept"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="More" />}>
            <MoreHorizontal />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={onSplit}>
              <Scissors />
              Split
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const r = addRule(t.id, t.suggested)
                if (r) onFlash(`Rule created: “${r.match}” → ${t.suggested}`)
              }}
            >
              <Zap />
              <span className="truncate">
                Always do this for “{ruleKey(t.descriptor)}”
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  )
}

function InboxTab({ onFlash }: { onFlash: (m: string) => void }) {
  const { inbox, bulkAccept } = useBank()
  const [selected, setSelected] = React.useState<string[]>([])
  const [split, setSplit] = React.useState<Txn | null>(null)
  const high = inbox.filter((t) => t.confidence >= 0.9)
  const sel = selected.filter((id) => inbox.some((t) => t.id === id))

  return (
    <Panel
      title="To categorize"
      count={inbox.length}
      action={
        <>
          {sel.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                bulkAccept(sel)
                onFlash(`${sel.length} accepted`)
                setSelected([])
              }}
            >
              <ListChecks />
              Accept {sel.length} selected
            </Button>
          )}
          <Button
            size="sm"
            disabled={!high.length}
            onClick={() => {
              bulkAccept(high.map((t) => t.id))
              onFlash(`${high.length} high-confidence transactions accepted`)
            }}
          >
            <CheckCheck />
            Accept {high.length} high-confidence
          </Button>
        </>
      }
    >
      {inbox.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-10 text-[13px] text-muted-foreground">
          <CheckCheck className="size-4 text-ok" /> All caught up
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[20px_52px_1fr_244px_120px_auto] items-center gap-3 border-b border-hairline bg-[#fbfaf7] px-4 py-2 text-[11.5px] font-medium text-muted-foreground">
            <Checkbox
              checked={sel.length === inbox.length}
              indeterminate={sel.length > 0 && sel.length < inbox.length}
              onCheckedChange={(c) => setSelected(c ? inbox.map((t) => t.id) : [])}
              aria-label="Select all"
            />
            <span>Date</span>
            <span>Transaction</span>
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span className="w-[108px]" />
          </div>
          <ul className="divide-y divide-hairline">
            {inbox.map((t) => (
              <InboxRow
                key={t.id}
                t={t}
                selected={sel.includes(t.id)}
                onSelect={(on) => setSelected((s) => (on ? [...s, t.id] : s.filter((x) => x !== t.id)))}
                onSplit={() => setSplit(t)}
                onFlash={onFlash}
              />
            ))}
          </ul>
        </>
      )}
      <SplitDialog key={split?.id ?? "none"} txn={split} onClose={() => setSplit(null)} />
    </Panel>
  )
}

function RulesTab() {
  const { state, removeRule } = useBank()
  return (
    <Panel title="Rules" count={state.rules.length}>
      <div className="grid grid-cols-[1fr_200px_160px_80px_40px] gap-3 border-b border-hairline bg-[#fbfaf7] px-4 py-2 text-[11.5px] font-medium text-muted-foreground">
        <span>Descriptor contains</span>
        <span>Category</span>
        <span>Created by</span>
        <span className="text-right">Applied</span>
        <span />
      </div>
      <ul className="divide-y divide-hairline" data-testid="rules">
        {state.rules.map((r) => (
          <li key={r.id} className="grid grid-cols-[1fr_200px_160px_80px_40px] items-center gap-3 px-4 py-2.5 text-[13px]">
            <span className="num font-medium">{r.match}</span>
            <span>{r.category}</span>
            <span className="text-muted-foreground">{r.createdBy}</span>
            <span className="num text-right">{r.applied}</span>
            <Button size="icon-xs" variant="ghost" aria-label="Delete rule" onClick={() => removeRule(r.id)}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ReconciledTab() {
  const { state, reconciled } = useBank()
  const inOct = (t: Txn) => new Date(t.date).getUTCMonth() === 9
  const bank = state.txns.filter(inOct).reduce((s, t) => s + t.amount, 0)
  const crm = state.txns.filter((t) => inOct(t) && t.status === "reconciled").reduce((s, t) => s + t.amount, 0)
  const unmatched = state.txns.filter((t) => inOct(t) && t.status === "inbox").length
  const tiles = [
    { label: "Bank total, October", value: money(bank, { cents: true }) },
    { label: "CRM total, October", value: money(crm, { cents: true }) },
    { label: "Difference", value: money(bank - crm, { cents: true }), tone: Math.abs(bank - crm) < 0.01 ? "text-ok" : "text-bad" },
    { label: "Unmatched", value: String(unmatched), tone: unmatched ? "text-warn" : "text-ok" },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-hairline bg-card px-4 py-3.5">
            <div className="text-[12px] font-medium text-muted-foreground">{t.label}</div>
            <div className={cn("num mt-1.5 text-[22px] leading-none font-medium tracking-[-0.04em]", t.tone)}>{t.value}</div>
          </div>
        ))}
      </div>
      <Panel title="Reconciled" count={reconciled.length}>
        <ul className="divide-y divide-hairline">
          {reconciled.map((t) => (
            <li key={t.id} className="grid grid-cols-[52px_1fr_180px_180px_120px] items-center gap-3 px-4 py-2.5 text-[12.5px]">
              <span className="num text-muted-foreground">{fmtDate(t.date)}</span>
              <span className="num truncate">{t.descriptor}</span>
              <span>{t.splits ? t.splits.map((s) => s.category).join(" + ") : t.category}</span>
              <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                <Link2 className="size-3.5 shrink-0" />
                {t.record}
              </span>
              <Amount v={t.amount} className="text-right" />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

export function BankPage() {
  const { state, inbox } = useBank()
  const [connectOpen, setConnectOpen] = React.useState(false)
  const [flash, setFlash] = React.useState<string | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const onFlash = (m: string) => {
    setFlash(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFlash(null), 2600)
  }

  return (
    <Page className="pb-16">
      <PageHeader title="Bank sync" meta={<Chip>Plaid (mock) · read-only</Chip>}>
        <Button size="sm" onClick={() => setConnectOpen(true)}>
          <Plus />
          Connect a bank
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-4 gap-3">
        {state.accounts.map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-hairline bg-card px-4 py-3">
            <BankTile name={a.bank} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium">
                {a.name} <span className="num text-muted-foreground">••{a.mask}</span>
              </div>
              <div className="num mt-0.5 text-[17px] leading-tight font-medium tracking-[-0.03em]">{money(a.balance, { cents: true })}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-ok" />
                {a.bank} · synced {a.syncedMinsAgo ? `${a.syncedMinsAgo}m ago` : "just now"}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => setConnectOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#d6d0c4] text-[13px] text-muted-foreground transition-colors hover:border-copper hover:text-foreground"
        >
          <Plus className="size-4" />
          Connect a bank
        </button>
      </div>

      <Tabs defaultValue="inbox">
        <div className="mb-3 flex items-center gap-3">
          <TabsList>
            <TabsTrigger value="inbox" className="px-3">
              Inbox <span className="num ml-1 text-muted-foreground">{inbox.length}</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="px-3">
              Rules <span className="num ml-1 text-muted-foreground">{state.rules.length}</span>
            </TabsTrigger>
            <TabsTrigger value="reconciled" className="px-3">
              Reconciled
            </TabsTrigger>
          </TabsList>
          {flash && (
            <span className="flex items-center gap-1.5 rounded-md bg-[#e2efe3] px-2 py-1 text-[12px] text-[#2f6e3f]" role="status">
              <CheckCheck className="size-3.5" />
              {flash}
            </span>
          )}
        </div>
        <TabsContent value="inbox">
          <InboxTab onFlash={onFlash} />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="reconciled">
          <ReconciledTab />
        </TabsContent>
      </Tabs>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </Page>
  )
}
