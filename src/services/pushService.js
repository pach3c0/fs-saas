// Web Push (VAPID) — envia TODA notificação in-app também como push pro celular do fotógrafo.
// Ponte única: o hook post('save') do model Notification chama dispatchFromNotification().
//
// REGRAS DE OURO:
//  - Fire-and-forget: NUNCA lança pro fluxo que criou a Notification (try/catch em tudo).
//  - Guard: sem VAPID (ou sem web-push instalado) → enabled=false, tudo vira no-op silencioso.
//    Isso protege dev/staging e o deploy incremental (Fase 0 sobe sem efeito).
const logger = require('../utils/logger');
const Organization = require('../models/Organization');

// require defensivo: se web-push não estiver instalado (ex.: antes do npm i em prod),
// o módulo ainda carrega — só fica desabilitado. Assim o server nunca cai no boot por isso.
let webpush = null;
try { webpush = require('web-push'); } catch (_) { webpush = null; }

let enabled = false;
let initialized = false;

function init() {
  if (initialized) return enabled;
  initialized = true;

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || `mailto:${process.env.OWNER_EMAIL || 'contato@cliquezoom.com.br'}`;

  if (!webpush) {
    logger.warn('[push] desabilitado: pacote web-push não instalado');
    return (enabled = false);
  }
  if (!pub || !priv) {
    logger.warn('[push] desabilitado: VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes no .env');
    return (enabled = false);
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    enabled = true;
    logger.info('[push] Web Push habilitado (VAPID configurado)');
  } catch (err) {
    enabled = false;
    logger.error('[push] falha ao configurar VAPID — push desabilitado', { error: err.message });
  }
  return enabled;
}

function isEnabled() { return enabled; }

// A chave pública vai pro browser (applicationServerKey). Só faz sentido se habilitado.
function getPublicKey() {
  return enabled ? (process.env.VAPID_PUBLIC_KEY || null) : null;
}

// Título curto por tipo de notificação. O corpo é sempre doc.message (frase pronta em pt-BR).
// Espelha a intenção do _navigate() do front (admin/js/utils/notifications.js).
const TYPE_TITLE = {
  session_accessed:       'Cliente acessou a galeria',
  client_online:          'Cliente online',
  selection_started:      'Cliente começou a selecionar',
  selection_submitted:    'Seleção finalizada',
  selection_delivered:    'Seleção finalizada',
  extra_photos_requested: 'Pediram fotos extras',
  extra_photos_paid:      'Pagamento de extras recebido',
  reopen_requested:       'Pediram reabertura',
  comment_added:          'Novo comentário',
  photos_downloaded:      'Download do cliente',
  contact:                'Nova mensagem',
  depoimento_pendente:    'Novo depoimento',
  storage_expiring:       'Armazenamento expirando',
  storage_deleted:        'Fotos removidas',
  storage_auto_deleted:   'Fotos removidas',
  ticket_reply:           'Suporte respondeu',
  support_request:        'Solicitação de suporte',
  support_access:         'Acesso de suporte'
};

// Deep-link pro admin. app.js lê location.hash/query no boot e abre a aba/modal certo.
// Espelha os ramos do _navigate() do front.
function urlForType(doc) {
  const sid = doc.sessionId ? String(doc.sessionId) : '';
  const pid = doc.photoId ? String(doc.photoId) : '';
  switch (doc.type) {
    case 'contact':
    case 'depoimento_pendente':
      return '/admin/#mensagens';
    case 'ticket_reply':
      return '/admin/#ajuda';
    case 'support_request':
    case 'support_access':
      return '/admin/#configuracoes';
    case 'comment_added':
      return sid ? `/admin/#sessoes?session=${sid}${pid ? `&photo=${pid}` : ''}` : '/admin/#sessoes';
    case 'storage_expiring':
    case 'storage_deleted':
    case 'storage_auto_deleted':
      return sid ? `/admin/#sessoes?session=${sid}` : '/admin/#sessoes';
    default:
      return sid ? `/admin/#sessoes?session=${sid}` : '/admin/';
  }
}

// tag estável: agrupa/atualiza notificações do mesmo contexto no celular (o SO SUBSTITUI a
// notificação de mesma tag em vez de empilhar). Inclui participantId/kind quando existirem.
function tagForType(doc) {
  const parts = [doc.type, doc.sessionId ? String(doc.sessionId) : ''];
  if (doc.participantId) parts.push(String(doc.participantId));
  if (doc.meta && doc.meta.kind) parts.push(String(doc.meta.kind));
  return parts.filter(Boolean).join(':');
}

// Envia para todas as subscriptions da org. Trata subscription morta (404/410) removendo o doc.
async function dispatchToOrg(organizationId, { title, body, url = '/admin/', tag }) {
  if (!enabled || !organizationId) return { sent: 0 };
  const PushSubscription = require('../models/PushSubscription');

  const subs = await PushSubscription.find({ organizationId, isActive: true }).lean();
  if (!subs.length) return { sent: 0 };

  const payload = JSON.stringify({ title: title || 'CliqueZoom', body: body || '', url, tag });

  const results = await Promise.allSettled(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: s.keys },
        payload,
        { TTL: 3600 }
      );
      await PushSubscription.updateOne({ _id: s._id }, { $set: { lastSuccessAt: new Date() } });
      return 'ok';
    } catch (err) {
      const status = err && err.statusCode;
      // 404/410 = endpoint expirado/cancelado → limpar. Outros erros: logar e seguir.
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ _id: s._id });
      } else {
        logger.error('[push] falha ao enviar notificação', { status, error: err && err.message });
      }
      throw err;
    }
  }));

  return { sent: results.filter(r => r.status === 'fulfilled').length };
}

// Ponte principal: chamada pelo hook post('save') do Notification. Deriva título/url do tipo,
// respeita o master preferences.push.enabled e envia. Fire-and-forget (nunca lança).
async function dispatchFromNotification(doc) {
  try {
    if (!enabled || !doc || !doc.organizationId) return;

    // Master switch de push (independente do e-mail). Os toggles POR TIPO já foram respeitados
    // na CRIAÇÃO da Notification (se o tipo estava off, a Notification nem existiria).
    const org = await Organization.findById(doc.organizationId).select('preferences.push').lean();
    if (org && org.preferences && org.preferences.push && org.preferences.push.enabled === false) return;

    await dispatchToOrg(doc.organizationId, {
      title: TYPE_TITLE[doc.type] || 'CliqueZoom',
      body: doc.message || '',
      url: urlForType(doc),
      tag: tagForType(doc)
    });
  } catch (err) {
    // Nunca propaga: a criação da Notification/e-mail não pode falhar por causa do push.
    try { logger.error('[push] dispatchFromNotification falhou', { error: err && err.message }); } catch (_) {}
  }
}

module.exports = { init, isEnabled, getPublicKey, dispatchToOrg, dispatchFromNotification };
