"use client"

import { SquarePen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AskChat } from "@/components/ask/ask-chat"
import { useAsk } from "@/lib/ask-store"

export function AskPage() {
  const { messages, reset } = useAsk()
  return (
    <div className="flex h-[calc(100svh-3rem)] flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Ask</h1>
        {messages.length > 0 && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={reset}>
            <SquarePen />
            New chat
          </Button>
        )}
      </div>
      <AskChat />
    </div>
  )
}
