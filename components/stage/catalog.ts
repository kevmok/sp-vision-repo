import type { ComponentType } from "react"

import AdminHealth from "./stages/admin-health"
import AskQuiet from "./stages/ask-quiet"
import BankMatch from "./stages/bank-match"
import CallNotes from "./stages/call-notes"
import FeedbackButton from "./stages/feedback-button"
import OnboardingTour from "./stages/onboarding-tour"
import OrgChat from "./stages/org-chat"
import ShellJump from "./stages/shell-jump"
import TriageTicket from "./stages/triage-ticket"
import UsageTracking from "./stages/usage-tracking"

// Every SP stage, in the order the /stage index shows them. A stage is a
// folder in components/stage/stages/<id>/ with a default-exported component.
export type StageEntry = {
  id: string
  name: string
  /** Which SP surface it draws, and the gold example it was copied from. */
  note: string
  /** The Phase 1 app-work item it draws, from the roadmap. Unset when it isn't one. */
  phase1?: string
  Component: ComponentType
}

export const STAGES: StageEntry[] = [
  {
    id: "shell-jump",
    name: "App shell: jump between products",
    note: "The shadcn shell. ⌘K jumps from Operations to Insights → Analytics, and the sidebar follows. From the linear study's command menu.",
    phase1: "UI overhaul",
    Component: ShellJump,
  },
  {
    id: "org-chat",
    name: "Org chat: one thread with SP",
    note: "Support. An operator sends a photo into the org's one thread, SP replies, and the message is pinned, rolling the pinned bar from 2 to 3. From the slack study, with upload's file chip.",
    phase1: "Org chat to SP",
    Component: OrgChat,
  },
  {
    id: "admin-health",
    name: "SP admin: operator health",
    note: "SP admin → Operator health. Marking a play done lifts Juniper Vending from Red to Yellow, and the band counts follow. From the table-edit gold, framed like panel-annotation.",
    phase1: "SP admin view",
    Component: AdminHealth,
  },
  {
    id: "feedback-button",
    name: "Feedback button",
    note: "Insights → Analytics. A note about the heatmap is sent from the page with the page attached, and Send confirms on itself. From the share gold, with form-error's button.",
    phase1: "Feedback button",
    Component: FeedbackButton,
  },
  {
    id: "usage-tracking",
    name: "Usage tracking: weekly active",
    note: "SP admin → Usage. The pointer reads weekly active week by week, through the target of 7 to this week's 8/10. From the chart-scrub gold.",
    phase1: "Usage tracking",
    Component: UsageTracking,
  },
  {
    id: "call-notes",
    name: "Teams call with AI notes",
    note: "Support. A call started from the chat ends with a Teams card and AI notes in the thread: a summary and who owes what. From the ai-cards gold.",
    phase1: "Teams call links with AI notes",
    Component: CallNotes,
  },
  {
    id: "triage-ticket",
    name: "Support inbox: a message becomes a ticket",
    note: "SP admin → Support inbox. AI triage proposes a ticket from an operator's message; Create ticket tags the message T-1047. From the panel-annotation gold.",
    phase1: "Ticket triage agent",
    Component: TriageTicket,
  },
  {
    id: "onboarding-tour",
    name: "Onboarding tour",
    note: "Operator home → Pilot setup. A tour card presses through a step: the step ticks, the count rolls to 2 of 4, and the card glides to the next step. From the hero-demo gold.",
    phase1: "Onboarding tour",
    Component: OnboardingTour,
  },
  {
    id: "ask-quiet",
    name: "Ask: machines that went quiet",
    note: "Insights → Ask. A question sent, the answer streamed, its table dropping in. From the ai-chat gold.",
    Component: AskQuiet,
  },
  {
    id: "bank-match",
    name: "Bank sync: confirm a matched purchase",
    note: "Money → Bank sync. A card payment matched to a logged purchase is confirmed and leaves the inbox. From the table-edit gold, with gmail's row leaving.",
    Component: BankMatch,
  },
]

export const stageById = (id: string | null) => STAGES.find((s) => s.id === id)
