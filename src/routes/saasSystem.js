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
