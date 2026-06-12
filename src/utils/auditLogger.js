const mongoose = require('mongoose');

// Registra ação do superadmin no AuditLog — fire-and-forget, nunca quebra
// o fluxo principal (mesmo padrão do activityTracker).
function audit(req, action, targetOrgId, meta = {}) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const AuditLog = require('../models/AuditLog');
    AuditLog.create({
      adminUserId: req.user?.userId,
      action,
      targetOrgId: targetOrgId || undefined,
      meta,
      ip: req.ip,
      at: new Date()
    }).catch(err => {
      console.error('[AuditLog] falha ao gravar:', { action, error: err.message });
    });
  } catch (error) {
    console.error('[AuditLog] erro interno:', error.message);
  }
}

module.exports = { audit };
