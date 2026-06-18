const Client = require('../models/Client');
const Session = require('../models/Session');
const Organization = require('../models/Organization');
const { sendManualReactivationEmail } = require('./email');
const logger = require('./logger');

/**
 * Motor de reativacao de clientes (CRM)
 *
 * Consulta clientes cuja nextContactDate <= hoje e envia um e-mail
 * de reativacao configurado manualmente pelo fotografo.
 * Apos o envio, limpa nextContactDate e registra em contactHistory.
 */

async function run(organizationId = null, options = {}) {
  const now = new Date();
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Buscar orgs ativas com automator habilitado
  const orgQuery = organizationId ? { _id: organizationId } : { isActive: true };
  const orgs = await Organization.find(orgQuery).select('_id name slug integrations').lean();

  // Disparo manual (organizationId passado): ignora o flag enabled — o fotógrafo
  // está acionando explicitamente. Disparo automático (cron): respeita o flag.
  const enabledOrgIds = organizationId
    ? orgs.map(o => o._id)
    : orgs.filter(o => o?.integrations?.salesAutomator?.enabled).map(o => o._id);

  if (enabledOrgIds.length === 0) return { sent: 0, skipped: 0 };

  const orgMap = Object.fromEntries(orgs.map(o => [String(o._id), o]));

  // Buscar clientes com nextContactDate no passado ou hoje
  const clientes = await Client.find({
    organizationId: { $in: enabledOrgIds },
    nextContactDate: { $ne: null, $lte: endOfToday },
    email: { $ne: '' }
  }).lean();

  let sent = 0;
  let skipped = 0;

  for (const cliente of clientes) {
    try {
      const org = orgMap[String(cliente.organizationId)];
      if (!org) { skipped++; continue; }

      // Fotos de memoria: capa + ate 2 fotos da sessao mais recente entregue
      // options.includePhotos === false desativa o bloco de imagens no e-mail
      const includePhotos = options.includePhotos !== false;
      let photoUrls = [];

      if (includePhotos) {
        const sessaoRecente = await Session.findOne(
          { organizationId: cliente.organizationId, clientId: cliente._id, selectionStatus: 'delivered' },
          'coverPhoto photos'
        ).sort({ updatedAt: -1 }).lean();

        if (sessaoRecente) {
          const base = process.env.BASE_URL || 'https://app.cliquezoom.com.br';
          const toFull = url => url ? (url.startsWith('http') ? url : `${base}${url}`) : null;

          const candidatos = [
            toFull(sessaoRecente.coverPhoto),
            ...(sessaoRecente.photos || []).slice(0, 2).map(p => toFull(p.url))
          ].filter(Boolean);

          // Deduplica (capa pode coincidir com photos[0]) e limita a 3
          const seen = new Set();
          for (const u of candidatos) {
            if (!seen.has(u)) { seen.add(u); photoUrls.push(u); }
            if (photoUrls.length === 3) break;
          }
        }
      }

      await sendManualReactivationEmail(
        cliente.email,
        cliente.name,
        org.name,
        org.slug,
        photoUrls
      );

      // Limpar nextContactDate e registrar no historico
      await Client.updateOne(
        { _id: cliente._id },
        {
          $set: { nextContactDate: null },
          $push: { contactHistory: { sentAt: new Date(), note: '' } }
        }
      );

      sent++;
    } catch (error) {
      logger.error(`[anniversaryAutomator] Erro ao processar cliente ${cliente._id}:`, error.message);
      skipped++;
    }
  }

  return { sent, skipped };
}

module.exports = { run };
