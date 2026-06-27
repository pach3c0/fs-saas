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

// Variante para ações AUTOMÁTICAS do sistema (sem admin/req) — ex.: reversão de plano
// disparada pelo webhook do Mercado Pago (estorno/chargeback/cancelamento). Grava no
// MESMO AuditLog (permanente, sem TTL) com adminUserId=null e meta.system=true.
function auditSystem(action, targetOrgId, meta = {}) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const AuditLog = require('../models/AuditLog');
    AuditLog.create({
      adminUserId: null,
      action,
      targetOrgId: targetOrgId || undefined,
      meta: { ...meta, system: true },
      at: new Date()
    }).catch(err => {
      console.error('[AuditLog] falha ao gravar (system):', { action, error: err.message });
    });
  } catch (error) {
    console.error('[AuditLog] erro interno (system):', error.message);
  }
}

module.exports = { audit, auditSystem };
