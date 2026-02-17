# FASE 9 - Site Profissional Customizável

## Objetivo
Cada fotógrafo cadastrado na plataforma terá seu próprio site público personalizado, acessível via subdomínio (`slug.fsfotografias.com.br`) ou domínio próprio. O fotógrafo gerencia o conteúdo diretamente pelo painel admin, com temas pré-prontos, editor de seções e páginas extras.

## Contexto do Projeto

- **Stack**: Node.js + Express (CommonJS backend), Vanilla JS frontend
- **Backend** (`src/`): SEMPRE CommonJS — `require()` e `module.exports`. NUNCA `import/export`.
- **Admin** (`admin/js/`): SEMPRE ES Modules — `import/export`. Inline styles dark mode obrigatório. NUNCA classes Tailwind.
- **Multi-tenancy**: TODA query MongoDB DEVE filtrar por `organizationId` (ou usar `req.user.organizationId` nas rotas autenticadas, `req.organizationId` nas públicas via `resolveTenant`).
- **Site público atual**: `public/index.html` + `public/js/main.js` — é do fotógrafo "FS" (organização principal, `OWNER_SLUG`). Outros fotógrafos precisam de um site próprio independente.
- **Após implementar**: atualizar `ROADMAP.md` e `CLAUDE.md`.

---

## Paleta de Cores do Admin (inline styles obrigatório)

| Elemento | Cor |
|----------|-----|
| Fundo da página | `#111827` |
| Fundo cards | `#1f2937` |
| Fundo inputs | `#111827` |
| Borda | `#374151` |
| Texto principal | `#f3f4f6` |
| Texto secundário | `#d1d5db` |
| Botão salvar/primário | `background:#2563eb` |
| Botão adicionar | `background:#16a34a` |
| Botão deletar | `color:#ef4444` |
| Texto sucesso | `color:#34d399` |
| Texto erro | `color:#f87171` |

---

## Arquitetura da Fase 9

### Como funciona o roteamento do site do fotógrafo

O Express já tem o middleware `resolveTenant` que identifica a organização pelo subdomínio ou `?_tenant=slug`. A ideia é:

1. Rota `GET /site` → renderiza o site público do fotógrafo (HTML dinâmico ou servir `site/index.html`)
2. O frontend do site (`site/index.html` + `site/js/site.js`) faz `GET /api/site-data` e `GET /api/organization/public` para carregar os dados
3. O fotógrafo configura o site pelo admin (aba "Meu Site")

**Separação importante**:
- `public/` → Site do fotógrafo "FS" (organização principal, já existente, não mexer)
- `site/` → Template do site para OUTROS fotógrafos (novo diretório)

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `site/index.html` | Template HTML do site do fotógrafo |
| `site/js/site.js` | JS do site (Vanilla JS, sem ES Modules) |
| `site/css/site.css` | Estilos base do site (CSS puro) |
| `admin/js/tabs/meu-site.js` | Aba admin de configuração do site |
| `src/routes/site.js` | Rotas de dados do site por tenant |

## Arquivos a Modificar

| Arquivo | O que muda |
|---------|------------|
| `src/server.js` | Registrar rota + servir static `/site` |
| `src/models/Organization.js` | Adicionar campos do site: `siteEnabled`, `siteTheme`, `siteSections`, `siteConfig` |
| `admin/index.html` | Adicionar nav item `meu-site` |
| `ROADMAP.md` | Marcar fase 9 concluída |
| `CLAUDE.md` | Documentar novos arquivos e rotas |

---

## PARTE 1 — Expandir Modelo `src/models/Organization.js`

Adicionar os seguintes campos ao `OrganizationSchema` (após o campo `watermarkSize`):

```javascript
// Site público do fotógrafo
siteEnabled: { type: Boolean, default: false },  // Se o site está publicado
siteTheme: {
  type: String,
  enum: ['elegante', 'minimalista', 'moderno', 'escuro', 'colorido'],
  default: 'elegante'
},
// Configurações gerais do site
siteConfig: {
  title: { type: String, default: '' },           // Título do site (SEO)
  description: { type: String, default: '' },     // Meta description
  heroTitle: { type: String, default: '' },       // Título do hero
  heroSubtitle: { type: String, default: '' },    // Subtítulo do hero
  heroImage: { type: String, default: '' },       // URL da imagem de fundo do hero
  whatsapp: { type: String, default: '' },        // Número WhatsApp para botão
  whatsappMessage: { type: String, default: 'Olá! Vi seu site e gostaria de mais informações.' },
  instagramUrl: { type: String, default: '' },
  facebookUrl: { type: String, default: '' },
  email: { type: String, default: '' },
  copyright: { type: String, default: '' }
},
// Seções ativas e ordem (array define ordem de exibição)
siteSections: {
  type: [String],
  default: ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato']
},
// Conteúdo de cada seção
siteContent: {
  sobre: {
    title: { type: String, default: 'Sobre Mim' },
    text: { type: String, default: '' },
    image: { type: String, default: '' }
  },
  servicos: [{
    id: String,
    title: String,
    description: String,
    price: String,
    icon: { type: String, default: '📷' }
  }],
  depoimentos: [{
    id: String,
    name: String,
    text: String,
    rating: { type: Number, default: 5 },
    photo: { type: String, default: '' }
  }],
  portfolio: {
    title: { type: String, default: 'Portfólio' },
    subtitle: { type: String, default: '' },
    photos: [{
      url: String,
      caption: { type: String, default: '' }
    }]
  },
  contato: {
    title: { type: String, default: 'Entre em Contato' },
    text: { type: String, default: '' },
    address: { type: String, default: '' },
    mapEmbed: { type: String, default: '' }   // URL de embed do Google Maps
  }
}
```

---

## PARTE 2 — Rotas `src/routes/site.js`

Arquivo CommonJS. Estrutura:

### Rota pública (usa `resolveTenant`, já aplicado em `/api/site-data`):

```
GET /api/site/config          — dados públicos do site do fotógrafo (sem auth)
```

**GET /api/site/config**: Busca `Organization` pelo `req.organizationId`. Retorna:
```json
{
  "siteEnabled": true,
  "siteTheme": "elegante",
  "siteConfig": { ... },
  "siteSections": ["hero", "sobre", "portfolio", ...],
  "siteContent": { ... },
  "name": "Nome do Estúdio",
  "logo": "/uploads/orgId/logo.jpg",
  "primaryColor": "#1a1a1a"
}
```

Se `siteEnabled === false`, retornar `{ siteEnabled: false }` (frontend mostra "Site em construção").

### Rotas admin (todas com `authenticateToken`):

```
GET    /api/site/admin/config          — carregar config completa para edição
PUT    /api/site/admin/config          — salvar config (siteEnabled, siteTheme, siteConfig, siteSections, siteContent)
POST   /api/site/admin/portfolio       — upload de foto do portfólio do site
DELETE /api/site/admin/portfolio/:idx  — remover foto do portfólio por índice
```

**Upload de portfólio**: usar `multerConfig.js` com subdir `site`. Comprimir com `sharp` para 1200px largura, qualidade 85. URL: `/uploads/{orgId}/site/filename.jpg`.

**PUT /api/site/admin/config**: atualiza `siteEnabled`, `siteTheme`, `siteConfig`, `siteSections` e `siteContent` na organização.

### Registrar no `src/server.js`:

Adicionar ANTES do `app.listen()`:
```javascript
app.use('/api', require('./routes/site'));
```

Adicionar middleware `resolveTenant` para a rota pública:
```javascript
app.use('/api/site/config', resolveTenant);
```

Adicionar static para o diretório `site/`:
```javascript
app.use('/site', express.static(path.join(__dirname, '../site')));
```

Adicionar rota SPA para o site do fotógrafo:
```javascript
app.get('/site', (req, res) => {
  res.sendFile(path.join(__dirname, '../site/index.html'));
});
```

---

## PARTE 3 — Template do Site `site/index.html`

Página standalone com CSS próprio. Fontes Inter + Playfair Display (Google Fonts). Estrutura:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title id="siteTitle">Fotógrafo Profissional</title>
  <meta name="description" id="siteMeta" content="">
  <!-- Open Graph para redes sociais -->
  <meta property="og:title" id="ogTitle" content="">
  <meta property="og:description" id="ogDesc" content="">
  <meta property="og:image" id="ogImage" content="">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/site/css/site.css">
</head>
<body>

  <!-- NAV -->
  <nav id="siteNav">
    <div class="nav-inner">
      <a href="#" class="nav-logo" id="navLogo">Estúdio</a>
      <div class="nav-links" id="navLinks">
        <!-- links gerados pelo JS -->
      </div>
      <button class="nav-cta" id="navCta">Agendar Sessão</button>
      <button class="nav-hamburger" id="navHamburger">☰</button>
    </div>
  </nav>

  <!-- HERO -->
  <section id="section-hero" class="section-hero">
    <div class="hero-bg" id="heroBg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <p class="hero-eyebrow" id="heroEyebrow">Fotografia Profissional</p>
      <h1 class="hero-title" id="heroTitle">Eternizando Momentos</h1>
      <p class="hero-subtitle" id="heroSubtitle">Cada clique conta uma história única</p>
      <div class="hero-buttons">
        <a href="#section-portfolio" class="btn-primary">Ver Portfólio</a>
        <a href="#section-contato" class="btn-secondary">Falar Comigo</a>
      </div>
    </div>
  </section>

  <!-- SOBRE -->
  <section id="section-sobre" class="section-sobre section-padded">
    <div class="container">
      <div class="sobre-grid">
        <div class="sobre-image">
          <img id="sobreImage" src="" alt="Fotógrafo" loading="lazy">
        </div>
        <div class="sobre-text">
          <h2 class="section-title" id="sobreTitle">Sobre Mim</h2>
          <p class="section-text" id="sobreText"></p>
          <a href="#section-contato" class="btn-primary" style="margin-top:1.5rem; display:inline-block;">Entre em Contato</a>
        </div>
      </div>
    </div>
  </section>

  <!-- PORTFOLIO -->
  <section id="section-portfolio" class="section-portfolio section-padded">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title" id="portfolioTitle">Portfólio</h2>
        <p class="section-subtitle" id="portfolioSubtitle"></p>
      </div>
      <div class="portfolio-grid" id="portfolioGrid">
        <!-- fotos geradas pelo JS -->
      </div>
    </div>
  </section>

  <!-- SERVIÇOS -->
  <section id="section-servicos" class="section-servicos section-padded">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Serviços</h2>
      </div>
      <div class="servicos-grid" id="servicosGrid">
        <!-- cards gerados pelo JS -->
      </div>
    </div>
  </section>

  <!-- DEPOIMENTOS -->
  <section id="section-depoimentos" class="section-depoimentos section-padded">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Depoimentos</h2>
      </div>
      <div class="depoimentos-track" id="depoimentosTrack">
        <!-- cards gerados pelo JS -->
      </div>
    </div>
  </section>

  <!-- CONTATO -->
  <section id="section-contato" class="section-contato section-padded">
    <div class="container">
      <div class="contato-grid">
        <div>
          <h2 class="section-title" id="contatoTitle">Entre em Contato</h2>
          <p class="section-text" id="contatoText"></p>
          <div class="contato-info" id="contatoInfo">
            <!-- itens de contato gerados pelo JS -->
          </div>
        </div>
        <div class="contato-form">
          <form id="contactForm">
            <input type="text" name="nome" placeholder="Seu nome" required>
            <input type="email" name="email" placeholder="Seu e-mail" required>
            <input type="text" name="assunto" placeholder="Assunto">
            <textarea name="mensagem" placeholder="Mensagem" rows="4" required></textarea>
            <button type="submit" class="btn-primary" style="width:100%;">Enviar Mensagem</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer id="siteFooter" class="site-footer">
    <div class="container">
      <div class="footer-inner">
        <div>
          <p class="footer-logo" id="footerLogo">Estúdio</p>
          <p class="footer-copy" id="footerCopy"></p>
        </div>
        <div class="footer-social" id="footerSocial">
          <!-- links sociais gerados pelo JS -->
        </div>
      </div>
    </div>
  </footer>

  <!-- WhatsApp flutuante -->
  <a id="whatsappBtn" href="#" target="_blank" class="whatsapp-float" style="display:none;">
    <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  </a>

  <!-- Lightbox de portfólio -->
  <div id="portfolioLightbox" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:1000; display:none; align-items:center; justify-content:center;">
    <button id="lbClose" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:white; font-size:2rem; cursor:pointer;">×</button>
    <button id="lbPrev" style="position:absolute; left:1rem; background:rgba(255,255,255,0.1); border:none; color:white; font-size:2rem; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer;">‹</button>
    <img id="lbImage" src="" style="max-height:90vh; max-width:90vw; object-fit:contain;">
    <button id="lbNext" style="position:absolute; right:1rem; background:rgba(255,255,255,0.1); border:none; color:white; font-size:2rem; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer;">›</button>
  </div>

  <script src="/site/js/site.js"></script>
</body>
</html>
```

---

## PARTE 4 — CSS Base `site/css/site.css`

CSS puro responsivo. Variáveis CSS para temas. Estrutura:

```css
/* ============================================
   VARIÁVEIS DE TEMA
   ============================================ */

:root {
  --primary: #1a1a1a;
  --primary-light: #333;
  --accent: #c9a96e;       /* dourado elegante */
  --bg: #fafafa;
  --bg-alt: #f3f4f6;
  --text: #111827;
  --text-muted: #6b7280;
  --font-body: 'Inter', sans-serif;
  --font-title: 'Playfair Display', serif;
}

/* Tema escuro */
body.theme-escuro {
  --primary: #e5e7eb;
  --primary-light: #d1d5db;
  --accent: #f59e0b;
  --bg: #111827;
  --bg-alt: #1f2937;
  --text: #f3f4f6;
  --text-muted: #9ca3af;
}

/* Tema moderno */
body.theme-moderno {
  --accent: #2563eb;
  --font-title: 'Inter', sans-serif;
}

/* Tema minimalista */
body.theme-minimalista {
  --accent: #374151;
  --bg: #ffffff;
}

/* Tema colorido */
body.theme-colorido {
  --accent: #ec4899;
}

/* ============================================
   RESET & BASE
   ============================================ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}
a { color: inherit; text-decoration: none; }
img { max-width: 100%; }

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.section-padded { padding: 5rem 0; }

/* ============================================
   NAV
   ============================================ */
nav#siteNav {
  position: fixed;
  top: 0; left: 0; right: 0;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  z-index: 100;
  transition: all 0.3s;
}
body.theme-escuro nav#siteNav {
  background: rgba(17,24,39,0.95);
  border-bottom-color: rgba(255,255,255,0.1);
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 4rem;
  display: flex;
  align-items: center;
  gap: 2rem;
}
.nav-logo {
  font-family: var(--font-title);
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--text);
  flex-shrink: 0;
}
.nav-links {
  display: flex;
  gap: 1.5rem;
  flex: 1;
}
.nav-links a {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  transition: color 0.2s;
}
.nav-links a:hover { color: var(--text); }
.nav-cta {
  background: var(--primary);
  color: var(--bg);
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.nav-cta:hover { opacity: 0.85; }
.nav-hamburger {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text);
  margin-left: auto;
}

/* ============================================
   HERO
   ============================================ */
.section-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
.hero-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
}
.hero-content {
  position: relative;
  z-index: 1;
  color: white;
  padding: 2rem;
  max-width: 700px;
}
.hero-eyebrow {
  font-size: 0.875rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 1rem;
}
.hero-title {
  font-family: var(--font-title);
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 1.1;
  margin-bottom: 1.25rem;
}
.hero-subtitle {
  font-size: 1.125rem;
  opacity: 0.85;
  margin-bottom: 2rem;
}
.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* ============================================
   BOTÕES
   ============================================ */
.btn-primary {
  background: var(--accent);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.9375rem;
  display: inline-block;
  transition: opacity 0.2s, transform 0.2s;
  border: none;
  cursor: pointer;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary {
  background: transparent;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 0.9375rem;
  display: inline-block;
  border: 2px solid rgba(255,255,255,0.6);
  transition: all 0.2s;
}
.btn-secondary:hover { background: rgba(255,255,255,0.15); }

/* ============================================
   SOBRE
   ============================================ */
.section-sobre { background: var(--bg); }
.sobre-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}
.sobre-image img {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 1rem;
}
.section-title {
  font-family: var(--font-title);
  font-size: 2.25rem;
  line-height: 1.2;
  color: var(--text);
  margin-bottom: 1.25rem;
}
.section-subtitle {
  color: var(--text-muted);
  font-size: 1.0625rem;
  margin-top: -0.5rem;
  margin-bottom: 2rem;
}
.section-text {
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.8;
}
.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

/* ============================================
   PORTFOLIO
   ============================================ */
.section-portfolio { background: var(--bg-alt); }
.portfolio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.portfolio-item {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.5rem;
  cursor: pointer;
  position: relative;
}
.portfolio-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}
.portfolio-item:hover img { transform: scale(1.05); }

/* ============================================
   SERVIÇOS
   ============================================ */
.servicos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.servico-card {
  background: var(--bg-alt);
  border-radius: 1rem;
  padding: 2rem;
  text-align: center;
  border: 1px solid rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}
body.theme-escuro .servico-card {
  border-color: rgba(255,255,255,0.06);
}
.servico-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
.servico-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.servico-title {
  font-family: var(--font-title);
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
  color: var(--text);
}
.servico-desc { color: var(--text-muted); font-size: 0.875rem; line-height: 1.7; }
.servico-price { color: var(--accent); font-weight: 700; margin-top: 1rem; font-size: 1rem; }

/* ============================================
   DEPOIMENTOS
   ============================================ */
.section-depoimentos { background: var(--bg); }
.depoimentos-track {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}
.depoimento-card {
  background: var(--bg-alt);
  border-radius: 1rem;
  padding: 1.75rem;
  border: 1px solid rgba(0,0,0,0.06);
}
body.theme-escuro .depoimento-card { border-color: rgba(255,255,255,0.06); }
.depoimento-stars { color: #f59e0b; font-size: 1rem; margin-bottom: 0.75rem; }
.depoimento-text { color: var(--text-muted); font-size: 0.9375rem; line-height: 1.7; font-style: italic; }
.depoimento-author {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
.depoimento-photo {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  object-fit: cover;
  background: var(--primary-light);
}
.depoimento-name { font-weight: 600; font-size: 0.875rem; color: var(--text); }

/* ============================================
   CONTATO
   ============================================ */
.section-contato { background: var(--bg-alt); }
.contato-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: start;
}
.contato-info { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
.contato-item { display: flex; align-items: center; gap: 0.75rem; }
.contato-item span { color: var(--text-muted); font-size: 0.9375rem; }
.contato-form form { display: flex; flex-direction: column; gap: 1rem; }
.contato-form input,
.contato-form textarea {
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  transition: border-color 0.2s;
  width: 100%;
}
body.theme-escuro .contato-form input,
body.theme-escuro .contato-form textarea {
  border-color: rgba(255,255,255,0.12);
}
.contato-form input:focus,
.contato-form textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* ============================================
   FOOTER
   ============================================ */
.site-footer {
  background: var(--primary);
  color: rgba(255,255,255,0.7);
  padding: 2rem 0;
}
.footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.footer-logo {
  font-family: var(--font-title);
  font-size: 1.25rem;
  color: white;
  margin-bottom: 0.25rem;
}
.footer-copy { font-size: 0.8125rem; }
.footer-social { display: flex; gap: 1rem; }
.footer-social a {
  color: rgba(255,255,255,0.6);
  font-size: 1.5rem;
  transition: color 0.2s;
}
.footer-social a:hover { color: white; }

/* ============================================
   WHATSAPP FLOAT
   ============================================ */
.whatsapp-float {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  background: #25d366;
  border-radius: 50%;
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: transform 0.2s;
  z-index: 50;
}
.whatsapp-float:hover { transform: scale(1.1); }

/* ============================================
   TELA DE CONSTRUÇÃO
   ============================================ */
.site-building {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  gap: 1rem;
  padding: 2rem;
}
.site-building h1 {
  font-family: var(--font-title);
  font-size: 2rem;
  color: var(--text);
}
.site-building p { color: var(--text-muted); }

/* ============================================
   RESPONSIVO
   ============================================ */
@media (max-width: 768px) {
  .nav-links, .nav-cta { display: none; }
  .nav-hamburger { display: block; }
  .nav-inner { justify-content: space-between; }

  .sobre-grid,
  .contato-grid { grid-template-columns: 1fr; gap: 2rem; }

  .portfolio-grid { grid-template-columns: repeat(2, 1fr); }

  .servicos-grid { grid-template-columns: 1fr; }

  .section-padded { padding: 3rem 0; }
  .section-title { font-size: 1.75rem; }

  .footer-inner { flex-direction: column; text-align: center; }
}

@media (max-width: 480px) {
  .portfolio-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
  .hero-title { font-size: 2rem; }
}
```

---

## PARTE 5 — JS do Site `site/js/site.js`

Vanilla JS puro (sem ES Modules — `<script src="...">` normal).

```javascript
// Estado
const state = {
  data: null,
  portfolioPhotos: [],
  lightboxIndex: 0
};

// Detectar tenant pelo subdomínio ou ?_tenant=slug
function getTenantParam() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  // Se hostname = slug.fsfotografias.com.br → partes[0] é o slug
  // Se localhost → usar query param ?_tenant=slug
  if (parts.length >= 3 && parts[0] !== 'www') {
    return '_subdomain_' + parts[0];
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('_tenant') ? '?_tenant=' + params.get('_tenant') : '';
}

async function loadSiteData() {
  try {
    const tenantParam = getTenantParam();
    // Se tem subdomínio, o resolveTenant no backend detecta automaticamente
    // Se tem query param, passamos via query string
    const url = tenantParam.startsWith('?')
      ? '/api/site/config' + tenantParam
      : '/api/site/config';

    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar site');
    const data = await res.json();
    state.data = data;
    renderSite(data);
  } catch (e) {
    document.body.innerHTML = `
      <div class="site-building">
        <h1>Site em construção</h1>
        <p>Volte em breve.</p>
      </div>
    `;
  }
}

function renderSite(data) {
  if (!data.siteEnabled) {
    document.body.innerHTML = `
      <div class="site-building">
        <h1>${data.name || 'Em breve'}</h1>
        <p>Estamos preparando algo especial para você.</p>
      </div>
    `;
    return;
  }

  const config = data.siteConfig || {};
  const content = data.siteContent || {};
  const theme = data.siteTheme || 'elegante';

  // Aplicar tema
  document.body.className = 'theme-' + theme;

  // Aplicar cor primária customizada via CSS var
  if (data.primaryColor) {
    document.documentElement.style.setProperty('--primary', data.primaryColor);
  }

  // Meta tags
  document.getElementById('siteTitle').textContent = config.title || data.name || 'Fotógrafo';
  document.getElementById('siteMeta').setAttribute('content', config.description || '');
  document.getElementById('ogTitle').setAttribute('content', config.title || data.name || '');
  document.getElementById('ogDesc').setAttribute('content', config.description || '');
  if (config.heroImage) {
    document.getElementById('ogImage').setAttribute('content', config.heroImage);
  }

  // NAV
  const navLogo = document.getElementById('navLogo');
  if (data.logo) {
    navLogo.innerHTML = `<img src="${data.logo}" alt="${data.name}" style="height:2rem; object-fit:contain;">`;
  } else {
    navLogo.textContent = data.name || 'Estúdio';
  }

  // Gerar links do nav baseado nas seções ativas
  const sections = data.siteSections || [];
  const sectionLabels = {
    sobre: 'Sobre', portfolio: 'Portfólio', servicos: 'Serviços',
    depoimentos: 'Depoimentos', contato: 'Contato'
  };
  const navLinks = document.getElementById('navLinks');
  navLinks.innerHTML = sections
    .filter(s => s !== 'hero' && sectionLabels[s])
    .map(s => `<a href="#section-${s}">${sectionLabels[s]}</a>`)
    .join('');

  // CTA do nav
  if (config.whatsapp) {
    const msg = encodeURIComponent(config.whatsappMessage || '');
    document.getElementById('navCta').onclick = () => {
      window.open(`https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');
    };
  }

  // HERO
  if (config.heroImage) {
    document.getElementById('heroBg').style.backgroundImage = `url(${config.heroImage})`;
  }
  document.getElementById('heroTitle').textContent = config.heroTitle || data.name || 'Fotografia Profissional';
  document.getElementById('heroSubtitle').textContent = config.heroSubtitle || '';
  document.getElementById('heroEyebrow').textContent = data.name || '';

  // SOBRE
  if (content.sobre) {
    document.getElementById('sobreTitle').textContent = content.sobre.title || 'Sobre Mim';
    document.getElementById('sobreText').textContent = content.sobre.text || '';
    if (content.sobre.image) {
      document.getElementById('sobreImage').src = content.sobre.image;
    } else if (data.logo) {
      document.getElementById('sobreImage').src = data.logo;
    }
  }

  // PORTFOLIO
  if (content.portfolio) {
    document.getElementById('portfolioTitle').textContent = content.portfolio.title || 'Portfólio';
    document.getElementById('portfolioSubtitle').textContent = content.portfolio.subtitle || '';
    const photos = content.portfolio.photos || [];
    state.portfolioPhotos = photos.map(p => p.url || p);
    const grid = document.getElementById('portfolioGrid');
    grid.innerHTML = photos.map((p, i) => `
      <div class="portfolio-item" onclick="openLightbox(${i})">
        <img src="${p.url || p}" alt="" loading="lazy">
      </div>
    `).join('');
  }

  // SERVIÇOS
  const servicos = content.servicos || [];
  const servicosGrid = document.getElementById('servicosGrid');
  servicosGrid.innerHTML = servicos.map(s => `
    <div class="servico-card">
      <div class="servico-icon">${s.icon || '📷'}</div>
      <h3 class="servico-title">${escapeHtml(s.title || '')}</h3>
      <p class="servico-desc">${escapeHtml(s.description || '')}</p>
      ${s.price ? `<p class="servico-price">${escapeHtml(s.price)}</p>` : ''}
    </div>
  `).join('') || '<p style="text-align:center; color:#6b7280;">Em breve.</p>';

  // DEPOIMENTOS
  const deps = content.depoimentos || [];
  const track = document.getElementById('depoimentosTrack');
  track.innerHTML = deps.map(d => `
    <div class="depoimento-card">
      <div class="depoimento-stars">${'★'.repeat(d.rating || 5)}${'☆'.repeat(5 - (d.rating || 5))}</div>
      <p class="depoimento-text">"${escapeHtml(d.text || '')}"</p>
      <div class="depoimento-author">
        ${d.photo ? `<img class="depoimento-photo" src="${d.photo}" alt="${escapeHtml(d.name || '')}">`
                  : `<div class="depoimento-photo" style="display:flex;align-items:center;justify-content:center;font-size:1rem;color:#9ca3af;">👤</div>`}
        <span class="depoimento-name">${escapeHtml(d.name || '')}</span>
      </div>
    </div>
  `).join('') || '<p style="text-align:center; color:#6b7280;">Sem depoimentos ainda.</p>';

  // CONTATO
  if (content.contato) {
    document.getElementById('contatoTitle').textContent = content.contato.title || 'Contato';
    document.getElementById('contatoText').textContent = content.contato.text || '';
    const info = document.getElementById('contatoInfo');
    const items = [];
    if (config.whatsapp) items.push(`<div class="contato-item"><span>📱</span><span>${config.whatsapp}</span></div>`);
    if (config.email || data.email) items.push(`<div class="contato-item"><span>✉️</span><span>${config.email || data.email}</span></div>`);
    if (content.contato.address) items.push(`<div class="contato-item"><span>📍</span><span>${escapeHtml(content.contato.address)}</span></div>`);
    info.innerHTML = items.join('');
  }

  // FOOTER
  if (data.logo) {
    document.getElementById('footerLogo').innerHTML = `<img src="${data.logo}" alt="${data.name}" style="height:1.75rem; object-fit:contain; filter:brightness(10);">`;
  } else {
    document.getElementById('footerLogo').textContent = data.name || '';
  }
  document.getElementById('footerCopy').textContent = config.copyright || `© ${new Date().getFullYear()} ${data.name}`;

  const social = document.getElementById('footerSocial');
  const socialLinks = [];
  if (config.instagramUrl) socialLinks.push(`<a href="${config.instagramUrl}" target="_blank" rel="noopener">📸</a>`);
  if (config.facebookUrl) socialLinks.push(`<a href="${config.facebookUrl}" target="_blank" rel="noopener">👥</a>`);
  social.innerHTML = socialLinks.join('');

  // WhatsApp botão flutuante
  if (config.whatsapp) {
    const btn = document.getElementById('whatsappBtn');
    const msg = encodeURIComponent(config.whatsappMessage || '');
    btn.href = `https://wa.me/${config.whatsapp.replace(/\D/g, '')}?text=${msg}`;
    btn.style.display = 'flex';
  }

  // Ocultar seções desativadas
  const allSections = ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
  allSections.forEach(s => {
    const el = document.getElementById('section-' + s);
    if (el && !sections.includes(s)) el.style.display = 'none';
  });

  // Formulário de contato: enviar via WhatsApp
  const form = document.getElementById('contactForm');
  form.onsubmit = (e) => {
    e.preventDefault();
    const nome = form.nome.value;
    const email = form.email.value;
    const assunto = form.assunto.value;
    const mensagem = form.mensagem.value;
    if (config.whatsapp) {
      const msg = `Olá! Me chamo ${nome} (${email}).\n\n*${assunto}*\n\n${mensagem}`;
      window.open(`https://wa.me/${config.whatsapp.replace(/\D/g,')}?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (config.email || data.email) {
      window.location.href = `mailto:${config.email || data.email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
    }
    form.reset();
  };

  // Menu mobile
  document.getElementById('navHamburger').onclick = () => {
    const links = document.getElementById('navLinks');
    const isVisible = links.style.display === 'flex';
    links.style.display = isVisible ? 'none' : 'flex';
    links.style.flexDirection = isVisible ? '' : 'column';
    links.style.position = isVisible ? '' : 'absolute';
    links.style.top = isVisible ? '' : '4rem';
    links.style.left = isVisible ? '' : '0';
    links.style.right = isVisible ? '' : '0';
    links.style.background = isVisible ? '' : 'var(--bg)';
    links.style.padding = isVisible ? '' : '1rem 1.5rem';
    links.style.borderBottom = isVisible ? '' : '1px solid rgba(0,0,0,0.1)';
  };
}

// Lightbox do portfólio
function openLightbox(idx) {
  state.lightboxIndex = idx;
  const lb = document.getElementById('portfolioLightbox');
  lb.style.display = 'flex';
  document.getElementById('lbImage').src = state.portfolioPhotos[idx];
}
document.getElementById('lbClose').onclick = () => {
  document.getElementById('portfolioLightbox').style.display = 'none';
};
document.getElementById('lbPrev').onclick = () => {
  state.lightboxIndex = (state.lightboxIndex - 1 + state.portfolioPhotos.length) % state.portfolioPhotos.length;
  document.getElementById('lbImage').src = state.portfolioPhotos[state.lightboxIndex];
};
document.getElementById('lbNext').onclick = () => {
  state.lightboxIndex = (state.lightboxIndex + 1) % state.portfolioPhotos.length;
  document.getElementById('lbImage').src = state.portfolioPhotos[state.lightboxIndex];
};
document.getElementById('portfolioLightbox').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};

// Swipe no lightbox (mobile)
let touchStartX = 0;
document.getElementById('portfolioLightbox').addEventListener('touchstart', e => touchStartX = e.touches[0].clientX);
document.getElementById('portfolioLightbox').addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    diff > 0 ? document.getElementById('lbNext').click() : document.getElementById('lbPrev').click();
  }
});

// Escape fecha lightbox
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('portfolioLightbox').style.display = 'none';
  if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
  if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
});

// Helper
function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Iniciar
document.addEventListener('DOMContentLoaded', loadSiteData);
```

---

## PARTE 6 — Aba Admin `admin/js/tabs/meu-site.js`

ES Module. Importar: `appState` (não usar), `apiGet`, `apiPost`, `apiPut`, `apiDelete` de `../utils/api.js`. Importar `uploadImage` de `../utils/upload.js`.

### Estrutura da aba:

**Header:**
- Título "Meu Site"
- Toggle "Publicar site" (liga/desliga `siteEnabled`)
- Link externo "Ver site" (abre `/site?_tenant=slug` em nova aba)

**Abas internas** (navegação por botões dentro da aba):
1. **Configurações Gerais** — tema, título, meta description, hero, WhatsApp, redes sociais
2. **Seções** — ativar/desativar e reordenar seções com botões ▲▼
3. **Sobre** — título, texto, upload de foto
4. **Portfólio** — upload múltiplo de fotos, grid com botão deletar
5. **Serviços** — lista de cards (CRUD): ícone, título, descrição, preço
6. **Depoimentos** — lista de depoimentos (CRUD): nome, texto, rating (1-5 estrelas), foto
7. **Contato** — título, texto, endereço

**Configurações Gerais (sub-aba 1):**
- Select de tema: Elegante | Minimalista | Moderno | Escuro | Colorido
- Campo: Título do site (SEO)
- Campo: Meta description
- Campo: Título do hero (headline principal)
- Campo: Subtítulo do hero
- Upload: Foto de fundo do hero (comprimida para 1920px)
- Campo: Número WhatsApp (com prefixo +55)
- Campo: Mensagem padrão WhatsApp
- Campo: Instagram (URL completa)
- Campo: Facebook (URL completa)
- Campo: Email de contato
- Campo: Copyright

**Seções (sub-aba 2):**
- Lista de seções disponíveis: hero, sobre, portfolio, servicos, depoimentos, contato
- Checkbox para ativar/desativar cada seção
- Botões ▲▼ para reordenar (exceto hero que é sempre primeiro)
- Preview da ordem atual

**Serviços (sub-aba 5):**
- Botão "+ Adicionar Serviço"
- Cada serviço: campo emoji (icon), título, textarea descrição, campo preço, botão deletar (🗑️)
- Salvar tudo junto com botão "Salvar Serviços"

**Depoimentos (sub-aba 6):**
- Botão "+ Adicionar Depoimento"
- Cada depoimento: nome, textarea texto, select rating (1 a 5 ★), upload foto (opcional), botão deletar
- Salvar tudo junto com botão "Salvar Depoimentos"

**Padrão de save:**
- Cada sub-aba tem seu próprio botão "Salvar"
- Chamar `PUT /api/site/admin/config` com o campo específico atualizado
- Mostrar "Salvo!" em verde por 3 segundos após sucesso

**Copiar link do site:**
- Botão "📋 Copiar Link" que copia a URL do site do fotógrafo
- URL base: `window.location.origin + '/site?_tenant=' + slug`
- Usar `navigator.clipboard.writeText()` com fallback

---

## PARTE 7 — `admin/index.html` — Nav Item

Adicionar após `<div data-tab="clientes">`, antes de `<div data-tab="footer">`:

```html
<div data-tab="meu-site" class="nav-item">🌐 Meu Site</div>
```

---

## Ordem de Implementação

1. `src/models/Organization.js` (adicionar campos do site)
2. `src/routes/site.js` (rotas públicas + admin)
3. `src/server.js` (registrar rota + static + resolveTenant)
4. `site/css/site.css`
5. `site/index.html`
6. `site/js/site.js`
7. `admin/js/tabs/meu-site.js`
8. `admin/index.html` (nav item)
9. `ROADMAP.md` + `CLAUDE.md`

---

## Como Testar

1. `npm run dev`
2. Admin → aba **Meu Site**
3. Configurar: tema "Elegante", título "Casamento Maria Silva", subir foto do hero
4. Ativar as seções: Sobre, Portfólio, Serviços, Depoimentos, Contato
5. Preencher conteúdo de cada seção
6. Clicar "Publicar site" (toggle)
7. Clicar "Ver site" → `http://localhost:3051/site?_tenant=fs`
8. Verificar que todas as seções aparecem corretamente
9. Testar no mobile: menu hamburger, swipe no lightbox
10. Testar temas diferentes: aplicar "Escuro" → ver site com fundo preto
11. Desativar seção "Depoimentos" → seção some do site
12. Reordenar seções → ordem muda no site

---

## Observações

- **Não confundir** com `public/` (site do fotógrafo principal FS). O novo `site/` é o template para outros fotógrafos.
- O frontend `site/js/site.js` usa `fetch('/api/site/config')`. O backend identifica o tenant via `resolveTenant` (subdomínio em prod, `?_tenant=slug` em dev).
- Se o fotógrafo usar subdomínio próprio (`maria.fsfotografias.com.br`), o `resolveTenant` detecta automaticamente — nenhuma mudança necessária no frontend.
- Upload do hero: usar `multerConfig.js` com subdir `site`, comprimir para 1920px largura com sharp.
- Upload do portfólio do site: arquivos separados dos portfólios de sessões. Ficam em `/uploads/{orgId}/site/`.
- A seção "hero" é obrigatória e sempre aparece primeiro (não pode ser desativada nem reordenada).
- O formulário de contato envia via WhatsApp (se configurado) ou `mailto:` (fallback). Não há backend de email por ora.
