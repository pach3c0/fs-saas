// Config para validar mudanças contra o servidor LOCAL (npm start na porta 3051),
// usando o MongoDB local. Não toca produção.
const base = require('./playwright.config.js');

module.exports = {
  ...base,
  testDir: './tests/local',
  testIgnore: undefined,
  // HTML report navegável em playwright-report-local/ (npm run test:local:report)
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-local', open: 'never' }]],
  use: {
    ...base.use,
    baseURL: 'http://localhost:3051',
    headless: true,
    screenshot: 'only-on-failure',
  },
};
