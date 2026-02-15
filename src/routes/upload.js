const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');

const upload = createUploader('');
const videoUpload = createUploader('videos', { maxSize: 300 * 1024 * 1024 });

router.post('/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const orgId = req.user.organizationId;
  res.json({ 
    success: true, 
    url: `/uploads/${orgId}/${req.file.filename}`, 
    filename: req.file.filename 
  });
});

router.post('/admin/upload-video', authenticateToken, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const orgId = req.user.organizationId;
  res.json({ 
    success: true, 
    url: `/uploads/${orgId}/videos/${req.file.filename}`, 
    filename: req.file.filename 
  });
});

module.exports = router;
