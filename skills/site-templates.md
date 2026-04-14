# Skill: Sistema de Templates do Site

Leia este arquivo ao trabalhar em `site/templates/`, `site/templates/shared-site.js`, ou na sub-aba "Geral" do Meu Site.

---

## Como funciona

O site do fotografo (`/site`) serve dinamicamente o template escolhido:

```javascript
// src/server.js — DEVE vir ANTES do express.static('/site')
app.get('/site', async (req, res) => {
  // 1. Resolve tenant (?_tenant=slug ou subdominio)
  // 2. Busca Organization.siteTheme no MongoDB
  // 3. Serve /site/templates/{theme}/index.html
  // 4. Fallback para 'elegante'
});
```

---

## Templates disponiveis

| Template | Estilo |
|----------|--------|
| `elegante` | Classico dourado/serif (Playfair Display) |
| `minimalista` | Clean P&B, grid 2 colunas, muito espaco |
| `moderno` | Azul/gradientes, assimetrico, floating cards |
| `escuro` | Dark mode (#0a0a0a), laranja (#ff9500), fullscreen |
| `galeria` | Masonry grid Pinterest-style, foco em fotos |

---

## shared-site.js — O que faz

1. Detecta tenant (com suporte a `_preview=1`)
2. Chama `/api/site/config` para buscar dados
3. Preenche elementos do DOM pelos IDs padrao
4. Oculta secoes nao ativadas (`siteSections`)
5. Reordena secoes antes do `#siteFooter` com `insertBefore` (nunca `appendChild`)
6. Escuta `postMessage { type: 'cz_preview', data }` do admin para atualizar em tempo real
7. Envia `{ type: 'cz_preview_ready' }` ao parent quando carregado

---

## IDs padrao esperados pelos templates

- `#heroTitle`, `#heroSubtitle`, `#heroBg`, `#heroOverlay` — Hero
- `#sobreTitle`, `#sobreText`, `#sobreImage` — Sobre
- `#portfolioGrid` — Grid de fotos do portfolio
- `#servicosGrid` — Lista de servicos
- `#depoimentosTrack` — Depoimentos
- `#contatoTitle`, `#contatoText`, `#contactForm` — Contato
- `#faqList` — FAQ
- `#navLogo`, `#navLinks` — Navegacao
- `#siteNav`, `#siteFooter` — Referencias de posicionamento

---

## Como adicionar novo template

1. Criar `site/templates/novo-tema/index.html` com os IDs padrao acima
2. Criar `site/templates/novo-tema/css/style.css`
3. Adicionar `<script src="/site/templates/shared-site.js"></script>` no HTML
4. Adicionar no array de templates em `admin/js/tabs/meu-site.js`
5. Adicionar como opcao valida em `Organization.siteTheme` (enum no modelo)

---

## Middleware Tenant

`src/middleware/tenant.js` resolve `organizationId` para rotas publicas:
- `_preview=1` → aceita `_tenant` em producao, ignora `isActive`
- dev/localhost → aceita `_tenant` livremente
- producao → usa subdominio do hostname
- fallback → `OWNER_SLUG` do `.env`

Aplicado em: `/api/client`, `/api/organization/public`, `/api/site/config`, `/api/site/depoimento`.
