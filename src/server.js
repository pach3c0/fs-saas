const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { ipKeyGenerator } = rateLimit; // helper que normaliza IPv6 (evita bypass por sub-rede)
const Organization = require('./models/Organization');
const { isCustomDomainServable } = require('./utils/domainAccess');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

// override: true garante que o .env sempre vence variáveis de ambiente do sistema/PM2
require('dotenv').config({ override: true });

const app = express();

// Atrás do Nginx (1 hop): confia no X-Forwarded-For p/ obter o IP real do cliente.
// Sem isto, req.ip = IP do proxy e o express-rate-limit lança ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant']
}));
// Limite de 5MB para JSON — suficiente para payloads reais (arrays de fotos, layers, configs).
// Uploads de imagem/vídeo usam multipart/form-data via multer e não passam por aqui.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Logging Middleware
app.use((req, res, next) => {
    req.requestId = uuidv4();
    // Logger base para TODA requisição (inclusive rotas públicas sem authenticateToken).
    // authenticateToken sobrescreve com um child mais rico (orgId/userId) nas rotas autenticadas.
    // Sem isto, qualquer req.logger.* em rota pública (ex.: login com senha errada) lançava
    // ReferenceError e travava a resposta até timeout.
    req.logger = logger.child({ requestId: req.requestId });
    const start = Date.now();

    // Log ao finalizar a resposta
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            orgId: req.user?.organizationId || req.organizationId || 'anonymous',
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        if (res.statusCode >= 500) {
            logger.error('API Request Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('API Request Warning', logData);
        } else {
            logger.info('API Request', logData);
        }
    });

    next();
});


// ============================================================================
// CORTINA DE MANUTENÇÃO GLOBAL (Super Admin)
// Bloqueia a plataforma com aviso amigável. Estado em PlatformConfig.maintenance.
// Cache curto + fail-open: erro de leitura/DB NUNCA derruba a plataforma.
// O Super Admin NUNCA é bloqueado (login + /saas-admin + JWT superadmin passam sempre).
// ============================================================================
const PlatformConfig = require('./models/PlatformConfig');

let _maintCache = { state: null, at: 0 };
const MAINT_TTL = 10 * 1000; // 10s — evita ler o DB a cada request (inclusive assets estáticos)

async function getMaintenanceState() {
  const now = Date.now();
  if (_maintCache.state && now - _maintCache.at < MAINT_TTL) return _maintCache.state;
  try {
    const cfg = await PlatformConfig.getSingleton();
    _maintCache = { state: cfg.maintenance || { enabled: false }, at: now };
  } catch {
    return { enabled: false }; // fail-open
  }
  return _maintCache.state;
}
// Permite que o handler do Super Admin zere o cache ao ligar/desligar (efeito imediato)
app.set('invalidateMaintenanceCache', () => { _maintCache = { state: null, at: 0 }; });

// Caminhos que SEMPRE passam (mesmo em manutenção)
function bypassesMaintenance(p) {
  return (
    p === '/api/health' ||
    p === '/api/login' ||
    p.startsWith('/api/auth/') ||
    p.startsWith('/saas-admin')
  );
}

// Bypass extra: qualquer requisição autenticada como superadmin (token válido)
function isSuperadminRequest(req) {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    if (!token) return false;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fs-fotografias-secret-key');
    return decoded && decoded.role === 'superadmin';
  } catch {
    return false;
  }
}

function renderMaintenancePage(state) {
  const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const msg = esc(state.message) || 'Estamos fazendo uma manutenção rápida para melhorar a plataforma. Já voltamos.';
  const eta = esc(state.etaText);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Em manutenção</title>
<style>
  :root{color-scheme:light dark}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    background:#0f1115;color:#e8e8eb}
  .card{max-width:480px;width:100%;text-align:center;background:#1a1d24;border:1px solid #2a2e38;
    border-radius:16px;padding:2.5rem 2rem;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  .ico{font-size:2.5rem;line-height:1;margin-bottom:1rem}
  h1{font-size:1.4rem;margin:0 0 .75rem}
  p{font-size:1rem;line-height:1.55;color:#b9bdc7;margin:0 0 1rem}
  .eta{display:inline-block;margin-top:.5rem;padding:.5rem .9rem;border-radius:999px;
    background:#242833;border:1px solid #333845;font-size:.85rem;color:#e8e8eb}
</style></head>
<body><div class="card">
  <div class="ico">🛠️</div>
  <h1>Voltamos já</h1>
  <p>${msg}</p>
  ${eta ? `<div class="eta">Previsão: ${eta}</div>` : ''}
</div></body></html>`;
}

app.use(async (req, res, next) => {
  const state = await getMaintenanceState();
  if (!state || !state.enabled) return next();
  if (bypassesMaintenance(req.path) || isSuperadminRequest(req)) return next();

  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      maintenance: true,
      message: state.message || 'Plataforma em manutenção. Voltamos em breve.',
      etaText: state.etaText || ''
    });
  }
  res.status(503).set('Retry-After', '600').type('html').send(renderMaintenancePage(state));
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/sessions', express.static(path.join(__dirname, '../uploads/sessions')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/cliente', express.static(path.join(__dirname, '../cliente')));
app.use('/saas-admin', express.static(path.join(__dirname, '../saas-admin')));
app.use('/home', express.static(path.join(__dirname, '../home')));
// Fase 8: servir visualizador de álbum de prova
app.use('/album', express.static(path.join(__dirname, '../album')));
// Triagem: PWA de separação facial (dev=pasta irmã, prod=TRIAGEM_PATH)
const TRIAGEM_DIR = process.env.TRIAGEM_PATH || path.join(__dirname, '../../cliquezoom-triagem');
app.use('/triagem', express.static(TRIAGEM_DIR));

// ============================================================================
// DYNAMIC ROUTES (must come BEFORE static middleware for /site)
// ============================================================================

// Home (landing page de cadastro da plataforma CliqueZoom)
// Se acessado via subdomínio de fotógrafo ou domínio customizado, redireciona para /site
app.get('/', async (req, res) => {
  const baseDomain = (process.env.BASE_DOMAIN || 'cliquezoom.com.br').trim();
  const host = (req.get('host') || '').split(':')[0].toLowerCase();

  const isPhotographerSubdomain =
    host.endsWith(`.${baseDomain}`) &&
    host !== `www.${baseDomain}` &&
    host !== `app.${baseDomain}`;

  if (isPhotographerSubdomain) {
    return res.redirect(301, '/site');
  }

  // Verificar se é domínio customizado (não pertence ao domínio base e não é localhost/IP)
  const isPlatformDomain = 
    host === baseDomain || 
    host === `www.${baseDomain}` || 
    host === `app.${baseDomain}` || 
    host === `erp.${baseDomain}` || 
    host === `crm.${baseDomain}` || 
    host === `license.${baseDomain}` || 
    host === `hub.${baseDomain}` ||
    host.endsWith(`.${baseDomain}`) ||
    host === 'localhost' ||
    host === '127.0.0.1';

  if (!isPlatformDomain) {
    try {
      const orgExists = await Organization.findOne({ customDomain: host, isActive: true }).select('_id').lean();
      if (orgExists) {
        // Cerca de plano: domínio próprio só serve se o plano permite (Pro/Studio).
        // Org rebaixada pro Free → 404 (reversível; subdomínio grátis segue no ar).
        if (!(await isCustomDomainServable(orgExists))) {
          return res.status(404).send('Site não encontrado.');
        }
        return res.redirect(301, '/site');
      }
    } catch (err) {
      logger.error('Erro ao verificar domínio customizado na raiz:', { message: err.message });
    }
  }

  // TEMPORÁRIO (2026-06-28): a landing real (home/index.html) está "de canto" até a reforma.
  // Enquanto isso, a home pública mostra a página "Em construção" com só o botão de login,
  // pois o link do admin é divulgado direto e a landing ainda não vende o SaaS.
  // Atalho do dono p/ ver a landing real em construção: /?preview  (ou a rota /preview).
  // Reverter = voltar a servir '../home/index.html' aqui (a landing nunca foi removida).
  if (req.query.preview !== undefined) {
    return res.sendFile(path.join(__dirname, '../home/index.html'));
  }
  res.sendFile(path.join(__dirname, '../home/construcao.html'));
});

// SPA route for client gallery
app.get('/galeria/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../cliente/index.html'));
});

// SPA route for photographer site (serves template based on siteTheme)
app.get('/site', async (req, res) => {
  const masterPath = path.join(__dirname, '../site/templates/master/index.html');
  try {
    const validThemes = ['elegante', 'minimalista', 'moderno', 'escuro', 'galeria'];
    let theme = 'elegante';

    // Preview mode: _preview_theme substitui o tema salvo sem tocar no banco
    if (req.query._preview_theme && validThemes.includes(req.query._preview_theme)) {
      theme = req.query._preview_theme;
    } else {
      const tenant = req.query._tenant || req.headers['x-tenant'];
      const baseDomain = (process.env.BASE_DOMAIN || 'cliquezoom.com.br').trim();
      const hostname = req.hostname.toLowerCase();
      const subdomain = hostname.endsWith(`.${baseDomain}`) ? hostname.replace(`.${baseDomain}`, '') : null;
      const ownerSlug = (process.env.OWNER_SLUG || 'fs').trim();

      // Candidatos em ordem de prioridade para slug: tenant header/query → subdomínio → fallback owner
      const slugCandidates = [
        tenant,
        (subdomain && subdomain !== hostname && subdomain !== 'app') ? subdomain : null,
        ownerSlug
      ].filter(Boolean);

      // Busca por slug OU por domínio customizado
      const orgs = await Organization.find({
        $or: [
          { slug: { $in: slugCandidates } },
          { customDomain: hostname }
        ]
      })
      .select('_id siteTheme slug customDomain')
      .lean();

      // Resolução de prioridade:
      // 1. Domínio customizado exato
      // 2. Slug candidatos (tenant > subdomain > owner)
      let org = orgs.find(o => o.customDomain === hostname);

      // Cerca de plano: se a org foi resolvida pelo domínio PRÓPRIO e o plano não
      // permite (Free), não serve o site nesse domínio → 404 (subdomínio segue OK).
      if (org && !(await isCustomDomainServable(org))) {
        return res.status(404).send('Site não encontrado.');
      }

      if (!org) {
        const bySlug = Object.fromEntries(orgs.map(o => [o.slug, o]));
        org = slugCandidates.map(s => bySlug[s]).find(Boolean);
      }

      if (org?.siteTheme && validThemes.includes(org.siteTheme)) {
        theme = org.siteTheme;
      }
    }

    let html = await fs.promises.readFile(masterPath, 'utf-8');
    html = html.replace('<html lang="pt-BR">', `<html lang="pt-BR" data-theme="${theme}">`);
    res.send(html);

  } catch (error) {
    logger.error('Erro ao servir template do site:', { message: error.message });
    try {
      res.sendFile(masterPath); // Fallback to send the raw file if string replacement fails
    } catch {
      res.status(500).send('Erro interno ao carregar o site.');
    }
  }
});


// Static assets for site templates (CSS, JS, fonts) - AFTER dynamic route
app.use('/site', express.static(path.join(__dirname, '../site')));

// Página pública de auto-inscrição (Seleção em Grupo via QR Code)
// Vinculada ao domínio/subdomínio do fotógrafo — o middleware resolveTenant injeta req.organizationId
// Exemplo: https://flavia.cliquezoom.com.br/inscrever/AB12 ou https://flavia.com.br/inscrever/AB12
app.get('/inscrever/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '../site/inscrever/index.html'));
});

// Preview route (bypasses maintenance curtain)
app.get('/preview', (req, res) => {
  res.redirect('/?preview');
});

// Favicon handler (silence 404)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';
let isConnected = false;

const connectWithRetry = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 2
    });
    isConnected = true;
    logger.info('MongoDB conectado com sucesso');

    // Salvaguarda de cobrança (ALERTA de boot — só registra, NÃO interrompe o processo): com
    // MP_USE_PREAPPROVAL ligado, a 1ª rede da reversão automática (PROTECTED_ORG_SLUGS/OWNER_SLUG)
    // só blinda contas reais (Flávia/Davi) enquanto estiver setada. A 2ª rede (overrideEnabled, vinda
    // do banco) cobre essas contas mesmo sem a env, por isso aqui é alerta ALTO (PlatformLog/Eventos)
    // e não process.exit — derrubar o boot por env ausente seria pior que o risco já duplamente coberto.
    if (process.env.MP_USE_PREAPPROVAL === 'true') {
      const { protectedSlugs } = require('./utils/protectedOrgs');
      if (protectedSlugs().length === 0) {
        logger.error('[billing] PERIGO: MP_USE_PREAPPROVAL=true mas PROTECTED_ORG_SLUGS/OWNER_SLUG VAZIO — estorno/chargeback pode rebaixar/suspender contas reais. Configurar no .env IMEDIATAMENTE.');
      }
    }

    // Em cluster PM2, apenas o worker 0 roda os schedulers para evitar envios duplicados.
    // Trava de ambiente: em beta/staging os schedulers NÃO sobem (nada de automação/e-mail
    // disparando contra dados reais a partir de um ambiente de teste).
    const instanceId = process.env.NODE_APP_INSTANCE;
    const appEnv = process.env.APP_ENV;
    if (appEnv === 'beta' || appEnv === 'staging') {
      logger.warn(`[scheduler] Ambiente "${appEnv}": schedulers DESLIGADOS (sem automações em beta/staging)`);
    } else if (instanceId === undefined || instanceId === '0') {
      startDeadlineScheduler();
    }
  } catch (err) {
    logger.error('Erro na conexão MongoDB:', { message: err.message });
    isConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

const { checkDeadlines } = require('./utils/deadlineChecker');
const { checkOffboarding } = require('./utils/offboardingChecker');
const { checkGracePeriods } = require('./utils/graceChecker');
const { checkSubscriptionPeriods } = require('./utils/subscriptionPeriodChecker');
const postDeliveryAutomator = require('./utils/postDeliveryAutomator');
const anniversaryAutomator = require('./utils/anniversaryAutomator');
const storageRetentionChecker = require('./utils/storageRetentionChecker');
const storageReconciler = require('./utils/storageReconciler');
const agentDigest = require('./utils/agentDigest');
const ticketAutomation = require('./utils/ticketAutomation');

// Lock anti-sobreposição + telemetria persistida no SchedulerRun (aba Sistema)
const { safeInterval, recordRun } = require('./utils/schedulerRunner');

// Roda a cada 6h — verifica prazos e envia e-mails para orgs com automação ativada
let deadlineSchedulerStarted = false;
function startDeadlineScheduler() {
  if (deadlineSchedulerStarted) return;
  deadlineSchedulerStarted = true;
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  safeInterval('deadlineChecker', () => checkDeadlines(), SIX_HOURS);
  logger.info('[scheduler] Verificador de prazos iniciado (a cada 6h)');

  // Roda 1x por dia — verifica orgs suspensas e aplica offboarding após grace period
  safeInterval('offboardingChecker', () => checkOffboarding(), ONE_DAY);
  logger.info('[scheduler] Offboarding checker iniciado (a cada 24h)');

  // F3 — Carência de regularização: avisa e suspende (NÃO exclui) orgs cujo prazo venceu
  safeInterval('graceChecker', () => checkGracePeriods(), ONE_DAY);
  logger.info('[scheduler] Grace checker (carência de cobrança) iniciado (a cada 24h)');

  // Fase 2 — Fim de ciclo do cancelamento voluntário: rebaixa pro Free quando o ciclo já
  // pago vence (currentPeriodEnd). Reusa revertSubscriptionToFree (blinda protegida/cortesia).
  safeInterval('subscriptionPeriodChecker', () => checkSubscriptionPeriods(), ONE_DAY);
  logger.info('[scheduler] Subscription period checker (fim de ciclo) iniciado (a cada 24h)');

  // Escassês de vendas: upsell pós-entrega na janela entre a entrega e a exclusão do storage
  safeInterval('postDeliveryUpsell', () => postDeliveryAutomator.run(), SIX_HOURS);
  logger.info('[scheduler] Post-delivery upsell automator iniciado (a cada 6h)');

  // Retenção de storage: roda 1× por dia às 9h Brasília (12h UTC)
  safeInterval('storageRetention', () => storageRetentionChecker.run(), ONE_DAY);
  logger.info('[scheduler] Storage retention checker iniciado (a cada 24h)');

  // Medidor de storage (Fase 1 — SÓ-MEDE): varre o disco real de cada org e
  // grava o uso na Subscription. Roda 1× por dia; a 1ª execução (boot) backfilla.
  safeInterval('storageReconciler', () => storageReconciler.run(), ONE_DAY);
  logger.info('[scheduler] Storage reconciler (medidor) iniciado (a cada 24h)');

  // Digest proativo do agente: checa a cada 6h, mas só gera se habilitado e dentro da janela.
  safeInterval('agentDigest', () => agentDigest.run(), SIX_HOURS);
  logger.info('[scheduler] Agent digest checker iniciado (a cada 6h, desligado por padrão)');

  // Automação de chamados: lembrete + auto-encerramento por falta de resposta (checa a cada 15min).
  const FIFTEEN_MIN = 15 * 60 * 1000;
  safeInterval('ticketAutomation', () => ticketAutomation.run(), FIFTEEN_MIN);
  logger.info('[scheduler] Ticket automation iniciado (a cada 15min)');

  // CRM reativacao de clientes: roda todo dia às 8h horario de Brasilia (11h UTC)
  function agendarProximaReativacao() {
    const now = new Date();
    const proximas8h = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 11, 0, 0, 0));
    if (proximas8h <= now) proximas8h.setUTCDate(proximas8h.getUTCDate() + 1);
    const delay = proximas8h - now;
    setTimeout(async () => {
      await recordRun('anniversaryAutomator', () => anniversaryAutomator.run());
      agendarProximaReativacao();
    }, delay);
    logger.info(`[scheduler] Anniversary automator agendado para ${proximas8h.toISOString()} (8h Brasília)`);
  }
  agendarProximaReativacao();
}

connectWithRetry();

mongoose.connection.on('error', (err) => {
  logger.error('Erro de conexão MongoDB:', { message: err.message });
});

// Health check
const SiteData = require('./models/SiteData');

app.get('/api/health', async (req, res) => {
  const readyState = mongoose.connection.readyState;
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];

  try {
    const mongoTest = readyState === 1 ? await SiteData.findOne().lean() : null;
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      mongodb: {
        state: readyState,
        stateText: states[readyState] || 'desconhecido',
        hasData: !!mongoTest
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      mongodb: {
        state: readyState,
        stateText: states[readyState] || 'desconhecido'
      }
    });
  }
});

// ============================================================================
// MIDDLEWARES
// ============================================================================

// Rate limiting por tenant — evita Neighbor Noise e abuso da API
// Superadmins e rotas públicas do site não são afetados
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // janela de 1 minuto
  max: 300,            // máx 300 req/min por tenant (ou IP se não autenticado)
  // Chave por tenant quando autenticado; senão por IP normalizado (IPv6 colapsado em /56)
  keyGenerator: (req) => req.user?.organizationId ? String(req.user.organizationId) : ipKeyGenerator(req.ip),
  skip: (req) => req.path.startsWith('/site') || req.user?.role === 'superadmin'
    // Dev: não rate-limita localhost (evita 429 ao rodar a suíte E2E local). Produção intacta.
    || (process.env.NODE_ENV !== 'production' && ['::1', '127.0.0.1', '::ffff:127.0.0.1'].includes(req.ip)),
  handler: (req, res) => {
    const log = req.logger || logger;
    log.warn('Rate Limit Hit', { 
      orgId: req.user?.organizationId || 'anon', 
      ip: req.ip, 
      path: req.path 
    });
    res.status(429).json({ error: 'Muitas requisições. Aguarde um momento e tente novamente.' });
  },
  validate: { default: false }, // Desativa avisos de validação (Nginx proxy)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const { resolveTenant } = require('./middleware/tenant');

// Aplicar resolveTenant nas rotas publicas (GET sem auth)
// As rotas usam req.organizationId (do tenant) OU req.user.organizationId (do JWT)
app.use('/api/hero', resolveTenant);
app.use('/api/site-config', resolveTenant);
app.use('/api/faq', resolveTenant);
// Rotas de álbum cliente usam accessCode (sem tenant) — não aplicar resolveTenant
app.use('/api/client', (req, res, next) => {
  if (req.path.startsWith('/album')) return next();
  return resolveTenant(req, res, next);
});
app.use('/api/organization/public', resolveTenant);
app.use('/api/site/config', resolveTenant);
app.use('/api/site/depoimento', resolveTenant);
app.use('/api/site/contact', resolveTenant);
// Rotas públicas de auto-inscrição (Seleção em Grupo via QR Code)
app.use('/api/sessions/register', resolveTenant);

// ============================================================================
// ROTAS (cada router montado apenas UMA vez)
// ============================================================================
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/siteData'));
app.use('/api', require('./routes/sessions'));
app.use('/api', require('./routes/upload'));
app.use('/api', require('./routes/notifications'));
app.use('/api', require('./routes/organization'));
app.use('/api', require('./routes/clients'));
app.use('/api', require('./routes/gestao'));
app.use('/api', require('./routes/sales'));
// Fase 8: registrar rotas de álbuns de prova
app.use('/api', require('./routes/albums'));
app.use('/api', require('./routes/site'));
app.use('/api', require('./routes/domains'));
app.use('/api', require('./routes/billing'));
app.use('/api', require('./routes/payments'));
app.use('/api', require('./routes/landing'));
app.use('/api', require('./routes/saasAdmin'));
app.use('/api', require('./routes/tutorials'));
app.use('/api', require('./routes/manual'));
app.use('/api', require('./routes/partnerBanners'));
app.use('/api', require('./routes/announcements'));
app.use('/api', require('./routes/platformUpdates'));
app.use('/api', require('./routes/dashboardCards'));
app.use('/api', require('./routes/sessionCardBackgrounds'));
app.use('/api', require('./routes/tickets'));
app.use('/api', require('./routes/saasSystem'));
app.use('/api', require('./routes/saasAgent'));
app.use('/api', require('./routes/presence'));
app.use('/api', require('./routes/triagem'));
app.use('/api', require('./routes/push'));



// ============================================================================
// GLOBAL ERROR HANDLER — deve vir APÓS todas as rotas
// ============================================================================

// 404 para rotas /api/* não mapeadas
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada', path: req.originalUrl });
});

// Error handler global — captura throws síncronos e promise rejections em handlers async
// (express 4 propaga async errors via next(err) só se a rota chamar; aqui pegamos o que chegar)
app.use((err, req, res, next) => {
  const log = req.logger || logger;
  const status = err.status || err.statusCode || 500;

  log.error('Request Error', {
    status,
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  if (res.headersSent) return next(err);

  const payload = { error: status >= 500 ? 'Erro interno do servidor' : (err.message || 'Erro') };
  if (process.env.NODE_ENV !== 'production') payload.detail = err.message;
  res.status(status).json(payload);
});

// Salvaguardas de processo — evita que uma promise rejeitada ou exceção não tratada
// derrube o PM2 e afete todos os tenants do cluster
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason,
    stack: reason?.stack 
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { 
    message: err.message,
    stack: err.stack 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  // Web Push (VAPID): configura o transporte 1x no boot. Sem VAPID → no-op silencioso.
  try { require('./services/pushService').init(); } catch (_) { /* nunca derruba o boot */ }
});

// Sinaliza ao PM2 que o processo está pronto (usado no modo cluster para zero-downtime reload)
mongoose.connection.once('open', () => {
  if (process.send) process.send('ready');
});
