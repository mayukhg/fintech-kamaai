import { expect, type Locator, type Page } from '@playwright/test'

export async function fillOtp(page: Page, code: string) {
  for (let index = 0; index < code.length; index += 1) {
    await page.getByLabel(`Digit ${index + 1}`).fill(code[index]!)
  }
}

export async function chooseEnglishLoan(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: /English/ }).click()
  await page.getByRole('button', { name: /Two-wheeler or EV loan/ }).click()
}

export async function consentAndRead(page: Page, bank: RegExp) {
  await page.getByRole('radio', { name: bank }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Approve with OTP' }).click()
  await fillOtp(page, '481063')
  await page.getByRole('button', { name: 'Confirm consent' }).click()
  await page.getByRole('button', { name: 'Show payouts' }).click()
}

export async function buildPassport(page: Page) {
  await chooseEnglishLoan(page)
  await consentAndRead(page, /SBI/)
  await page.getByRole('button', { name: 'Looks right' }).click()
}

function channel(value: number) {
  const scaled = value / 255
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4
}

function luminance(rgb: [number, number, number]) {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
}

export function contrastRatio(foreground: string, background: string) {
  const parse = (input: string): [number, number, number] => {
    const match = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!match) throw new Error(`Unparsed color ${input}`)
    return [Number(match[1]), Number(match[2]), Number(match[3])]
  }
  const first = luminance(parse(foreground))
  const second = luminance(parse(background))
  const [hi, lo] = first > second ? [first, second] : [second, first]
  return (hi + 0.05) / (lo + 0.05)
}

async function paint(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    let background = style.backgroundColor
    let node: Element | null = element
    while (node && (background === 'rgba(0, 0, 0, 0)' || background === 'transparent')) {
      node = node.parentElement
      if (node) background = getComputedStyle(node).backgroundColor
    }
    return { color: style.color, background }
  })
}

export async function expectNoHorizontalOverflow(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(extra).toBeLessThanOrEqual(1)
}

export async function expectTapTargets(page: Page) {
  const boxes = await page.locator('button, label.choice, label.check-row, .otp-box, select').evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect()
      const label = (element.getAttribute('aria-label') || element.textContent || element.tagName).replace(/\s+/g, ' ').trim()
      return { width: rect.width, height: rect.height, label: label.slice(0, 80) }
    }),
  )
  expect(boxes.length).toBeGreaterThan(0)
  for (const box of boxes) {
    expect(box.height, box.label).toBeGreaterThanOrEqual(44)
    expect(box.width, box.label).toBeGreaterThanOrEqual(44)
  }
}

export async function expectReadable(page: Page) {
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toBeVisible()
  const headingPaint = await paint(heading)
  expect(contrastRatio(headingPaint.color, headingPaint.background)).toBeGreaterThanOrEqual(4.5)
  const action = page.locator('.cta').first()
  if (await action.count()) {
    const actionPaint = await paint(action)
    expect(contrastRatio(actionPaint.color, actionPaint.background)).toBeGreaterThanOrEqual(4.5)
  }
  const hint = page.locator('.hint').first()
  if ((await hint.count()) && (await hint.isVisible())) {
    const hintPaint = await paint(hint)
    expect(contrastRatio(hintPaint.color, hintPaint.background)).toBeGreaterThanOrEqual(4.5)
  }
}

export async function expectUsable(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined)))),
  )
  await expectNoHorizontalOverflow(page)
  await expectTapTargets(page)
  await expectReadable(page)
}
