import { useCallback, useState } from "react"
import { Check } from "lucide-react"

import { Bar, Chart, Roll, Stage, Window, chartPoints, type Act } from "../../kit"
import "../../sp-look.css"
import "./usage-tracking.css"

// SP admin → Usage. Weekly active operators against the target of 7, read
// week by week. Copied from stageshow's chart-scrub gold: the headline is the
// readout, the pointer runs the line in one stroke. Added: every org's weeks
// under the chart on the same columns, so the hairline runs from the line
// down through the orgs behind that number. Beats: the pointer comes up onto
// the line at 5/10; it runs right as the headline rolls, and rests a beat where
// the line reaches 7 and the target turns green; it ends on this week at 8/10. Plays once; the
// poster is this week.
//
// Real strings: the title, the pilot chip, the headline, the target, the two
// axis dates and the org names (the board's own 8/10, with Juniper and Redbird
// the two who haven't logged in). The last org's name is filler at the crop.

const TARGET = 7
const WEEKS = ["Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19", "Oct 26"]
const LAST = WEEKS.length - 1
const START = 7
const REACHED = 10

// Who logged in each week. The chart is the sum of these columns
const ORGS = [
  { name: "Bayou Snack Co", weeks: "111111111111" },
  { name: "Pinewood Vending Co", weeks: "011111111111" },
  { name: "Harborview Vending", weeks: "001011011111" },
  { name: "Sunbelt Snack & Card", weeks: "000111011111" },
  { name: "Mesa Ridge Vending", weeks: "000001101011" },
  { name: "Tall Oaks Vending", weeks: "000000010011" },
  { name: "Lakeshore Treats", weeks: "000000000101" },
  { name: "Northline Vending", weeks: "000000000011" },
  { name: "Juniper Vending", weeks: "000000101000" },
  { name: "Redbird Arcade Supply", weeks: "000000000100" },
]
const ACTIVE = WEEKS.map((_, i) => ORGS.filter((o) => o.weeks[i] === "1").length)

const H = { wide: 132, compact: 92 }
const PLOT = { wide: { width: 504, gap: 4 }, compact: { width: 282, gap: 3 } }

/** The chart spans first cell's center to last cell's center, so a point sits over its column. */
function geometry(layout: string) {
  const compact = layout === "compact"
  const { width, gap } = compact ? PLOT.compact : PLOT.wide
  const cell = (width - gap * LAST) / WEEKS.length
  return { cell, w: width - cell, h: compact ? H.compact : H.wide, gap }
}

type S = { week: number; x: number | null; hair: boolean }

const initial: S = { week: LAST, x: null, hair: false }
const poster: S = { week: LAST, x: null, hair: true }

// Directly under week 7 in the rows, so the way up crosses no other week
const REST = { at: "rows", x: (START + 0.5) / WEEKS.length, y: 0.62 }

async function script(a: Act<S>) {
  await a.wait(900)
  const box = a.rect("plot")
  const line = a.rect("line")
  const pts = chartPoints({ data: ACTIVE, width: line.width, height: line.height, dot: false, max: 10 })
  const at = (i: number) => ({ x: line.x + pts[i]!.x, y: line.y + pts[i]!.y + 18 })
  const nearest = (x: number) => {
    let near = 0
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i]!.x - x) < Math.abs(pts[near]!.x - x)) near = i
    return near
  }
  a.mark("hover")
  let on = false
  await a.move(at(START), {
    duration: 800,
    onMove: (pt) => {
      if (!on && pt.y < box.y + box.height) {
        on = true
        a.put({ week: START, x: pts[START]!.x, hair: true })
      }
    },
  })
  await a.wait(800)
  // One stroke up to the week the line reaches the target, a beat there, then
  // on to this week
  const run = (to: number, duration: number) =>
    a.move(at(to), {
      duration,
      path: (e, from, dest) => ({ x: from.x + (dest.x - from.x) * e, y: from.y + (dest.y - from.y) * e }),
      onMove: (pt) => {
        const x = Math.max(0, Math.min(line.width, pt.x - line.x))
        a.put({ week: nearest(x), x })
      },
    })
  a.mark("scrub")
  await run(REACHED, 1500)
  a.mark("reached")
  await a.wait(1100)
  await run(LAST, 650)
  a.mark("hold")
  await a.wait(2600)
}

// The y of the drawn line at x: a short search along the path's length
function yOn(path: SVGPathElement | null | undefined, x: number) {
  if (!path) return null
  let lo = 0
  let hi = path.getTotalLength()
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (path.getPointAtLength(mid).x < x) lo = mid
    else hi = mid
  }
  return path.getPointAtLength(hi).y
}

function Headline({ s }: { s: S }) {
  return (
    <div className="ut-head">
      <span className="ut-label">Weekly active</span>
      <span className="ut-value">
        <Roll stagger={25}>{String(ACTIVE[s.week]!)}</Roll>
        <span className="ut-of">/10</span>
      </span>
      <span className="ut-week">
        <Roll variant="fade">{s.week === LAST ? "This week" : `Week of ${WEEKS[s.week]!}`}</Roll>
      </span>
    </div>
  )
}

function Plot({ s, layout }: { s: S; layout: string }) {
  const [path, setPath] = useState<SVGPathElement | null>(null)
  const attachLine = useCallback((node: HTMLDivElement | null) => {
    setPath(node?.querySelector<SVGPathElement>(".ss-chart__line") ?? null)
  }, [])
  const { cell, w, h } = geometry(layout)
  const pts = chartPoints({ data: ACTIVE, width: w, height: h, dot: false, max: 10 })
  const hx = s.x ?? pts[s.week]!.x
  const hy = yOn(path, hx) ?? pts[s.week]!.y
  const targetY = pts[0]!.y + ((ACTIVE[0]! - TARGET) / 10) * (h - 2)
  const reached = ACTIVE[s.week]! >= TARGET
  return (
    <div className="ut-plot" data-target="plot" data-cursor="crosshair">
      <div ref={attachLine} className="ut-line" data-target="line" style={{ left: cell / 2, width: w, height: h }}>
        <span className="ut-hair" data-on={s.hair || undefined} style={{ left: hx }} />
        <Chart data={ACTIVE} width={w} height={h} dot={false} max={10} />
        <div className="ut-target" data-reached={reached || undefined} style={{ top: targetY, left: -cell / 2, right: -cell / 2 }}>
          <span className="ut-target-label">
            Target {TARGET}
            <Check size={12} strokeWidth={2.5} />
          </span>
        </div>
        <span className="ut-dot" data-on={s.hair || undefined} style={{ left: hx, top: hy }} />
      </div>
      <div className="ut-axis">
        <span>{WEEKS[0]}</span>
        <span>{WEEKS[LAST]}</span>
      </div>
    </div>
  )
}

function OrgRow({ org, s, bare }: { org: (typeof ORGS)[number]; s: S; bare?: boolean }) {
  const active = org.weeks[s.week] === "1"
  return (
    <div className="ut-row">
      {bare ? (
        <Bar w={118} h={7} r={3} tone={2} />
      ) : (
        <span className="ut-name" data-active={active || undefined}>
          {org.name}
        </span>
      )}
      <div className="ut-cells">
        {WEEKS.map((_, i) => (
          <span key={i} className="ut-cell" data-on={org.weeks[i] === "1" || undefined} data-week={i === s.week || undefined} />
        ))}
      </div>
    </div>
  )
}

function Card({ s, layout }: { s: S; layout: string }) {
  const compact = layout === "compact"
  // The rows past this one are under the crop; it goes to filler so no real
  // name gets sliced
  const named = compact ? 6 : 9
  return (
    <div className="ut-card">
      {compact ? (
        <div className="ut-card-top">
          <Headline s={s} />
          <span className="ut-chip">Pilot · 10 operators</span>
        </div>
      ) : (
        <Headline s={s} />
      )}
      <Plot s={s} layout={layout} />
      <div className="ut-rows" data-target="rows">
        {ORGS.slice(0, named + 1).map((o, i) => (
          <OrgRow key={o.name} org={o} s={s} bare={i === named} />
        ))}
      </div>
    </div>
  )
}

export default function UsageTracking() {
  return (
    <Stage
      width={880}
      height={526}
      compact={{ below: 760, width: 358, height: 568 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look ut"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <div className="ut-solo">
            <Card s={s} layout={layout} />
          </div>
        ) : (
          <Window title="Usage" toolbar={<span className="ut-chip">Pilot · 10 operators</span>} className="ut-win">
            <div className="ut-body">
              <Card s={s} layout={layout} />
            </div>
          </Window>
        )
      }
    </Stage>
  )
}
