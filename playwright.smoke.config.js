// Smoke test — checks read-only que podem rodar contra PRODUÇÃO sem criar dados.
// Padrão: produção. Para rodar local: SMOKE_BASE_URL=http://localhost:3051 npm run test:smoke
const base = require('./playwright.config.js');

module.exports = {
  ...base,
  testDir: './tests/smoke',
  testIgnore: undefined,
  reporter: 'list',
  use: {
    ...base.use,
    baseURL: process.env.SMOKE_BASE_URL || 'https://www.cliquezoom.com.br',
    headless: true,
    screenshot: 'only-on-failure',
  },
};
