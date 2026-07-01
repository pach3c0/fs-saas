const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: String,
  sessionId: String,
  sessionName: String,
  photoId: String,
  // participante (multi_selection/Seleção em Grupo) — usado no debounce/agregação dos gatilhos
  // client_online e photos_downloaded, e na tag do push. Opcional/retrocompatível.
  participantId: String,
  // genérico p/ agregação: { count, kind } — ex.: "baixou N fotos" num único item.
  meta: {
    count: Number,
    kind: String
  },
  message: String,
  read: { type: Boolean, default: false },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true }
}, { timestamps: true });

// PONTE DE WEB PUSH: toda Notification criada (Notification.create) OU salva (.save() do
// debounce/agregação) espelha automaticamente como push no celular do fotógrafo.
// - Model.create() dispara save hooks → cobre os ~21 pontos que criam notificação sem tocá-los.
// - updateOne/updateMany (marcar lida/não-lida) NÃO disparam save → não geram push espúrio.
// Fire-and-forget: require lazy (evita ciclo), SEM await (não atrasa a resposta), try/catch total.
// O pushService trata VAPID ausente (no-op) e erros de rede — nunca quebra a criação da Notification.
notificationSchema.post('save', function (doc) {
  try {
    require('../services/pushService').dispatchFromNotification(doc).catch(() => {});
  } catch (_) { /* swallow: push nunca pode derrubar a notificação/e-mail */ }
});

module.exports = mongoose.model('Notification', notificationSchema);
