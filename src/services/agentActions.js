// Ações de ESCRITA do agente do SaaS Admin — padrão "propor → confirmar → executar".
//
// Princípio de segurança: a LLM NUNCA executa uma escrita. As "propose tools"
// são read-only: validam e devolvem um DESCRITOR da ação (preview antes→depois).
// O front mostra um cartão de confirmação; só quando o SUPERADMIN clica "Confirmar"
// o front chama o endpoint de execução, que RE-VALIDA tudo no servidor e só então
// muta o banco (reaproveitando a mesma lógica dos endpoints superadmin existentes)
// e grava no AuditLog. Allowlist explícita de tipos; nada destrutivo neste corte.
const { tool } = require('ai');
const { z } = require('zod');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const Organization = require('../models/Organization');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { audit } = require('../utils/auditLogger');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PLAN_LIMITS_PATH = path.join(__dirname, '../../config/planLimits.json');

// Espelha loadPlanLimits() de saasAdmin.js (mesmo arquivo + mesmo fallback) para
// manter os limites da Subscription idênticos aos da troca de plano manual.
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

// Resolve org (slug, _id ou nome aproximado) → snapshot leve para montar a proposta.
async function resolveOrgLean(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const fields = 'name slug plan isActive deletedAt';
  if (mongoose.Types.ObjectId.isValid(s)) {
    const byId = await Organization.findById(s).select(fields).lean();
    if (byId) return byId;
  }
  const bySlug = await Organization.findOne({ slug: s.toLowerCase() }).select(fields).lean();
  if (bySlug) return bySlug;
  return Organization.findOne({ name: { $regex: escapeRegex(s), $options: 'i' }, deletedAt: null }).select(fields).lean();
}

// ── Registry de ações (allowlist) ───────────────────────────────────────────
// Cada ação: validateParams (opcional, sanitiza/valida), build (preview, read-only),
// exec (mutação real + auditoria). build/exec recebem o doc da org.
const ACTIONS = {
  approve_org: {
    build(org) {
      if (org.isActive) return { noop: true, message: `A organização "${org.name}" já está ativa.` };
      return {
        summary: `Aprovar e ativar a organização "${org.name}" e marcar os usuários dela como aprovados.`,
        before: { isActive: false }, after: { isActive: true }
      };
    },
    async exec(req, org) {
      org.isActive = true;
      await org.save();
      await User.updateMany({ organizationId: org._id }, { approved: true });
      audit(req, 'org_approve', org._id, { via: 'agente' });
      return `Organização "${org.name}" aprovada e ativada.`;
    }
  },

  change_plan: {
    validateParams(params) {
      const plan = String(params?.plan || '').toLowerCase();
      if (!['free', 'basic', 'pro'].includes(plan)) return { error: 'Plano inválido (use free, basic ou pro).' };
      return { plan };
    },
    build(org, { plan }) {
      if (org.plan === plan) return { noop: true, message: `A organização "${org.name}" já está no plano ${plan}.` };
      return {
        summary: `Mudar o plano de "${org.name}" de ${org.plan} para ${plan} (ajusta os limites da assinatura).`,
        before: { plan: org.plan }, after: { plan }
      };
    },
    async exec(req, org, { plan }) {
      const planLimits = await loadPlanLimits();
      await Organization.findByIdAndUpdate(org._id, { plan });
      await Subscription.findOneAndUpdate({ organizationId: org._id }, { plan, limits: planLimits[plan] });
      audit(req, 'plan_change', org._id, { plan, via: 'agente' });
      return `Plano de "${org.name}" alterado para ${plan}.`;
    }
  }
};

// Monta a proposta (read-only) a partir de um input de org + params já validados.
async function buildProposal(type, orgInput, rawParams) {
  const def = ACTIONS[type];
  if (!def) return { error: 'Ação não suportada.' };
  const org = await resolveOrgLean(orgInput);
  if (!org || org.deletedAt) return { error: `Org não encontrada: "${orgInput}"` };

  let params = rawParams || {};
  if (def.validateParams) {
    const v = def.validateParams(params);
    if (v.error) return { error: v.error };
    params = v;
  }
  const built = def.build(org, params);
  if (built.noop) return { noop: true, message: built.message };

  return {
    status: 'aguardando_confirmacao', // sinaliza à LLM que NADA foi executado ainda
    proposal: {
      type, orgId: String(org._id), orgName: org.name, slug: org.slug, params,
      summary: built.summary, before: built.before, after: built.after
    }
  };
}

// ── Propose tools (entram no chat só quando a IA precisa propor) ─────────────
const proposeTools = {
  proposeApproveOrg: tool({
    description: 'PROPÕE aprovar/ativar uma organização. NÃO executa — devolve uma proposta que aparece como cartão de confirmação para o superadmin clicar "Confirmar". Use apenas quando o usuário pedir explicitamente para aprovar/ativar uma org.',
    inputSchema: z.object({ org: z.string().describe('slug, id ou nome da org') }),
    execute: async ({ org }) => buildProposal('approve_org', org, {})
  }),
  proposeChangePlan: tool({
    description: 'PROPÕE alterar o plano de uma org (free/basic/pro). NÃO executa — devolve proposta para o superadmin confirmar. Use apenas quando o usuário pedir explicitamente para mudar/subir/baixar o plano de uma org.',
    inputSchema: z.object({ org: z.string().describe('slug, id ou nome da org'), plan: z.enum(['free', 'basic', 'pro']) }),
    execute: async ({ org, plan }) => buildProposal('change_plan', org, { plan })
  })
};

// ── Executor (chamado pelo endpoint, NUNCA pela LLM) ─────────────────────────
// Re-valida tudo no servidor: nunca confia no before/after vindos do cliente,
// só no { type, orgId, params } contra a allowlist.
async function executeAction(req, { type, orgId, params }) {
  const def = ACTIONS[type];
  if (!def) return { error: 'Ação não suportada.', status: 400 };
  if (!mongoose.Types.ObjectId.isValid(orgId)) return { error: 'orgId inválido.', status: 400 };
  const org = await Organization.findById(orgId);
  if (!org || org.deletedAt) return { error: 'Organização não encontrada.', status: 404 };

  let p = params || {};
  if (def.validateParams) {
    const v = def.validateParams(p);
    if (v.error) return { error: v.error, status: 400 };
    p = v;
  }
  // Re-checa no-op (estado pode ter mudado desde a proposta).
  const built = def.build(org, p);
  if (built.noop) return { message: built.message, noChange: true };

  const message = await def.exec(req, org, p);
  return { message };
}

module.exports = { proposeTools, executeAction };
