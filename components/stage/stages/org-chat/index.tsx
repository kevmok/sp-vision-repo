import {
  FileSpreadsheet,
  Image as ImageIcon,
  Paperclip,
  Pin,
  SendHorizontal,
  SmilePlus,
  Video,
} from "lucide-react"

import { Bar, Collapse, Roll, Stage, Swap, Window, type Act } from "../../kit"
import "../../sp-look.css"
import "./org-chat.css"

// Support: the org's one thread with SP, seen by the operator. Copied from
// stageshow's slack study (a message, its hover toolbar, an action from it),
// with upload's file chip. Beats: Marcus attaches a photo, types and sends; the
// message lands carrying the file; SP's reply lands under it; the pointer pins
// the message from its toolbar, and the pinned bar counts up and takes the
// file. Plays once; the poster is the pinned message under the reply.
//
// Real strings: the page title, the thread's header, the pinned count and
// chips, Marcus's message and file, SP's reply, the composer. Earlier messages
// and the ticket column are filler.

type S = {
  file: boolean
  focus: boolean
  draft: string
  sent: boolean
  reply: boolean
  pinned: boolean
  pins: number
}

const initial: S = {
  file: false,
  focus: false,
  draft: "",
  sent: false,
  reply: false,
  pinned: false,
  pins: 2,
}
const poster: S = {
  file: false,
  focus: false,
  draft: "",
  sent: true,
  reply: true,
  pinned: true,
  pins: 3,
}

const MESSAGE =
  "B4 at Harbor Lanes keeps eating packs. Photo of the coil attached."
const REPLY = "Got it. Opened T-1046 and we're pulling the motor logs."
const REST = { at: "rest", x: 0.5, y: 0.5 }

async function script(a: Act<S>) {
  await a.wait(700)
  a.mark("attach")
  await a.move({ at: "attach", x: 0.5, y: 0.5 })
  await a.wait(180)
  await a.click()
  a.put({ file: true })
  await a.wait(500)
  a.mark("type")
  await a.move({ at: "input", x: 0.32, y: 0.5 })
  await a.click()
  a.put({ focus: true })
  await a.wait(220)
  await a.type("draft", MESSAGE, { interval: 30 })
  await a.wait(320)
  a.mark("send")
  await a.move({ at: "send", x: 0.84, y: 0.62 })
  await a.wait(160)
  await a.click()
  a.put({ sent: true, file: false, draft: "", focus: false })
  await a.wait(1150)
  a.mark("reply")
  a.put({ reply: true })
  await a.wait(1000)
  a.mark("pin")
  await a.move({ at: "msg", x: 0.62, y: 0.5 })
  await a.wait(320)
  await a.move({ at: "pin", x: 0.5, y: 0.55 })
  await a.wait(220)
  await a.click()
  a.put({ pinned: true })
  // The bar follows the press: the count, then the file joining the pins
  await a.wait(260)
  a.put({ pins: 3 })
  await a.wait(900)
  await a.move(REST, { duration: 800 })
  await a.wait(2400)
}

function Avatar({ who }: { who: "ml" | "dw" | "sp" }) {
  return (
    <span className="oc-av" data-who={who}>
      {who === "sp" ? "SP" : who.toUpperCase()}
    </span>
  )
}

function Attachment() {
  return (
    <span className="oc-file">
      <span className="oc-file-mark">
        <ImageIcon size={12} strokeWidth={2} />
      </span>
      <span className="oc-file-name">harbor-lanes-b4.jpg</span>
      <span className="oc-file-size">2.1 MB</span>
    </span>
  )
}

function PinnedChip({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <span className="oc-pin-chip">
      {icon}
      <span className="oc-pin-label">{children}</span>
    </span>
  )
}

const SHEET = (
  <FileSpreadsheet size={12} strokeWidth={2} className="oc-ic-sheet" />
)
const CALL = <Video size={12} strokeWidth={2} />
const PHOTO = <ImageIcon size={12} strokeWidth={2} className="oc-ic-photo" />

function PinnedBar({ s, compact }: { s: S; compact: boolean }) {
  const added = s.pins > 2
  return (
    <div className="oc-pins">
      <Pin size={14} strokeWidth={2} className="oc-pins-icon" />
      <span className="oc-pins-count">
        <Roll>{String(s.pins)}</Roll> pinned
      </span>
      {compact ? (
        // No room for the row: the bar shows the latest pin, and the new one takes its place
        <Swap id={added ? "photo" : "call"}>
          {added ? (
            <PinnedChip icon={PHOTO}>harbor-lanes-b4.jpg</PinnedChip>
          ) : (
            <PinnedChip icon={CALL}>Northline kickoff</PinnedChip>
          )}
        </Swap>
      ) : (
        <div className="oc-pin-row">
          <PinnedChip icon={SHEET}>purchase-costs-template.xlsx</PinnedChip>
          <PinnedChip icon={CALL}>Northline kickoff</PinnedChip>
          <span className="oc-pin-new" data-on={added || undefined}>
            <span>
              <PinnedChip icon={PHOTO}>harbor-lanes-b4.jpg</PinnedChip>
            </span>
          </span>
        </div>
      )}
    </div>
  )
}

function Older({ compact }: { compact: boolean }) {
  return (
    <>
      {/* More than the pane holds, so the thread runs under the pinned bar */}
      <div className="oc-old">
        <span className="oc-av oc-av--filler" data-dark />
        <div className="oc-old-lines">
          <Bar w={88} h={7} r={3} tone={4} />
          <Bar w="82%" h={7} r={3} tone={2} />
          <Bar w="66%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="oc-old">
        <span className="oc-av oc-av--filler" />
        <div className="oc-old-lines">
          <Bar w={104} h={7} r={3} tone={4} />
          <Bar w="70%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="oc-old">
        <span className="oc-av oc-av--filler" />
        <div className="oc-old-lines">
          <Bar w={116} h={7} r={3} tone={4} />
          <Bar w="78%" h={7} r={3} tone={2} />
          <Bar w="58%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="oc-old">
        <span className="oc-av oc-av--filler" data-dark />
        <div className="oc-old-lines">
          <Bar w={92} h={7} r={3} tone={4} />
          <Bar w="86%" h={7} r={3} tone={2} />
          <Bar w="48%" h={7} r={3} tone={2} />
          <Bar
            w={compact ? 120 : 168}
            h={28}
            r={8}
            tone={1}
            className="oc-old-file"
          />
        </div>
      </div>
      <div className="oc-old">
        <span className="oc-av oc-av--filler" />
        <div className="oc-old-lines">
          <Bar w={108} h={7} r={3} tone={4} />
          <Bar w="72%" h={7} r={3} tone={2} />
        </div>
      </div>
      <div className="oc-old" data-target={compact ? "rest" : undefined}>
        <span className="oc-av oc-av--filler" data-dark />
        <div className="oc-old-lines">
          <Bar w={84} h={7} r={3} tone={4} />
          <Bar w="64%" h={7} r={3} tone={2} />
        </div>
      </div>
    </>
  )
}

function Thread({ s, compact }: { s: S; compact: boolean }) {
  return (
    <div className="oc-thread">
      <Older compact={compact} />
      <Collapse open={s.sent} reveal="drop" from="below">
        <div className="oc-slot">
          <div className="oc-msg" data-target="msg">
            <Avatar who="ml" />
            <div className="oc-msg-body">
              <div className="oc-meta">
                <span className="oc-name">Marcus Lee</span>
                <span className="oc-time">10:02 AM</span>
                <Pin
                  size={12}
                  strokeWidth={2}
                  className="oc-msg-pin"
                  data-on={s.pinned || undefined}
                />
              </div>
              <p className="oc-text">{MESSAGE}</p>
              <Attachment />
            </div>
            <div className="oc-tools">
              <span className="oc-tool">
                <SmilePlus size={14} strokeWidth={2} />
              </span>
              <span
                className="oc-tool"
                data-target="pin"
                data-cursor="pointer"
                data-on={s.pinned || undefined}
              >
                <Pin size={14} strokeWidth={2} />
              </span>
            </div>
          </div>
        </div>
      </Collapse>
      <Collapse open={s.reply} reveal="drop" from="below">
        <div className="oc-slot">
          <div className="oc-msg">
            <Avatar who="sp" />
            <div className="oc-msg-body">
              <div className="oc-meta">
                <span className="oc-name">SP Vending</span>
                <span className="oc-time">10:04 AM</span>
              </div>
              <p className="oc-text">{REPLY}</p>
            </div>
          </div>
        </div>
      </Collapse>
    </div>
  )
}

function Composer({ s }: { s: S }) {
  return (
    <div className="oc-composer" data-focus={s.focus || undefined}>
      <Collapse open={s.file}>
        <div className="oc-composer-files">
          <Attachment />
        </div>
      </Collapse>
      <div className="oc-input" data-target="input" data-cursor="ibeam">
        <span
          className="oc-placeholder"
          data-hide={s.draft.length > 0 || undefined}
        >
          Message SP Vending
        </span>
        <span>{s.draft}</span>
        <span
          className="oc-caret"
          data-show={s.focus || undefined}
          data-typing={s.draft.length > 0 || undefined}
        />
      </div>
      <div className="oc-composer-tools">
        <span className="oc-attach" data-target="attach" data-cursor="pointer">
          <Paperclip size={16} strokeWidth={2} />
        </span>
        <span
          className="oc-send"
          data-target="send"
          data-cursor="pointer"
          data-ready={s.draft.length > 0 || undefined}
        >
          Send
          <SendHorizontal size={14} strokeWidth={2} />
        </span>
      </div>
    </div>
  )
}

function Chat({ s, compact }: { s: S; compact: boolean }) {
  return (
    <div className="oc-chat">
      <div className="oc-head">
        <span className="oc-mark">SP</span>
        <span className="oc-title">SP Vending</span>
        <span className="oc-online">
          <span className="oc-online-dot" />
          Online
        </span>
        {compact ? (
          <span className="oc-call oc-call--icon">
            <Video size={14} strokeWidth={2} />
          </span>
        ) : (
          <>
            <span className="oc-pile">
              <Avatar who="ml" />
              <Avatar who="dw" />
              <Avatar who="sp" />
            </span>
            <span className="oc-call">
              <Video size={14} strokeWidth={2} />
              Start a call
            </span>
          </>
        )}
      </div>
      <PinnedBar s={s} compact={compact} />
      <Thread s={s} compact={compact} />
      <Composer s={s} />
    </div>
  )
}

// The page's ticket column, filler, running off the right and the bottom
function Aside() {
  return (
    <div className="oc-aside" data-target="rest">
      <section className="oc-card">
        <div className="oc-card-head">
          <span>Tickets</span>
        </div>
        {[132, 104, 148, 118].map((w, i) => (
          <div key={i} className="oc-card-row">
            <div className="oc-card-lines">
              <Bar w={w} h={7} r={3} tone={3} />
              <Bar w={w - 40} h={6} r={3} tone={2} />
            </div>
            <Bar w={48} h={20} r={6} tone={1} />
          </div>
        ))}
      </section>
      <section className="oc-card">
        <div className="oc-card-head">
          <span>Response times</span>
        </div>
        {[56, 60, 64, 58].map((w, i) => (
          <div key={i} className="oc-card-row oc-card-row--short">
            <Bar w={w} h={20} r={6} tone={1} />
            <Bar w={52} h={7} r={3} tone={2} />
          </div>
        ))}
      </section>
    </div>
  )
}

export default function OrgChat() {
  return (
    <Stage
      width={880}
      height={540}
      compact={{ below: 720, width: 358, height: 580 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      cursor={{ at: { wide: REST, compact: { x: 306, y: 300 } } }}
      className="sp-look oc"
    >
      {(s, _rect, layout) =>
        layout === "compact" ? (
          <div className="oc-solo">
            <Chat s={s} compact />
          </div>
        ) : (
          <Window title="Support" className="oc-win">
            <div className="oc-page">
              <Chat s={s} compact={false} />
              <Aside />
            </div>
          </Window>
        )
      }
    </Stage>
  )
}
