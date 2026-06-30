// Ferramentas READ-ONLY do agente do SaaS Admin.
// Cada tool espelha a lógica de query dos endpoints superadmin já existentes
// (src/routes/saasAdmin.js e saasSystem.js), porém:
//   - sempre .lean() e somente leitura (NUNCA escreve);
//   - whitelist explícita de campos no retorno — jamais expõe conteúdo/URL de
//     fotos de cliente, accessCode ou comentário privado (lição do isolamento
//     multi_selection). Estes stores não tocam nesses dados, mas mapeamos campo
//     a campo para garantir.
// Definidas no formato neutro do AI SDK (tool + zod) → valem em qualquer provider.
const { tool } = require('ai');
const { z } = require('zod');
const mongoose = require('mongoose');

const Organization = require('../models/Organization');
const User = require('../models/User');
const Session = require('../models/Session');
const Subscription = require('../models/Subscription');
const PlatformLog = require('../models/PlatformLog');
const EmailLog = require('../models/EmailLog');
const AuditLog = require('../models/AuditLog');
const ActivityEvent = require('../models/ActivityEvent');
const Ticket = require('../models/Ticket');
const SchedulerRun = require('../models/SchedulerRun');
const ManualModule = require('../models/ManualModule');
const PLANS = require('../models/plans');
const manualOperador = require('./manualOperador');

const DAY = 24 * 60 * 60 * 1000;
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const since = (hours) => new Date(Date.now() - hours * 3600 * 1000);
const trunc = (s, n) => (s ? String(s).slice(0, n) : s);

// Resolve "org" (slug, _id ou nome aproximado) → { _id, name, slug, plan, isActive }
async function resolveOrg(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const fields = 'name slug plan isActive';
  if (mongoose.Types.ObjectId.isValid(s)) {
    const byId = await Organization.findById(s).select(fields).lean();
    if (byId) return byId;
  }
  const bySlug = await Organization.findOne({ slug: s.toLowerCase() }).select(fields).lean();
  if (bySlug) return bySlug;
  return Organization.findOne({ name: { $regex: escapeRegex(s), $options: 'i' }, deletedAt: null })
    .select(fields).lean();
}

const tools = {
  // ── Visão geral da plataforma (totais + saúde/churn) ──────────────────────
  getPlatformOverview: tool({
    description: 'Visão geral da plataforma: totais (orgs, usuários, sessões, fotos, distribuição por plano) e saúde (orgs em risco de churn por dias sem atividade, chamados abertos, sessões dos últimos 7 dias, cadastros recentes). Use para "como está a plataforma", "orgs em risco", "resumo geral".',
    inputSchema: z.object({}),
    execute: async () => {
      const now = Date.now();
      const [totalOrgs, activeOrgs, totalUsers, totalSessions, photosAgg, planGroups,
             openTickets, sessionsLast7d, orgs, lastActivities, recentOrgs] = await Promise.all([
        Organization.countDocuments({ deletedAt: null }),
        Organization.countDocuments({ isActive: true, deletedAt: null }),
        User.countDocuments(),
        Session.countDocuments(),
        Session.aggregate([{ $project: { c: { $size: '$photos' } } }, { $group: { _id: null, total: { $sum: '$c' } } }]),
        Organization.aggregate([{ $match: { deletedAt: null } }, { $group: { _id: '$plan', count: { $sum: 1 } } }]),
        Ticket.countDocuments({ status: 'open' }),
        Session.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY) } }),
        Organization.find({ isActive: true, deletedAt: null }).select('name slug plan createdAt').lean(),
        ActivityEvent.aggregate([{ $group: { _id: '$organizationId', lastAt: { $max: '$at' } } }]),
        Organization.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(5)
          .select('name slug plan isActive createdAt').lean()
      ]);

      const lastByOrg = {};
      lastActivities.forEach((a) => { lastByOrg[String(a._id)] = a.lastAt; });
      const byPlan = {};
      planGroups.forEach((g) => { byPlan[g._id || 'sem_plano'] = g.count; });

      const orgsHealth = orgs.map((o) => {
        const last = lastByOrg[String(o._id)] || o.createdAt;
        const idleDays = Math.floor((now - new Date(last).getTime()) / DAY);
        const health = idleDays >= 30 ? 'red' : idleDays >= 14 ? 'yellow' : 'green';
        return { name: o.name, slug: o.slug, plan: o.plan, idleDays, health };
      }).sort((a, b) => b.idleDays - a.idleDays);

      const atRisk = orgsHealth.filter((o) => o.health !== 'green');
      return {
        totals: {
          orgs: totalOrgs, activeOrgs, pendingOrgs: totalOrgs - activeOrgs,
          users: totalUsers, sessions: totalSessions, photos: photosAgg[0]?.total || 0, byPlan
        },
        health: {
          atRiskCount: atRisk.length,
          openTickets,
          sessionsLast7d,
          orgsAtRisk: atRisk.slice(0, 25), // só as amarelas/vermelhas, top 25 por ociosidade
          recentOrgs: recentOrgs.map((o) => ({ name: o.name, slug: o.slug, plan: o.plan, isActive: o.isActive, createdAt: o.createdAt }))
        }
      };
    }
  }),

  // ── Erros (PlatformLog) ───────────────────────────────────────────────────
  listErrors: tool({
    description: 'Lista erros/avisos da plataforma (backend Winston + erros JS do frontend). Filtra por janela de horas, nível, origem e org. Use para "houve erro hoje", "por que o fotógrafo X tomou erro 500", "erros do frontend".',
    inputSchema: z.object({
      hours: z.number().int().min(1).max(720).optional().describe('Janela em horas (default 168 = 7 dias)'),
      level: z.enum(['error', 'warn']).optional(),
      source: z.enum(['backend', 'frontend-admin', 'frontend-cliente', 'frontend-album']).optional(),
      orgSlug: z.string().optional().describe('Filtrar por org (slug, id ou nome)'),
      limit: z.number().int().min(1).max(100).optional()
    }),
    execute: async ({ hours = 168, level, source, orgSlug, limit = 30 }) => {
      const filtro = { at: { $gte: since(hours) } };
      if (level) filtro.level = level;
      if (source) filtro.source = source;
      if (orgSlug) {
        const org = await resolveOrg(orgSlug);
        if (!org) return { error: `Org não encontrada: "${orgSlug}"` };
        filtro.organizationId = org._id;
      }
      const last24h = new Date(Date.now() - 24 * 3600 * 1000);
      const [logs, errors24h, warns24h, frontend24h] = await Promise.all([
        PlatformLog.find(filtro).sort({ at: -1 }).limit(limit).populate('organizationId', 'name slug').lean(),
        PlatformLog.countDocuments({ level: 'error', at: { $gte: last24h } }),
        PlatformLog.countDocuments({ level: 'warn', at: { $gte: last24h } }),
        PlatformLog.countDocuments({ source: { $ne: 'backend' }, at: { $gte: last24h } })
      ]);
      return {
        counters: { errors24h, warns24h, frontend24h },
        logs: logs.map((l) => ({
          at: l.at, level: l.level, source: l.source,
          message: trunc(l.message, 300), status: l.status, url: l.url, requestId: l.requestId,
          org: l.organizationId ? { name: l.organizationId.name, slug: l.organizationId.slug } : null
        }))
      };
    }
  }),

  // ── E-mails (EmailLog) ────────────────────────────────────────────────────
  listEmails: tool({
    description: 'Lista tentativas de envio de e-mail da plataforma (falhas primeiro). Filtra por janela, sucesso/falha e template. Use para "e-mails falharam", "o cliente recebeu o e-mail de galeria".',
    inputSchema: z.object({
      hours: z.number().int().min(1).max(2160).optional().describe('Janela em horas (default 168)'),
      ok: z.boolean().optional().describe('true = só enviados, false = só falhas'),
      template: z.string().optional().describe('ex.: welcome, gallery_available, ticket_reply'),
      limit: z.number().int().min(1).max(100).optional()
    }),
    execute: async ({ hours = 168, ok, template, limit = 30 }) => {
      const filtro = { at: { $gte: since(hours) } };
      if (typeof ok === 'boolean') filtro.ok = ok;
      if (template) filtro.template = template;
      const last24h = new Date(Date.now() - 24 * 3600 * 1000);
      const [emails, sent24h, failed24h] = await Promise.all([
        EmailLog.find(filtro).sort({ ok: 1, at: -1 }).limit(limit).lean(),
        EmailLog.countDocuments({ ok: true, at: { $gte: last24h } }),
        EmailLog.countDocuments({ ok: false, at: { $gte: last24h } })
      ]);
      return {
        counters: { sent24h, failed24h },
        emails: emails.map((e) => ({
          at: e.at, to: e.to, subject: e.subject, template: e.template,
          orgSlug: e.orgSlug, ok: e.ok, error: e.error, skipped: e.skipped
        }))
      };
    }
  }),

  // ── Busca de orgs ─────────────────────────────────────────────────────────
  findOrgs: tool({
    description: 'Busca organizações (fotógrafos) por nome ou slug, com estatísticas de sessões e fotos. Use para localizar uma org antes de pedir diagnóstico/jornada.',
    inputSchema: z.object({
      query: z.string().describe('Parte do nome ou slug da org'),
      limit: z.number().int().min(1).max(20).optional()
    }),
    execute: async ({ query, limit = 10 }) => {
      const rx = { $regex: escapeRegex(query), $options: 'i' };
      const orgs = await Organization.find({ deletedAt: null, $or: [{ name: rx }, { slug: rx }] })
        .populate('ownerId', 'email').sort({ createdAt: -1 }).limit(limit)
        .select('name slug plan isActive createdAt ownerId').lean();
      if (!orgs.length) return { orgs: [] };
      const ids = orgs.map((o) => o._id);
      const stats = await Session.aggregate([
        { $match: { organizationId: { $in: ids } } },
        { $group: { _id: '$organizationId', sessions: { $sum: 1 }, photos: { $sum: { $size: '$photos' } } } }
      ]);
      const statMap = {};
      stats.forEach((s) => { statMap[String(s._id)] = { sessions: s.sessions, photos: s.photos }; });
      return {
        orgs: orgs.map((o) => ({
          name: o.name, slug: o.slug, plan: o.plan, isActive: o.isActive, createdAt: o.createdAt,
          ownerEmail: o.ownerId?.email || null,
          ...(statMap[String(o._id)] || { sessions: 0, photos: 0 })
        }))
      };
    }
  }),

  // ── Diagnóstico por org ───────────────────────────────────────────────────
  getOrgDiagnostics: tool({
    description: 'Diagnóstico completo de uma org: últimos erros, últimos e-mails (dela e dos clientes dela), último login, ações de auditoria e contadores 7 dias. Use quando um fotógrafo específico reclama de algo.',
    inputSchema: z.object({ org: z.string().describe('slug, id ou nome da org') }),
    execute: async ({ org }) => {
      const found = await resolveOrg(org);
      if (!found) return { error: `Org não encontrada: "${org}"` };
      const users = await User.find({ organizationId: found._id }).select('email').lean();
      const userEmails = users.map((u) => u.email);
      const last7d = new Date(Date.now() - 7 * DAY);
      const emailFiltro = { $or: [{ orgSlug: found.slug }, { to: { $in: userEmails } }] };
      const [erros, emails, ultimoLogin, auditoria, erros7d, emailsFalha7d] = await Promise.all([
        PlatformLog.find({ organizationId: found._id }).sort({ at: -1 }).limit(20).lean(),
        EmailLog.find(emailFiltro).sort({ at: -1 }).limit(20).lean(),
        ActivityEvent.findOne({ organizationId: found._id, type: 'login' }).sort({ at: -1 }).lean(),
        AuditLog.find({ targetOrgId: found._id }).sort({ at: -1 }).limit(10).populate('adminUserId', 'email').lean(),
        PlatformLog.countDocuments({ organizationId: found._id, at: { $gte: last7d } }),
        EmailLog.countDocuments({ ...emailFiltro, ok: false, at: { $gte: last7d } })
      ]);
      return {
        org: { name: found.name, slug: found.slug, plan: found.plan, isActive: found.isActive },
        ultimoLogin: ultimoLogin?.at || null,
        counters: { erros7d, emailsFalha7d },
        erros: erros.map((e) => ({ at: e.at, level: e.level, message: trunc(e.message, 300), status: e.status, url: e.url })),
        emails: emails.map((e) => ({ at: e.at, to: e.to, template: e.template, ok: e.ok, error: e.error })),
        auditoria: auditoria.map((a) => ({ at: a.at, action: a.action, adminEmail: a.adminUserId?.email || null }))
      };
    }
  }),

  // ── Jornada da org (ActivityEvent) ────────────────────────────────────────
  getOrgJourney: tool({
    description: 'Linha do tempo de eventos de uma org (login, criou sessão, subiu fotos, enviou código, cliente visualizou, seleção enviada, entregue, configurou feature, upgrade de plano, domínio verificado, chamado). Use para entender o passo-a-passo do fotógrafo / onde ele travou.',
    inputSchema: z.object({
      org: z.string().describe('slug, id ou nome da org'),
      limit: z.number().int().min(1).max(100).optional()
    }),
    execute: async ({ org, limit = 60 }) => {
      const found = await resolveOrg(org);
      if (!found) return { error: `Org não encontrada: "${org}"` };
      const events = await ActivityEvent.find({ organizationId: found._id }).sort({ at: -1 }).limit(limit).lean();
      return {
        org: { name: found.name, slug: found.slug },
        events: events.map((e) => ({ at: e.at, type: e.type, meta: e.meta || {} }))
      };
    }
  }),

  // ── Auditoria do superadmin ───────────────────────────────────────────────
  getAuditLog: tool({
    description: 'Ações do superadmin sobre orgs (aprovar, desativar, mudar plano/limites, reset de site, impersonar). Opcionalmente filtrado por org. Use para "o que foi feito na org X", "histórico de mudanças de plano".',
    inputSchema: z.object({
      org: z.string().optional().describe('slug, id ou nome da org (opcional)'),
      limit: z.number().int().min(1).max(100).optional()
    }),
    execute: async ({ org, limit = 30 }) => {
      const filtro = {};
      if (org) {
        const found = await resolveOrg(org);
        if (!found) return { error: `Org não encontrada: "${org}"` };
        filtro.targetOrgId = found._id;
      }
      const entries = await AuditLog.find(filtro).sort({ at: -1 }).limit(limit)
        .populate('adminUserId', 'email').populate('targetOrgId', 'name slug').lean();
      return {
        entries: entries.map((a) => ({
          at: a.at, action: a.action, adminEmail: a.adminUserId?.email || null,
          targetOrg: a.targetOrgId ? { name: a.targetOrgId.name, slug: a.targetOrgId.slug } : null,
          meta: a.meta || {}
        }))
      };
    }
  }),

  // ── Status do sistema ─────────────────────────────────────────────────────
  getSystemStatus: tool({
    description: 'Saúde técnica: estado do MongoDB, schedulers (última execução, status, erros) e processo (uptime, versão, memória). Use para "o sistema está ok", "algum scheduler falhou".',
    inputSchema: z.object({}),
    execute: async () => {
      const mongoState = mongoose.connection.readyState;
      const schedulers = await SchedulerRun.find().sort({ name: 1 }).lean();
      return {
        mongo: { state: mongoState, ok: mongoState === 1 },
        processo: {
          uptimeSec: Math.floor(process.uptime()),
          nodeVersion: process.version,
          appVersion: require('../../package.json').version,
          rssMB: Math.round(process.memoryUsage().rss / 1048576),
          pm2Instance: process.env.NODE_APP_INSTANCE ?? null
        },
        schedulers: schedulers.map((s) => ({
          name: s.name, lastStatus: s.lastStatus, lastStartAt: s.lastStartAt, lastEndAt: s.lastEndAt,
          lastDurationMs: s.lastDurationMs, lastError: s.lastError, runCount: s.runCount
        }))
      };
    }
  }),

  // ── Métricas de negócio / assinaturas ─────────────────────────────────────
  getBusinessMetrics: tool({
    description: 'Métricas de negócio/assinaturas: distribuição por plano, status (active/trialing/past_due/canceled), MRR POTENCIAL (soma do preço dos planos pagos ativos, EXCLUINDO contas de cortesia) e próximos vencimentos. A distribuição por plano lê Organization.plan (MESMA fonte do dashboard) e ignora orgs na lixeira/assinaturas órfãs — por isso bate com o painel. ATENÇÃO: V1 NÃO cobra de verdade — o MRR é o teto teórico baseado no plano atribuído, não receita real. Use para "MRR", "quantos no plano pro", "quem está past_due/em trial".',
    inputSchema: z.object({}),
    execute: async () => {
      // FONTE ÚNICA: o plano é lido de Organization.plan (mesmo campo do dashboard
      // em saasAdmin.js:78), NÃO de Subscription.plan, que pode divergir. O $lookup +
      // $unwind descarta assinaturas órfãs (org já apagada) e o $match remove orgs na
      // lixeira (deletedAt). Assim a contagem do agente bate com a tela do painel.
      const liveSubs = await Subscription.aggregate([
        { $lookup: { from: 'organizations', localField: 'organizationId', foreignField: '_id', as: 'org' } },
        { $unwind: '$org' },
        { $match: { 'org.deletedAt': null } },
        { $project: {
            status: 1, cancelAtPeriodEnd: 1, currentPeriodEnd: 1, isCourtesy: 1, customPriceCents: 1,
            plan: '$org.plan',               // plano canônico (igual ao dashboard)
            orgName: '$org.name', orgSlug: '$org.slug'
        } }
      ]);
      const priceBRL = (p) => (PLANS[p]?.price || 0) / 100; // plans.js guarda centavos

      const byPlan = {}; const byStatus = {};
      let mrrPotencial = 0; let cortesiasAtivas = 0;
      const cancelando = []; const vencimentos = [];
      liveSubs.forEach((s) => {
        const plan = s.plan || 'sem_plano';
        byPlan[plan] = (byPlan[plan] || 0) + 1;
        byStatus[s.status || 'sem_status'] = (byStatus[s.status || 'sem_status'] || 0) + 1;

        // MRR/cancelamentos/vencimentos só para assinaturas vigentes
        if (!['active', 'trialing', 'past_due'].includes(s.status)) return;
        const org = { name: s.orgName, slug: s.orgSlug };
        // Cortesia NÃO entra no MRR: é plano pago de rótulo, sem cobrança real.
        // (A distribuição por plano acima continua contando, p/ bater com o dashboard.)
        if (s.status === 'active' && plan !== 'free') {
          if (s.isCourtesy) cortesiasAtivas++;
          // Preço personalizado da org tem prioridade sobre o preço do catálogo.
          else mrrPotencial += s.customPriceCents > 0 ? s.customPriceCents / 100 : priceBRL(plan);
        }
        if (s.cancelAtPeriodEnd) cancelando.push({ org, plan, currentPeriodEnd: s.currentPeriodEnd });
        if (s.currentPeriodEnd) vencimentos.push({ org, plan, status: s.status, currentPeriodEnd: s.currentPeriodEnd });
      });
      vencimentos.sort((a, b) => new Date(a.currentPeriodEnd) - new Date(b.currentPeriodEnd));
      return {
        observacao: 'MRR é o teto teórico (preço do plano × assinaturas ativas pagas), usando o PREÇO PERSONALIZADO da org quando houver (customPriceCents). Contas de CORTESIA são excluídas do MRR (plano pago de rótulo, sem cobrança). Distribuição por plano lê Organization.plan (mesma fonte do dashboard); órfãs e orgs na lixeira são ignoradas.',
        byPlan, byStatus,
        mrrPotencialBRL: Math.round(mrrPotencial * 100) / 100,
        cortesiasAtivasExcluidasDoMRR: cortesiasAtivas,
        precosPlanoBRL: { basic: priceBRL('basic'), pro: priceBRL('pro') },
        cancelandoNoFimDoPeriodo: cancelando.slice(0, 25),
        proximosVencimentos: vencimentos.slice(0, 15)
      };
    }
  }),

  // ── Domínios personalizados ───────────────────────────────────────────────
  getDomains: tool({
    description: 'Domínios personalizados das orgs: pendente vs verificado e data de verificação. Use para "domínios pendentes", "quem ainda não verificou o domínio", "domínios ativos".',
    inputSchema: z.object({ status: z.enum(['pending', 'verified']).optional() }),
    execute: async ({ status }) => {
      const filtro = { customDomain: { $nin: [null, ''] }, deletedAt: null };
      if (status) filtro.domainStatus = status;
      const orgs = await Organization.find(filtro)
        .select('name slug customDomain domainStatus domainVerifiedAt')
        .sort({ domainStatus: 1, name: 1 }).lean();
      const domains = orgs.map((o) => ({
        org: { name: o.name, slug: o.slug }, domain: o.customDomain,
        status: o.domainStatus, verifiedAt: o.domainVerifiedAt || null
      }));
      return {
        counters: {
          total: domains.length,
          pendentes: domains.filter((d) => d.status === 'pending').length,
          verificados: domains.filter((d) => d.status === 'verified').length
        },
        domains
      };
    }
  }),

  // ── Adoção de integrações (GA / Meta Pixel) ───────────────────────────────
  getIntegrationsAdoption: tool({
    description: 'Adoção de integrações de marketing/analytics: quais orgs ligaram Google Analytics e/ou Meta Pixel (com o ID configurado). Use para "quem ativou GA/Pixel", "quantas orgs usam analytics".',
    inputSchema: z.object({}),
    execute: async () => {
      const [orgs, totalOrgs] = await Promise.all([
        Organization.find({
          deletedAt: null,
          $or: [{ 'integrations.googleAnalytics.enabled': true }, { 'integrations.metaPixel.enabled': true }]
        }).select('name slug integrations.googleAnalytics integrations.metaPixel.enabled integrations.metaPixel.pixelId').lean(),
        Organization.countDocuments({ deletedAt: null })
      ]);
      const ga = []; const pixel = [];
      orgs.forEach((o) => {
        const org = { name: o.name, slug: o.slug };
        if (o.integrations?.googleAnalytics?.enabled) ga.push({ org, measurementId: o.integrations.googleAnalytics.measurementId || null });
        if (o.integrations?.metaPixel?.enabled) pixel.push({ org, pixelId: o.integrations.metaPixel.pixelId || null }); // nunca expõe accessToken
      });
      return {
        totalOrgs,
        googleAnalytics: { count: ga.length, orgs: ga },
        metaPixel: { count: pixel.length, orgs: pixel }
      };
    }
  }),

  // ── Depoimentos pendentes de aprovação ────────────────────────────────────
  getPendingTestimonials: tool({
    description: 'Depoimentos enviados por clientes aguardando o fotógrafo aprovar no site. Use para "depoimentos pendentes", "quem tem depoimento para moderar".',
    inputSchema: z.object({ org: z.string().optional().describe('limitar a uma org (slug, id ou nome)') }),
    execute: async ({ org }) => {
      const filtro = { deletedAt: null, 'siteContent.pendingDepoimentos.0': { $exists: true } };
      if (org) {
        const found = await resolveOrg(org);
        if (!found) return { error: `Org não encontrada: "${org}"` };
        filtro._id = found._id;
      }
      const orgs = await Organization.find(filtro).select('name slug siteContent.pendingDepoimentos').lean();
      let totalPendentes = 0;
      const lista = orgs.map((o) => {
        const pend = o.siteContent?.pendingDepoimentos || [];
        totalPendentes += pend.length;
        return {
          org: { name: o.name, slug: o.slug }, pendentes: pend.length,
          amostra: pend.slice(0, 5).map((p) => ({ name: p.name, rating: p.rating, submittedAt: p.submittedAt, text: trunc(p.text, 160) }))
        };
      }).sort((a, b) => b.pendentes - a.pendentes);
      return { totalPendentes, orgs: lista };
    }
  }),

  // ── Motor de vendas dos fotógrafos (cupons + potencial de foto extra) ──────
  getSalesOverview: tool({
    description: 'Motor de vendas dos fotógrafos (venda de FOTO EXTRA ao cliente final): cupons emitidos/resgatados pela automação de escassez/reativação e pedidos de extra pendentes. NÃO é receita da plataforma — é a venda do fotógrafo ao cliente dele. Use para "cupons resgatados", "taxa de resgate", "vendas da org X".',
    inputSchema: z.object({
      org: z.string().optional().describe('limitar a uma org (slug, id ou nome)'),
      days: z.number().int().min(1).max(365).optional().describe('janela dos cupons recentes (default 90)')
    }),
    execute: async ({ org, days = 90 }) => {
      const match = {};
      if (org) {
        const found = await resolveOrg(org);
        if (!found) return { error: `Org não encontrada: "${org}"` };
        match.organizationId = found._id;
      }
      const desde = since(days * 24);
      const [comTriggers, pedidosPendentes] = await Promise.all([
        Session.find({ ...match, 'salesAutomation.sentTriggers.0': { $exists: true } })
          .select('organizationId salesAutomation extraRequest').populate('organizationId', 'name slug').lean(),
        Session.countDocuments({ ...match, 'extraRequest.status': 'pending' })
      ]);
      let emitidos = 0; let resgatados = 0; const recentes = [];
      comTriggers.forEach((s) => {
        const org2 = s.organizationId ? { name: s.organizationId.name, slug: s.organizationId.slug } : null;
        (s.salesAutomation?.sentTriggers || []).forEach((t) => {
          if (!t.couponCode) return;
          emitidos++;
          const usado = !!t.redeemedAt || !!(s.extraRequest && s.extraRequest.paid);
          if (usado) resgatados++;
          if (t.sentAt && new Date(t.sentAt) >= desde) recentes.push({ code: t.couponCode, trigger: t.trigger, sentAt: t.sentAt, redeemed: usado, org: org2 });
        });
      });
      recentes.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
      return {
        periodoDias: days,
        cupons: { emitidos, resgatados, taxaResgatePct: emitidos ? Math.round((resgatados / emitidos) * 1000) / 10 : 0, recentes: recentes.slice(0, 30) },
        pedidosExtraPendentes: pedidosPendentes
      };
    }
  }),

  // ── Chamados de suporte COM contexto (Fala Conosco) ───────────────────────
  getTickets: tool({
    description: 'Chamados de suporte COM CONTEXTO completo: assunto, categoria, status, qual org abriu, há quantas horas está aberto e a CONVERSA inteira (mensagens). Sempre traga o conteúdo, nunca só a contagem. Use para "tem chamado aberto?", "qual o contexto do chamado", "o que a org X relatou".',
    inputSchema: z.object({
      status: z.enum(['open', 'pending', 'resolved']).optional().describe('default: open'),
      org: z.string().optional().describe('filtrar por org (slug, id ou nome)'),
      limit: z.number().int().min(1).max(50).optional()
    }),
    execute: async ({ status = 'open', org, limit = 15 }) => {
      const filtro = { status };
      if (org) {
        const found = await resolveOrg(org);
        if (!found) return { error: `Org não encontrada: "${org}"` };
        filtro.organizationId = found._id;
      }
      const tickets = await Ticket.find(filtro).sort({ updatedAt: -1 }).limit(limit)
        .populate('organizationId', 'name slug plan').lean();
      const now = Date.now();
      return {
        total: tickets.length,
        tickets: tickets.map((t) => {
          const msgs = t.messages || [];
          const last = msgs[msgs.length - 1];
          return {
            id: String(t._id),
            assunto: t.subject,
            categoria: t.category,
            status: t.status,
            org: t.organizationId ? { name: t.organizationId.name, slug: t.organizationId.slug, plan: t.organizationId.plan } : null,
            abertoEm: t.createdAt,
            horasAberto: Math.floor((now - new Date(t.createdAt).getTime()) / 3600000),
            ultimaAtualizacao: t.updatedAt,
            // fotógrafo falou por último → o chamado está esperando resposta do admin
            aguardandoRespostaDoAdmin: last ? last.from === 'photographer' : false,
            conversa: msgs.map((m) => ({ de: m.from === 'photographer' ? 'fotógrafo' : 'admin', em: m.at, texto: trunc(m.text, 600) }))
          };
        })
      };
    }
  }),

  // ── Manual da plataforma (base de conhecimento editável) ──────────────────
  searchManual: tool({
    description: 'Documentação de COMO A PLATAFORMA FUNCIONA — o Manual/Ajuda que o superadmin mantém (fluxos, configurações, passo-a-passo). Consulte SEMPRE antes de explicar um fluxo ou embasar a resposta de um chamado; não invente. Sem query = lista os módulos disponíveis.',
    inputSchema: z.object({ query: z.string().optional().describe('termo/assunto a buscar; vazio = lista os módulos') }),
    execute: async ({ query }) => {
      const mods = await ManualModule.find({ isPublished: true }).sort({ order: 1 }).lean();
      if (!mods.length) return { aviso: 'Nenhum módulo de manual publicado ainda. Para "ensinar" o agente, publique módulos na aba Ajuda/Manual.', modulos: [] };
      const flatten = (m) => {
        const parts = [];
        (m.blocks || []).forEach((b) => {
          if ((b.type === 'intro' || b.type === 'callout') && b.content) parts.push(b.content);
          else if (b.type === 'steps') (b.steps || []).forEach((s) => parts.push(`Passo ${s.n} (${s.who}): ${s.title} — ${s.desc}`));
          else if (b.type === 'image' && b.caption) parts.push(`[imagem] ${b.caption}`);
        });
        return parts.join('\n');
      };
      const modulosDisponiveis = mods.map((m) => m.label);
      const q = (query || '').trim();
      if (!q) return { modulosDisponiveis, conteudo: mods.slice(0, 6).map((m) => ({ modulo: m.label, texto: trunc(flatten(m), 2500) })) };
      const rx = new RegExp(escapeRegex(q), 'i');
      const hits = mods.filter((m) => rx.test(m.label) || rx.test(flatten(m)));
      if (!hits.length) return { modulosDisponiveis, conteudo: [], aviso: `Nada encontrado para "${q}". Veja os módulos disponíveis e tente outro termo.` };
      return { modulosDisponiveis, conteudo: hits.slice(0, 6).map((m) => ({ modulo: m.label, texto: trunc(flatten(m), 2500) })) };
    }
  }),

  // ── Manual do Operador (runbook interno do dono — cobrança/Mercado Pago) ──────
  getManualOperador: tool({
    description: 'Manual do OPERADOR (runbook interno do dono): como a COBRANÇA da plataforma com o Mercado Pago funciona — assinatura/PreApproval, CardForm, webhooks, flags/variáveis de ambiente, troca de plano, cancelamento, reembolso (CDC 7 dias), estorno/chargeback, cortesia, carência, conciliação de MRR. Consulte SEMPRE antes de explicar qualquer fluxo de billing/cobrança; não invente. É DIFERENTE de searchManual (aquele é o manual do fotógrafo). Sem "section" = lista as seções disponíveis.',
    inputSchema: z.object({ section: z.string().optional().describe('slug ou termo da seção (ex.: "mercado-pago"); vazio = lista as seções') }),
    execute: async ({ section }) => {
      const sections = manualOperador.listSections();
      if (!sections.length) return { aviso: 'Nenhuma seção do Manual do Operador cadastrada.', secoes: [] };
      const secoesDisponiveis = sections.map((s) => ({ slug: s.slug, titulo: s.title }));
      const q = (section || '').trim();
      if (!q) return { secoesDisponiveis, aviso: 'Informe "section" (slug) para ler o conteúdo de uma seção.' };
      // casa por slug exato; senão por termo no título
      const rx = new RegExp(escapeRegex(q), 'i');
      const match = sections.find((s) => s.slug === q) || sections.find((s) => rx.test(s.title) || rx.test(s.slug));
      if (!match) return { secoesDisponiveis, conteudo: null, aviso: `Seção "${q}" não encontrada. Veja as seções disponíveis.` };
      const data = await manualOperador.getSection(match.slug);
      const full = data?.markdown || '';
      const LIMIT = 6000;
      return {
        secoesDisponiveis,
        secao: match.title,
        slug: match.slug,
        conteudo: trunc(full, LIMIT),
        truncado: full.length > LIMIT ? `Conteúdo cortado em ${LIMIT} caracteres; peça uma subseção específica se precisar de mais.` : undefined,
      };
    }
  })
};

module.exports = { tools };
