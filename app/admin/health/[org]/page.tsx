import { HealthDetail } from "@/components/admin/health-detail"
import { ORGS } from "@/lib/data"

export function generateStaticParams() {
  return ORGS.map((o) => ({ org: o.id }))
}

export default async function Page({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params
  return <HealthDetail orgId={org} />
}
