const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Session = require('../models/Session');
const Organization = require('../models/Organization');

/**
 * Rotas do CRM/motor de vendas (Fase 2D)
 *
 * - GET /api/sales/dashboard: agrega gatilhos disparados, cupons emitidos,
 *   sessoes monitoradas e potencial de fotos extras pendentes.
 *
 * Cupons sao extraidos do array salesAutomation.sentTriggers (persistido
 * pelo salesAutomator.js a cada disparo).
 */

router.get('/sales/dashboard', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const now = new Date();

    const org = await Organization.findById(orgId).select('integrations name').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Organizacao nao encontrada' });

    // Sessoes ativas elegiveis para o robo (selection/multi_selection com prazo futuro)
    const sessoesAtivas = await Session.find({
      organizationId: orgId,
      isActive: true,
      mode: { $in: ['selection', 'multi_selection'] },
      selectionDeadline: { $gte: now }
    }).select('name accessCode photos selectedPhotos selectionDeadline salesAutomation eventType extraPhotoPrice').lean();

    // Calcular fotos pendentes (potencial de venda)
    let fotosPendentes = 0;
    let receitaPotencial = 0;
    for (const s of sessoesAtivas) {
      const total = (s.photos || []).length;
      const sel = (s.selectedPhotos || []).length;
      const restantes = Math.max(0, total - sel);
      fotosPendentes += restantes;
      if (s.extraPhotoPrice) receitaPotencial += restantes * Number(s.extraPhotoPrice);
    }

    // Coletar cupons (todos os triggers ja disparados, com qualquer status de sessao)
    const sessoesComTriggers = await Session.find({
      organizationId: orgId,
      'salesAutomation.sentTriggers.0': { $exists: true }
    }).select('name accessCode salesAutomation extraRequest selectionDeadline').lean();

    const cupons = [];
    let triggersDisparados = 0;
    for (const s of sessoesComTriggers) {
      const triggers = s.salesAutomation?.sentTriggers || [];
      triggersDisparados += triggers.length;
      for (const t of triggers) {
        if (!t.couponCode) continue;
        cupons.push({
          code: t.couponCode,
          trigger: t.trigger,
          sentAt: t.sentAt,
          sessionId: s._id,
          sessionName: s.name,
          accessCode: s.accessCode,
          deadline: s.selectionDeadline,
          // Tentativa simples de detectar se ja foi convertido: cliente comprou extras pagos
          redeemed: !!(s.extraRequest && s.extraRequest.paid)
        });
      }
    }

    // Ordenar cupons por data desc
    cupons.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    res.json({
      success: true,
      integrations: org.integrations || {},
      kpis: {
        sessoesMonitoradas: sessoesAtivas.length,
        fotosPendentes,
        receitaPotencial,
        triggersDisparados,
        cuponsEmitidos: cupons.length,
        cuponsConvertidos: cupons.filter(c => c.redeemed).length
      },
      cupons
    });
  } catch (error) {
    req.logger.error('Erro ao montar dashboard de vendas', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
