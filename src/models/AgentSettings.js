const mongoose = require('mongoose');

// Configurações do agente do SaaS Admin (documento único / singleton).
// Controla o digest proativo: ligado/desligado, frequência e se manda e-mail.
// Default DESLIGADO — nada roda em produção até o superadmin habilitar no painel.
const agentSettingsSchema = new mongoose.Schema({
  singleton: { type: String, default: 'main', unique: true }, // garante 1 doc só
  digestEnabled: { type: Boolean, default: false },
  digestFrequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  digestEmail: { type: Boolean, default: false },   // enviar o resumo por e-mail ao dono
  lastDigestAt: { type: Date, default: null },        // controle de frequência
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

// Sempre devolve o único doc (cria com defaults na primeira vez).
agentSettingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ singleton: 'main' });
  if (!doc) doc = await this.create({ singleton: 'main' });
  return doc;
};

module.exports = mongoose.model('AgentSettings', agentSettingsSchema);
