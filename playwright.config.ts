import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/playwright.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4317',
    trace: 'retain-on-failure',
    colorScheme: 'light',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'functional',
      testMatch: /functional\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'regression',
      testMatch: /regression\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
  ],
})
