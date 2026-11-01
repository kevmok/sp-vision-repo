// Usage: node scripts/screenshots.mjs [baseUrl] [name-filter]
import { chromium } from "playwright"
import path from "node:path"

const base = process.argv[2] ?? "http://localhost:3311"
const only = process.argv[3]

const waitAnswers = async (page, n) => {
  await page.waitForFunction((k) => document.querySelectorAll('[data-testid="ask-visual"]').length >= k, n, { timeout: 15000 })
  await page.waitForTimeout(500)
}
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
  { name: "08-analytics", url: "/analytics/?org=pinewood&scope=all" },
  {
    name: "09-analytics-drawer",
    url: "/analytics/?org=pinewood&scope=all",
    viewportOnly: true,
    before: async (page) => {
      await page.locator('[data-testid="chain-card"]').first().focus()
      await page.keyboard.press("Enter")
      await page.waitForSelector('[data-testid="analytics-drawer"]')
      await page.waitForTimeout(600)
    },
  },
  {
    name: "10-ask-chat",
    url: "/ask/?org=pinewood",
    before: async (page) => {
      await page.getByRole("button", { name: "Which lanes are out of stock right now, by venue?" }).click()
      await waitAnswers(page, 1)
      await page.getByRole("button", { name: "SQL" }).first().click()
      await page.getByPlaceholder(/Ask about sales/).fill("Weekly revenue by chain since August")
      await page.keyboard.press("Enter")
      await waitAnswers(page, 2)
    },
  },
  {
    name: "11-ask-sheet",
    url: "/?org=northline",
    viewportOnly: true,
    before: async (page) => {
      await page.getByRole("button", { name: "Ask", exact: true }).click()
      await page.getByRole("button", { name: "Compare Pokémon vs One Piece revenue by month" }).click()
      await waitAnswers(page, 1)
    },
  },
  {
    name: "12-bank-connect",
    url: "/money/bank/?org=northline",
    viewportOnly: true,
    before: async (page) => {
      await page.getByRole("button", { name: "Connect a bank" }).first().click()
      await page.getByRole("button", { name: "Continue" }).click()
      await page.getByRole("button", { name: "Harborline Bank" }).click()
      await page.getByRole("button", { name: "Sign in" }).click()
      await page.getByText("Choose accounts").waitFor()
      await page.waitForTimeout(700)
    },
  },
  { name: "13-bank-inbox", url: "/money/bank/?org=northline" },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errors = []
page.on("console", (m) => m.type() === "error" && errors.push(`${page.url()}: ${m.text()}`))
page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`))

for (const s of shots.filter((x) => !only || x.name.includes(only))) {
  await page.goto(base + s.url, { waitUntil: "networkidle" })
  await page.waitForTimeout(400)
  // Grow the viewport to the document height so fixed, full-height chrome (sidebar) spans the whole capture.
  const h = s.viewportOnly ? 900 : await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ width: 1440, height: Math.max(900, h) })
  await page.waitForTimeout(200)
  if (s.before) await s.before(page)
  await page.mouse.move(2, 2)
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(out, `${s.name}.png`), fullPage: !s.viewportOnly })
  await page.setViewportSize({ width: 1440, height: 900 })
  console.log("saved", s.name)
}
await browser.close()
if (errors.length) {
  console.log("\nConsole errors:")
  for (const e of errors) console.log(" -", e)
}
