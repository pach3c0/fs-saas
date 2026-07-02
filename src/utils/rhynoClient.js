// Cliente SSO servidor-a-servidor do Rhyno (ERP/CRM embutido na aba Gestão).
//
// Centraliza a cunhagem de asserção + troca por token do Rhyno, para que gestao.js
// (busca/cria clientes) e team.js (espelha usuários da equipe) compartilhem o mesmo
// caminho SEM duplicar. Extraído de gestao.js em 2026-07-02.
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');

// API do ERP Rhyno (backend) para chamadas servidor-a-servidor.
const RHYNO_API = process.env.RHYNO_API_URL || 'http://localhost:8000';

// Erro tipado para org sem tenant Rhyno — vira HTTP 409 nas rotas.
class NotProvisionedError extends Error {
  constructor() { super('Gestão ainda não provisionada'); this.code = 'NOT_PROVISIONED'; }
}

// Resolve o email do usuário Rhyno do fotógrafo logado (o DONO da org).
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
// lê e barra a ESCRITA de módulo fora do plano (parede no Salvar). `seats` (assentos do
// plano) viaja como `cz_seats` p/ o Rhyno cercar a criação de membros de equipe (furo #3).
// Ambos opcionais e INERTES até o Rhyno consumir — asserção sem eles mantém fail-open.
function mintAssertion(email, caps, seats) {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) throw new Error('SSO_SHARED_SECRET não configurado');
  const payload = { email, iss: 'cliquezoom' };
  if (caps) payload.caps = caps;
  if (typeof seats === 'number') payload.seats = seats;
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '120s',
  });
}

// Troca a asserção por um token Rhyno (login servidor-a-servidor) p/ chamar a API do ERP.
// Usa o e-mail do DONO — sem caps/seats na asserção (o token não carrega `cz_seats`, então
// a cerca de assentos do Rhyno fica inerte no caminho do espelho; quem enforça é o CZ).
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

module.exports = { RHYNO_API, NotProvisionedError, resolveRhynoEmail, mintAssertion, getRhynoToken };
