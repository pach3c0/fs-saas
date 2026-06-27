const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const heartbeatLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

const JANELA_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// POST /api/triagem/heartbeat
// Valida licença e devolve token de uso offline (7 dias).
// Chamado uma vez por dia pelo app de Triagem; rate-limit de 10/min/IP.
router.post('/triagem/heartbeat', heartbeatLimiter, authenticateToken, async (req, res) => {
  try {
    const [user, sub] = await Promise.all([
      User.findById(req.user.userId).select('email').lean(),
      Subscription.findOne({ organizationId: req.user.organizationId }).select('plan').lean(),
    ]);
    const plano = sub?.plan || 'free';
    // Triagem incluída em todos os planos (ver plans.js features)
    const triagemPro = true;
    const agora = Date.now();
    return res.json({
      ok: true,
      email: user?.email || '',
      plano,
      triagemPro,
      emitidoEm: agora,
      exp: agora + JANELA_MS,
    });
  } catch (e) {
    req.logger.error('triagem/heartbeat', e);
    return res.status(500).json({ ok: false, error: 'Erro interno' });
  }
});

module.exports = router;
