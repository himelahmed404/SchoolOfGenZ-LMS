import { defineConfig } from '@playwright/test';

/**
 * Whole journeys through both apps: the LMS on :3000 and the API on :4000.
 * `npm run test:e2e` starts whichever is not already running, and uses the Chrome installed on this machine.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  // One at a time: the tests share the demo accounts, and signing in as one ends its session in another test.
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev:api', url: 'http://localhost:4000/v1/health', reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run dev:web', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
  ],
});
