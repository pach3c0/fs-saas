const mongoose = require('mongoose');

// Histórico de conversas do chat do agente (por superadmin). Guarda o fio de
// mensagens para o usuário reabrir/continuar depois. Sem TTL — o usuário decide
// quando apagar (botão de excluir no painel).
const agentConversationSchema = new mongoose.Schema({
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, default: 'Conversa' },
  messages: {
    type: [{
      role: { type: String, enum: ['user', 'assistant'], required: true },
      content: { type: String, default: '' },
      at: { type: Date, default: Date.now }
    }],
    default: []
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: false });

agentConversationSchema.index({ adminUserId: 1, updatedAt: -1 });

module.exports = mongoose.model('AgentConversation', agentConversationSchema);
