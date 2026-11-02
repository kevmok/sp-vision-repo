import * as React from "react"
import { ChevronsUpDown, PanelLeft, Search, Sparkles } from "lucide-react"

import { Bar, Chart, Collapse, Field, Popover, Stage, Swap, Text, Window, type Act } from "../../kit"
import { OPERATOR_PRODUCTS } from "@/lib/nav"
import "../../sp-look.css"
import "./shell-jump.css"

// The operator super app: one sidebar, several products. From the linear
// study's command menu. Beats: ⌘K opens "Jump to" over the Dashboard; "ana"
// narrows it to Analytics, with the Ask row the real palette adds; Enter jumps.
// The page crossfades to Analytics, the sidebar's selection glides down from
// Dashboard, and the copper mark moves from Operations to Insights. A keyboard
// story, so no cursor; the keycaps show. Plays once; the poster is Analytics.
//
// Real strings: the org, every product and page in the sidebar (from lib/nav,
// they are the story), the palette, the crumbs and both pages' headline
// figures. Alert rows, restock rows and the chart's axis are filler.

type Page = "dashboard" | "analytics"
type S = { open: boolean; query: string; page: Page }

const initial: S = { open: false, query: "", page: "dashboard" }
const poster: S = { open: false, query: "", page: "analytics" }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark("open")
  await a.key("cmd+k")
  await a.set({ open: true })
  await a.wait(750)
  a.mark("type")
  await a.type("query", "ana", { interval: 130 })
  await a.wait(800)
  a.mark("jump")
  await a.key("enter")
  // The palette leads, so the two pages never show through it mid-crossfade
  a.put({ open: false })
  await a.wait(90)
  a.put({ page: "analytics" })
  await a.wait(3000)
}

// One height each, so the selection pill's travel is plain arithmetic
const PRODUCT_ROW = 26
const PAGE_ROW = 24

const CRUMBS: Record<Page, string[]> = {
  dashboard: ["Operations", "Dashboard"],
  analytics: ["Insights", "Analytics"],
}

const PAGE_OF: Record<Page, string> = { dashboard: "/", analytics: "/analytics" }

function pillOffset(href: string) {
  let y = 0
  for (const product of OPERATOR_PRODUCTS) {
    y += PRODUCT_ROW
    for (const p of product.href ? [] : product.pages) {
      if (p.href === href) return y
      y += PAGE_ROW
    }
  }
  return 0
}

function Sidebar({ page }: { page: Page }) {
  const href = PAGE_OF[page]
  return (
    <div className="sj-side">
      <div className="sj-org">
        <span className="sj-tile">NV</span>
        <span className="sj-org-lines">
          <span className="sj-org-name">Northline Vending</span>
          <span className="sj-org-city">Duluth, MN</span>
        </span>
        <ChevronsUpDown size={14} strokeWidth={2} className="sj-chev" />
      </div>
      <div className="sj-group-label">Products</div>
      <div className="sj-nav">
        <span className="sj-pill" style={{ transform: `translateY(${pillOffset(href)}px)` }} />
        {OPERATOR_PRODUCTS.map((product) => {
          const inProduct = !product.href && product.pages.some((p) => p.href === href)
          return (
            <div key={product.title}>
              <div className="sj-product" data-in={inProduct || undefined}>
                <product.icon size={15} strokeWidth={1.9} />
                <span>{product.title}</span>
                {product.title === "Support" && <span className="sj-badge">2</span>}
              </div>
              {!product.href &&
                product.pages.map((p) => (
                  <div key={p.href} className="sj-page-link" data-on={p.href === href || undefined}>
                    {p.title}
                  </div>
                ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Crumbs({ page }: { page: Page }) {
  const [product, name] = CRUMBS[page]
  return (
    <span className="sj-crumbs">
      <Swap id={product}>
        <span className="sj-crumb">{product}</span>
      </Swap>
      <span className="sj-crumb-sep">/</span>
      <Swap id={name}>
        <span className="sj-crumb sj-crumb--on">{name}</span>
      </Swap>
    </span>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "ok" | "bad" }) {
  return (
    <div className="sj-stat">
      <span className="sj-stat-label">{label}</span>
      <span className="sj-stat-value">{value}</span>
      {sub && (
        <span className="sj-stat-sub" data-tone={tone}>
          {sub}
        </span>
      )}
    </div>
  )
}

function FillerRows({ widths, tone }: { widths: number[]; tone?: boolean }) {
  return (
    <>
      {widths.map((w, i) => (
        <div key={i} className="sj-row">
          {tone && <span className="sj-dot" data-sev={i === 0 ? "bad" : i < 3 ? "warn" : undefined} />}
          <span className="sj-row-lines">
            <Bar w={w} h={7} r={3} tone={4} />
            <Bar w={w - 34} h={6} r={3} tone={2} />
          </span>
          <Bar w={34} h={7} r={3} tone={2} className="sj-row-end" />
        </div>
      ))}
    </>
  )
}

function Dashboard({ on, compact }: { on: boolean; compact: boolean }) {
  return (
    <section className="sj-view" data-on={on || undefined}>
      <h3 className="sj-title">Dashboard</h3>
      <div className="sj-stats">
        <Stat label="Revenue today" value="$612" sub="48 vends" />
        <Stat label="This week" value="$4,180" sub="+6.1%" tone="ok" />
        <Stat
          label="Machines online"
          value={
            <>
              11<span className="sj-of">/12</span>
            </>
          }
          sub="1 offline"
          tone="bad"
        />
        <Stat label="Lanes out" value="2" sub="of 96" tone="bad" />
      </div>
      <div className="sj-panels">
        <div className="sj-panel">
          <div className="sj-panel-head">
            <span>Alerts</span>
            <span className="sj-count">3</span>
          </div>
          <FillerRows widths={compact ? [168, 132, 150, 120, 142, 128] : [212, 176, 196, 148, 184, 160]} tone />
        </div>
        {!compact && (
          <div className="sj-panel">
            <div className="sj-panel-head">
              <span>Restock list</span>
            </div>
            <FillerRows widths={[118, 96, 128, 104, 112, 90]} />
          </div>
        )}
      </div>
    </section>
  )
}

const REVENUE = [48, 52, 46, 55, 58, 54, 60, 63, 57, 66, 69, 64, 72, 75, 70, 78, 82, 79, 86]
const PRIOR = [44, 42, 47, 45, 49, 46, 52, 50, 48, 54, 52, 55, 53, 57, 56, 60, 58, 61, 60]

function Analytics({ on, compact }: { on: boolean; compact: boolean }) {
  // Half the points at phone width, or the line turns to noise
  const thin = (d: number[]) => (compact ? d.filter((_, i) => i % 2 === 0) : d)
  const width = compact ? 282 : 620
  const height = compact ? 240 : 340
  return (
    <section className="sj-view" data-on={on || undefined}>
      <h3 className="sj-title">Analytics</h3>
      <div className="sj-stats">
        <Stat label="Revenue" value="$18,420" sub="+8.2%" tone="ok" />
        <Stat label="COGS (FIFO)" value="$10,490" sub="+7.4%" />
        <Stat label="Gross profit" value="$7,930" sub="+9.3%" tone="ok" />
        <Stat label="Gross margin" value="43.1%" sub="+0.4 pt" tone="ok" />
      </div>
      <div className="sj-panel sj-chart">
        <div className="sj-panel-head">
          <span>Revenue over time</span>
          <span className="sj-legend">
            <i data-now />
            This period
            <i />
            Last period
          </span>
        </div>
        <div className="sj-plot">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="sj-grid" style={{ top: 22 + i * 60 }} />
          ))}
          <Chart data={thin(PRIOR)} width={width} height={height} max={94} area={false} dot={false} show={on} className="sj-prior" />
          <Chart data={thin(REVENUE)} width={width} height={height} max={94} dot={false} show={on} className="sj-now" />
        </div>
      </div>
    </section>
  )
}

const hasAll = (label: string, q: string) => {
  let at = 0
  for (const ch of label.toLowerCase()) if (ch === q[at]) at++
  return at === q.length
}

const GROUPS = OPERATOR_PRODUCTS.filter((p) => !p.href)

function Palette({ s }: { s: S }) {
  const q = s.query.toLowerCase()
  const first = GROUPS.flatMap((g) => g.pages).find((p) => hasAll(p.title, q))?.href
  return (
    <>
      <div className="sj-scrim" data-show={s.open || undefined} />
      <Popover show={s.open} origin="top center" className="sj-cmd">
        <Field
          value={s.query}
          placeholder="Jump to a product, page or operator"
          focused={s.open}
          className="sj-cmd-field"
          leading={<Search size={15} strokeWidth={2} />}
        />
        <div className="sj-cmd-list">
          {/* Flat on purpose: one height per line, so no Collapse measures another mid-flight */}
          {GROUPS.map((g) => (
            <React.Fragment key={g.title}>
              <Collapse open={g.pages.some((p) => hasAll(p.title, q))}>
                <div className="sj-cmd-head">
                  <Text>{g.title}</Text>
                </div>
              </Collapse>
              {g.pages.map((p) => (
                <Collapse key={p.href} open={hasAll(p.title, q)}>
                  <div className="sj-cmd-item" data-active={p.href === first || undefined}>
                    <p.icon size={15} strokeWidth={1.9} />
                    <Text>{p.title}</Text>
                  </div>
                </Collapse>
              ))}
            </React.Fragment>
          ))}
          <Collapse open={q.length > 2}>
            <div className="sj-cmd-head">
              <Text>Ask</Text>
            </div>
            <div className="sj-cmd-item">
              <Sparkles size={15} strokeWidth={1.9} className="sj-ask" />
              <Text>Ask “ana”</Text>
            </div>
          </Collapse>
        </div>
      </Popover>
    </>
  )
}

function Pages({ page, compact }: { page: Page; compact: boolean }) {
  return (
    <div className="sj-pages">
      <Dashboard on={page === "dashboard"} compact={compact} />
      <Analytics on={page === "analytics"} compact={compact} />
    </div>
  )
}

export default function ShellJump() {
  return (
    <Stage
      width={920}
      height={572}
      compact={{ below: 760, width: 358, height: 540 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      className="sp-look sj"
    >
      {(s, _rect, layout) => {
        const compact = layout === "compact"
        return (
          <>
            {compact ? (
              <div className="sj-narrow">
                <div className="sj-narrow-bar">
                  <PanelLeft size={15} strokeWidth={2} className="sj-chev" />
                  <Crumbs page={s.page} />
                  <Search size={15} strokeWidth={2} className="sj-chev sj-narrow-search" />
                </div>
                <Pages page={s.page} compact />
              </div>
            ) : (
              <Window
                className="sj-win"
                sidebar={<Sidebar page={s.page} />}
                sidebarWidth={204}
                lead={<Crumbs page={s.page} />}
                toolbar={
                  <span className="sj-jump">
                    <Search size={13} strokeWidth={2} />
                    <span>Jump to</span>
                    <span className="sj-kbds">
                      <kbd>⌘</kbd>
                      <kbd>K</kbd>
                    </span>
                  </span>
                }
              >
                <Pages page={s.page} compact={false} />
              </Window>
            )}
            <Palette s={s} />
          </>
        )
      }}
    </Stage>
  )
}
