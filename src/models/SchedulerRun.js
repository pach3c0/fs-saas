const mongoose = require('mongoose');

// Estado da última execução de cada scheduler — 1 doc por scheduler (upsert).
// Persistido em Mongo (não em memória) porque em cluster PM2 os schedulers
// rodam só no worker 0, mas o endpoint /admin/saas/system pode ser servido
// por qualquer worker.
const schedulerRunSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  lastStartAt: Date,
  lastEndAt: Date,
  lastStatus: { type: String, enum: ['ok', 'error'] },
  lastError: String,
  lastDurationMs: Number,
  runCount: { type: Number, default: 0 }
}, { timestamps: false });

module.exports = mongoose.model('SchedulerRun', schedulerRunSchema);
