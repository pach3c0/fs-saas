const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const Tutorial = require('../models/Tutorial');

// Helper para extrair o ID do vídeo do YouTube
function extractYoutubeId(url) {
  if (!url) return '';
  url = url.trim();
  if (url.length === 11) return url; // Se já for um ID direto
  
  // RegEx genérico para extrair ID do YouTube em vários formatos comuns
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

// ============================================================================
// ROTAS PÚBLICAS (Para os fotógrafos autenticados)
// ============================================================================

// GET /api/tutorials - Listar tutoriais ativos
router.get('/tutorials', authenticateToken, async (req, res) => {
  try {
    const tutorials = await Tutorial.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, tutorials });
  } catch (error) {
    if (req.logger) req.logger.error('Erro ao buscar tutoriais', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ROTAS ADMINISTRATIVAS (SaaS Admin - Apenas Superadmin)
// ============================================================================

// GET /api/admin/tutorials - Listar todos os tutoriais (Superadmin)
router.get('/admin/tutorials', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const tutorials = await Tutorial.find()
      .sort({ category: 1, order: 1 })
      .lean();
    res.json({ success: true, tutorials });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/admin/tutorials - Criar um tutorial (Superadmin)
router.post('/admin/tutorials', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, videoUrl, category, duration, level, order, active } = req.body;
    
    if (!title || !videoUrl) {
      return res.status(400).json({ success: false, error: 'Título e URL do vídeo são obrigatórios' });
    }

    const youtubeId = extractYoutubeId(videoUrl);
    if (!youtubeId) {
      return res.status(400).json({ success: false, error: 'URL do YouTube inválida ou ID não detectado' });
    }

    const tutorial = await Tutorial.create({
      title,
      description,
      videoUrl,
      youtubeId,
      category,
      duration,
      level,
      order: order || 0,
      active: active !== undefined ? active : true
    });

    res.status(201).json({ success: true, tutorial });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/admin/tutorials/:id - Atualizar um tutorial (Superadmin)
router.put('/admin/tutorials/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { title, description, videoUrl, category, duration, level, order, active } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (duration !== undefined) updateData.duration = duration;
    if (level !== undefined) updateData.level = level;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    if (videoUrl !== undefined) {
      updateData.videoUrl = videoUrl;
      const youtubeId = extractYoutubeId(videoUrl);
      if (!youtubeId) {
        return res.status(400).json({ success: false, error: 'URL do YouTube inválida ou ID não detectado' });
      }
      updateData.youtubeId = youtubeId;
    }

    const tutorial = await Tutorial.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    if (!tutorial) {
      return res.status(404).json({ success: false, error: 'Tutorial não encontrado' });
    }

    res.json({ success: true, tutorial });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/admin/tutorials/:id - Remover um tutorial (Superadmin)
router.delete('/admin/tutorials/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const tutorial = await Tutorial.findByIdAndDelete(req.params.id);
    if (!tutorial) {
      return res.status(404).json({ success: false, error: 'Tutorial não encontrado' });
    }
    res.json({ success: true, message: 'Tutorial removido com sucesso' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
