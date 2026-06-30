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
const { effectiveMonthlyCents, effectiveStorageMB, effectiveLimits } = require('../services/subscriptionPricing');
const { syncPreapprovalAmount } = require('../middleware/mercadopago');
const { reconcilePaidSubs } = require('../services/mpReconciliation');
const { isProtectedSlug } = require('../utils/protectedOrgs');
const plans = require('../models/plans');

// Limites efetivos por plano, derivados da FONTE ÚNICA (models/plans.js).
// Devolve uma cópia rasa pra ninguém mutar o catálogo compartilhado por engano.
async function loadPlanLimits() {
    return Object.fromEntries(
        Object.entries(plans).map(([id, p]) => [id, { ...p.limits }])
    );
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
            homeBytes,
            paidSubs
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
            // MRR real: assinaturas que geram receita (ativas/em atraso) e que NÃO são
            // cortesia — cortesia = sem cobrança, então fica FORA da contabilidade de
            // receita (não há lucro nela). O valor de cada uma vem de effectiveMonthlyCents
            // (fonte única: preço custom + adicional de storage), não de um mapa no front.
            Subscription.find({ status: { $in: ['active', 'past_due'] }, isCourtesy: { $ne: true } })
                .select('plan customPriceCents storageAddonPriceCents isCourtesy').lean(),
        ]);

        const byPlan = {};
        planGroups.forEach(g => { byPlan[g._id] = g.count; });
        const platformBytes = adminBytes + siteBytes + assetsBytes + clienteBytes + albumBytes + homeBytes;
        const mrrCents = paidSubs.reduce((sum, s) => sum + effectiveMonthlyCents(s), 0);

        res.json({
            organizations: { total: totalOrgs, active: activeOrgs, pending: totalOrgs - activeOrgs, byPlan },
            users: totalUsers,
            sessions: totalSessions,
            photos: totalPhotos[0]?.total || 0,
            storageBytes: storageSize,
            platformBytes,
            mrrCents
        });
    } catch (error) {
        req.logger.error('Saas Metrics Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// CONCILIAÇÃO MERCADO PAGO — projeção (nossos registros) × recorrente em ficha no MP
// ============================================================================
// O /metrics mostra o MRR PROJETADO (o que cada org DEVERIA pagar, do nosso banco) e
// se mexe na hora num webhook. Aqui, ao vivo e READ-ONLY, lemos a PreApproval de cada
// assinatura paga viva pra mostrar o valor/status que o Mercado Pago TEM EM FICHA — e
// sinalizar divergências (MP cancelou, valor dessincronizado, etc.). Não altera /metrics
// nem escreve nada (no MP ou no banco). "Caixa recebido de fato" = Fase 2 (livro-caixa).
router.get('/admin/saas/metrics/reconcile', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const data = await reconcilePaidSubs();
        res.json(data);
    } catch (error) {
        req.logger.error('Saas Reconcile Error', { error: error.message });
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

// ============================================================================
// CUSTO & MARGEM — unit economics por organização
// ============================================================================
//
// Taxa de custo de storage por GB/mês em R$ (referência: Object Storage Contabo).
// É uma PREMISSA DE PLANEJAMENTO — o storage atual é disco LOCAL fixo (custo em
// degrau ao expandir, não cobrança contínua por GB). Usar só para comparação e
// decisão de precificação, nunca como fluxo de caixa.
const COST_RATE_PER_GB = 0.07; // R$/GB/mês — premissa de planejamento

router.get('/admin/saas/cost-margin', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        // Carrega TODAS as assinaturas relevantes, inclusive cortesia
        // (cortesia fica fora do MRR, mas aqui precisamos do custo dela).
        const subs = await Subscription.find({
            status: { $in: ['active', 'past_due', 'trialing'] }
        }).select('organizationId plan customPriceCents storageAddonPriceCents isCourtesy usage').lean();

        if (!subs.length) {
            return res.json({
                totalReceitaCents: 0,
                totalCustoCents: 0,
                totalMargemCents: 0,
                porOrg: []
            });
        }

        // Busca org (slug + nome) para cada subscription
        const orgIds = subs.map(s => s.organizationId).filter(Boolean);
        const orgs = await Organization.find({ _id: { $in: orgIds } })
            .select('_id slug name').lean();
        const orgMap = {};
        orgs.forEach(o => { orgMap[o._id.toString()] = o; });

        // Calcula storage por org em paralelo.
        // Preferência: uso medido pelo reconciliador (persistido — sem I/O de disco).
        // Fallback: leitura real do disco via getOrgStorageBytes (mais lento, mas exato).
        const porOrg = await Promise.all(subs.map(async (sub) => {
            const orgId = sub.organizationId?.toString() || '';
            const org = orgMap[orgId] || { slug: orgId, name: orgId };

            // Storage: usa o persistido se disponível (evita varredura no disco)
            let storageBytes = sub.usage?.storageBytes || 0;
            if (!storageBytes && orgId) {
                try {
                    const medido = await storage.getOrgStorageBytes(orgId);
                    storageBytes = medido.total || 0;
                } catch (_) {
                    storageBytes = 0;
                }
            }

            const storageGB = storageBytes / (1024 * 1024 * 1024);

            // Receita mensal: 0 para cortesia (sem cobrança), efetiva p/ as demais
            const receitaCents = sub.isCourtesy ? 0 : effectiveMonthlyCents(sub);

            // Custo estimado (R$ × 100 para trabalhar em centavos)
            const custoCents = Math.round(storageGB * COST_RATE_PER_GB * 100);

            const margemCents = receitaCents - custoCents;

            return {
                slug: org.slug || orgId,
                nome: org.name || orgId,
                plano: sub.plan || 'free',
                isCourtesy: !!sub.isCourtesy,
                receitaCents,
                storageGB: Math.round(storageGB * 1000) / 1000, // 3 casas
                custoCents,
                margemCents
            };
        }));

        // Ordena por margem ASC (cortesia/negativas primeiro)
        porOrg.sort((a, b) => a.margemCents - b.margemCents);

        const totalReceitaCents = porOrg.reduce((s, o) => s + o.receitaCents, 0);
        const totalCustoCents   = porOrg.reduce((s, o) => s + o.custoCents, 0);
        const totalMargemCents  = totalReceitaCents - totalCustoCents;

        req.logger.info('Saas Cost-Margin consultado', {
            orgs: porOrg.length,
            mrrCents: totalReceitaCents,
            totalCustoCents,
            totalMargemCents
        });

        res.json({
            taxaGBMes: COST_RATE_PER_GB,
            totalReceitaCents,
            totalCustoCents,
            totalMargemCents,
            porOrg
        });
    } catch (error) {
        req.logger.error('Saas Cost-Margin Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Jornada do cliente: timeline de eventos de uma org (ActivityEvent)
router.get('/admin/organizations/:id/activity', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const q = { organizationId: req.params.id };
        // Paginação por data (carregar mais antigos): ?before=<ISO>
        if (req.query.before && !isNaN(Date.parse(req.query.before))) {
            q.at = { $lt: new Date(req.query.before) };
        }
        // Filtro por sessão (drill): ?sessionId=
        if (req.query.sessionId) q['meta.sessionId'] = String(req.query.sessionId);
        // Filtro por nome do cliente (case-insensitive, parcial): ?clientName=
        if (req.query.clientName) {
            const safe = String(req.query.clientName).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            q['meta.clientName'] = new RegExp(safe, 'i');
        }
        const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
        const events = await ActivityEvent.find(q)
            .sort({ at: -1 })
            .limit(limit)
            .lean();
        res.json({ success: true, events, hasMore: events.length === limit });
    } catch (error) {
        req.logger.error('Org Activity Error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Passo-a-passo de UMA sessão — recupera o histórico PASSADO a partir dos dados permanentes
// do Session (events[] + campos de timestamp), sem depender da instrumentação nova.
router.get('/admin/organizations/:id/sessions/:sid/timeline', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const s = await Session.findOne({ _id: req.params.sid, organizationId: req.params.id })
            .select('name clientName mode createdAt uploadsCompletedAt codeSentAt firstAccessAt selectionSubmittedAt deliveredAt events extraRequest deliveryHistory participants.name participants.submittedAt participants.deliveredAt participants.extraRequest')
            .lean();
        if (!s) return res.status(404).json({ error: 'Sessão não encontrada' });

        const items = [];
        const push = (at, type, meta = {}) => { if (at) items.push({ at, type, meta }); };

        // Marcos do fotógrafo / sessão (campos permanentes).
        push(s.createdAt, 'session_created');
        push(s.uploadsCompletedAt, 'photos_uploaded');
        push(s.codeSentAt, 'code_sent');
        push(s.firstAccessAt, 'client_entered', { clientName: s.clientName || '' });
        push(s.selectionSubmittedAt, 'selection_submitted', { clientName: s.clientName || '' });
        push(s.deliveredAt, 'session_delivered', { clientName: s.clientName || '' });
        if (s.extraRequest?.requestedAt) push(s.extraRequest.requestedAt, 'extra_requested', { count: (s.extraRequest.photos || []).length });
        if (s.extraRequest?.respondedAt) push(s.extraRequest.respondedAt, 'extra_responded', { decision: s.extraRequest.status });

        // Marcos por participante (multi).
        (s.participants || []).forEach(p => {
            push(p.submittedAt, 'selection_submitted', { clientName: p.name || '' });
            push(p.deliveredAt, 'session_delivered', { clientName: p.name || '' });
            if (p.extraRequest?.requestedAt) push(p.extraRequest.requestedAt, 'extra_requested', { clientName: p.name || '', count: (p.extraRequest.photos || []).length });
            if (p.extraRequest?.respondedAt) push(p.extraRequest.respondedAt, 'extra_responded', { clientName: p.name || '', decision: p.extraRequest.status });
        });

        // Ciclos de entrega (re-entregas).
        (s.deliveryHistory || []).forEach(d => {
            push(d.deliveredAt, 'session_delivered', { selectedCount: d.selectedCount });
            if (d.reopenedAt) push(d.reopenedAt, 'delivery_reopened');
        });

        // Eventos granulares já gravados em events[] (downloads, reaberturas, etc.).
        (s.events || []).forEach(e => push(e.ts, e.type, e.meta || {}));

        items.sort((a, b) => new Date(a.at) - new Date(b.at));
        res.json({ success: true, session: { id: s._id, name: s.name, clientName: s.clientName || '', mode: s.mode }, items });
    } catch (error) {
        req.logger.error('Org Session Timeline Error', { error: error.message });
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

        // Cortesia + storage medido por org (uma query, mapeada por organizationId).
        // O storage vem do campo persistido pelo reconciliador (storageReconciler),
        // então a listagem NÃO varre o disco — é barata mesmo com muitas orgs.
        const subs = await Subscription.find(
            {},
            'organizationId isCourtesy usage.storageBytes usage.storageQuotaBytes usage.storageReconciledAt'
        ).lean();
        const subMap = {};
        subs.forEach(s => { if (s.organizationId) subMap[s.organizationId.toString()] = s; });

        const toMB = b => Math.round((b || 0) / 1024 / 1024 * 100) / 100;
        const orgsWithStats = organizations.map(org => {
            const sub = subMap[org._id.toString()];
            return {
                ...org,
                stats: {
                    ...(countMap[org._id.toString()] || { sessions: 0, photos: 0 }),
                    storageMB: toMB(sub?.usage?.storageBytes),
                    storageQuotaMB: toMB(sub?.usage?.storageQuotaBytes),
                    storageReconciledAt: sub?.usage?.storageReconciledAt || null
                },
                isCourtesy: !!sub?.isCourtesy,
                isProtected: isProtectedSlug(org.slug)
            };
        });

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
        // Fonte única da fórmula de storage (ver storage.getOrgStorageBytes).
        const [{ sessions: sessionsBytes, site: siteBytes, videos: videosBytes, total: storageBytes }, sub] = await Promise.all([
            storage.getOrgStorageBytes(orgId),
            Subscription.findOne({ organizationId: org._id }).lean()
        ]);
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
                maxStorageMB: effectiveStorageMB(sub),
                maxSessions: effectiveLimits(sub).maxSessions,
                maxPhotos: effectiveLimits(sub).maxPhotos,
                maxAlbums: effectiveLimits(sub).maxAlbums,
                isCourtesy: !!sub?.isCourtesy,
                courtesyNote: sub?.courtesyNote || '',
                graceUntil: sub?.graceUntil || null,
                isProtected: isProtectedSlug(org.slug),
                suspendedReason: org.suspendedReason || null,
                isActive: org.isActive === true,
                subStatus: sub?.status || 'active',
                // Assinatura paga VIVA no MP (não cortesia) — controla o bloco "Iniciar cobrança".
                mpActive: !!sub?.mpPreapprovalId && sub?.status === 'active' && !sub?.isCourtesy,
                lastPaymentAt: sub?.lastPaymentAt || null,
                lastPaymentStatus: sub?.lastPaymentStatus || null,
                overrideEnabled: !!sub?.overrideEnabled,
                customPriceCents: sub?.customPriceCents ?? null,
                storageAddonGB: sub?.storageAddonGB || 0,
                storageAddonPriceCents: sub?.storageAddonPriceCents || 0,
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
        org.suspendedReason = null;   // sai de qualquer suspensão (inclui billing)
        await org.save();
        await User.updateMany({ organizationId: org._id }, { approved: true });
        // Reativar zera a carência (senão um prazo vencido suspenderia de novo no próximo tick)
        await Subscription.updateOne({ organizationId: org._id }, { $set: { graceUntil: null, graceWarnedAt: null } });
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
        org.suspendedReason = null;
        await org.save();
        await User.updateMany({ organizationId: org._id }, { approved: true });
        await Subscription.updateOne({ organizationId: org._id }, { $set: { graceUntil: null, graceWarnedAt: null } });
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
        // Preserva os limites quando há override ligado; senão, aplica os do plano base.
        let sub = await Subscription.findOne({ organizationId: org._id });
        if (!sub) {
            sub = new Subscription({ organizationId: org._id, plan, limits: planLimits[plan] });
        } else {
            sub.plan = plan;
            if (!sub.overrideEnabled) sub.limits = planLimits[plan];
        }
        await sub.save();

        // Reflete o novo plano na assinatura JÁ ATIVA no MP (espelha /custom-price e /storage-addon).
        // Free (valor 0) não tem cobrança recorrente → não sincroniza (R$0 não é assinatura válida no
        // MP; rebaixar p/ free é caso de cancelamento). Falha não desfaz o save: o plano já vale e o
        // valor entra no próximo checkout/ciclo.
        let mpUpdated = false, mpSkipped = null, mpError = null;
        if (effectiveMonthlyCents(sub) > 0) {
            try {
                ({ updated: mpUpdated, skipped: mpSkipped } = await syncPreapprovalAmount(sub));
            } catch (e) {
                mpError = e.message;
                req.logger.error('Falha ao atualizar valor da preapproval no MP', { error: e.message, orgId: org._id });
            }
        } else {
            mpSkipped = 'free_no_charge';
        }

        audit(req, 'plan_change', org._id, { plan, mpUpdated, mpSkipped });
        res.json({ success: true, message: `Plano alterado para ${plan}`, mpUpdated, mpSkipped, mpError });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Limites padrão dos planos (derivados da fonte única models/plans.js).
// Os números dos planos são editados em CÓDIGO (plans.js), não em runtime — por isso
// não há mais PUT aqui (o antigo editor por arquivo foi aposentado na unificação da fonte).
router.get('/admin/saas/plan-limits', authenticateToken, requireSuperadmin, async (req, res) => {
    res.json(await loadPlanLimits());
});

// Override de limites por org.
// overrideEnabled === false  → reverte ao plano base (limites de models/plans.js).
// overrideEnabled !== false  → salva os limites customizados e marca override ligado.
router.put('/admin/organizations/:id/limits', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { maxSessions, maxPhotos, maxAlbums, maxStorage, customDomain, overrideEnabled } = req.body;
        const org = await Organization.findById(req.params.id).select('plan').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });

        if (overrideEnabled === false) {
            const planLimits = await loadPlanLimits();
            sub.overrideEnabled = false;
            sub.limits = planLimits[sub.plan] || planLimits[org.plan] || sub.limits;
        } else {
            sub.overrideEnabled = true;
            sub.limits = {
                maxSessions: Number.isFinite(maxSessions) ? maxSessions : sub.limits.maxSessions,
                maxPhotos: Number.isFinite(maxPhotos) ? maxPhotos : sub.limits.maxPhotos,
                maxAlbums: Number.isFinite(maxAlbums) ? maxAlbums : sub.limits.maxAlbums,
                maxStorage: Number.isFinite(maxStorage) ? maxStorage : sub.limits.maxStorage,
                customDomain: customDomain !== undefined ? !!customDomain : sub.limits.customDomain,
            };
        }
        await sub.save();
        audit(req, 'limits_change', req.params.id, { overrideEnabled: sub.overrideEnabled, limits: sub.limits });
        res.json({ success: true, message: sub.overrideEnabled ? 'Override salvo' : 'Override desligado (voltou ao plano base)', overrideEnabled: sub.overrideEnabled, limits: sub.limits });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Marcar/desmarcar conta cortesia (sem cobrança).
router.put('/admin/organizations/:id/courtesy', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const { isCourtesy, courtesyNote } = req.body;
        const org = await Organization.findById(req.params.id).select('plan').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });
        // Free já é gratuito → cortesia não se aplica (não há cobrança a isentar). Cortesia
        // = presentear um plano PAGO sem cobrar. Só barra ao LIGAR; desligar é sempre livre.
        const effPlan = sub.plan || org.plan || 'free';
        if (isCourtesy && effPlan === 'free') {
            return res.status(400).json({ error: 'O plano Free já é gratuito — cortesia só em planos pagos. Mude o plano para um pago antes de marcar cortesia.' });
        }
        sub.isCourtesy = !!isCourtesy;
        sub.courtesyNote = typeof courtesyNote === 'string' ? courtesyNote.slice(0, 120) : (sub.courtesyNote || '');
        await sub.save();
        audit(req, 'courtesy_change', req.params.id, { isCourtesy: sub.isCourtesy });
        res.json({ success: true, message: sub.isCourtesy ? 'Marcada como cortesia' : 'Cortesia removida', isCourtesy: sub.isCourtesy });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Iniciar cobrança de uma conta existente (sair da cortesia / converter um plano "de graça").
// ENCERRA a cortesia (pré-requisito p/ cobrar, espelha a invariante do mercadopago.js) e marca
// status='pending' = "aguardando o cliente pagar". NÃO cobra aqui: só destrava o CTA "Pagar agora"
// no painel do cliente — o pagamento em si é o checkout normal (CardForm) que ele dispara.
// Status 'pending' não corta acesso (gating é por org.isActive) e fica FORA do MRR (ainda não paga).
router.put('/admin/organizations/:id/start-billing', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id).select('plan slug').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });
        // Contas protegidas (dono/curadas) NUNCA entram em cobrança automática — barreira
        // deliberada: p/ cobrar uma dessas, remova-a de PROTECTED_ORG_SLUGS/OWNER_SLUG antes.
        if (isProtectedSlug(org.slug)) {
            return res.status(403).json({ error: 'Conta protegida não entra em cobrança automática. Remova a proteção antes de iniciar a cobrança.' });
        }

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });
        const effPlan = sub.plan || org.plan || 'free';
        if (effPlan === 'free') {
            return res.status(400).json({ error: 'Defina um plano pago antes de iniciar a cobrança.' });
        }
        // Já paga DE VERDADE (assinatura viva no MP, sem cortesia) → nada a iniciar.
        if (sub.mpPreapprovalId && sub.status === 'active' && !sub.isCourtesy) {
            return res.status(409).json({ error: 'Esta conta já tem assinatura ativa no Mercado Pago.' });
        }

        sub.isCourtesy = false;        // encerra a cortesia (pré-requisito explícito p/ cobrar)
        sub.courtesyNote = '';
        sub.status = 'pending';        // aguardando o cliente pagar (não corta acesso, fora do MRR)
        sub.cancelAtPeriodEnd = false; // limpa cancelamento agendado de um ciclo anterior, se houver
        await sub.save();

        audit(req, 'billing_start', req.params.id, { plan: effPlan });
        res.json({ success: true, message: 'Cobrança iniciada — o cliente verá "Pagar agora" no painel dele.', subStatus: 'pending', isCourtesy: false });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// F3 — Carência de regularização por org. Body: { graceUntil } = 'yyyy-mm-dd' (ou null/'' p/ limpar).
// Define o prazo (o dia que o super-admin quiser, POR ORG) até quando a org tem que regularizar a
// assinatura. Vencido sem regularizar, o graceChecker SUSPENDE a org (sem excluir nada). Não cobra
// aqui — só agenda o prazo. Contas protegidas (PROTECTED_ORG_SLUGS/OWNER_SLUG) nunca são suspensas
// automaticamente, mas o prazo pode ser registrado mesmo assim (o front reforça a confirmação).
router.put('/admin/organizations/:id/grace', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id).select('plan slug').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        const raw = req.body.graceUntil;
        let graceUntil = null;
        if (raw) {
            // Data-only 'yyyy-mm-dd' (do <input type=date>) → fim do dia no fuso de Brasília
            // (UTC-3, sem horário de verão desde 2019). Assim "prazo até 27/06" vence no fim do
            // 27/06 no horário do Brasil — e não às ~21h por causa do UTC.
            const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59-03:00` : raw;
            const d = new Date(iso);
            if (isNaN(d.getTime())) return res.status(400).json({ error: 'Data inválida' });
            if (d.getTime() < Date.now()) return res.status(400).json({ error: 'O prazo não pode estar no passado' });
            graceUntil = d;
        }

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });
        sub.graceUntil = graceUntil;
        sub.graceWarnedAt = null;   // redefiniu o prazo → permite um novo aviso prévio
        await sub.save();

        const protectedOrg = isProtectedSlug(org.slug);
        audit(req, 'grace_change', req.params.id, { graceUntil: graceUntil ? graceUntil.toISOString() : null, protectedOrg });
        res.json({
            success: true,
            message: graceUntil ? 'Prazo de regularização salvo' : 'Prazo de regularização removido',
            graceUntil: graceUntil ? graceUntil.toISOString() : null,
            isProtected: protectedOrg
        });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Preço personalizado por org (em centavos). <= 0 / vazio → null (volta ao preço do plano).
// Reflete na assinatura JÁ ATIVA no MP quando há preapproval avulsa (flag MP_USE_PREAPPROVAL);
// no modo legado vale só na próxima assinatura (mpSkipped='legacy_flag_off').
router.put('/admin/organizations/:id/custom-price', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const raw = req.body.customPriceCents;
        const org = await Organization.findById(req.params.id).select('plan').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        const cents = Number(raw);
        const customPriceCents = Number.isFinite(cents) && cents > 0 ? Math.round(cents) : null;

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });
        sub.customPriceCents = customPriceCents;
        await sub.save();

        // Reflete o novo preço na assinatura JÁ ATIVA no MP. Falha não desfaz o save:
        // vale como base e entra no próximo checkout.
        let mpUpdated = false, mpSkipped = null, mpError = null;
        try {
            ({ updated: mpUpdated, skipped: mpSkipped } = await syncPreapprovalAmount(sub));
        } catch (e) {
            mpError = e.message;
            req.logger.error('Falha ao atualizar valor da preapproval no MP', { error: e.message, orgId: req.params.id });
        }

        audit(req, 'custom_price_change', req.params.id, { customPriceCents, mpUpdated, mpSkipped });
        res.json({
            success: true,
            message: customPriceCents ? 'Preço personalizado salvo' : 'Preço personalizado removido (voltou ao plano)',
            customPriceCents,
            mpUpdated,
            mpSkipped,
            mpError
        });
    } catch (error) {
        req.logger.error('Erro no SaaS Admin', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// Storage adicional recorrente por org. `extraGB`/`priceCents` <= 0 (ou vazio) → remove o adicional.
// O limite efetivo sobe sozinho (effectiveStorageMB). Se a org já tem assinatura ativa no MP,
// tenta atualizar o valor da preapproval p/ refletir o novo total na próxima fatura.
router.put('/admin/organizations/:id/storage-addon', authenticateToken, requireSuperadmin, async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id).select('plan').lean();
        if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

        const gb = Number(req.body.extraGB);
        const cents = Number(req.body.priceCents);
        const storageAddonGB = Number.isFinite(gb) && gb > 0 ? Math.round(gb) : 0;
        const storageAddonPriceCents = Number.isFinite(cents) && cents > 0 ? Math.round(cents) : 0;

        let sub = await Subscription.findOne({ organizationId: req.params.id });
        if (!sub) sub = new Subscription({ organizationId: req.params.id, plan: org.plan || 'free' });
        sub.storageAddonGB = storageAddonGB;
        sub.storageAddonPriceCents = storageAddonPriceCents;
        await sub.save();

        // Reflete o novo total na assinatura JÁ ATIVA no MP (checkout normal só vale p/ assinatura nova).
        // Falha aqui não desfaz o save: o adicional já vale como limite; o valor entra no próximo checkout.
        let mpUpdated = false, mpSkipped = null, mpError = null;
        try {
            ({ updated: mpUpdated, skipped: mpSkipped } = await syncPreapprovalAmount(sub));
        } catch (e) {
            mpError = e.message;
            req.logger.error('Falha ao atualizar valor da preapproval no MP', { error: e.message, orgId: req.params.id });
        }

        audit(req, 'storage_addon_change', req.params.id, { storageAddonGB, storageAddonPriceCents, mpUpdated, mpSkipped });
        res.json({
            success: true,
            message: storageAddonGB > 0 ? 'Storage adicional salvo' : 'Storage adicional removido',
            storageAddonGB,
            storageAddonPriceCents,
            mpUpdated,
            mpSkipped,
            mpError
        });
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
        // Modo manutenção global da plataforma
        if (req.body.maintenance !== undefined && typeof req.body.maintenance === 'object') {
            const m = req.body.maintenance;
            const atual = config.maintenance || {};
            config.maintenance = {
                enabled: !!m.enabled,
                message: typeof m.message === 'string' ? m.message.slice(0, 500) : (atual.message || ''),
                etaText: typeof m.etaText === 'string' ? m.etaText.slice(0, 120) : (atual.etaText || ''),
                updatedAt: new Date(),
            };
        }
        await config.save();
        // Zera o cache da cortina p/ a mudança valer na hora (ligar/desligar)
        const invalidate = req.app.get('invalidateMaintenanceCache');
        if (typeof invalidate === 'function') invalidate();
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
