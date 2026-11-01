// Clicks through the main interactions against a running server. Usage: node scripts/smoke.mjs [baseUrl]
import { chromium } from "playwright"

const base = process.argv[2] ?? "http://localhost:3311"
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on("pageerror", (e) => errors.push(e.message))
page.on("console", (m) => m.type() === "error" && errors.push(m.text()))
const ok = (label, cond) => console.log(`${cond ? "PASS" : "FAIL"}  ${label}`)

await page.goto(base + "/?org=northline", { waitUntil: "networkidle" })
ok("incomplete org shows setup checklist", await page.getByText("Pilot setup").isVisible())
await page.getByRole("button", { name: "Restocked" }).first().click()
ok("restock marks done", await page.getByRole("button", { name: "Undo" }).first().isVisible())

// Org switcher -> complete org
await page.getByText("Northline Vending").first().click()
await page.getByRole("menuitem", { name: "Bayou Snack Co" }).click()
await page.waitForTimeout(300)
ok("switch to Bayou hides checklist", !(await page.getByText("Pilot setup").isVisible()))

// Operator support: send message, start call, react
await page.getByRole("link", { name: "Support" }).click()
await page.waitForURL("**/support{,/}")
await page.getByPlaceholder("Message SP Vending").fill("Machine at Pelican Bowl is offline since noon")
await page.getByRole("button", { name: "Send" }).click()
ok("operator message sent", await page.getByText("Machine at Pelican Bowl is offline since noon").isVisible())
await page.getByRole("button", { name: "Start a call" }).click()
ok("Teams card inserted", (await page.getByText("Teams meeting").count()) > 0)

// Palette -> admin
await page.keyboard.press("Meta+k")
await page.getByPlaceholder("Jump to a product, page or operator").fill("admin")
await page.keyboard.press("Enter")
await page.waitForURL("**/admin/health{,/}")
ok("palette switches to admin health", /\/admin\/health\/?$/.test(page.url()))
await page.getByRole("button", { name: /^Red/ }).first().click()
ok("band filter shows 2 rows", (await page.locator("tbody tr").count()) === 2)
await page.locator("tbody tr").first().click()
await page.waitForURL(/\/admin\/health\/[a-z-]+\/?$/)
await page.getByRole("button", { name: "Mark done" }).first().waitFor()
const before = await page.getByRole("button", { name: "Mark done" }).count()
await page.getByRole("button", { name: "Mark done" }).first().click()
ok("mark done", (await page.getByRole("button", { name: "Mark done" }).count()) === before - 1)

// Inbox: new Bayou message triaged, accept ticket
// Client-side navigation keeps in-memory state, so the operator's message above is in the inbox.
await page.getByRole("link", { name: "Support inbox" }).click()
await page.waitForURL("**/admin/inbox{,/}")
await page.getByRole("button", { name: /Bayou Snack Co/ }).click()
ok("operator message reached SP inbox", await page.getByText("Machine at Pelican Bowl is offline since noon", { exact: true }).first().isVisible())
await page.waitForTimeout(1600)
ok("agent proposed Machine offline", await page.getByRole("combobox").first().innerText().then((t) => t.includes("Machine offline")))
await page.getByRole("button", { name: "Create ticket" }).click()
ok("ticket created from triage", (await page.getByText(/T-1047/).count()) > 0)
await page.getByPlaceholder("Message Bayou Snack Co").fill("On it, Alex is checking the A2 motor now.")
await page.getByRole("button", { name: "Send" }).click()
ok("SP reply sent", await page.getByText("On it, Alex is checking the A2 motor now.", { exact: true }).isVisible())
await page.getByRole("button", { name: /Harborview/ }).click()
ok("not-a-ticket shown in history", (await page.getByText("Not a ticket").count()) > 0)

// Analytics: chain card opens the drawer
await page.goto(base + "/analytics/?org=pinewood&scope=all", { waitUntil: "networkidle" })
await page.locator('[data-testid="chain-card"]').first().click()
ok("analytics drawer opens", await page.locator('[data-testid="analytics-drawer"]').isVisible())
await page.keyboard.press("Escape")

// Ask: example question returns a rendered chart
await page.goto(base + "/ask/?org=pinewood", { waitUntil: "networkidle" })
await page.getByRole("button", { name: "Weekly revenue by chain since August" }).click()
await page.waitForSelector('[data-testid="ask-visual"]', { timeout: 15000 })
ok("ask returns a chart", (await page.locator('[data-testid="ask-visual"][data-kind="stacked"] svg .recharts-bar-rectangle').count()) > 0)

// Bank sync: accept a transaction, then create a rule
await page.goto(base + "/money/bank/?org=northline", { waitUntil: "networkidle" })
const rows0 = await page.locator('[data-testid="txn-row"]').count()
await page.locator('[data-testid="txn-row"]').first().getByRole("button", { name: /^(Accept|Confirm)$/ }).click()
ok("bank transaction accepted", (await page.locator('[data-testid="txn-row"]').count()) === rows0 - 1)
const rules0 = Number((await page.getByRole("tab", { name: /Rules/ }).innerText()).replace(/\D/g, ""))
await page.locator('[data-testid="txn-row"]').first().getByRole("button", { name: "More" }).click()
await page.getByRole("menuitem", { name: /Always do this/ }).click()
await page.getByRole("tab", { name: /Rules/ }).click()
ok("rule created", (await page.locator('[data-testid="rules"] li').count()) === rules0 + 1)

console.log(errors.length ? `\nErrors:\n${errors.join("\n")}` : "\nNo console errors")
await browser.close()
