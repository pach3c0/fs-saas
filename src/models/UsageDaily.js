const mongoose = require('mongoose');

// Engajamento PERSISTENTE do fotógrafo (item 10, camada B): quanto tempo e em qual módulo.
// Cada heartbeat (~60s) faz $inc minutes:1 no doc do dia/módulo — vira o perfil de uso ao longo
// do tempo (Sessões/Seleções = onde gera $ · Meu Site · Gestão/Rhyno). Só FOTÓGRAFO entra aqui
// (cliente final não é engajamento do fotógrafo). Diferente da Presence, isto guarda histórico.
const usageDailySchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  day: { type: String, required: true },     // 'YYYY-MM-DD' (fuso do servidor)
  module: { type: String, required: true },  // aba do admin (currentTab)
  minutes: { type: Number, default: 0 },     // ~1 por heartbeat
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

// Um doc por (org, user, dia, módulo) — o $inc cai sempre no mesmo.
usageDailySchema.index({ organizationId: 1, userId: 1, day: 1, module: 1 }, { unique: true });
// TTL de higiene (~2 anos): histórico amplo p/ traçar o perfil, mas não infinito.
usageDailySchema.index({ updatedAt: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('UsageDaily', usageDailySchema);
