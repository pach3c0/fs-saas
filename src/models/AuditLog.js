const mongoose = require('mongoose');

// Auditoria de ações do superadmin sobre as organizações.
// SEM TTL — auditoria é permanente (volume baixíssimo: só ações manuais).
const auditLogSchema = new mongoose.Schema({
  adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String,
    required: true,
    index: true
    // 'org_approve' | 'org_deactivate' | 'org_trash' | 'org_restore' | 'org_delete'
    // 'plan_change' | 'limits_change' | 'site_reset' | 'plan_limits_change' | 'impersonate'
  },
  targetOrgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: String,
  at: { type: Date, default: Date.now, index: true }
}, { timestamps: false });

module.exports = mongoose.model('AuditLog', auditLogSchema);
