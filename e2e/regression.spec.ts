import { expect, test } from '@playwright/test'
import { buildPassport, chooseEnglishLoan, consentAndRead, expectUsable, fillOtp } from './helpers'

test('english flow stays readable and tappable at 360px', async ({ page }) => {
  await page.goto('/')
  await expectUsable(page)
  await page.getByRole('button', { name: 'Get started' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: /English/ }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: /Two-wheeler or EV loan/ }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Approve with OTP' }).click()
  await expectUsable(page)
  await fillOtp(page, '481063')
  await page.getByRole('button', { name: 'Confirm consent' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Show payouts' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Looks right' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Share with lender or landlord' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Create share link' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'Preview verifier view' }).click()
  await expectUsable(page)
  await expect(page.getByRole('table')).toBeVisible()
})

test('hindi copy does not overflow the worker flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: /हिंदी/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expect(page.getByRole('heading', { name: 'आपको प्रमाण क्यों चाहिए?' })).toBeVisible()
  await expectUsable(page)
  await page.getByRole('button', { name: /दोपहिया या ईवी ऋण/ }).click()
  await page.getByRole('button', { name: 'आगे बढ़ें' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'ओटीपी से मंज़ूरी दें' }).click()
  await fillOtp(page, '481063')
  await page.getByRole('button', { name: 'सहमति की पुष्टि करें' }).click()
  await page.getByRole('button', { name: 'भुगतान दिखाएँ' }).click()
  await expectUsable(page)
  await page.getByRole('button', { name: 'ठीक है' }).click()
  await expect(page.getByRole('heading', { name: 'आपका पासपोर्ट' })).toBeVisible()
  await expect(page.getByText(/26,800/)).toBeVisible()
  await expectUsable(page)
})

test('marathi is available from the language step', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: /मराठी/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'mr')
  await expect(page.getByRole('heading', { name: 'तुम्हाला पुरावा कशासाठी हवा आहे?' })).toBeVisible()
  await expectUsable(page)
})

test('keyboard focus is visible on the first action', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const focused = await page.evaluate(() => ({
    text: document.activeElement?.textContent?.trim() ?? '',
    outline: getComputedStyle(document.activeElement as Element).outlineStyle,
  }))
  expect(focused.text).toMatch(/Get started/)
  expect(focused.outline).not.toBe('none')
})

test('back returns to the previous step', async ({ page }) => {
  await chooseEnglishLoan(page)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: 'Why do you need proof?' })).toBeVisible()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: 'Choose your language' })).toBeVisible()
})

test('settings language change updates the screen', async ({ page }) => {
  await buildPassport(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await expectUsable(page)
  await page.getByLabel('Language').selectOption('hi')
  await expect(page.getByRole('heading', { name: 'सेटिंग्स' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi')
  await expectUsable(page)
})

test('verifier report fits a desktop window', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await buildPassport(page)
  await page.getByRole('button', { name: 'Share with lender or landlord' }).click()
  await page.getByRole('button', { name: 'Create share link' }).click()
  await page.getByRole('button', { name: 'Preview verifier view' }).click()
  await expectUsable(page)
  const boxes = await page.locator('.report-stats .stat').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return { x: rect.x, width: rect.width }
    }),
  )
  expect(boxes).toHaveLength(3)
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x + 1)
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x + 1)
})
