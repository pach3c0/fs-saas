# Frontend — Padrões e Referências (CliqueZoom Admin)

> Leia esta skill quando for alterar UI, CSS, componentes ou fluxo do usuário no admin.

---

## STACK

- **Framework:** Vanilla JS (ES Modules — `import/export`)
- **CSS:** CSS Variables puro (Nunca Tailwind nas tabs — fica invisível no tema dark)
- **Build:** Tailwind apenas para `home/`, `cliente/`, `album/` (via `npm run build:css`)
- **Módulos:** ES Modules em `admin/`, CommonJS em `src/`

---

## ESTRUTURA DE ARQUIVOS

```
admin/
  index.html        # Shell + login + sidebar + CSS variables :root
  js/
    app.js          # switchTab(), TAB_TITLES, carregamento dinâmico de tabs
    state.js        # appState, loadAppData(), saveAppData() — dados SiteData (legado)
    tabs/           # arquivo único por aba (renderX) OU pasta X/ com index.js + sub-módulos
                  # Tabs grandes (>600 linhas) usam pasta: sessoes/ já modularizada
    utils/
      api.js        # apiGet, apiPut, apiPost, apiDelete (Bearer token automático)
      helpers.js    # resolveImagePath, generateId, formatDate, copyToClipboard, escapeHtml
      notifications.js # startNotificationPolling, toggleNotifications, markAllNotificationsRead
      toast.js      # showToast(msg, type, duration), showConfirm(msg, {title,...})
      upload.js     # compressImage, uploadImage, uploadVideo, showUploadProgress
      photoEditor.js # setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave)
      heroCanvas.js  # HeroCanvasEditor — canvas com layers drag/resize/rotate
```

---

## DESIGN SYSTEM

### CSS Variables (definidas em `admin/index.html` `:root`)
```css
--sidebar-w: 220px;
--header-h: 56px;
--bg-base: #0d1117;
--bg-surface: #161b22;
--bg-elevated: #1c2128;
--bg-hover: #21262d;
--border: #30363d;
--text-primary: #e6edf3;
--text-secondary: #8b949e;
--text-muted: #484f58;
--accent: #2f81f7;
--accent-hover: #1f6feb;
--green: #3fb950;
--red: #f85149;
--yellow: #d29922;
--purple: #bc8cff;
--orange: #ffa657;
```

### Regra de uso
- **Sempre** CSS variables para cores — nunca valores hardcoded
- **Nunca** classes Tailwind dentro de `admin/` — ficam invisíveis no tema dark
- Inline styles com CSS variables: `style="background:var(--bg-surface); color:var(--text-primary);"`

### Componentes padrão
| Componente | Como usar |
|---|---|
| Toast/notificação | `window.showToast(msg, type)` — types: `success`, `error`, `info` |
| Confirm dialog | `await window.showConfirm(msg, {title, confirmText, cancelText, danger})` |
| Upload em Massa | `import { UploadQueue } from '../utils/upload.js'` + `UploadPanel` | Fila concorrente (3), ETA, retry, cancelamento |
| Upload de imagem | `import { uploadImage, showUploadProgress } from '../utils/upload.js'` → comprime 1200px/85% |
| Upload de vídeo | `import { uploadVideo } from '../utils/upload.js'` |
| Crop de foto | `setupPhotoEditor(container, modalId, imageUrl, currentPos, onSave)` |
| Canvas editor | `new HeroCanvasEditor(container, opts)` — drag/resize/rotate/flip layers |

---

## CSS ESTRUTURAL COMPARTILHADO

- **`site/templates/shared.css`** — layout, grid, aspect-ratio, breakpoints base (portfolio, albums)
- **`assets/css/shared.css`** — compartilhado entre home, cliente, album
- **Visual (cada style.css individual):** cores, bordas, sombras, animações, transições específicas

### O que fica em shared.css
- `.portfolio-grid` — `display: grid; grid-template-columns: repeat(3, 1fr)`
- `.portfolio-item` — `aspect-ratio: 16/9; overflow: hidden`
- `.albums-grid` — `display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))`
- Breakpoints: `@media (max-width: 1024px)` e `@media (max-width: 640px)`

---

## PADRÕES DE COMPONENTE

### Novo tab
```js
// admin/js/tabs/X.js
import { apiGet, apiPut } from '../utils/api.js';

let _xItens = null; // naming: _nomeDoModulo (ex: _portfolioPhotos, _faqItems, _albums)
                   // iniciar null — carregar apenas na primeira renderização

export async function renderX(container) {
  if (_xItens === null) {
    const config = await apiGet('/api/site/admin/config');
    _xItens = config?.siteContent?.x || [];
  }
  container.innerHTML = `...`;
}
```

Registrar em `app.js`:
1. Adicionar entrada em `TAB_TITLES`
2. Adicionar botão `.nav-item[data-tab="x"]` no sidebar de `admin/index.html`

### Chamadas de API
```js
import { apiGet, apiPut, apiPost, apiDelete } from '../utils/api.js';

const data = await apiGet('/api/rota');
await apiPut('/api/rota', { campo: valor });
```

### Dados que aparecem no site público
```js
// CORRETO — salvar em Organization.siteContent
await apiPut('/api/site/admin/config', { siteContent: { chave: valor } });
const config = await apiGet('/api/site/admin/config');
const dados = config?.siteContent?.chave;

// ERRADO — saveAppData salva em SiteData (legado), site público não lê
// saveAppData('chave', valor);
```

### Silent saves
```js
// Padrão para saves automáticos (drag/drop, upload paralelo) — não polui UI com toast
async function saveX(silent = false) {
  await apiPut('/api/site/admin/config', { siteContent: { x: _xItens } });
  if (!silent) window.showToast?.('Salvo!', 'success');
  window._meuSitePostPreview?.(); // sempre atualizar preview iframe após save
}

// Uso: save explícito (botão) → saveX()
//      save automático (upload, drag) → saveX(true)
```

### Preview sync
```js
// Após qualquer alteração salva, disparar para atualizar o iframe builder em tempo real
window._meuSitePostPreview?.();
// Função definida em meu-site.js, disponível globalmente. ?. evita erro se builder não estiver aberto.
```

---

## SISTEMA DE TABS

```
switchTab(tabName) em app.js:
  1. Atualiza topbar title (TAB_TITLES[tabName])
  2. Mostra skeleton loading
  3. import(`/admin/js/tabs/${tabName}.js`)  ← sempre carrega o .js raiz
  4. Chama render${PascalCase}(container)
```

Tabs com pasta modular: `sessoes` → `tabs/sessoes.js` é proxy de 1 linha que re-exporta de `tabs/sessoes/index.js`.

Tabs ativos: `dashboard, perfil, meu-site, sessoes, clientes, albuns-prova, albuns, portfolio, estudio, faq, hero, sobre, logo, footer, integracoes, marketing, dominio, plano`

---

## RESPONSIVO (preview devices em app.js)

| Device | Viewport |
|---|---|
| Desktop | 1280×900 |
| Tablet | 768×1024 |
| Mobile | 390×844 |

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| Conteúdo invisível no admin | Classes Tailwind no tema dark | Sempre CSS variables inline |
| Dados salvos somem após reload | `saveAppData` salva em SiteData; site lê de siteContent | `apiPut('/api/site/admin/config', { siteContent: ... })` |
| Estado sobrescrito ao trocar de tab | Tab usa `appState.appData` que loadAppData() sobrescreve | Variável local `_state = null` isolada por módulo |
| Layout quebrado mobile | Regra estrutural duplicada e divergente | Centralizar em `site/templates/shared.css` |
| `await` em função não-async | renderX tornou-se async mas caller não | Fazer caller também `async` e `await renderX()` |
| Admin lento no login | `await loadAppData()` sequencial antes de tudo | `Promise.all([loadAppData(), postLoginSetup()])` |
| Ícones do admin bloqueiam render | Material Symbols sem `display=swap` | Sempre `&display=swap` + parâmetros fixos (não ranges) |
| Site público lento no primeiro acesso | `<script>` sem `defer` bloqueia parse HTML | Todo template novo deve usar `<script src="shared-site.js" defer>` |

---

## PERFORMANCE — PADRÕES OBRIGATÓRIOS (2026-04-19)

### Login paralelo (app.js)
```js
// ❌ ERRADO — serializa chamadas independentes, bloqueia ~500ms
await loadAppData();
await postLoginSetup();

// ✅ CERTO — executa em paralelo
await Promise.all([
  loadAppData(),
  postLoginSetup()  // internamente já faz Promise.all([loadOrgSlug(), loadSidebarStorage()])
]);
```

### Polling com delay
```js
// ❌ ERRADO — polling imediato concorre com carregamento do dashboard
startNotificationPolling();

// ✅ CERTO — aguarda 5s para não disputar recursos na inicialização
setTimeout(startNotificationPolling, 5000);
```

### Script dos templates do site público
```html
<!-- ❌ ERRADO — bloqueia o parser HTML até baixar e executar todo o script -->
<script src="/site/templates/shared-site.js"></script>

<!-- ✅ CERTO — download paralelo ao parse; execução após DOMContentLoaded -->
<script src="/site/templates/shared-site.js" defer></script>
```
> Todo novo template deve usar `defer`. O `shared-site.js` já usa `DOMContentLoaded` internamente — é seguro.

### Fonte Material Symbols (admin/index.html)
```html
<!-- ❌ ERRADO — baixa fonte variável inteira (~300KB) e bloqueia render -->
<link href="...Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">

<!-- ✅ CERTO — valores fixos + FILL mínimo para ícone preenchido (~80KB) + swap -->
<link href="...Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap" rel="stylesheet">
```







---

## PADRÕES DE FORMULÁRIO E UI (Fase 5 - Design System)

Com a **Fase 5** finalizada (2026-04-25), **TODOS** os forms do painel administrativo devem usar as seguintes classes globais (definidas no `<style>` do `admin/index.html`):

### Estrutura de Forms (Grid e Alinhamento)
- **`.input-group`**: Envolve `label` e `input` num layout em coluna com espaçamento correto.
- **`.form-grid-2`**: Layout em grid com 2 colunas e gap de 1rem. Usado para dividir inputs lado a lado.

```html
<div class="form-grid-2">
  <div class="input-group">
    <label>Nome do Cliente</label>
    <input type="text" class="input" placeholder="Ex: Maria">
  </div>
  <div class="input-group">
    <label>Telefone</label>
    <input type="text" class="input" placeholder="(11) 99999-9999">
  </div>
</div>
```

### Componentes de Interface
| Componente | Classe CSS | Exemplo de uso |
|---|---|---|
| **Input Texto/Senha/Email** | `.input` | `<input type="text" class="input">` |
| **Textarea** | `.input` | `<textarea class="input" rows="3"></textarea>` |
| **Select / Dropdown** | `.select` | `<select class="select"><option>...</option></select>` |
| **Checkbox customizado** | `<label class="checkbox-label"><input type="checkbox"><span></span></label>` | Usado em configurações e aceites |
| **Botão Principal (Azul)** | `.btn .btn-primary` | `<button class="btn btn-primary">Salvar</button>` |
| **Botão Secundário (Ghost)** | `.btn .btn-ghost` | `<button class="btn btn-ghost">Cancelar</button>` |
| **Botão de Perigo (Vermelho)**| `.btn .btn-danger` | `<button class="btn btn-danger">Excluir</button>` |
| **Tabela Responsiva** | `.table-container` e `.table` | Envolver a `<table class="table">` com o container |
| **Badge Genérico** | `.badge` | `<span class="badge">Novo</span>` |
| **Badge Sucesso (Verde)** | `.badge .badge-success` | `<span class="badge badge-success">Ativo</span>` |
| **Badge Perigo (Vermelho)** | `.badge .badge-danger` | `<span class="badge badge-danger">Inativo</span>` |
| **Badge Aviso (Amarelo)** | `.badge .badge-warning` | `<span class="badge badge-warning">Pendente</span>` |

> **Regra de Ouro:** Nunca adicione estilos `style="..."` em forms, buttons ou inputs a menos que seja um caso 100% isolado. Sempre use estas classes globais. Nunca use Tailwind.
