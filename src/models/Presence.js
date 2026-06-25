const mongoose = require('mongoose');

// Presença efêmera — quem está usando a plataforma AGORA (item 10, camada A).
// Backing em Mongo (e NÃO um Map in-memory) porque o PM2 roda em cluster com 2 workers:
// um Map por worker daria presença furada (heartbeat cai num worker, painel lê de outro).
// O TTL index em `lastSeen` remove o doc sozinho ~150s após o último heartbeat.
const presenceSchema = new mongoose.Schema({
  // Chave única por "sessão de uso": user:<id> (fotógrafo) ou client:<sessionId>:<participantId|anon> (cliente).
  key: { type: String, required: true, unique: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  role: { type: String, enum: ['photographer', 'client'], required: true },
  name: { type: String, default: '' },     // nome do fotógrafo OU nome da sessão (cliente — sem dado pessoal)
  module: { type: String, default: '' },   // aba do admin (currentTab) ou 'galeria'/'selecao'
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  lastSeen: { type: Date, default: Date.now }
}, { timestamps: false });

// TTL: cai da presença ~150s após o último heartbeat (o front bate a cada 60s).
presenceSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 150 });

module.exports = mongoose.model('Presence', presenceSchema);
