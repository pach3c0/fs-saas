const ActivityEvent = require('../models/ActivityEvent');

async function trackEvent(organizationId, userId, type, meta = {}) {
  try {
    // Fire-and-forget: não aguardar a escrita no banco
    // Garante que falha em atividade não quebre o fluxo principal
    ActivityEvent.create({
      organizationId,
      userId,
      type,
      meta,
      at: new Date()
    }).catch(err => {
      // Silent fail — log mas não propaga
      console.error('[ActivityTracker] Erro ao registrar evento:', { type, error: err.message });
    });
  } catch (error) {
    // Catch da Promise que não aguardamos
    console.error('[ActivityTracker] Erro ao trackEvent:', error.message);
  }
}

module.exports = { trackEvent };
