# ARCHITECTURE - Decisoes Tecnicas e Padroes

## Visao Geral da Arquitetura

```
                    Internet
                       |
                       v
                  Nginx (80/443)
                       |
         +-------------+-------------+
         |             |             |
    /uploads/     /assets/      /* (proxy)
    (static)      (static)         |
                                   v
                            Node.js/Express (:3002)
                                   |
                            MongoDB (local :27017)
```

### Stack Tecnologico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend Publico** | HTML + TailwindCSS compilado + Vanilla JS | Performance, SEO, sem build step complexo |
| **Frontend Admin** | Vanilla JS + ES Modules + Inline Styles | Carregamento dinamico de abas, dark mode seguro |
| **Frontend Cliente** | Vanilla JS (SPA minimalista) | Leve, responsivo, funciona em qualquer device |
| **Backend** | Node.js 22 + Express.js | Ecossistema vasto, async nativo, facil deploy |
| **Banco de Dados** | MongoDB (local) | Schema flexivel, documento unico para site data |
| **Infra** | VPS Contabo + Nginx + PM2 + Let's Encrypt | Custo-beneficio, controle total, uploads no disco |

---

## Principios Arquiteturais

### 1. Monolito Pragmatico
Um unico servidor Express serve tudo: API, admin, site publico, galeria do cliente. Sem microservicos, sem containers, sem complexidade desnecessaria. Quando precisar escalar, escalar verticalmente (VPS maior) antes de dividir.

### 2. Dualidade de Modulos
- **Backend (`src/`)**: CommonJS (`require`, `module.exports`)
- **Frontend Admin (`admin/js/`)**: ES Modules (`import`, `export`)
- **NUNCA** misturar. Essa regra e inviolavel.

### 3. Estilizacao Defensiva
- **Site publico**: TailwindCSS compilado (classes utilitarias)
- **Admin**: Inline styles exclusivamente (dark mode #111827)
- **Cliente**: CSS inline + classes minimas (temas futuros)

### 4. Multi-Tenancy por Subdomain
- Cada organizacao tem um `slug` unico
- Producao: `slug.seuapp.com.br` (subdomain)
- Desenvolvimento: `?_tenant=slug` (query parameter)
- Middleware `tenant.js` resolve org pelo subdomain/query
- Todos os dados filtrados por `organizationId`
- Uploads isolados: `/uploads/{orgId}/`

---

## Estrutura de Dados

### Documento Unico (SiteData)
O conteudo do site e armazenado em um unico documento MongoDB por organizacao. Isso simplifica: 1 request carrega tudo.

```
SiteData {
  organizationId    -> Organization._id
  hero              -> { title, subtitle, image, ... }
  about             -> { title, text, images }
  portfolio         -> [{ image, posX, posY, scale, ratio }]
  albums            -> [{ id, title, cover, photos }]
  studio            -> { title, description, photos, videoUrl }
  faq               -> { faqs: [{ question, answer }] }
  footer            -> { socialMedia, quickLinks, newsletter, copyright }
  maintenance       -> { enabled, title, message }
}
```

### Modelos Independentes
Modelos com CRUD proprio e volume de dados variavel usam collections separadas:

```
Organization    -> Dados da org, plano, perfil, logo, identidade visual, watermark
User            -> Email, senha (bcrypt), role, organizationId
Session         -> Sessao de fotos (galeria do cliente), coverPhoto
Client          -> CRM de clientes [FASE 5]
Album           -> Prova de album folheavel [FASE 8]
Notification    -> Notificacoes do admin
Newsletter      -> Inscritos na newsletter
Subscription    -> Plano e billing [FASE 12]
```

### Relacoes entre Modelos

```
Organization (1) ──── (*) User
Organization (1) ──── (*) Session
Organization (1) ──── (*) Client [FASE 5]
Organization (1) ──── (*) Album [FASE 8]
Organization (1) ──── (1) SiteData
Organization (1) ──── (*) Notification
Organization (1) ──── (*) Newsletter
Organization (1) ──── (1) Subscription [FASE 12]
Client (1) ──── (*) Session [FASE 5]
Client (1) ──── (*) Album [FASE 8]
```

---

## Padroes de Backend

### Padrao de Rota (Express Router)

```javascript
// src/routes/recurso.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Publico (usa tenant middleware para organizationId)
router.get('/recurso', async (req, res) => {
  const data = await Model.find({ organizationId: req.organizationId });
  res.json({ success: true, data });
});

// Protegido (usa JWT para organizationId)
router.post('/recurso', authenticateToken, async (req, res) => {
  const item = await Model.create({
    ...req.body,
    organizationId: req.user.organizationId
  });
  res.json({ success: true, data: item });
});

module.exports = router;
```

### Padrao de Upload

```javascript
// Uploads SEMPRE isolados por organizacao
const uploadDir = path.join('uploads', orgId, subdir);

// Retorno SEMPRE com path relativo incluindo orgId
return { url: `/uploads/${orgId}/${subdir}/${filename}` };
```

### Padrao de Notificacao

```javascript
const { notify } = require('../utils/notifications');
await notify(type, sessionId, sessionName, message, organizationId);
```

---

## Padroes de Frontend Admin

### Padrao de Tab (Aba)

Cada aba e um ES Module em `admin/js/tabs/` que exporta uma funcao `render`:

```javascript
// admin/js/tabs/nomeaba.js
import { appState, saveAppData } from '../state.js';

export async function renderNomeaba(container) {
  const dados = appState.appData.nomeaba || {};

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Titulo</h2>
      <!-- SEMPRE inline styles dark mode -->
    </div>
  `;

  // Event listeners via querySelector (nunca onclick inline para funcoes complexas)
  container.querySelector('#saveBtn').onclick = async () => { ... };
}
```

### Paleta de Cores Admin

| Elemento | Cor |
|----------|-----|
| Fundo pagina | `#111827` |
| Fundo cards | `#1f2937` |
| Fundo inputs | `#111827` |
| Borda | `#374151` |
| Texto principal | `#f3f4f6` |
| Texto secundario | `#d1d5db` |
| Botao primario | `#2563eb` |
| Botao sucesso | `#16a34a` |
| Botao perigo | `#ef4444` |
| Texto link | `#60a5fa` |

### Padrao de Tab que usa API Propria (nao saveAppData)

Tabs como Clientes, Sessoes, Albuns tem seus proprios modelos e usam fetch direto:

```javascript
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

const clientes = await apiGet('/api/clients');
await apiPost('/api/clients', { name, email });
```

---

## Padroes de Frontend Cliente

### Galeria do Cliente
- SPA minimalista em `cliente/index.html` + `cliente/js/gallery.js`
- Login por codigo de acesso (ou cadastro, futuro)
- Polling 15s para detectar mudancas (reabertura, entrega)
- Optimistic UI para selecao (atualiza visual antes do servidor confirmar)
- Anti-copia: context menu bloqueado, user-select none, pointer-events none

### PWA (Futuro - FASE 6)
- `manifest.json` dinamico por sessao
- Service Worker para cache offline
- Banner "Adicionar a tela inicial"

---

## Decisoes Tecnicas por Feature

### Watermark Customizavel (FASE 2)
**Decisao**: Aplicar watermark via CSS overlay no frontend, nao processar imagem no backend.
**Justificativa**: Nao reprocessar fotos economiza CPU e disco. O watermark e puramente visual. Para protecao real, as fotos originais so sao acessiveis apos entrega.
```
Foto exibida = imagem comprimida + CSS overlay (watermark)
Foto entregue = imagem original sem overlay
```

### Entrega em Alta (FASE 4)
**Decisao**: Manter duas versoes de cada foto: thumb (comprimida, 1200px) e original.
**Justificativa**: Galeria carrega rapido com thumbs. Download entrega original.
```
uploads/{orgId}/sessions/thumb-{filename}.jpg   -> galeria (comprimida)
uploads/{orgId}/sessions/{filename}.jpg         -> download (original)
```

### Download ZIP (FASE 4)
**Decisao**: Gerar ZIP via streaming (nao salvar no disco).
**Justificativa**: ZIP temporario ocuparia disco desnecessariamente.
```javascript
const archiver = require('archiver');
const archive = archiver('zip', { zlib: { level: 5 } });
archive.pipe(res); // stream direto para o response
```

### Multi-Selecao (FASE 7)
**Decisao**: Embedded array de participantes dentro do Session, nao collection separada.
**Justificativa**: Participantes sao parte da sessao. Nao ha necessidade de queries independentes.

### Prova de Album (FASE 8)
**Decisao**: Modelo separado (Album), nao reutilizar Session.
**Justificativa**: Fluxo totalmente diferente (laminas vs fotos, aprovacao vs selecao, versionamento).

### Billing (FASE 12)
**Decisao**: Integrar com Stripe (internacional) ou MercadoPago (Brasil).
**Justificativa**: MercadoPago para Pix/boleto brasileiro. Stripe para cartao internacional.
**Alternativa**: Asaas (API brasileira focada em recorrencia).

---

## Escalabilidade

### Fase Atual (1-100 tenants)
- VPS unica (Contabo)
- MongoDB local
- Nginx como reverse proxy
- PM2 com 1-2 instancias

### Fase Futura (100-1000 tenants)
- Upgrade VPS (mais CPU/RAM/disco)
- MongoDB replica set (read replicas)
- CDN para assets estaticos (CloudFlare)
- Object storage para uploads (MinIO ou S3-compatible)
- PM2 cluster mode (multiplas instancias Node)

### Fase Avancada (1000+ tenants)
- Multiplas VPS com load balancer
- MongoDB Atlas (managed)
- CDN completo (CloudFront/CloudFlare)
- Queue para processamento pesado (ZIP, resize)
- Redis para cache de tenant e sessoes

---

## Seguranca

### Autenticacao
- JWT com `userId`, `organizationId`, `role`
- Tokens expiram em 7 dias
- Senha hashada com bcrypt (10 rounds)
- Login por email + senha

### Autorizacao
- Middleware `authenticateToken` em todas as rotas admin
- Middleware `tenant` para rotas publicas (resolve org pelo subdomain)
- Rotas de superadmin restritas por `role === 'superadmin'`

### Dados
- Todas as queries filtradas por `organizationId`
- Uploads isolados por diretorio: `/uploads/{orgId}/`
- Indices compostos: `{ organizationId, campo }`

### Protecao de Fotos
- Watermark visual (CSS overlay)
- Context menu bloqueado
- User-select: none
- Pointer-events: none nas imagens
- Fotos originais so acessiveis com codigo + status "delivered"

---

## Deploy

### Processo
```bash
# Local
git add . && git commit -m "descricao" && git push

# VPS (via SSH)
cd /var/www/fs-saas
git pull
npm install
npm run build:css  # se alterou HTML com Tailwind
pm2 restart fsfotografias-saas
```

### Checklist Pre-Deploy
- [ ] Testado localmente com `npm run dev`
- [ ] Novas rotas registradas no `server.js`
- [ ] Novas abas registradas no `admin/index.html`
- [ ] Novos modelos com `timestamps: true`
- [ ] Dados filtrados por `organizationId`
- [ ] CSS compilado se alterou HTML publico

---

*Ultima atualizacao: 15/02/2026 - Fase 1 (Perfil + Identidade Visual) concluida*