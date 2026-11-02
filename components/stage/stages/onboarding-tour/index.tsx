import { Check } from "lucide-react"

import { Bar, Count, Meter, Roll, Stage, States, Swap, Window, type Act, type Rect } from "../../kit"
import "../../sp-look.css"
import "./onboarding-tour.css"

// Operator home → Pilot setup, mid-setup at Northline Vending. Copied from
// stageshow's hero-demo gold (named targets, a popup placed from measured
// rects, a press that changes the page under it). Beats: the tour card drops
// under the next step; the pointer presses its action; the step's meter runs
// to its target, the step ticks, the count rolls 1 of 4 → 2 of 4; the card
// glides on to the next step as one object. Plays once; the poster is the card
// already on step 3 with step 2 ticked.
//
// Real strings: the org, Today, the sync line, Pilot setup, its count and day,
// the four steps and their details, Alerts, and the tour card. The stat tiles
// and the alert rows are filler.

type At = 2 | 3
type S = { tour: boolean; at: At; pct: number; mapped: boolean }

const initial: S = { tour: false, at: 2, pct: 81, mapped: false }
const poster: S = { tour: true, at: 3, pct: 95, mapped: true }

const TOUR: Record<At, { title: string; cta: string }> = {
  2: { title: "6 products left to map", cta: "Map all 6" },
  3: { title: "Add what you paid per case", cta: "Enter costs" },
}

const REST = { at: "rest", x: 0.84, y: 0.5 }

async function script(a: Act<S>) {
  await a.wait(800)
  a.mark("tour")
  a.put({ tour: true })
  await a.wait(1300)
  a.mark("press")
  await a.move({ at: "cta", x: 0.5, y: 0.56 })
  await a.wait(450)
  await a.click()
  a.mark("map")
  a.put({ pct: 95 })
  await a.wait(800)
  a.mark("tick")
  a.put({ mapped: true })
  await a.wait(750)
  a.mark("next")
  a.put({ at: 3 })
  await a.move(REST, { duration: 900 })
  await a.wait(2400)
}

// Half the mark's width, so the caret centers on it
const MARK = 9

function Mark({ n, done, current }: { n: number; done: boolean; current: boolean }) {
  return (
    <span className="ot-mark" data-target={`s${n}`} data-done={done || undefined} data-current={current || undefined}>
      <span className="ot-mark-num">{n}</span>
      <span className="ot-mark-tick">
        <Check size={12} strokeWidth={3} />
      </span>
    </span>
  )
}

function MappedMeter({ s }: { s: S }) {
  return (
    <span className="ot-meter-row">
      <Meter value={s.pct / 95} tone={s.mapped ? "success" : "accent"} className="ot-meter" />
      <span className="ot-num">
        <Count value={s.pct} format={(n) => `${Math.round(n)}%`} /> / 95%
      </span>
    </span>
  )
}

function Progress({ s }: { s: S }) {
  return <Roll>{`${s.mapped ? 2 : 1} of 4`}</Roll>
}

function Checklist({ s }: { s: S }) {
  const current = s.tour ? s.at : 0
  const steps = [
    { n: 1, label: "VTM connected", done: true, detail: <span>Connected Oct 24</span> },
    { n: 2, label: "Sales mapped", done: s.mapped, detail: <MappedMeter s={s} /> },
    { n: 3, label: "Purchase costs entered", done: false, detail: <span>Not entered</span> },
    {
      n: 4,
      label: "Host deals set",
      done: false,
      detail: (
        <span className="ot-meter-row">
          <Meter value={0.5} className="ot-meter" />
          <span className="ot-num">2 of 4</span>
        </span>
      ),
    },
  ]
  return (
    <section className="ot-panel ot-setup">
      <div className="ot-panel-head">
        <span className="ot-panel-title">Pilot setup</span>
        <span className="ot-count ot-num">
          <Progress s={s} />
        </span>
        <span className="ot-segs">
          {steps.map((st) => (
            <span key={st.n} data-on={st.done || undefined} />
          ))}
        </span>
        <span className="ot-chip">Day 9 of 90</span>
      </div>
      <ol className="ot-steps" data-target="steps">
        {steps.map((st) => (
          <li key={st.n} className="ot-step" data-done={st.done || undefined}>
            <span className="ot-step-head">
              <Mark n={st.n} done={st.done} current={current === st.n && !st.done} />
              <span className="ot-step-label">{st.label}</span>
            </span>
            <span className="ot-step-detail">{st.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// The whole object travels; only its words change on the way
function Tour({ s, x, y, caret, compact }: { s: S; x: number; y: number; caret: number; compact: boolean }) {
  const step = TOUR[s.at]
  return (
    <div
      className="ot-tour"
      data-on={s.tour || undefined}
      style={{ translate: `${x}px ${y}px`, "--ot-caret": `${caret}px` } as React.CSSProperties}
    >
      <span className="ot-tour-step">
        <Roll>{`Step ${s.at} of 4`}</Roll>
      </span>
      <States
        value={String(s.at)}
        align="start"
        className="ot-tour-title"
        states={{ "2": <span>{TOUR[2].title}</span>, "3": <span>{TOUR[3].title}</span> }}
      />
      {compact && (
        <States
          value={String(s.at)}
          align="start"
          className="ot-tour-detail"
          states={{
            "2": (
              <span className="ot-tour-line">
                <span className="ot-tour-name">Sales mapped</span>
                <MappedMeter s={s} />
              </span>
            ),
            "3": (
              <span className="ot-tour-line">
                <span className="ot-tour-name">Purchase costs entered</span>
                <span className="ot-tour-value">Not entered</span>
              </span>
            ),
          }}
        />
      )}
      <div className="ot-tour-foot">
        <span className="ot-skip">Skip</span>
        <span className="ot-btn" data-target="cta" data-cursor="pointer">
          <Swap id={String(s.at)}>{step.cta}</Swap>
        </span>
      </div>
    </div>
  )
}

function Home({ s }: { s: S }) {
  return (
    <div className="ot-page">
      <div className="ot-page-head">
        <span className="ot-page-title">Today</span>
        <span className="ot-sync">
          <span className="ot-dot" />
          VTM synced 4m ago
        </span>
        <span className="ot-outline">Machines</span>
        <span className="ot-outline">Start restock run</span>
      </div>
      <Checklist s={s} />
      <div className="ot-tiles">
        {[58, 44, 66, 40, 50].map((w, i) => (
          <div key={i} className="ot-tile">
            <Bar w={w} h={6} r={3} tone={2} />
            <Bar w={w - 12} h={12} r={4} tone={3} />
          </div>
        ))}
      </div>
      <section className="ot-panel" data-target="rest">
        <div className="ot-panel-head">
          <span className="ot-panel-title">Alerts</span>
        </div>
        {[196, 164, 212, 178].map((w, i) => (
          <div key={i} className="ot-alert">
            <span className="ot-alert-icon" />
            <span className="ot-alert-lines">
              <Bar w={w} h={7} r={3} tone={3} />
              <Bar w={w - 54} h={6} r={3} tone={2} />
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}

function Stepper({ s }: { s: S }) {
  const current = s.tour ? s.at : 0
  return (
    <section className="ot-panel ot-setup">
      <div className="ot-panel-head">
        <span className="ot-panel-title">Pilot setup</span>
        <span className="ot-count ot-num">
          <Progress s={s} />
        </span>
        <span className="ot-chip">Day 9 of 90</span>
      </div>
      <div className="ot-stepper">
        {[1, 2, 3, 4].map((n) => {
          const done = n === 1 || (n === 2 && s.mapped)
          return (
            <span key={n} className="ot-stepper-cell">
              <Mark n={n} done={done} current={current === n && !done} />
            </span>
          )
        })}
      </div>
      {/* The page's rows, with the tour card over the first of them */}
      {[176, 142, 160, 128, 150, 136, 168, 148].map((w, i) => (
        <div key={i} className="ot-alert" data-target={i === 3 ? "rest" : undefined}>
          <span className="ot-alert-icon" />
          <span className="ot-alert-lines">
            <Bar w={w} h={7} r={3} tone={3} />
            <Bar w={w - 48} h={6} r={3} tone={2} />
          </span>
        </div>
      ))}
    </section>
  )
}

const edge = (r: Rect) => r.y + r.height

export default function OnboardingTour() {
  return (
    <Stage
      width={880}
      height={470}
      compact={{ below: 760, width: 358, height: 470 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look ot"
    >
      {(s, rect, layout) => {
        const mark = rect(`s${s.at}`)
        if (layout === "compact") {
          const left = 36
          return (
            <>
              <div className="ot-solo">
                <Stepper s={s} />
              </div>
              <Tour s={s} x={left} y={edge(mark) + 18} caret={mark.x + MARK - left} compact />
            </>
          )
        }
        const caret = 27
        return (
          <>
            <Window title="Northline Vending" className="ot-win">
              <Home s={s} />
            </Window>
            <Tour s={s} x={mark.x + MARK - caret} y={edge(rect("steps")) + 10} caret={caret} compact={false} />
          </>
        )
      }}
    </Stage>
  )
}
