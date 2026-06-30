const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const { canAccessRoute, gateForRoute } = require('../services/gestaoCapabilities');
const { capabilitiesOf } = require('../services/subscriptionPricing');

// Base do ERP Rhyno (frontend, p/ o iframe). POC: local; prod: https://erp.cliquezoom.com.br
const RHYNO_BASE = process.env.RHYNO_BASE_URL || 'http://localhost:5173';
// API do ERP Rhyno (backend) para chamadas servidor-a-servidor.
const RHYNO_API = process.env.RHYNO_API_URL || 'http://localhost:8000';

// Resolve o email do usuário Rhyno do fotógrafo logado.
// FAIL-CLOSED: sem `rhynoUserEmail` próprio retorna null — NUNCA cai num e-mail
// compartilhado (era a causa do vazamento de tenant corrigido em 2026-06-19). A org
// é provisionada no cadastro (src/utils/rhynoProvision.js); enquanto não estiver,
// a Gestão responde 409 "não provisionada" e o front mostra estado neutro.
async function resolveRhynoEmail(req) {
  const org = await Organization.findById(req.user.organizationId)
    .select('rhynoUserEmail')
    .lean();
  return (org && org.rhynoUserEmail) || null;
}

// Cunha uma asserção curta assinada com o segredo compartilhado (SSO).
// `caps` (capabilities efetivas do plano) viaja na asserção para a CAMADA (b): o Rhyno
// lê e barra a ESCRITA de módulo fora do plano (parede no Salvar). Opcional e INERTE até
// o Rhyno consumir — uma asserção sem caps mantém o comportamento atual (fail-open).
function mintAssertion(email, caps) {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) throw new Error('SSO_SHARED_SECRET não configurado');
  const payload = { email, iss: 'cliquezoom' };
  if (caps) payload.caps = caps;
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '120s',
  });
}

// Erro tipado para org sem tenant Rhyno — vira HTTP 409 nas rotas.
class NotProvisionedError extends Error {
  constructor() { super('Gestão ainda não provisionada'); this.code = 'NOT_PROVISIONED'; }
}

// Troca a asserção por um token Rhyno (login servidor-a-servidor) p/ chamar a API do ERP.
async function getRhynoToken(req) {
  const email = await resolveRhynoEmail(req);
  if (!email) throw new NotProvisionedError();
  const assertion = mintAssertion(email);
  const resp = await fetch(`${RHYNO_API}/auth/sso-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assertion }),
  });
  if (!resp.ok) throw new Error(`SSO Rhyno falhou (${resp.status})`);
  const data = await resp.json();
  return data.access_token;
}

// GET /api/gestao/sso-url — URL de SSO para o iframe do ERP (login único, sem tela de login).
router.get('/gestao/sso-url', authenticateToken, async (req, res) => {
  try {
    if (!process.env.SSO_SHARED_SECRET) {
      return res.status(503).json({ success: false, error: 'SSO não configurado' });
    }
    const email = await resolveRhynoEmail(req);
    if (!email) {
      return res.status(409).json({
        success: false, code: 'NOT_PROVISIONED',
        error: 'Gestão ainda não provisionada',
      });
    }
    const redirect =
      typeof req.query.redirect === 'string' ? req.query.redirect : '/dashboard';

    // CERCA (camada a): não cunha SSO para um módulo que o plano não inclui.
    // `can()` trata sub nulo como Free; rota base ('/dashboard' etc.) sempre passa.
    const sub = await Subscription.findOne({ organizationId: req.user.organizationId }).lean();
    // Caps efetivos do plano — viajam na asserção p/ a camada (b) do Rhyno (parede no Salvar).
    const caps = capabilitiesOf(sub);
    if (!canAccessRoute(sub, redirect)) {
      const rule = gateForRoute(redirect);

      // PRÉVIA (teaser): módulos marcados `preview` NÃO são barrados — cunha-se o SSO e
      // devolve-se preview:true. O front carrega o módulo REAL (dados do fotógrafo) porém
      // NÃO-INTERATIVO + faixa de upgrade (gera desejo no ponto de intenção). A trava de
      // clique é client-side; a defesa dura (sem-escrita) é a camada (b) no Rhyno.
      // Ver skills/mapa-cercas-gestao-rhyno-2026-06-30.md.
      if (rule.preview) {
        req.logger?.info?.('Gestão: prévia (teaser) de módulo fora do plano', {
          organizationId: req.user.organizationId,
          plan: sub?.plan || 'free',
          redirect,
          capability: rule.cap,
          requiredPlan: rule.plan,
        });
        const assertion = mintAssertion(email, caps);
        const url =
          `${RHYNO_BASE}/sso?assertion=${encodeURIComponent(assertion)}` +
          `&embed=1&redirect=${encodeURIComponent(redirect)}`;
        return res.json({
          success: true,
          url,
          preview: true,
          capability: rule.cap,
          requiredPlan: rule.plan,
        });
      }

      // Bloqueio duro (demais módulos): 403 → upgrade.
      // Telemetria de cerca: flagra org real batendo no gate (útil pós-deploy p/ detectar
      // fotógrafo vivo em tier inferior que usava o módulo). Não muda o comportamento.
      req.logger?.warn?.('Gestão: cerca de plano bloqueou SSO', {
        organizationId: req.user.organizationId,
        plan: sub?.plan || 'free',
        redirect,
        capability: rule.cap,
        requiredPlan: rule.plan,
      });
      return res.status(403).json({
        success: false,
        upgrade: true,
        capability: rule.cap,
        requiredPlan: rule.plan,
        error: `Este módulo da Gestão faz parte do plano ${rule.plan} ou superior.`,
      });
    }

    const assertion = mintAssertion(email, caps);
    const url =
      `${RHYNO_BASE}/sso?assertion=${encodeURIComponent(assertion)}` +
      `&embed=1&redirect=${encodeURIComponent(redirect)}`;
    res.json({ success: true, url });
  } catch (err) {
    req.logger?.error?.('Erro ao gerar URL de SSO do Rhyno', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao gerar SSO' });
  }
});

// GET /api/gestao/customers?search= — busca clientes no Rhyno (CRM principal).
// Retorna no MESMO formato do /clients/search legado p/ o seletor de sessão reaproveitar.
// O id vem prefixado com "rhyno:" para distinguir de um Client do Mongo (ObjectId).
router.get('/gestao/customers', authenticateToken, async (req, res) => {
  try {
    const token = await getRhynoToken(req);
    const search = (req.query.search || req.query.q || '').toString().trim();
    const qs = new URLSearchParams({ limit: '10', profile: 'customer' });
    if (search) qs.set('search', search);

    const resp = await fetch(`${RHYNO_API}/customers/?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Rhyno /customers falhou (${resp.status})`);

    const data = await resp.json();
    const clients = (data.items || []).map((c) => ({
      _id: `rhyno:${c.id}`,
      name: c.name,
      email: c.email || '',
      phone: c.phone || c.cellphone || '',
    }));
    res.json({ success: true, clients });
  } catch (err) {
    if (err.code === 'NOT_PROVISIONED') {
      return res.status(409).json({ success: false, code: 'NOT_PROVISIONED', error: err.message, clients: [] });
    }
    req.logger?.error?.('Erro ao buscar clientes no Rhyno', { error: err.message });
    res.status(502).json({ success: false, error: 'Erro ao buscar clientes no Rhyno', clients: [] });
  }
});

// POST /api/gestao/customers — cria um cliente no Rhyno (CRM principal).
// O Rhyno exige name + document (CPF/CNPJ válido) + person_type.
router.post('/gestao/customers', authenticateToken, async (req, res) => {
  try {
    const token = await getRhynoToken(req);
    const { name, email, phone, cpf, document, person_type } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
    }
    const doc = String(document || cpf || '').replace(/\D/g, '');
    if (!doc) {
      return res.status(400).json({ success: false, error: 'CPF/CNPJ é obrigatório para cadastrar no Rhyno' });
    }
    const ptype = person_type || (doc.length > 11 ? 'juridica' : 'fisica');

    const body = {
      name: String(name).trim(),
      document: doc,
      person_type: ptype,
      is_customer: true,
      email: email || null,
      cellphone: phone || null,
    };

    const resp = await fetch(`${RHYNO_API}/customers/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      // Rhyno: 400/422 (doc inválido/duplicado/incompleto) e às vezes 500 no validador
      // de documento. Na criação, a causa quase sempre é o CPF/CNPJ — mensagem acionável.
      let detail = typeof data.detail === 'string' ? data.detail : '';
      if (!detail || /interno do servidor/i.test(detail)) {
        detail = 'Não foi possível cadastrar. Verifique o CPF/CNPJ (precisa ser válido e ainda não cadastrado).';
      }
      return res.status(400).json({ success: false, error: detail });
    }

    res.json({
      success: true,
      client: {
        _id: `rhyno:${data.id}`,
        name: data.name,
        email: data.email || '',
        phone: data.phone || data.cellphone || '',
      },
    });
  } catch (err) {
    if (err.code === 'NOT_PROVISIONED') {
      return res.status(409).json({ success: false, code: 'NOT_PROVISIONED', error: err.message });
    }
    req.logger?.error?.('Erro ao criar cliente no Rhyno', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao criar cliente no Rhyno' });
  }
});

module.exports = router;
