import { cn } from "@/lib/utils"
import { initials } from "@/lib/format"

export function SpLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-ink text-[12px] font-bold tracking-tight text-white",
        className
      )}
    >
      SP
    </div>
  )
}

export function OrgTile({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[7px] border border-hairline bg-[#efe9dd] text-[11px] font-semibold text-[#5b4a33]",
        className
      )}
    >
      {initials(name)}
    </div>
  )
}

export function PersonAvatar({ name, sp, className }: { name: string; sp?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        sp ? "bg-ink text-white" : "bg-copper-tint text-[#8a4913]",
        className
      )}
    >
      {initials(name)}
    </div>
  )
}
