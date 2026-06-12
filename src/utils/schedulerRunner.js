const mongoose = require('mongoose');
const logger = require('./logger');

// Execução monitorada de schedulers: mantém o lock anti-sobreposição do antigo
// safeInterval de server.js e persiste a última execução no SchedulerRun
// (fire-and-forget — a telemetria nunca quebra nem atrasa o scheduler).

function _persistRun(name, startAt, error) {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const SchedulerRun = require('../models/SchedulerRun');
    const endAt = new Date();
    SchedulerRun.findOneAndUpdate(
      { name },
      {
        $set: {
          lastStartAt: startAt,
          lastEndAt: endAt,
          lastStatus: error ? 'error' : 'ok',
          lastError: error ? String(error.message || error).slice(0, 1000) : '',
          lastDurationMs: endAt - startAt
        },
        $inc: { runCount: 1 }
      },
      { upsert: true }
    ).catch(err => {
      console.error('[SchedulerRun] falha ao persistir:', { name, error: err.message });
    });
  } catch (err) {
    console.error('[SchedulerRun] erro interno:', err.message);
  }
}

// Executa fn com lock + telemetria. Para schedulers fora do setInterval
// (ex.: anniversaryAutomator via setTimeout recursivo).
async function recordRun(name, fn) {
  const startAt = new Date();
  try {
    await fn();
    _persistRun(name, startAt, null);
  } catch (e) {
    logger.error(`[scheduler:${name}] ${e.message}`, { stack: e.stack });
    _persistRun(name, startAt, e);
  }
}

// Evita execuções sobrepostas: se a rodada anterior ainda está em curso, pula o tick.
// Roda imediatamente no boot e depois a cada `ms`.
function safeInterval(name, fn, ms) {
  let isRunning = false;
  const run = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await recordRun(name, fn);
    } finally {
      isRunning = false;
    }
  };
  run();
  return setInterval(run, ms);
}

module.exports = { safeInterval, recordRun };
