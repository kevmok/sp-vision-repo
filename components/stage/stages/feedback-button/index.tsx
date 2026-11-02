import { Check, ChevronDown, FileText, MessageSquarePlus, Search } from "lucide-react"

import { Bar, Popover, Stage, States, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./feedback-button.css"

// Insights → Analytics. An operator sends SP a note from the page it's about.
// Copied from stageshow's share gold (a popover measured from its trigger,
// over a page of filler), with form-error's button confirming on itself.
// Beats: the pointer presses Feedback in the top bar; the popover opens with
// the page already attached; one sentence about the heatmap beside it is
// typed; Send turns green and says Sent; the popover closes and the top bar
// keeps the Sent. Plays once; the poster is the sent note, still open.
//
// Real strings: the crumbs, the search field, the trigger, the popover's title,
// the note, the page chip, the button, the org, and the heatmap's title and
// days, which give the note its reason. The rest of the page is filler.

type S = { open: boolean; note: string; sent: boolean; done: boolean }

const NOTE = "Can this heatmap start on Monday?"

const initial: S = { open: false, note: "", sent: false, done: false }
const poster: S = { open: true, note: NOTE, sent: true, done: false }

const REST = { at: "heat", x: 0.86, y: 0.76 }

async function script(a: Act<S>) {
  await a.wait(800)
  a.mark("open")
  await a.click({ at: "feedback", x: 0.5, y: 0.55 })
  a.put({ open: true })
  await a.wait(600)
  a.mark("type")
  await a.type("note", NOTE, { interval: 42 })
  await a.wait(450)
  a.mark("send")
  await a.move({ at: "send", x: 0.68, y: 0.6 })
  await a.wait(300)
  await a.click()
  a.put({ sent: true })
  await a.wait(1300)
  a.mark("close")
  a.put({ open: false, done: true })
  await a.wait(350)
  await a.move(REST, { duration: 800 })
  await a.wait(2200)
}

// Trades by day and two-hour block: evenings and weekends run warmest
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const HOURS = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 3, 1]
const DAY_LIFT = [1, -1, -1, 0, 0, 1, 1]
const heat = (d: number, h: number) => {
  const wobble = (d * 7 + h * 3) % 5 === 0 ? -1 : (d * 5 + h * 11) % 7 === 0 ? 1 : 0
  return Math.max(0, Math.min(4, HOURS[h]! + (HOURS[h]! > 0 ? DAY_LIFT[d]! : 0) + wobble))
}

const NAV: (number | "group" | "selected")[] = ["group", 58, 46, 52, "group", 34, 62, 50, "group", "selected", 56, "group", 40, 44, "group", 52]

function Sidebar() {
  return (
    <div className="fb-side">
      <div className="fb-org">
        <span className="fb-org-mark" />
        <div className="fb-org-lines">
          <Bar w={86} h={7} r={3} tone={4} />
          <Bar w={58} h={6} r={3} tone={2} />
        </div>
      </div>
      <div className="fb-nav">
        {NAV.map((n, i) =>
          n === "group" ? (
            <div key={i} className="fb-nav-group">
              <span className="fb-nav-icon" />
              <Bar w={[60, 44, 52, 38][i % 4]!} h={6} r={3} tone={4} />
            </div>
          ) : (
            <div key={i} className="fb-nav-item" data-selected={n === "selected" || undefined}>
              <Bar w={n === "selected" ? 44 : n} h={6} r={3} tone={n === "selected" ? 5 : 3} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, delta }: { label: number; value: number; delta: number }) {
  return (
    <div className="fb-tile">
      <Bar w={label} h={6} r={3} tone={3} />
      <Bar w={value} h={11} r={4} tone={4} />
      <Bar w={delta} h={6} r={3} tone={2} />
    </div>
  )
}

function Heatmap() {
  return (
    <section className="fb-card" data-target="heat">
      <div className="fb-card-head">
        <span className="fb-card-title">When machines sell</span>
      </div>
      <div className="fb-heat">
        {DAYS.map((day, d) => (
          <div key={day} className="fb-heat-row">
            <span className="fb-heat-day">{day}</span>
            {HOURS.map((_, h) => (
              <span key={h} className="fb-heat-cell" data-level={heat(d, h)} />
            ))}
          </div>
        ))}
        <div className="fb-heat-axis">
          <Bar w={24} h={5} r={2} tone={2} />
          <Bar w={24} h={5} r={2} tone={2} />
          <Bar w={24} h={5} r={2} tone={2} />
        </div>
      </div>
    </section>
  )
}

function Filler({ rows }: { rows: number[] }) {
  return (
    <section className="fb-card">
      <div className="fb-card-head">
        <Bar w={118} h={7} r={3} tone={4} />
      </div>
      <div className="fb-list">
        {rows.map((w, i) => (
          <div key={i} className="fb-list-row">
            <Bar w={64} h={6} r={3} tone={3} />
            <span className="fb-list-track">
              <Bar w={`${w}%`} h={8} r={4} tone={2} />
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Page({ compact }: { compact: boolean }) {
  return (
    <div className="fb-page">
      <div className="fb-scope">
        <span className="fb-select">
          Northline Vending
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </div>
      <div className="fb-tiles">
        <Tile label={52} value={72} delta={40} />
        <Tile label={64} value={58} delta={46} />
        <Tile label={46} value={66} delta={36} />
        {compact && <Tile label={58} value={50} delta={42} />}
      </div>
      {compact ? (
        <Heatmap />
      ) : (
        <div className="fb-cards">
          <Heatmap />
          <Filler rows={[88, 74, 62, 58, 46, 40, 34, 28, 22, 18]} />
        </div>
      )}
    </div>
  )
}

function Trigger({ s }: { s: S }) {
  return (
    <span
      className="fb-trigger"
      data-target="feedback"
      data-cursor="pointer"
      data-on={s.open || undefined}
      data-done={s.done || undefined}
    >
      <States
        value={s.done ? "sent" : "feedback"}
        states={{
          feedback: (
            <span className="fb-label">
              <MessageSquarePlus size={14} strokeWidth={2} />
              <span className="fb-word fb-word--feedback">Feedback</span>
            </span>
          ),
          sent: (
            <span className="fb-label">
              <Check size={14} strokeWidth={2.5} />
              <span className="fb-word fb-word--sent">Sent</span>
            </span>
          ),
        }}
      />
    </span>
  )
}

function Crumbs() {
  return (
    <span className="fb-crumbs">
      <span className="fb-crumb">Insights</span>
      <span className="fb-crumb-sep">/</span>
      <span>Analytics</span>
    </span>
  )
}

function Note({ s }: { s: S }) {
  return (
    <div className="fb-note" data-focused={(s.open && !s.sent) || undefined}>
      <div className="fb-text">
        <span className="fb-placeholder" data-gone={s.note.length > 0 || undefined}>
          What should change here?
        </span>
        <span className="fb-typed">
          {s.note}
          {s.open && !s.sent && <span key={s.note.length} className="fb-caret" />}
        </span>
      </div>
      <span className="fb-chip">
        <FileText size={14} strokeWidth={2} />
        Analytics · Northline Vending
      </span>
    </div>
  )
}

export default function FeedbackButton() {
  return (
    <Stage
      width={880}
      height={480}
      compact={{ below: 760, width: 358, height: 520 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look fb"
    >
      {(s, rect, layout) => {
        const compact = layout === "compact"
        const trigger = rect("feedback")
        const width = compact ? 292 : 320
        return (
          <>
            {/* On a phone the page is its own narrow form: the top bar and the
                page, a gutter from the top and sides, off the bottom */}
            {compact ? (
              <div className="fb-sheet">
                <div className="fb-bar">
                  <Crumbs />
                  <Trigger s={s} />
                </div>
                <Page compact />
              </div>
            ) : (
              <Window
                className="fb-win"
                sidebar={<Sidebar />}
                sidebarWidth={164}
                lead={<Crumbs />}
                toolbar={
                  <span className="fb-tools">
                    <span className="fb-search">
                      <Search size={14} strokeWidth={2} />
                      Jump to
                    </span>
                    <Trigger s={s} />
                  </span>
                }
              >
                <Page compact={false} />
              </Window>
            )}
            <Popover
              show={s.open}
              origin="top right"
              className="fb-pop"
              style={{
                left: trigger.x + trigger.width - width,
                // 8px under the top bar's rule, which sits 9px under the trigger
                top: trigger.y + trigger.height + 17,
                width,
              }}
            >
              <div className="fb-pop-title">Send feedback to SP</div>
              <Note s={s} />
              <span
                className="fb-send"
                data-target="send"
                data-cursor="pointer"
                data-ready={s.note.length > 0 || undefined}
                data-done={s.sent || undefined}
              >
                <States
                  value={s.sent ? "sent" : "send"}
                  states={{
                    send: <span className="fb-label">Send</span>,
                    sent: (
                      <span className="fb-label">
                        <Check size={14} strokeWidth={2.5} />
                        <span className="fb-word fb-word--sent">Sent</span>
                      </span>
                    ),
                  }}
                />
              </span>
            </Popover>
          </>
        )
      }}
    </Stage>
  )
}
