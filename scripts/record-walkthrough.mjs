import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const baseUrl = process.env.KAMAI_URL ?? 'http://127.0.0.1:4317'
const outDir = 'recordings'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 860 },
  colorScheme: 'light',
  recordVideo: { dir: outDir, size: { width: 1280, height: 860 } },
})
const page = await context.newPage()

await page.addInitScript(() => {
  const paint = () => {
    if (document.getElementById('pw-cursor')) return
    const style = document.createElement('style')
    style.textContent =
      '#pw-cursor{position:fixed;z-index:2147483647;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:2px solid #8c3012;background:rgba(140,48,18,.28);pointer-events:none;left:40px;top:40px}'
    const dot = document.createElement('div')
    dot.id = 'pw-cursor'
    document.documentElement.append(style, dot)
    document.addEventListener('mousemove', (event) => {
      dot.style.left = `${event.clientX}px`
      dot.style.top = `${event.clientY}px`
    })
  }
  paint()
  document.addEventListener('DOMContentLoaded', paint)
})

const pause = (ms) => page.waitForTimeout(ms)

async function press(locator, hold = 1300) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + Math.min(24, box.height / 2), { steps: 16 })
    await pause(220)
  }
  await locator.click()
  await pause(hold)
}

await page.goto(baseUrl)
await page.evaluate(() => localStorage.clear())
await page.goto(baseUrl)
await page.getByRole('heading', { name: 'Your earnings are real.' }).waitFor()
await pause(1600)

await press(page.getByRole('button', { name: 'Get started' }), 1500)
await press(page.getByRole('button', { name: /English/ }), 1400)
await press(page.getByRole('button', { name: /Two-wheeler or EV loan/ }), 1400)
await press(page.getByRole('button', { name: 'Continue' }), 1600)
await press(page.getByRole('button', { name: 'Approve with OTP' }), 1200)

for (let index = 0; index < 6; index += 1) {
  const box = page.getByLabel(`Digit ${index + 1}`)
  await box.scrollIntoViewIfNeeded()
  const bounds = await box.boundingBox()
  if (bounds) await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 8 })
  await box.fill('481063'[index])
  await pause(160)
}
await pause(700)
await press(page.getByRole('button', { name: 'Confirm consent' }), 1400)
await press(page.getByRole('button', { name: 'Show payouts' }), 900)

await page.mouse.wheel(0, 280)
await pause(1600)
await press(page.getByRole('button', { name: /Tag unmatched/ }), 1500)
await press(page.getByRole('button', { name: 'Save as self-reported' }), 1500)
await page.mouse.wheel(0, -200)
await pause(800)
await press(page.getByRole('button', { name: 'Looks right' }), 2200)
await press(page.getByRole('button', { name: 'Share with lender or landlord' }), 1800)
await press(page.getByRole('button', { name: 'Create share link' }), 2200)
await press(page.getByRole('button', { name: 'Preview verifier view' }), 1200)

await page.mouse.move(640, 430, { steps: 12 })
await page.mouse.wheel(0, 520)
await pause(2200)

await page.goBack()
await page.getByRole('heading', { name: 'Ready to share' }).waitFor()
await pause(800)
await press(page.getByRole('button', { name: 'See who opened it' }), 1800)
await press(page.getByRole('button', { name: 'Open Settings' }), 2000)

const video = page.video()
await page.close()
if (video) await video.saveAs(`${outDir}/kamai-passport-walkthrough.webm`)
await context.close()
await browser.close()
console.log(`${outDir}/kamai-passport-walkthrough.webm`)
