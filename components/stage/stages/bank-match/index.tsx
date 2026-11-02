import { Check, ChevronDown, Link2, Repeat } from "lucide-react"

import { Bar, Collapse, Roll, Stage, Swap, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./bank-match.css"

// Money → Bank sync. A card payment that SP already matched to a logged
// purchase is confirmed, so it isn't counted twice. Copied from stageshow's
// table-edit gold (a table edited in place, the total following a beat
// later) with gmail's row leaving. Beats: the pointer comes to Confirm on
// the matched row; the press turns the button into "Matched"; the row folds
// out of the inbox and the count rolls 13 → 12. Plays once; the poster is the
// matched row with the count already down.
//
// Real strings: the card title and count, the column labels, three
// transactions (merchant, confidence, category, amount, action) and the match
// chip. Second lines of the neighbors and the rows past them are filler.

type S = { matched: boolean; gone: boolean; count: number }

const initial: S = { matched: false, gone: false, count: 13 }
const poster: S = { matched: true, gone: false, count: 12 }

const REST = { at: "head", x: 0.62, y: 0.5 }

async function script(a: Act<S>) {
  await a.wait(900)
  a.mark("approach")
  await a.move({ at: "confirm", x: 0.5, y: 0.56 })
  await a.wait(550)
  a.mark("confirm")
  await a.click()
  a.put({ matched: true })
  await a.wait(1100)
  a.mark("leave")
  a.put({ gone: true, count: 12 })
  // Off the next row's Accept as the rows settle: it isn't the next beat
  await a.wait(500)
  await a.move(REST, { duration: 700 })
  await a.wait(2000)
}

type Txn = {
  date: string
  merchant: string
  conf: number
  category: string
  amount: string
  action: "Accept" | "Confirm"
  /** Second line: a rule match (filler) or the CRM match chip (real). */
  line: "rule" | "match"
  bar: number
}

const BEFORE: Txn = {
  date: "Oct 31",
  merchant: "VTM PARTS ORDER 55120",
  conf: 90,
  category: "Maintenance",
  amount: "212.00",
  action: "Accept",
  line: "rule",
  bar: 150,
}
const FOCAL: Txn = {
  date: "Oct 30",
  merchant: "CARDHAVEN DIST INV 88213",
  conf: 97,
  category: "Inventory purchase",
  amount: "1,284.60",
  action: "Confirm",
  line: "match",
  bar: 0,
}
const AFTER: Txn = {
  date: "Oct 29",
  merchant: "TRANSFER TO SAVINGS ••0392",
  conf: 99,
  category: "Transfer / ignore",
  amount: "2,000.00",
  action: "Accept",
  line: "rule",
  bar: 176,
}

function Select({ children }: { children: React.ReactNode }) {
  return (
    <span className="bm-select">
      <span className="bm-select-label">{children}</span>
      <ChevronDown size={14} strokeWidth={2} className="bm-select-chev" />
    </span>
  )
}

function TxnRow({ t, s }: { t: Txn; s?: S }) {
  const focal = !!s
  return (
    <div className="bm-row" data-target={focal ? "row" : undefined} data-focal={focal || undefined}>
      <span className="bm-date">{t.date}</span>
      <span className="bm-txn">
        <span className="bm-merchant">{t.merchant}</span>
        {t.line === "match" ? (
          <span className="bm-chip">
            <Link2 size={13} strokeWidth={2} />
            Matches purchase P-1042
          </span>
        ) : (
          <span className="bm-why">
            <Repeat size={12} strokeWidth={2} />
            <Bar w={t.bar} h={6} r={3} tone={2} />
          </span>
        )}
      </span>
      <span className="bm-conf" data-high={t.conf >= 90 || undefined}>
        {t.conf}%
      </span>
      <span className="bm-cat">
        <Select>{t.category}</Select>
      </span>
      <span className="bm-amt">
        <span className="bm-sign">−$</span>
        {t.amount}
      </span>
      <span className="bm-act">
        {focal ? (
          <span className="bm-btn" data-target="confirm" data-cursor="pointer" data-done={s.matched || undefined}>
            <Swap id={s.matched ? "matched" : "confirm"}>
              {s.matched ? (
                <span className="bm-btn-label">
                  <Check size={13} strokeWidth={2.5} />
                  Matched
                </span>
              ) : (
                <span className="bm-btn-label">Confirm</span>
              )}
            </Swap>
          </span>
        ) : (
          <span className="bm-btn">
            <span className="bm-btn-label">{t.action}</span>
          </span>
        )}
      </span>
    </div>
  )
}

// The last row runs off the stage, so it is bars only: a control's outline
// sliced by the crop reads as a mistake
function FillerRow({ widths, bare }: { widths: [number, number, number, number]; bare?: boolean }) {
  return (
    <div className="bm-row bm-row--filler">
      <Bar w={34} h={7} r={3} tone={3} />
      <span className="bm-txn">
        <Bar w={widths[0]} h={7} r={3} tone={4} />
        <Bar w={widths[1]} h={6} r={3} tone={2} />
      </span>
      <Bar w={28} h={7} r={3} tone={2} className="bm-conf-bar" />
      <span className="bm-cat">
        {bare ? (
          <Bar w={widths[2]} h={7} r={3} tone={3} className="bm-cat-bar" />
        ) : (
          <span className="bm-select">
            <Bar w={widths[2]} h={7} r={3} tone={3} />
          </span>
        )}
      </span>
      <Bar w={widths[3]} h={7} r={3} tone={3} className="bm-amt-bar" />
      <span className="bm-act">{!bare && <span className="bm-btn bm-btn--filler" />}</span>
    </div>
  )
}

function Card({ s, compact }: { s: S; compact: boolean }) {
  return (
    <div className="bm-card">
      <div className="bm-head" data-target="head">
        <span className="bm-title">To categorize</span>
        <span className="bm-count">
          <Roll>{String(s.count)}</Roll>
        </span>
      </div>
      <div className="bm-row bm-row--labels">
        <span>Date</span>
        <span>Transaction</span>
        <span />
        <span>Category</span>
        <span className="bm-amt">Amount</span>
        <span />
      </div>
      <TxnRow t={BEFORE} />
      <Collapse open={!s.gone}>
        <TxnRow t={FOCAL} s={s} />
      </Collapse>
      <TxnRow t={AFTER} />
      {/* Enough rows that the card still runs off the stage after one leaves */}
      <FillerRow widths={[164, 120, 70, 58]} bare={compact} />
      <FillerRow widths={[132, 150, 92, 50]} bare />
      <FillerRow widths={[150, 104, 80, 54]} bare />
    </div>
  )
}

export default function BankMatch() {
  return (
    <Stage
      width={880}
      height={460}
      compact={{ below: 760, width: 358, height: 460 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: REST }}
      className="sp-look bm"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <div className="bm-solo">
            <Card s={s} compact />
          </div>
        ) : (
          <Window title="Bank sync" className="bm-win">
            <div className="bm-body">
              <Card s={s} compact={false} />
            </div>
          </Window>
        )
      }
    </Stage>
  )
}
