const path = require('path');
const fs = require('fs');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const logger = require('./logger');

// Executar a cada 24h — verifica sessões com prazo de retenção configurado:
//   1. Notifica 7 dias antes do vencimento (aviso antecipado)
//   2. No dia do vencimento: notifica novamente E executa auto-delete se opt-in
async function checkStorageRetention() {
  const now = new Date();

  // ── 1. Notificação antecipada (7 dias antes) ─────────────────────────────
  try {
    const notifyDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await Session.find({
      storageRetentionUntil: { $gte: now, $lte: notifyDate },
      archivedAt: null,
      isActive: true,
      storageNotificationSent: { $ne: true }
    }).select('_id name organizationId storageRetentionUntil').lean();

    for (const session of expiringSoon) {
      const already = await Notification.findOne({
        type: 'storage_expiring',
        sessionId: session._id,
        createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }).lean();
      if (already) continue;

      const daysLeft = Math.ceil((new Date(session.storageRetentionUntil) - now) / 86400000);
      await Notification.create({
        type: 'storage_expiring',
        message: `Armazenamento da sessão "${session.name}" expira em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`,
        sessionId: session._id,
        sessionName: session.name,
        organizationId: session.organizationId,
        metadata: { expiresAt: session.storageRetentionUntil, daysUntilExpiry: daysLeft }
      });
      logger.info(`[StorageRetentionChecker] Aviso enviado: sessão ${session._id} expira em ${daysLeft}d`);
    }
  } catch (error) {
    logger.error('[StorageRetentionChecker] Erro na fase de notificação antecipada:', error.message);
  }

  // ── 2. Expiradas hoje — notificar + auto-delete opt-in ───────────────────
  try {
    const expired = await Session.find({
      storageRetentionUntil: { $lte: now },
      archivedAt: null,
      isActive: true
    }).select('_id name organizationId storageRetentionUntil storageAutoDelete photos coverPhoto storageNotificationSent');

    for (const session of expired) {
      // Notificação de expiração (uma só por sessão, via flag)
      if (!session.storageNotificationSent) {
        await Notification.create({
          type: 'storage_expiring',
          message: `Prazo de armazenamento da sessão "${session.name}" venceu. Decida o que fazer com as fotos.`,
          sessionId: session._id,
          sessionName: session.name,
          organizationId: session.organizationId,
          metadata: { expiresAt: session.storageRetentionUntil, expired: true }
        });
        session.storageNotificationSent = true;
        await session.save();
        logger.info(`[StorageRetentionChecker] Notificação de expiração: sessão ${session._id}`);
      }

      // Auto-delete opt-in: só executa se o fotógrafo marcou explicitamente
      if (!session.storageAutoDelete) continue;

      try {
        const uploadsBase = path.join(__dirname, '../../uploads/sessions', String(session._id));
        const coverFile = session.coverPhoto ? path.basename(session.coverPhoto) : null;

        if (fs.existsSync(uploadsBase)) {
          const entries = fs.readdirSync(uploadsBase);
          for (const entry of entries) {
            if (coverFile && entry === coverFile) continue; // preserva capa
            const full = path.join(uploadsBase, entry);
            try {
              if (fs.statSync(full).isFile()) fs.unlinkSync(full);
            } catch (_) {}
          }
        }

        // Mantém apenas a capa no array
        const photosToKeep = coverFile
          ? session.photos.filter(p => path.basename(p.url || '') === coverFile || path.basename(p.urlOriginal || '') === coverFile)
          : [];

        session.archivedAt = new Date();
        session.photos = photosToKeep;
        await session.save();

        await Notification.create({
          type: 'storage_auto_deleted',
          message: `Fotos da sessão "${session.name}" foram removidas automaticamente (auto-delete ativado).`,
          sessionId: session._id,
          sessionName: session.name,
          organizationId: session.organizationId
        });

        logger.info(`[StorageRetentionChecker] Auto-delete executado: sessão ${session._id}`);
      } catch (delErr) {
        logger.error(`[StorageRetentionChecker] Erro no auto-delete da sessão ${session._id}:`, delErr.message);
      }
    }
  } catch (error) {
    logger.error('[StorageRetentionChecker] Erro na fase de expiração:', error.message);
  }

  logger.info('[StorageRetentionChecker] Verificação completa');
}

module.exports = { run: checkStorageRetention, checkStorageRetention };
