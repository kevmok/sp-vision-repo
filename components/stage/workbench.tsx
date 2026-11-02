"use client"

import * as React from "react"
import { ArrowLeft, Monitor, RotateCcw, Smartphone } from "lucide-react"

import { STAGES, stageById, type StageEntry } from "@/components/stage/catalog"
import { useHydrated, useQueryParam } from "@/lib/use-url"
import { cn } from "@/lib/utils"

// /stage: a workbench for faux SP product UI built with the stageshow kit
// (components/stage/kit). Three views from the query string:
//   /stage/                  every stage, live
//   /stage/?s=<id>           one stage with replay and a phone-width toggle
//   /stage/?capture=<id>     the bare stage in #example, for film.mjs
export function StageWorkbench() {
  const hydrated = useHydrated()
  const capture = useQueryParam("capture")
  const id = useQueryParam("s")
  if (!hydrated) return null

  if (capture) {
    const entry = stageById(capture)
    return entry ? (
      <div id="example">
        <entry.Component />
      </div>
    ) : (
      <Missing id={capture} />
    )
  }

  if (id) {
    const entry = stageById(id)
    return entry ? <Viewer entry={entry} /> : <Missing id={id} />
  }

  return <Index />
}

function Index() {
  const groups = [
    { title: "Phase 1", stages: STAGES.filter((s) => s.phase1) },
    { title: "Other products", stages: STAGES.filter((s) => !s.phase1) },
  ]
  return (
    <main className="mx-auto flex max-w-[860px] flex-col gap-14 px-6 py-10">
      {groups.map((g) => (
        <div key={g.title} className="flex flex-col gap-10">
          <h2 className="text-[15px] font-semibold">{g.title}</h2>
          {g.stages.map((s) => (
            <section key={s.id} className="flex flex-col gap-3">
              <a href={`/stage/?s=${s.id}`} className="w-fit text-[13.5px] font-medium hover:text-copper">
                {s.name}
              </a>
              <s.Component />
            </section>
          ))}
        </div>
      ))}
    </main>
  )
}

function Viewer({ entry }: { entry: StageEntry }) {
  const [run, setRun] = React.useState(0)
  const [phone, setPhone] = React.useState(false)
  return (
    <main className="flex min-h-svh flex-col">
      <header className="flex h-12 items-center gap-3 border-b border-hairline px-4 text-[13px]">
        <a href="/stage/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Stages
        </a>
        <span className="text-muted-foreground/60">/</span>
        <span className="font-medium">{entry.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="flex rounded-lg border border-hairline bg-card p-0.5">
            {[
              { on: false, icon: Monitor, label: "Wide" },
              { on: true, icon: Smartphone, label: "390" },
            ].map(({ on, icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => setPhone(on)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px]",
                  phone === on ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRun((r) => r + 1)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Replay
          </button>
        </div>
      </header>
      <div className="flex flex-1 items-start justify-center px-6 py-10">
        <div className={cn("w-full", phone ? "max-w-[390px]" : "max-w-[1100px]")}>
          <entry.Component key={`${run}-${phone}`} />
        </div>
      </div>
    </main>
  )
}

function Missing({ id }: { id: string }) {
  return (
    <main className="mx-auto max-w-[860px] px-6 py-10 text-[13.5px]">
      No stage called <span className="num">{id}</span>.{" "}
      <a href="/stage/" className="text-copper underline-offset-2 hover:underline">
        All stages
      </a>
    </main>
  )
}
