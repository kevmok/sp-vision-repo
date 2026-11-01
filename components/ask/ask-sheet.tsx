"use client"

import { Maximize2, Sparkles, SquarePen } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { AskChat } from "@/components/ask/ask-chat"
import { useAsk } from "@/lib/ask-store"
import { crumbs } from "@/lib/nav"
import { usePath } from "@/lib/use-path"

export function AskLauncher() {
  const path = usePath()
  const router = useRouter()
  const { sheetOpen, setSheetOpen, reset, messages } = useAsk()
  const isAdmin = path.startsWith("/admin")
  const context = crumbs(path).at(-1)
  if (isAdmin || path === "/ask") return null

  return (
    <>
      {!sheetOpen && (
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed right-5 bottom-5 z-30 flex h-10 items-center gap-2 rounded-full bg-ink pr-4 pl-3.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-6px_rgba(27,26,23,0.45)] transition-transform hover:-translate-y-px"
        >
          <Sparkles className="size-4 text-[#e8c9a2]" />
          Ask
        </button>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[520px] gap-0 p-0 data-[side=right]:sm:max-w-[520px]">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline pr-12 pl-4">
            <Sparkles className="size-4 text-copper" />
            <SheetTitle className="text-[14px] font-semibold">Ask</SheetTitle>
            {context && <span className="rounded-md bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground">{context}</span>}
            <div className="ml-auto flex gap-1">
              {messages.length > 0 && (
                <Button size="icon-sm" variant="ghost" aria-label="New chat" onClick={reset}>
                  <SquarePen />
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Open full page"
                onClick={() => {
                  setSheetOpen(false)
                  router.push("/ask")
                }}
              >
                <Maximize2 />
              </Button>
            </div>
          </div>
          <AskChat compact context={context} />
        </SheetContent>
      </Sheet>
    </>
  )
}
