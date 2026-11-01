"use client"

import { Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PersonAvatar, SpLogo } from "@/components/sp/brand"
import { Chip, Panel } from "@/components/sp/ui"
import { ChatThread } from "@/components/support/chat"
import { TicketList } from "@/components/support/triage-panel"
import { SP_TEAM } from "@/lib/data"
import { useOperatorOrg, useStore } from "@/lib/store"

export function OperatorSupport() {
  const org = useOperatorOrg()
  const { startCall } = useStore()
  const me = org.operators[0]!
  const lead = SP_TEAM[org.owner]

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-[640px] gap-3 p-3">
      <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-hairline">
        <ChatThread
          key={org.id}
          orgId={org.id}
          orgName={org.name}
          composerTarget="SP Vending"
          viewer={{ name: me.name, side: "operator" }}
          header={
            <div className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-5">
              <SpLogo className="size-7 rounded-[6px] text-[10px]" />
              <span className="text-[14px] font-semibold">SP Vending</span>
              <Chip tone="ok" className="gap-1.5">
                <span className="size-1.5 rounded-full bg-ok" />
                {lead.name.split(" ")[0]} online
              </Chip>
              <div className="ml-auto flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {org.operators.map((p) => (
                    <PersonAvatar key={p.name} name={p.name} className="size-6 border-2 border-card text-[9px]" />
                  ))}
                  <PersonAvatar name={lead.name} sp className="size-6 border-2 border-card text-[9px]" />
                  {org.owner !== "Alex" && <PersonAvatar name={SP_TEAM.Alex.name} sp className="size-6 border-2 border-card text-[9px]" />}
                </div>
                <Button size="sm" variant="outline" onClick={() => startCall(org.id, me.name, "operator")}>
                  <Video />
                  Start a call
                </Button>
              </div>
            </div>
          }
        />
      </div>
      <aside className="flex w-[340px] shrink-0 flex-col gap-3 overflow-y-auto">
        <TicketList orgId={org.id} />
        <Panel title="Response times">
          <ul className="divide-y divide-hairline text-[13px]">
            {[
              ["Urgent", "1 hour", "bad"],
              ["Normal", "4 hours", "warn"],
              ["Question", "Next day", "muted"],
            ].map(([p, t, tone]) => (
              <li key={p} className="flex items-center gap-2 px-4 py-2.5">
                <Chip tone={tone as "bad"}>{p}</Chip>
                <span className="ml-auto num text-muted-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Your SP team">
          <ul className="divide-y divide-hairline">
            {[
              [lead.name, "Success lead"],
              [SP_TEAM.Alex.name, "Engineering"],
            ]
              .filter((x, i, arr) => arr.findIndex((y) => y[0] === x[0]) === i)
              .map(([n, r]) => (
                <li key={n} className="flex items-center gap-2.5 px-4 py-2.5">
                  <PersonAvatar name={n!} sp />
                  <span className="text-[13px]">{n}</span>
                  <span className="ml-auto text-[12px] text-muted-foreground">{r}</span>
                </li>
              ))}
          </ul>
        </Panel>
      </aside>
    </div>
  )
}
