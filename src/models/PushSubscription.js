const mongoose = require('mongoose');

// Assinatura de Web Push (VAPID) de UM dispositivo do fotógrafo.
// 1 doc por endpoint (o navegador/celular/desktop gera um endpoint único) → multi-dispositivo
// natural: o fotógrafo pode receber no celular E no desktop ao mesmo tempo.
// O dispatch de push é por `organizationId` (hoje org é 1:1 com o user; `userId` fica guardado
// para o futuro de múltiplos seats, quando poderemos filtrar por usuário).
const pushSubscriptionSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  endpoint:       { type: String, required: true, unique: true }, // chave de dedupe do dispositivo
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true }
  },
  userAgent:      { type: String, default: '' },  // p/ listar "Chrome no Android" etc na UI
  isActive:       { type: Boolean, default: true },
  lastSuccessAt:  { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
