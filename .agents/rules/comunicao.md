---
trigger: always_on
---

# 📜 Regras do Projeto CliqueZoom (FsSaaS)

Padrão obrigatório para qualquer IA ou dev que trabalhe neste projeto, garantindo consistência entre frontend, backend e infraestrutura.

> **A IA Claude (Claude Code) é a referência deste projeto.** Na dúvida, siga o `CLAUDE.md` (fonte da verdade) e o padrão dela. Toda IA deve **ler o `CLAUDE.md` na raiz ANTES de começar** qualquer tarefa — ele é mais completo e atualizado que este resumo.

## 0. Regras de Ouro (NÃO violar)
- 🚫 **Nunca commitar, dar push ou deployar sem pedido explícito do usuário.** Faça as mudanças, mostre, e **espere o "ok"**. Isso vale também para `git add`/`git reset` em massa.
- ⚠️ **Produção tem cliente real.** A fotógrafa **Flávia Cristina Pacheco** (`flavia.cristthina@gmail.com`) está ativa em produção. Máxima cautela em qualquer mudança que afete dados existentes ou fluxos ativos.
- 🔒 **Nunca hardcodar nomes de orgs/clientes.** Use variáveis de ambiente (`OWNER_SLUG`, `BASE_DOMAIN`).

## Comunicação
- Sempre responder em **Português (Brasil)**.
- Seja **didático** e **conciso**.
- Na copy do fotógrafo, **nunca** use a palavra "estúdio" — use "negócio". (Exceção: a seção "Estúdio" do site público.)

## 1. Padrões de Código e Linguagem
- **Língua:** Tudo em **Português** (mensagens, labels, comentários, nomes de variáveis de interface).
- **Frontend (Admin):** Obrigatoriamente **ES Modules** (`import`/`export`).
- **Backend (`src/`):** Obrigatoriamente **CommonJS** (`require`/`module.exports`).
- **CSS no Admin:** Use **CSS Variables** com estilos **inline** nas abas. **Evite Tailwind dentro das abas** (fica invisível no tema dark). **Nunca** use hexcodes hardcoded.
    - Tokens canônicos (fonte): `--ad-bg-base`, `--ad-bg-surface`, `--ad-text`, `--ad-accent` (documentados no `CLAUDE.md`).
    - Os aliases curtos `--bg-base`, `--bg-surface`, `--text`, `--accent` são **válidos** (mapeados no `admin/index.html` para os `--ad-*`) e são a forma mais usada no código.
    - **Regra prática:** espelhe a convenção do arquivo que você está editando; não misture as duas no mesmo trecho.

## 🎨 Design System (OBRIGATÓRIO — é onde as IAs mais erram)
> **Não há exceção.** Vale para o **CliqueZoom (admin)** E o **Rhyno System** (ERP avulso e embarcado no iframe da aba Gestão). Detalhes completos, exemplos de CSS e a versão Tailwind do Rhyno estão em **`skills/1_7_design_system_morph_e_fontes.md`** — **leia esse doc ANTES de mexer em qualquer UI.**

1. **Tudo centralizado.** Texto, títulos de página, botões, cards e células de tabela: `text-align: center` e, em flex, `justify-content/align-items: center`. Título de página/tela **nunca** alinhado à esquerda colado num ícone — sempre centralizado.
2. **Morph em TODOS os botões e dropdowns.** Formato pílula/arredondado com micro-animação suave no hover. Inclui explicitamente: botão **Voltar** (`←`), **salvar**, ícones do header, `<select>`/dropdowns e **switches/toggles**.
    - **Ação primária** (ex: "Nova Sessão"): label **sempre visível** no formato pílula (não colapsa em círculo).
    - **Utilitário/secundário** (header, toolbar): pode iniciar como **círculo** e revelar a label no hover.
3. **Monocromático por padrão.** Botões, ícones, chips, filtros e controles usam **só** tokens neutros do tema (`--text-primary`, `--bg-hover`, etc.). **Proibida** cor decorativa (azul, verde, amarelo, vermelho) como enfeite. Chip/filtro ativo = borda `var(--text-primary)` + fundo `var(--bg-hover)` + texto brilhante — **nunca** cor chamativa.
    - **Única exceção — status semântico real:** as cores de status do tema (`--ad-green`/`--ad-red`/`--ad-yellow`/`--ad-orange`) são permitidas **apenas** para comunicar estado de verdade (ex.: barras de uso verde→amarelo→vermelho, badge de reabertura, timeline de progresso, sucesso/erro/alerta). Nunca para decoração.
4. **NADA com fundo branco.** Nenhum `#fff`/`white` fixo — nem ícone, container de ícone, botão salvar, checkbox, card, input ou modal. Sempre tokens (que invertem light/dark automaticamente).
5. **Checkbox neutro.** Sem branco e **sem o azul nativo** do HTML. Fundo transparente ou `var(--bg-hover)`; marcação/borda em tom neutro (`var(--text-primary)` ou cinza).
6. **Tudo arredondado.** Cards, painéis, inputs, botões, chips e containers com cantos generosos. Inputs/textareas/selects **bem arredondados** (`border-radius: 12px`+ / `rounded-2xl`). Sem cantos retos agressivos.
7. **Fonte única: Inter.** Todo o admin usa Inter (`font-family: inherit`). Serifada (Playfair) **só** no site público do fotógrafo; monoespaçada só em logs/tokens/código.
8. **Sem emojis na UI.** Toda iconografia em **SVG Lucide** (estilo linha, moderno), herdando `currentColor`, **nunca** com fundo branco.
9. **Contraste no dark.** Componente com fundo `var(--accent)` deve usar `var(--accent-on)` no texto/ícone — **nunca** `#fff`/`white` fixo.

> **Rhyno (React + Tailwind):** as mesmas 9 regras, traduzidas — `rounded-2xl` nos campos, `bg-transparent` em containers de ícone, **sem** `bg-white`/`text-white`, morph com `hover:w-[...]`. Ajustes de identidade do **iframe embed** só em `ERP1/frontend/src/embed-theme.css` e `embedMode.ts` — **nunca** nos componentes individuais do ERP.

## 2. Padrão "Auto-Save" e Reatividade (UX)
- **Estado Global:** O objeto `appData` (ou `_modulo` local) é a fonte da verdade.
- **Input Direto:** Use `oninput` (texto/sliders) ou `onchange` (checkbox) diretamente no HTML para disparar mudanças.
- **Sem Botão "Salvar":** Chame a função de persistência imediatamente após a alteração.
- **Preview Instantâneo:** `updatePreview()` (ou `window._meuSitePostPreview`) deve ser chamada sem debounce para refletir mudanças no iframe do site em tempo real.
- **Roteamento de Dados:**
    - **Dados do Site Público:** `apiPut('/api/site/admin/config', { siteContent: { chave: valor } })`.
    - **Dados Internos/Legado:** `saveAppData(secao, dados)` → aponta para `/api/site-data`.

## 3. Padrão de Upload e Mídia
- **Compressão:** Imagens comprimidas via Canvas antes do upload.
- **Fluxo XHR:** Use `uploadImage` com `XMLHttpRequest` para monitorar progresso real.
- **Resposta do servidor:** sucesso = **`{ success: true, url: "..." }`**; erro = `{ success: false, error: "..." }`. (Não é `ok: true`.)
- **Abstração de Storage:** Sempre use `src/services/storage.js` no backend para salvar/deletar arquivos.
- **Diretório:** Uploads locais em `/uploads/`. **Nunca** use Cloudinary/S3 a menos que explicitamente solicitado (migração futura).

## 4. Banco de Dados (MongoDB)
- **Instância:** Produção usa `cliquezoom`; **dev local** usa `cliquezoom-dev`. **NUNCA** use `fsfotografias` (nome legado pré-rebrand).
- **Performance:** Use `.lean()` em todas as queries de leitura.
- **Multi-tenant:** Sempre inclua `organizationId` em novos modelos e **filtre todas as rotas por ele**.
- **Evite "Mixed Types":** Ao atualizar campos aninhados (ex: `siteContent.portfolio`), substitua o **objeto pai inteiro** em vez de usar dot notation profunda (evita "Cannot create field in element").

## 5. UI Components (Admin)
- **Notificações:** `window.showToast(msg, type)`.
- **Confirmações:** `window.showConfirm(msg, opts)`.
- 🚫 **Proibido** usar `alert()` / `confirm()` nativos.
- **Ícones:** biblioteca **Lucide Icons** (não usar emojis como ícone de UI quando houver Lucide equivalente).

## 6. Deploy e VPS *(executar SOMENTE quando o usuário pedir — ver Regra de Ouro)*
- **Build de CSS:** Se houver novas classes Tailwind, rode `npm run build:css` localmente **antes** do commit.
- **Commit:** Padrão `feat: descrição` ou `fix: descrição`.
- **Comandos VPS** (app PM2 `cliquezoom-saas`, em `/var/www/cz-saas`):
    1. `git pull`
    2. `pm2 reload ecosystem.config.js --env production --update-env`
- **Logs:** `pm2 logs cliquezoom-saas --lines 20`
- **Proibido:** alterar Nginx/porta, mexer em `crm-backend` ou `vps-hub` sem autorização.

## 7. Performance e Boas Práticas (Backend)
- **Async I/O:** Use apenas `fs.promises` (async). **Nunca** versões `Sync` (ex: `readFileSync`).
- **Logs:** Use `req.logger.info()` / `req.logger.error()`. 🚫 **Nunca** `console.log`.
- **Require no topo:** Todos os `require()` no topo do arquivo; nunca dentro de handlers de rota.
- **Parallel Loading:** No login (`postLoginSetup`), dispare as APIs em paralelo com `Promise.all()`.

---

### ⚠️ Lembrete de Arquitetura
O CliqueZoom é um **Monólito Saudável** (3-Tier). Mantenha a lógica de cada "Aba" do admin em seu próprio arquivo dentro de `admin/js/tabs/` (arquivo único se < 600 linhas; pasta `tabs/X/` se maior). Detalhes completos no `CLAUDE.md`.
