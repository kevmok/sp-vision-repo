"use client"

import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { OrgTile, SpLogo } from "@/components/sp/brand"
import { ORGS } from "@/lib/data"
import { useOperatorOrg, useStore } from "@/lib/store"

export function useOrgSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const { setOperatorOrgId } = useStore()
  const isAdmin = pathname.startsWith("/admin")
  return {
    isAdmin,
    toAdmin: () => router.push("/admin/health"),
    toOperator: (id: string) => {
      setOperatorOrgId(id)
      if (isAdmin) router.push("/")
    },
  }
}

export function OrgSwitcher() {
  const org = useOperatorOrg()
  const { isAdmin, toAdmin, toOperator } = useOrgSwitch()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            {isAdmin ? <SpLogo /> : <OrgTile name={org.name} />}
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate text-[13px] font-semibold">{isAdmin ? "SP Vending" : org.name}</span>
              <span className="truncate text-xs text-muted-foreground">{isAdmin ? "Admin" : org.city}</span>
            </div>
            <ChevronsUpDown className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start" side="bottom" sideOffset={6}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Operators</DropdownMenuLabel>
              {ORGS.map((o) => (
                <DropdownMenuItem key={o.id} onClick={() => toOperator(o.id)} className="gap-2 py-1.5">
                  <OrgTile name={o.name} className="size-6 rounded-[5px] text-[9px]" />
                  <span className="truncate">{o.name}</span>
                  {!isAdmin && o.id === org.id && <Check className="ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Internal</DropdownMenuLabel>
              <DropdownMenuItem onClick={toAdmin} className="gap-2 py-1.5">
                <SpLogo className="size-6 rounded-[5px] text-[9px]" />
                <span>SP Vending (admin)</span>
                {isAdmin && <Check className="ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
