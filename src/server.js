const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Organization = require('./models/Organization');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
// Limite de 5MB para JSON — suficiente para payloads reais (arrays de fotos, layers, configs).
// Uploads de imagem/vídeo usam multipart/form-data via multer e não passam por aqui.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));


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
  const fallback = path.join(__dirname, '../site/templates/elegante/index.html');
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

    const templatePath = path.join(__dirname, `../site/templates/${theme}/index.html`);

    try {
      await fs.promises.access(templatePath);
    } catch {
      return res.sendFile(fallback);
    }

    res.sendFile(templatePath);
  } catch (error) {
    console.error('Erro ao servir template do site:', error);
    res.sendFile(fallback);
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
  } catch (err) {
    console.error('Erro na conexão MongoDB:', err.message);
    isConnected = false;
    setTimeout(connectWithRetry, 5000);
  }
};

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
app.use('/api', require('./routes/landing'));

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Sinaliza ao PM2 que o processo está pronto (usado no modo cluster para zero-downtime reload)
mongoose.connection.once('open', () => {
  if (process.send) process.send('ready');
});
