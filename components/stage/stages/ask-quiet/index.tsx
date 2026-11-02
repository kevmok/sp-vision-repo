import { ArrowUp, Sparkles, X } from "lucide-react"

import { Bar, Collapse, Field, Stage, Stream, Text, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./ask-quiet.css"

// Insights → Ask, answering an operator's question with a table. Copied from
// stageshow's ai-chat gold: same beats, same Collapse and Stream handling.
// Beats: the question is typed into the composer and sent; it lands as an
// ink bubble; "Querying your data" with the copper dots; the answer streams
// in; the table drops in under it, rows top to bottom. Plays once; the
// poster is the payoff.
//
// Real strings: the question, the answer, the table (three machines), the
// composer placeholder and the "Ask" heading. The earlier turn and the
// sidebar are filler.

const Q = "Which machines went quiet this week?"
const A = "3 machines slowed down or stopped this week. Harbor Lanes Bowl dropped the most."
const WORDS = A.split(" ").length

const ROWS = [
  { venue: "Harbor Lanes Bowl", status: "Offline 31h", offline: true, change: "64%" },
  { venue: "Maple St Laundromat", status: "Online", offline: false, change: "38%" },
  { venue: "QuickStop #31", status: "Online", offline: false, change: "22%" },
]

type S = {
  draft: string
  sent: boolean
  phase: "idle" | "thinking" | "answer"
  words: number
  rows: number
}

const initial: S = { draft: "", sent: false, phase: "idle", words: 0, rows: 0 }
const poster: S = { draft: "", sent: true, phase: "answer", words: WORDS, rows: ROWS.length }

async function script(a: Act<S>) {
  await a.wait(700)
  a.mark("type")
  await a.type("draft", Q, { interval: 38 })
  await a.wait(450)
  a.mark("send")
  a.put({ sent: true, draft: "" })
  await a.wait(450)
  a.put({ phase: "thinking" })
  await a.wait(1300)
  a.mark("stream")
  a.put({ phase: "answer" })
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i })
    await a.wait(42)
  }
  await a.wait(350)
  a.mark("table")
  for (let i = 1; i <= ROWS.length; i++) {
    a.put({ rows: i })
    await a.wait(110)
  }
  await a.wait(2800)
}

const PAST_BARS = [52, 60, 48, 66, 58, 72, 64, 78, 70, 84, 76, 88]

// Sidebar filler: the org switcher, then Operations, Money and Insights with
// Ask selected, the way the real sidebar sits
const NAV: (number | "group" | "selected")[] = ["group", 58, 46, 52, "group", 34, 62, 50, "group", 56, "selected", "group", 40, 44]

function Sidebar() {
  return (
    <div className="aq-side">
      <div className="aq-org">
        <span className="aq-org-mark" />
        <div className="aq-org-lines">
          <Bar w={86} h={7} r={3} tone={4} />
          <Bar w={58} h={6} r={3} tone={2} />
        </div>
      </div>
      <div className="aq-nav">
        {NAV.map((n, i) =>
          n === "group" ? (
            <div key={i} className="aq-nav-group">
              <span className="aq-nav-icon" />
              <Bar w={[60, 44, 52, 38][i % 4]} h={6} r={3} tone={4} />
            </div>
          ) : (
            <div key={i} className="aq-nav-item" data-selected={n === "selected" || undefined}>
              <Bar w={n === "selected" ? 28 : n} h={6} r={3} tone={n === "selected" ? 5 : 3} />
            </div>
          )
        )}
      </div>
    </div>
  )
}

function Thread({ s, compact }: { s: S; compact: boolean }) {
  return (
    <div className="aq-thread">
      <div className="aq-past">
        <Bar w={compact ? 150 : 210} h={30} r={15} tone={2} className="aq-past-q" />
        <div className="aq-turn">
          <span className="aq-mark aq-mark--past" />
          <div className="aq-past-lines">
            <Bar w="88%" h={7} r={3} tone={2} />
            <Bar w="64%" h={7} r={3} tone={2} />
            {/* The earlier answer's chart, the product's signature */}
            <div className="aq-past-chart">
              {PAST_BARS.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="aq-past-chips">
              <Bar w={compact ? 96 : 150} h={24} r={12} tone={1} />
              <Bar w={compact ? 82 : 128} h={24} r={12} tone={1} />
            </div>
          </div>
        </div>
      </div>
      <Collapse open={s.sent} reveal="drop" from="below">
        <div className="aq-q">
          <Text>{Q}</Text>
        </div>
      </Collapse>
      <Collapse open={s.phase === "thinking"}>
        <div className="aq-turn">
          <span className="aq-mark">
            <Sparkles size={13} strokeWidth={2} />
          </span>
          <span className="aq-thinking">
            <span className="aq-dots">
              <span />
              <span />
              <span />
            </span>
            Querying your data
          </span>
        </div>
      </Collapse>
      <Collapse open={s.phase === "answer"}>
        <div className="aq-turn">
          <span className="aq-mark">
            <Sparkles size={13} strokeWidth={2} />
          </span>
          <div className="aq-answer">
            <Stream className="aq-stream" text={A} count={s.words} />
            <Collapse open={s.rows > 0} reveal="drop" from="below">
              <div className="aq-table" data-compact={compact || undefined}>
                <div className="aq-tr aq-th">
                  <span>Machine</span>
                  {!compact && <span>Status</span>}
                  <span className="aq-num">vs last week</span>
                </div>
                {ROWS.map((r, i) => (
                  <div key={r.venue} className="aq-tr" data-on={i < s.rows || undefined}>
                    <span className="aq-venue">{r.venue}</span>
                    {!compact &&
                      (r.offline ? (
                        <span className="aq-badge">{r.status}</span>
                      ) : (
                        <span className="aq-status">{r.status}</span>
                      ))}
                    <span className="aq-num aq-drop">
                      <span className="aq-sign">−</span>
                      {r.change}
                    </span>
                  </div>
                ))}
              </div>
            </Collapse>
          </div>
        </div>
      </Collapse>
    </div>
  )
}

function Composer({ s, compact }: { s: S; compact: boolean }) {
  return (
    <Field
      className="aq-composer"
      value={s.draft}
      placeholder={compact ? "Ask about sales or machines" : "Ask about sales, machines, hosts, money or support"}
      focused={!s.sent}
      trailing={
        <span className="aq-send" data-ready={s.draft.length > 0 || undefined}>
          <ArrowUp size={14} strokeWidth={2.25} />
        </span>
      }
    />
  )
}

export default function AskQuiet() {
  return (
    <Stage
      width={760}
      height={480}
      compact={{ below: 640, width: 358, height: 560 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      className="sp-look aq"
    >
      {(s, _rect, layout) => {
        const compact = layout === "compact"
        const body = (
          <div className="aq-body">
            <Thread s={s} compact={compact} />
            <Composer s={s} compact={compact} />
          </div>
        )
        // On a phone the Ask side sheet is the product's own narrow form
        return compact ? (
          <div className="aq-sheet">
            <div className="aq-sheet-head">
              <Sparkles size={15} strokeWidth={2} className="aq-sheet-icon" />
              <span className="aq-sheet-title">Ask</span>
              <X size={15} strokeWidth={2} className="aq-sheet-close" />
            </div>
            {body}
          </div>
        ) : (
          <Window title="Ask" sidebar={<Sidebar />} sidebarWidth={164} className="aq-win">
            {body}
          </Window>
        )
      }}
    </Stage>
  )
}
