const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Organization = require('../models/Organization');
const DefaultSiteTemplate = require('../models/DefaultSiteTemplate');
const Notification = require('../models/Notification');
const { sendPendingDepoimentoEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');
const { clearOrgCache } = require('../middleware/tenant');
const { createUploader } = require('../utils/multerConfig');
const { checkHoneyPot } = require('../middleware/security');

const DEFAULT_SECTIONS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];

const uploadSite = createUploader('site');

// Public config (uses resolveTenant middleware from server.js)
router.get('/site/config', async (req, res) => {
  try {
    // req.organizationId comes from resolveTenant
    if (!req.organizationId) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const org = await Organization.findById(req.organizationId)
      .select('name logo primaryColor siteEnabled siteTheme siteConfig siteSections siteContent siteStyle email integrations');

    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const result = org.toObject();
    if (result.siteEnabled == null) result.siteEnabled = true;
    if (!result.siteSections || result.siteSections.length === 0) result.siteSections = DEFAULT_SECTIONS;

    // Rota pública: expõe só o que o site injeta/exibe. Nunca vazar accessToken
    // nem configs internas de automação (deadlineAutomation, salesAutomator/cupons).
    const integ = result.integrations || {};
    result.integrations = {
      googleAnalytics: {
        enabled: !!integ.googleAnalytics?.enabled,
        measurementId: integ.googleAnalytics?.measurementId || ''
      },
      metaPixel: {
        enabled: !!integ.metaPixel?.enabled,
        pixelId: integ.metaPixel?.pixelId || ''
      },
      whatsapp: integ.whatsapp || {},
      seo: integ.seo || {}
    };

    // Se estiver em modo preview, substitui o tema retornado pelo simulado na query
    if (req.query._preview_theme) {
      const validThemes = ['elegante', 'minimalista', 'moderno', 'escuro', 'galeria'];
      if (validThemes.includes(req.query._preview_theme)) {
        result.siteTheme = req.query._preview_theme;
      }
    }

    res.json(result);
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get config
router.get('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId)
      .select('siteEnabled siteTheme siteConfig siteSections siteContent siteStyle');
    const result = org ? org.toObject() : {};
    if (result.siteEnabled == null) result.siteEnabled = true;
    if (!result.siteSections || result.siteSections.length === 0) result.siteSections = DEFAULT_SECTIONS;
    res.json(result);
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update config
router.put('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const updateData = {};
    const allowedKeys = ['siteEnabled', 'siteTheme', 'siteSections', 'siteStyle'];

    allowedKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // siteConfig: merge por sub-chave para não apagar campos não enviados (ex: title, description)
    if (req.body.siteConfig !== undefined) {
      Object.entries(req.body.siteConfig).forEach(([key, value]) => {
        updateData[`siteConfig.${key}`] = value;
      });
    }

    // siteContent: merge por sub-chave para não apagar outros campos (sobre, servicos, etc)
    if (req.body.siteContent !== undefined) {
      Object.entries(req.body.siteContent).forEach(([key, value]) => {
        // Para portfolio.photos, usar dot notation profunda para garantir que o array seja salvo
        if (key === 'portfolio') {
          // Salvar o objeto portfolio inteiro para evitar conflito de dot notation no MongoDB
          updateData['siteContent.portfolio'] = value;
        } else {
          updateData[`siteContent.${key}`] = value;
        }
      });
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { returnDocument: 'after', strict: false }
    );

    if (org?.slug) clearOrgCache(org.slug);
    res.json({ success: true, org });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Upload portfolio photo
router.post('/site/admin/portfolio', authenticateToken, uploadSite.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    // Resize
    const originalPath = req.file.path;
    const resizedFilename = 'resized-' + req.file.filename;
    const resizedPath = path.join(path.dirname(originalPath), resizedFilename);

    await sharp(originalPath)
      .resize(1200, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(resizedPath);
    
    // Remove original (optional, keeping it simple)
    try { await fs.promises.unlink(originalPath); } catch(e) {}

    const url = `/uploads/${req.user.organizationId}/site/${resizedFilename}`;

    // Add to portfolio
    if (!org.siteContent) org.siteContent = {};
    if (!org.siteContent.portfolio) org.siteContent.portfolio = { photos: [] };
    
    org.siteContent.portfolio.photos.push({ url });
    await org.save();

    res.json({ success: true, url });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete portfolio photo
router.delete('/site/admin/portfolio/:idx', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    const idx = parseInt(req.params.idx);
    if (org.siteContent && org.siteContent.portfolio && org.siteContent.portfolio.photos[idx]) {
      const photo = org.siteContent.portfolio.photos[idx];
      // Try to delete file
      if (photo.url && photo.url.startsWith('/uploads/')) {
        try { await fs.promises.unlink(path.join(__dirname, '../..', photo.url)); } catch(e) {}
      }
      org.siteContent.portfolio.photos.splice(idx, 1);
      await org.save();
    }

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Uso de armazenamento com divisão por categorias
router.get('/site/admin/storage', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId.toString();
    const orgUploadDir = path.join(__dirname, '../../uploads', orgId);

    async function calcSize(dir) {
      let total = 0;
      try {
        await fs.promises.access(dir);
      } catch {
        return 0;
      }
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const sizes = await Promise.all(entries.map(async (entry) => {
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return calcSize(fp);
        } else {
          try {
            const stat = await fs.promises.stat(fp);
            return stat.size;
          } catch {
            return 0;
          }
        }
      }));
      return sizes.reduce((acc, s) => acc + s, 0);
    }

    // Calcular por categoria
    const [sessionsSize, siteSize, rootSize, videosSize] = await Promise.all([
      calcSize(path.join(orgUploadDir, 'sessions')),
      calcSize(path.join(orgUploadDir, 'site')),
      calcSize(orgUploadDir), // Total root
      calcSize(path.join(orgUploadDir, 'videos'))
    ]);

    // O rootSize inclui os subdiretórios. Para pegar o "Sistema" (logos na raiz + outros):
    // Sistema = Root - Sessions - Site - Videos (se videos for considerado separado, mas aqui somaremos)
    const sessionsTotal = sessionsSize; 
    const siteTotal = siteSize;
    const systemTotal = Math.max(0, rootSize - sessionsTotal - siteTotal);

    const totalMB = Math.round(rootSize / 1024 / 1024 * 100) / 100;
    
    res.json({ 
      storageMB: totalMB, 
      storageBytes: rootSize,
      breakdown: {
        sessions: Math.round(sessionsTotal / 1024 / 1024 * 100) / 100,
        site: Math.round(siteTotal / 1024 / 1024 * 100) / 100,
        system: Math.round(systemTotal / 1024 / 1024 * 100) / 100
      }
    });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});


// Público: Submeter depoimento para aprovação
router.post('/site/depoimento', checkHoneyPot, async (req, res) => {
  try {
    if (!req.organizationId) return res.status(404).json({ error: 'Organização não encontrada' });
    // Aceita PT-BR (nome/texto) — campos EN (name/text) mantidos internamente no banco
    const { nome, texto, email, rating } = req.body;
    if (!nome || !texto) return res.status(400).json({ error: 'Nome e texto são obrigatórios' });

    const id = crypto.randomBytes(8).toString('hex');
    // Clamp 1–5: rating fora da faixa (ex.: -3) quebrava o render do admin ('⭐'.repeat negativo)
    const notaSegura = Math.min(5, Math.max(1, parseInt(rating) || 5));
    await Organization.findByIdAndUpdate(req.organizationId, {
      $push: { 'siteContent.pendingDepoimentos': { id, name: nome, text: texto, email: email || '', rating: notaSegura } }
    });
    res.json({ success: true });

    // Notifica o fotografo por notificacao no admin + email (fire-and-forget)
    try {
      await Notification.create({
        organizationId: req.organizationId,
        type: 'depoimento_pendente',
        message: `⭐ ${nome}${email ? ` (${email})` : ''}: ${texto}`
      });
    } catch (e) {
      req.logger?.error('[Depoimento] Erro ao criar notificacao:', e.message);
    }
    try {
      const org = await Organization.findById(req.organizationId).select('email name');
      if (org?.email) {
        sendPendingDepoimentoEmail(org.email, nome, org.name);
      }
    } catch (e) {
      req.logger?.error('[Depoimento] Erro ao enviar email de notificacao:', e.message);
    }
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Público: Formulário de contato
router.post('/site/contact', checkHoneyPot, async (req, res) => {
  try {
    if (!req.organizationId) return res.status(404).json({ error: 'Organização não encontrada' });
    const { nome, email, assunto, mensagem } = req.body;
    if (!nome || !mensagem) return res.status(400).json({ error: 'Nome e mensagem são obrigatórios' });

    await Notification.create({
      organizationId: req.organizationId,
      type: 'contact',
      message: `📩 ${nome}${email ? ` (${email})` : ''}${assunto ? ` — ${assunto}` : ''}: ${mensagem}`
    });

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Listar depoimentos pendentes
router.get('/site/admin/depoimentos-pendentes', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).select('siteContent.pendingDepoimentos').lean();
    res.json({ pending: org?.siteContent?.pendingDepoimentos || [] });
  } catch (error) {
    req.logger.error('Erro ao listar depoimentos pendentes', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Aprovar depoimento pendente
router.post('/site/admin/depoimentos-pendentes/:id/aprovar', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    const pending = org.siteContent && org.siteContent.pendingDepoimentos ? org.siteContent.pendingDepoimentos.find(d => d.id === req.params.id) : null;
    if (!pending) return res.status(404).json({ error: 'Depoimento não encontrado' });

    // Mover para aprovados
    if (!org.siteContent) org.siteContent = {};
    if (!org.siteContent.depoimentos) org.siteContent.depoimentos = [];
    org.siteContent.depoimentos.push({ id: pending.id, name: pending.name, text: pending.text, rating: pending.rating, photo: '', socialLink: '' });

    // Remover dos pendentes
    org.siteContent.pendingDepoimentos = (org.siteContent.pendingDepoimentos || []).filter(d => d.id !== req.params.id);
    org.markModified('siteContent');
    await org.save();

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao aprovar depoimento', { id: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Admin: Rejeitar depoimento pendente
router.delete('/site/admin/depoimentos-pendentes/:id', authenticateToken, async (req, res) => {
  try {
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      $pull: { 'siteContent.pendingDepoimentos': { id: req.params.id } }
    });
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao rejeitar depoimento', { id: req.params.id, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TEMPLATE DEFAULT DA PLATAFORMA
// ============================================================================

const FALLBACK_TEMPLATE = {
  siteSections: ['hero', 'portfolio', 'servicos', 'sobre', 'faq', 'contato'],
  siteConfig: {
    heroTitle: 'Capturando Momentos Únicos',
    heroSubtitle: 'Fotografia profissional para os momentos que importam'
  },
  siteContent: {
    sobre: {
      title: 'Sobre Mim',
      text: 'Sou fotógrafo profissional apaixonado por contar histórias através das imagens. Com anos de experiência, transformo instantes em memórias eternas para casais, famílias e empresas.'
    },
    servicos: [
      { id: 'svc-1', title: 'Ensaio Externo', description: 'Sessão em locações especiais, com luz natural e cenários únicos.', price: 'A partir de R$ 350', icon: '📸' },
      { id: 'svc-2', title: 'Casamento Completo', description: 'Cobertura total do seu dia especial, do making off à festa.', price: 'Consulte', icon: '💍' },
      { id: 'svc-3', title: 'Ensaio Newborn', description: 'Registros delicados dos primeiros dias do seu bebê.', price: 'A partir de R$ 450', icon: '👶' }
    ],
    faq: [
      { id: 'faq-1', question: 'Qual o prazo de entrega das fotos?', answer: 'As fotos editadas são entregues em até 15 dias úteis após a sessão.' },
      { id: 'faq-2', question: 'Como funciona a seleção de fotos?', answer: 'Você recebe um link exclusivo para visualizar todas as fotos e escolher suas favoritas diretamente pela plataforma.' },
      { id: 'faq-3', question: 'Posso agendar uma conversa antes de contratar?', answer: 'Sim! Gosto muito de conhecer meus clientes antes da sessão. Entre em contato pelo WhatsApp ou formulário.' }
    ],
    contato: {
      title: 'Vamos Conversar?',
      text: 'Entre em contato para verificar disponibilidade, tirar dúvidas e fazer seu orçamento sem compromisso.'
    }
  },
  siteStyle: {}
};

// Função reutilizável para aplicar o template em uma organização
async function applyDefaultTemplate(orgId) {
  const tmpl = await DefaultSiteTemplate.findOne().lean();
  const source = (tmpl && (tmpl.siteSections?.length || Object.keys(tmpl.siteConfig || {}).length))
    ? tmpl
    : FALLBACK_TEMPLATE;

  const $set = {};
  if (source.siteSections?.length) $set.siteSections = source.siteSections;

  if (source.siteConfig && typeof source.siteConfig === 'object') {
    Object.entries(source.siteConfig).forEach(([k, v]) => { $set[`siteConfig.${k}`] = v; });
  }
  if (source.siteContent && typeof source.siteContent === 'object') {
    Object.entries(source.siteContent).forEach(([k, v]) => {
      $set[k === 'portfolio' ? 'siteContent.portfolio' : `siteContent.${k}`] = v;
    });
  }
  if (source.siteStyle && typeof source.siteStyle === 'object' && Object.keys(source.siteStyle).length) {
    Object.entries(source.siteStyle).forEach(([k, v]) => { $set[`siteStyle.${k}`] = v; });
  }

  if (Object.keys($set).length) {
    await Organization.findByIdAndUpdate(orgId, { $set }, { strict: false });
  }
}

// GET /api/site/default-template — lê template atual (autenticado)
router.get('/site/default-template', authenticateToken, async (req, res) => {
  try {
    const tmpl = await DefaultSiteTemplate.findOne().lean();
    res.json({ success: true, template: tmpl || FALLBACK_TEMPLATE });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/site/default-template — salva template (requer X-Admin-Key)
router.put('/site/default-template', authenticateToken, async (req, res) => {
  const adminKey = process.env.PLATFORM_ADMIN_KEY;
  if (!adminKey || req.headers['x-admin-key'] !== adminKey) {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }
  try {
    const { siteConfig, siteContent, siteStyle, siteSections } = req.body;
    const tmpl = await DefaultSiteTemplate.findOneAndUpdate(
      {},
      { $set: { siteConfig, siteContent, siteStyle, siteSections, updatedBy: req.user?.email || '' } },
      { upsert: true, returnDocument: 'after' }
    );
    res.json({ success: true, template: tmpl });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/site/default-template/apply — aplica template na org do usuário logado
router.post('/site/default-template/apply', authenticateToken, async (req, res) => {
  try {
    await applyDefaultTemplate(req.user.organizationId);
    if (req.user?.organizationId) {
      const org = await Organization.findById(req.user.organizationId).select('slug');
      if (org?.slug) clearOrgCache(org.slug);
    }
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro interno', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.applyDefaultTemplate = applyDefaultTemplate;