"use client"

import * as React from "react"

import { ORGS, type Org } from "@/lib/data"
import { computeHealth, computeSignals, isActivated, isWeeklyActive, setupSteps, timeline, type Health, type Signal } from "@/lib/health"
import { useStore } from "@/lib/store"

export type OrgHealth = {
  org: Org
  health: Health
  signals: Signal[]
  open: Signal[]
  done: Signal[]
  activated: boolean
  setupDone: number
  weeklyActive: boolean
  nextCheckpoint: ReturnType<typeof timeline>[number] | undefined
}

export function useAllHealth(): OrgHealth[] {
  const { tickets, doneSignals } = useStore()
  return React.useMemo(
    () =>
      ORGS.map((org) => {
        const health = computeHealth(org, tickets)
        const signals = computeSignals(org, tickets, health)
        return {
          org,
          health,
          signals,
          open: signals.filter((s) => !doneSignals[s.key]),
          done: signals.filter((s) => doneSignals[s.key]),
          activated: isActivated(org),
          setupDone: setupSteps(org).filter((s) => s.done).length,
          weeklyActive: isWeeklyActive(org),
          nextCheckpoint: timeline(org).find((t) => t.state === "next"),
        }
      }),
    [tickets, doneSignals]
  )
}
