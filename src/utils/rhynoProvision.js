// Provisionamento automático do tenant Rhyno (ERP/CRM) no cadastro do fotógrafo.
//
// Quando alguém cria uma conta no CliqueZoom, criamos em paralelo um tenant próprio
// no Rhyno e gravamos o vínculo em `org.rhynoUserEmail`. Assim a aba Gestão entra por
// SSO direto, sem tela de login e SEM cair no tenant de outro fotógrafo (o vazamento
// corrigido em 2026-06-19). Sem isto, a org nasce fail-CLOSED (Gestão responde 409).
//
// Estratégia: reaproveita o endpoint público `POST /auth/register-tenant` do Rhyno
// (server-to-server) — não exige tocar/deployar o backend Rhyno. A senha é aleatória
// e descartada: o fotógrafo NUNCA loga com senha no Rhyno, sempre por SSO.
const crypto = require('crypto');
const logger = require('./logger');

const RHYNO_API = process.env.RHYNO_API_URL || 'http://localhost:8000';

// Cria o tenant do fotógrafo no Rhyno e grava `org.rhynoUserEmail`. Idempotente:
// se a org já tem vínculo, não faz nada. Lança em falha de rede/HTTP inesperada —
// o chamador deve usar fire-and-forget (.catch) para não bloquear o cadastro.
async function provisionRhynoTenant(org, user) {
  if (!org || !user) throw new Error('org e user são obrigatórios');
  if (org.rhynoUserEmail) return { ok: true, skipped: true }; // já provisionada

  const email = String(user.email || '').toLowerCase().trim();
  if (!email) throw new Error('user.email ausente');

  const body = {
    name: user.name || email,
    email,
    // Senha aleatória nunca usada (acesso só por SSO). 32 bytes hex = 64 chars.
    password: crypto.randomBytes(32).toString('hex'),
    company_name: org.name || org.slug || 'Negócio',
  };

  const resp = await fetch(`${RHYNO_API}/auth/register-tenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (resp.ok) {
    org.rhynoUserEmail = email;
    await org.save();
    logger.info('Rhyno: tenant provisionado', { org: org.slug, email });
    return { ok: true, created: true };
  }

  // 400 "Email já cadastrado": o usuário já existe no Rhyno (ex.: reprocessamento
  // ou backfill). Assumimos que o e-mail mapeia ao tenant dele e gravamos o vínculo.
  const data = await resp.json().catch(() => ({}));
  const detail = typeof data.detail === 'string' ? data.detail : '';
  if (resp.status === 400 && /j[aá] cadastrado/i.test(detail)) {
    org.rhynoUserEmail = email;
    await org.save();
    logger.info('Rhyno: tenant já existia, vínculo gravado', { org: org.slug, email });
    return { ok: true, alreadyExisted: true };
  }

  throw new Error(`Rhyno register-tenant falhou (${resp.status}): ${detail || 'sem detalhe'}`);
}

module.exports = { provisionRhynoTenant };
