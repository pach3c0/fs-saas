# FASE 6 - APP Foto (PWA)

## Objetivo
Transformar a galeria do cliente em um Progressive Web App (PWA) para que o cliente possa instalar no celular como um app. Inclui cache offline das fotos já carregadas.

## Contexto do Projeto

- **Stack**: Node.js + Express (CommonJS no backend), Vanilla JS puro no frontend
- **Galeria do cliente**: `cliente/index.html` + `cliente/js/gallery.js`
- **Backend**: `src/routes/sessions.js` (rotas do cliente sem autenticação)
- **Multi-tenant**: Cada sessão pertence a uma `organizationId`. O fotografo tem logo, nome e cor primária no modelo `Organization`.
- **Dados disponíveis após login**: `state.session.organization` contém `{ id, name, logo, watermark: { ... } }`
- **URL da galeria**: `/cliente/` com código de acesso no campo de texto

## O que implementar

### 1. Rota de manifest dinâmico no backend

**Arquivo**: `src/routes/sessions.js` (adicionar nova rota) ou criar `src/routes/pwa.js`

Criar rota **sem autenticação**:
```
GET /api/client/manifest/:sessionId?code=XXXX
```

Retorna um `manifest.json` dinâmico com:
```json
{
  "name": "Galeria - [Nome do Cliente]",
  "short_name": "[Nome do Fotografo]",
  "description": "Sua galeria de fotos",
  "start_url": "/cliente/?session=[sessionId]&code=[accessCode]",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#1a1a1a",
  "orientation": "portrait",
  "icons": [
    {
      "src": "[URL do logo do fotografo ou /cliente/icons/icon-192.png]",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "[URL do logo do fotografo ou /cliente/icons/icon-512.png]",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Lógica**:
- Buscar sessão no MongoDB: `Session.findById(sessionId).populate('organizationId')`
- Verificar código de acesso: `session.accessCode === code`
- Se organização tiver logo (`organization.logo`), usar como ícone
- Se não tiver logo, usar ícone padrão (`/cliente/icons/icon-192.png`)
- `theme_color`: usar `organization.primaryColor` se existir, senão `#1a1a1a`
- Retornar com header `Content-Type: application/manifest+json`

**Importante**: Backend é CommonJS. Usar `require()` e `module.exports`.

### 2. Ícones padrão PWA

Criar pasta `cliente/icons/` e adicionar dois ícones PNG padrão (câmera fotográfica simples):

- `cliente/icons/icon-192.png` - 192x192px
- `cliente/icons/icon-512.png` - 512x512px

Pode ser um ícone simples gerado programaticamente com Canvas, ou um SVG convertido para PNG. Fundo escuro (#1a1a1a) com ícone de câmera branco.

### 3. Service Worker

**Arquivo novo**: `cliente/sw.js`

Estratégia: **Cache First para fotos, Network First para API**

```javascript
const CACHE_NAME = 'galeria-v1';

// Recursos estáticos para pré-cache
const STATIC_ASSETS = [
  '/cliente/',
  '/cliente/js/gallery.js',
  // Fontes do Google serão cacheadas dinamicamente
];

// Install: pré-cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: sempre Network (nunca cachear)
  if (url.pathname.startsWith('/api/')) {
    return; // deixa passar sem interceptar
  }

  // Fotos (/uploads/): Cache First
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // Resto (HTML, JS, CSS, fontes): Cache First com fallback Network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
});
```

### 4. Registro do Service Worker em `gallery.js`

No final do `DOMContentLoaded`, adicionar:

```javascript
// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/cliente/sw.js')
      .catch(err => console.warn('SW não registrado:', err));
  });
}
```

### 5. Atualizar `cliente/index.html`

Adicionar no `<head>`, após as meta tags existentes:

```html
<!-- PWA -->
<meta name="theme-color" id="pwaThemeColor" content="#1a1a1a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" id="pwaAppTitle" content="Minha Galeria">
<link rel="apple-touch-icon" id="pwaAppleIcon" href="/cliente/icons/icon-192.png">
<link rel="manifest" id="pwaManifest" href="/cliente/icons/icon-192.png">
<!-- O href do manifest será atualizado via JS após o login -->
```

### 6. Atualizar manifest link e meta tags após login em `gallery.js`

Após o login bem-sucedido e carregamento dos dados da sessão, atualizar o manifest dinamicamente. Adicionar esta função em `gallery.js`:

```javascript
function setupPWA() {
  const org = state.session.organization || {};

  // Atualizar manifest link para o dinâmico
  const manifestLink = document.getElementById('pwaManifest');
  if (manifestLink) {
    manifestLink.href = `/api/client/manifest/${state.sessionId}?code=${state.accessCode}`;
  }

  // Atualizar theme-color com a cor do fotografo
  const themeColor = document.getElementById('pwaThemeColor');
  if (themeColor && org.primaryColor) {
    themeColor.content = org.primaryColor;
  }

  // Atualizar título do app
  const appTitle = document.getElementById('pwaAppTitle');
  if (appTitle && org.name) {
    appTitle.content = org.name;
  }

  // Atualizar ícone Apple Touch (se tiver logo)
  const appleIcon = document.getElementById('pwaAppleIcon');
  if (appleIcon && org.logo) {
    appleIcon.href = org.logo;
  }
}
```

Chamar `setupPWA()` dentro de `initializeGallery()`, logo após o carregamento dos dados.

### 7. Banner "Adicionar à tela inicial"

Adicionar HTML no `cliente/index.html`, antes do `</body>`:

```html
<!-- Banner PWA Install -->
<div id="pwaInstallBanner" style="display:none; position:fixed; bottom:0; left:0; right:0; background:#1a1a1a; color:#fff; padding:1rem; z-index:100; box-shadow:0 -2px 10px rgba(0,0,0,0.3);">
  <div style="max-width:500px; margin:0 auto; display:flex; align-items:center; gap:1rem;">
    <img id="pwaInstallIcon" src="/cliente/icons/icon-192.png" style="width:40px; height:40px; border-radius:8px; object-fit:cover; flex-shrink:0;">
    <div style="flex:1;">
      <div style="font-weight:600; font-size:0.9375rem;" id="pwaInstallTitle">Adicionar à tela inicial</div>
      <div style="font-size:0.75rem; color:#aaa; margin-top:0.125rem;">Acesse sua galeria como um app</div>
    </div>
    <button id="pwaInstallBtn" style="background:#fff; color:#1a1a1a; border:none; border-radius:0.5rem; padding:0.5rem 1rem; font-weight:600; font-size:0.8125rem; cursor:pointer; white-space:nowrap;">
      Instalar
    </button>
    <button id="pwaInstallDismiss" style="background:none; border:none; color:#aaa; font-size:1.25rem; cursor:pointer; padding:0.25rem;">×</button>
  </div>
</div>
```

Lógica JavaScript em `gallery.js` (adicionar junto com setupPWA):

```javascript
// Banner de instalação PWA
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Só mostrar o banner depois que o usuário fizer login e ver as fotos
  // showInstallBanner() será chamado após initializeGallery()
});

function showInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (!banner || !deferredPrompt) return;

  // Não mostrar se já instalado
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  // Atualizar ícone e título do banner com dados do fotografo
  const org = state.session.organization || {};
  if (org.logo) {
    document.getElementById('pwaInstallIcon').src = org.logo;
  }
  if (org.name) {
    document.getElementById('pwaInstallTitle').textContent = `Adicionar ${org.name} à tela inicial`;
  }

  banner.style.display = 'block';

  document.getElementById('pwaInstallBtn').onclick = async () => {
    banner.style.display = 'none';
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  };

  document.getElementById('pwaInstallDismiss').onclick = () => {
    banner.style.display = 'none';
  };
}
```

Chamar `showInstallBanner()` no final de `initializeGallery()`.

**Para iOS** (Safari não suporta `beforeinstallprompt`), mostrar instruções diferentes:

```javascript
function showIOSInstallHint() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (!isIOS || isStandalone) return;

  const banner = document.getElementById('pwaInstallBanner');
  if (!banner) return;

  // No iOS, mostrar instrução manual
  document.getElementById('pwaInstallTitle').textContent = 'Adicionar à tela inicial';
  document.getElementById('pwaInstallBtn').textContent = 'Como fazer?';
  document.getElementById('pwaInstallBtn').onclick = () => {
    alert('Para adicionar à tela inicial:\n\n1. Toque no botão de compartilhar (ícone de caixa com seta) na barra do Safari\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Confirme tocando em "Adicionar"');
    banner.style.display = 'none';
  };
  banner.style.display = 'block';
}
```

Chamar `showIOSInstallHint()` também no final de `initializeGallery()`.

---

## Arquivos a Criar

| Arquivo | Ação |
|---------|------|
| `cliente/sw.js` | Criar — Service Worker |
| `cliente/icons/icon-192.png` | Criar — Ícone 192x192 |
| `cliente/icons/icon-512.png` | Criar — Ícone 512x512 |

## Arquivos a Modificar

| Arquivo | O que muda |
|---------|-----------|
| `cliente/index.html` | Adicionar meta tags PWA + link manifest + HTML do banner |
| `cliente/js/gallery.js` | Registrar SW + setupPWA() + showInstallBanner() + showIOSInstallHint() |
| `src/routes/sessions.js` | Adicionar rota `GET /api/client/manifest/:sessionId` |

## Ordem de Implementação

1. Criar `cliente/icons/` com os dois ícones PNG
2. Criar `cliente/sw.js`
3. Adicionar rota do manifest em `src/routes/sessions.js`
4. Atualizar `cliente/index.html` (meta tags + banner HTML)
5. Atualizar `cliente/js/gallery.js` (SW registration + setupPWA + banners)

---

## Regras Críticas do Projeto

1. **Backend** (`src/`): sempre CommonJS — `require()` e `module.exports`. NUNCA `import/export`.
2. **Frontend** (`cliente/`, `admin/`): Vanilla JS puro. A galeria do cliente não usa ES Modules (tag `<script>` normal, sem `type="module"`).
3. **Multi-tenancy**: todas as queries do backend devem usar `organizationId` para isolar dados.
4. **Admin**: inline styles dark mode, nunca classes Tailwind.
5. **Após implementar**: atualizar `ROADMAP.md` (marcar fase 6 como concluída) e `CLAUDE.md` (adicionar novos arquivos na estrutura).

---

## Como Testar

1. `npm run dev` — servidor local na porta 3051
2. Acesse `http://localhost:3051/cliente/`
3. Faça login com código de uma sessão
4. No Chrome DevTools → Application → Manifest: deve aparecer o manifest com dados da sessão
5. Application → Service Workers: deve aparecer `sw.js` registrado
6. Application → Cache Storage: após carregar fotos, deve aparecer cache com as URLs `/uploads/...`
7. No mobile (Android + Chrome): deve aparecer o banner "Adicionar à tela inicial"
8. Simular offline (DevTools → Network → Offline): fotos já carregadas devem continuar visíveis

---

## Observações

- O manifest link no HTML começa com href padrão e é **atualizado via JavaScript** após o login, pois precisa do `sessionId` e `accessCode` que só existem depois do login.
- O Service Worker deve ser registrado em `/cliente/sw.js` (não em subpasta) para ter escopo sobre todo `/cliente/`.
- Fotos grandes (originais) NÃO devem ser cacheadas — apenas as thumbs (URLs `/uploads/{orgId}/sessions/thumb-*.jpg`).
- O banner não deve aparecer se a galeria já estiver instalada como PWA (`display-mode: standalone`).
