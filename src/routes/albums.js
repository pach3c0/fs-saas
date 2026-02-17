const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { createUploader } = require('../utils/multerConfig');
const { authenticateToken } = require('../middleware/auth');
const { resolveTenant } = require('../middleware/tenant');
const Album = require('../models/Album');
const Client = require('../models/Client');

// Helper para gerar accessCode
function generateAccessCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ADMIN: Listar álbuns da organização
router.get('/albums', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const albums = await Album.find({ organizationId: orgId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, albums });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Criar álbum
router.post('/albums', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, welcomeText, clientId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    const accessCode = generateAccessCode();
    const album = new Album({
      organizationId: orgId,
      clientId: clientId || null,
      name: name.trim(),
      welcomeText: welcomeText || '',
      accessCode
    });
    await album.save();
    res.status(201).json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Editar álbum
router.put('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { name, welcomeText, status } = req.body;
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { name, welcomeText, status },
      { new: true, runValidators: true }
    );
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    res.json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Deletar álbum + arquivos
router.delete('/albums/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    // Remover arquivos do disco
    const dir = path.join(__dirname, '../../uploads', orgId.toString(), 'albums');
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    await album.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Upload de lâminas (múltiplos arquivos)
const uploadSheets = createUploader('albums', { maxFiles: 30, maxSize: 10 * 1024 * 1024 });
router.post('/albums/:id/sheets', authenticateToken, uploadSheets.array('sheets', 30), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const files = req.files || [];
    const newSheets = [];
    for (const file of files) {
      // Comprimir imagem
      const destPath = file.path.replace(/\.[^.]+$/, '.jpg');
      await sharp(file.path).resize({ width: 2000 }).jpeg({ quality: 90 }).toFile(destPath);
      fs.unlinkSync(file.path); // remove original
      const url = `/uploads/${orgId}/albums/${path.basename(destPath)}`;
      newSheets.push({
        filename: file.originalname,
        url,
        order: album.sheets.length + newSheets.length
      });
    }
    album.sheets.push(...newSheets);
    await album.save();
    res.json({ success: true, sheets: album.sheets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Deletar lâmina
router.delete('/albums/:id/sheets/:sheetId', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const sheet = album.sheets.id(req.params.sheetId);
    if (!sheet) return res.status(404).json({ success: false, error: 'Lâmina não encontrada' });
    // Remover arquivo do disco
    const filePath = path.join(__dirname, '../../', sheet.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    album.sheets.pull({ _id: req.params.sheetId });
    await album.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Reordenar lâminas
router.put('/albums/:id/sheets/reorder', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { order } = req.body; // [id1, id2, ...]
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    if (!Array.isArray(order) || order.length !== album.sheets.length) {
      return res.status(400).json({ success: false, error: 'Ordem inválida' });
    }
    // Reordenar
    album.sheets = order.map((id, idx) => {
      const s = album.sheets.id(id);
      if (s) s.order = idx;
      return s;
    });
    await album.save();
    res.json({ success: true, sheets: album.sheets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Marcar como enviado
router.post('/albums/:id/send', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const album = await Album.findOneAndUpdate(
      { _id: req.params.id, organizationId: orgId },
      { status: 'sent', sentAt: new Date() },
      { new: true }
    );
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    res.json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN: Adicionar comentário em lâmina
router.post('/albums/:id/sheets/:sheetId/comments', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, error: 'Comentário obrigatório' });
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const sheet = album.sheets.id(req.params.sheetId);
    if (!sheet) return res.status(404).json({ success: false, error: 'Lâmina não encontrada' });
    sheet.comments.push({ text: text.trim(), author: 'admin' });
    await album.save();
    res.json({ success: true, comments: sheet.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Middleware para tenant
router.use('/client/album', resolveTenant);

// CLIENT: Verificar código de acesso
router.post('/client/album/verify', async (req, res) => {
  try {
    const { accessCode } = req.body;
    const orgId = req.organizationId;
    if (!accessCode) return res.status(400).json({ success: false, error: 'Código obrigatório' });
    const album = await Album.findOne({ accessCode, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    res.json({ success: true, albumId: album._id, name: album.name, totalSheets: album.sheets.length, status: album.status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Carregar dados do álbum
router.get('/client/album/:id', async (req, res) => {
  try {
    const orgId = req.organizationId;
    const { code } = req.query;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    if (album.accessCode !== code) return res.status(403).json({ success: false, error: 'Código inválido' });
    // Ordenar lâminas
    const sheets = [...album.sheets].sort((a, b) => a.order - b.order);
    res.json({ success: true, album: { ...album.toObject(), sheets } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Aprovar lâmina
router.put('/client/album/:id/sheets/:sid/approve', async (req, res) => {
  try {
    const orgId = req.organizationId;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const sheet = album.sheets.id(req.params.sid);
    if (!sheet) return res.status(404).json({ success: false, error: 'Lâmina não encontrada' });
    sheet.status = 'approved';
    await album.save();
    res.json({ success: true, sheet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Pedir revisão de lâmina
router.put('/client/album/:id/sheets/:sid/request-revision', async (req, res) => {
  try {
    const orgId = req.organizationId;
    const { comment } = req.body;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const sheet = album.sheets.id(req.params.sid);
    if (!sheet) return res.status(404).json({ success: false, error: 'Lâmina não encontrada' });
    sheet.status = 'revision_requested';
    if (comment && comment.trim()) {
      sheet.comments.push({ text: comment.trim(), author: 'client' });
    }
    await album.save();
    res.json({ success: true, sheet });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Aprovar álbum completo
router.post('/client/album/:id/approve-all', async (req, res) => {
  try {
    const orgId = req.organizationId;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    album.sheets.forEach(sheet => { sheet.status = 'approved'; });
    album.status = 'approved';
    album.approvedAt = new Date();
    await album.save();
    res.json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CLIENT: Adicionar comentário em lâmina
router.post('/client/album/:id/sheets/:sid/comments', async (req, res) => {
  try {
    const orgId = req.organizationId;
    const { comment } = req.body;
    const album = await Album.findOne({ _id: req.params.id, organizationId: orgId });
    if (!album) return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    const sheet = album.sheets.id(req.params.sid);
    if (!sheet) return res.status(404).json({ success: false, error: 'Lâmina não encontrada' });
    if (comment && comment.trim()) {
      sheet.comments.push({ text: comment.trim(), author: 'client' });
    }
    await album.save();
    res.json({ success: true, comments: sheet.comments });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
