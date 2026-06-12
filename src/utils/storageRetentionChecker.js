const Session = require('../models/Session');
const Notification = require('../models/Notification');

// Executar a cada 24h — verifica sessões perto da expiração de storage
async function checkStorageRetention() {
  try {
    const now = new Date();
    // Notificar 7 dias antes da expiração
    const notifyBefore = 7;
    const notifyDate = new Date(now.getTime() + notifyBefore * 24 * 60 * 60 * 1000);

    // Buscar sessões que vão expirar entre hoje e o notifyDate
    const expiringSessions = await Session.find({
      storageRetentionUntil: {
        $gte: now,
        $lte: notifyDate
      },
      isActive: true
    }).select('_id name organizationId storageRetentionUntil').lean();

    for (const session of expiringSessions) {
      // Verifica se já foi notificado hoje (evita spam)
      const existingNotification = await Notification.findOne({
        type: 'storage_expiring_soon',
        sessionId: session._id,
        createdAt: {
          $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }).lean();

      if (existingNotification) {
        continue; // Já foi notificado hoje
      }

      const daysUntilExpiry = Math.ceil((session.storageRetentionUntil - now) / (1000 * 60 * 60 * 24));

      // Criar notificação
      await Notification.create({
        type: 'storage_expiring_soon',
        message: `Armazenamento da sessão "${session.name}" expira em ${daysUntilExpiry} dias`,
        sessionId: session._id,
        sessionName: session.name,
        organizationId: session.organizationId,
        metadata: {
          expiresAt: session.storageRetentionUntil,
          daysUntilExpiry
        }
      });

      console.log(`[StorageRetentionChecker] Notificação enviada para sessão ${session._id} (expira em ${daysUntilExpiry}d)`);
    }

    console.log(`[StorageRetentionChecker] Verificação completa (${expiringSessions.length} sessões a vencer)`);
  } catch (error) {
    console.error('[StorageRetentionChecker] Erro:', error.message);
  }
}

module.exports = { run: checkStorageRetention, checkStorageRetention };
