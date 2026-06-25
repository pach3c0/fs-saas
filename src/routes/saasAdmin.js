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
const SecurityLog = require('../models/SecurityLog');
const ManualModule = require('../models/ManualModule');
const { audit } = require('../utils/auditLogger');
const Ticket = require('../models/Ticket');
const ActivityEvent = require('../models/ActivityEvent');
const path = require('path');
const fs = require('fs');
const PlatformConfig = require('../models/PlatformConfig');
const storage = require('../services/storage');
const PLAN_LIMITS_PATH = path.join(__dirname, '../../config/planLimits.json');

async function loadPlanLimits() {
    try {
        const data = await fs.promises.readFile(PLAN_LIMITS_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return {
            free:  { maxSessions: 5,   maxPhotos: 100,  maxAlbums: 1,  maxStorage: 500,   customDomain: false },
            basic: { maxSessions: 50,  maxPhotos: 5000, maxAlbums: 10, maxStorage: 10000, customDomain: false },
            pro:   { maxSessions: -1,  maxPhotos: -1,   maxAlbums: -1, maxStorage: 50000, customDomain: true  }
        };
    }
}

async function getDirSizeAbs(dirPath) {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        const sizes = await Promise.all(entries.map(e => {
            const full = path.join(dirPath, e.name);
            return e.isDirectory() ? getDirSizeAbs(full) : fs.promises.stat(full).then(s => s.size).catch(() => 0);
        }));
        return sizes.reduce((a, b) => a + b, 0);
    } catch {
        return 0;
    }
}

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
            storageSize,
            adminBytes,
            siteBytes,
            assetsBytes,
            clienteBytes,
            albumBytes,
            homeBytes
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
            storage.getDirSize(),
            getDirSizeAbs(path.join(__dirname, '../../admin')),
            getDirSizeAbs(path.join(__dirname, '../../site')),
            getDirSizeAbs(path.join(__dirname, '../../assets')),
            getDirSizeAbs(path.join(__dirname, '../../cliente')),
            getDirSizeAbs(path.join(__dirname, '../../album')),
            getDirSizeAbs(path.join(__dirname, '../../home')),
        ]);

        const byPlan = {};
        planGroups.forEach(g => { byPlan[g._id] = g.count; });
        const platformBytes = adminBytes + siteBytes + assetsBytes + clienteBytes + albumBytes + homeBytes;

        res.json({
            organizations: { total: totalOrgs, active: activeOrgs, pending: totalOrgs - activeOrgs, byPlan },
            users: totalUsers,
            sessions: totalSessions,
            photos: totalPhotos[0]?.total || 0,
            storageBytes: storageSize,
            platformBytes
        });
    } catch (error) {
        req.logger.error('Saas Metrics Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Saúde da plataforma: orgs em risco (churn), chamados abertos, atividade recente.
// "Risco" = dias desde a última atividade registrada no ActivityEvent
// (fallback: createdAt da org, para orgs anteriores à instrumentação).
router.get('/admin/saas/health', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const now = Date.now();
        const DAY = 24 * 60 * 60 * 1000;

        const [openTickets, sessionsLast7d, orgs, lastActivities, recentOrgs] = await Promise.all([
            Ticket.countDocuments({ status: 'open' }),
            Session.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
            Organization.find({ isActive: true, deletedAt: null })
                .select('name slug plan createdAt').lean(),
            ActivityEvent.aggregate([
                { $group: { _id: '$organizationId', lastAt: { $max: '$at' } } }
            ]),
            Organization.find({ deletedAt: null })
                .sort({ createdAt: -1 }).limit(5)
                .select('name slug plan isActive createdAt').lean()
        ]);

        const lastByOrg = {};
        lastActivities.forEach(a => { lastByOrg[String(a._id)] = a.lastAt; });

        const orgsHealth = orgs.map(org => {
            const lastActivity = lastByOrg[String(org._id)] || org.createdAt;
            const idleDays = Math.floor((now - new Date(lastActivity).getTime()) / DAY);
            const health = idleDays >= 30 ? 'red' : idleDays >= 14 ? 'yellow' : 'green';
            return { _id: org._id, name: org.name, slug: org.slug, plan: org.plan, lastActivity, idleDays, health };
        }).sort((a, b) => b.idleDays - a.idleDays);

        res.json({
            openTickets,
            sessionsLast7d,
            orgsHealth,
            atRisk: orgsHealth.filter(o => o.health !== 'green').length,
            recentOrgs
        });
    } catch (error) {
        req.logger.error('Saas Health Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Jornada do cliente: timeline de eventos de uma org (ActivityEvent)
router.get('/admin/organizations/:id/activity', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const events = await ActivityEvent.find({ organizationId: req.params.id })
            .sort({ at: -1 })
            .limit(60)
            .lean();
        res.json({ success: true, events });
    } catch (error) {
        req.logger.error('Org Activity Error', { error: error.message });
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
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

router.get('/admin/organizations/:id/details', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id).populate('ownerId', 'name email');
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        const users = await User.find({ organizationId: org._id }).select('name email role approved createdAt');
        const sessions = await Session.find({ organizationId: org._id }).select('name type mode selectionStatus photos createdAt');

        const orgId = org._id.toString();
        const [sessionsBytes, siteBytes, videosBytes, sub] = await Promise.all([
            storage.getDirSize(`/${orgId}/sessions`),
            storage.getDirSize(`/${orgId}/site`),
            storage.getDirSize(`/${orgId}/videos`),
            Subscription.findOne({ organizationId: org._id }).lean()
        ]);
        const storageBytes = sessionsBytes + siteBytes + videosBytes;
        const toMB = b => Math.round(b / 1024 / 1024 * 100) / 100;
        const totalPhotos = sessions.reduce((sum, s) => sum + (s.photos?.length || 0), 0);

        res.json({
            organization: org,
            users,
            stats: {
                sessions: sessions.length,
                photos: totalPhotos,
                newsletterSubs: 0,
                storageMB: toMB(storageBytes),
                storageBytes,
                maxStorageMB: sub?.limits?.maxStorage || 500,
                maxSessions: sub?.limits?.maxSessions ?? 5,
                maxPhotos: sub?.limits?.maxPhotos ?? 100,
                maxAlbums: sub?.limits?.maxAlbums ?? 1,
                breakdown: {
                    sessionsMB: toMB(sessionsBytes),
                    siteMB: toMB(siteBytes),
                    videosMB: toMB(videosBytes)
                }
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
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'org_approve', org._id);
        res.json({ success: true, message: `Organização "${org.name}" aprovada!` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'org_deactivate', org._id);
        res.json({ success: true, message: `Organização "${org.name}" desativada` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'org_trash', org._id);
        res.json({ success: true, message: `"${org.name}" movida para a lixeira` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'org_restore', org._id);
        res.json({ success: true, message: `"${org.name}" restaurada com sucesso` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'org_delete', orgId, { name: org.name, slug: org.slug });
        res.json({ success: true, message: `"${org.name}" excluída definitivamente` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

router.put('/admin/organizations/:id/plan', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { plan } = req.body;
        const planLimits = await loadPlanLimits();
        if (!planLimits[plan]) return res.status(400).json({ error: 'Plano inválido' });

        const org = await Organization.findByIdAndUpdate(req.params.id, { plan }, { returnDocument: 'after' });
        await Subscription.findOneAndUpdate({ organizationId: org._id }, { plan, limits: planLimits[plan] });
        audit(req, 'plan_change', org._id, { plan });
        res.json({ success: true, message: `Plano alterado para ${plan}` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Limites padrão dos planos
router.get('/admin/saas/plan-limits', authenticateToken, requireSuperadmin, async (req, res) => {
    res.json(await loadPlanLimits());
});

router.put('/admin/saas/plan-limits', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const limits = req.body;
        const valid = ['free', 'basic', 'pro'];
        for (const plan of valid) {
            if (!limits[plan]) return res.status(400).json({ error: `Faltando plano: ${plan}` });
        }
        await fs.promises.writeFile(PLAN_LIMITS_PATH, JSON.stringify(limits, null, 2));

        // Atualizar Subscriptions no banco para refletir os novos limites de cada plano
        await Promise.all(valid.map(plan =>
            Subscription.updateMany({ plan }, { $set: { limits: limits[plan] } })
        ));

        audit(req, 'plan_limits_change', null, { limits });
        res.json({ success: true, message: 'Limites dos planos atualizados' });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Override de limites por org
router.put('/admin/organizations/:id/limits', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { maxSessions, maxPhotos, maxAlbums, maxStorage, customDomain } = req.body;
        await Subscription.findOneAndUpdate(
            { organizationId: req.params.id },
            { $set: { limits: { maxSessions, maxPhotos, maxAlbums, maxStorage, customDomain } } }
        );
        audit(req, 'limits_change', req.params.id, { maxSessions, maxPhotos, maxAlbums, maxStorage });
        res.json({ success: true, message: 'Limites customizados salvos' });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
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
        audit(req, 'site_reset', req.params.id, { section });
        res.json({ success: true, message: `Reset de "${section}" realizado` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Logs de Segurança (Ataques de Bots)
router.get('/admin/saas/security-logs', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const logs = await SecurityLog.find()
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();
        res.json({ logs });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// PLATFORM CONFIGURATION (Superadmin)
// ============================================================================

router.get('/admin/saas/platform-config', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const config = await PlatformConfig.getSingleton();
        res.json({ success: true, config });
    } catch (error) {
        req.logger.error('Erro ao buscar config da plataforma', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

router.patch('/admin/saas/platform-config', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const config = await PlatformConfig.getSingleton();
        if (req.body.watermarkPreviewImage !== undefined) {
            config.watermarkPreviewImage = req.body.watermarkPreviewImage;
        }
        await config.save();
        res.json({ success: true, config });
    } catch (error) {
        req.logger.error('Erro ao atualizar config da plataforma', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// MANUAL DO USUÁRIO (CRUD — superadmin)
// ============================================================================

// Listar todos (superadmin)
router.get('/admin/manual', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const modules = await ManualModule.find().sort({ order: 1 }).lean();
        res.json({ success: true, modules });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Criar módulo
router.post('/admin/manual', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { id, label, icon, order, isPublished, blocks } = req.body;
        if (!id || !label) return res.status(400).json({ error: 'id e label são obrigatórios' });
        const mod = await ManualModule.create({ id, label, icon, order, isPublished, blocks });
        res.status(201).json({ success: true, module: mod });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        if (error.code === 11000) return res.status(409).json({ error: `Já existe um módulo com id "${req.body.id}"` });
        res.status(500).json({ error: error.message });
    }
});

// Atualizar módulo
router.put('/admin/manual/:id', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const mod = await ManualModule.findOneAndUpdate(
            { id: req.params.id },
            { $set: req.body },
            { returnDocument: 'after', runValidators: true }
        );
        if (!mod) return res.status(404).json({ error: 'Módulo não encontrado' });
        res.json({ success: true, module: mod });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Reordenar módulos
router.put('/admin/manual-reorder', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { order } = req.body; // [{ id: 'dashboard', order: 0 }, ...]
        if (!Array.isArray(order)) return res.status(400).json({ error: 'order deve ser um array' });
        await Promise.all(order.map(({ id, order: o }) =>
            ManualModule.findOneAndUpdate({ id }, { $set: { order: o } })
        ));
        res.json({ success: true });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Excluir módulo
router.delete('/admin/manual/:id', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const mod = await ManualModule.findOneAndDelete({ id: req.params.id });
        if (!mod) return res.status(404).json({ error: 'Módulo não encontrado' });
        res.json({ success: true, message: `Módulo "${mod.label}" removido` });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
