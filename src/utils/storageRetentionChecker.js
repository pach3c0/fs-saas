const Session = require('../models/Session');
const Notification = require('../models/Notification');
const Organization = require('../models/Organization');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { createWriteStream } = require('fs');
const logger = require('./logger');
const { sendStorageRetentionEmail } = require('./email');

const WINDOW_HOURS = 12;

/**
 * Verifica sessões com storageRetentionUntil chegando.
 *
 * storageAutoDelete = false (padrão):
 *   Cria notificação no sininho + envia e-mail avisando que a data chegou.
 *   O fotógrafo abre o wizard e decide: Estender | Arquivar | Deletar.
 *
 * storageAutoDelete = true (opt-in explícito):
 *   Remove as fotos do disco (exceto a capa) e cria notificação informativa.
 *   Se storageBackupOnExpire = true, gera ZIP antes de deletar.
 */
async function run() {
  const now = new Date();
  const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
  const lower = new Date(now.getTime() - windowMs);
  const upper = new Date(now.getTime() + windowMs);

  const sessions = await Session.find({
    isActive: true,
    storageRetentionUntil: { $gte: lower, $lte: upper },
    storageNotificationSent: { $ne: true },
    archivedAt: null
  }).lean();

  if (sessions.length === 0) return { notified: 0, autoDeleted: 0 };

  let notified = 0;
  let autoDeleted = 0;

  for (const session of sessions) {
    try {
      const org = await Organization.findById(session.organizationId)
        .select('email name slug').lean();

      const dateStr = new Date(session.storageRetentionUntil).toLocaleDateString('pt-BR');

      if (session.storageAutoDelete) {
        if (session.storageBackupOnExpire) {
          await _generateBackupZip(session);
        }

        await _deletePhotos(session);
        await Session.updateOne({ _id: session._id }, {
          archivedAt: new Date(),
          storageNotificationSent: true,
          photos: []
        });
        await Notification.create({
          type: 'storage_deleted',
          sessionId: String(session._id),
          sessionName: session.name,
          message: `Fotos da sessão "${session.name}" foram excluídas automaticamente conforme configurado.`,
          organizationId: session.organizationId
        });

        if (org?.email) {
          sendStorageRetentionEmail(
            org.email, org.name || '', session.name, dateStr, 'deleted'
          ).catch(() => {});
        }

        autoDeleted++;
        logger.info(`[storageRetentionChecker] Sessão ${session._id} auto-deletada.`);
      } else {
        await Notification.create({
          type: 'storage_expiring',
          sessionId: String(session._id),
          sessionName: session.name,
          message: `As fotos da sessão "${session.name}" estão no storage até ${dateStr}. Abra a sessão para decidir o que fazer.`,
          organizationId: session.organizationId
        });
        await Session.updateOne({ _id: session._id }, { storageNotificationSent: true });

        if (org?.email) {
          sendStorageRetentionEmail(
            org.email, org.name || '', session.name, dateStr, 'expiring'
          ).catch(() => {});
        }

        notified++;
        logger.info(`[storageRetentionChecker] Notificação enviada para sessão ${session._id}.`);
      }
    } catch (err) {
      logger.error(`[storageRetentionChecker] Erro na sessão ${session._id}: ${err.message}`);
    }
  }

  return { notified, autoDeleted };
}

async function _deletePhotos(session) {
  const uploadsBase = path.resolve(__dirname, '../../uploads/sessions', String(session._id));

  let entries;
  try {
    entries = await fs.readdir(uploadsBase);
  } catch (_) {
    return; // pasta não existe
  }

  const coverFile = session.coverPhoto ? path.basename(session.coverPhoto) : null;

  for (const entry of entries) {
    if (coverFile && entry === coverFile) continue;
    try {
      const full = path.join(uploadsBase, entry);
      const stat = await fs.stat(full);
      if (stat.isFile()) await fs.unlink(full);
    } catch (_) {}
  }
}

async function _generateBackupZip(session) {
  const uploadsBase = path.resolve(__dirname, '../../uploads/sessions', String(session._id));
  const zipPath = path.join(uploadsBase, `backup-${session._id}.zip`);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(output);
    archive.on('error', reject);
    output.on('close', resolve);
    archive.directory(uploadsBase, false);
    archive.finalize();
  });
}

module.exports = { run };
