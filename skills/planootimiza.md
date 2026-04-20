# Diagnóstico de Performance — CliqueZoom SaaS

> Análise baseada no código-fonte atual. Gargalos ordenados por impacto.

---

## 🔴 Problemas Críticos (Alto Impacto)

### 1. `initApp()` faz 3 chamadas de API sequenciais no login

**Arquivo:** `admin/js/app.js` → `postLoginSetup()` + `initApp()`

```js
// ATUAL — Sequencial (cada um espera o anterior terminar)
await loadAppData();           // GET /api/site-data
loadOrgSlug();                 // GET /api/organization/profile  ← sem await, mas dispara junto
loadSidebarStorage();          // GET /api/site/admin/storage    ← sem await, mas dispara junto
startNotificationPolling();
await switchTab('dashboard');  // GET /api/... (dependente do tab)
```

**Problema:** `loadAppData()` é `await`-ado antes de tudo. Enquanto ele termina, o usuário vê tela em branco. Só depois `switchTab('dashboard')` começa, que dispara mais uma chamada de API.

**Ação:** Paralelizar as chamadas independentes com `Promise.all()`.

---

### 2. `shared-site.js` tem **1.328 linhas** — arquivo monolítico não cacheado eficientemente

**Arquivo:** `site/templates/shared-site.js`

O script inteiro é baixado e executado sincronicamente antes de qualquer conteúdo aparecer no site público. Não há `defer`, lazy-loading de seções ou code-splitting.

**Ação:** Adicionar `defer` no `<script>` do template e considerar dividir o arquivo por seção.

---

### 3. `GET /site` faz **2 queries ao MongoDB por requisição**

**Arquivo:** `src/server.js` → rota `GET /site`

```js
// Query 1: busca orgId pelo slug
const org = await Organization.findOne({ slug: subdomain });

// Query 2: busca siteTheme separadamente
const org = await Organization.findById(orgId).select('siteTheme');
```

Duas queries para servir um único HTML. Isso atrasa o Time to First Byte (TTFB) do site público.

**Ação:** Unificar em uma única query selecionando `slug siteTheme` ao mesmo tempo.

---

### 4. `loadSidebarStorage()` calcula tamanho de pastas **sincronicamente no I/O**

**Arquivo:** `src/routes/site.js` → `GET /site/admin/storage`

```js
function calcSize(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { // ← SÍNCRONO
    // ...
    storageBytes += fs.statSync(fp).size; // ← SÍNCRONO
  }
}
```

`fs.readdirSync` e `fs.statSync` bloqueiam o event loop do Node.js enquanto calculam. Isso congela **todas as requisições** durante o cálculo, incluindo as do site público.

**Ação:** Migrar para `fs.promises.readdir` + `fs.promises.stat` (async).

---

## 🟡 Problemas Moderados

### 5. Rota `GET /api/site/config` carrega o documento **inteiro da Organization** via `.toObject()`

**Arquivo:** `src/routes/site.js` → linha 30

```js
const result = org.toObject(); // serializa TUDO, incluindo siteContent com fotos/álbuns
```

Se o fotógrafo tiver portfólio grande (100+ fotos), esse objeto pode pesar vários MBs e atrasar a renderização do site público.

**Ação:** Usar `.lean()` em vez de `.toObject()` (mais rápido); avaliar paginação de fotos pesadas.

---

### 6. `tailwind.css` completo sendo carregado no admin

**Arquivo:** `admin/index.html` → linha 12

```html
<link rel="stylesheet" href="/assets/css/tailwind.css">
```

O CSS do Tailwind compilado pode estar muito grande (dependendo do purge). O admin usa CSS variables inline — o Tailwind está sendo carregado mas pouco usado dentro das tabs.

**Ação:** Verificar o tamanho do `tailwind.css` e confirmar se o purge está configurado corretamente.

---

### 7. Fonte `Material Symbols Outlined` carregada com **range de variação amplo**

**Arquivo:** `admin/index.html` → linha 11

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```

O range `opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200` força o download da **fonte variável inteira**. Isso adiciona ~100–300 KB de fonte antes do admin renderizar ícones.

**Ação:** Fixar valores ao invés de ranges: `opsz,wght,FILL,GRAD@24,400,0,0`.

---

### 8. Polling de notificações começa **imediatamente no login**

**Arquivo:** `admin/js/app.js` → `postLoginSetup()` → `startNotificationPolling()`

O polling dispara junto com o carregamento do dashboard, adicionando requisições paralelas desnecessárias nos primeiros segundos.

**Ação:** Adicionar delay de 3–5 segundos antes do primeiro poll (`setTimeout(startNotificationPolling, 5000)`).

---

### 9. `server.js` usa `express.json({ limit: '50mb' })`

**Arquivo:** `src/server.js` → linha 12

```js
app.use(express.json({ limit: '50mb' }));
```

Esse limite altíssimo afeta **todas as rotas**, incluindo as que nunca recebem arquivos grandes. O Node aloca buffer para todo payload.

**Ação:** Manter `50mb` apenas nas rotas de upload. Reduzir para `1mb` no middleware global.

---

## 🟢 Oportunidades de Otimização (Baixo Impacto, Fácil de Implementar)

### 10. Falta cache HTTP nos arquivos estáticos do site

O Express serve `/uploads`, `/assets`, `/site` sem cabeçalhos de cache explícitos. O Nginx na VPS provavelmente compensa isso, mas em dev todas as imagens são re-baixadas.

**Ação (VPS):** Confirmar que o bloco do Nginx tem `expires 30d` para `/uploads` e `/assets`.

### 11. `resolveTenant` sem cache em rotas públicas do site

**Arquivo:** `src/middleware/tenant.js` — o arquivo menciona "Cache com TTL de 5 minutos" na skill, mas confirmar se está ativo em produção.

**Ação:** Verificar se o cache do tenant está funcionando. Se não, cada request ao site público faz 1 query extra ao MongoDB.

---

## Resumo de Ações Prioritárias

| # | Ação | Arquivo | Impacto |
|---|------|---------|---------|
| 1 | Paralelizar chamadas de API no login com `Promise.all` | `app.js` | 🔴 Alto |
| 2 | Adicionar `defer` no `shared-site.js` dos templates | `site/templates/*/index.html` | 🔴 Alto |
| 3 | Unificar as 2 queries MongoDB em `GET /site` | `server.js` | 🔴 Alto |
| 4 | Migrar `calcSize()` para async (`fs.promises`) | `src/routes/site.js` | 🔴 Alto |
| 5 | Fixar parâmetros da fonte Material Symbols | `admin/index.html` | 🟡 Médio |
| 6 | Reduzir `express.json` limit global para `1mb` | `server.js` | 🟡 Médio |
| 7 | Delay no início do notification polling | `app.js` | 🟡 Médio |
| 8 | Verificar purge do Tailwind + confirmar cache Nginx | VPS config | 🟢 Baixo |

---

## Como Diagnosticar na VPS Agora

```bash
# Ver logs de tempo de resposta e erros
pm2 logs cliquezoom-saas --lines 50 --nostream

# Ver uso de CPU/memória do processo
pm2 monit

# Checar status do MongoDB
sudo systemctl status mongod

# Testar TTFB do site público (substitua o slug)
curl -o /dev/null -s -w "%{time_starttransfer}\n" https://seuslug.cliquezoom.com.br/site
```
