/**
 * Script standalone — adiciona sub-item "Fotos de cortesia" no card Galeria de Seleção da landing.
 * Uso: node src/utils/updateLandingCortesia.js
 * Seguro para re-executar (idempotente: só adiciona se ainda não existir).
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

const mongoose = require('mongoose');
const LandingData = require('../models/LandingData');

const CORTESIA_ITEM = {
  name: 'Fotos de cortesia',
  description: 'Inclua fotos extras de presente para o cliente na entrega — sem cobrar. O sistema destaca automaticamente com badge ★, criando uma surpresa positiva que fideliza e gera indicações.'
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado ao MongoDB');

  let doc = await LandingData.findOne();
  if (!doc) {
    console.log('Nenhum documento LandingData encontrado. Criando com defaults...');
    doc = await LandingData.create({});
    console.log('Documento criado com defaults (cortesia já incluída nos defaults).');
    await mongoose.disconnect();
    return;
  }

  // Localiza o card "Galeria de Seleção" (segundo item de solutions.items)
  const solutions = doc.solutions && doc.solutions.items;
  if (!solutions || solutions.length < 2) {
    console.log('solutions.items não encontrado ou incompleto — nada alterado.');
    await mongoose.disconnect();
    return;
  }

  const galeriaCard = solutions.find(s => s.title && s.title.includes('Galeria de Seleção'));
  if (!galeriaCard) {
    console.log('Card "Galeria de Seleção" não encontrado — nada alterado.');
    await mongoose.disconnect();
    return;
  }

  const jaExiste = (galeriaCard.subItems || []).some(si => si.name === CORTESIA_ITEM.name);
  if (jaExiste) {
    console.log('Sub-item "Fotos de cortesia" já existe — nenhuma alteração necessária.');
    await mongoose.disconnect();
    return;
  }

  galeriaCard.subItems = [...(galeriaCard.subItems || []), CORTESIA_ITEM];
  doc.markModified('solutions.items');
  await doc.save();
  console.log(`✅ Sub-item "${CORTESIA_ITEM.name}" adicionado com sucesso.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
