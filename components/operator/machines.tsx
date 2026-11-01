"use client"

import { Page, PageHeader, Chip, Dot, Meter } from "@/components/sp/ui"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { money, pct } from "@/lib/format"
import { orgStats } from "@/lib/health"
import { useOperatorOrg } from "@/lib/store"

export function MachinesPage() {
  const org = useOperatorOrg()
  const st = orgStats(org)
  return (
    <Page>
      <PageHeader title="Machines" meta={<Chip className="num">{st.online}/{st.machines} online</Chip>} />
      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#fbfaf7] hover:bg-[#fbfaf7]">
              <TableHead className="pl-4">Machine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last sale</TableHead>
              <TableHead className="w-48">Fill</TableHead>
              <TableHead className="text-right">Low</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Today</TableHead>
              <TableHead className="pr-4 text-right">7 days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {org.machines.map((m) => {
              const fill = 1 - (m.lanesEmpty + m.lanesLow * 0.5) / m.lanesTotal
              return (
                <TableRow key={m.id}>
                  <TableCell className="pl-4">
                    <div className="font-medium">{m.venue}</div>
                    <div className="num text-[11px] text-muted-foreground">{m.id}</div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <Dot tone={m.status === "online" ? (m.fault ? "warn" : "ok") : "bad"} />
                      {m.status === "online" ? (m.fault ? `Lane ${m.fault.lane} fault` : "Online") : `Offline ${m.offlineHours}h`}
                    </span>
                  </TableCell>
                  <TableCell className="num">{m.lastSaleHoursAgo < 1 ? `${Math.round(m.lastSaleHoursAgo * 60)}m ago` : `${Math.round(m.lastSaleHoursAgo)}h ago`}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Meter value={fill} tone={fill < 0.75 ? "warn" : "ok"} className="w-24" />
                      <span className="num text-[12px] text-muted-foreground">{pct(fill)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="num text-right">{m.lanesLow}</TableCell>
                  <TableCell className="num text-right">{m.lanesEmpty}</TableCell>
                  <TableCell className="num text-right">{money(m.revenueToday)}</TableCell>
                  <TableCell className="num pr-4 text-right">{money(m.revenueWeek)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Page>
  )
}
