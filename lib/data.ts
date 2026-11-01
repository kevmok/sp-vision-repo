import { DAY, HOUR, MIN, NOW, at } from "@/lib/time"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Owner = "Kevin" | "Sahib" | "Andrew" | "Alex"
export type Relationship = "Good" | "Watch" | "Poor"

export type Person = { name: string; role?: string }

export type RestockItem = { name: string; qty: number }

export type Machine = {
  id: string
  venue: string
  status: "online" | "offline"
  offlineHours: number
  lastSaleHoursAgo: number
  usualGapHours: number
  lanesTotal: number
  lanesLow: number
  lanesEmpty: number
  lanesEmpty3d: number
  fault?: { lane: string; detail: string; sinceMs: number }
  addedFromVtmMs?: number
  revenueToday: number
  revenueWeek: number
  restock: RestockItem[]
}

export type Org = {
  id: string
  name: string
  city: string
  operators: Person[]
  owner: Owner
  day: number
  setup: {
    vtmConnectedMs: number | null
    salesMappedShare: number
    purchasesEntered: boolean
    hostDeals: { set: number; total: number }
  }
  usage: { daysActive14: number; lastLoginMs: number }
  vtmSyncCurrent: boolean
  purchasesCurrent: boolean
  revenueChange4w: number
  relationship: Relationship
  repeatIssue?: string
  lastCheckInMs: number
  goals: { text: string; status: "On track" | "At risk" | "Done" }[]
  machines: Machine[]
  daily14: number[]
}

export const SP_ORG_ID = "sp"

export const CHAINS = ["Hollis Hardware", "QuickStop", "Ramen Row", "Arcadia Fun Center", "Gulf Coast Arcades", "Independents"] as const
export type Chain = (typeof CHAINS)[number]

export function chainOf(venue: string): Chain {
  return CHAINS.find((c) => c !== "Independents" && venue.startsWith(c)) ?? "Independents"
}

export const SP_TEAM: Record<Owner, Person> = {
  Kevin: { name: "Kevin Mok", role: "Operator Success" },
  Sahib: { name: "Sahib Singh", role: "Partnerships" },
  Andrew: { name: "Andrew Park", role: "Operations" },
  Alex: { name: "Alex Rivera", role: "Engineering" },
}

// ---------------------------------------------------------------------------
// Deterministic generator
// ---------------------------------------------------------------------------

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PRODUCTS = [
  "Pokémon booster pack",
  "Pokémon mini tin",
  "Pokémon sleeved pack",
  "Mochi squishy",
  "Jumbo squishy",
  "Squishy keychain",
  "Hot chili chips",
  "Sour gummy belts",
  "Chocolate bar",
  "Sparkling water",
  "Iced tea",
  "Cola can",
]

type MachineOverride = Partial<Machine> & { i: number }

type OrgSpec = Omit<Org, "machines" | "daily14"> & {
  seed: number
  venues: string[]
  revPerMachine: number
  emptyBias?: number
  overrides?: MachineOverride[]
}

function buildMachines(spec: OrgSpec): Machine[] {
  const r = rng(spec.seed)
  return spec.venues.map((venue, i) => {
    const lanesTotal = 30
    const lanesEmpty = Math.floor(r() * 2.2 + (spec.emptyBias ?? 0) * (0.6 + r()))
    const lanesLow = Math.floor(r() * 5) + (spec.emptyBias ? 2 : 0)
    const revenueWeek = Math.round(spec.revPerMachine * (0.7 + r() * 0.6))
    const m: Machine = {
      id: `VTM-${20000 + Math.floor(r() * 9000) + i}`,
      venue,
      status: "online",
      offlineHours: 0,
      lastSaleHoursAgo: Math.round((0.2 + r() * 2.4) * 10) / 10,
      usualGapHours: Math.round(3 + r() * 4),
      lanesTotal,
      lanesLow,
      lanesEmpty,
      lanesEmpty3d: Math.min(lanesEmpty, Math.floor(r() * 1.4 + (spec.emptyBias ?? 0) * 0.8)),
      revenueToday: Math.round((revenueWeek / 7) * (0.45 + r() * 0.35)),
      revenueWeek,
      restock: [],
    }
    const o = spec.overrides?.find((x) => x.i === i)
    if (o) {
      const { i: _i, ...rest } = o
      void _i
      Object.assign(m, rest)
    }
    if (m.status === "offline") m.revenueToday = 0
    const need = m.lanesEmpty + m.lanesLow
    // Fisher-Yates with a fixed number of draws keeps server and client output identical.
    const pool = [...PRODUCTS]
    for (let k = pool.length - 1; k > 0; k--) {
      const j = Math.floor(r() * (k + 1))
      ;[pool[k], pool[j]] = [pool[j]!, pool[k]!]
    }
    const picks = pool.slice(0, Math.min(4, Math.max(1, Math.ceil(need / 2))))
    m.restock = picks.map((name, k) => ({ name, qty: 4 + ((spec.seed * 7 + i * 5 + k * 3) % 14) }))
    return m
  })
}

function buildDaily(spec: OrgSpec, machines: Machine[]) {
  const r = rng(spec.seed * 7)
  const perDay = machines.reduce((s, m) => s + m.revenueWeek, 0) / 7
  return Array.from({ length: 14 }, (_, d) => {
    const trend = 1 - spec.revenueChange4w * ((13 - d) / 13) * 0.5
    const weekend = d % 7 === 5 || d % 7 === 6 ? 1.25 : 1
    return Math.round(perDay * trend * weekend * (0.82 + r() * 0.3))
  })
}

// ---------------------------------------------------------------------------
// Pilot operator orgs (all fictional)
// ---------------------------------------------------------------------------

const SPECS: OrgSpec[] = [
  {
    id: "northline",
    name: "Northline Vending",
    city: "Duluth, MN",
    seed: 11,
    operators: [{ name: "Dana Whitfield", role: "Owner" }, { name: "Marcus Lee", role: "Route lead" }],
    owner: "Kevin",
    day: 9,
    setup: {
      vtmConnectedMs: at(10, 24, 10, 5),
      salesMappedShare: 0.81,
      purchasesEntered: false,
      hostDeals: { set: 2, total: 4 },
    },
    usage: { daysActive14: 6, lastLoginMs: NOW - 2 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: false,
    revenueChange4w: 0.06,
    relationship: "Good",
    lastCheckInMs: at(10, 30, 11),
    goals: [
      { text: "Know profit per machine every week", status: "On track" },
      { text: "Cut restock trips to two a week", status: "On track" },
      { text: "Place two more machines by March", status: "On track" },
    ],
    venues: ["Harbor Lanes Bowl", "Maple St Laundromat", "Arcadia Fun Center Canal Park", "QuickStop #31"],
    revPerMachine: 640,
    overrides: [
      { i: 0, fault: { lane: "B4", detail: "3 failed vends since 9:40 AM", sinceMs: at(11, 1, 9, 40) }, lanesEmpty: 3, lanesLow: 6 },
      { i: 1, addedFromVtmMs: at(10, 31, 18, 12), lanesEmpty: 0, lanesLow: 1 },
      { i: 2, lastSaleHoursAgo: 14, usualGapHours: 5, lanesEmpty: 2, lanesLow: 4 },
      { i: 3, status: "offline", offlineHours: 27, lastSaleHoursAgo: 29, lanesEmpty: 1, lanesLow: 2 },
    ],
  },
  {
    id: "bayou",
    name: "Bayou Snack Co",
    city: "Baton Rouge, LA",
    seed: 22,
    operators: [{ name: "Renée Thibodeaux", role: "Owner" }, { name: "Jules Arceneaux", role: "Route lead" }],
    owner: "Sahib",
    day: 52,
    setup: {
      vtmConnectedMs: at(9, 10, 14, 30),
      salesMappedShare: 0.98,
      purchasesEntered: true,
      hostDeals: { set: 9, total: 9 },
    },
    usage: { daysActive14: 12, lastLoginMs: NOW - 40 * MIN },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: 0.14,
    relationship: "Good",
    lastCheckInMs: at(10, 27, 15),
    goals: [
      { text: "Hit $8k weekly revenue across the route", status: "On track" },
      { text: "Keep every lane stocked through weekends", status: "On track" },
      { text: "Open a second route in Lafayette", status: "On track" },
    ],
    venues: [
      "Magnolia Skate Rink",
      "Ramen Row Perkins",
      "Levee Street Laundry",
      "Pelican Bowl",
      "Gulf Coast Arcades Siegen",
      "Bayou Trampoline Park",
      "Oak Alley Apartments",
      "Hollis Hardware Essen",
      "QuickStop #214",
    ],
    revPerMachine: 860,
    overrides: [
      { i: 3, lastSaleHoursAgo: 19, usualGapHours: 4 },
      { i: 5, fault: { lane: "A2", detail: "Motor stall reported at 1:15 PM", sinceMs: at(11, 1, 13, 15) } },
      { i: 1, lanesEmpty: 2, lanesLow: 5 },
      { i: 6, lanesEmpty: 1, lanesLow: 6 },
    ],
  },
  {
    id: "juniper",
    name: "Juniper Vending",
    city: "Bend, OR",
    seed: 33,
    operators: [{ name: "Tess Calloway", role: "Owner" }],
    owner: "Andrew",
    day: 34,
    setup: {
      vtmConnectedMs: at(9, 28, 9, 0),
      salesMappedShare: 0.97,
      purchasesEntered: true,
      hostDeals: { set: 6, total: 6 },
    },
    usage: { daysActive14: 2, lastLoginMs: NOW - 9 * DAY - 3 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: false,
    revenueChange4w: -0.28,
    relationship: "Watch",
    lastCheckInMs: at(10, 14, 10),
    goals: [
      { text: "Replace two weak locations before winter", status: "At risk" },
      { text: "Get weekly P&L without spreadsheets", status: "At risk" },
      { text: "Grow squishy sales at the mall sites", status: "On track" },
    ],
    venues: [
      "Arcadia Fun Center Old Mill",
      "Pine Ridge Laundromat",
      "Cascade Bowl",
      "Deschutes Rec Hall",
      "Hollis Hardware Bend",
      "Summit Ice Rink",
    ],
    revPerMachine: 420,
    overrides: [{ i: 2, status: "offline", offlineHours: 31, lastSaleHoursAgo: 33 }],
  },
  {
    id: "mesa",
    name: "Mesa Ridge Vending",
    city: "Tucson, AZ",
    seed: 44,
    operators: [{ name: "Carlos Duarte", role: "Owner" }, { name: "Priya Nair", role: "Bookkeeper" }],
    owner: "Alex",
    day: 71,
    setup: {
      vtmConnectedMs: at(8, 23, 13, 0),
      salesMappedShare: 0.96,
      purchasesEntered: true,
      hostDeals: { set: 8, total: 8 },
    },
    usage: { daysActive14: 6, lastLoginMs: NOW - 5 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: -0.04,
    relationship: "Watch",
    repeatIssue: "Lane B2 jam at Saguaro Lanes, third report",
    lastCheckInMs: at(10, 29, 16),
    goals: [
      { text: "Stop losing sales to lane jams", status: "At risk" },
      { text: "Close the books in under an hour a month", status: "Done" },
      { text: "Add a machine at the university", status: "On track" },
    ],
    venues: [
      "Saguaro Lanes",
      "Sonoran Laundry Co",
      "Desert Sky Cinema",
      "Arcadia Fun Center Catalina",
      "QuickStop #77",
      "Rillito Rec Center",
      "Ramen Row Fourth Ave",
      "Starr Pass Hotel Lobby",
    ],
    revPerMachine: 590,
    overrides: [{ i: 0, fault: { lane: "B2", detail: "Jammed again, 5 failed vends today", sinceMs: at(11, 1, 8, 5) } }],
  },
  {
    id: "lakeshore",
    name: "Lakeshore Treats",
    city: "Milwaukee, WI",
    seed: 55,
    operators: [{ name: "Hannah Kowalski", role: "Owner" }],
    owner: "Kevin",
    day: 23,
    setup: {
      vtmConnectedMs: at(10, 10, 12, 0),
      salesMappedShare: 0.95,
      purchasesEntered: true,
      hostDeals: { set: 5, total: 7 },
    },
    usage: { daysActive14: 7, lastLoginMs: NOW - 26 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: 0.02,
    relationship: "Good",
    lastCheckInMs: at(10, 26, 13),
    goals: [
      { text: "Never have a lane empty more than a day", status: "At risk" },
      { text: "Set host deals for every location", status: "On track" },
      { text: "Learn which products sell where", status: "On track" },
    ],
    venues: [
      "Bay View Bowl",
      "Brady St Laundromat",
      "Third Ward Arcade",
      "QuickStop #12",
      "Lakefront Marina",
      "Hollis Hardware Riverwest",
      "Harbor Ice Arena",
    ],
    revPerMachine: 510,
    emptyBias: 8,
  },
  {
    id: "pinewood",
    name: "Pinewood Vending Co",
    city: "Asheville, NC",
    seed: 66,
    operators: [{ name: "Ben Hollis", role: "Owner" }, { name: "Ada Hollis", role: "Co-owner" }],
    owner: "Sahib",
    day: 84,
    setup: {
      vtmConnectedMs: at(8, 10, 9, 0),
      salesMappedShare: 0.99,
      purchasesEntered: true,
      hostDeals: { set: 12, total: 12 },
    },
    usage: { daysActive14: 11, lastLoginMs: NOW - 3 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: 0.05,
    relationship: "Good",
    lastCheckInMs: at(10, 22, 14),
    goals: [
      { text: "Run the route with one part-time helper", status: "Done" },
      { text: "Move the three slowest machines", status: "On track" },
      { text: "Reach 15 machines by spring", status: "On track" },
    ],
    venues: [
      "Blue Ridge Bowl",
      "River Arts Laundry",
      "Biltmore Cinema",
      "Arcadia Fun Center Haywood",
      "Smoky Park Rec",
      "Montford Comics",
      "Ramen Row West",
      "Grove Arcade Lobby",
      "French Broad Marina",
      "Swannanoa Ice Rink",
      "Hollis Hardware Lexington",
      "QuickStop #402",
    ],
    revPerMachine: 700,
  },
  {
    id: "redbird",
    name: "Redbird Arcade Supply",
    city: "St. Louis, MO",
    seed: 77,
    operators: [{ name: "Owen Brandt", role: "Owner" }],
    owner: "Andrew",
    day: 16,
    setup: {
      vtmConnectedMs: at(10, 17, 15, 0),
      salesMappedShare: 0.78,
      purchasesEntered: false,
      hostDeals: { set: 1, total: 3 },
    },
    usage: { daysActive14: 2, lastLoginMs: NOW - 8 * DAY },
    vtmSyncCurrent: false,
    purchasesCurrent: false,
    revenueChange4w: -0.06,
    relationship: "Poor",
    lastCheckInMs: at(10, 20, 10),
    goals: [
      { text: "See what each machine actually earns", status: "At risk" },
      { text: "Get host payouts out on time", status: "At risk" },
      { text: "Try card packs at the arcade site", status: "On track" },
    ],
    venues: ["Arcadia Fun Center Gateway", "Soulard Laundromat", "Forest Park Rec"],
    revPerMachine: 380,
  },
  {
    id: "harborview",
    name: "Harborview Vending",
    city: "Tacoma, WA",
    seed: 88,
    operators: [{ name: "Lena Okafor", role: "Owner" }, { name: "Sam Reyes", role: "Route lead" }],
    owner: "Alex",
    day: 45,
    setup: {
      vtmConnectedMs: at(9, 17, 11, 0),
      salesMappedShare: 0.97,
      purchasesEntered: true,
      hostDeals: { set: 10, total: 10 },
    },
    usage: { daysActive14: 10, lastLoginMs: NOW - 6 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: 0.08,
    relationship: "Good",
    lastCheckInMs: at(10, 28, 9),
    goals: [
      { text: "Track host payouts automatically", status: "Done" },
      { text: "Raise card pack sell-through at arcades", status: "On track" },
      { text: "Bring Sam fully onto the app", status: "On track" },
    ],
    venues: [
      "Ruston Way Arcade",
      "Proctor Laundromat",
      "Point Defiance Rec",
      "Sixth Ave Bowl",
      "Ramen Row Stadium",
      "Commencement Bay Marina",
      "Tacoma Dome Lobby",
      "QuickStop #58",
      "Lakewood Ice Arena",
      "Hollis Hardware Fircrest",
    ],
    revPerMachine: 760,
  },
  {
    id: "talloaks",
    name: "Tall Oaks Vending",
    city: "Columbus, OH",
    seed: 99,
    operators: [{ name: "Grace Whitman", role: "Owner" }],
    owner: "Kevin",
    day: 60,
    setup: {
      vtmConnectedMs: at(9, 2, 10, 0),
      salesMappedShare: 0.96,
      purchasesEntered: true,
      hostDeals: { set: 6, total: 6 },
    },
    usage: { daysActive14: 8, lastLoginMs: NOW - 30 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: -0.27,
    relationship: "Watch",
    lastCheckInMs: at(10, 19, 15),
    goals: [
      { text: "Win back sales at the campus sites", status: "At risk" },
      { text: "Test drinks next to card packs", status: "On track" },
      { text: "Keep host relationships happy", status: "On track" },
    ],
    venues: [
      "Arcadia Fun Center Short North",
      "German Village Laundry",
      "Campus Rec Hall",
      "Easton Bowl",
      "Ramen Row Clintonville",
      "Scioto Ice Arena",
    ],
    revPerMachine: 470,
  },
  {
    id: "sunbelt",
    name: "Sunbelt Snack & Card",
    city: "Tampa, FL",
    seed: 111,
    operators: [{ name: "Marisol Vega", role: "Owner" }, { name: "Theo Grant", role: "Route lead" }],
    owner: "Sahib",
    day: 28,
    setup: {
      vtmConnectedMs: at(10, 5, 9, 30),
      salesMappedShare: 0.97,
      purchasesEntered: true,
      hostDeals: { set: 8, total: 8 },
    },
    usage: { daysActive14: 10, lastLoginMs: NOW - 4 * HOUR },
    vtmSyncCurrent: true,
    purchasesCurrent: true,
    revenueChange4w: 0.11,
    relationship: "Good",
    lastCheckInMs: at(10, 30, 14),
    goals: [
      { text: "Pay hosts from the app every month", status: "On track" },
      { text: "Find the best card pack mix per site", status: "On track" },
      { text: "Place machines at two new arcades", status: "On track" },
    ],
    venues: [
      "Gulf Coast Arcades Ybor",
      "QuickStop #9",
      "Bayshore Bowl",
      "Channelside Cinema",
      "Westshore Rec",
      "Ramen Row Hyde Park",
      "Davis Islands Marina",
      "Gulf Coast Arcades Brandon",
    ],
    revPerMachine: 690,
    overrides: [{ i: 4, status: "offline", offlineHours: 26, lastSaleHoursAgo: 27 }],
  },
]

export const ORGS: Org[] = SPECS.map((spec) => {
  const { seed: _s, venues: _v, revPerMachine: _r, emptyBias: _e, overrides: _o, ...org } = spec
  void _s
  void _v
  void _r
  void _e
  void _o
  const machines = buildMachines(spec)
  return { ...org, machines, daily14: buildDaily(spec, machines) }
})

export const ORG_BY_ID: Record<string, Org> = Object.fromEntries(ORGS.map((o) => [o.id, o]))

export function machineById(org: Org, id?: string) {
  return id ? org.machines.find((m) => m.id === id) : undefined
}

// ---------------------------------------------------------------------------
// Support: chats, triage, tickets
// ---------------------------------------------------------------------------

export type Attachment = { name: string; kind: "image" | "file" | "sheet"; size: string }
export type Reaction = { emoji: string; by: string[] }

export type Message = {
  id: string
  orgId: string
  author: string
  side: "operator" | "sp" | "system"
  at: number
  text: string
  attachments?: Attachment[]
  reactions?: Reaction[]
  pinned?: boolean
  call?: { title: string; link: string }
}

export type Priority = "Urgent" | "Normal" | "Question"
export type Category =
  | "Lane fault"
  | "Machine offline"
  | "Payments"
  | "Sales mapping"
  | "Restock"
  | "Host deal"
  | "Account"
  | "Other"

export const CATEGORIES: Category[] = [
  "Lane fault",
  "Machine offline",
  "Payments",
  "Sales mapping",
  "Restock",
  "Host deal",
  "Account",
  "Other",
]
export const PRIORITIES: Priority[] = ["Urgent", "Normal", "Question"]

export type TicketDraft = {
  category: Category
  machineId?: string
  priority: Priority
  summary: string
}

export type Triage =
  | { kind: "ticket"; draft: TicketDraft; state: "proposed" | "accepted" | "dismissed"; ticketId?: string }
  | { kind: "none"; reason: string; state: "proposed" | "accepted" | "dismissed"; ticketId?: string }

export type TicketStatus = "open" | "waiting" | "resolved"

export type Ticket = TicketDraft & {
  id: string
  orgId: string
  status: TicketStatus
  openedAt: number
  messageId?: string
  assignee: Owner
}

const m = (id: string, orgId: string, author: string, side: Message["side"], when: number, text: string, extra: Partial<Message> = {}): Message => ({
  id,
  orgId,
  author,
  side,
  at: when,
  text,
  ...extra,
})

export const SEED_MESSAGES: Message[] = [
  // Northline: the hero thread
  m("n1", "northline", "Kevin Mok", "sp", at(10, 24, 10, 30), "Welcome aboard, Dana and Marcus. This is your one thread with SP for anything: questions, machine issues, ideas. Anything that needs tracking becomes a ticket here.", { pinned: true }),
  m("n2", "northline", "Kevin Mok", "sp", at(10, 24, 10, 32), "Kickoff call", { call: { title: "Northline kickoff", link: "https://teams.microsoft.com/l/meetup-join/19%3Ameeting_NL-kickoff%40thread.v2/0" } }),
  m("n3", "northline", "Kevin Mok", "sp", at(10, 28, 9, 15), "Here's the purchase cost template we talked about. Fill in what you paid per case and the P&L will light up.", {
    attachments: [{ name: "purchase-costs-template.xlsx", kind: "sheet", size: "48 KB" }],
    pinned: true,
  }),
  m("n4", "northline", "Marcus Lee", "operator", at(10, 31, 10, 2), "B4 at Harbor Lanes keeps eating packs. Photo of the coil attached.", {
    attachments: [{ name: "harbor-lanes-b4.jpg", kind: "image", size: "2.1 MB" }],
  }),
  m("n5", "northline", "Kevin Mok", "sp", at(10, 31, 10, 20), "Got it. Opened T-1046 and Alex is pulling the motor logs from VTM.", {
    reactions: [{ emoji: "👍", by: ["Marcus Lee", "Dana Whitfield"] }],
  }),
  m("n6", "northline", "Dana Whitfield", "operator", at(10, 31, 16, 44), "Thanks for the walkthrough yesterday, the mapping screen makes a lot more sense now 🙏", {
    reactions: [{ emoji: "❤️", by: ["Kevin Mok"] }],
  }),
  m("n7", "northline", "Kevin Mok", "sp", at(10, 31, 16, 50), "Anytime. You're at 81% mapped, the last few are mostly the new squishy SKUs."),
  m("n8", "northline", "Dana Whitfield", "operator", at(11, 1, 14, 48), "The card reader at Maple St Laundromat is declining every tap since this morning. Cash still works. That's the new machine that showed up yesterday.", {
    attachments: [{ name: "maple-st-reader.jpg", kind: "image", size: "1.4 MB" }],
  }),

  // Bayou
  m("b1", "bayou", "Sahib Singh", "sp", at(10, 27, 15, 10), "Great check-in today. Revenue per machine is in the top three of the pilot.", { pinned: true }),
  m("b2", "bayou", "Renée Thibodeaux", "operator", at(10, 27, 15, 22), "Ha, tell the others to stay off our turf 😄", { reactions: [{ emoji: "😂", by: ["Sahib Singh"] }] }),
  m("b3", "bayou", "Jules Arceneaux", "operator", at(11, 1, 13, 40), "A2 at Bayou Trampoline Park stalled around 1:15. I cleared it but it threw the error again. Can someone look at the motor?"),

  // Juniper
  m("j1", "juniper", "Andrew Park", "sp", at(10, 14, 10, 30), "Notes from today: we'll look at moving Cascade Bowl and Summit Ice Rink before winter.", { pinned: true }),
  m("j2", "juniper", "Tess Calloway", "operator", at(10, 20, 9, 12), "Is there a way to export the weekly P&L to my accountant?"),
  m("j3", "juniper", "Andrew Park", "sp", at(10, 20, 11, 2), "Yes, Statements has a CSV export. Opened T-1039 to add a PDF version too."),

  // Mesa
  m("me1", "mesa", "Carlos Duarte", "operator", at(10, 28, 8, 30), "B2 at Saguaro Lanes jammed again. That's the third time this month."),
  m("me2", "mesa", "Alex Rivera", "sp", at(10, 28, 9, 5), "Sorry Carlos. T-1038 is open, VTM is shipping a replacement coil."),
  m("me3", "mesa", "Carlos Duarte", "operator", at(11, 1, 8, 20), "Still jamming. 5 failed vends today, people are asking for refunds at the front desk. Any update on the coil?"),

  // Lakeshore
  m("l1", "lakeshore", "Kevin Mok", "sp", at(10, 26, 13, 30), "Restock plan from our call: Bay View and Third Ward on Mondays, the rest on Thursdays.", { pinned: true }),
  m("l2", "lakeshore", "Hannah Kowalski", "operator", at(11, 1, 9, 50), "Do I need to set host deals for machines that are on a flat monthly fee, or only revenue share?"),

  // Pinewood
  m("p1", "pinewood", "Ben Hollis", "operator", at(10, 30, 17, 5), "Statements for October look right. Nice work on the host payout split."),
  m("p2", "pinewood", "Sahib Singh", "sp", at(10, 30, 17, 30), "Glad it lined up. Talk Thursday.", { reactions: [{ emoji: "👍", by: ["Ben Hollis"] }] }),

  // Redbird
  m("r1", "redbird", "Andrew Park", "sp", at(10, 24, 10, 0), "Hi Owen, following up on mapping. Want to grab 15 minutes this week?"),
  m("r2", "redbird", "Owen Brandt", "operator", at(10, 24, 18, 40), "Yeah sorry, been slammed. Next week works."),

  // Harborview
  m("h1", "harborview", "Sam Reyes", "operator", at(11, 1, 12, 5), "Lol the Pokémon packs at Ruston Way sold out in two days again"),
  m("h2", "harborview", "Lena Okafor", "operator", at(11, 1, 12, 9), "Can we add a second lane of booster packs there? How do I change the planogram in VTM?"),

  // Tall Oaks
  m("t1", "talloaks", "Grace Whitman", "operator", at(10, 30, 10, 15), "Campus Rec Hall sales fell off a cliff. Is the machine okay?"),
  m("t2", "talloaks", "Kevin Mok", "sp", at(10, 30, 11, 0), "Machine is healthy. Looks like the gym moved the machine away from the entrance. Let's review locations on our next call."),

  // Sunbelt
  m("s1", "sunbelt", "Theo Grant", "operator", at(10, 31, 16, 0), "Restocked Westshore, all good."),
  m("s2", "sunbelt", "Theo Grant", "operator", at(11, 1, 11, 30), "Westshore Rec shows offline on my phone. Power looks fine at the outlet."),
]

export const SEED_TRIAGE: Record<string, Triage> = {
  n4: {
    kind: "ticket",
    state: "accepted",
    ticketId: "T-1046",
    draft: { category: "Lane fault", machineId: undefined, priority: "Normal", summary: "Lane B4 eating packs at Harbor Lanes Bowl" },
  },
  n6: { kind: "none", reason: "Chit-chat: thanks for the walkthrough", state: "accepted" },
  n8: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Payments", machineId: undefined, priority: "Urgent", summary: "Card reader declining all taps at Maple St Laundromat since this morning" },
  },
  b2: { kind: "none", reason: "Chit-chat: banter after check-in", state: "accepted" },
  b3: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Lane fault", priority: "Normal", summary: "A2 motor stall at Bayou Trampoline Park, recurs after clearing" },
  },
  j2: {
    kind: "ticket",
    state: "accepted",
    ticketId: "T-1039",
    draft: { category: "Account", priority: "Question", summary: "Export weekly P&L as PDF for accountant" },
  },
  me1: {
    kind: "ticket",
    state: "accepted",
    ticketId: "T-1038",
    draft: { category: "Lane fault", priority: "Normal", summary: "Lane B2 jam at Saguaro Lanes, third this month" },
  },
  me3: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Lane fault", priority: "Urgent", summary: "B2 still jamming at Saguaro Lanes, 5 failed vends and refund requests" },
  },
  l2: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Host deal", priority: "Question", summary: "Do flat-fee hosts need host deals set?" },
  },
  p1: { kind: "none", reason: "Chit-chat: positive feedback on statements", state: "accepted" },
  r2: { kind: "none", reason: "Scheduling reply, no issue raised", state: "accepted" },
  h1: { kind: "none", reason: "Chit-chat: sell-out comment", state: "accepted" },
  h2: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Restock", priority: "Question", summary: "Add a second booster pack lane at Ruston Way Arcade" },
  },
  t1: {
    kind: "ticket",
    state: "accepted",
    ticketId: "T-1043",
    draft: { category: "Other", priority: "Normal", summary: "Campus Rec Hall sales drop, machine moved by host" },
  },
  s1: { kind: "none", reason: "Status update, nothing to do", state: "accepted" },
  s2: {
    kind: "ticket",
    state: "proposed",
    draft: { category: "Machine offline", priority: "Urgent", summary: "Westshore Rec offline, outlet has power" },
  },
}

// Fill machine ids from venue names mentioned in the seeded summaries.
for (const [msgId, t] of Object.entries(SEED_TRIAGE)) {
  if (t.kind !== "ticket") continue
  const msg = SEED_MESSAGES.find((x) => x.id === msgId)
  const org = msg && ORG_BY_ID[msg.orgId]
  const hit = org?.machines.find((mm) => t.draft.summary.includes(mm.venue))
  if (hit) t.draft.machineId = hit.id
}

const ticketFrom = (msgId: string, id: string, status: TicketStatus, assignee: Owner): Ticket => {
  const msg = SEED_MESSAGES.find((x) => x.id === msgId)!
  const t = SEED_TRIAGE[msgId] as Extract<Triage, { kind: "ticket" }>
  return { ...t.draft, id, orgId: msg.orgId, status, openedAt: msg.at, messageId: msgId, assignee }
}

export const SEED_TICKETS: Ticket[] = [
  ticketFrom("me1", "T-1038", "open", "Alex"),
  ticketFrom("j2", "T-1039", "waiting", "Alex"),
  ticketFrom("t1", "T-1043", "resolved", "Kevin"),
  ticketFrom("n4", "T-1046", "open", "Alex"),
  {
    id: "T-1031",
    orgId: "northline",
    category: "Sales mapping",
    priority: "Question",
    summary: "Squishy SKUs not matching VTM product names",
    status: "resolved",
    openedAt: at(10, 26, 11, 0),
    assignee: "Kevin",
  },
  {
    id: "T-1034",
    orgId: "bayou",
    category: "Host deal",
    priority: "Normal",
    summary: "Split host payout between two managers at Oak Alley",
    status: "resolved",
    openedAt: at(10, 12, 9, 0),
    assignee: "Sahib",
  },
  {
    id: "T-1040",
    orgId: "redbird",
    category: "Sales mapping",
    priority: "Normal",
    summary: "22% of sales unmapped after VTM connect",
    status: "waiting",
    openedAt: at(10, 21, 14, 0),
    assignee: "Andrew",
  },
]

// When SP last read each org chat (unread = operator messages after this)
export const SEED_READ_AT: Record<string, number> = {
  northline: at(10, 31, 17, 0),
  bayou: at(10, 31, 9, 0),
  juniper: NOW,
  mesa: at(10, 30, 9, 0),
  lakeshore: at(10, 31, 9, 0),
  pinewood: NOW,
  redbird: NOW,
  harborview: at(11, 1, 12, 6),
  talloaks: NOW,
  sunbelt: at(10, 31, 17, 0),
}

export const TICKET_START = 1047
