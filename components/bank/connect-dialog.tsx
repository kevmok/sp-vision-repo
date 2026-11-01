"use client"

import * as React from "react"
import { Check, ChevronLeft, Eye, Lock, Search, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { BANKS, MOCK_ACCOUNTS, type Account } from "@/lib/bank"
import { useBank } from "@/lib/bank-store"
import { money, initials } from "@/lib/format"
import { useOperatorOrg } from "@/lib/store"
import { cn } from "@/lib/utils"

export function BankTile({ name, className }: { name: string; className?: string }) {
  const tone = BANKS.find((b) => b.name === name)?.tone ?? "#1b1a17"
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white", className)} style={{ background: tone }}>
      {initials(name)}
    </span>
  )
}

type Step = "intro" | "bank" | "signin" | "accounts" | "done"

export function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const org = useOperatorOrg()
  const { connect } = useBank()
  const [step, setStep] = React.useState<Step>("intro")
  const [bank, setBank] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [picked, setPicked] = React.useState<string[]>([])

  const accounts: Omit<Account, "id" | "syncedMinsAgo">[] = bank ? MOCK_ACCOUNTS[bank]! : []

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o)
      setTimeout(() => {
        setStep("intro")
        setBank(null)
        setPicked([])
        setQuery("")
      }, 200)
  }

  const back: Partial<Record<Step, Step>> = { bank: "intro", signin: "bank", accounts: "signin" }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[400px]" data-testid="plaid-modal">
        <div className="flex h-11 items-center gap-2 border-b border-hairline px-4">
          {back[step] ? (
            <Button size="icon-xs" variant="ghost" onClick={() => setStep(back[step]!)} aria-label="Back">
              <ChevronLeft />
            </Button>
          ) : (
            <span className="size-6" />
          )}
          <span className="mx-auto flex items-center gap-1.5 text-[12px] font-semibold">
            <span className="grid size-4 grid-cols-2 gap-[1.5px]">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="rounded-[1px] bg-ink" />
              ))}
            </span>
            Plaid (mock)
          </span>
          <span className="size-6" />
        </div>

        <div className="flex min-h-[400px] flex-col p-5">
          {step === "intro" && (
            <>
              <div className="flex items-center justify-center gap-2 pt-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-ink text-[13px] font-bold text-white">SP</span>
                <span className="h-px w-8 bg-hairline" />
                <span className="flex size-11 items-center justify-center rounded-xl border border-hairline bg-[#fbfaf7]">
                  <Lock className="size-4" />
                </span>
              </div>
              <DialogTitle className="mt-5 text-center text-[17px] font-semibold">Connect {org.name} to your bank</DialogTitle>
              <ul className="mt-6 flex flex-col gap-3.5 text-[13px]">
                <li className="flex items-center gap-3">
                  <Eye className="size-4 text-copper" />
                  Read-only access to transactions and balances
                </li>
                <li className="flex items-center gap-3">
                  <ShieldCheck className="size-4 text-copper" />
                  SP never sees your bank password
                </li>
              </ul>
              <Button className="mt-auto w-full" onClick={() => setStep("bank")}>
                Continue
              </Button>
            </>
          )}

          {step === "bank" && (
            <>
              <DialogTitle className="text-[16px] font-semibold">Select your bank</DialogTitle>
              <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-input px-2.5">
                <Search className="size-4 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="flex-1 bg-transparent text-[13px] outline-none" />
              </div>
              <ul className="mt-3 flex flex-col">
                {BANKS.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())).map((b) => (
                  <li key={b.name}>
                    <button
                      onClick={() => {
                        setBank(b.name)
                        setStep("signin")
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-muted"
                    >
                      <BankTile name={b.name} className="size-8" />
                      {b.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === "signin" && bank && (
            <form
              className="flex flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault()
                setLoading(true)
                setTimeout(() => {
                  setLoading(false)
                  setPicked(accounts.slice(0, 1).map((a) => a.mask))
                  setStep("accounts")
                }, 900)
              }}
            >
              <div className="flex flex-col items-center gap-3 pt-2">
                <BankTile name={bank} className="size-11 rounded-xl text-[13px]" />
                <DialogTitle className="text-[16px] font-semibold">Sign in to {bank}</DialogTitle>
              </div>
              <div className="mt-5 flex flex-col gap-2.5">
                <Input defaultValue={`${org.id}-ops`} aria-label="Username" className="h-9" />
                <Input defaultValue="demo-password" type="password" aria-label="Password" className="h-9" />
              </div>
              <Button type="submit" className="mt-auto w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {step === "accounts" && bank && (
            <>
              <DialogTitle className="text-[16px] font-semibold">Choose accounts</DialogTitle>
              <ul className="mt-4 flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
                {accounts.map((a) => {
                  const on = picked.includes(a.mask)
                  return (
                    <li key={a.mask}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-3 text-[13px]">
                        <Checkbox checked={on} onCheckedChange={(c) => setPicked((p) => (c ? [...p, a.mask] : p.filter((x) => x !== a.mask)))} />
                        <span className="flex-1">
                          <span className="block font-medium">{a.name}</span>
                          <span className="num text-[11.5px] text-muted-foreground">••{a.mask}</span>
                        </span>
                        <span className="num">{money(a.balance, { cents: true })}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
              <Button className="mt-auto w-full" disabled={!picked.length} onClick={() => setStep("done")}>
                Connect {picked.length} {picked.length === 1 ? "account" : "accounts"}
              </Button>
            </>
          )}

          {step === "done" && bank && (
            <>
              <div className="flex flex-col items-center gap-3 pt-8">
                <span className="flex size-12 items-center justify-center rounded-full bg-ok text-white">
                  <Check className="size-6" strokeWidth={3} />
                </span>
                <DialogTitle className="text-[17px] font-semibold">Connected</DialogTitle>
                <span className="text-[13px] text-muted-foreground">
                  {bank} · {picked.length} {picked.length === 1 ? "account" : "accounts"}
                </span>
              </div>
              <Button
                className="mt-auto w-full"
                onClick={() => {
                  connect(accounts.filter((a) => picked.includes(a.mask)))
                  close(false)
                }}
              >
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
