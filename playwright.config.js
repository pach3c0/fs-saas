const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3051',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  /* Inicia o servidor local antes de rodar os testes */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3051',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
