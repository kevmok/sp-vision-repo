import { ArrowUp, Bot, Paperclip, Video } from "lucide-react"

import { Bar, Collapse, Stage, States, Stream, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./call-notes.css"

// Support → the org's chat. A call starts from the thread, and its notes come
// back to it. Copied from stageshow's ai-cards gold: each card opens in the
// thread with its own height, stays as the record, and confirms on itself.
// Beats: the pointer presses Start a call and the button says In call; the
// Teams card drops in; the call ends, on the card and on the button; AI notes
// land under it, the summary streaming, then the action items top to bottom.
// Plays once; the poster is the notes.
//
// Real strings: the header, the call card, the notes, the composer. Earlier
// messages and the sidebar are filler.

const SUMMARY = "B4 at Harbor Lanes has jammed three times this month. The coil is worn, so the lane stays off until Thursday's swap."
const WORDS = SUMMARY.split(" ").length

const ITEMS = [
  { text: "Swap the coil in B4", owner: "ML", sp: false },
  { text: "Check B4's sales after the swap", owner: "SP", sp: true },
  { text: "Send October purchase costs", owner: "DW", sp: false },
]

type Phase = "idle" | "live" | "ended"
type S = { phase: Phase; card: boolean; notes: boolean; words: number; items: number }

const initial: S = { phase: "idle", card: false, notes: false, words: 0, items: 0 }
const poster: S = { phase: "ended", card: true, notes: true, words: WORDS, items: ITEMS.length }

// Under the composer, at the window's foot: off everything the story opens
const REST = { wide: { x: 640, y: 540 }, compact: { x: 290, y: 612 } }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark("start")
  await a.move({ at: "start", x: 0.5, y: 0.55 })
  await a.wait(350)
  await a.click()
  a.put({ phase: "live" })
  await a.wait(320)
  a.mark("card")
  a.put({ card: true })
  await a.wait(500)
  await a.move(REST, { duration: 800 })
  await a.wait(1300)
  a.mark("ended")
  a.put({ phase: "ended" })
  await a.wait(1000)
  a.mark("notes")
  a.put({ notes: true })
  await a.wait(420)
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i })
    await a.wait(46)
  }
  await a.wait(380)
  a.mark("items")
  for (let i = 1; i <= ITEMS.length; i++) {
    a.put({ items: i })
    await a.wait(240)
  }
  await a.wait(3000)
}

// Sidebar filler: the org switcher, then the product groups with Support
// selected, the way the real sidebar sits
const NAV: (number | "group" | "selected")[] = ["group", 58, 46, 52, "group", 34, 62, 50, "group", 56, 40, "group", "selected", 44, 38, 52]

function Sidebar() {
  return (
    <div className="cn-side">
      <div className="cn-org">
        <span className="cn-org-mark" />
        <div className="cn-org-lines">
          <Bar w={86} h={7} r={3} tone={4} />
          <Bar w={58} h={6} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-nav">
        {NAV.map((n, i) =>
          n === "group" ? (
            <div key={i} className="cn-nav-group">
              <span className="cn-nav-icon" />
              <Bar w={[60, 44, 52, 38][i % 4]!} h={6} r={3} tone={4} />
            </div>
          ) : (
            <div key={i} className="cn-nav-item" data-selected={n === "selected" || undefined}>
              <Bar w={n === "selected" ? 44 : n} h={6} r={3} tone={n === "selected" ? 5 : 3} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Pile() {
  return (
    <span className="cn-pile">
      <span className="cn-pile-av cn-pile-av--op">DW</span>
      <span className="cn-pile-av cn-pile-av--op">ML</span>
      <span className="cn-pile-av cn-pile-av--sp">SP</span>
    </span>
  )
}

function StartCall({ s }: { s: S }) {
  return (
    <span className="cn-start" data-target="start" data-cursor="pointer" data-live={s.phase === "live" || undefined}>
      <States
        value={s.phase === "live" ? "live" : "start"}
        align="center"
        states={{
          start: (
            <span className="cn-start-label">
              <Video size={14} strokeWidth={2} />
              Start a call
            </span>
          ),
          live: (
            <span className="cn-start-label">
              <span className="cn-live-dot" />
              In call
            </span>
          ),
        }}
      />
    </span>
  )
}

function CallCard({ s }: { s: S }) {
  const ended = s.phase === "ended"
  return (
    <div className="cn-call" data-ended={ended || undefined}>
      <span className="cn-call-tile">
        <Video size={16} strokeWidth={2} />
      </span>
      <div className="cn-call-text">
        <span className="cn-call-title">Teams meeting</span>
        <span className="cn-call-sub">Northline call</span>
        <States
          value={ended ? "ended" : "link"}
          align="start"
          className="cn-call-state"
          states={{
            link: <span className="cn-call-link">teams.microsoft.com/…</span>,
            ended: <span className="cn-call-done">14 min · Recorded</span>,
          }}
        />
      </div>
      <States
        value={ended ? "ended" : "join"}
        align="end"
        className="cn-call-action"
        states={{
          join: <span className="cn-join">Join</span>,
          ended: <span className="cn-ended">Ended</span>,
        }}
      />
    </div>
  )
}

function Notes({ s }: { s: S }) {
  return (
    <div className="cn-notes">
      <Stream className="cn-summary" text={SUMMARY} count={s.words} />
      <Collapse open={s.items > 0} reveal="drop" from="below">
        <div className="cn-items">
          {ITEMS.map((item, i) => (
            <div key={item.text} className="cn-item" data-on={i < s.items || undefined}>
              <span className="cn-box" />
              <span className="cn-item-text">{item.text}</span>
              <span className={item.sp ? "cn-owner cn-owner--sp" : "cn-owner"}>{item.owner}</span>
            </div>
          ))}
        </div>
      </Collapse>
    </div>
  )
}

function Thread({ s }: { s: S }) {
  return (
    <div className="cn-thread">
      <div className="cn-msg">
        <span className="cn-av cn-av--sp" />
        <div className="cn-lines">
          <Bar w={92} h={7} r={3} tone={4} />
          <Bar w="70%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av" />
        <div className="cn-lines">
          <Bar w={104} h={7} r={3} tone={4} />
          <Bar w="78%" h={7} r={3} tone={2} />
          <Bar w="46%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av cn-av--sp" />
        <div className="cn-lines">
          <Bar w={84} h={7} r={3} tone={4} />
          <Bar w="88%" h={7} r={3} tone={2} />
          <Bar w="60%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av cn-av--sp" />
        <div className="cn-lines">
          <Bar w={96} h={7} r={3} tone={4} />
          <Bar w="86%" h={7} r={3} tone={2} />
          <Bar w="52%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av" />
        <div className="cn-lines">
          <Bar w={120} h={7} r={3} tone={4} />
          <Bar w="74%" h={7} r={3} tone={2} />
          <Bar w={132} h={30} r={8} tone={1} className="cn-file" />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av cn-av--sp" />
        <div className="cn-lines">
          <Bar w={88} h={7} r={3} tone={4} />
          <Bar w="92%" h={7} r={3} tone={2} />
          <Bar w="64%" h={7} r={3} tone={2} />
          <Bar w="38%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="cn-msg">
        <span className="cn-av" />
        <div className="cn-lines">
          <Bar w={110} h={7} r={3} tone={4} />
          <Bar w="68%" h={7} r={3} tone={2} />
        </div>
      </div>
      <Collapse open={s.card} reveal="drop" from="below">
        <div className="cn-msg cn-msg--real">
          <span className="cn-av cn-av--op">DW</span>
          <div className="cn-meta">
            <span className="cn-name">Dana Whitfield</span>
            <span className="cn-time">2:14 PM</span>
          </div>
          <div className="cn-content">
            <CallCard s={s} />
          </div>
        </div>
      </Collapse>
      <Collapse open={s.notes} reveal="drop" from="below">
        <div className="cn-msg cn-msg--real">
          <span className="cn-av cn-av--bot">
            <Bot size={16} strokeWidth={2} />
          </span>
          <div className="cn-meta">
            <span className="cn-name">AI notes</span>
            <span className="cn-time">2:29 PM</span>
          </div>
          <div className="cn-content">
            <Notes s={s} />
          </div>
        </div>
      </Collapse>
    </div>
  )
}

function Composer() {
  return (
    <div className="cn-composer">
      <Paperclip size={15} strokeWidth={2} className="cn-clip" />
      <span>Message SP Vending</span>
      <span className="cn-send">
        <ArrowUp size={14} strokeWidth={2.25} />
      </span>
    </div>
  )
}

function Body({ s }: { s: S }) {
  return (
    <div className="cn-body">
      <Thread s={s} />
      <Composer />
    </div>
  )
}

export default function CallNotes() {
  return (
    <Stage
      width={800}
      height={560}
      compact={{ below: 680, width: 358, height: 632 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look cn"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <div className="cn-sheet">
            <div className="cn-head">
              <span className="cn-logo">SP</span>
              <span className="cn-org-name">SP Vending</span>
              <StartCall s={s} />
            </div>
            <Body s={s} />
          </div>
        ) : (
          <Window
            title="SP Vending"
            toolbar={
              <span className="cn-tools">
                <Pile />
                <StartCall s={s} />
              </span>
            }
            sidebar={<Sidebar />}
            sidebarWidth={164}
            className="cn-win"
          >
            <Body s={s} />
          </Window>
        )
      }
    </Stage>
  )
}
