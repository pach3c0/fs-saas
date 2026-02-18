# INSTRUÇÕES PARA IA - Implementação das Fases Restantes

Este documento contém instruções **ultra-detalhadas** para que qualquer IA (Gemini, ChatGPT, etc.) possa implementar as fases faltantes do projeto **FS SaaS** de forma autônoma e completa.

---

## 📋 CONTEXTO DO PROJETO

**O que é**: SaaS para fotógrafos profissionais (concorrente do PicSize)
**Stack**: Vanilla JS + Express.js + MongoDB + VPS
**Arquitetura**: Multi-tenant (cada fotógrafo = 1 Organization)
**Status atual**: ~75% concluído (ROADMAP.md tem detalhes)

### Regras Críticas (NUNCA QUEBRE):

1. **Backend = CommonJS** (`require`, `module.exports`)
2. **Admin = ES Modules** (`import`, `export`)
3. **Admin usa INLINE STYLES** (não classes Tailwind no JS)
4. **Sempre filtrar por `organizationId`** em queries
5. **Upload salva em `/uploads/{orgId}/`** (local, não S3)
6. **Ler CLAUDE.md antes de começar** (padrões, arquitetura, exemplos)

### Estrutura de Pastas (resumo):

```
admin/js/tabs/       # Abas do painel (ES Modules, inline styles)
src/models/          # Mongoose schemas (CommonJS, timestamps: true)
src/routes/          # Express routes (CommonJS, authenticateToken)
cliente/js/          # Galeria do cliente (Vanilla JS)
site/templates/      # 5 templates de site profissional
```

---

## 🎯 FASE 8 - PROVA DE ÁLBUM FOLHEÁVEL

### Objetivo
Criar um sistema de montagem de álbuns de casamento/formatura onde o fotógrafo arrasta fotos em layouts pré-definidos (2 fotos, 3 fotos, etc.) e o cliente visualiza o álbum folheável para aprovar antes da impressão.

### Referência Visual
- Similar ao Canva (arrastar fotos em molduras)
- Similar ao PicSize Prova de Álbum
- Flip book animado para o cliente

### Checklist de Implementação

#### 8.1 - Modelo de Dados (Backend)

**Arquivo**: `src/models/Album.js` (CRIAR NOVO)

```javascript
const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'sent', 'approved', 'rejected'], default: 'draft' },

  // Páginas do álbum
  pages: [{
    pageNumber: Number,
    layoutType: String,  // 'single', 'double-horizontal', 'double-vertical', 'triple', 'quad', 'custom'
    photos: [{
      photoId: String,  // ID da foto na sessão
      photoUrl: String,
      position: Number,  // 0, 1, 2, 3 (posição no layout)
      posX: { type: Number, default: 50 },  // Ajuste de enquadramento
      posY: { type: Number, default: 50 },
      scale: { type: Number, default: 1 }
    }]
  }],

  // Configurações
  coverPhoto: String,
  size: { type: String, default: '30x30cm' },  // Tamanho do álbum
  totalPages: { type: Number, default: 20 },

  // Aprovação do cliente
  accessCode: { type: String, required: true, unique: true },
  approvedAt: Date,
  clientComments: String

}, { timestamps: true });

module.exports = mongoose.model('Album', AlbumSchema);
```

**⚠️ IMPORTANTE**:
- Sempre incluir `timestamps: true`
- Sempre indexar `organizationId`
- Gerar `accessCode` único (6 dígitos)

#### 8.2 - Rotas da API (Backend)

**Arquivo**: `src/routes/albums.js` (CRIAR NOVO)

**Rotas Admin** (com `authenticateToken`):
- `GET /api/albums` - Lista álbuns do fotógrafo
- `POST /api/albums` - Cria álbum (body: sessionId, name)
- `GET /api/albums/:id` - Detalhes do álbum
- `PUT /api/albums/:id` - Atualiza álbum (páginas, fotos)
- `DELETE /api/albums/:id` - Deleta álbum
- `PUT /api/albums/:id/pages` - Atualiza uma página específica
- `POST /api/albums/:id/send` - Envia para aprovação do cliente (status=sent)

**Rotas Cliente** (sem auth, só accessCode):
- `POST /api/client/album/verify-code` - Verifica código de acesso
- `GET /api/client/album/:id?code=X` - Carrega álbum para visualização
- `POST /api/client/album/:id/approve` - Cliente aprova álbum
- `POST /api/client/album/:id/reject` - Cliente rejeita (com comentários)

**Exemplo de rota**:

```javascript
const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');

// Admin: Criar álbum
router.post('/albums', authenticateToken, async (req, res) => {
  try {
    const { sessionId, name } = req.body;

    // Validar que sessão pertence ao fotógrafo
    const session = await Session.findOne({
      _id: sessionId,
      organizationId: req.user.organizationId
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    // Gerar código de acesso único
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const album = new Album({
      organizationId: req.user.organizationId,
      sessionId,
      name,
      accessCode,
      pages: []
    });

    await album.save();
    res.json({ success: true, album });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cliente: Verificar código
router.post('/client/album/verify-code', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const album = await Album.findOne({ accessCode }).populate('sessionId');
    if (!album) return res.status(404).json({ error: 'Código inválido' });

    res.json({
      success: true,
      albumId: album._id,
      name: album.name,
      status: album.status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Registrar no `src/server.js`**:
```javascript
app.use('/api', require('./routes/albums'));
```

#### 8.3 - Aba Admin (Frontend)

**Arquivo**: `admin/js/tabs/albuns.js` (ATUALIZAR EXISTENTE)

**Funcionalidades**:

1. **Lista de Álbuns**:
   - Tabela com: Nome, Sessão, Status, Data, Ações
   - Botão "Criar Álbum" → modal com select de sessão

2. **Editor de Álbum** (tela principal):
   - Barra lateral esquerda: Lista de layouts disponíveis (arrastar para adicionar página)
   - Centro: Canvas com páginas do álbum (scroll vertical)
   - Barra lateral direita: Fotos da sessão (arrastar para preencher molduras)

3. **Layouts Pré-definidos**:
```javascript
const layouts = {
  'single': { name: '1 Foto', slots: 1, grid: '1fr' },
  'double-horizontal': { name: '2 Fotos Horizontal', slots: 2, grid: '1fr 1fr' },
  'double-vertical': { name: '2 Fotos Vertical', slots: 2, grid: '1fr', rows: '1fr 1fr' },
  'triple': { name: '3 Fotos', slots: 3, grid: '1fr 1fr 1fr' },
  'quad': { name: '4 Fotos', slots: 4, grid: '1fr 1fr', rows: '1fr 1fr' }
};
```

4. **Drag & Drop**:
   - HTML5 Drag & Drop API
   - Arrastar layout → adiciona nova página
   - Arrastar foto → preenche slot vazio
   - Clicar em foto → abre photo editor (ajustar crop)

5. **Botões de Ação**:
   - "Salvar Rascunho" → `PUT /api/albums/:id`
   - "Enviar para Cliente" → `POST /api/albums/:id/send` → gera link + copia
   - "Visualizar como Cliente" → abre `/album/preview/:id?code=X`

**Exemplo de estrutura HTML** (inline styles dark mode):

```javascript
export async function renderAlbuns(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; justify-content:space-between;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Prova de Álbuns</h2>
        <button id="createAlbumBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
          + Criar Álbum
        </button>
      </div>

      <!-- Lista de álbuns ou editor -->
      <div id="albumsContainer"></div>
    </div>
  `;

  // Carregar lista de álbuns
  const albums = await apiGet('/api/albums');
  renderAlbumsList(albums);

  // Event listeners...
}
```

**⚠️ CRÍTICO**:
- Usar `apiGet`, `apiPost`, `apiPut` de `../utils/api.js`
- SEMPRE usar inline styles (background, color, padding, etc.)
- NÃO usar classes Tailwind no JavaScript

#### 8.4 - Visualizador Cliente (Frontend)

**Arquivo**: `album/index.html` (CRIAR NOVO DIRETÓRIO `album/`)

**Funcionalidades**:
- Flip book animado (CSS 3D transforms)
- Navegação: setas, swipe touch, teclado
- Botões: "Aprovar Álbum", "Solicitar Alteração"
- Contador de páginas: "Página 3 de 20"

**Arquivo**: `album/js/viewer.js` (CRIAR NOVO)

**Tecnologias**:
- CSS 3D Transforms para efeito de virar página
- Intersection Observer para lazy load de páginas
- Touch events para swipe mobile

**Exemplo de estrutura**:

```javascript
let currentPage = 0;
let albumData = {};

async function loadAlbum(albumId, code) {
  const res = await fetch(`/api/client/album/${albumId}?code=${code}`);
  albumData = await res.json();
  renderPages();
}

function renderPages() {
  const container = document.getElementById('albumPages');
  container.innerHTML = albumData.pages.map((page, idx) => `
    <div class="album-page ${idx === currentPage ? 'active' : ''}" data-page="${idx}">
      <div class="page-content" style="display:grid; grid-template-columns:${getLayoutGrid(page.layoutType)}; gap:1rem;">
        ${page.photos.map(photo => `
          <img src="${photo.photoUrl}" style="width:100%; height:100%; object-fit:cover; object-position:${photo.posX}% ${photo.posY}%; transform:scale(${photo.scale});">
        `).join('')}
      </div>
    </div>
  `).join('');
}

function nextPage() {
  if (currentPage < albumData.pages.length - 1) {
    currentPage++;
    updateView();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    updateView();
  }
}
```

**Registrar rota no `src/server.js`**:
```javascript
app.get('/album/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../album/index.html'));
});
```

#### 8.5 - Testes

**Fluxo completo de teste**:

1. Admin cria álbum vinculado a uma sessão
2. Admin arrasta layouts e fotos, monta 5 páginas
3. Admin clica "Enviar para Cliente"
4. Cliente abre link com código de acesso
5. Cliente navega pelas páginas (setas, swipe)
6. Cliente aprova ou solicita alteração
7. Admin vê notificação de aprovação/rejeição

**Comandos de teste**:
```bash
# Criar álbum via API
curl -X POST http://localhost:3051/api/albums \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"...","name":"Álbum Casamento João"}'

# Verificar código cliente
curl -X POST http://localhost:3051/api/client/album/verify-code \
  -H "Content-Type: application/json" \
  -d '{"accessCode":"ABC123"}'
```

---

## 🌐 FASE 10 - DOMÍNIO PRÓPRIO

### Objetivo
Permitir que cada fotógrafo use seu próprio domínio personalizado (ex: `www.fotografojose.com.br`) em vez de subdomain (`jose.fsfotografias.com.br`).

### Referência
- Similar ao Vercel/Netlify custom domains
- DNS CNAME apontando para a VPS
- Wildcard SSL automático (Let's Encrypt)

### Checklist de Implementação

#### 10.1 - Modelo de Dados

**Arquivo**: `src/models/Organization.js` (ATUALIZAR)

Adicionar campos:

```javascript
customDomain: { type: String, default: null, unique: true, sparse: true },
domainStatus: {
  type: String,
  enum: ['pending', 'verified', 'active', 'failed'],
  default: 'pending'
},
domainVerifiedAt: { type: Date, default: null }
```

#### 10.2 - Verificação de DNS

**Arquivo**: `src/utils/dnsVerifier.js` (CRIAR NOVO)

```javascript
const dns = require('dns').promises;

async function verifyDomain(domain, targetIP) {
  try {
    const records = await dns.resolve4(domain);
    return records.includes(targetIP);
  } catch (error) {
    return false;
  }
}

async function verifyCNAME(domain, targetHost) {
  try {
    const records = await dns.resolveCname(domain);
    return records.some(r => r.includes(targetHost));
  } catch (error) {
    return false;
  }
}

module.exports = { verifyDomain, verifyCNAME };
```

#### 10.3 - Rotas da API

**Arquivo**: `src/routes/organization.js` (ATUALIZAR)

**Adicionar rotas**:

```javascript
// Adicionar domínio customizado
router.post('/organization/custom-domain', authenticateToken, async (req, res) => {
  try {
    const { domain } = req.body;

    // Validar formato do domínio
    if (!/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Domínio inválido' });
    }

    // Verificar se já está em uso
    const existing = await Organization.findOne({ customDomain: domain });
    if (existing) {
      return res.status(400).json({ error: 'Domínio já cadastrado' });
    }

    // Salvar e iniciar verificação
    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        customDomain: domain,
        domainStatus: 'pending'
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Configure o DNS e clique em "Verificar"',
      instructions: {
        type: 'A Record',
        name: domain,
        value: process.env.SERVER_IP || '5.189.174.18',
        ttl: 3600
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar configuração DNS
router.post('/organization/verify-domain', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org.customDomain) {
      return res.status(400).json({ error: 'Nenhum domínio configurado' });
    }

    const { verifyDomain } = require('../utils/dnsVerifier');
    const serverIP = process.env.SERVER_IP || '5.189.174.18';
    const isValid = await verifyDomain(org.customDomain, serverIP);

    if (isValid) {
      org.domainStatus = 'verified';
      org.domainVerifiedAt = new Date();
      await org.save();

      // TODO: Gerar certificado SSL automático (certbot)

      res.json({ success: true, message: 'Domínio verificado com sucesso!' });
    } else {
      res.json({
        success: false,
        message: 'DNS ainda não propagado. Aguarde até 48h e tente novamente.'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remover domínio customizado
router.delete('/organization/custom-domain', authenticateToken, async (req, res) => {
  try {
    await Organization.findByIdAndUpdate(
      req.user.organizationId,
      {
        customDomain: null,
        domainStatus: 'pending',
        domainVerifiedAt: null
      }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 10.4 - Middleware de Resolução

**Arquivo**: `src/middleware/tenant.js` (ATUALIZAR)

Atualizar `resolveTenant` para suportar custom domains:

```javascript
async function resolveTenant(req, res, next) {
  let orgId = null;

  // 1. Tentar query parameter ?_tenant=slug
  const tenant = req.query._tenant || req.headers['x-tenant'];
  if (tenant) {
    const org = await Organization.findOne({ slug: tenant });
    if (org) orgId = org._id;
  }

  // 2. Tentar custom domain
  if (!orgId) {
    const hostname = req.hostname;
    const org = await Organization.findOne({
      customDomain: hostname,
      domainStatus: 'verified'
    });
    if (org) orgId = org._id;
  }

  // 3. Tentar subdomain
  if (!orgId) {
    const baseDomain = process.env.BASE_DOMAIN || 'fsfotografias.com.br';
    const subdomain = hostname.replace(`.${baseDomain}`, '');
    if (subdomain && subdomain !== hostname && subdomain !== 'app') {
      const org = await Organization.findOne({ slug: subdomain });
      if (org) orgId = org._id;
    }
  }

  req.organizationId = orgId;
  next();
}
```

#### 10.5 - Aba Admin

**Arquivo**: `admin/js/tabs/perfil.js` (ATUALIZAR)

Adicionar seção de domínio customizado:

```javascript
<div>
  <h4 style="color:#f3f4f6; font-weight:600; margin-bottom:1rem;">Domínio Personalizado</h4>
  <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:1rem;">
    Use seu próprio domínio (ex: www.seunome.com.br) em vez de ${org.slug}.fsfotografias.com.br
  </p>

  ${org.customDomain ? `
    <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <p style="color:#f3f4f6; font-weight:600;">${org.customDomain}</p>
          <p style="color:${org.domainStatus === 'verified' ? '#34d399' : '#fbbf24'}; font-size:0.875rem;">
            ${org.domainStatus === 'verified' ? '✓ Verificado' : '⏳ Aguardando verificação'}
          </p>
        </div>
        <button id="removeDomainBtn" style="background:#ef4444; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
          Remover
        </button>
      </div>
      ${org.domainStatus === 'pending' ? `
        <button id="verifyDomainBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; margin-top:1rem; width:100%;">
          Verificar DNS
        </button>
      ` : ''}
    </div>
  ` : `
    <div style="display:flex; gap:0.5rem;">
      <input type="text" id="customDomainInput" placeholder="www.seunome.com.br" style="flex:1; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
      <button id="addDomainBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">
        Adicionar
      </button>
    </div>
  `}
</div>
```

**Event listeners**:

```javascript
// Adicionar domínio
container.querySelector('#addDomainBtn')?.addEventListener('click', async () => {
  const domain = container.querySelector('#customDomainInput').value;
  try {
    const result = await apiPost('/api/organization/custom-domain', { domain });
    alert(`Domínio adicionado!\n\nConfigure seu DNS:\nTipo: A Record\nNome: ${domain}\nValor: ${result.instructions.value}`);
    renderPerfil(container);
  } catch (error) {
    alert('Erro: ' + error.message);
  }
});

// Verificar DNS
container.querySelector('#verifyDomainBtn')?.addEventListener('click', async () => {
  try {
    const result = await apiPost('/api/organization/verify-domain');
    alert(result.message);
    if (result.success) renderPerfil(container);
  } catch (error) {
    alert('Erro: ' + error.message);
  }
});

// Remover domínio
container.querySelector('#removeDomainBtn')?.addEventListener('click', async () => {
  if (!confirm('Remover domínio personalizado?')) return;
  try {
    await apiDelete('/api/organization/custom-domain');
    renderPerfil(container);
  } catch (error) {
    alert('Erro: ' + error.message);
  }
});
```

#### 10.6 - SSL Automático (VPS)

**Script**: `src/scripts/generate-ssl.sh` (CRIAR NOVO)

```bash
#!/bin/bash
# Gera certificado SSL para domínio customizado

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Uso: ./generate-ssl.sh dominio.com"
  exit 1
fi

# Instalar certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
  sudo apt update
  sudo apt install -y certbot python3-certbot-nginx
fi

# Gerar certificado
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL

# Recarregar nginx
sudo nginx -t && sudo systemctl reload nginx

echo "Certificado SSL gerado para $DOMAIN"
```

**⚠️ IMPORTANTE**: Este script precisa ser executado **na VPS**, não via Node.js. Use `child_process.exec` para chamar de dentro da aplicação.

#### 10.7 - Testes

**Fluxo de teste**:

1. Fotógrafo vai em Perfil → Domínio Personalizado
2. Adiciona `www.teste.com.br`
3. Sistema mostra instruções de DNS
4. Fotógrafo configura DNS no Hostinger/GoDaddy/etc:
   - Tipo: A Record
   - Nome: `www.teste.com.br`
   - Valor: `5.189.174.18`
   - TTL: 3600
5. Aguarda propagação (até 48h)
6. Clica "Verificar DNS"
7. Sistema confirma e gera SSL automático
8. Site fica acessível em `www.teste.com.br`

---

## 💳 FASE 12 - SISTEMA DE PAGAMENTO

### Objetivo
Monetizar a plataforma com planos mensais (Free, Basic, Pro) usando Stripe ou Pagar.me. Controlar limites de uso (sessões, fotos, álbuns) por plano.

### Referência
- Stripe Subscriptions API
- Pagar.me Subscriptions
- SaaS pricing tradicional

### Checklist de Implementação

#### 12.1 - Modelo de Dados

**Arquivo**: `src/models/Subscription.js` (CRIAR NOVO)

```javascript
const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true },

  // Plano
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro'],
    default: 'free'
  },

  // Status da assinatura
  status: {
    type: String,
    enum: ['active', 'past_due', 'canceled', 'trialing'],
    default: 'active'
  },

  // Pagamento
  stripeCustomerId: { type: String, default: null },
  stripeSubscriptionId: { type: String, default: null },
  currentPeriodEnd: { type: Date, default: null },
  cancelAtPeriodEnd: { type: Boolean, default: false },

  // Trial
  trialEndsAt: { type: Date, default: null },

  // Limites de uso
  limits: {
    maxSessions: { type: Number, default: 5 },      // free: 5, basic: 50, pro: unlimited (-1)
    maxPhotos: { type: Number, default: 100 },      // free: 100, basic: 5000, pro: unlimited
    maxAlbums: { type: Number, default: 1 },        // free: 1, basic: 10, pro: unlimited
    maxStorage: { type: Number, default: 500 },     // MB
    customDomain: { type: Boolean, default: false }
  },

  // Uso atual (incrementar ao criar sessões/fotos/álbuns)
  usage: {
    sessions: { type: Number, default: 0 },
    photos: { type: Number, default: 0 },
    albums: { type: Number, default: 0 },
    storage: { type: Number, default: 0 }  // MB
  }

}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
```

**Arquivo**: `src/models/Organization.js` (ATUALIZAR)

Adicionar campo:
```javascript
subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null }
```

#### 12.2 - Planos Definidos

**Arquivo**: `src/config/plans.js` (CRIAR NOVO)

```javascript
const plans = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,  // Stripe Price ID
    limits: {
      maxSessions: 5,
      maxPhotos: 100,
      maxAlbums: 1,
      maxStorage: 500,  // MB
      customDomain: false
    },
    features: [
      '5 sessões por mês',
      '100 fotos por sessão',
      '1 prova de álbum',
      '500MB de armazenamento',
      'Watermark customizado',
      'Galeria com seleção'
    ]
  },
  basic: {
    name: 'Basic',
    price: 4900,  // R$ 49,00 em centavos
    priceId: 'price_XXXXXXXX',  // Stripe Price ID
    limits: {
      maxSessions: 50,
      maxPhotos: 5000,
      maxAlbums: 10,
      maxStorage: 10000,  // 10GB
      customDomain: false
    },
    features: [
      '50 sessões por mês',
      '5.000 fotos por sessão',
      '10 provas de álbum',
      '10GB de armazenamento',
      'Todas as features do Free',
      'Suporte por email'
    ]
  },
  pro: {
    name: 'Pro',
    price: 9900,  // R$ 99,00
    priceId: 'price_YYYYYYYY',
    limits: {
      maxSessions: -1,  // Ilimitado
      maxPhotos: -1,
      maxAlbums: -1,
      maxStorage: 50000,  // 50GB
      customDomain: true
    },
    features: [
      'Sessões ilimitadas',
      'Fotos ilimitadas',
      'Álbuns ilimitados',
      '50GB de armazenamento',
      'Domínio personalizado',
      'Todas as features do Basic',
      'Suporte prioritário'
    ]
  }
};

module.exports = plans;
```

#### 12.3 - Middleware de Limites

**Arquivo**: `src/middleware/planLimits.js` (CRIAR NOVO)

```javascript
const Subscription = require('../models/Subscription');

async function checkLimit(req, res, next) {
  try {
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub) {
      // Criar subscription free automático
      const newSub = new Subscription({
        organizationId: req.user.organizationId,
        plan: 'free',
        status: 'active'
      });
      await newSub.save();
      req.subscription = newSub;
      return next();
    }

    req.subscription = sub;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function checkSessionLimit(req, res, next) {
  const sub = req.subscription;
  if (sub.limits.maxSessions !== -1 && sub.usage.sessions >= sub.limits.maxSessions) {
    return res.status(403).json({
      error: 'Limite de sessões atingido',
      upgrade: true,
      currentPlan: sub.plan
    });
  }
  next();
}

async function checkPhotoLimit(req, res, next) {
  const sub = req.subscription;
  if (sub.limits.maxPhotos !== -1 && sub.usage.photos >= sub.limits.maxPhotos) {
    return res.status(403).json({
      error: 'Limite de fotos atingido',
      upgrade: true
    });
  }
  next();
}

async function checkAlbumLimit(req, res, next) {
  const sub = req.subscription;
  if (sub.limits.maxAlbums !== -1 && sub.usage.albums >= sub.limits.maxAlbums) {
    return res.status(403).json({
      error: 'Limite de álbuns atingido',
      upgrade: true
    });
  }
  next();
}

module.exports = { checkLimit, checkSessionLimit, checkPhotoLimit, checkAlbumLimit };
```

**Usar nos endpoints**:

```javascript
// Em src/routes/sessions.js
const { checkLimit, checkSessionLimit } = require('../middleware/planLimits');

router.post('/sessions', authenticateToken, checkLimit, checkSessionLimit, async (req, res) => {
  // ... criar sessão

  // Incrementar contador
  await Subscription.findOneAndUpdate(
    { organizationId: req.user.organizationId },
    { $inc: { 'usage.sessions': 1 } }
  );
});
```

#### 12.4 - Integração Stripe

**Instalar SDK**:
```bash
npm install stripe
```

**Arquivo**: `src/services/stripe.js` (CRIAR NOVO)

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Subscription = require('../models/Subscription');
const plans = require('../config/plans');

async function createCheckoutSession(organizationId, planName) {
  const plan = plans[planName];
  if (!plan || plan.price === 0) {
    throw new Error('Plano inválido');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: plan.priceId,
      quantity: 1
    }],
    success_url: `${process.env.BASE_URL}/admin?payment=success`,
    cancel_url: `${process.env.BASE_URL}/admin?payment=canceled`,
    client_reference_id: organizationId.toString(),
    metadata: {
      organizationId: organizationId.toString(),
      plan: planName
    }
  });

  return session.url;
}

async function handleWebhook(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const orgId = session.metadata.organizationId;
      const plan = session.metadata.plan;

      await Subscription.findOneAndUpdate(
        { organizationId: orgId },
        {
          plan: plan,
          status: 'active',
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          currentPeriodEnd: new Date(session.subscription.current_period_end * 1000),
          limits: plans[plan].limits,
          usage: { sessions: 0, photos: 0, albums: 0, storage: 0 }  // Reset ao trocar de plano
        },
        { upsert: true }
      );
      break;

    case 'invoice.payment_succeeded':
      // Renovação bem-sucedida
      break;

    case 'invoice.payment_failed':
      // Marcar como past_due
      break;

    case 'customer.subscription.deleted':
      // Assinatura cancelada
      break;
  }
}

module.exports = { createCheckoutSession, handleWebhook };
```

**Arquivo**: `src/routes/billing.js` (CRIAR NOVO)

```javascript
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createCheckoutSession, handleWebhook } = require('../services/stripe');
const Subscription = require('../models/Subscription');
const plans = require('../config/plans');

// Listar planos disponíveis
router.get('/billing/plans', async (req, res) => {
  res.json({ plans });
});

// Assinatura atual
router.get('/billing/subscription', authenticateToken, async (req, res) => {
  try {
    let sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub) {
      sub = new Subscription({
        organizationId: req.user.organizationId,
        plan: 'free',
        status: 'active'
      });
      await sub.save();
    }
    res.json({ subscription: sub, planDetails: plans[sub.plan] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar checkout session (upgrade de plano)
router.post('/billing/checkout', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const url = await createCheckoutSession(req.user.organizationId, plan);
    res.json({ checkoutUrl: url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook do Stripe
router.post('/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    await handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cancelar assinatura
router.post('/billing/cancel', authenticateToken, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId });
    if (!sub.stripeSubscriptionId) {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    sub.cancelAtPeriodEnd = true;
    await sub.save();

    res.json({ success: true, message: 'Assinatura será cancelada no final do período' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Registrar**: `app.use('/api', require('./routes/billing'));`

#### 12.5 - Aba Admin "Plano"

**Arquivo**: `admin/js/tabs/plano.js` (CRIAR NOVO)

```javascript
import { apiGet, apiPost } from '../utils/api.js';

export async function renderPlano(container) {
  const { subscription, planDetails } = await apiGet('/api/billing/subscription');
  const { plans } = await apiGet('/api/billing/plans');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Seu Plano</h2>

      <!-- Plano Atual -->
      <div style="background:#1f2937; padding:2rem; border-radius:0.5rem; border:2px solid #2563eb;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">${planDetails.name}</h3>
            <p style="color:#9ca3af; margin-top:0.5rem;">
              ${subscription.plan === 'free' ? 'Gratuito' : `R$ ${(planDetails.price / 100).toFixed(2)}/mês`}
            </p>
          </div>
          ${subscription.plan !== 'pro' ? `
            <button id="upgradeBtn" style="background:#2563eb; color:white; padding:0.75rem 1.5rem; border-radius:0.375rem; border:none; cursor:pointer; font-weight:600;">
              Fazer Upgrade
            </button>
          ` : ''}
        </div>

        <!-- Uso atual -->
        <div style="margin-top:2rem; display:grid; gap:1rem;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:#d1d5db;">Sessões</span>
              <span style="color:#f3f4f6;">${subscription.usage.sessions} / ${subscription.limits.maxSessions === -1 ? '∞' : subscription.limits.maxSessions}</span>
            </div>
            <div style="background:#374151; height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:#2563eb; height:100%; width:${subscription.limits.maxSessions === -1 ? 0 : (subscription.usage.sessions / subscription.limits.maxSessions * 100)}%;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="color:#d1d5db;">Fotos</span>
              <span style="color:#f3f4f6;">${subscription.usage.photos} / ${subscription.limits.maxPhotos === -1 ? '∞' : subscription.limits.maxPhotos}</span>
            </div>
            <div style="background:#374151; height:0.5rem; border-radius:9999px; overflow:hidden;">
              <div style="background:#2563eb; height:100%; width:${subscription.limits.maxPhotos === -1 ? 0 : (subscription.usage.photos / subscription.limits.maxPhotos * 100)}%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Planos Disponíveis -->
      <h3 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">Planos Disponíveis</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
        ${Object.entries(plans).map(([key, plan]) => `
          <div style="background:#1f2937; padding:2rem; border-radius:0.5rem; border:1px solid ${subscription.plan === key ? '#2563eb' : '#374151'};">
            <h4 style="font-size:1.125rem; font-weight:bold; color:#f3f4f6;">${plan.name}</h4>
            <p style="font-size:2rem; font-weight:bold; color:#f3f4f6; margin:1rem 0;">
              ${plan.price === 0 ? 'Grátis' : `R$ ${(plan.price / 100).toFixed(2)}`}
            </p>
            <ul style="list-style:none; padding:0; margin:1.5rem 0; display:flex; flex-direction:column; gap:0.75rem;">
              ${plan.features.map(f => `<li style="color:#9ca3af;">✓ ${f}</li>`).join('')}
            </ul>
            ${subscription.plan === key ? `
              <button disabled style="background:#374151; color:#9ca3af; padding:0.75rem; border-radius:0.375rem; border:none; width:100%; cursor:not-allowed;">
                Plano Atual
              </button>
            ` : plan.price > 0 ? `
              <button class="selectPlanBtn" data-plan="${key}" style="background:#2563eb; color:white; padding:0.75rem; border-radius:0.375rem; border:none; width:100%; cursor:pointer; font-weight:600;">
                Selecionar
              </button>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Event listeners
  container.querySelectorAll('.selectPlanBtn').forEach(btn => {
    btn.onclick = async () => {
      const plan = btn.dataset.plan;
      try {
        const { checkoutUrl } = await apiPost('/api/billing/checkout', { plan });
        window.location.href = checkoutUrl;
      } catch (error) {
        alert('Erro: ' + error.message);
      }
    };
  });
}
```

**Registrar aba** em `admin/index.html`:
```html
<div data-tab="plano" class="nav-item">Plano</div>
```

#### 12.6 - Configurar Stripe

**No Stripe Dashboard**:

1. Criar produtos:
   - Nome: "FS SaaS - Basic"
   - Preço: R$ 49,00/mês
   - Copiar Price ID → colocar em `plans.js`

2. Criar Webhook:
   - URL: `https://app.fsfotografias.com.br/api/billing/webhook`
   - Eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copiar Signing Secret → `.env` como `STRIPE_WEBHOOK_SECRET`

**Arquivo `.env` na VPS**:
```env
STRIPE_SECRET_KEY=sk_live_XXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXX
BASE_URL=https://app.fsfotografias.com.br
```

#### 12.7 - Testes

**Fluxo de teste** (Stripe Test Mode):

1. Admin vai em "Plano" → vê plano atual (Free)
2. Clica "Selecionar" no plano Basic
3. Redireciona para Stripe Checkout
4. Preenche cartão de teste: `4242 4242 4242 4242`
5. Webhook recebe evento → atualiza banco
6. Redirect para `/admin?payment=success`
7. Admin vê novo plano ativo com limites expandidos
8. Testa criar 6 sessões (limite Free = 5) → sucesso agora

**Comando de teste webhook local**:
```bash
stripe listen --forward-to localhost:3051/api/billing/webhook
stripe trigger checkout.session.completed
```

---

## 📚 RECURSOS ÚTEIS

### Documentação Obrigatória
- `CLAUDE.md` - Padrões, arquitetura, exemplos completos
- `ROADMAP.md` - Status de todas as fases
- `ARCHITECTURE.md` - Decisões técnicas

### Padrões de Código

**Backend (CommonJS)**:
```javascript
const express = require('express');
const { authenticateToken } = require('../middleware/auth');

router.post('/rota', authenticateToken, async (req, res) => {
  try {
    // filtrar por organizationId
    const data = await Model.find({ organizationId: req.user.organizationId });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Admin Frontend (ES Modules)**:
```javascript
import { apiGet, apiPost } from '../utils/api.js';

export async function renderAba(container) {
  container.innerHTML = `
    <!-- INLINE STYLES SEMPRE -->
    <div style="background:#1f2937; padding:1rem;">
      <h2 style="color:#f3f4f6;">Título</h2>
    </div>
  `;

  const data = await apiGet('/api/endpoint');
  // render...
}
```

### Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Compilar Tailwind (se mexer em HTML público)
npm run build:css

# Deploy VPS
cd /var/www/fs-saas
git pull
npm install
pm2 restart fsfotografias-saas

# Logs
pm2 logs fsfotografias-saas --lines 50

# MongoDB
mongosh fsfotografias
db.organizations.find({slug: 'fs'})
```

---

## ✅ CHECKLIST FINAL POR FASE

### FASE 8 - Álbum
- [ ] Model `Album.js` criado
- [ ] Rotas `/api/albums` funcionando
- [ ] Aba "Prova de Álbuns" no admin
- [ ] Editor drag & drop de layouts
- [ ] Visualizador cliente com flip book
- [ ] Aprovação/rejeição funcionando

### FASE 10 - Domínio
- [ ] Campos `customDomain` na Organization
- [ ] DNS verifier funcionando
- [ ] Middleware resolvendo custom domains
- [ ] UI no Perfil para adicionar/verificar
- [ ] SSL automático configurado (VPS)
- [ ] Testado com domínio real

### FASE 12 - Billing
- [ ] Model `Subscription.js` criado
- [ ] Planos definidos em `config/plans.js`
- [ ] Middleware de limites funcionando
- [ ] Stripe integrado (checkout + webhook)
- [ ] Aba "Plano" no admin
- [ ] Upgrade/downgrade testado
- [ ] Limites respeitados nas rotas

---

## 🚨 ERROS COMUNS E SOLUÇÕES

| Erro | Causa | Solução |
|------|-------|---------|
| `require is not defined` | Usar ES import no backend | Backend é CommonJS, usar `require()` |
| Classes Tailwind não aparecem | Usar classes no admin JS | Admin usa inline styles, não classes |
| `organizationId undefined` | Esquecer de filtrar por tenant | Sempre usar `req.user.organizationId` |
| Upload falha 413 | Arquivo muito grande | Já configurado 50mb, verificar Nginx |
| Mongoose DeprecationWarning | Usar `new: true` | Trocar por `returnDocument: 'after'` |

---

## 📞 SUPORTE

Se encontrar problemas:

1. Ler `CLAUDE.md` seção relevante
2. Verificar `ROADMAP.md` se fase já está implementada
3. Checar logs: `pm2 logs fsfotografias-saas`
4. Buscar erro no código existente (pode ter exemplo)

---

**Boa sorte na implementação! 🚀**

*Instruções criadas em 18/02/2026 - Versão 1.0*
