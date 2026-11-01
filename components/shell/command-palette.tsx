"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { HeartPulse, Sparkles } from "lucide-react"

import {
  CommandDialog,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { OrgTile, SpLogo } from "@/components/sp/brand"
import { useOrgSwitch } from "@/components/shell/org-switcher"
import { ORGS } from "@/lib/data"
import { ADMIN_PAGES, OPERATOR_PRODUCTS, crumbs } from "@/lib/nav"
import { useAsk } from "@/lib/ask-store"
import { usePath } from "@/lib/use-path"

const PaletteContext = React.createContext<{ open: boolean; setOpen: (o: boolean) => void }>({
  open: false,
  setOpen: () => {},
})

export const usePalette = () => React.useContext(PaletteContext)

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <PaletteContext.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} setOpen={setOpen} />
    </PaletteContext.Provider>
  )
}

function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const router = useRouter()
  const path = usePath()
  const { isAdmin, toAdmin, toOperator } = useOrgSwitch()
  const { ask, openSheet } = useAsk()
  const [search, setSearch] = React.useState("")
  const go = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} className="top-[12%] shadow-[0_24px_60px_-12px_rgba(27,26,23,0.35)] sm:max-w-xl" title="Jump to">
      <Command loop>
        <CommandInput placeholder="Jump to a product, page or operator" value={search} onValueChange={setSearch} />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No matches</CommandEmpty>
          {isAdmin && (
            <>
              <CommandGroup heading="SP admin">
                {ADMIN_PAGES.map((p) => (
                  <CommandItem key={p.href} value={`admin ${p.title}`} onSelect={() => go(() => router.push(p.href))}>
                    <p.icon />
                    {p.title}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Operator health">
                {ORGS.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={`health ${o.name}`}
                    onSelect={() => go(() => router.push(`/admin/health/${o.id}`))}
                  >
                    <HeartPulse />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          {!isAdmin &&
            OPERATOR_PRODUCTS.filter((p) => p.pages.length > 1).map((product) => (
              <CommandGroup key={product.title} heading={product.title}>
                {product.pages.map((p) => (
                  <CommandItem
                    key={p.href}
                    value={`${product.title} ${p.title}`}
                    onSelect={() => go(() => router.push(p.href))}
                  >
                    <p.icon />
                    {p.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          {!isAdmin && (
            <CommandGroup heading="Products">
              {OPERATOR_PRODUCTS.filter((p) => p.pages.length === 1).map((product) => (
                <CommandItem key={product.title} value={product.title} onSelect={() => go(() => router.push(product.href!))}>
                  <product.icon />
                  {product.title}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Switch org">
            {ORGS.map((o) => (
              <CommandItem key={o.id} value={`switch ${o.name}`} onSelect={() => go(() => toOperator(o.id))}>
                <OrgTile name={o.name} className="size-5 rounded-[4px] text-[8px]" />
                {o.name}
              </CommandItem>
            ))}
            <CommandItem value="switch SP Vending admin" onSelect={() => go(toAdmin)}>
              <SpLogo className="size-5 rounded-[4px] text-[8px]" />
              SP Vending (admin)
            </CommandItem>
          </CommandGroup>
          {!isAdmin && search.trim().length > 2 && (
            <CommandGroup heading="Ask">
              <CommandItem
                forceMount
                value={`ask-${search}`}
                onSelect={() =>
                  go(() => {
                    const q = search
                    setSearch("")
                    if (path === "/ask") ask(q)
                    else openSheet(q, crumbs(path).at(-1))
                  })
                }
              >
                <Sparkles className="text-copper" />
                <span className="truncate">Ask “{search}”</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
