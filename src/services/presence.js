const Presence = require('../models/Presence');
const UsageDaily = require('../models/UsageDaily');
const logger = require('../utils/logger');

// Janela de "online": quem bateu heartbeat nos últimos 150s (alinhado ao TTL da Presence).
const ONLINE_WINDOW_MS = 150 * 1000;

// Dia local 'YYYY-MM-DD' (fuso do servidor) — chave do rollup de engajamento.
function today() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Registra 1 heartbeat. Fire-and-forget (estilo activityTracker): NUNCA propaga erro pro fluxo
// do admin/galeria. Faz 2 writes: Presence (efêmero, sempre) + UsageDaily (só fotógrafo).
function touch({ key, organizationId = null, userId = null, role, name = '', module = '', sessionId = null }) {
  if (!key || !role) return;
  const now = new Date();

  // Camada A — presença em tempo real (upsert pela chave de uso).
  Presence.updateOne(
    { key },
    { $set: { organizationId, userId, role, name, module, sessionId, lastSeen: now } },
    { upsert: true }
  ).catch(err => logger.error('[presence] erro no upsert Presence', { error: err.message }));

  // Camada B — engajamento histórico, só de FOTÓGRAFO (cliente não polui o perfil).
  if (role === 'photographer' && organizationId && userId) {
    UsageDaily.updateOne(
      { organizationId, userId, day: today(), module: module || 'outros' },
      { $inc: { minutes: 1 }, $set: { updatedAt: now } },
      { upsert: true }
    ).catch(err => logger.error('[presence] erro no $inc UsageDaily', { error: err.message }));
  }
}

// Quem está online AGORA. O TTL já remove inativos, mas filtramos por janela por segurança.
async function getOnline() {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  const docs = await Presence.find({ lastSeen: { $gte: cutoff } })
    .sort({ lastSeen: -1 })
    .lean();

  const map = d => ({
    name: d.name || '',
    module: d.module || '',
    organizationId: d.organizationId || null,
    sessionId: d.sessionId || null,
    lastSeen: d.lastSeen
  });
  const photographers = docs.filter(d => d.role === 'photographer').map(map);
  const clients = docs.filter(d => d.role === 'client').map(map);

  return {
    total: docs.length,
    counts: { photographers: photographers.length, clients: clients.length },
    photographers,
    clients
  };
}

async function getOnlineCount() {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  return Presence.countDocuments({ lastSeen: { $gte: cutoff } });
}

// Clientes de UMA org online agora, agrupados por sessão.
// multi_selection pode ter vários participantes — count indica quantos simultaneamente.
async function getClientsOnline(organizationId) {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  const docs = await Presence.find({
    role: 'client',
    organizationId,
    lastSeen: { $gte: cutoff }
  }).sort({ lastSeen: -1 }).lean();

  const bySession = {};
  for (const d of docs) {
    const sid = String(d.sessionId || 'unknown');
    if (!bySession[sid]) {
      bySession[sid] = {
        sessionId: d.sessionId || null,
        name: d.name || '',
        module: d.module || 'galeria',
        count: 0,
        lastSeen: d.lastSeen
      };
    }
    bySession[sid].count++;
    if (d.lastSeen > bySession[sid].lastSeen) bySession[sid].lastSeen = d.lastSeen;
  }

  const clients = Object.values(bySession).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  return { total: docs.length, sessions: clients.length, clients };
}

module.exports = { touch, getOnline, getOnlineCount, getClientsOnline };
