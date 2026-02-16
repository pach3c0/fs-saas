# ROADMAP - Plataforma SaaS para Fotografos

## Visao Geral

Plataforma completa para fotografos profissionais: selecao de fotos, entrega online, prova de albuns, site profissional e CRM de clientes. Concorrente direto do PicSize, com arquitetura propria (Vanilla JS + Express + MongoDB + VPS).

**Referencia competitiva**: PicSize (picsize.com.br) - 30k+ fotografos, 4 produtos (Gallery PRO, Site PRO, Entrega Online, Prova de Album).

**Nossa vantagem**: Custo menor (VPS propria vs cloud), codigo leve (Vanilla JS vs React pesado), controle total da infra, sem limites artificiais de armazenamento.

---

## Status Atual (Fev/2026)

### O que ja temos funcionando:
- [x] Site publico com portfolio, galeria, FAQ, contato
- [x] Painel admin com 10 abas (Hero, Sobre, Portfolio, Albuns, Estudio, FAQ, Newsletter, Sessoes, Footer, Manutencao)
- [x] Galeria do cliente com codigo de acesso
- [x] Selecao de fotos (coracao) com limite de pacote e preco por foto extra
- [x] Workflow de selecao: pending -> in_progress -> submitted -> delivered
- [x] Watermark customizavel (texto + opacidade configuravel por org)
- [x] Lightbox com navegacao e swipe
- [x] Notificacoes em tempo real (polling 30s)
- [x] Upload de imagens com compressao
- [x] Upload de videos (ate 300MB)
- [x] Modo gallery (so visualizacao) e modo selection
- [x] Protecao anti-copia (context menu, user-select, pointer-events)
- [x] WhatsApp flutuante com mensagens customizaveis
- [x] Newsletter com subscribe/unsubscribe
- [x] Modo manutencao
- [x] Multi-tenancy (subdominio por organizacao)
- [x] Login com email+senha (JWT)
- [x] Uploads isolados por organizacao
- [x] Responsivo mobile
- [x] SSL/HTTPS via Let's Encrypt
- [x] Deploy automatizado (git pull + pm2 restart)
- [x] Perfil do fotografo (logo, contato, bio, endereco)
- [x] Aba Perfil no admin com identidade visual
- [x] Logo dinamico na galeria do cliente
- [x] Foto de capa por sessao
- [x] Rota publica de dados da organizacao

---

## FASE 1 - Perfil e Identidade Visual (Concluido em 15/02/2026)
**Objetivo**: Fotografo personaliza sua presenca na plataforma
**Prioridade**: ALTA
**Complexidade**: Baixa
**Status**: CONCLUIDO

### 1.1 Perfil do Fotografo
- [x] Modelo `Organization` expandido com: `logo`, `phone`, `whatsapp`, `email`, `website`, `bio`, `address`, `city`, `state`, `primaryColor`
- [x] Aba "Perfil" no admin (`admin/js/tabs/perfil.js`):
  - Upload de logotipo com preview
  - Campos editaveis: nome, telefone, whatsapp, email, website, endereco, cidade, estado, bio
  - Identidade visual: cor primaria (color picker sincronizado)
  - Link do painel com botao copiar
- [x] Exibir logo/nome do fotografo na galeria do cliente (nav dinâmico)

### 1.2 Upload de Logotipo
- [x] Campo `logo` no modelo Organization
- [x] Upload de logo no perfil (aceitar PNG/JPG/SVG/WebP)
- [x] Logo aparece no header da galeria do cliente (em vez de texto fixo)
- [x] Opcao "Remover logotipo" (voltar para nome do estudio)

### 1.3 Foto de Capa da Galeria
- [x] Campo `coverPhoto` no modelo Session
- [x] Upload de capa ao criar sessao (modal com preview)
- [x] Exibir capa como banner no topo da galeria do cliente

### 1.4 Watermark Customizado (bonus - antecipado da Fase 2)
- [x] Campos na Organization: `watermarkType` (text/logo), `watermarkText`, `watermarkOpacity`
- [x] Configuracao na aba Perfil: tipo, texto, opacidade (slider com preview ao vivo)
- [x] Galeria do cliente usa watermark customizado em vez de texto fixo "FS FOTOGRAFIAS"
- [x] Opacidade dinâmica aplicada em todas as fotos

**Arquivos criados**: `src/routes/organization.js`, `admin/js/tabs/perfil.js`
**Arquivos modificados**: `src/models/Organization.js`, `src/models/Session.js`, `src/routes/sessions.js`, `src/server.js`, `admin/js/tabs/sessoes.js`, `admin/index.html`, `cliente/js/gallery.js`

---

## FASE 2 - Marca D'Agua Avancada
**Objetivo**: Funcionalidades avancadas de watermark (posicao, tamanho, ladrilhado)
**Prioridade**: ALTA
**Complexidade**: Media
**Estimativa**: ~1-2 dias
**Status**: IMPLEMENTADO (Gemini) - Aguardando verificação do Claude para conclusão
**Nota**: Watermark basico (texto customizado + opacidade) ja implementado na Fase 1

### 2.1 Configuracao Avancada de Marca D'Agua
- [x] Campos basicos ja implementados: `watermarkType`, `watermarkText`, `watermarkOpacity` (Fase 1)
- [x] Configuracao na aba Perfil com preview ao vivo (Fase 1)
- [x] Aplicar watermark customizado no frontend (CSS overlay) na galeria do cliente (Fase 1)
- [x] Campos adicionais na Organization:
  - `watermarkPosition` ('center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'tiled')
  - `watermarkSize` ('small' | 'medium' | 'large')
- [x] Se tipo=logo: usar imagem do logo como watermark (PNG transparente)
- [x] Opcao de watermark "ladrilhado" (tiled) - repeticao diagonal para protecao maxima
- [x] Escolher fonte/tamanho do texto

### 2.2 Selo Anti-Copia
- [ ] Opcao de adicionar "Copia nao autorizada" como texto secundario
- [ ] Visivel apenas quando alguem tenta fazer screenshot (CSS trick com opacity/blend-mode)

**Arquivos afetados**: `src/models/Organization.js`, `admin/js/tabs/perfil.js`, `cliente/js/gallery.js`, `cliente/index.html`

---

## FASE 3 - Melhorias na Selecao de Fotos
**Objetivo**: Paridade com PicSize na experiencia de selecao
**Prioridade**: ALTA
**Complexidade**: Media
**Status**: EM ANDAMENTO (Fase 3.1 concluida, iniciando 3.2)
**Estimativa**: ~3-4 dias

### 3.1 Comentarios nas Fotos
- [x] Frontend: Interface de comentários na galeria (ícone, modal, lista)
- [x] Campo `comments` no array de fotos da Session:
  ```
  photos: [{
    id, filename, url, uploadedAt,
    comments: [{ text, createdAt, author: 'client' | 'admin' }]
  }]
  ```
- [ ] Na galeria do cliente: icone de balao no canto da foto
- [ ] Ao clicar no balao: campo de texto para comentar
- [ ] No admin (aba Sessoes): visualizar comentarios de cada foto
- [ ] Admin pode responder comentarios
- [ ] Notificacao quando cliente comenta

### 3.2 Prazo/Expiracao da Selecao
- [ ] Campo `selectionDeadline` (Date) no modelo Session
- [ ] Campo ao criar sessao: "Data limite para selecao" (date picker)
- [ ] Na galeria do cliente: contador regressivo "X dias restantes"
- [ ] Ao expirar: status muda para 'expired', cliente ve mensagem "Prazo encerrado"
- [ ] Novo status: `expired` (alem dos 4 existentes)
- [ ] Admin pode estender prazo (editar deadline)
- [ ] Notificacao quando faltam 3 dias e quando expira

### 3.3 Filtros Avancados na Listagem de Sessoes
- [ ] Filtro por status da selecao (checkbox: pending, in_progress, submitted, delivered, expired)
- [ ] Filtro por modo (selection / gallery)
- [ ] Filtro por periodo de criacao (date range picker)
- [ ] Campo de busca por nome do cliente
- [ ] Ordenacao: mais recente, mais antigo, nome A-Z

**Arquivos afetados**: `src/models/Session.js`, `src/routes/sessions.js`, `admin/js/tabs/sessoes.js`, `cliente/js/gallery.js`

---

## FASE 4 - Entrega Online em Alta Resolucao
**Objetivo**: Cliente baixa fotos em qualidade original, sem compressao
**Prioridade**: ALTA
**Complexidade**: Alta
**Estimativa**: ~4-5 dias

### 4.1 Sistema de Entrega em Alta
- [ ] Toggle ON/OFF por sessao: `highResDelivery` (boolean)
- [ ] Quando admin marca como "delivered" e highResDelivery=true:
  - Fotos sao servidas sem watermark
  - Botao "Baixar foto" em cada foto individual
  - Botao "Baixar todas" (gera ZIP no servidor)
- [ ] Fotos mantidas na resolucao original (sem compressao do upload)
  - Novo campo no upload: salvar versao comprimida (para galeria) + original (para entrega)
  - `photos[].urlOriginal` (resolucao original)
  - `photos[].urlThumb` (comprimida para galeria com watermark)

### 4.2 Download em ZIP
- [ ] Rota `GET /api/client/download-all/:sessionId?code=X`
- [ ] Backend usa `archiver` (npm) para gerar ZIP on-the-fly
- [ ] Stream direto para o cliente (nao salvar ZIP no disco)
- [ ] Limitar a sessoes com status "delivered"
- [ ] Barra de progresso no frontend

### 4.3 Download Individual
- [ ] Rota `GET /api/client/download/:sessionId/:photoId?code=X`
- [ ] Servir foto original com header `Content-Disposition: attachment`
- [ ] Botao de download em cada foto no modo "delivered"

### 4.4 Controle de Resolucao por Plano (futuro)
- [ ] Plano Standard: fotos entregues em 1920px
- [ ] Plano Plus/Infinity: resolucao original
- [ ] Campo `maxResolution` na Organization (baseado no plano)

**Dependencias**: npm `archiver` para ZIP
**Arquivos afetados**: `src/routes/sessions.js`, `src/utils/multerConfig.js`, `cliente/js/gallery.js`, `admin/js/tabs/sessoes.js`

---

## FASE 5 - CRM de Clientes
**Objetivo**: Gerenciar base de clientes separado das sessoes
**Prioridade**: MEDIA
**Complexidade**: Media
**Estimativa**: ~3-4 dias

### 5.1 Modelo Client
- [ ] Novo modelo `src/models/Client.js`:
  ```
  {
    organizationId,
    name,
    email,
    phone,
    notes,
    tags: [String],          // ex: 'casamento', 'aniversario'
    sessions: [ObjectId],    // referencia para Session
    createdAt, updatedAt
  }
  ```
- [ ] Indice composto: `{ organizationId, email }` (unico)

### 5.2 Aba Clientes no Admin
- [ ] Nova aba `admin/js/tabs/clientes.js`
- [ ] Listagem de clientes com busca e paginacao
- [ ] Formulario: criar/editar cliente (nome, email, telefone, notas, tags)
- [ ] Visualizar sessoes vinculadas ao cliente
- [ ] Ao criar sessao: selecionar cliente existente ou criar novo

### 5.3 Rotas do Backend
- [ ] `GET /api/clients` - listar clientes (com busca e paginacao)
- [ ] `POST /api/clients` - criar cliente
- [ ] `PUT /api/clients/:id` - editar cliente
- [ ] `DELETE /api/clients/:id` - deletar cliente
- [ ] `GET /api/clients/:id/sessions` - sessoes do cliente

### 5.4 Integracao Session <-> Client
- [ ] Campo `clientId` no modelo Session (referencia ao Client)
- [ ] Ao criar sessao: dropdown para selecionar cliente
- [ ] Historico: quantas sessoes o cliente ja teve

**Arquivos afetados**: `src/models/Client.js` (novo), `src/routes/clients.js` (novo), `src/server.js`, `admin/js/tabs/clientes.js` (novo), `admin/js/tabs/sessoes.js`, `admin/index.html`

---

## FASE 6 - APP Foto (PWA)
**Objetivo**: Cliente salva a galeria como app no celular
**Prioridade**: MEDIA
**Complexidade**: Media
**Estimativa**: ~2-3 dias

### 6.1 Progressive Web App
- [ ] Gerar `manifest.json` dinamico por sessao:
  - `name`: nome da sessao ou fotografo
  - `short_name`: nome curto
  - `icons`: logo do fotografo (ou icone padrao)
  - `start_url`: URL da galeria com codigo
  - `display`: 'standalone'
  - `theme_color`: cor personalizada
- [ ] Service Worker basico para cache offline das fotos ja carregadas
- [ ] Rota `GET /api/client/manifest/:sessionId` que retorna manifest dinamico
- [ ] Banner "Adicionar a tela inicial" no mobile (detectar Safari/Chrome e mostrar instrucoes)

### 6.2 Experiencia Standalone
- [ ] Quando aberto como PWA: esconder barra do navegador
- [ ] Splash screen com logo do fotografo
- [ ] Notificacao quando admin adiciona novas fotos ou entrega

**Arquivos afetados**: `cliente/index.html`, `cliente/js/gallery.js`, `src/routes/sessions.js`

---

## FASE 7 - Selecao Multipla (Formaturas e Shows)
**Objetivo**: Varios clientes selecionam fotos na mesma galeria
**Prioridade**: MEDIA
**Complexidade**: Alta
**Estimativa**: ~5-6 dias

### 7.1 Modo Multi-Selecao
- [ ] Novo modo de sessao: `mode: 'multi_selection'`
- [ ] Cada "participante" tem sua propria selecao independente:
  ```
  Session.participants: [{
    name, email, phone,
    accessCode,              // codigo unico por participante
    selectedPhotos: [String],
    selectionStatus,
    packageLimit,
    submittedAt
  }]
  ```
- [ ] Tela de login: cliente informa codigo pessoal
- [ ] Galeria mostra TODAS as fotos, cada cliente seleciona as suas
- [ ] Admin ve selecao de cada participante separadamente

### 7.2 Selecao sem Senha (com Cadastro)
- [ ] Opcao na sessao: `accessType: 'code' | 'register' | 'public'`
  - `code`: comportamento atual (codigo de acesso)
  - `register`: cliente preenche nome+email para acessar
  - `public`: galeria publica (qualquer pessoa acessa)
- [ ] Se `register`: formulario de cadastro que cria participante automaticamente
- [ ] Registros salvos no CRM automaticamente

### 7.3 Painel do Admin para Multi-Selecao
- [ ] Visualizar selecao de cada participante
- [ ] Exportar lista: quem selecionou quais fotos
- [ ] Relatório de fotos mais selecionadas (ranking)

**Arquivos afetados**: `src/models/Session.js`, `src/routes/sessions.js`, `admin/js/tabs/sessoes.js`, `cliente/js/gallery.js`, `cliente/index.html`

---

## FASE 8 - Prova de Album Folheavel
**Objetivo**: Fotografo envia layout do album para aprovacao do cliente
**Prioridade**: MEDIA
**Complexidade**: Alta
**Estimativa**: ~5-7 dias

### 8.1 Modelo Album
- [ ] Novo modelo `src/models/Album.js`:
  ```
  {
    organizationId,
    clientId,                 // referencia ao Client
    name,                     // nome do album
    welcomeText,              // texto de boas-vindas
    sheets: [{                // laminas/paginas
      id, filename, url,
      order: Number,
      status: 'awaiting_review' | 'approved' | 'rejected' | 'revision_requested',
      version: Number,
      comments: [{ text, author, createdAt }]
    }],
    currentVersion: Number,   // versao atual do album
    versions: [{              // historico de versoes
      version: Number,
      sheets: [ObjectId],
      createdAt
    }],
    accessCode,               // codigo para cliente acessar
    status: 'draft' | 'sent' | 'in_review' | 'approved' | 'revision_requested',
    sentAt, approvedAt
  }
  ```

### 8.2 Aba "Prova de Albuns" no Admin
- [ ] Nova aba `admin/js/tabs/albuns-prova.js`
- [ ] Wizard 3 passos (como PicSize):
  1. **Dados do album**: nome, texto de boas-vindas
  2. **Laminas**: upload multiplo, reordenar (drag-and-drop), preview
  3. **Cliente**: selecionar cliente, enviar link
- [ ] Listagem de albuns com status
- [ ] Visualizar comentarios do cliente por lamina
- [ ] Criar nova versao do album (upload de laminas atualizadas)
- [ ] Excluir album

### 8.3 Visualizador do Cliente (Album Folheavel)
- [ ] Nova pagina `album/index.html` + `album/js/viewer.js`
- [ ] Visualizacao tipo "livro" (flip pages) com animacao
- [ ] Cada lamina tem botoes: "Aprovar" / "Pedir revisao" + campo de comentario
- [ ] Barra de progresso: X de Y laminas aprovadas
- [ ] Botao "Aprovar album completo"
- [ ] Responsivo (funciona no celular com swipe)

### 8.4 Rotas do Backend
- [ ] CRUD de albuns (`/api/albums`)
- [ ] Upload de laminas (`/api/albums/:id/sheets`)
- [ ] Rotas do cliente (`/api/client/album/:id`)
- [ ] Aprovacao/revisao por lamina

**Dependencias**: Biblioteca de flip-page (CSS puro ou `turn.js`)
**Arquivos afetados**: `src/models/Album.js` (novo), `src/routes/albums.js` (novo), `admin/js/tabs/albuns-prova.js` (novo), `album/` (novo diretorio)

---

## FASE 9 - Site Profissional Customizavel
**Objetivo**: Cada fotografo tem um site personalizavel
**Prioridade**: BAIXA (futuro)
**Complexidade**: Muito Alta
**Estimativa**: ~15-20 dias

### 9.1 Temas Pre-Prontos
- [ ] 5-10 temas com layouts diferentes:
  - Casamento (elegante, fontes serifadas)
  - Ensaio (minimalista, foco nas fotos)
  - Gestante/Familia (clean, cores suaves)
  - Evento (dinamico, grid moderno)
  - Studio (escuro, profissional)
- [ ] Cada tema: combinacao de layout, paleta de cores, fontes, secoes
- [ ] Preview do tema antes de aplicar

### 9.2 Editor de Secoes
- [ ] Secoes configuráveis pelo fotografo:
  - Banner/Hero (imagem, video ou slideshow)
  - Sobre Mim (texto + foto)
  - Portfolio (grid de fotos)
  - Depoimentos (carousel de textos)
  - Servicos (cards com descricao)
  - Contato (formulario + mapa)
  - Footer (redes sociais + copyright)
- [ ] Reordenar secoes (drag-and-drop)
- [ ] Ativar/desativar secoes individualmente

### 9.3 Secao Depoimentos
- [ ] Admin adiciona depoimentos: nome, texto, foto do cliente, nota (estrelas)
- [ ] Carousel automatico no site publico
- [ ] Integrado ao CRM (vincular depoimento ao cliente)

### 9.4 Paginas Extras
- [ ] Fotografo cria paginas: /casamento, /ensaio-gestante, /aniversario
- [ ] Cada pagina: titulo, texto, galeria de fotos, CTA (botao WhatsApp)
- [ ] Menu do site atualiza automaticamente

### 9.5 Editor Visual (Live Editor)
- [ ] Preview ao vivo enquanto edita
- [ ] Paleta de cores customizavel
- [ ] Fontes (Google Fonts selector)
- [ ] Espacamentos e tamanhos ajustaveis

**Arquivos afetados**: Muitos - praticamente um novo modulo completo

---

## FASE 10 - Dominio Proprio
**Objetivo**: Fotografo conecta seu dominio ao site
**Prioridade**: BAIXA (futuro)
**Complexidade**: Media-Alta
**Estimativa**: ~3-5 dias

### 10.1 Configuracao de Dominio
- [ ] Campo `customDomain` na Organization
- [ ] Admin configura dominio nas configuracoes
- [ ] Instrucoes de configuracao de DNS (registro CNAME)
- [ ] Verificacao automatica de DNS (polling)

### 10.2 SSL Automatico
- [ ] Integracao com Let's Encrypt para gerar certificado automatico
- [ ] Nginx config dinamico para novos dominios
- [ ] Script que adiciona server block no Nginx ao validar dominio

### 10.3 Subdominio Gratis
- [ ] Todo fotografo ja tem: `slug.seuapp.com.br` (ja funciona com multi-tenancy)
- [ ] Dominio proprio e upgrade (planos pagos)

**Arquivos afetados**: `src/models/Organization.js`, `src/routes/auth.js`, config Nginx

---

## FASE 11 - Integracoes e Analytics
**Objetivo**: Fotografo conecta ferramentas de marketing
**Prioridade**: BAIXA
**Complexidade**: Baixa-Media
**Estimativa**: ~2-3 dias

### 11.1 Integracoes Configuráveis
- [ ] Campos na Organization:
  - `integrations.googleAnalyticsId` (GA4 Measurement ID)
  - `integrations.facebookPixelId` (Meta Pixel ID)
  - `integrations.tiktokPixelId`
  - `integrations.whatsappNumber` (numero para widget)
  - `integrations.whatsappMessage` (mensagem padrao)
- [ ] Aba "Integracoes" no admin (formulario simples com campos de ID)
- [ ] Injetar scripts de tracking no site publico dinamicamente

### 11.2 WhatsApp Widget Configuravel
- [ ] Fotografo define numero, mensagem, horarios de atendimento
- [ ] Widget aparece no site publico e na galeria do cliente
- [ ] Mensagens customizaveis (ja temos `whatsappMessages`)

### 11.3 SEO Basico
- [ ] Meta tags dinamicas por pagina (title, description, og:image)
- [ ] Sitemap.xml automatico
- [ ] Robots.txt configuravel

**Arquivos afetados**: `src/models/Organization.js`, `admin/js/tabs/integracoes.js` (novo), `public/index.html`, `src/routes/site-data.js`

---

## FASE 12 - Planos e Billing
**Objetivo**: Monetizar a plataforma com assinaturas
**Prioridade**: ALTA (quando tiver features suficientes)
**Complexidade**: Alta
**Estimativa**: ~7-10 dias

### 12.1 Definicao de Planos

| Recurso | Free | Basico (R$29/mes) | Pro (R$59/mes) | Premium (R$129/mes) |
|---------|------|-------|-----|---------|
| Galerias | 3 | Ilimitadas | Ilimitadas | Ilimitadas |
| Espaco | 2 GB | 20 GB | 100 GB | 300 GB |
| Resolucao entrega | 1920px | 1920px | Original | Original |
| Watermark custom | Texto | Texto | Texto + Imagem | Texto + Imagem |
| Prova de album | Nao | Nao | Ilimitada | Ilimitada |
| Multi-selecao | Nao | Nao | Sim | Sim |
| App Foto (PWA) | Nao | Nao | Sim | Sim |
| CRM | Basico | Completo | Completo | Completo |
| Dominio proprio | Nao | Nao | Nao | Sim |
| Site customizavel | Basico | Basico | Temas | Editor completo |
| Suporte | Email | Email + WhatsApp | Prioritario | Prioritario |

### 12.2 Sistema de Billing
- [ ] Integracao com gateway de pagamento (Stripe ou MercadoPago)
- [ ] Modelo `Subscription` com campos de plano, status, datas
- [ ] Webhook para receber notificacoes de pagamento/cancelamento
- [ ] Trial de 14 dias (plano Pro)
- [ ] Downgrade automatico ao cancelar

### 12.3 Controle de Limites
- [ ] Middleware que verifica limites do plano antes de operacoes
- [ ] Contador de espaco usado por organizacao
- [ ] Alertas quando proximo do limite (80%, 90%, 100%)
- [ ] Bloquear upload quando exceder limite (com mensagem amigavel)

### 12.4 Pagina de Planos
- [ ] Landing page publica com comparacao de planos
- [ ] Formulario de registro com selecao de plano
- [ ] Pagina de upgrade dentro do admin
- [ ] Historico de faturas

**Arquivos afetados**: `src/models/Subscription.js` (novo), `src/routes/billing.js` (novo), `src/middleware/planLimits.js` (novo), `admin/js/tabs/plano.js` (novo)

---

## Ordem de Execucao Recomendada

```
FASE 1 (Perfil)        ──┐
FASE 2 (Watermark)     ──┼── Sprint 1 (1 semana) - Identidade visual
FASE 3.3 (Filtros)     ──┘

FASE 3.1 (Comentarios) ──┐
FASE 3.2 (Expiracao)   ──┼── Sprint 2 (1 semana) - Melhorias selecao
FASE 6 (PWA)           ──┘

FASE 4 (Entrega Alta)  ──── Sprint 3 (1 semana) - Entrega profissional

FASE 5 (CRM)           ──── Sprint 4 (1 semana) - Gestao de clientes

FASE 7 (Multi-selecao) ──── Sprint 5 (1 semana) - Formaturas/shows

FASE 8 (Prova Album)   ──── Sprint 6 (1-2 semanas) - Album folheavel

FASE 12 (Billing)      ──── Sprint 7 (1-2 semanas) - Monetizacao

FASE 9 (Site Custom)   ──── Sprint 8-10 (3-4 semanas) - Site builder
FASE 10 (Dominio)      ──┘
FASE 11 (Integracoes)  ──┘
```

**Caminho critico para MVP SaaS**: Fases 1 + 2 + 3 + 4 + 12 (ter algo vendavel)

---

## Padroes de Implementacao

### Cada nova feature DEVE seguir:

1. **Backend (CommonJS)**: Modelo Mongoose + Rotas Express + Middleware auth
2. **Admin (ES Modules)**: Nova aba em `admin/js/tabs/` com inline styles dark mode
3. **Cliente (Vanilla JS)**: Atualizar `cliente/js/gallery.js` se impactar galeria
4. **Multi-tenancy**: Sempre filtrar por `organizationId`
5. **Testes**: Testar localmente com `npm run dev` antes de deploy
6. **Deploy**: `git push` + na VPS: `git pull && npm install && pm2 restart`

### Checklist de cada feature:
- [ ] Modelo Mongoose criado/atualizado (com `timestamps: true`)
- [ ] Rotas Express criadas e registradas no `server.js`
- [ ] Aba admin criada e registrada no `admin/index.html`
- [ ] Todos os dados filtrados por `organizationId`
- [ ] Inline styles no admin (sem classes Tailwind)
- [ ] Testado em mobile e desktop
- [ ] Documentacao atualizada (CLAUDE.md)

---

## Metricas de Sucesso

| Metrica | Meta 3 meses | Meta 6 meses | Meta 12 meses |
|---------|-------------|-------------|---------------|
| Fotografos cadastrados | 50 | 200 | 1.000 |
| Fotografos pagantes | 10 | 50 | 300 |
| MRR (receita mensal) | R$ 500 | R$ 3.000 | R$ 20.000 |
| Galerias criadas/mes | 100 | 500 | 3.000 |
| Uptime | 99% | 99.5% | 99.9% |

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Disco da VPS encher | Alto | Monitorar uso, alertas em 80%, plano de upgrade |
| Performance com muitos tenants | Medio | Indices MongoDB, cache, CDN para assets |
| Concorrencia do PicSize (estabelecido) | Alto | Preco menor, features exclusivas, atendimento proximo |
| Pirataria/copia de fotos | Medio | Watermark forte, DRM basico, termos de uso |
| Custo de VPS crescer | Baixo | Margem de lucro nos planos cobre upgrade |

---

*Ultima atualizacao: 15/02/2026 - Fase 1 concluida*
*Referencia competitiva: PicSize (picsize.com.br)*
