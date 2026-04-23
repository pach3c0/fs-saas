const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'https://www.cliquezoom.com.br',
    headless: false, // Queremos ver o navegador abrindo
    screenshot: 'on',
  },
  /* Sem webServer local pois vamos testar o site ao vivo */
});
