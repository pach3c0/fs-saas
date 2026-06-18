#!/usr/bin/env node
/**
 * Migração de clientes CliqueZoom (Mongo) → Rhyno (ERP, CRM principal).
 *
 * Uso:
 *   node src/utils/migrateClientsToRhyno.js              # dry-run (não grava nada)
 *   node src/utils/migrateClientsToRhyno.js --apply      # executa de verdade
 *   node src/utils/migrateClientsToRhyno.js --org=<id>   # limita a uma organização
 *
 * Regras:
 *  - Rhyno exige CPF/CNPJ válido → clientes sem documento utilizável são PULADOS e relatados.
 *  - Idempotente: pula clientes que já têm rhynoCustomerId (e grava o id após migrar).
 *  - Tenant Rhyno resolvido por org.rhynoUserEmail (fallback RHYNO_POC_EMAIL).
 *    ⚠️ Provisionamento por fotógrafo ainda pendente — hoje cai no tenant de teste.
 */
require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Organization = require('../models/Organization');
const Client = require('../models/Client');

const RHYNO_API = process.env.RHYNO_API_URL || 'http://localhost:8000';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cliquezoom';

const APPLY = process.argv.includes('--apply');
const ORG_ARG = (process.argv.find((a) => a.startsWith('--org=')) || '').split('=')[1] || null;

function onlyDigits(s) {
  return String(s || '').replace(/\D/g, '');
}

// Filtro barato local (Rhyno faz a validação final do CPF/CNPJ no --apply).
function hasUsableDoc(cpf) {
  const d = onlyDigits(cpf);
  if (d.length !== 11 && d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false; // dígitos iguais (ex: 00000000000)
  return true;
}

function mintAssertion(email) {
  const secret = process.env.SSO_SHARED_SECRET;
  if (!secret) throw new Error('SSO_SHARED_SECRET não configurado no .env');
  return jwt.sign({ email, iss: 'cliquezoom' }, secret, { algorithm: 'HS256', expiresIn: '300s' });
}

async function getRhynoToken(email) {
  const resp = await fetch(`${RHYNO_API}/auth/sso-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assertion: mintAssertion(email) }),
  });
  if (!resp.ok) throw new Error(`SSO falhou para ${email} (${resp.status})`);
  return (await resp.json()).access_token;
}

async function createInRhyno(token, client) {
  const doc = onlyDigits(client.cpf);
  const body = {
    name: client.name,
    document: doc,
    person_type: doc.length > 11 ? 'juridica' : 'fisica',
    is_customer: true,
    email: client.email || null,
    cellphone: client.phone || null,
    observation: client.notes || null,
    tags: Array.isArray(client.tags) && client.tags.length ? client.tags : null,
    next_contact_date: client.nextContactDate || null,
  };
  const resp = await fetch(`${RHYNO_API}/customers/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : `HTTP ${resp.status}`;
    throw new Error(detail);
  }
  return data.id;
}

async function main() {
  console.log(`\n🔁 Migração clientes CliqueZoom → Rhyno  [${APPLY ? 'APPLY' : 'DRY-RUN'}]`);
  await mongoose.connect(MONGO_URI);

  const orgFilter = ORG_ARG ? { _id: ORG_ARG } : {};
  const orgs = await Organization.find(orgFilter).select('_id name rhynoUserEmail').lean();
  console.log(`Organizações: ${orgs.length}\n`);

  const totals = { migrated: 0, skippedNoDoc: 0, skippedAlready: 0, failed: 0 };

  for (const org of orgs) {
    const email = org.rhynoUserEmail || process.env.RHYNO_POC_EMAIL || 'teste@cliquezoom.local';
    const clients = await Client.find({ organizationId: org._id }).lean();
    if (!clients.length) continue;
    console.log(`🏢 ${org.name || org._id} → tenant de '${email}' (${clients.length} clientes)`);

    let token = null;
    for (const c of clients) {
      if (c.rhynoCustomerId) { totals.skippedAlready++; continue; }
      if (!hasUsableDoc(c.cpf)) { totals.skippedNoDoc++; continue; }
      if (!APPLY) {
        totals.migrated++;
        console.log(`   [dry] migraria: ${c.name} (${onlyDigits(c.cpf)})`);
        continue;
      }
      try {
        if (!token) token = await getRhynoToken(email);
        const id = await createInRhyno(token, c);
        await Client.updateOne({ _id: c._id }, { $set: { rhynoCustomerId: String(id) } });
        totals.migrated++;
        console.log(`   ✓ ${c.name} → rhyno:${id}`);
      } catch (e) {
        totals.failed++;
        console.log(`   ✗ ${c.name}: ${e.message}`);
      }
    }
  }

  console.log(`\n📊 Resumo [${APPLY ? 'APPLY' : 'DRY-RUN'}]`);
  console.log(`   migrados${APPLY ? '' : ' (simulado)'}: ${totals.migrated}`);
  console.log(`   pulados (sem CPF/CNPJ válido): ${totals.skippedNoDoc}`);
  console.log(`   pulados (já migrados): ${totals.skippedAlready}`);
  console.log(`   falhas: ${totals.failed}`);
  if (!APPLY) console.log(`\n   ⚠️  DRY-RUN — nada gravado. Use --apply para executar.`);

  await mongoose.disconnect();
}

main().catch((e) => { console.error('Erro fatal:', e); process.exit(1); });
