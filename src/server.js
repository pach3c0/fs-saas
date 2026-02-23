const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads/sessions', express.static(path.join(__dirname, '../uploads/sessions')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/admin', express.static(path.join(__dirname, '../admin')));
app.use('/cliente', express.static(path.join(__dirname, '../cliente')));
app.use('/saas-admin', express.static(path.join(__dirname, '../saas-admin')));
// Fase 8: servir visualizador de álbum de prova
app.use('/album', express.static(path.join(__dirname, '../album')));
// Landing page do SaaS (assets CSS/JS da landing)
app.use('/landing', express.static(path.join(__dirname, '../landing')));

// ============================================================================
// DYNAMIC ROUTES (must come BEFORE static middleware for /site and /public)
// ============================================================================

// Raiz do SaaS: serve a página de cadastro como homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../cadastro/index.html'));
});

// Site público do fotógrafo em /public (APÓS a rota raiz para não conflitar)
app.use(express.static(path.join(__dirname, '../public')));

// SPA route for client gallery
app.get('/galeria/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../cliente/index.html'));
});

// SPA route for photographer site (serves template based on siteTheme)
app.get('/site', async (req, res) => {
  try {
    const Organization = require('./models/Organization');

    // Resolve tenant (same logic as resolveTenant middleware)
    let orgId = null;
    const tenant = req.query._tenant || req.headers['x-tenant'];

    if (tenant) {
      const org = await Organization.findOne({ slug: tenant });
      if (org) orgId = org._id;
    } else {
      // In production, extract subdomain from req.hostname
      const hostname = req.hostname;
      const baseDomain = process.env.BASE_DOMAIN || 'cliquezoom.com.br';
      const subdomain = hostname.replace(`.${baseDomain}`, '');
      if (subdomain && subdomain !== hostname && subdomain !== 'app') {
        const org = await Organization.findOne({ slug: subdomain });
        if (org) orgId = org._id;
      }
    }

    // Default to owner org if no tenant found
    if (!orgId) {
      const ownerSlug = process.env.OWNER_SLUG || 'fs';
      const org = await Organization.findOne({ slug: ownerSlug });
      if (org) orgId = org._id;
    }

    // Get organization theme
    let theme = 'elegante'; // default
    if (orgId) {
      const org = await Organization.findById(orgId).select('siteTheme');
      theme = org?.siteTheme || 'elegante';
    }

    // Map theme to template path
    const templatePath = path.join(__dirname, `../site/templates/${theme}/index.html`);

    // Check if template exists, fallback to elegante
    const fs = require('fs');
    if (!fs.existsSync(templatePath)) {
      return res.sendFile(path.join(__dirname, '../site/templates/elegante/index.html'));
    }

    res.sendFile(templatePath);
  } catch (error) {
    console.error('Error serving site template:', error);
    // Fallback to elegante on error
    res.sendFile(path.join(__dirname, '../site/templates/elegante/index.html'));
  }
});

// Static assets for site templates (CSS, JS, fonts) - AFTER dynamic route
app.use('/site', express.static(path.join(__dirname, '../site')));
app.use('/cadastro', express.static(path.join(__dirname, '../cadastro')));

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
app.use('/api/site-data', resolveTenant);
app.use('/api/hero', resolveTenant);
app.use('/api/site-config', resolveTenant);
app.use('/api/faq', resolveTenant);
app.use('/api/newsletter/subscribe', resolveTenant);
app.use('/api/client', resolveTenant);
app.use('/api/organization/public', resolveTenant);
app.use('/api/site/config', resolveTenant);

// ============================================================================
// ROTAS (cada router montado apenas UMA vez)
// ============================================================================
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/siteData'));
app.use('/api', require('./routes/newsletter'));
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
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
