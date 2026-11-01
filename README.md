# SP Vending POCs

Clickable proof of concept for two ideas:

1. **Operator super app.** One login, one sidebar, several products (Operations, Money, Hosts, Team, Ask your data, Growth, Support), with an org switcher and a ⌘K palette that jumps between them.
2. **Operator Success.** An SP-internal health board for pilot operators (scores, signals, plays), plus support built as one persistent chat per org with an AI triage step that turns messages into tickets.

Everything is mock data held in client memory. There is no backend and no auth. Reloading the page resets the state. All operator orgs, people and venues are made up.

## Run

```sh
pnpm install
pnpm build && pnpm start      # http://localhost:3000
# or: pnpm dev
```

`?org=<id>` picks the operator org on first load, for example `/?org=bayou`. The ids are `northline`, `bayou`, `juniper`, `mesa`, `lakeshore`, `pinewood`, `redbird`, `harborview`, `talloaks` and `sunbelt`.

Scripts (run them while the server is on :3311):

- `scripts/reshoot.sh` rebuilds, starts `pnpm start -p 3311` and saves 1440×900 full-page PNGs to `screenshots/`.
- `node scripts/smoke.mjs` clicks through the main flows and prints PASS/FAIL for each one.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Operator home: today's KPIs; alerts sorted most severe first (offline 24h+, lane fault, quiet machine, new machine from VTM); restock list; top machines. Northline is mid-setup, so its pilot setup checklist shows. Bayou has finished setup, so the checklist is hidden. |
| `/machines` | Machine table for the selected org |
| `/restocks`, `/pnl`, `/statements`, `/sales-tax`, `/hosts`, `/team`, `/ask`, `/growth` | Placeholder product pages: title, sample stat cards and skeleton tables |
| `/support` | Operator side of the org's single chat with SP: pinned bar, attachment chips, emoji reactions, "Start a call" (inserts a Teams meeting card), tickets and response times |
| `/admin/health` | SP admin health board for the 10 pilot orgs: band counts, activated x/10, weekly active x/10, band filter, sort by score, five component mini-bars, top signal, next play, owner, check-in |
| `/admin/health/[org]` | Score breakdown showing each component's inputs; active signals, each with its play, owner and "Mark done"; the org's three goals; timeline (kickoff, walkthroughs, day 30/60/90); open tickets; links to the support chat and to the operator view |
| `/admin/inbox` | Every org's chat in one inbox, with unread counts and SLA timers (Urgent 1h, Normal 4h, Question next day). Beside the chat, an AI triage panel proposes a ticket (category, machine, priority, summary) that you can edit and accept, and keeps a triage history that includes messages marked "Not a ticket". Tickets list with open, waiting and resolved status. |
| `/admin/plays` | Placeholder |

Picking **SP Vending (admin)** in the org switcher replaces the sidebar with the SP admin area. Picking an operator brings back the operator products.

## Health score

`lib/health.ts` computes the score from each org's mock inputs. Nothing is hardcoded:

- Usage = 25 × min(daysActive14 / 8, 1)
- Data quality = 8 × salesMappedShare + 4 (purchases current) + 4 (host deals set) + 4 (VTM sync current)
- Machines = 12 × onlineShare + 8 × (1 − emptyLaneShare)
- Sales trend = clamp(10 + 40 × revenueChange4w, 0, 20)
- Relationship = max(0, {Good 15, Watch 8, Poor 0} − 4 × ticketsOpen3d)

The total is rounded. Bands are Red below 50, Yellow 50–74 and Green 75 and up. Signals and plays come from the same inputs. Accepting a ticket or changing a ticket's status feeds back into the Relationship component.

## Triage

`lib/triage.ts` is a keyword heuristic that stands in for the agent. Every operator message gets triaged about 1.4s after it is sent: it picks a category, priority and machine, or marks the message "Not a ticket" when it is chit-chat. Send a message from `/support`, then use the sidebar to go to SP admin → Support inbox. That is a client-side navigation, so the in-memory state survives and you see the proposal. A full page reload resets everything.

## shadcn on Base UI

The project was scaffolded with the shadcn CLI, choosing Base UI as the component library:

```sh
pnpm dlx shadcn@latest init -t next -b base -p nova -n sp-pocs --no-monorepo --no-rtl --pointer
pnpm dlx shadcn@latest add sidebar card badge table tabs dialog command avatar dropdown-menu select \
  input textarea separator scroll-area tooltip progress skeleton sheet popover toggle-group kbd checkbox
```

- `components.json` has `"style": "base-nova"`, and the primitives import from `@base-ui/react/*` (Dialog, Menu, Select, Popover, Tooltip, Toggle Group and others). There is no Radix in the tree.
- Base UI composes components through a `render` prop instead of Radix's `asChild`, for example `<DropdownMenuTrigger render={<SidebarMenuButton />}>`. Links styled as buttons use a small `ButtonLink` (`components/sp/button-link.tsx`) instead of `Button render={<Link/>}`.
- The ⌘K palette uses shadcn's `command` component, which is still built on `cmdk`, inside the Base UI Dialog.
- The theme is SP's brand tokens rather than shadcn's neutral palette, set in `app/globals.css`: cream `#faf9f6`, ink `#1b1a17`, copper `#b3631c` and tint `#f7ead8`, hairline `#ebe8e1`, plus green, amber and red for status. Fonts are Hanken Grotesk for UI text and Geist Mono for numbers and IDs, loaded with `next/font/google`.
- The generated files were changed in three places: the dialog backdrop blur was removed, `hooks/use-mobile.ts` now uses `useSyncExternalStore` (the React 19 lint rule rejects setState inside an effect), and dark mode and `next-themes` were dropped.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, lucide-react. No chart library.
