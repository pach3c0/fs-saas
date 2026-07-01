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
const Presence = require('../models/Presence');
const presence = require('../services/presence');
const { createNotificationDebounced } = require('../utils/notificationDebounce');

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

    const session = await Session.findById(sessionId)
      .select('organizationId name clientName participants._id participants.name')
      .lean();
    if (!session) return res.status(204).end();

    const participantId = cleanStr(req.body && req.body.participantId, 40) || 'anon';

    // Rótulo do cliente: em multi, o nome do participante (casado pelo _id do subdoc);
    // em individual, o snapshot clientName da sessão. A galeria vira contexto (sessionName).
    let clientLabel = '';
    if (participantId && participantId !== 'anon') {
      const p = (session.participants || []).find(x => String(x._id) === participantId);
      if (p) clientLabel = p.name || '';
    } else {
      clientLabel = session.clientName || '';
    }

    // Transição OFFLINE→ONLINE: se NÃO havia presença viva para esta chave, é uma entrada nova.
    // Checar ANTES do touch (o upsert não distingue insert de update). O TTL de 150s já é o 1º
    // nível de anti-spam (refresh dentro de 60-150s não redispara).
    const key = `client:${sessionId}:${participantId}`;
    const wasOnline = await Presence.exists({ key, lastSeen: { $gte: new Date(Date.now() - 150 * 1000) } });

    presence.touch({
      key,
      organizationId: session.organizationId || null,
      role: 'client',
      name: clientLabel,
      sessionName: session.name || 'Galeria',
      module: cleanStr(req.body && req.body.module, 40) || 'galeria',
      sessionId
    });

    // Notificar o fotógrafo que o cliente está online (sino + push). Anti-spam: debounce de 30min
    // por sessão+participante + dedupe com um session_accessed muito recente (evita 2 avisos no
    // 1º acesso). Respeita o toggle clientOnline. Fire-and-forget (helper nunca lança).
    if (!wasOnline) {
      const galleryName = session.name || 'sua galeria';
      createNotificationDebounced({
        organizationId: session.organizationId,
        type: 'client_online',
        sessionId,
        sessionName: session.name || 'Galeria',
        participantId,
        windowMs: 30 * 60 * 1000,
        prefKey: 'clientOnline',
        suppressIfRecent: { types: ['session_accessed', 'client_online'], windowMs: 2 * 60 * 1000 },
        buildMessage: () => `${clientLabel || 'Alguém'} está online na ${galleryName}`
      });
    }
  } catch (_) { /* fire-and-forget: nunca quebra a galeria */ }
  res.status(204).end();
});

// FOTÓGRAFO: clientes da sua org online agora (agrupados por sessão).
router.get('/presence/clients', authenticateToken, async (req, res) => {
  try {
    const data = await presence.getClientsOnline(req.user.organizationId);
    res.json(data);
  } catch (err) {
    if (req.logger) req.logger.error('[presence] erro ao listar clientes online', { error: err.message });
    res.status(500).json({ error: 'Erro ao buscar presença' });
  }
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
