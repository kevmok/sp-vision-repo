// Usage: node scripts/screenshots.mjs [baseUrl]
import { chromium } from "playwright"
import path from "node:path"

const base = process.argv[2] ?? "http://localhost:3311"
const out = path.resolve(import.meta.dirname, "../screenshots")

const shots = [
  { name: "01-operator-home-incomplete", url: "/?org=northline" },
  { name: "02-operator-home-complete", url: "/?org=bayou" },
  { name: "03-admin-health-board", url: "/admin/health" },
  { name: "04-admin-operator-detail", url: "/admin/health/juniper" },
  { name: "05-admin-inbox-triage", url: "/admin/inbox?chat=northline" },
  { name: "06-operator-support-chat", url: "/support?org=northline" },
  {
    name: "07-command-palette",
    url: "/?org=northline",
    before: async (page) => {
      await page.keyboard.press("Meta+k")
      await page.waitForSelector("[cmdk-input]")
      await page.waitForTimeout(250)
    },
  },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: ${m.text()}`))
page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`))

for (const s of shots) {
  await page.goto(base + s.url, { waitUntil: "networkidle" })
  await page.waitForTimeout(400)
  // Grow the viewport to the document height so fixed, full-height chrome (sidebar) spans the whole capture.
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: 1440, height: Math.max(900, h) })
  await page.waitForTimeout(200)
  if (s.before) await s.before(page)
  await page.screenshot({ path: path.join(out, `${s.name}.png`), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  console.log("saved", s.name)
}
await browser.close()
if (errors.length) {
  console.log("\nConsole errors:")
  for (const e of errors) console.log(" -", e)
}
