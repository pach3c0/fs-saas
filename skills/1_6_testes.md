# Skill: Qualidade e Testes (QA)

> Leia esta skill para aprender a criar, organizar e executar testes automatizados no CliqueZoom. Utilizamos o **Playwright** como motor principal.

---

## ESTRUTURA DE PASTAS

Todos os arquivos de teste devem ser salvos diretamente na pasta:
📂 **`/tests`**

Os arquivos devem terminar obrigatoriamente com **`.spec.js`** para que o robô consiga encontrá-los (ex: `landing-page.spec.js`, `login.spec.js`).

---

## COMO EXECUTAR

### 1. No Terminal (Modo Headless)
Ideal para CI/CD ou execuções rápidas:
```bash
npm test
```

### 2. No Terminal (Vendo o Navegador)
Ideal para debugar visualmente:
```bash
npx playwright test --headed
```

### 3. Modo UI (Interface Profissional)
A melhor forma de desenvolver novos testes:
```bash
npx playwright test --ui


npx playwright test tests/landing-page.spec.js --headed
```




---

## PADRÕES DE ESCRITA (Best Practices)

### 1. Isole os Testes
Sempre use dados aleatórios ou timestamps para evitar que um teste falhe porque um e-mail ou slug já foi cadastrado por um teste anterior, mais se necessario so pedir para o Pacheco - Desenvolvedor da Plataforma limpar o banco de dados.
```javascript
const uniqueId = Date.now();
const testEmail = `user-${uniqueId}@example.com`;
```

### 2. Use Seletores Estáveis
Evite selecionar por classes CSS que mudam (ex: `.btn-blue`). Prefira IDs ou atributos específicos.
- **Bom:** `page.locator('#submitBtn')`
- **Ruim:** `page.locator('.bg-blue-500.rounded')`

### 3. Limpeza de Dados
Ao criar testes que poluem o banco de produção, tente adicionar um passo de limpeza ou use slugs que identifiquem claramente que é um dado de teste (ex: `test-auto-xxxx`).

---

## EXEMPLO DE TESTE (Landing Page)

Local: `tests/landing-page.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test('Nome do Teste', async ({ page }) => {
  await page.goto('/');
  // Ações...
  await expect(page.locator('#ID')).toBeVisible();
});
```
