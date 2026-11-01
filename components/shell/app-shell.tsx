"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { AppSidebar } from "@/components/shell/app-sidebar"
import { PaletteProvider, usePalette } from "@/components/shell/command-palette"
import { crumbs } from "@/lib/nav"
import { StoreProvider } from "@/lib/store"
import { fmtDay } from "@/lib/time"
import { useStore } from "@/lib/store"

function Topbar() {
  const pathname = usePathname()
  const { setOpen } = usePalette()
  const { now } = useStore()
  const parts = crumbs(pathname)
  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-hairline bg-cream/95 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <nav className="flex items-center gap-1.5 text-[13px]">
        {parts.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && <span className="text-muted-foreground/60">/</span>}
            <span className={i === parts.length - 1 ? "font-medium" : "text-muted-foreground"}>{p}</span>
          </React.Fragment>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-[13px] text-muted-foreground lg:inline">{fmtDay(now)}</span>
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-64 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-[#d6d0c4]"
        >
          <Search className="size-3.5" />
          <span>Jump to</span>
          <KbdGroup className="ml-auto">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <TooltipProvider delay={150}>
        <PaletteProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0 bg-cream">
              <Topbar />
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </PaletteProvider>
      </TooltipProvider>
    </StoreProvider>
  )
}
