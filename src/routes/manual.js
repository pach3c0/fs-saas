const express = require('express');
const router = express.Router();
const ManualModule = require('../models/ManualModule');

/**
 * GET /api/manual
 * Rota pública — retorna apenas módulos publicados, ordenados por order.
 * Consumida pelo ajuda.js do admin de fotógrafos.
 */
router.get('/manual', async (req, res) => {
    try {
        const modules = await ManualModule.find({ isPublished: true })
            .sort({ order: 1 })
            .select('-__v')
            .lean();
        res.json({ success: true, modules });
    } catch (error) {
        req.logger.error('Erro interno', { error: error.message });
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
