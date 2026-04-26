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

    const result = clients.map(c => ({
      ...c,
      sessionCount: countMap[c._id.toString()] || 0
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
    const { name, email, phone, cpf, notes, tags } = req.body;

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
      tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : []
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
    const { name, email, phone, cpf, notes, tags } = req.body;

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
        tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : []
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

module.exports = router;
