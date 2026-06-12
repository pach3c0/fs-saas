const Transport = require('winston-transport');
const mongoose = require('mongoose');

// Transport do Winston que espelha error/warn no MongoDB (model PlatformLog)
// para a aba "Eventos" do SaaS Admin. Regras de segurança:
// - callback() é chamado IMEDIATAMENTE: a escrita é fire-and-forget e nunca
//   atrasa nem quebra o caller (produção tem fotógrafa real ativa).
// - Se o Mongo não está conectado, descarta (não enfileira ops no buffer).
// - Circuit breaker: após 5 falhas seguidas, pausa 60s — evita o loop
//   "Mongo caiu → logger.error → transport → Mongo caiu → ...".
// - Erros internos vão para console.error, NUNCA para o logger.

const MAX_MESSAGE = 2000;
const MAX_STACK = 4000;
const MAX_META = 2000;
const BREAKER_LIMIT = 5;
const BREAKER_PAUSE_MS = 60000;

// Ruído sem valor de diagnóstico: 401 (senha errada/token expirado) e 404
// (bots e URLs quebradas) — o honey pot já tem a aba Segurança própria.
const NOISE_STATUS = new Set([401, 404]);

class MongoLogTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this._failures = 0;
    this._pausedUntil = 0;
  }

  log(info, callback) {
    callback();

    try {
      if (info.level !== 'error' && info.level !== 'warn') return;
      if (Date.now() < this._pausedUntil) return;
      if (mongoose.connection.readyState !== 1) return;
      if (info.level === 'warn' && NOISE_STATUS.has(info.status)) return;

      // Lazy require: o logger é criado antes dos models/conexão no boot
      const PlatformLog = require('../models/PlatformLog');

      const { level, message, stack, orgId, userId, requestId, url, status,
              timestamp, service, ...rest } = info;

      let meta = {};
      try {
        const json = JSON.stringify(rest);
        if (json && json !== '{}') {
          meta = json.length > MAX_META ? { _truncated: json.slice(0, MAX_META) } : rest;
        }
      } catch { /* meta circular — descarta */ }

      const doc = {
        level,
        message: String(message || '').slice(0, MAX_MESSAGE),
        source: 'backend',
        requestId,
        userId: userId ? String(userId) : undefined,
        stack: stack ? String(stack).slice(0, MAX_STACK) : undefined,
        url,
        status: typeof status === 'number' ? status : undefined,
        meta,
        at: new Date()
      };
      if (orgId && mongoose.Types.ObjectId.isValid(orgId)) {
        doc.organizationId = orgId;
      }

      PlatformLog.create(doc).then(() => {
        this._failures = 0;
      }).catch((err) => {
        this._failures++;
        if (this._failures >= BREAKER_LIMIT) {
          this._pausedUntil = Date.now() + BREAKER_PAUSE_MS;
          this._failures = 0;
          console.error('[MongoLogTransport] circuit breaker aberto por 60s:', err.message);
        }
      });
    } catch (err) {
      console.error('[MongoLogTransport] erro interno:', err.message);
    }
  }
}

module.exports = MongoLogTransport;
