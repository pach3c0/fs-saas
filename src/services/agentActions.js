// Ações de ESCRITA do agente do SaaS Admin — padrão "propor → confirmar → executar".
//
// Princípio de segurança: a LLM NUNCA executa uma escrita. As "propose tools"
// são read-only: validam e devolvem um DESCRITOR da ação (preview antes→depois)
// com identificadores estáveis em `params`. O front mostra um cartão de confirmação;
// só quando o SUPERADMIN clica "Confirmar" o front chama o endpoint de execução,
// que RE-VALIDA tudo no servidor (nunca confia no preview do cliente — só em
// { type, params } contra a allowlist), re-carrega o alvo, muta o banco
// reaproveitando a lógica dos endpoints existentes e grava no AuditLog.
const { tool } = require('ai');
const { z } = require('zod');
const path = require('path');
const fs = require('fs');

const Organization = require('../models/Organization');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Ticket = require('../models/Ticket');
const ManualModule = require('../models/ManualModule');
const Notification = require('../models/Notification');
const { audit } = require('../utils/auditLogger');
const { sendTicketReplyEmail } = require('../utils/email');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isOid = (s) => /^[a-f0-9]{24}$/i.test(String(s || ''));
const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const PLAN_LIMITS_PATH = path.join(__dirname, '../../config/planLimits.json');

// Espelha loadPlanLimits() de saasAdmin.js (mesmo arquivo + fallback).
async function loadPlanLimits() {
  try {
    return JSON.parse(await fs.promises.readFile(PLAN_LIMITS_PATH, 'utf8'));
  } catch {
    return {
      free:  { maxSessions: 5,   maxPhotos: 100,  maxAlbums: 1,  maxStorage: 500,   customDomain: false },
      basic: { maxSessions: 50,  maxPhotos: 5000, maxAlbums: 10, maxStorage: 10000, customDomain: false },
      pro:   { maxSessions: -1,  maxPhotos: -1,   maxAlbums: -1, maxStorage: 50000, customDomain: true  }
    };
  }
}

async function resolveOrgLean(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const fields = 'name slug plan isActive deletedAt';
  if (isOid(s)) {
    const byId = await Organization.findById(s).select(fields).lean();
    if (byId) return byId;
  }
  const bySlug = await Organization.findOne({ slug: s.toLowerCase() }).select(fields).lean();
  if (bySlug) return bySlug;
  return Organization.findOne({ name: { $regex: escapeRegex(s), $options: 'i' }, deletedAt: null }).select(fields).lean();
}

// Normaliza/valida os blocos de um módulo de manual vindos da LLM (defensivo).
function sanitizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((b) => {
    if (!b || !['intro', 'callout', 'steps'].includes(b.type)) return null;
    if (b.type === 'steps') {
      const steps = (Array.isArray(b.steps) ? b.steps : [])
        .filter((s) => s && s.title && s.desc)
        .map((s, i) => ({
          n: Number.isFinite(s.n) ? s.n : i + 1,
          who: String(s.who || 'fotógrafo').slice(0, 30),
          color: 'accent',
          title: String(s.title).slice(0, 200),
          desc: String(s.desc).slice(0, 1000)
        }));
      return steps.length ? { type: 'steps', steps } : null;
    }
    const content = String(b.content || '').trim();
    if (!content) return null;
    const blk = { type: b.type, content: content.slice(0, 4000) };
    if (b.type === 'callout') blk.color = ['accent', 'green', 'yellow', 'red'].includes(b.color) ? b.color : 'accent';
    return blk;
  }).filter(Boolean).slice(0, 30);
}

// ── Registry de ações (allowlist) ───────────────────────────────────────────
// prepare(input): valida a entrada humana da propose tool → { params, target } | { error }
// load(params):   recarrega o alvo a partir dos params estáveis (no execute) → { target } | { error }
// build(target, params): preview read-only → { summary, before?, after? } | { noop, message }
// exec(req, target, params): mutação real + auditoria → string (mensagem de sucesso)
const ACTIONS = {
  approve_org: {
    inputSchema: z.object({ org: z.string().describe('slug, id ou nome da org') }),
    async prepare({ org }) {
      const o = await resolveOrgLean(org);
      if (!o || o.deletedAt) return { error: `Org não encontrada: "${org}"` };
      return { params: { orgId: String(o._id) }, target: o };
    },
    async load({ orgId }) {
      if (!isOid(orgId)) return { error: 'orgId inválido.' };
      const o = await Organization.findById(orgId);
      if (!o || o.deletedAt) return { error: 'Organização não encontrada.' };
      return { target: o };
    },
    build(o) {
      if (o.isActive) return { noop: true, message: `A organização "${o.name}" já está ativa.` };
      return { summary: `Aprovar e ativar a organização "${o.name}" e marcar os usuários dela como aprovados.`, before: { isActive: false }, after: { isActive: true } };
    },
    async exec(req, o) {
      o.isActive = true;
      await o.save();
      await User.updateMany({ organizationId: o._id }, { approved: true });
      audit(req, 'org_approve', o._id, { via: 'agente' });
      return `Organização "${o.name}" aprovada e ativada.`;
    }
  },

  change_plan: {
    inputSchema: z.object({ org: z.string().describe('slug, id ou nome da org'), plan: z.enum(['free', 'basic', 'pro']) }),
    async prepare({ org, plan }) {
      const o = await resolveOrgLean(org);
      if (!o || o.deletedAt) return { error: `Org não encontrada: "${org}"` };
      return { params: { orgId: String(o._id), plan }, target: o };
    },
    validateExecParams({ plan }) {
      if (!['free', 'basic', 'pro'].includes(plan)) return { error: 'Plano inválido (use free, basic ou pro).' };
      return {};
    },
    async load({ orgId }) {
      if (!isOid(orgId)) return { error: 'orgId inválido.' };
      const o = await Organization.findById(orgId);
      if (!o || o.deletedAt) return { error: 'Organização não encontrada.' };
      return { target: o };
    },
    build(o, { plan }) {
      if (o.plan === plan) return { noop: true, message: `A organização "${o.name}" já está no plano ${plan}.` };
      return { summary: `Mudar o plano de "${o.name}" de ${o.plan} para ${plan} (ajusta os limites da assinatura).`, before: { plan: o.plan }, after: { plan } };
    },
    async exec(req, o, { plan }) {
      const planLimits = await loadPlanLimits();
      await Organization.findByIdAndUpdate(o._id, { plan });
      await Subscription.findOneAndUpdate({ organizationId: o._id }, { plan, limits: planLimits[plan] });
      audit(req, 'plan_change', o._id, { plan, via: 'agente' });
      return `Plano de "${o.name}" alterado para ${plan}.`;
    }
  },

  reply_ticket: {
    inputSchema: z.object({
      ticketId: z.string().describe('id do chamado (vem do getTickets)'),
      text: z.string().describe('texto da resposta que será enviada ao fotógrafo')
    }),
    async prepare({ ticketId, text }) {
      if (!isOid(ticketId)) return { error: 'ticketId inválido.' };
      const msg = String(text || '').trim();
      if (!msg) return { error: 'Texto da resposta vazio.' };
      const t = await Ticket.findById(ticketId).populate('organizationId', 'name slug').lean();
      if (!t) return { error: 'Chamado não encontrado.' };
      return { params: { ticketId: String(t._id), text: msg }, target: t };
    },
    validateExecParams({ text }) {
      const msg = String(text || '').trim();
      if (!msg) return { error: 'Texto da resposta vazio.' };
      return { text: msg };
    },
    async load({ ticketId }) {
      if (!isOid(ticketId)) return { error: 'ticketId inválido.' };
      const t = await Ticket.findById(ticketId);
      if (!t) return { error: 'Chamado não encontrado.' };
      return { target: t };
    },
    build(t, { text }) {
      const orgName = t.organizationId?.name || 'fotógrafo';
      return { summary: `Responder o chamado "${t.subject}" (${orgName}) e notificar o fotógrafo por e-mail. O chamado fica como "aguardando o fotógrafo".`, after: { resposta: text } };
    },
    async exec(req, t, { text }) {
      const user = await User.findOne({ organizationId: t.organizationId }).lean();
      t.messages.push({ from: 'admin', text: text.trim(), at: new Date() });
      t.status = 'pending';
      await t.save();
      await Notification.create({ type: 'ticket_reply', message: `Nova resposta no chamado: ${t.subject}`, organizationId: t.organizationId });
      if (user?.email) {
        try { await sendTicketReplyEmail(user.email, user.name, t.subject, text.trim()); }
        catch (e) { req.logger?.error('Agente: falha ao enviar e-mail de resposta', { error: e.message }); }
      }
      audit(req, 'ticket_reply', t.organizationId, { ticketId: String(t._id), via: 'agente' });
      return `Resposta enviada no chamado "${t.subject}". O fotógrafo foi notificado.`;
    }
  },

  create_manual_module: {
    inputSchema: z.object({
      id: z.string().describe('slug curto e único, ex.: "dashboard"'),
      label: z.string().describe('título do módulo, ex.: "Dashboard"'),
      blocks: z.array(z.object({
        type: z.enum(['intro', 'callout', 'steps']),
        content: z.string().optional().describe('texto (intro/callout)'),
        color: z.enum(['accent', 'green', 'yellow', 'red']).optional().describe('cor do callout'),
        steps: z.array(z.object({
          n: z.number().int(), who: z.string().optional().describe('fotógrafo | cliente | sistema'),
          title: z.string(), desc: z.string()
        })).optional()
      })).describe('blocos do módulo, na ordem')
    }),
    async prepare({ id, label, blocks }) {
      const slug = slugify(id);
      if (!slug) return { error: 'id (slug) inválido.' };
      if (await ManualModule.findOne({ id: slug }).lean()) return { error: `Já existe um módulo com id "${slug}".` };
      const clean = sanitizeBlocks(blocks);
      if (!clean.length) return { error: 'Inclua ao menos um bloco de conteúdo válido.' };
      return { params: { id: slug, label: String(label).slice(0, 80), blocks: clean }, target: { isNew: true } };
    },
    validateExecParams({ id, label, blocks }) {
      const slug = slugify(id);
      if (!slug) return { error: 'id (slug) inválido.' };
      const clean = sanitizeBlocks(blocks);
      if (!clean.length) return { error: 'Sem blocos válidos.' };
      return { id: slug, label: String(label || slug).slice(0, 80), blocks: clean };
    },
    async load() { return { target: { isNew: true } }; }, // criação: nada a recarregar
    build(_t, { id, label, blocks }) {
      const nSteps = (blocks || []).reduce((a, b) => a + (b.steps?.length || 0), 0);
      return { summary: `Criar o módulo de manual "${label}" (id: ${id}) com ${blocks.length} bloco(s) e ${nSteps} passo(s). Fica como RASCUNHO (não publicado) para você revisar e publicar em Ajuda & Treinamentos.`, after: { id, label, blocos: blocks.length } };
    },
    async exec(req, _t, { id, label, blocks }) {
      if (await ManualModule.findOne({ id }).lean()) return `Já existe um módulo com id "${id}".`;
      const last = await ManualModule.findOne().sort({ order: -1 }).select('order').lean();
      await ManualModule.create({ id, label, order: (last?.order || 0) + 1, isPublished: false, blocks });
      audit(req, 'manual_create', null, { id, via: 'agente' });
      return `Módulo "${label}" criado como rascunho. Revise e publique em Ajuda & Treinamentos.`;
    }
  }
};

// Monta a proposta (read-only) a partir da entrada da propose tool.
async function buildProposal(type, input) {
  const def = ACTIONS[type];
  if (!def) return { error: 'Ação não suportada.' };
  const prep = await def.prepare(input);
  if (prep.error) return { error: prep.error };
  const built = def.build(prep.target, prep.params);
  if (built.noop) return { noop: true, message: built.message };
  return {
    status: 'aguardando_confirmacao',
    proposal: { type, params: prep.params, summary: built.summary, before: built.before, after: built.after }
  };
}

// ── Propose tools (entram no chat; só PROPÕEM, nunca executam) ───────────────
const proposeTools = {
  proposeApproveOrg: tool({
    description: 'PROPÕE aprovar/ativar uma organização. NÃO executa — devolve uma proposta para o superadmin confirmar. Use só quando pedirem explicitamente para aprovar/ativar uma org.',
    inputSchema: ACTIONS.approve_org.inputSchema,
    execute: (input) => buildProposal('approve_org', input)
  }),
  proposeChangePlan: tool({
    description: 'PROPÕE alterar o plano de uma org (free/basic/pro). NÃO executa — devolve proposta para confirmar. Use só quando pedirem para mudar o plano.',
    inputSchema: ACTIONS.change_plan.inputSchema,
    execute: (input) => buildProposal('change_plan', input)
  }),
  proposeReplyTicket: tool({
    description: 'PROPÕE responder um chamado de suporte (adiciona a resposta do admin + notifica o fotógrafo por e-mail). NÃO envia — devolve o RASCUNHO para o superadmin confirmar. Pegue o ticketId via getTickets. Use quando pedirem para responder/avisar o fotógrafo de um chamado.',
    inputSchema: ACTIONS.reply_ticket.inputSchema,
    execute: (input) => buildProposal('reply_ticket', input)
  }),
  proposeCreateManualModule: tool({
    description: 'PROPÕE criar um módulo no Manual/Ajuda (fica como rascunho não publicado). NÃO publica — devolve para o superadmin confirmar. Use quando pedirem para criar/escrever um manual de uma parte da plataforma. Estruture em blocos: intro (texto), callout (destaque colorido) e steps (passo-a-passo com título e descrição).',
    inputSchema: ACTIONS.create_manual_module.inputSchema,
    execute: (input) => buildProposal('create_manual_module', input)
  })
};

// ── Executor (chamado pelo endpoint, NUNCA pela LLM) ─────────────────────────
async function executeAction(req, { type, params }) {
  const def = ACTIONS[type];
  if (!def) return { error: 'Ação não suportada.', status: 400 };
  let p = params || {};
  if (def.validateExecParams) {
    const v = def.validateExecParams(p);
    if (v.error) return { error: v.error, status: 400 };
    p = { ...p, ...v };
  }
  const loaded = await def.load(p);
  if (loaded.error) return { error: loaded.error, status: 400 };
  const built = def.build(loaded.target, p);
  if (built.noop) return { message: built.message, noChange: true };
  const message = await def.exec(req, loaded.target, p);
  return { message };
}

module.exports = { proposeTools, executeAction };
