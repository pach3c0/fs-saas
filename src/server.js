const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const Organization = require('./models/Organization');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();

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

// ============================================================================
// DYNAMIC ROUTES (must come BEFORE static middleware for /site)
// ============================================================================

// Home (landing page de cadastro da plataforma CliqueZoom)
// Se acessado via subdomínio de fotógrafo (ex: soraia.cliquezoom.com.br), redireciona para /site
app.get('/', (req, res) => {
  const baseDomain = process.env.BASE_DOMAIN || 'cliquezoom.com.br';
  const host = (req.get('host') || '').split(':')[0];
  const isPhotographerSubdomain =
    host.endsWith(`.${baseDomain}`) &&
    host !== `www.${baseDomain}` &&
    host !== `app.${baseDomain}`;

  if (isPhotographerSubdomain) {
    return res.redirect(301, '/site');
  }

  res.sendFile(path.join(__dirname, '../home/index.html'));
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
      const baseDomain = process.env.BASE_DOMAIN || 'cliquezoom.com.br';
      const hostname = req.hostname;
      const subdomain = hostname.replace(`.${baseDomain}`, '');
      const ownerSlug = process.env.OWNER_SLUG || 'fs';

      // Candidatos em ordem de prioridade: tenant header/query → subdomínio → fallback owner
      const candidates = [
        tenant,
        (subdomain && subdomain !== hostname && subdomain !== 'app') ? subdomain : null,
        ownerSlug
      ].filter(Boolean);

      // Uma única query — prioridade respeitada em JS após resultado
      const orgs = await Organization.find({ slug: { $in: candidates } })
        .select('_id siteTheme slug')
        .lean();

      // Reordenar conforme prioridade dos candidatos
      const bySlug = Object.fromEntries(orgs.map(o => [o.slug, o]));
      const org = candidates.map(s => bySlug[s]).find(Boolean);

      if (org?.siteTheme && validThemes.includes(org.siteTheme)) {
        theme = org.siteTheme;
      }
    }

    let html = await fs.promises.readFile(masterPath, 'utf-8');
    html = html.replace('<html lang="pt-BR">', `<html lang="pt-BR" data-theme="${theme}">`);
    res.send(html);

  } catch (error) {
    console.error('Erro ao servir template do site:', error);
    try {
      res.sendFile(masterPath); // Fallback to send the raw file if string replacement fails
    } catch {
      res.status(500).send('Erro interno ao carregar o site.');
    }
  }
});


// Static assets for site templates (CSS, JS, fonts) - AFTER dynamic route
app.use('/site', express.static(path.join(__dirname, '../site')));

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
    console.log('MongoDB conectado com sucesso');
    startDeadlineScheduler();
  } catch (err) {
    console.error('Erro na conexão MongoDB:', err.message);
    isConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

const { checkDeadlines } = require('./utils/deadlineChecker');
const { checkOffboarding } = require('./utils/offboardingChecker');

// Evita execuções sobrepostas: se a rodada anterior ainda está em curso, pula o tick
function safeInterval(fn, ms) {
  let isRunning = false;
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try { await fn(); } catch (e) { console.error(e); } finally { isRunning = false; }
  };
  run();
  return setInterval(run, ms);
}

// Roda a cada 6h — verifica prazos e envia e-mails para orgs com automação ativada
let deadlineSchedulerStarted = false;
function startDeadlineScheduler() {
  if (deadlineSchedulerStarted) return;
  deadlineSchedulerStarted = true;
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;

  safeInterval(() => checkDeadlines(), SIX_HOURS);
  console.log('[scheduler] Verificador de prazos iniciado (a cada 6h)');

  // Roda 1x por dia — verifica orgs suspensas e aplica offboarding após grace period
  safeInterval(() => checkOffboarding(), ONE_DAY);
  console.log('[scheduler] Offboarding checker iniciado (a cada 24h)');
}

connectWithRetry();

mongoose.connection.on('error', (err) => {
  console.error('Erro de conexão MongoDB:', err.message);
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
  keyGenerator: (req) => req.user?.organizationId || req.ip,
  skip: (req) => req.path.startsWith('/site') || req.user?.role === 'superadmin',
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
app.use('/api/client', resolveTenant);
app.use('/api/organization/public', resolveTenant);
app.use('/api/site/config', resolveTenant);
app.use('/api/site/depoimento', resolveTenant);
app.use('/api/site/contact', resolveTenant);

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
// Fase 8: registrar rotas de álbuns de prova
app.use('/api', require('./routes/albums'));
app.use('/api', require('./routes/site'));
app.use('/api', require('./routes/domains'));
app.use('/api', require('./routes/billing'));
app.use('/api', require('./routes/payments'));
app.use('/api', require('./routes/landing'));
app.use('/api', require('./routes/saasAdmin'));

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
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Sinaliza ao PM2 que o processo está pronto (usado no modo cluster para zero-downtime reload)
mongoose.connection.once('open', () => {
  if (process.send) process.send('ready');
});
