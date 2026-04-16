# 💎 CliqueZoom — Obsidian Master Sync
> **Última Atualização:** 2026-04-16
> **Objetivo:** Fonte de verdade absoluta para o desenvolvimento e documentação no Obsidian.

---

## 📋 0. Status e Tarefas Atuais
- [ ] **Aprovação por E-mail:** Investigar fluxo de aprovação em 24h úteis.
    - [ ] Verificar custos e ferramentas necessárias.
    - [ ] Definir se haverá integração com software específico.
- [ ] **Validação de Soluções:** Confirmar se as funcionalidades atuais do app atendem plenamente à demanda.
- [ ] **Atualização de Fluxo:** Assim que a aprovação por e-mail for implementada, remover a menção de "aguardar 24h" na seção "Como Funciona".

## 🔗 1. Acessos Rápidos (Ambiente Produção)
> [!IMPORTANT] Credenciais de Administração
> - **Landing Page:** [www.cliquezoom.com.br](http://www.cliquezoom.com.br)
> - **Admin SaaS (Superadmin):** `/saas-admin` | `pacheco@rhynoproject.com.br` / `admin*`
> - **Painel do Fotógrafo:** `/admin` | `ricardopacheco.nunes59@gmail.com` / `teste*`

---

## 🏗️ 2. Arquitetura e Stack
**Modo Builder (Site Editor):**
- **Divisão:** `#builder-props` (360px Sidebar) + `#builder-preview` (Iframe).
- **Comunicação:** Snapshots via `postMessage` (`cz_preview`) para `shared-site.js`.

**Tech Stack:**
- **Backend:** Node.js 22 + Express (CommonJS) — porta **3051**.
- **Admin:** Vanilla JS ES Modules + CSS Variables (Baseado em GitHub Dark / Google Stitch).
- **Public:** Vanilla JS + TailwindCSS (Compilado).
- **Storage:** Local Disk (`/uploads/{orgId}/`) — Servido via Nginx.

**Deploy:**
```
Nginx (80/443)
  ├── /uploads/, /assets/, /admin/js/  → static
  └── /*  → localhost:3051 (proxy Node.js)

PM2 (NÃO mexer nos outros processos):
  cliquezoom-saas (ids 8/9) → porta 3051  ← NOSSO
  fsfotografias (id 2), crm-backend (id 1), vps-hub (id 3)  ← NÃO MEXER
```

---

## 🔐 3. Regras de Ouro (MANDATÓRIO)

### 3.1 Dualidade de Módulos — INVIOLÁVEL
- **Backend (`src/`)** → CommonJS: `require()` e `module.exports`. **NUNCA** `import/export`.
- **Admin (`admin/js/`)** → ES Modules: `import/export`. **NUNCA** `require()` ou `module.exports`.

### 3.2 Padrão Auto-Save (Builder)
Não use debounces. O salvamento deve ser direto nos inputs:
```javascript
// Exemplo no HTML/JS do Sidebar
import { apiPut } from '../utils/api.js';

oninput="appState.siteConfig.heroTitle = this.value; await saveSiteConfig();"

async function saveSiteConfig() {
  try {
    const response = await apiPut('/api/site/admin/config', { 
      siteConfig: appState.siteConfig 
    });
    if (response.ok) window.showToast('Salvo!', 'success');
  } catch (err) {
    window.showToast('Erro ao salvar', 'error');
  }
}
```

**Exemplos reais:** Ver `admin/js/tabs/meu-site.js`, `admin/js/tabs/portfolio.js`, `admin/js/tabs/sobre.js` para padrão implementado.

### 3.3 Padrão de Upload
Toda imagem deve ser processada antes do envio:
1. **Compressão:** Via Canvas em `compressImage()`.
2. **Progresso:** Via `XMLHttpRequest` com visual feedback.
3. **Servidor:** Deve responder `{ ok: true, url: '...' }`.

### 3.4 Estilização Admin
- **NUNCA** use Tailwind classes no Admin (elas não existem no contexto Dark/Dynamic).
- **SEMPRE** use CSS Variables: `style="color: var(--text-primary);"`

### 3.5 Alertas e Confirmações
- **NUNCA** use `alert()` ou `confirm()` no admin.
  - Use `window.showToast(msg, type)` e `window.showConfirm(msg, opts)` de `admin/js/utils/toast.js`.
- **NUNCA** use `alert()` ou `confirm()` no saas-admin.
  - Use `saasToast(msg, type)` e `saasConfirm(msg, opts)` definidos em `saas-admin/js/app.js`.

---

## 🎨 4. Design System (Stitch/GitHub Dark)

| Token | Cor | Variável CSS |
| :--- | :--- | :--- |
| **Background Base** | `#0d1117` | `var(--bg-base)` |
| **Surface** | `#161b22` | `var(--bg-surface)` |
| **Elevated** | `#1c2128` | `var(--bg-elevated)` |
| **Hover** | `#21262d` | `var(--bg-hover)` |
| **Border** | `#30363d` | `var(--border)` |
| **Text Primary** | `#e6edf3` | `var(--text-primary)` |
| **Text Secondary** | `#8b949e` | `var(--text-secondary)` |
| **Text Muted** | `#484f58` | `var(--text-muted)` |
| **Accent** | `#2f81f7` | `var(--accent)` |
| **Accent Hover** | `#1f6feb` | `var(--accent-hover)` |
| **Success** | `#3fb950` | `var(--green)` |
| **Error** | `#f85149` | `var(--red)` |
| **Warning** | `#d29922` | `var(--yellow)` |
| **Purple** | `#bc8cff` | `var(--purple)` |
| **Orange** | `#ffa657` | `var(--orange)` |

---

## 🚀 5. Deploy VPS (Contabo)

**Checklist PRE-DEPLOY (antes de passar comandos ao usuário):**
1. `git status` — sem mudanças não commitadas relevantes.
2. `git log origin/main..HEAD --oneline` — sem commits sem push.
3. Se tiver commits pendentes: `git push origin main` ANTES de mandar o usuário rodar `git pull`.
4. Só depois confirmar que o remote está atualizado.

**O que rodar na VPS por tipo de mudança:**

| O que mudou | Comandos na VPS |
|---|---|
| Só backend (`src/`) | `git pull` → `npm install` → `pm2 reload ecosystem.config.js --env production` |
| Só frontend sem Tailwind | `git pull` (Nginx serve static — sem restart) |
| Frontend com novas classes Tailwind | `npm run build:css` local → commit → `git pull` na VPS |
| Backend + frontend | Tudo acima na ordem |

**Comandos na VPS (sempre em linhas separadas):**
```bash
cd /var/www/cz-saas
git pull
npm install
pm2 reload ecosystem.config.js --env production
```

Verificar logs: `pm2 logs cliquezoom-saas --lines 30 --nostream`

---

## ⚠️ 6. Erros Comuns e Soluções

| Erro | Causa | Solução |
| :--- | :--- | :--- |
| Conteúdo invisível no Admin | Falta de `var(--text-primary)` | Nunca usar classes Tailwind em tabs do admin |
| 404 em Rota Nova | Não registrada em `server.js` ou falta `authenticateToken` | Registrar com `app.use('/api', require('./routes/arquivo'))` |
| Upload falhando | `client_max_body_size` no Nginx ou permissões em `/uploads` | Verificar config Nginx e permissões da pasta |
| Preview não atualiza | Iframe não disparou o listener `cz_preview` | Verificar se `shared-site.js` está ouvindo o postMessage |
| Preview em branco ao abrir Meu Site | Race condition no slug | Nunca chamar `builderLoadPreview` sem `await loadOrgSlug()` |
| Preview mostra "Site em construção" | `siteEnabled=false` bloqueia em produção | Sempre usar `_preview=1` no iframe do builder |
| Seções do site fora de ordem | `appendChild` em vez de `insertBefore` | Reordenação sempre com `insertBefore(el, siteFooter)` |
| App não inicia | MongoDB desligado | `sudo systemctl start mongod` |
| 502 Bad Gateway | Node.js caiu | `pm2 reload ecosystem.config.js --env production` + ver logs |

---

## 📚 7. Documentação Detalhada (Skills)
Para detalhes específicos de implementação de cada módulo, consulte:

**⚙️ Core & Setup:**
- `geral-site.md` — Configuração geral do site (Builder mode, sub-abas, postMessage)
- `design-system.md` — Tokens de design e CSS variables

**🎨 Templates & Estilo:**
- `builder-templates.md` — Estrutura dos 5 templates do site (elegante, minimalista, moderno, escuro, galeria)
- `builder-personalizar.md` — Customização de cores, fontes, layout

**🖼️ Módulos Visuais:**
- `builder-hero.md` — Seção Hero (Capa)
- `builder-portfolio.md` — Portfólio de fotos
- `builder-estudio.md` — Sobre o estúdio
- `builder-sobre.md` — Seção Sobre
- `builder-forms.md` — Formulários e contato

**📸 Negócio & Conteúdo:**
- `builder-sessoes.md` — Gerenciamento de sessões e galeria do cliente
- `albums-prova.md` — Albums de prova e aprovação
- `billing.md` — Planos e assinatura (Stripe)

---

> [!TIP]
> **Dica para o Obsidian:** Use o plugin "Metadata Menu" ou "Dataview" para rastrear o status de cada módulo. Este arquivo deve ser a primeira leitura de qualquer nova sessão de desenvolvimento.
