# CliqueZoom — Project Overview for AI Assistants

**Última atualização:** 2026-04-15  
**Idioma:** Português Brasileiro  
**Domínio:** cliquezoom.com.br  

---

## 🎯 O QUE É CLIQUEZOOM?

**CliqueZoom** é uma plataforma SaaS de gestão fotográfica que permite que fotógrafos:
- 📸 Gerenciem sessões de fotos de clientes
- 🎨 Customizem seu site com 5 templates modernos
- 👥 Compartilhem fotos privadas com clientes via código de acesso
- 🎬 Gerenciem álbuns de prova com aprovação de clientes
- 💳 Gerenciem planos de assinatura

**Usuários finais:**
- Fotógrafos (donos de organizações) - usam `cliquezoom.com.br/admin/`
- Clientes dos fotógrafos - recebem link privado para galeria
- Superadmin (operador da plataforma) - usa `cliquezoom.com.br/saas-admin/`

---

## 🏗️ ARQUITETURA EM 30 SEGUNDOS

```
Internet → Nginx (porta 80/443)
           ├── Static: /uploads/, /assets/, /admin/js/
           └── Proxy: localhost:3051 (Node.js + Express)
                      ↓
                  MongoDB local (:27017)
```

**Stack:**
- **Backend:** Node.js 22 + Express.js (CommonJS)
- **Frontend Admin:** Vanilla JS ES Modules (dark mode GitHub theme)
- **Frontend Público:** Vanilla JS + TailwindCSS compilado
- **Banco de Dados:** MongoDB local (única instância)
- **Upload de Imagens:** Disco local `/uploads/{orgId}/` (sem serviços externos)
- **Deploy:** VPS Contabo (Ubuntu) via PM2 cluster (2 instâncias)

---

## 📁 ESTRUTURA DE PASTAS SIMPLIFICADA

```
FsSaaS/
├── home/                    # Landing page de cadastro (público)
├── admin/                   # Painel do fotógrafo
│   ├── index.html          # Shell (login + sidebar)
│   └── js/tabs/            # 1 arquivo por aba (dashboard, sessoes, etc.)
├── saas-admin/             # Painel do superadmin (gerencia toda plataforma)
├── site/templates/         # 5 templates do site (elegante, minimalista, etc.)
├── cliente/                # Galeria privada do cliente
├── album/                  # Visualizador de álbum de prova
├── src/                    # Backend Express
│   ├── server.js           # Entry point
│   ├── routes/             # CRUD de tudo (auth, sessions, clients, etc.)
│   ├── models/             # Mongoose schemas
│   └── middleware/         # Auth, tenant resolution, plan limits
├── uploads/                # Imagens do usuário (servidas por Nginx)
└── assets/                 # CSS/JS compartilhado
```

---

## 🔐 REGRAS CRÍTICAS (NUNCA QUEBRE)

### 1. **Módulos JavaScript**
- **Backend** (`src/`): CommonJS obrigatório → `require()` + `module.exports`
- **Admin** (`admin/js/`): ES Modules obrigatório → `import` + `export`

### 2. **Estilização**
- **Admin:** Inline styles EXCLUSIVAMENTE + CSS variables (tema GitHub dark)
  ```javascript
  style="background:var(--bg-surface); color:var(--text-primary);"
  ```
- **Público:** TailwindCSS compilado (nunca inline classes)
- **NUNCA** use Tailwind classes no admin — ficam invisíveis no tema escuro

### 3. **Armazenamento**
- Uploads salvos SOMENTE em `/uploads/{orgId}/` no servidor local
- Sem Cloudinary, S3, Atlas, ou qualquer serviço externo
- Retorna URL relativa: `/uploads/{orgId}/filename.jpg`

### 4. **UI/UX**
- **NUNCA** `alert()` ou `confirm()` — use:
  - Admin: `window.showToast(msg, type)` e `window.showConfirm(msg, opts)`
  - Saas-admin: `saasToast(msg, type)` e `saasConfirm(msg, opts)`

### 5. **Build & Deploy**
- Antes de fazer deploy: `npm run build:css` se alterou HTML com Tailwind
- CSS é compilado de `assets/css/tailwind-input.css` → `assets/css/tailwind.css`
- Não edite `tailwind.css` manualmente

---

## 🎨 DESIGN SYSTEM (ADMIN)

**Tema:** GitHub Dark (#0d1117 background)

```css
--bg-base: #0d1117;          /* fundo página */
--bg-surface: #161b22;       /* cards, sidebar */
--bg-elevated: #1c2128;      /* inputs, modais */
--border: #30363d;
--text-primary: #e6edf3;     /* texto principal */
--text-secondary: #8b949e;
--accent: #2f81f7;           /* botões primários */
--green: #3fb950;            /* sucesso */
--red: #f85149;              /* erro */
```

---

## 🔗 FLUXO DE DADOS PRINCIPAIS

### Upload de Imagem
```
Admin UI → uploadImage(file) 
  → POST /api/admin/upload 
  → Multer salva em /uploads/{orgId}/
  → Retorna { url: '/uploads/{orgId}/filename.jpg' }
  → Admin salva no DB
```

### Site do Fotógrafo
```
Cliente acessa slug.cliquezoom.com.br
  → Middleware tenant resolve organização
  → GET /api/site/config
  → shared-site.js renderiza template (5 opções)
  → Dados do banco preenchem o template
```

### Admin Salva Dados (Abas Legado)
```
Admin UI → saveAppData('secao', dados)
  → PUT /api/site-data
  → Upsert em MongoDB (SiteData collection)
```

---

## 💾 MODELO DE DADOS

### Organization (Fotógrafo)
```javascript
{
  name, slug, ownerId,
  logo, phone, whatsapp, email, website,
  plan, isActive,
  siteTheme,        // 'elegante' | 'minimalista' | 'moderno' | 'escuro' | 'galeria'
  siteConfig: { heroTitle, heroImage, heroScale, ... },
  siteStyle: { accentColor, bgColor, textColor, fontFamily },
  siteSections: ['hero', 'portfolio', 'servicos', ...],
  siteContent: { sobre, servicos, portfolio, depoimentos, ... },
  watermarkType, watermarkText, watermarkOpacity,
  integrations: { googleAnalytics, facebookPixel, ... }
}
```

### Outras Collections
- **User:** Email, senha (bcrypt), organizationId
- **Session:** Sessão de fotos, coverPhoto, participantes
- **Client:** CRM do cliente
- **Album:** Álbum de prova com laminas
- **SiteData:** Documento único com hero, about, faq, footer
- **Notification:** Notificações do admin
- **Subscription:** Plano e billing (Stripe)

---

## 🚀 DEPLOY NA VPS

### Checklist PRE-DEPLOY (faça ANTES de passar comandos ao usuário)
1. `git status` → sem mudanças não commitadas
2. `git log origin/main..HEAD` → sem commits sem push
3. Se houver commits sem push: `git push origin main` PRIMEIRO
4. Confirme que o remote está atualizado

**REGRA DE OURO:** A VPS puxa do GitHub. Se o código não está lá, a VPS roda versão antiga.

### Comandos na VPS (quando tudo está pronto)
```bash
cd /var/www/cz-saas
git pull
npm install
npm run build:css        # SE alterou HTML com Tailwind
pm2 reload ecosystem.config.js --env production
```

### Estrutura do Servidor VPS
```
Nginx (reverse proxy em 80/443)
├── /uploads/ → static (imagens)
├── /assets/  → static (CSS, JS)
├── /admin/js/ → static (módulos ES)
└── /* → Node.js (porta 3051)

PM2 (cluster com 2 instâncias)
├── cliquezoom-saas (ids 8/9) ← NOSSO
└── [outros processos — NÃO MEXER]
```

---

## 📋 PADRÕES DE CÓDIGO

### Nova Aba no Admin
1. Criar `admin/js/tabs/novaaba.js`
   ```javascript
   export async function renderNovaaba(container) {
     const dados = appState.appData.novaaba || {};
     container.innerHTML = `<div style="...">...</div>`;
     // Event listeners
   }
   ```
2. Adicionar botão em `admin/index.html`: `<div class="nav-item" data-tab="novaaba">`
3. Adicionar em `TAB_TITLES` do `app.js`: `novaaba: 'Nome da Aba'`
4. **Use SEMPRE CSS variables**, nunca Tailwind no admin

### Nova Rota Backend
1. Criar `src/routes/novarota.js` (CommonJS)
   ```javascript
   const express = require('express');
   const router = express.Router();
   const { authenticateToken } = require('../middleware/auth');
   
   router.post('/novo', authenticateToken, async (req, res) => {
     const item = await Model.create({
       ...req.body,
       organizationId: req.user.organizationId
     });
     res.json({ success: true, data: item });
   });
   
   module.exports = router;
   ```
2. Registrar em `server.js`: `app.use('/api', require('./routes/novarota'));`

### Novo Modelo Mongoose
- SEMPRE incluir `organizationId` (multi-tenancy)
- SEMPRE `{ timestamps: true }`

---

## ⚠️ ERROS COMUNS — NÃO REINTRODUZA

| Erro | Causa | Solução |
|------|-------|---------|
| Conteúdo desaparece no admin | CSS invisível (Tailwind no dark) | Use CSS variables sempre |
| Portfolio vazio no site | Classe arbitrária não compilada | Use `style="aspect-ratio:3/4;"` |
| Upload falha (413) | Arquivo grande demais | Verificar `client_max_body_size` Nginx |
| Preview em branco | Race condition no slug | Usar `await loadOrgSlug()` antes de renderizar |
| Rota retorna 404 em produção | Falta `authenticateToken` | Adicionar middleware de auth |
| Node.js cai | Exceção não tratada | Verificar logs: `pm2 logs` |

---

## 🔒 SEGURANÇA

- **Autenticação:** JWT (7 dias de expiração)
- **Senhas:** bcrypt com 10 rounds
- **Multi-tenancy:** Todas as queries filtradas por `organizationId`
- **Uploads:** Isolados por diretório `/uploads/{orgId}/`
- **Proteção de fotos:** Watermark visual + context menu bloqueado

---

## 📚 DOCUMENTAÇÃO COMPLEMENTAR

- **CLAUDE.md** — Instruções detalhadas para assistentes IA (LEIA PRIMEIRO)
- **ARCHITECTURE.md** — Decisões técnicas e padrões de arquitetura
- **skills/** — Contextos temáticos:
  - `builder-hero.md` — Customização do hero/capa
  - `builder-sessoes.md` — Sessões de clientes
  - `builder-portfolio.md` — Portfolio
  - `builder-templates.md` — Templates do site
  - `design-system.md` — Design tokens, componentes
  - `geral-site.md` — Site geral

---

## 📞 INFORMAÇÕES DE CONTATO

- **Proprietário:** Pacheco (pacheco@rhynoproject.com.br)
- **Domínio:** cliquezoom.com.br
- **VPS:** Contabo (Ubuntu 22+)
- **GitHub:** repositório privado

---

## ✅ CHECKLIST ANTES DE QUALQUER IMPLEMENTAÇÃO

- [ ] Testei localmente com `npm run dev`
- [ ] Novas rotas registradas em `server.js`
- [ ] Novas abas registradas em `admin/index.html` + `app.js`
- [ ] Novos modelos têm `organizationId` + `timestamps: true`
- [ ] Admin usa CSS variables (não Tailwind)
- [ ] Sem `alert()` ou `confirm()` (usar toast/confirm funções)
- [ ] Compilei CSS se alterei HTML: `npm run build:css`
- [ ] Commitei e fiz push para GitHub
- [ ] Executei checklist PRE-DEPLOY antes de instruir VPS

---

**Para começar:** Leia `CLAUDE.md`. Para detalhes arquiteturais: `ARCHITECTURE.md`. Para features específicas: consulte `skills/`.
