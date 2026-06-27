const fs = require('fs');
const path = require('path');
const Organization = require('../models/Organization');
const User = require('../models/User');
const Session = require('../models/Session');
const SiteData = require('../models/SiteData');
const Notification = require('../models/Notification');
const Album = require('../models/Album');
const Client = require('../models/Client');
const Subscription = require('../models/Subscription');
const { sendOffboardingWarningEmail, sendOffboardingDeletedEmail } = require('./email');
const logger = require('./logger');

const GRACE_DAYS = parseInt(process.env.OFFBOARDING_GRACE_DAYS || '30');
// Avisa faltando WARN_DAYS dias para o fim do grace period
const WARN_DAYS = parseInt(process.env.OFFBOARDING_WARN_DAYS || '7');

async function checkOffboarding() {
  const orgs = await Organization.find({
    isActive: false,
    deactivatedAt: { $ne: null },
    // Blindagem F3: suspensão por carência de cobrança é INDEFINIDA e NUNCA é excluída.
    // (Por construção ela não seta deactivatedAt; o guard abaixo protege contra regressão.)
    suspendedReason: { $ne: 'billing' }
  }).select('_id name email deactivatedAt').lean();

  if (!orgs.length) return { warned: 0, deleted: 0 };

  let warned = 0;
  let deleted = 0;
  const now = new Date();

  for (const org of orgs) {
    const deactivatedAt = new Date(org.deactivatedAt);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSince = Math.floor((now - deactivatedAt) / msPerDay);
    const daysLeft = GRACE_DAYS - daysSince;

    if (daysLeft <= 0) {
      // Grace period encerrado: cascade delete completo (banco + uploads)
      const orgId = org._id;

      try {
        await Promise.all([
          User.deleteMany({ organizationId: orgId }),
          Session.deleteMany({ organizationId: orgId }),
          SiteData.deleteMany({ organizationId: orgId }),
          Notification.deleteMany({ organizationId: orgId }),
          Album.deleteMany({ organizationId: orgId }),
          Client.deleteMany({ organizationId: orgId }),
          Subscription.deleteMany({ organizationId: orgId })
        ]);
      } catch (e) {
        logger.error(`[offboarding] Erro cascade delete org=${orgId}:`, { message: e.message });
      }

      const uploadDir = path.join(__dirname, '../../uploads', orgId.toString());
      try {
        await fs.promises.access(uploadDir);
        await fs.promises.rm(uploadDir, { recursive: true, force: true });
      } catch {
        // Pasta já inexistente — ok
      }

      try {
        await Organization.findByIdAndDelete(orgId);
        logger.info(`[offboarding] Org excluída definitivamente org=${orgId} name="${org.name}"`);
      } catch (e) {
        logger.error(`[offboarding] Erro ao deletar org=${orgId}:`, { message: e.message });
      }

      if (org.email) {
        await sendOffboardingDeletedEmail(org.email, org.name).catch(e =>
          logger.error(`[offboarding] Erro email exclusao org=${orgId}:`, { message: e.message })
        );
      }
      deleted++;
    } else if (daysLeft <= WARN_DAYS) {
      // Dentro da janela de aviso
      if (org.email) {
        await sendOffboardingWarningEmail(org.email, org.name, daysLeft).catch(e =>
          logger.error(`[offboarding] Erro email aviso org=${org._id}:`, { message: e.message })
        );
      }
      logger.info(`[offboarding] Aviso enviado org=${org._id} name="${org.name}" daysLeft=${daysLeft}`);
      warned++;
    }
  }

  logger.info(`[offboarding] Rodada concluída: warned=${warned} deleted=${deleted}`);
  return { warned, deleted };
}

module.exports = { checkOffboarding };
