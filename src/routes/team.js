// Gestão de usuários da equipe (assentos) — o CliqueZoom é a FONTE DA VERDADE dos
// assentos (models/plans.js: Free 1 / Basic 1 / Pro 2 / Studio 3). Ao adicionar um
// membro: grava o User no Mongo (autoritativo) E espelha no Rhyno (cordão umbilical),
// reusando o mesmo SSO servidor-a-servidor do POST /gestao/customers. A cerca de
// assentos é enforçada AQUI (403 upgrade) — o token do espelho não carrega `cz_seats`,
// então a cerca do Rhyno fica dormente (sem duplo-enforcement). Ver plano aprovado
// e src/utils/rhynoClient.js. Fase 1: o membro NÃO loga no CliqueZoom.
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const { seatsOf } = require('../services/subscriptionPricing');
const { RHYNO_API, getRhynoToken } = require('../utils/rhynoClient');
const { sendTeamInviteEmail } = require('../utils/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Guarda de dono: só admin/superadmin da própria org gerencia a equipe. Em Fase 1 só o
// dono (admin) existe; deixa a porta pronta p/ negar membros ('member') na Fase 2.
function requireOwner(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return next();
  return res.status(403).json({ success: false, error: 'Apenas o titular da conta gerencia a equipe.' });
}

// Plano que libera mais um assento (espelha a regra do Rhyno users.py:89).
function requiredPlanForSeats(limit) {
  return (limit <= 1) ? 'Pro' : 'Studio';
}

// Conta assentos usados = usuários ATIVOS (approved) da org, incluindo o dono.
async function seatUsage(organizationId) {
  const sub = await Subscription.findOne({ organizationId }).lean();
  const limit = seatsOf(sub); // -1 = ilimitado
  const used = await User.countDocuments({ organizationId, approved: true });
  return { used, limit };
}

// Resolve o `role_id` do cargo do membro espelhado no tenant do fotógrafo.
// Preferência: 'sales' (menor privilégio, mesmo default do /auth/register do Rhyno) →
// 'manager' → 1º não-admin → 'admin'. IDs variam por tenant, então resolvemos por SLUG.
function pickRoleId(roles) {
  const bySlug = (slug) => roles.find((r) => r.slug === slug);
  const chosen =
    bySlug('sales') ||
    bySlug('manager') ||
    roles.find((r) => r.slug !== 'admin') ||
    bySlug('admin') ||
    roles[0];
  return chosen ? chosen.id : null;
}

// Espelha o membro no Rhyno. Idempotente: e-mail já existente (unique por-tenant) é
// tratado como sucesso (acha o id e reativa se preciso). Lança em falha inesperada —
// o chamador captura e marca `pending` (nunca faz rollback do User autoritativo).
// Retorna `rhynoManaged`: true = o CZ CRIOU o usuário no Rhyno (pode gerenciar/destruir);
// false = AMARROU a um usuário pré-existente (co-dono/bolha) → NUNCA destruir.
async function mirrorMemberToRhyno(req, member) {
  const token = await getRhynoToken(req); // throws NotProvisionedError
  const auth = { Authorization: `Bearer ${token}` };

  // Resolve o cargo (Rhyno exige role_id por tenant).
  const rolesResp = await fetch(`${RHYNO_API}/roles/`, { headers: auth });
  if (!rolesResp.ok) throw new Error(`Rhyno /roles falhou (${rolesResp.status})`);
  const roles = await rolesResp.json();
  const roleId = pickRoleId(Array.isArray(roles) ? roles : []);

  const body = {
    name: member.name,
    email: member.email,
    // Senha aleatória descartada — o membro não loga no Rhyno na Fase 1 (só via SSO no futuro).
    password: crypto.randomBytes(32).toString('hex'),
    role_id: roleId,
    supervisor_ids: [],
  };

  const resp = await fetch(`${RHYNO_API}/users/`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (resp.ok) {
    // O CZ CRIOU o usuário no Rhyno → gerenciável (desativar/restaurar propagam).
    const data = await resp.json();
    return { rhynoUserId: data.id, rhynoUserEmail: (data.email || member.email).toLowerCase(), rhynoManaged: true };
  }

  // 400 "Email já cadastrado" (por-tenant): assume que já existe — acha o id e reativa.
  const data = await resp.json().catch(() => ({}));
  const detail = typeof data.detail === 'string' ? data.detail : '';
  if (resp.status === 400 && /j[aá] cadastrado/i.test(detail)) {
    const listResp = await fetch(`${RHYNO_API}/users/?include_inactive=true`, { headers: auth });
    if (listResp.ok) {
      const users = await listResp.json();
      const found = (Array.isArray(users) ? users : []).find(
        (u) => String(u.email || '').toLowerCase() === member.email
      );
      if (found) {
        if (found.is_active === false) {
          await fetch(`${RHYNO_API}/users/${found.id}/restore`, { method: 'PUT', headers: auth }).catch(() => {});
        }
        // AMARROU a um usuário pré-existente do tenant (ex.: co-dono admin da bolha FS):
        // rhynoManaged=false → o painel nunca vai destruí-lo (blindagem do kill-switch).
        return { rhynoUserId: found.id, rhynoUserEmail: (found.email || member.email).toLowerCase(), rhynoManaged: false };
      }
    }
  }

  throw new Error(`Rhyno POST /users falhou (${resp.status}): ${detail || 'sem detalhe'}`);
}

// Espelha a REATIVAÇÃO no Rhyno. Se o membro nunca foi espelhado (ex.: criado com o Rhyno
// fora do ar), cria agora; senão faz o restore. Lança em falha (inclui !resp.ok) p/ o
// chamador marcar 'error' e permitir retry — nunca engole silenciosamente.
async function mirrorRestoreToRhyno(req, member) {
  if (member.rhynoUserId == null) {
    const r = await mirrorMemberToRhyno(req, { name: member.name, email: member.email });
    member.rhynoUserId = r.rhynoUserId;
    member.rhynoUserEmail = r.rhynoUserEmail;
    member.rhynoManaged = r.rhynoManaged;
    return;
  }
  // BLINDAGEM: vínculo a usuário pré-existente (rhynoManaged !== true) nunca foi desativado
  // por nós no Rhyno — logo não há o que restaurar. A reativação é local do CZ (libera o
  // assento de volta); o acesso dele à Gestão nunca foi tocado.
  if (member.rhynoManaged !== true) return;
  const token = await getRhynoToken(req);
  const resp = await fetch(`${RHYNO_API}/users/${member.rhynoUserId}/restore`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Rhyno restore /users falhou (${resp.status})`);
}

// Espelha a DESATIVAÇÃO (soft-delete) no Rhyno. Sem vínculo = nada a fazer. Lança em falha
// (inclui !resp.ok) p/ o chamador marcar 'error' e permitir retry — o espelho de saída NÃO
// pode ser fire-and-forget (senão o membro vira fantasma ativo no Rhyno).
async function mirrorDeactivateToRhyno(req, member) {
  if (member.rhynoUserId == null) return;
  // BLINDAGEM DO KILL-SWITCH: só desativa no Rhyno o usuário que o CZ CRIOU. Um vínculo a
  // usuário pré-existente (rhynoManaged !== true — inclui o co-dono da bolha e registros
  // antigos sem o campo) NUNCA é destruído aqui: desativar no CZ apenas libera o assento,
  // e o acesso dele ao próprio ERP/Gestão fica intacto. Sem isto, "Desativar" trancaria o
  // dono fora do seu próprio Rhyno.
  if (member.rhynoManaged !== true) return;
  const token = await getRhynoToken(req);
  const resp = await fetch(`${RHYNO_API}/users/${member.rhynoUserId}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Rhyno DELETE /users falhou (${resp.status})`);
}

// GET /api/team — lista membros + uso de assentos (used/limit).
router.get('/team', authenticateToken, requireOwner, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const [org, users, seats] = await Promise.all([
      Organization.findById(organizationId).select('ownerId').lean(),
      User.find({ organizationId }).select('name email role approved rhynoSyncStatus').sort({ createdAt: 1 }).lean(),
      seatUsage(organizationId),
    ]);
    const ownerId = org && org.ownerId ? String(org.ownerId) : null;
    // Visão do fotógrafo: NÃO expõe o vínculo CZ↔Gestão (ele desconhece a divisão Rhyno).
    // O selo "Vínculo Gestão" e o rhynoManaged/rhynoUserId ficam só no endpoint do Super Admin.
    const members = users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      role: u.role,
      approved: u.approved,
      rhynoSyncStatus: u.rhynoSyncStatus || 'synced',
      isOwner: ownerId === String(u._id),
    }));
    res.json({ success: true, members, seats });
  } catch (err) {
    req.logger?.error?.('Erro ao listar equipe', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao carregar a equipe' });
  }
});

// POST /api/team — cria um membro (fonte da verdade no CZ) e espelha no Rhyno.
router.post('/team', authenticateToken, requireOwner, async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();

    if (!name) return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, error: 'E-mail inválido' });

    // CERCA DURA (antes de tudo): assento esgotado → 403 upgrade (interceptado em api.js).
    // Nota: checagem não-atômica (count→create). Dois adds concorrentes do próprio titular
    // podem furar o limite por 1 — aceitável na Fase 1 (só o dono autenticado dispara,
    // impacto limitado e visível no medidor); fix atômico (transação/contador) fica p/ depois.
    const { used, limit } = await seatUsage(organizationId);
    if (limit !== -1 && used >= limit) {
      return res.status(403).json({
        success: false,
        upgrade: true,
        capability: 'seats',
        requiredPlan: requiredPlanForSeats(limit),
        error: `Seu plano inclui ${limit} usuário(s). Faça upgrade para adicionar mais.`,
      });
    }

    // Unicidade GLOBAL no CZ (mais estrita que o Rhyno, que é por-tenant).
    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado.' });

    // Cria o User autoritativo. passwordHash aleatório: membro não loga no CZ na Fase 1.
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const member = await User.create({
      email, passwordHash, name,
      role: 'member',
      organizationId,
      approved: true,
      rhynoSyncStatus: 'pending',
    });

    // Espelha no Rhyno. Falha NÃO faz rollback: mantém o membro em 'pending' + retry pela UI.
    let warning = null;
    try {
      const { rhynoUserId, rhynoUserEmail, rhynoManaged } = await mirrorMemberToRhyno(req, { name, email });
      member.rhynoUserId = rhynoUserId;
      member.rhynoUserEmail = rhynoUserEmail;
      member.rhynoManaged = rhynoManaged;
      member.rhynoSyncStatus = 'synced';
      member.rhynoSyncError = null;
    } catch (err) {
      member.rhynoSyncStatus = err.code === 'NOT_PROVISIONED' ? 'pending' : 'error';
      member.rhynoSyncError = err.message;
      warning = 'sync_pending';
      req.logger?.warn?.('Membro criado no CZ mas espelho no Rhyno pendente', {
        organizationId: String(organizationId), email, error: err.message,
      });
    }
    await member.save();

    res.status(201).json({
      success: true,
      warning,
      member: {
        id: String(member._id), name: member.name, email: member.email,
        role: member.role, approved: member.approved, rhynoSyncStatus: member.rhynoSyncStatus, isOwner: false,
      },
    });
  } catch (err) {
    // Corrida de e-mail duplicado: o unique index dispara E11000 → 409 (não 500).
    if (err && err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Este e-mail já está cadastrado.' });
    }
    req.logger?.error?.('Erro ao criar membro da equipe', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao adicionar membro' });
  }
});

// Carrega um membro da própria org (nunca de outra) — 404 se não for da org.
async function loadOrgMember(req, res) {
  const member = await User.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
  if (!member) { res.status(404).json({ success: false, error: 'Membro não encontrado' }); return null; }
  return member;
}

// Não deixa mexer no próprio dono NEM em si mesmo. O self-check (req.user.userId ===
// member._id) é o cinto-e-suspensório: uma org legada com ownerId null cairia no lockout
// do titular sem ele. Espelha a trava do Rhyno users.py:178.
async function isOwnerUser(req, member) {
  if (String(member._id) === String(req.user.userId)) return true;
  const org = await Organization.findById(member.organizationId).select('ownerId').lean();
  return !!(org && org.ownerId && String(org.ownerId) === String(member._id));
}

// PUT /api/team/:id — ativa/desativa membro. Body: { approved:boolean }.
router.put('/team/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const member = await loadOrgMember(req, res);
    if (!member) return;
    if (await isOwnerUser(req, member)) {
      return res.status(400).json({ success: false, error: 'Não é possível desativar o titular da conta.' });
    }
    const approved = req.body.approved === true;

    if (approved && !member.approved) {
      // Reativar consome assento → revalida a cerca.
      const { used, limit } = await seatUsage(member.organizationId);
      if (limit !== -1 && used >= limit) {
        return res.status(403).json({
          success: false, upgrade: true, capability: 'seats',
          requiredPlan: requiredPlanForSeats(limit),
          error: `Seu plano inclui ${limit} usuário(s). Faça upgrade para reativar este usuário.`,
        });
      }
    }

    member.approved = approved;
    // Espelha o estado no Rhyno (restore/soft-delete). Falha NÃO reverte o CZ (fonte da
    // verdade): marca 'error'/'pending' + permite retry pela UI — nunca engole a falha.
    try {
      if (approved) await mirrorRestoreToRhyno(req, member);
      else await mirrorDeactivateToRhyno(req, member);
      member.rhynoSyncStatus = 'synced';
      member.rhynoSyncError = null;
    } catch (err) {
      member.rhynoSyncStatus = err.code === 'NOT_PROVISIONED' ? 'pending' : 'error';
      member.rhynoSyncError = err.message;
      req.logger?.warn?.('Falha ao espelhar ativar/desativar no Rhyno', {
        organizationId: String(member.organizationId), error: err.message,
      });
    }
    await member.save();

    res.json({ success: true, approved: member.approved, rhynoSyncStatus: member.rhynoSyncStatus });
  } catch (err) {
    req.logger?.error?.('Erro ao atualizar membro da equipe', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao atualizar membro' });
  }
});

// DELETE /api/team/:id — desativa (soft). Mesma semântica do PATCH approved:false.
router.delete('/team/:id', authenticateToken, requireOwner, async (req, res) => {
  try {
    const member = await loadOrgMember(req, res);
    if (!member) return;
    if (await isOwnerUser(req, member)) {
      return res.status(400).json({ success: false, error: 'Não é possível remover o titular da conta.' });
    }
    member.approved = false;
    // Espelho de saída NÃO pode ser fire-and-forget: falha marca 'error' + retry pela UI.
    try {
      await mirrorDeactivateToRhyno(req, member);
      member.rhynoSyncStatus = 'synced';
      member.rhynoSyncError = null;
    } catch (err) {
      member.rhynoSyncStatus = err.code === 'NOT_PROVISIONED' ? 'pending' : 'error';
      member.rhynoSyncError = err.message;
      req.logger?.warn?.('Falha ao espelhar desativação no Rhyno', {
        organizationId: String(member.organizationId), error: err.message,
      });
    }
    await member.save();
    res.json({ success: true, rhynoSyncStatus: member.rhynoSyncStatus });
  } catch (err) {
    req.logger?.error?.('Erro ao remover membro da equipe', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao remover membro' });
  }
});

// POST /api/team/:id/retry-sync — reprocessa o espelho de um membro pending/error (idempotente).
router.post('/team/:id/retry-sync', authenticateToken, requireOwner, async (req, res) => {
  try {
    const member = await loadOrgMember(req, res);
    if (!member) return;
    if (member.rhynoSyncStatus === 'synced') {
      return res.json({ success: true, rhynoSyncStatus: 'synced' });
    }
    try {
      // Reconcilia o ESTADO DESEJADO: ativo → cria/restaura; inativo → desativa. (Retry de
      // uma desativação que falhou não pode reativar o membro no Rhyno.)
      if (member.approved) await mirrorRestoreToRhyno(req, member);
      else await mirrorDeactivateToRhyno(req, member);
      member.rhynoSyncStatus = 'synced';
      member.rhynoSyncError = null;
      await member.save();
      return res.json({ success: true, rhynoSyncStatus: 'synced' });
    } catch (err) {
      member.rhynoSyncStatus = err.code === 'NOT_PROVISIONED' ? 'pending' : 'error';
      member.rhynoSyncError = err.message;
      await member.save();
      if (err.code === 'NOT_PROVISIONED') {
        return res.status(409).json({ success: false, code: 'NOT_PROVISIONED', error: 'Gestão ainda não provisionada. Tente novamente em instantes.' });
      }
      return res.status(502).json({ success: false, error: 'Não foi possível sincronizar com a Gestão agora.' });
    }
  } catch (err) {
    req.logger?.error?.('Erro no retry-sync do membro', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao sincronizar membro' });
  }
});

// POST /api/team/:id/invite — gera o link de definição de senha p/ o membro logar (Fase 2).
// Reusa o token de reset (purpose:'reset', consumido por /auth/reset-password) com validade
// de 48h e SINGLE-USE. Dispara o e-mail de convite (SUPRIMIDO no beta — email.js) E devolve `inviteUrl`
// p/ o dono copiar o link: funciona sem SMTP e é o caminho de teste no beta. Owner-only;
// nunca o próprio dono. Não altera o Rhyno (login do membro é só no CZ nesta fase).
router.post('/team/:id/invite', authenticateToken, requireOwner, async (req, res) => {
  try {
    const member = await loadOrgMember(req, res);
    if (!member) return;
    if (await isOwnerUser(req, member)) {
      return res.status(400).json({ success: false, error: 'O titular já tem acesso — não precisa de convite.' });
    }
    if (!member.approved) {
      return res.status(409).json({ success: false, error: 'Reative o usuário antes de enviar o acesso.' });
    }
    const secret = process.env.JWT_SECRET || 'fs-fotografias-secret-key';
    // SINGLE-USE: amarra o token ao hash de senha ATUAL do membro (pv). No 1º uso a senha
    // muda → o fingerprint deixa de bater e o link morre, não é replayável (fecha o MÉDIO da
    // revisão adversarial). Consumido/validado em /auth/reset-password. TTL 48h.
    const pv = crypto.createHash('sha256').update(String(member.passwordHash)).digest('hex').slice(0, 16);
    const token = jwt.sign({ userId: member._id, purpose: 'reset', pv }, secret, { expiresIn: '48h' });
    const baseUrl = process.env.BASE_URL || 'https://app.cliquezoom.com.br';
    const inviteUrl = `${baseUrl}/admin/?reset=${token}`;
    const org = await Organization.findById(member.organizationId).select('name').lean();
    sendTeamInviteEmail(member.email, member.name, inviteUrl, org && org.name).catch(() => {});
    req.logger?.info?.('Convite de equipe gerado', {
      organizationId: String(member.organizationId), email: member.email,
    });
    res.json({ success: true, inviteUrl });
  } catch (err) {
    req.logger?.error?.('Erro ao gerar convite de equipe', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao gerar o convite' });
  }
});

module.exports = router;
