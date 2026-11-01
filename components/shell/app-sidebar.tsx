"use client"

import Link from "next/link"
import { usePath } from "@/lib/use-path"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { OrgSwitcher } from "@/components/shell/org-switcher"
import { PersonAvatar } from "@/components/sp/brand"
import { ADMIN_PAGES, OPERATOR_PRODUCTS } from "@/lib/nav"
import { useOperatorOrg, useStore } from "@/lib/store"
import { useInboxSummary } from "@/components/support/inbox-summary"

const activeCls =
  "data-active:bg-card data-active:shadow-[0_0_0_1px_var(--hairline)] data-active:[&>svg]:text-copper"

export function AppSidebar() {
  const pathname = usePath()
  const isAdmin = pathname.startsWith("/admin")
  const { tickets, operatorOrgId } = useStore()
  const org = useOperatorOrg()
  const user = isAdmin ? { name: "Kevin Mok", sub: "Operator Success" } : { name: org.operators[0]!.name, sub: org.operators[0]!.role ?? "" }
  const inbox = useInboxSummary()
  const unread = inbox.reduce((s, r) => s + r.unread, 0)
  const openTickets = tickets.filter((t) => t.orgId === operatorOrgId && t.status !== "resolved").length

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-2">
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent className="gap-0 py-1">
        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>SP admin</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_PAGES.map((p) => {
                const active = pathname === p.href || pathname.startsWith(p.href + "/")
                return (
                  <SidebarMenuItem key={p.href}>
                    <SidebarMenuButton render={<Link href={p.href} />} isActive={active} className={activeCls}>
                      <p.icon />
                      <span>{p.title}</span>
                    </SidebarMenuButton>
                    {p.href === "/admin/inbox" && unread > 0 && (
                      <SidebarMenuBadge className="num rounded-full bg-copper px-1.5 text-[10px] text-white">
                        {unread}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>Products</SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {OPERATOR_PRODUCTS.map((product) => {
                if (product.href) {
                  return (
                    <SidebarMenuItem key={product.title}>
                      <SidebarMenuButton
                        render={<Link href={product.href} />}
                        isActive={pathname === product.href}
                        className={activeCls}
                      >
                        <product.icon />
                        <span>{product.title}</span>
                      </SidebarMenuButton>
                      {product.href === "/support" && openTickets > 0 && (
                        <SidebarMenuBadge className="num text-[11px] text-muted-foreground">{openTickets}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                }
                const inProduct = product.pages.some((p) => p.href === pathname)
                return (
                  <SidebarMenuItem key={product.title}>
                    <SidebarMenuButton
                      render={<Link href={product.pages[0]!.href} />}
                      className={inProduct ? "font-medium [&>svg]:text-copper" : ""}
                    >
                      <product.icon />
                      <span>{product.title}</span>
                    </SidebarMenuButton>
                    <SidebarMenuSub className="mr-0 pr-0">
                      {product.pages.map((p) => (
                        <SidebarMenuSubItem key={p.href}>
                          <SidebarMenuSubButton
                            render={<Link href={p.href} />}
                            isActive={pathname === p.href}
                            className="data-active:bg-card data-active:font-medium data-active:shadow-[0_0_0_1px_var(--hairline)]"
                          >
                            <span>{p.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1">
          <PersonAvatar name={user.name} sp={isAdmin} />
          <div className="grid leading-tight">
            <span className="text-[13px] font-medium">{user.name}</span>
            <span className="text-xs text-muted-foreground">{user.sub}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
