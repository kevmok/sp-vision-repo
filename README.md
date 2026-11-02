# SP Vending POCs

Clickable proof of concept for three ideas:

1. **Operator super app.** One login, one sidebar, several products (Operations, Money, Insights, Hosts, Team, Growth, Support), with an org switcher and a ⌘K palette that jumps between them.
2. **Operator Success.** An SP-internal health board for pilot operators (scores, signals, plays), plus support built as one persistent chat per org with an AI triage step that turns messages into tickets.
3. **Insights and money automation.** Analytics modelled on spvending.org/analytics, an Ask chat that answers questions with charts and SQL, and Bank sync that categorizes bank transactions against CRM records.

Everything is mock data held in client memory. There is no backend and no auth. Reloading the page resets the state. All operator orgs, people and venues are made up.

## Run

```sh
pnpm install
pnpm dev                                          # http://localhost:3000
pnpm build && python3 -m http.server 3311 -d out  # the static export, as deployed
```

`?org=<id>` picks the operator org on first load, for example `/?org=bayou`. On `/analytics`, `?scope=all` starts on the combined view. The ids are `northline`, `bayou`, `juniper`, `mesa`, `lakeshore`, `pinewood`, `redbird`, `harborview`, `talloaks` and `sunbelt`.

Scripts (run them while the server is on :3311):

- `scripts/reshoot.sh` rebuilds the static export, serves `out/` on :3311 and saves 1440×900 PNGs to `screenshots/`. `node scripts/screenshots.mjs <url> <filter>` reshoots a subset.
- `node scripts/smoke.mjs [baseUrl]` clicks through the main flows and prints PASS/FAIL for each one. Point it at the live URL to check the deploy.

## Routes

| Route | What it shows |
| --- | --- |
| `/` | Operator home: today's KPIs; alerts sorted most severe first (offline 24h+, lane fault, quiet machine, new machine from VTM); restock list; top machines. Northline is mid-setup, so its pilot setup checklist shows. Bayou has finished setup, so the checklist is hidden. |
| `/machines` | Machine table for the selected org |
| `/analytics` | Insights → Analytics. Scope (one org or all combined); KPIs (revenue with units delivered, COGS (FIFO), gross profit, gross margin) with deltas and sparklines; groups by chain or category; top 10 machines with fleet median and event markers; a when-machines-sell heatmap; lost sales from empty lanes; a cost-basis warning; revenue over time with filters and a from-deployment view; top products; machine performance with expandable rows. Chain cards and machine rows open a side drawer. Every section has "Ask about this", and there is a CSV export. |
| `/ask` | Insights → Ask. Chat that streams an answer with a chart, table or big number, a collapsible SQL block, follow-up chips, and pin and save actions. A floating Ask button on every operator page opens the same chat in a side sheet with the page as context, and ⌘K can send a question straight to it. |
| `/money/bank` | Money → Bank sync. Mock Plaid-style connect flow, connected accounts, and an inbox of transactions with a suggested category, confidence and reason, plus matches to CRM records (purchase, host statement, card payouts). Supports accept, change category, split, bulk accept and "always do this" rules. Rules and Reconciled tabs, the latter comparing October bank and CRM totals. The dashboard shows an alert while transactions are waiting. |
| `/restocks`, `/pnl`, `/statements`, `/sales-tax`, `/hosts`, `/team`, `/growth` | Placeholder product pages: title, sample stat cards and skeleton tables |
| `/support` | Operator side of the org's single chat with SP: pinned bar, attachment chips, emoji reactions, "Start a call" (inserts a Teams meeting card), tickets and response times |
| `/admin/health` | SP admin health board for the 10 pilot orgs: band counts, activated x/10, weekly active x/10, band filter, sort by score, five component mini-bars, top signal, next play, owner, check-in |
| `/admin/health/[org]` | Score breakdown showing each component's inputs; active signals, each with its play, owner and "Mark done"; the org's three goals; timeline (kickoff, walkthroughs, day 30/60/90); open tickets; links to the support chat and to the operator view |
| `/admin/inbox` | Every org's chat in one inbox, with unread counts and SLA timers (Urgent 1h, Normal 4h, Question next day). Beside the chat, an AI triage panel proposes a ticket (category, machine, priority, summary) that you can edit and accept, and keeps a triage history that includes messages marked "Not a ticket". Tickets list with open, waiting and resolved status. |
| `/admin/plays` | Placeholder |
| `/stage` | Stage workbench, outside the app shell: faux SP product UI (stills and short animated demos) built with the stageshow kit. `?s=<id>` opens one stage with Replay and a 390px toggle; `?capture=<id>` renders it bare in `#example` for filming. |

Picking **SP Vending (admin)** in the org switcher replaces the sidebar with the SP admin area. Picking an operator brings back the operator products.

## Stages

`/stage` is where marketing-style product shots of SP get built. The kit lives in `components/stage/kit/` (copied from the stageshow skill, left as upstream, excluded from ESLint). `components/stage/sp-look.css` maps SP's brand tokens onto the kit's `--ss-*` tokens; put `sp-look` on every Stage. Each stage is a folder in `components/stage/stages/<id>/` and is registered in `components/stage/catalog.ts`.

The index groups them by the Phase 1 app work on the roadmap, one stage per item:

- `shell-jump` (UI overhaul): ⌘K jumps from Operations to Insights → Analytics, and the sidebar follows.
- `org-chat` (org chat to SP): a photo lands in the org's one thread, SP replies, and pinning it rolls the pinned bar 2 → 3.
- `admin-health` (SP admin view): marking a play done lifts Juniper Vending from Red to Yellow, and the band counts follow.
- `feedback-button` (feedback button): a note about the heatmap is sent with the page attached.
- `usage-tracking` (usage tracking): the pointer reads weekly active week by week, through the target of 7 to this week's 8/10.
- `call-notes` (Teams call links with AI notes): a call started from the chat ends with a Teams card and AI notes in the thread.
- `triage-ticket` (ticket triage agent): AI triage proposes a ticket from Dana's message, and Create ticket tags the message T-1047.
- `onboarding-tour` (onboarding tour): a tour card finishes a pilot setup step and glides to the next.

Other products:

- `ask-quiet`: Insights → Ask answering "Which machines went quiet this week?". At phone width it switches to the Ask side sheet.
- `bank-match`: Bank sync. A card payment matched to purchase P-1042 is confirmed, leaves the inbox, and the count rolls 13 → 12.

The feedback button, usage view, AI notes and tour exist only as stages so far; they aren't in the clickable POC. To film a stage with the skill's `scripts/film.mjs`, point it at `http://localhost:3000/stage/?capture=<id>` with `--select '#example'`. Add `--reduced` to capture the poster frame.

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

## Ask and analytics data

All numbers come from `lib/analytics.ts`, which builds 210 days of deterministic daily revenue per machine from the same mock orgs. It models deployment ramp-up, weekly seasonality, restock cycles, offline days, a per-machine product mix and FIFO cost ratios. Units are worked out from internal unit values that are never displayed, so no selling price appears anywhere. `lib/ask.ts` has twelve scripted answers matched by keyword: revenue by chain, best products per machine, out-of-stock lanes, Pokémon vs One Piece, host payouts owed, machines that went quiet, support tickets by category, uncategorized bank transactions, restock forecast, when machines sell, profit and margin, and products with no cost basis. Each answer is computed from the current org's data. Any other question gets a generic machine ranking table. Bank transactions, vendors and banks are invented (`lib/bank.ts`), and "Plaid (mock)" is not wired to Plaid.

## shadcn on Base UI

The project was scaffolded with the shadcn CLI, choosing Base UI as the component library:

```sh
pnpm dlx shadcn@latest init -t next -b base -p nova -n sp-pocs --no-monorepo --no-rtl --pointer
pnpm dlx shadcn@latest add sidebar card badge table tabs dialog command avatar dropdown-menu select \
  input textarea separator scroll-area tooltip progress skeleton sheet popover toggle-group kbd checkbox \
  chart switch
```

- `components.json` has `"style": "base-nova"`, and the primitives import from `@base-ui/react/*` (Dialog, Menu, Select, Popover, Tooltip, Toggle Group and others). There is no Radix in the tree.
- Base UI composes components through a `render` prop instead of Radix's `asChild`, for example `<DropdownMenuTrigger render={<SidebarMenuButton />}>`. Links styled as buttons use a small `ButtonLink` (`components/sp/button-link.tsx`) instead of `Button render={<Link/>}`.
- The ⌘K palette uses shadcn's `command` component, which is still built on `cmdk`, inside the Base UI Dialog.
- The theme is SP's brand tokens rather than shadcn's neutral palette, set in `app/globals.css`: cream `#faf9f6`, ink `#1b1a17`, copper `#b3631c` and tint `#f7ead8`, hairline `#ebe8e1`, plus green, amber and red for status. Fonts are Hanken Grotesk for UI text and Geist Mono for numbers and IDs, loaded with `next/font/google`.
- The generated files were changed in three places: the dialog backdrop blur was removed, `hooks/use-mobile.ts` now uses `useSyncExternalStore` (the React 19 lint rule rejects setState inside an effect), and dark mode and `next-themes` were dropped.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, lucide-react, and recharts through shadcn's `chart` component. The categorical chart palette is copper, blue, teal, plum, ochre and rose. It passes the lightness, chroma and colorblind-separation checks. Ochre falls below 3:1 contrast, so every chart that uses it also has a legend and tooltips. Heatmaps use a single copper ramp. `ChartTooltipContent` gained a `valueFormatter` prop, and chart animations are off so screenshots are stable.

## Live preview

https://sp-pocs.mok-kevin11.workers.dev (static export on Cloudflare Workers static assets; `noindex` via robots.txt).

The app is exported as static HTML (`output: "export"` in `next.config.ts`), so it needs no server. Every push to `main` deploys through `.github/workflows/deploy.yml`, using the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repo secrets. To deploy by hand, run `pnpm run deploy` (needs `wrangler login`). Screenshots are copied into `public/screenshots/` so Notion can show them by URL.
