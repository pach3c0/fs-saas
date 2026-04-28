const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Client = require('../models/Client');
const Session = require('../models/Session');

// GET /api/clients/search?q=nome - busca rapida por nome (para autocomplete)
router.get('/clients/search', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, clients: [] });

    const clients = await Client.find({
      organizationId: orgId,
      name: { $regex: q, $options: 'i' }
    }).select('name email phone').limit(10).lean();

    res.json({ success: true, clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/clients - listar clientes com contagem de sessoes
router.get('/clients', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const clients = await Client.find({ organizationId: orgId }).sort({ name: 1 }).lean();

    // Contar sessoes por cliente
    const clientIds = clients.map(c => c._id);
    const sessionCounts = await Session.aggregate([
      { $match: { organizationId: orgId, clientId: { $in: clientIds } } },
      { $group: { _id: '$clientId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    sessionCounts.forEach(sc => { countMap[sc._id.toString()] = sc.count; });

    // CRM: LTV dinamico = total de fotos extras pagas em sessoes do cliente
    const ltvAgg = await Session.aggregate([
      { $match: { organizationId: orgId, clientId: { $in: clientIds }, 'extraRequest.paid': true } },
      { $group: { _id: '$clientId', total: { $sum: { $size: { $ifNull: ['$extraRequest.photos', []] } } } } }
    ]);
    const ltvMap = {};
    ltvAgg.forEach(l => { ltvMap[l._id.toString()] = l.total; });

    const result = clients.map(c => ({
      ...c,
      sessionCount: countMap[c._id.toString()] || 0,
      lifetimeValue: ltvMap[c._id.toString()] || 0
    }));

    res.json({ success: true, clients: result });
  } catch (error) {
    req.logger.error('Erro ao listar clientes', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/clients - criar cliente
router.post('/clients', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, email, phone, cpf, notes, tags, birthDate, lastEventType } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }
    if (!cpf || !cpf.trim()) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }

    const client = new Client({
      organizationId: orgId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      cpf: cpf.trim(),
      notes: notes ? notes.trim() : '',
      tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : [],
      birthDate: birthDate ? new Date(birthDate) : null,
      lastEventType: lastEventType ? String(lastEventType).trim() : ''
    });

    await client.save();
    res.status(201).json({ success: true, client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Já existe um cliente com este e-mail' });
    }
    req.logger.error('Erro ao criar cliente', { error: error.message, body: req.body });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/clients/:id - editar cliente
router.put('/clients/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, email, phone, cpf, notes, tags, birthDate, lastEventType } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, error: 'Telefone é obrigatório' });
    }
    if (!cpf || !cpf.trim()) {
      return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
    }

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        cpf: cpf.trim(),
        notes: notes ? notes.trim() : '',
        tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : [],
        birthDate: birthDate ? new Date(birthDate) : null,
        lastEventType: lastEventType ? String(lastEventType).trim() : ''
      },
      { returnDocument: 'after', runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    res.json({ success: true, client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Já existe um cliente com este e-mail' });
    }
    req.logger.error('Erro ao editar cliente', { clientId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/clients/:id - deletar cliente (remove clientId das sessoes vinculadas)
router.delete('/clients/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const client = await Client.findOne({ _id: req.params.id, organizationId: orgId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    // Desvincular sessoes
    await Session.updateMany(
      { organizationId: orgId, clientId: req.params.id },
      { $unset: { clientId: '' } }
    );

    await client.deleteOne();
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Erro ao deletar cliente', { clientId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/clients/:id/sessions - sessoes do cliente
router.get('/clients/:id/sessions', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const client = await Client.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    const sessions = await Session.find(
      { organizationId: orgId, clientId: req.params.id },
      'name type date selectionStatus mode packageLimit createdAt'
    ).sort({ date: -1 }).lean();

    res.json({ success: true, sessions });
  } catch (error) {
    req.logger.error('Erro ao buscar sessoes do cliente', { clientId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/clients/:id/timeline - linha do tempo consolidada do cliente
// Cruza: cadastro do cliente, sessoes, entregas, compras de fotos extras e
// gatilhos enviados pelo robo CRM (quando existirem - Fase 2)
router.get('/clients/:id/timeline', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const client = await Client.findOne({ _id: req.params.id, organizationId: orgId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    const sessions = await Session.find({ organizationId: orgId, clientId: req.params.id }).lean();

    const events = [];

    // 1) Cadastro do cliente
    events.push({
      at: client.createdAt,
      icon: '👤',
      label: 'Cliente cadastrado',
      sessionId: null
    });

    // 2) Eventos por sessao
    for (const s of sessions) {
      // Sessao criada
      events.push({
        at: s.createdAt,
        icon: '📸',
        label: `Sessão "${s.name}" criada`,
        sessionId: s._id
      });

      // Entregas (deliveryHistory)
      if (Array.isArray(s.deliveryHistory)) {
        for (const d of s.deliveryHistory) {
          if (d.deliveredAt) {
            const qtd = typeof d.selectedCount === 'number' ? ` (${d.selectedCount} fotos)` : '';
            events.push({
              at: d.deliveredAt,
              icon: '✅',
              label: `Sessão "${s.name}" entregue${qtd}`,
              sessionId: s._id
            });
          }
          if (d.reopenedAt) {
            events.push({
              at: d.reopenedAt,
              icon: '🔁',
              label: `Sessão "${s.name}" reaberta${d.reopenReason ? ` — ${d.reopenReason}` : ''}`,
              sessionId: s._id
            });
          }
        }
      }

      // Compra de fotos extras
      if (s.extraRequest && s.extraRequest.paid) {
        const qtd = Array.isArray(s.extraRequest.photos) ? s.extraRequest.photos.length : 0;
        events.push({
          at: s.extraRequest.respondedAt || s.extraRequest.requestedAt || s.updatedAt,
          icon: '💰',
          label: `Cliente comprou ${qtd} foto${qtd !== 1 ? 's' : ''} extra${qtd !== 1 ? 's' : ''} em "${s.name}"`,
          sessionId: s._id
        });
      }

      // Gatilhos do robo CRM (Fase 2 - preparado para quando existir sentTriggers)
      if (Array.isArray(s.sentTriggers)) {
        for (const t of s.sentTriggers) {
          if (t && t.sentAt) {
            events.push({
              at: t.sentAt,
              icon: '📧',
              label: `Robô enviou "${t.type || t.name || 'gatilho'}"`,
              sessionId: s._id
            });
          }
        }
      }
    }

    // Ordenar desc por data
    events.sort((a, b) => new Date(b.at) - new Date(a.at));

    res.json({ success: true, client: { _id: client._id, name: client.name }, events });
  } catch (error) {
    req.logger.error('Erro ao montar timeline do cliente', { clientId: req.params.id, error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
