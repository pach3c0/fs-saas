// Resolve qual IA o agente usa (config do banco por id/ativa → fallback .env) e
// calcula custo a partir das tarifas opcionais da config. Compartilhado pela
// rota de chat e pelo gerador de digest.
const mongoose = require('mongoose');
const AgentConfig = require('../models/AgentConfig');
const { decrypt } = require('../utils/secretBox');
const { buildModel, getModelFromEnv, describeEnv } = require('./aiProvider');

async function resolveAgentModel(providerId) {
  let cfg = null;
  if (providerId && mongoose.Types.ObjectId.isValid(providerId)) {
    cfg = await AgentConfig.findById(providerId).lean();
  }
  if (!cfg) cfg = await AgentConfig.findOne({ isActive: true }).lean();
  if (cfg) {
    const apiKey = decrypt(cfg.apiKeyEnc);
    return {
      model: buildModel({ provider: cfg.provider, model: cfg.model, apiKey, baseURL: cfg.baseURL }),
      descriptor: { provider: cfg.provider, model: cfg.model, label: cfg.label, id: String(cfg._id) },
      priceInput: cfg.priceInput ?? null,
      priceOutput: cfg.priceOutput ?? null
    };
  }
  return { model: getModelFromEnv(), descriptor: describeEnv(), priceInput: null, priceOutput: null };
}

// Custo em US$ a partir do usage e das tarifas ($/milhão de tokens). null se sem tarifa.
function computeCost(usage, priceInput, priceOutput) {
  if (priceInput == null || priceOutput == null) return null;
  const inT = usage?.inputTokens || 0;
  const outT = usage?.outputTokens || 0;
  return +(inT / 1e6 * priceInput + outT / 1e6 * priceOutput).toFixed(4);
}

module.exports = { resolveAgentModel, computeCost };
