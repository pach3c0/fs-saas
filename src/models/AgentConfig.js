const mongoose = require('mongoose');

// Configurações de IA do agente do SaaS Admin (gerenciadas pelo superadmin no
// painel). Cada doc = um provedor+modelo com sua chave. A chave fica
// criptografada (src/utils/secretBox.js) — nunca em texto puro nem exposta na API.
const agentConfigSchema = new mongoose.Schema({
  provider: {
    type: String,
    enum: ['anthropic', 'openai', 'google', 'openai-compatible'],
    required: true
  },
  label: { type: String, required: true },   // nome amigável dado pelo superadmin
  model: { type: String, required: true },    // id do modelo (ex.: claude-opus-4-8)
  baseURL: { type: String },                  // só p/ openai-compatible (OpenRouter, DeepSeek...)
  apiKeyEnc: { type: String, required: true },// chave criptografada (AES-256-GCM)
  apiKeyLast4: { type: String },              // últimos 4 chars p/ exibição mascarada
  priceInput: { type: Number },               // tarifa opcional US$/milhão de tokens (entrada)
  priceOutput: { type: Number },              // tarifa opcional US$/milhão de tokens (saída)
  isActive: { type: Boolean, default: false, index: true }, // o ativo é o default do agente
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('AgentConfig', agentConfigSchema);
