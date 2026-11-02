import { Bot, Check, ChevronDown, Ticket } from "lucide-react"

import { Bar, Collapse, Stage, States, Swap, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./triage-ticket.css"

// SP admin → Support inbox. An operator's message becomes a ticket. Copied
// from stageshow's panel-annotation gold: the product large behind, the tool
// smaller in front straddling its right edge over the chat's empty margin.
// Beats: Dana's message lands in the chat; a proposed ticket opens at the top
// of the AI triage panel and its fields resolve top to bottom; the pointer
// presses Create ticket; T-1047 replaces "Proposed" on the panel and on the
// message together, which ties the two. Plays once; the poster is the
// created ticket.
//
// Real strings: the org, Dana's name, time and message, the panel's title,
// the three fields and their values, the button, the tag. Earlier messages,
// the triage history and the chat's chrome are filler.

type S = { msg: boolean; proposal: boolean; fields: number; created: boolean; tagged: boolean }

const initial: S = { msg: false, proposal: false, fields: 0, created: false, tagged: false }
const poster: S = { msg: true, proposal: true, fields: 3, created: true, tagged: true }

const MESSAGE = "The card reader at Maple St Laundromat is declining every tap since this morning. Cash still works."
const REST = { at: "thread", x: 0.86, y: 0.12 }

async function script(a: Act<S>) {
  await a.wait(800)
  a.mark("arrive")
  a.put({ msg: true })
  await a.wait(700)
  a.mark("triage")
  a.put({ proposal: true })
  await a.wait(650)
  for (let i = 1; i <= 3; i++) {
    a.put({ fields: i })
    await a.wait(280)
  }
  await a.wait(500)
  a.mark("create")
  await a.move({ at: "create", x: 0.5, y: 0.55 })
  await a.wait(400)
  await a.click()
  a.put({ created: true })
  // The ticket lands on the message a beat after the press
  await a.wait(380)
  a.put({ tagged: true })
  await a.wait(700)
  await a.move(REST, { duration: 800 })
  await a.wait(2200)
}

function Tag({ tagged }: { tagged: boolean }) {
  return (
    <span className="tt-tag" data-tagged={tagged || undefined}>
      <Ticket size={12} strokeWidth={2} />
      <Swap id={tagged ? "t" : "p"}>{tagged ? "T-1047" : "Proposed"}</Swap>
    </span>
  )
}

function Chat({ s }: { s: S }) {
  return (
    <div className="tt-chat">
      <div className="tt-thread" data-target="thread">
        <div className="tt-msg">
          <span className="tt-av tt-av--sp" />
          <div className="tt-lines">
            <Bar w={88} h={7} r={3} tone={4} />
            <Bar w="84%" h={7} r={3} tone={2} />
            <Bar w="40%" h={7} r={3} tone={2} />
          </div>
        </div>
        <div className="tt-msg">
          <span className="tt-av" />
          <div className="tt-lines">
            <Bar w={112} h={7} r={3} tone={4} />
            <Bar w="92%" h={7} r={3} tone={2} />
            <Bar w="58%" h={7} r={3} tone={2} />
            <Bar w={44} h={22} r={11} tone={1} className="tt-react" />
          </div>
        </div>
        <div className="tt-msg">
          <span className="tt-av tt-av--sp" />
          <div className="tt-lines">
            <Bar w={96} h={7} r={3} tone={4} />
            <Bar w="76%" h={7} r={3} tone={2} />
          </div>
        </div>
        <div className="tt-day">
          <Bar w={86} h={22} r={11} tone={1} />
        </div>
        <Collapse open={s.msg} reveal="drop" from="below">
          <div className="tt-msg tt-msg--new">
            <span className="tt-av tt-av--dw">DW</span>
            <div className="tt-lines">
              <div className="tt-meta">
                <span className="tt-name">Dana Whitfield</span>
                <span className="tt-time">2:48 PM</span>
                <Tag tagged={s.tagged} />
              </div>
              <p className="tt-text">{MESSAGE}</p>
            </div>
          </div>
        </Collapse>
      </div>
      <div className="tt-composer">
        <span>Message Northline Vending</span>
      </div>
    </div>
  )
}

function Field({ label, on, children }: { label: string; on: boolean; children: React.ReactNode }) {
  return (
    <div className="tt-field">
      <span className="tt-label">{label}</span>
      <States
        value={on ? "done" : "pending"}
        align="start"
        className="tt-value"
        states={{
          pending: <Bar w={120} h={8} r={4} tone={2} className="tt-pending" />,
          done: children,
        }}
      />
    </div>
  )
}

function Select({ children }: { children: React.ReactNode }) {
  return (
    <span className="tt-select">
      <span>{children}</span>
      <ChevronDown size={14} strokeWidth={2} />
    </span>
  )
}

function Panel({ s, compact }: { s: S; compact: boolean }) {
  return (
    <section className="tt-panel">
      <div className="tt-panel-head">
        <Bot size={15} strokeWidth={2} className="tt-bot" />
        <span className="tt-panel-title">AI triage</span>
      </div>
      <Collapse open={s.proposal} reveal="drop">
        <div className="tt-proposal">
          <div className="tt-prop-head">
            <span className="tt-name">Dana Whitfield</span>
            <span className="tt-time">2:48 PM</span>
            <span className="tt-badge" data-tagged={s.tagged || undefined}>
              <Swap id={s.tagged ? "t" : "p"}>{s.tagged ? "T-1047" : "Proposed"}</Swap>
            </span>
          </div>
          {/* The panel quotes the message; in the wide shot the chat beside it
              already says it, so only the phone's panel carries it */}
          {compact && <p className="tt-quote">{MESSAGE}</p>}
          <Field label="Category" on={s.fields >= 1}>
            <Select>Payments</Select>
          </Field>
          <Field label="Machine" on={s.fields >= 2}>
            <Select>Maple St Laundromat</Select>
          </Field>
          <Field label="Priority" on={s.fields >= 3}>
            <span className="tt-seg">
              <span data-on>Urgent</span>
              <span>Normal</span>
              <span>Question</span>
            </span>
          </Field>
          <span className="tt-create" data-target="create" data-cursor="pointer" data-done={s.created || undefined}>
            <Swap id={s.created ? "done" : "create"}>
              {s.created ? (
                <span className="tt-create-label">
                  <Check size={14} strokeWidth={2.5} />
                  Ticket created
                </span>
              ) : (
                <span className="tt-create-label">
                  <Ticket size={14} strokeWidth={2} />
                  Create ticket
                </span>
              )}
            </Swap>
          </span>
        </div>
      </Collapse>
      {[150, 128, 164, 140, 118, 156, 134, 146].map((w, i) => (
        <div key={i} className="tt-history">
          <div className="tt-history-lines">
            <Bar w={w} h={7} r={3} tone={3} />
            <Bar w={w - 46} h={6} r={3} tone={2} />
          </div>
          <Bar w={i % 3 === 1 ? 46 : 64} h={20} r={6} tone={1} />
        </div>
      ))}
    </section>
  )
}

export default function TriageTicket() {
  return (
    <Stage
      width={840}
      height={480}
      compact={{ below: 720, width: 358, height: 560 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: REST, compact: { x: 300, y: 540 } } }}
      className="sp-look tt"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <Panel s={s} compact />
        ) : (
          <>
            <Window title="Northline Vending" toolbar={<span className="tt-call" />} className="tt-win">
              <Chat s={s} />
            </Window>
            <Panel s={s} compact={false} />
          </>
        )
      }
    </Stage>
  )
}
