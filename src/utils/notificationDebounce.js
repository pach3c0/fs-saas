// Criação de Notification com anti-spam, reusando a própria collection Notification como fonte
// de verdade (sem storage novo). Serve os gatilhos client_online e photos_downloaded.
//
// Recursos:
//  - prefKey: respeita o toggle preferences.notifications[prefKey] (off = não notifica em canal algum).
//  - windowMs: janela de debounce do MESMO tipo (não recria dentro da janela).
//  - aggregate: em vez de suprimir, INCREMENTA meta.count e reescreve a mensagem (ex.: "baixou N
//    fotos") — o .save() redispara o post('save') → o push atualiza com a MESMA tag (não empilha).
//  - suppressIfRecent: suprime se houver outro tipo recente (ex.: client_online não repete um
//    session_accessed que acabou de acontecer no 1º acesso).
//
// Tudo fire-and-forget: NUNCA lança pro fluxo (download/heartbeat não podem falhar por isto).
const Organization = require('../models/Organization');
const Notification = require('../models/Notification');

async function createNotificationDebounced({
  organizationId, type, sessionId, sessionName = '', participantId = null,
  count = 1, kind = null, buildMessage, windowMs = 0,
  aggregate = false, suppressIfRecent = null, prefKey = null
}) {
  try {
    if (!organizationId || typeof buildMessage !== 'function') return;

    // Toggle por tipo (vale para sino + push). off → não cria nada.
    if (prefKey) {
      const org = await Organization.findById(organizationId).select('preferences.notifications').lean();
      const notifs = (org && org.preferences && org.preferences.notifications) || {};
      if (notifs[prefKey] === false) return;
    }

    const now = Date.now();
    const pid = (participantId != null && participantId !== '' && participantId !== 'anon') ? String(participantId) : null;
    const sid = sessionId != null ? String(sessionId) : null;

    // Dedupe cruzado: outro tipo recente para o mesmo contexto suprime este.
    if (suppressIfRecent && Array.isArray(suppressIfRecent.types) && suppressIfRecent.types.length) {
      const cross = {
        organizationId,
        type: { $in: suppressIfRecent.types },
        participantId: pid,
        createdAt: { $gte: new Date(now - (suppressIfRecent.windowMs || 0)) }
      };
      if (sid != null) cross.sessionId = sid;
      const has = await Notification.exists(cross);
      if (has) return;
    }

    // Debounce/agregação do MESMO tipo (+ mesmo kind, quando houver).
    const selfQuery = {
      organizationId, type, participantId: pid,
      createdAt: { $gte: new Date(now - windowMs) }
    };
    if (sid != null) selfQuery.sessionId = sid;
    if (kind) selfQuery['meta.kind'] = kind;

    const recent = windowMs > 0 ? await Notification.findOne(selfQuery).sort({ createdAt: -1 }) : null;
    if (recent) {
      if (aggregate) {
        const newCount = ((recent.meta && recent.meta.count) || 1) + count;
        recent.meta = recent.meta || {};
        recent.meta.count = newCount;
        if (kind) recent.meta.kind = kind;
        recent.message = buildMessage(newCount);
        recent.read = false;                 // reacende o sino
        recent.markModified('meta');
        await recent.save();                 // dispara post('save') → atualiza o push (mesma tag)
      }
      return; // dentro da janela → não cria uma nova
    }

    await Notification.create({
      organizationId,
      type,
      sessionId: sid || undefined,
      sessionName,
      participantId: pid || undefined,
      meta: { count, kind: kind || undefined },
      message: buildMessage(count)
    });
  } catch (_) { /* fire-and-forget: nunca quebra o fluxo que chamou */ }
}

module.exports = { createNotificationDebounced };
