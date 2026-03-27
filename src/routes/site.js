const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

    // siteEnabled null/undefined (docs antigos sem o campo) → true por padrão
    const result = org.toObject();
    if (result.siteEnabled == null) result.siteEnabled = true;

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get config
router.get('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId)
      .select('siteEnabled siteTheme siteConfig siteSections siteContent siteStyle');
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update config
router.put('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const updateData = {};
    const allowedKeys = ['siteEnabled', 'siteTheme', 'siteConfig', 'siteSections', 'siteStyle'];

    allowedKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    // siteContent: merge por sub-chave para não apagar outros campos (sobre, servicos, etc)
    if (req.body.siteContent !== undefined) {
      Object.entries(req.body.siteContent).forEach(([key, value]) => {
        // Para portfolio.photos, usar dot notation profunda para garantir que o array seja salvo
        if (key === 'portfolio' && value && value.photos !== undefined) {
          updateData['siteContent.portfolio.photos'] = value.photos;
          if (value.title !== undefined) updateData['siteContent.portfolio.title'] = value.title;
          if (value.subtitle !== undefined) updateData['siteContent.portfolio.subtitle'] = value.subtitle;
        } else if (key === 'customSections') {
          updateData['siteContent.customSections'] = value;
        } else {
          updateData[`siteContent.${key}`] = value;
        }
      });
    }

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { new: true, strict: false }
    );

    res.json({ success: true, org });
  } catch (error) {
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
    try { fs.unlinkSync(originalPath); } catch(e) {}

    const url = `/uploads/${req.user.organizationId}/site/${resizedFilename}`;

    // Add to portfolio
    if (!org.siteContent) org.siteContent = {};
    if (!org.siteContent.portfolio) org.siteContent.portfolio = { photos: [] };
    
    org.siteContent.portfolio.photos.push({ url });
    await org.save();

    res.json({ success: true, url });
  } catch (error) {
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
        try { fs.unlinkSync(path.join(__dirname, '../..', photo.url)); } catch(e) {}
      }
      org.siteContent.portfolio.photos.splice(idx, 1);
      await org.save();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Uso de armazenamento
router.get('/site/admin/storage', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.organizationId.toString();
    const orgUploadDir = path.join(__dirname, '../../uploads', orgId);
    let storageBytes = 0;
    function calcSize(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fp = path.join(dir, entry.name);
        if (entry.isDirectory()) calcSize(fp);
        else { try { storageBytes += fs.statSync(fp).size; } catch(e) {} }
      }
    }
    calcSize(orgUploadDir);
    const storageMB = Math.round(storageBytes / 1024 / 1024 * 100) / 100;
    res.json({ storageMB, storageBytes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Público: Submeter depoimento para aprovação
router.post('/site/depoimento', async (req, res) => {
  try {
    if (!req.organizationId) return res.status(404).json({ error: 'Organização não encontrada' });
    const { name, text, email, rating } = req.body;
    if (!name || !text) return res.status(400).json({ error: 'Nome e texto são obrigatórios' });

    const id = require('crypto').randomBytes(8).toString('hex');
    await Organization.findByIdAndUpdate(req.organizationId, {
      $push: { pendingDepoimentos: { id, name, text, email: email || '', rating: parseInt(rating) || 5 } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Listar depoimentos pendentes
router.get('/site/admin/depoimentos-pendentes', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId).select('pendingDepoimentos');
    res.json({ pending: org?.pendingDepoimentos || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Aprovar depoimento pendente
router.post('/site/admin/depoimentos-pendentes/:id/aprovar', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    const pending = org.pendingDepoimentos.find(d => d.id === req.params.id);
    if (!pending) return res.status(404).json({ error: 'Depoimento não encontrado' });

    // Mover para aprovados
    if (!org.siteContent) org.siteContent = {};
    if (!org.siteContent.depoimentos) org.siteContent.depoimentos = [];
    org.siteContent.depoimentos.push({ id: pending.id, name: pending.name, text: pending.text, rating: pending.rating, photo: '', socialLink: '' });

    // Remover dos pendentes
    org.pendingDepoimentos = org.pendingDepoimentos.filter(d => d.id !== req.params.id);
    org.markModified('siteContent');
    org.markModified('pendingDepoimentos');
    await org.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Rejeitar depoimento pendente
router.delete('/site/admin/depoimentos-pendentes/:id', authenticateToken, async (req, res) => {
  try {
    await Organization.findByIdAndUpdate(req.user.organizationId, {
      $pull: { pendingDepoimentos: { id: req.params.id } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;