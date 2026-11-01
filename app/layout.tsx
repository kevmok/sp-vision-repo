import type { Metadata } from "next"
import { Geist_Mono, Hanken_Grotesk } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/shell/app-shell"
import { cn } from "@/lib/utils"

const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "SP Vending",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("antialiased", sans.variable, mono.variable, "font-sans")}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
