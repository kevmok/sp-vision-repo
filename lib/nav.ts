import {
  Activity,
  BarChart3,
  ChartLine,
  Landmark,
  MessageSquareText,
  Building2,
  ClipboardList,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  MessagesSquare,
  Receipt,
  Rocket,
  ScrollText,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react"

export type NavPage = { title: string; href: string; icon: LucideIcon }
export type NavProduct = { title: string; icon: LucideIcon; pages: NavPage[]; href?: string }

export const OPERATOR_PRODUCTS: NavProduct[] = [
  {
    title: "Operations",
    icon: Activity,
    pages: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Machines", href: "/machines", icon: Store },
      { title: "Restocks", href: "/restocks", icon: Truck },
    ],
  },
  {
    title: "Money",
    icon: Wallet,
    pages: [
      { title: "P&L", href: "/pnl", icon: BarChart3 },
      { title: "Statements", href: "/statements", icon: ScrollText },
      { title: "Sales tax", href: "/sales-tax", icon: Receipt },
      { title: "Bank sync", href: "/money/bank", icon: Landmark },
    ],
  },
  {
    title: "Insights",
    icon: Sparkles,
    pages: [
      { title: "Analytics", href: "/analytics", icon: ChartLine },
      { title: "Ask", href: "/ask", icon: MessageSquareText },
    ],
  },
  { title: "Hosts", icon: Building2, href: "/hosts", pages: [{ title: "Hosts", href: "/hosts", icon: Building2 }] },
  { title: "Team", icon: Users, href: "/team", pages: [{ title: "Team", href: "/team", icon: Users }] },
  { title: "Growth", icon: Rocket, href: "/growth", pages: [{ title: "Growth", href: "/growth", icon: Rocket }] },
  { title: "Support", icon: LifeBuoy, href: "/support", pages: [{ title: "Support", href: "/support", icon: LifeBuoy }] },
]

export const ADMIN_PAGES: NavPage[] = [
  { title: "Operator health", href: "/admin/health", icon: HeartPulse },
  { title: "Support inbox", href: "/admin/inbox", icon: Inbox },
  { title: "Pilot plays", href: "/admin/plays", icon: ClipboardList },
]

export const ALL_OPERATOR_PAGES = OPERATOR_PRODUCTS.flatMap((p) => p.pages.map((pg) => ({ ...pg, product: p.title })))

export function crumbs(pathname: string): string[] {
  if (pathname.startsWith("/admin/health/")) return ["SP admin", "Operator health"]
  const admin = ADMIN_PAGES.find((p) => p.href === pathname)
  if (admin) return ["SP admin", admin.title]
  const page = ALL_OPERATOR_PAGES.find((p) => p.href === pathname)
  if (!page) return []
  return page.product === page.title ? [page.title] : [page.product, page.title]
}

export const ChatIcon = MessagesSquare
