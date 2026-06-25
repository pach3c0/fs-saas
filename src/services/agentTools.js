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
const PlatformLog = require('../models/PlatformLog');
const EmailLog = require('../models/EmailLog');
const AuditLog = require('../models/AuditLog');
const ActivityEvent = require('../models/ActivityEvent');
const Ticket = require('../models/Ticket');
const SchedulerRun = require('../models/SchedulerRun');

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
  })
};

module.exports = { tools };
