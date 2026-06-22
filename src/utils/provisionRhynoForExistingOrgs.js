/**
 * Backfill — provisiona o tenant Rhyno de orgs antigas (sem `rhynoUserEmail`).
 *
 * Orgs criadas antes do provisionamento automático (src/utils/rhynoProvision.js)
 * nascem sem vínculo Rhyno → a aba Gestão fica fail-closed (409). Este script cria
 * o tenant delas e grava o vínculo. Idempotente: pula quem já tem `rhynoUserEmail`.
 *
 * Uso:
 *   node src/utils/provisionRhynoForExistingOrgs.js                 # DRY-RUN (lista o que faria)
 *   node src/utils/provisionRhynoForExistingOrgs.js --apply         # aplica em TODAS as orgs sem vínculo
 *   node src/utils/provisionRhynoForExistingOrgs.js --slug=acme --apply   # só a org de slug "acme"
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { provisionRhynoTenant } = require('./rhynoProvision');

const APPLY = process.argv.includes('--apply');
const slugArg = (process.argv.find((a) => a.startsWith('--slug=')) || '').split('=')[1] || null;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Conectado ao MongoDB (${APPLY ? 'APLICAR' : 'DRY-RUN'})`);

  const query = { $or: [{ rhynoUserEmail: null }, { rhynoUserEmail: { $exists: false } }] };
  if (slugArg) query.slug = slugArg.toLowerCase().trim();

  const orgs = await Organization.find(query);
  console.log(`Orgs sem vínculo Rhyno: ${orgs.length}${slugArg ? ` (filtrado por slug="${slugArg}")` : ''}`);

  let ok = 0;
  let fail = 0;
  for (const org of orgs) {
    const owner = org.ownerId ? await User.findById(org.ownerId).select('email name') : null;
    if (!owner || !owner.email) {
      console.log(`  - ${org.slug}: SEM dono/e-mail — pulando`);
      fail++;
      continue;
    }
    if (!APPLY) {
      console.log(`  - ${org.slug}: provisionaria com ${owner.email}`);
      continue;
    }
    try {
      const r = await provisionRhynoTenant(org, owner);
      console.log(`  - ${org.slug}: ${r.created ? 'CRIADO' : r.alreadyExisted ? 'JÁ EXISTIA (vínculo gravado)' : 'OK'} (${owner.email})`);
      ok++;
    } catch (err) {
      console.log(`  - ${org.slug}: FALHOU — ${err.message}`);
      fail++;
    }
  }

  console.log(APPLY ? `\nConcluído: ${ok} provisionada(s), ${fail} falha(s).` : '\nDRY-RUN (use --apply para executar).');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Erro no backfill:', err);
  process.exit(1);
});
