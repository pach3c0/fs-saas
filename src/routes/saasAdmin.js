const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const Organization = require('../models/Organization');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const SiteData = require('../models/SiteData');
const Notification = require('../models/Notification');
const Album = require('../models/Album');
const Client = require('../models/Client');
const path = require('path');
const storage = require('../services/storage');

// ============================================================================
// METRICS & GLOBAL STATS
// ============================================================================

router.get('/admin/saas/metrics', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const [
            totalOrgs, 
            activeOrgs, 
            totalUsers, 
            totalSessions, 
            totalPhotos, 
            planGroups,
            storageSize
        ] = await Promise.all([
            Organization.countDocuments(),
            Organization.countDocuments({ isActive: true }),
            User.countDocuments(),
            Session.countDocuments(),
            Session.aggregate([
                { $project: { count: { $size: '$photos' } } }, 
                { $group: { _id: null, total: { $sum: '$count' } } }
            ]),
            Organization.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
            storage.getDirSize()
        ]);

        const byPlan = {};
        planGroups.forEach(g => { byPlan[g._id] = g.count; });

        res.json({
            organizations: { total: totalOrgs, active: activeOrgs, pending: totalOrgs - activeOrgs, byPlan },
            users: totalUsers,
            sessions: totalSessions,
            photos: totalPhotos[0]?.total || 0,
            storageBytes: storageSize
        });
    } catch (error) {
        req.logger.error('Saas Metrics Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ORGANIZATION MANAGEMENT
// ============================================================================

router.get('/admin/organizations', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const organizations = await Organization.find({ deletedAt: null })
            .populate('ownerId', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        const sessionCounts = await Session.aggregate([
            { $group: { _id: '$organizationId', count: { $sum: 1 }, photos: { $sum: { $size: '$photos' } } } }
        ]);
        
        const countMap = {};
        sessionCounts.forEach(s => { countMap[s._id?.toString()] = { sessions: s.count, photos: s.photos }; });

        const orgsWithStats = organizations.map(org => ({
            ...org,
            stats: countMap[org._id.toString()] || { sessions: 0, photos: 0 }
        }));

        res.json({ organizations: orgsWithStats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/organizations/trash', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const organizations = await Organization.find({ deletedAt: { $ne: null } })
            .populate('ownerId', 'name email')
            .sort({ deletedAt: -1 })
            .lean();
        res.json({ organizations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/organizations/:id/details', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id).populate('ownerId', 'name email');
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        const users = await User.find({ organizationId: org._id }).select('name email role approved createdAt');
        const sessions = await Session.find({ organizationId: org._id }).select('name type mode selectionStatus photos createdAt');

        // Calcular storage usado via helper async
        const orgId = org._id.toString();
        const storageBytes = await storage.getDirSize(`/${orgId}`);

        const sub = await Subscription.findOne({ organizationId: org._id }).lean();
        const totalPhotos = sessions.reduce((sum, s) => sum + (s.photos?.length || 0), 0);

        res.json({
            organization: org,
            users,
            stats: {
                sessions: sessions.length,
                photos: totalPhotos,
                newsletterSubs: 0,
                storageMB: Math.round(storageBytes / 1024 / 1024 * 100) / 100,
                storageBytes: storageBytes,
                maxStorageMB: sub?.limits?.maxStorage || 500
            },
            recentSessions: sessions.slice(0, 10).map(s => ({
                name: s.name,
                type: s.type,
                mode: s.mode,
                status: s.selectionStatus,
                photosCount: s.photos?.length || 0,
                createdAt: s.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ações
router.put('/admin/organizations/:id/approve', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
        org.isActive = true;
        await org.save();
        await User.updateMany({ organizationId: org._id }, { approved: true });
        res.json({ success: true, message: `Organização "${org.name}" aprovada!` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/admin/organizations/:id/deactivate', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
        org.isActive = false;
        if (!org.deactivatedAt) org.deactivatedAt = new Date();
        await org.save();
        res.json({ success: true, message: `Organização "${org.name}" desativada` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/admin/organizations/:id/trash', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
        org.isActive = false;
        org.deletedAt = new Date();
        if (!org.deactivatedAt) org.deactivatedAt = new Date();
        await org.save();
        res.json({ success: true, message: `"${org.name}" movida para a lixeira` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/admin/organizations/:id/restore', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
        org.isActive = true;
        org.deletedAt = null;
        org.deactivatedAt = null;
        await org.save();
        await User.updateMany({ organizationId: org._id }, { approved: true });
        res.json({ success: true, message: `"${org.name}" restaurada com sucesso` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/admin/organizations/:id', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org || !org.deletedAt) return res.status(400).json({ error: 'Mova para a lixeira antes de excluir' });

        const orgId = org._id;
        await Promise.all([
            User.deleteMany({ organizationId: orgId }),
            SiteData.deleteMany({ organizationId: orgId }),
            Session.deleteMany({ organizationId: orgId }),
            Notification.deleteMany({ organizationId: orgId }),
            Album.deleteMany({ organizationId: orgId }),
            Client.deleteMany({ organizationId: orgId }),
            Subscription.deleteMany({ organizationId: orgId })
        ]);

        await storage.deleteDir(`/${orgId}`);
        await Organization.findByIdAndDelete(orgId);
        res.json({ success: true, message: `"${org.name}" excluída definitivamente` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/admin/organizations/:id/plan', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { plan } = req.body;
        const PLAN_LIMITS = {
            free:  { maxSessions: 5,   maxPhotos: 100,  maxAlbums: 1,  maxStorage: 500,   customDomain: false },
            basic: { maxSessions: 50,  maxPhotos: 5000, maxAlbums: 10, maxStorage: 10000, customDomain: false },
            pro:   { maxSessions: -1,  maxPhotos: -1,   maxAlbums: -1, maxStorage: 50000, customDomain: true  }
        };
        if (!PLAN_LIMITS[plan]) return res.status(400).json({ error: 'Plano inválido' });
        
        const org = await Organization.findByIdAndUpdate(req.params.id, { plan }, { new: true });
        await Subscription.findOneAndUpdate({ organizationId: org._id }, { plan, limits: PLAN_LIMITS[plan] });
        res.json({ success: true, message: `Plano alterado para ${plan}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset de Site
router.post('/admin/organizations/:id/reset/site', authenticateToken, requireSuperadmin, async (req, res) => {
    const SITE_RESET_DEFAULTS = {
        hero:        { siteConfig: { heroTitle: '', heroSubtitle: '', heroImage: '', heroScale: 1, heroPosX: 50, heroPosY: 50, overlayOpacity: 40, topBarHeight: 0, bottomBarHeight: 0, titleFontSize: 80, subtitleFontSize: 40, titlePosX: 50, titlePosY: 50, subtitlePosX: 50, subtitlePosY: 60 } },
        portfolio:   { 'siteContent.portfolio': { photos: [] } },
        albuns:      { albums: [] },
        servicos:    { 'siteContent.servicos': [] },
        estudio:     { 'siteContent.estudio': {} },
        depoimentos: { 'siteContent.depoimentos': [] },
        contato:     { 'siteContent.contato': { title: 'Contato', text: '', address: '' } },
        sobre:       { 'siteContent.sobre': { title: 'Sobre Mim', text: '', image: '' } },
        faq:         { 'siteContent.faq': [] },
        personalizar:{ siteStyle: { accentColor: '', bgColor: '', textColor: '', fontFamily: '' } },
        secoes:      { siteSections: ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq'] },
    };

    try {
        const { section } = req.body;
        let updateData = {};
        if (section === 'all') {
            for (const def of Object.values(SITE_RESET_DEFAULTS)) Object.assign(updateData, def);
            updateData.siteTheme = 'elegante';
        } else if (SITE_RESET_DEFAULTS[section]) {
            updateData = { ...SITE_RESET_DEFAULTS[section] };
        } else {
            return res.status(400).json({ error: 'Seção inválida' });
        }

        await Organization.findByIdAndUpdate(req.params.id, { $set: updateData }, { strict: false });
        if (section === 'albuns' || section === 'all') {
            await SiteData.findOneAndUpdate({ organizationId: req.params.id }, { $set: { albums: [] } });
        }
        res.json({ success: true, message: `Reset de "${section}" realizado` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
