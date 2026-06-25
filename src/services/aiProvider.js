// Camada provider-agnóstica do agente do SaaS Admin.
// Permite trocar a IA (Anthropic / OpenAI / Google) por variável de ambiente,
// sem reescrever o agente. Anthropic é o default.
//
// .env:
//   SAAS_AGENT_PROVIDER = anthropic (default) | openai | google
//   SAAS_AGENT_MODEL    = id do modelo (default só p/ anthropic: claude-opus-4-8)
//   ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY
//   (só a chave do provider ativo precisa existir)
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

const DEFAULT_PROVIDER = 'anthropic';
const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-8';

// Devolve o modelo do AI SDK pronto para o streamText(), conforme o env.
function getModel() {
  const provider = (process.env.SAAS_AGENT_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  const model = process.env.SAAS_AGENT_MODEL || null;

  switch (provider) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new AgentConfigError('ANTHROPIC_API_KEY não configurada no .env');
      return createAnthropic({ apiKey })(model || DEFAULT_ANTHROPIC_MODEL);
    }
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new AgentConfigError('OPENAI_API_KEY não configurada no .env');
      if (!model) throw new AgentConfigError('Defina SAAS_AGENT_MODEL para o provider openai (ex.: gpt-4.1)');
      return createOpenAI({ apiKey })(model);
    }
    case 'google': {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new AgentConfigError('GOOGLE_GENERATIVE_AI_API_KEY não configurada no .env');
      if (!model) throw new AgentConfigError('Defina SAAS_AGENT_MODEL para o provider google (ex.: gemini-2.0-flash)');
      return createGoogleGenerativeAI({ apiKey })(model);
    }
    default:
      throw new AgentConfigError(`SAAS_AGENT_PROVIDER inválido: "${provider}" (use anthropic | openai | google)`);
  }
}

// Rótulo legível do provider/modelo ativo (logs e cabeçalho do chat).
function describeProvider() {
  const provider = (process.env.SAAS_AGENT_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  const model = process.env.SAAS_AGENT_MODEL || (provider === 'anthropic' ? DEFAULT_ANTHROPIC_MODEL : '?');
  return { provider, model };
}

module.exports = { getModel, describeProvider, AgentConfigError };
