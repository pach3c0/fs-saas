const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { createUploader } = require('../utils/multerConfig');
const storage = require('../services/storage');

const upload = createUploader('');
const videoUpload = createUploader('videos', { maxSize: 300 * 1024 * 1024 });

router.post('/admin/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const orgId = req.user.organizationId;
  const filePath = `/${orgId}/${req.file.filename}`;
  
  res.json({ 
    success: true, 
    url: storage.getUrl(filePath), 
    filename: req.file.filename 
  });
});

router.post('/admin/upload-video', authenticateToken, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const orgId = req.user.organizationId;
  const filePath = `/${orgId}/videos/${req.file.filename}`;
  
  res.json({ 
    success: true, 
    url: storage.getUrl(filePath), 
    filename: req.file.filename 
  });
});

module.exports = router;
