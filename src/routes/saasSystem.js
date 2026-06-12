// Toolkit de operação do SaaS Admin: central de erros, e-mails, auditoria,
// impersonação, diagnóstico por org e status do sistema.
// Rotas superadmin — exceto POST /client-error (público, rate-limited).
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const PlatformLog = require('../models/PlatformLog');

// ============================================================================
// CENTRAL DE ERROS (PlatformLog)
// ============================================================================

router.get('/admin/saas/errors', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { level, source, orgId } = req.query;
    const hours = Math.min(parseInt(req.query.hours) || 168, 720);
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const filtro = { at: { $gte: new Date(Date.now() - hours * 3600 * 1000) } };
    if (level === 'error' || level === 'warn') filtro.level = level;
    if (source) filtro.source = source;
    if (orgId) filtro.organizationId = orgId;

    const last24h = new Date(Date.now() - 24 * 3600 * 1000);
    const [logs, errors24h, warns24h, frontend24h] = await Promise.all([
      PlatformLog.find(filtro).sort({ at: -1 }).limit(limit)
        .populate('organizationId', 'name slug').lean(),
      PlatformLog.countDocuments({ level: 'error', at: { $gte: last24h } }),
      PlatformLog.countDocuments({ level: 'warn', at: { $gte: last24h } }),
      PlatformLog.countDocuments({ source: { $ne: 'backend' }, at: { $gte: last24h } })
    ]);

    res.json({ success: true, logs, counters: { errors24h, warns24h, frontend24h } });
  } catch (error) {
    req.logger.error('Erro ao listar platform logs', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// E-MAILS (EmailLog)
// ============================================================================

const EmailLog = require('../models/EmailLog');

router.get('/admin/saas/emails', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { ok, template, to } = req.query;
    const hours = Math.min(parseInt(req.query.hours) || 168, 2160);
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const filtro = { at: { $gte: new Date(Date.now() - hours * 3600 * 1000) } };
    if (ok === 'true') filtro.ok = true;
    if (ok === 'false') filtro.ok = false;
    if (template) filtro.template = template;
    if (to) filtro.to = { $regex: to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const last24h = new Date(Date.now() - 24 * 3600 * 1000);
    const [emails, sent24h, failed24h] = await Promise.all([
      // Falhas primeiro, depois mais recentes
      EmailLog.find(filtro).sort({ ok: 1, at: -1 }).limit(limit).lean(),
      EmailLog.countDocuments({ ok: true, at: { $gte: last24h } }),
      EmailLog.countDocuments({ ok: false, at: { $gte: last24h } })
    ]);

    res.json({ success: true, emails, counters: { sent24h, failed24h } });
  } catch (error) {
    req.logger.error('Erro ao listar email logs', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// AUDITORIA + IMPERSONAÇÃO
// ============================================================================

const jwt = require('jsonwebtoken');
const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { audit } = require('../utils/auditLogger');

router.get('/admin/saas/audit', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const filtro = {};
    if (req.query.targetOrgId) filtro.targetOrgId = req.query.targetOrgId;

    const entries = await AuditLog.find(filtro)
      .sort({ at: -1 })
      .limit(limit)
      .populate('adminUserId', 'name email')
      .populate('targetOrgId', 'name slug')
      .lean();

    res.json({ success: true, entries });
  } catch (error) {
    req.logger.error('Erro ao listar audit log', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// "Entrar como" a org: gera JWT de 30min do dono da org com a marca
// impersonatedBy — toda ação na sessão de suporte fica rastreável nos logs.
router.post('/admin/organizations/:id/impersonate', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).select('name slug isActive deletedAt').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organização não encontrada' });
    if (!org.isActive || org.deletedAt) {
      return res.status(400).json({ success: false, error: 'Organização inativa ou na lixeira — reative antes de entrar como ela' });
    }

    const owner = await User.findOne({ organizationId: org._id, role: 'admin' }).select('_id email').lean();
    if (!owner) return res.status(404).json({ success: false, error: 'Dono da organização não encontrado' });

    const impersonator = await User.findById(req.user.userId).select('email').lean();
    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    const token = jwt.sign(
      {
        userId: owner._id,
        organizationId: org._id,
        role: 'admin',
        impersonatedBy: req.user.userId,
        impersonatorEmail: impersonator?.email || ''
      },
      secret,
      { expiresIn: '30m' }
    );

    audit(req, 'impersonate', org._id, { ownerEmail: owner.email });
    req.logger.info('Impersonação iniciada', { targetOrg: org.slug });

    res.json({ success: true, token, orgName: org.name, orgSlug: org.slug });
  } catch (error) {
    req.logger.error('Erro ao impersonar org', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DIAGNÓSTICO POR ORGANIZAÇÃO (aba do painel lateral)
// ============================================================================

const ActivityEvent = require('../models/ActivityEvent');

router.get('/admin/organizations/:id/diagnostics', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const orgId = req.params.id;
    const org = await Organization.findById(orgId).select('slug').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organização não encontrada' });

    const users = await User.find({ organizationId: orgId }).select('email').lean();
    const userEmails = users.map(u => u.email);
    const last7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const emailFiltro = { $or: [{ orgSlug: org.slug }, { to: { $in: userEmails } }] };

    const [erros, emails, ultimoLogin, auditoria, erros7d, emailsFalha7d] = await Promise.all([
      PlatformLog.find({ organizationId: orgId }).sort({ at: -1 }).limit(20).lean(),
      EmailLog.find(emailFiltro).sort({ at: -1 }).limit(20).lean(),
      ActivityEvent.findOne({ organizationId: orgId, type: 'login' }).sort({ at: -1 }).lean(),
      AuditLog.find({ targetOrgId: orgId }).sort({ at: -1 }).limit(10)
        .populate('adminUserId', 'email').lean(),
      PlatformLog.countDocuments({ organizationId: orgId, at: { $gte: last7d } }),
      EmailLog.countDocuments({ ...emailFiltro, ok: false, at: { $gte: last7d } })
    ]);

    res.json({
      success: true,
      erros,
      emails,
      ultimoLogin: ultimoLogin?.at || null,
      auditoria,
      counters: { erros7d, emailsFalha7d }
    });
  } catch (error) {
    req.logger.error('Erro no diagnóstico da org', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// STATUS DO SISTEMA (aba Sistema)
// ============================================================================

const fs = require('fs');
const path = require('path');
const SchedulerRun = require('../models/SchedulerRun');
const { verifySmtp } = require('../utils/email');
const storageService = require('../services/storage');

// getDirSize do uploads/ percorre o disco inteiro — cache de 10 min
let _uploadsSizeCache = null; // { bytes, at }
async function _getUploadsSize() {
  const CACHE_MS = 10 * 60 * 1000;
  if (_uploadsSizeCache && (Date.now() - _uploadsSizeCache.at) < CACHE_MS) {
    return _uploadsSizeCache.bytes;
  }
  const bytes = await storageService.getDirSize();
  _uploadsSizeCache = { bytes, at: Date.now() };
  return bytes;
}

router.get('/admin/saas/system', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    // Mongo: estado + ping cronometrado
    const mongoState = mongoose.connection.readyState;
    let pingMs = null;
    if (mongoState === 1) {
      const t0 = Date.now();
      try {
        await mongoose.connection.db.admin().ping();
        pingMs = Date.now() - t0;
      } catch { /* ping falhou — pingMs fica null */ }
    }

    const uploadsPath = path.join(__dirname, '../../uploads');
    const [smtp, schedulers, uploadsBytes, disco] = await Promise.all([
      verifySmtp(req.query.verifySmtp === '1'),
      SchedulerRun.find().sort({ name: 1 }).lean(),
      _getUploadsSize().catch(() => null),
      fs.promises.statfs(uploadsPath).then(s => ({
        totalBytes: s.blocks * s.bsize,
        freeBytes: s.bavail * s.bsize
      })).catch(() => null)
    ]);

    res.json({
      success: true,
      mongo: { state: mongoState, ok: mongoState === 1, pingMs },
      smtp: { ok: smtp.ok, error: smtp.error, checkedAt: smtp.at },
      disco: disco ? { ...disco, uploadsBytes } : { uploadsBytes },
      processo: {
        uptimeSec: Math.floor(process.uptime()),
        nodeVersion: process.version,
        appVersion: require('../../package.json').version,
        rssBytes: process.memoryUsage().rss,
        pm2Instance: process.env.NODE_APP_INSTANCE ?? null
      },
      schedulers
    });
  } catch (error) {
    req.logger.error('Erro no status do sistema', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ERROS DO FRONTEND (público, rate-limited)
// ============================================================================

const FRONT_SOURCES = ['frontend-admin', 'frontend-cliente', 'frontend-album'];

const clientErrorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 reports/min por IP — diagnóstico, não telemetria de volume
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res) => res.status(204).end() // silencioso: não dá sinal a abuso
});

router.post('/client-error', clientErrorLimiter, (req, res) => {
  // Responde 204 SEMPRE (inclusive payload inválido) e grava fire-and-forget
  res.status(204).end();
  try {
    const b = req.body || {};
    const source = FRONT_SOURCES.includes(b.source) ? b.source : 'frontend-admin';
    const message = String(b.message || '').slice(0, 2000);
    if (!message) return;

    const doc = {
      level: 'error',
      message,
      source,
      stack: b.stack ? String(b.stack).slice(0, 4000) : undefined,
      url: b.url ? String(b.url).slice(0, 500) : undefined,
      meta: { ip: req.ip },
      at: new Date()
    };
    if (b.organizationId && mongoose.Types.ObjectId.isValid(b.organizationId)) {
      doc.organizationId = b.organizationId;
    }
    PlatformLog.create(doc).catch(err => {
      console.error('[client-error] falha ao gravar:', err.message);
    });
  } catch (err) {
    console.error('[client-error] erro interno:', err.message);
  }
});

module.exports = router;
