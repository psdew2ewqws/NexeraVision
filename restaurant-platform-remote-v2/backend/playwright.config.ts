import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*e2e.spec.ts',
  fullyParallel: false, // Run tests sequentially for correlation ID tracking
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for sequential execution
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/correlation-id-results.json' }]
  ],
  use: {
    baseURL: 'http://31.57.166.18:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: undefined, // Don't start servers, they're already running
});
