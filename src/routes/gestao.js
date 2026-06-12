const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const Organization = require('../models/Organization');

// Base do ERP Rhyno (frontend, p/ o iframe). POC: local; prod: https://erp.cliquezoom.com.br
const RHYNO_BASE = process.env.RHYNO_BASE_URL || 'http://localhost:5173';
// API do ERP Rhyno (backend) para chamadas servidor-a-servidor.
const RHYNO_API = process.env.RHYNO_API_URL || 'http://localhost:8000';

// Resolve o email do usuário Rhyno do fotógrafo logado.
// POC: campo opcional na org, com fallback p/ o usuário de teste. Futuro: provisionar por org.
async function resolveRhynoEmail(req) {
  const org = await Organization.findById(req.user.organizationId)
    .select('rhynoUserEmail')
    .lean();
  return (org && org.rhynoUserEmail) || process.env.RHYNO_POC_EMAIL || 'teste@cliquezoom.local';
}

// Cunha uma asserção curta assinada com o segredo compartilhado (SSO).
function mintAssertion(email) {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) throw new Error('SSO_SHARED_SECRET não configurado');
  return jwt.sign({ email, iss: 'cliquezoom' }, secret, {
    algorithm: 'HS256',
    expiresIn: '120s',
  });
}

// Troca a asserção por um token Rhyno (login servidor-a-servidor) p/ chamar a API do ERP.
async function getRhynoToken(req) {
  const assertion = mintAssertion(await resolveRhynoEmail(req));
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
    const assertion = mintAssertion(await resolveRhynoEmail(req));
    const redirect =
      typeof req.query.redirect === 'string' ? req.query.redirect : '/dashboard';
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
    req.logger?.error?.('Erro ao criar cliente no Rhyno', { error: err.message });
    res.status(500).json({ success: false, error: 'Erro ao criar cliente no Rhyno' });
  }
});

module.exports = router;
