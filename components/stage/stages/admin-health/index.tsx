import { Check } from "lucide-react"

import { Bar, Count, Roll, Stage, States, Swap, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./admin-health.css"

// SP admin → Operator health. The board across the pilot orgs, one org's
// signal open beside it. Copied from stageshow's table-edit gold (the cause
// lands, then the total a beat later), framed like panel-annotation. Beats:
// the pointer presses Mark done on Juniper's play; the button confirms; the
// Usage bar grows and the score rolls 48 → 54; the pill turns Red → Yellow;
// the band tiles roll, Red 2 → 1 and Yellow 3 → 4. Plays once; the poster is
// the org already in Yellow.
//
// The numbers follow lib/health.ts: Juniper's components sum to 48, two more
// active days lift Usage from 6.3 to 12.5, and 54 is Yellow (50–74).
//
// Real strings: the window title, the pilot chip, the tile labels and values,
// three operators with their scores, the signal, its play and the button.
// The other operators and signals are filler.

type S = { done: boolean; usage: boolean; yellow: boolean; red: number; amber: number }

const initial: S = { done: false, usage: false, yellow: false, red: 2, amber: 3 }
const poster: S = { done: true, usage: true, yellow: true, red: 1, amber: 4 }

const REST = { at: "rest", x: 0.72, y: 0.5 }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark("approach")
  await a.move({ at: "done", x: 0.5, y: 0.56 })
  await a.wait(500)
  a.mark("press")
  await a.click()
  a.put({ done: true })
  await a.wait(550)
  a.mark("score")
  a.put({ usage: true })
  await a.wait(620)
  a.mark("band")
  a.put({ yellow: true })
  await a.wait(420)
  a.mark("tiles")
  a.put({ red: 1, amber: 4 })
  await a.wait(600)
  await a.move(REST, { duration: 800 })
  await a.wait(2400)
}

type Tone = "ok" | "warn" | "bad"
const tone = (share: number): Tone => (share >= 0.75 ? "ok" : share >= 0.5 ? "warn" : "bad")

// Usage, Data quality, Machines, Sales trend, Relationship, as score/max
const REDBIRD = [6.3 / 25, 6.2 / 20, 19.8 / 20, 7.6 / 20, 0]
const juniper = (usage: boolean) => [(usage ? 12.5 : 6.3) / 25, 15.8 / 20, 17.8 / 20, 0, 8 / 15]
const MESA = [18.8 / 25, 19.7 / 20, 19.8 / 20, 8.4 / 20, 4 / 15]

function Mini({ shares }: { shares: number[] }) {
  return (
    <span className="ah-bars">
      {shares.map((r, i) => (
        <span key={i} className="ah-bar">
          <span className="ah-bar-fill" data-tone={tone(r)} style={{ height: `${Math.max(r, 0.04) * 100}%` }} />
        </span>
      ))}
    </span>
  )
}

function Pill({ band }: { band: "Red" | "Yellow" }) {
  return (
    <span className="ah-pill" data-band={band}>
      <span className="ah-dot" />
      <Swap id={band}>{band}</Swap>
    </span>
  )
}

function Tile({ label, dot, children }: { label: string; dot?: Tone; children: React.ReactNode }) {
  return (
    <div className="ah-tile">
      <span className="ah-tile-label">
        {dot && <span className="ah-dot" data-tone={dot} />}
        {label}
      </span>
      <span className="ah-tile-value">{children}</span>
    </div>
  )
}

function Tiles({ s, compact }: { s: S; compact: boolean }) {
  return (
    <div className="ah-tiles">
      <Tile label="Red" dot="bad">
        <Roll delay={120}>{String(s.red)}</Roll>
      </Tile>
      <Tile label="Yellow" dot="warn">
        <Roll delay={120}>{String(s.amber)}</Roll>
      </Tile>
      <Tile label="Green" dot="ok">
        5
      </Tile>
      {!compact && (
        <Tile label="Activated">7/10</Tile>
      )}
    </div>
  )
}

function Row({ name, city, score, band, shares }: { name: string; city: string; score: number; band: "Red" | "Yellow"; shares: number[] }) {
  return (
    <div className="ah-row">
      <span className="ah-op">
        <span className="ah-tile-mark">{name.split(" ").slice(0, 2).map((w) => w[0]).join("")}</span>
        <span className="ah-op-lines">
          <span className="ah-op-name">{name}</span>
          <span className="ah-op-city">{city}</span>
        </span>
      </span>
      <span className="ah-health">
        <span className="ah-score">{score}</span>
        <Pill band={band} />
      </span>
      <Mini shares={shares} />
    </div>
  )
}

function FocalRow({ s }: { s: S }) {
  return (
    <div className="ah-row" data-focal>
      <span className="ah-op">
        <span className="ah-tile-mark">JV</span>
        <span className="ah-op-lines">
          <span className="ah-op-name">Juniper Vending</span>
          <span className="ah-op-city">Bend, OR</span>
        </span>
      </span>
      <span className="ah-health">
        <span className="ah-score">
          <Count value={s.usage ? 54 : 48} duration={520} />
        </span>
        <Pill band={s.yellow ? "Yellow" : "Red"} />
      </span>
      <Mini shares={juniper(s.usage)} />
    </div>
  )
}

function FillerRow({ w, target }: { w: [number, number, number]; target?: string }) {
  return (
    <div className="ah-row ah-row--filler" data-target={target}>
      <span className="ah-op">
        <span className="ah-tile-mark" />
        <span className="ah-op-lines ah-op-lines--bars">
          <Bar w={w[0]} h={7} r={3} tone={4} />
          <Bar w={w[1]} h={6} r={3} tone={2} />
        </span>
      </span>
      <span className="ah-health">
        <Bar w={18} h={8} r={3} tone={3} />
        <Bar w={w[2]} h={20} r={10} tone={1} />
      </span>
      <Bar w={61} h={7} r={3} tone={2} />
    </div>
  )
}

function Board({ s }: { s: S }) {
  return (
    <div className="ah-board">
      <Tiles s={s} compact={false} />
      <div className="ah-table">
        <div className="ah-row ah-row--labels">
          <span>Operator</span>
          <span>Health</span>
          <span className="ah-keys">
            {["U", "D", "M", "S", "R"].map((k) => (
              <span key={k}>{k}</span>
            ))}
          </span>
        </div>
        <Row name="Redbird Arcade Supply" city="St. Louis, MO" score={40} band="Red" shares={REDBIRD} />
        <FocalRow s={s} />
        <Row name="Mesa Ridge Vending" city="Tucson, AZ" score={71} band="Yellow" shares={MESA} />
        <FillerRow w={[128, 74, 58]} target="rest" />
        <FillerRow w={[108, 88, 54]} />
        <FillerRow w={[140, 66, 60]} />
      </div>
    </div>
  )
}

function Panel({ s, compact }: { s: S; compact: boolean }) {
  return (
    <section className="ah-panel">
      <div className="ah-panel-head">
        <span className="ah-tile-mark">JV</span>
        <span className="ah-panel-title">Juniper Vending</span>
        <span className="ah-day">
          34<span className="ah-of">/90</span>
        </span>
      </div>
      {/* On the phone there is no board beside it, so the card carries the score */}
      {compact && (
        <div className="ah-panel-health">
          <span className="ah-score ah-score--big">
            <Count value={s.usage ? 54 : 48} duration={520} />
          </span>
          <Pill band={s.yellow ? "Yellow" : "Red"} />
          <Mini shares={juniper(s.usage)} />
        </div>
      )}
      <div className="ah-signal">
        <div className="ah-signal-title">
          <span className="ah-dot" data-tone={s.done ? "ok" : "bad"} />
          No login 7 days
        </div>
        <div className="ah-signal-detail">Last login 9 days ago</div>
        <p className="ah-play">Personal message + 15-min screen share</p>
        <span className="ah-btn" data-target="done" data-cursor="pointer" data-done={s.done || undefined}>
          <States
            value={s.done ? "done" : "todo"}
            states={{
              todo: (
                <span className="ah-btn-label">
                  <Check size={14} strokeWidth={2.25} />
                  Mark done
                </span>
              ),
              done: (
                <span className="ah-btn-label">
                  <Check size={14} strokeWidth={2.5} />
                  Done
                </span>
              ),
            }}
          />
        </span>
      </div>
      {[
        [148, 104],
        [126, 138],
        [156, 92],
        [118, 124],
        [140, 110],
        [130, 96],
      ].map(([a, b], i) => (
        <div key={i} className="ah-more" data-target={compact && i === 1 ? "rest" : undefined}>
          <span className="ah-more-dot" />
          <span className="ah-more-lines">
            <Bar w={a!} h={7} r={3} tone={3} />
            <Bar w={b!} h={6} r={3} tone={2} />
          </span>
        </div>
      ))}
    </section>
  )
}

export default function AdminHealth() {
  return (
    <Stage
      width={840}
      height={480}
      compact={{ below: 720, width: 358, height: 500 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look ah"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <div className="ah-solo">
            <Tiles s={s} compact />
            <Panel s={s} compact />
          </div>
        ) : (
          <>
            <Window title="Operator health" toolbar={<span className="ah-chip">Pilot · 10 operators</span>} className="ah-win">
              <Board s={s} />
            </Window>
            <Panel s={s} compact={false} />
          </>
        )
      }
    </Stage>
  )
}
