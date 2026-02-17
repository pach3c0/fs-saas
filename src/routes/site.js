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
      .select('name logo primaryColor siteEnabled siteTheme siteConfig siteSections siteContent email');

    if (!org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get config
router.get('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.organizationId)
      .select('siteEnabled siteTheme siteConfig siteSections siteContent');
    res.json(org);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update config
router.put('/site/admin/config', authenticateToken, async (req, res) => {
  try {
    const updateData = {};
    const allowedKeys = ['siteEnabled', 'siteTheme', 'siteConfig', 'siteSections', 'siteContent'];
    
    allowedKeys.forEach(key => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    const org = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateData },
      { new: true }
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

module.exports = router;