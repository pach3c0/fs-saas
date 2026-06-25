// Presença online + base de engajamento (item 10). Heartbeat do front a cada ~60s:
//  - fotógrafo (autenticado) → presença + acúmulo de engajamento (UsageDaily, camada B)
//  - cliente final (público)  → só presença (camada A)
// Tudo fire-and-forget: nunca quebra admin/galeria. Backing em Mongo (cluster-safe).
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const Session = require('../models/Session');
const presence = require('../services/presence');

// Rate-limit dedicado pro heartbeat público das galerias. O front bate 1×/60s; 120/min/IP
// cobre eventos de IP compartilhado (ex.: escola, muitos pais na mesma rede) sem virar abuso —
// e ainda fica abaixo do apiLimiter global (300/min/IP).
const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um instante.' }
});

function cleanStr(v, max = 80) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// FOTÓGRAFO (autenticado): presença + engajamento. `module` = aba atual do admin.
router.post('/presence/heartbeat', authenticateToken, (req, res) => {
  try {
    presence.touch({
      key: `user:${req.user.userId}`,
      organizationId: req.user.organizationId || null,
      userId: req.user.userId,
      role: 'photographer',
      name: cleanStr(req.body && req.body.name, 120),
      module: cleanStr(req.body && req.body.module, 40) || 'outros'
    });
  } catch (_) { /* fire-and-forget: nunca quebra o admin */ }
  res.status(204).end();
});

// CLIENTE (público): só presença. Org e nome de exibição vêm da própria sessão (sem dado pessoal).
router.post('/presence/heartbeat/client', heartbeatLimiter, async (req, res) => {
  try {
    const sessionId = cleanStr(req.body && req.body.sessionId, 40);
    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) return res.status(204).end();

    const session = await Session.findById(sessionId).select('organizationId name').lean();
    if (!session) return res.status(204).end();

    const participantId = cleanStr(req.body && req.body.participantId, 40) || 'anon';
    presence.touch({
      key: `client:${sessionId}:${participantId}`,
      organizationId: session.organizationId || null,
      role: 'client',
      name: session.name || 'Galeria',
      module: cleanStr(req.body && req.body.module, 40) || 'galeria',
      sessionId
    });
  } catch (_) { /* fire-and-forget: nunca quebra a galeria */ }
  res.status(204).end();
});

// SUPER ADMIN: quem está online agora (fotógrafos × clientes, por módulo/org).
router.get('/admin/saas/presence', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const data = await presence.getOnline();
    res.json(data);
  } catch (err) {
    if (req.logger) req.logger.error('[presence] erro ao listar online', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar presença' });
  }
});

module.exports = router;
