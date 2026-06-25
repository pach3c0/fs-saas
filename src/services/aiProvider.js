// Camada provider-agnóstica do agente do SaaS Admin.
// A configuração ativa vem do banco (model AgentConfig, gerenciado no painel);
// o .env é apenas fallback quando não há nenhuma config cadastrada.
const { createAnthropic } = require('@ai-sdk/anthropic');
const { createOpenAI } = require('@ai-sdk/openai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

// Erro de configuração (chave/provider ausente) — a rota converte em HTTP 503.
class AgentConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AgentConfigError';
  }
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-8';

// Constrói o modelo do AI SDK a partir de uma config já resolvida (chave em texto).
function buildModel({ provider, model, apiKey, baseURL }) {
  if (!apiKey) throw new AgentConfigError('Chave de API ausente para o provedor selecionado.');
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model || DEFAULT_ANTHROPIC_MODEL);
    case 'openai':
      return createOpenAI({ apiKey })(model);
    case 'openai-compatible':
      if (!baseURL) throw new AgentConfigError('baseURL é obrigatório para provider openai-compatible.');
      return createOpenAI({ apiKey, baseURL })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(model);
    default:
      throw new AgentConfigError(`Provider inválido: "${provider}" (use anthropic | openai | google | openai-compatible)`);
  }
}

// Fallback: lê provider/modelo/chave do .env (compatibilidade com a 1ª versão).
function getModelFromEnv() {
  const provider = (process.env.SAAS_AGENT_PROVIDER || 'anthropic').toLowerCase();
  const model = process.env.SAAS_AGENT_MODEL || (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : null);
  const keyByProvider = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    'openai-compatible': process.env.OPENAI_API_KEY,
    google: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  };
  const apiKey = keyByProvider[provider];
  if (!apiKey) throw new AgentConfigError('Nenhuma IA configurada. Cadastre uma no painel (⚙️ IAs) ou defina a chave no .env.');
  if (provider !== 'anthropic' && !model) throw new AgentConfigError(`Defina SAAS_AGENT_MODEL para o provider ${provider}.`);
  return buildModel({ provider, model, apiKey, baseURL: process.env.SAAS_AGENT_BASE_URL });
}

function describeEnv() {
  const provider = (process.env.SAAS_AGENT_PROVIDER || 'anthropic').toLowerCase();
  const model = process.env.SAAS_AGENT_MODEL || (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : '?');
  return { provider, model, label: '.env (fallback)', fromEnv: true };
}

module.exports = { buildModel, getModelFromEnv, describeEnv, AgentConfigError };
