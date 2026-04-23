---
trigger: always_on
---

## Comunicao

- Sempre falar em portugues Brasil
- Seja Didatico
- Seja Conciso


Viewed CLAUDE.md:1-378

Aqui está a definição das regras do seu projeto, integrando os padrões de **Auto-Save/Upload** que você gosta com as **restrições técnicas críticas** do seu arquivo `CLAUDE.md`.

Pode usar este conteúdo para configurar seu assistente ou salvar como um guia de referência (`.cursorrules` ou similar).

---

# 📜 Regras de Desenvolvimento: Projeto CliqueZoom (FsSaaS)

Este documento define o padrão obrigatório para qualquer implementação no projeto, garantindo consistência entre frontend, backend e infraestrutura.

## 1. Padrões de Código e Linguagem
- **Língua:** Tudo deve ser em **Português** (mensagens, labels, comentários, nomes de variáveis de interface).
- **Frontend (Admin):** Use obrigatoriamente **ES Modules** (`import`/`export`).
- **Backend (`src/`):** Use obrigatoriamente **CommonJS** (`require`/`module.exports`).
- **CSS no Admin:** Use **CSS Variables** (`var(--bg-surface)`, etc.) com estilos inline para componentes de abas. **Evite Tailwind dentro das abas** para garantir compatibilidade com o tema dark.

## 2. Padrão "Auto-Save" e Reatividade (UX)
- **Estado Global:** O objeto `appData` (ou `_modulo` local) é a fonte da verdade.
- **Input Direto:** Use `oninput` (texto/sliders) ou `onchange` (checkbox) diretamente no HTML para disparar mudanças.
- **Sem Botão "Salvar":** Chame a função de persistência imediatamente após a alteração.
- **Preview Instantâneo:** A função `updatePreview()` (ou `window._meuSitePostPreview`) deve ser chamada sem debounce para refletir mudanças no iframe do site em tempo real.
- **Roteamento de Dados:**
    - **Dados do Site Público:** Use `apiPut('/api/site/admin/config', { siteContent: { chave: valor } })`.
    - **Dados Internos/Legado:** Use `saveAppData(secao, dados)` que aponta para `/api/site-data`.

## 3. Padrão de Upload e Mídia
- **Compressão:** Imagens devem ser comprimidas via Canvas antes do upload.
- **Fluxo XHR:** Use `uploadImage` com `XMLHttpRequest` para monitorar progresso real.
- **Resposta Esperada:** O servidor deve retornar `{ ok: true, url: "..." }`.
- **Abstração de Storage:** Use sempre `src/services/storage.js` no backend para salvar/deletar arquivos.
- **Diretório:** Uploads locais em `/uploads/`. **Nunca** use Cloudinary/S3 a menos que explicitamente solicitado (estratégia de migração futura).

## 4. Banco de Dados (MongoDB)
- **Instância:** O banco correto é `cliquezoom`. **NUNCA** use `fsfotografias`.
- **Performance:** Use `.lean()` em todas as queries de leitura.
- **Segurança de Schema:** Sempre inclua `organizationId` em novos modelos e filtre todas as rotas por ele.
- **Evite Erros de Mixed Types:** Ao atualizar campos aninhados (ex: `siteContent.portfolio`), substitua o objeto pai inteiro em vez de usar dot notation profunda para evitar erros de "Cannot create field in element".

## 5. UI Components (Admin)
- **Notificações:** Use `window.showToast(msg, type)`.
- **Confirmações:** Use `window.showConfirm(msg, opts)`.
- **Ícones:** Use a biblioteca **Lucide Icons**.

## 6. Fluxo de Deploy e VPS
- **Build de CSS:** Execute `npm run build:css` localmente se houver novas classes Tailwind antes de qualquer commit.
- **Commit:** Use o padrão `feat: descrição` ou `fix: descrição`.
- **Comandos VPS:**
    1. `git pull`
    2. `pm2 reload ecosystem.config.js --env production` (IDs 0/1 no cluster).
- **Logs:** Verifique logs com `pm2 logs cliquezoom-saas --lines 30`.

## 7. Performance e Boas Práticas
- **Async I/O:** No backend, use apenas `fs.promises` (async). **Nunca** use versões `Sync` (ex: `readFileSync`).
- **Parallel Loading:** No login (`postLoginSetup`), dispare as APIs em paralelo com `Promise.all()`.
- **Require:** Mova todos os `require()` para o topo do arquivo; nunca os use dentro de handlers de rota.

---

### ⚠️ Lembrete de Arquitetura
O CliqueZoom é um **Monólito Saudável** (3-Tier). Mantenha a separação clara entre a lógica de cada "Aba" do admin em seu próprio arquivo dentro de `admin/js/tabs/`.