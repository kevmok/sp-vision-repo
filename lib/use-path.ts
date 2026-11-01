"use client"

import { usePathname } from "next/navigation"

/** Pathname without the trailing slash the static export adds. */
export function usePath() {
  const p = usePathname() ?? "/"
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p
}
