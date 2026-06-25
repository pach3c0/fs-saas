// Agente IA (somente leitura) do SaaS Admin — chat com ferramentas read-only
// sobre o toolkit de operação. Multi-provider via Vercel AI SDK; as IAs e suas
// chaves são gerenciadas pelo superadmin no painel (model AgentConfig).
const express = require('express');
const router = express.Router();
const { streamText, stepCountIs } = require('ai');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { describeEnv, AgentConfigError } = require('../services/aiProvider');
const { resolveAgentModel, computeCost } = require('../services/agentModel');
const { tools } = require('../services/agentTools');
const { proposeTools, executeAction } = require('../services/agentActions');
const AgentConfig = require('../models/AgentConfig');
const AgentDigest = require('../models/AgentDigest');
const AgentSettings = require('../models/AgentSettings');
const agentDigest = require('../utils/agentDigest');
const { encrypt } = require('../utils/secretBox');

const PROVIDERS = ['anthropic', 'openai', 'google', 'openai-compatible'];

const SYSTEM_PROMPT = `Você é o assistente de operação do CliqueZoom — uma plataforma SaaS onde fotógrafos (organizações/tenants) criam galerias e seleções para seus clientes. Você atende o SUPERADMIN da plataforma (o dono), ajudando a operar tudo: investigar erros, entender métricas, ver a jornada dos fotógrafos e identificar risco de churn.

POSTURA — LEITURA + AÇÕES CONFIRMADAS:
- Para CONSULTAR, use as ferramentas de leitura à vontade.
- Você pode PROPOR um conjunto restrito de ações de superadmin: aprovar/ativar uma org (proposeApproveOrg) e alterar o plano (proposeChangePlan). Essas ferramentas NÃO executam nada — elas preparam uma proposta que aparece como um CARTÃO DE CONFIRMAÇÃO para o superadmin. A ação só acontece quando ELE clica "Confirmar".
- NUNCA diga que a ação foi feita/aplicada/concluída. Diga que PREPAROU a proposta e peça para o superadmin confirmar no cartão abaixo.
- Só proponha uma ação quando o usuário pedir EXPLICITAMENTE para executá-la (ex.: "aprova a org X", "muda o plano da Y pra pro"). Em perguntas analíticas, apenas responda — não proponha nada.
- Qualquer outra ação (excluir, reenviar e-mail, mudar limites, impersonar, mover p/ lixeira) continua manual no painel — explique onde fazer.

DADOS DISPONÍVEIS (via ferramentas):
- getPlatformOverview: totais e saúde da plataforma. "Org em risco" = dias sem atividade registrada (amarelo ≥14d, vermelho ≥30d).
- listErrors: erros/avisos (backend + frontend). listEmails: envios de e-mail (falhas primeiro).
- findOrgs: localizar uma org. getOrgDiagnostics: raio-x de uma org. getOrgJourney: linha do tempo do fotógrafo.
- getAuditLog: ações do superadmin. getSystemStatus: Mongo, schedulers, processo.
- getBusinessMetrics: planos, status de assinatura e MRR. ATENÇÃO: V1 não cobra de verdade — o MRR é POTENCIAL/teórico (preço do plano × assinaturas pagas ativas), não receita real; deixe isso claro ao responder.
- getDomains: domínios personalizados (pendentes × verificados).
- getIntegrationsAdoption: quem ligou Google Analytics / Meta Pixel.
- getPendingTestimonials: depoimentos de clientes aguardando aprovação do fotógrafo.
- getSalesOverview: motor de venda de FOTO EXTRA dos fotógrafos (cupons emitidos/resgatados, pedidos pendentes). NÃO é receita da plataforma — é a venda do fotógrafo ao cliente dele.

COMO RESPONDER:
- Use as ferramentas para buscar dados reais antes de responder — não invente números nem nomes.
- Para localizar uma org pelo nome, use findOrgs primeiro e depois o slug nas demais ferramentas.
- Cite números e nomes concretos (org, slug, idleDays, contadores). Seja direto e objetivo.
- Formate a resposta em Markdown quando ajudar a leitura: **negrito** para destaques, listas e TABELAS para comparações/rankings.
- Responda sempre em português do Brasil. Datas em formato legível (pt-BR).
- Não confunda MRR (potencial, da plataforma) com o motor de vendas (foto extra, do fotógrafo). São coisas diferentes.
- Se uma ferramenta retornar { error }, explique o que faltou (ex.: org não encontrada) em vez de inventar.`;

// View pública (mascarada) de uma config — nunca expõe a chave.
const maskCfg = (c) => ({
  id: String(c._id), provider: c.provider, label: c.label, model: c.model,
  baseURL: c.baseURL || null, apiKeyLast4: c.apiKeyLast4 || null,
  priceInput: c.priceInput ?? null, priceOutput: c.priceOutput ?? null, isActive: !!c.isActive
});

// Normaliza uma tarifa opcional (US$/milhão de tokens) vinda do form.
const parsePrice = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-20);
}

// ============================================================================
// GERENCIAMENTO DE IAs (CRUD) — superadmin
// ============================================================================

// Lista as IAs cadastradas (mascaradas) + descritor do .env como fallback.
router.get('/admin/saas/agent/providers', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const list = await AgentConfig.find().sort({ createdAt: 1 }).lean();
    res.json({ success: true, providers: list.map(maskCfg), envFallback: describeEnv() });
  } catch (e) {
    req.logger.error('Agente: erro ao listar providers', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

// Cadastra uma IA.
router.post('/admin/saas/agent/providers', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { provider, label, model, baseURL, apiKey, isActive, priceInput, priceOutput } = req.body || {};
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ success: false, error: 'Provider inválido.' });
    if (!label || !model || !apiKey) return res.status(400).json({ success: false, error: 'Preencha rótulo, modelo e chave.' });
    if (provider === 'openai-compatible' && !baseURL) return res.status(400).json({ success: false, error: 'baseURL é obrigatório para openai-compatible.' });

    const total = await AgentConfig.countDocuments();
    const makeActive = isActive === true || total === 0; // primeira IA vira ativa automaticamente
    if (makeActive) await AgentConfig.updateMany({}, { isActive: false });

    const doc = await AgentConfig.create({
      provider, label: String(label).slice(0, 60), model: String(model).slice(0, 120),
      baseURL: provider === 'openai-compatible' ? String(baseURL).slice(0, 300) : undefined,
      apiKeyEnc: encrypt(apiKey), apiKeyLast4: String(apiKey).slice(-4),
      priceInput: parsePrice(priceInput), priceOutput: parsePrice(priceOutput),
      isActive: makeActive
    });
    res.json({ success: true, provider: maskCfg(doc) });
  } catch (e) {
    req.logger.error('Agente: erro ao criar provider', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

// Edita uma IA. A chave só é trocada se vier um apiKey novo (write-only).
router.put('/admin/saas/agent/providers/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const cfg = await AgentConfig.findById(req.params.id);
    if (!cfg) return res.status(404).json({ success: false, error: 'IA não encontrada.' });
    const { provider, label, model, baseURL, apiKey, priceInput, priceOutput } = req.body || {};
    if (provider && PROVIDERS.includes(provider)) cfg.provider = provider;
    if (label) cfg.label = String(label).slice(0, 60);
    if (model) cfg.model = String(model).slice(0, 120);
    if (typeof baseURL === 'string') cfg.baseURL = baseURL.slice(0, 300) || undefined;
    if (apiKey) { cfg.apiKeyEnc = encrypt(apiKey); cfg.apiKeyLast4 = String(apiKey).slice(-4); }
    if (priceInput !== undefined) cfg.priceInput = parsePrice(priceInput);
    if (priceOutput !== undefined) cfg.priceOutput = parsePrice(priceOutput);
    if (cfg.provider === 'openai-compatible' && !cfg.baseURL) return res.status(400).json({ success: false, error: 'baseURL é obrigatório para openai-compatible.' });
    await cfg.save();
    res.json({ success: true, provider: maskCfg(cfg) });
  } catch (e) {
    req.logger.error('Agente: erro ao editar provider', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

// Define a IA ativa (default do agente).
router.put('/admin/saas/agent/providers/:id/activate', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const cfg = await AgentConfig.findById(req.params.id);
    if (!cfg) return res.status(404).json({ success: false, error: 'IA não encontrada.' });
    await AgentConfig.updateMany({}, { isActive: false });
    cfg.isActive = true;
    await cfg.save();
    res.json({ success: true, provider: maskCfg(cfg) });
  } catch (e) {
    req.logger.error('Agente: erro ao ativar provider', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

// Remove uma IA. Se era a ativa, promove a mais antiga restante.
router.delete('/admin/saas/agent/providers/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const cfg = await AgentConfig.findById(req.params.id);
    if (!cfg) return res.status(404).json({ success: false, error: 'IA não encontrada.' });
    const wasActive = cfg.isActive;
    await cfg.deleteOne();
    if (wasActive) {
      const next = await AgentConfig.findOne().sort({ createdAt: 1 });
      if (next) { next.isActive = true; await next.save(); }
    }
    res.json({ success: true });
  } catch (e) {
    req.logger.error('Agente: erro ao remover provider', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

// ============================================================================
// CHAT
// ============================================================================

// Descritor da IA ativa (cabeçalho do chat).
router.get('/admin/saas/agent/info', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const active = await AgentConfig.findOne({ isActive: true }).lean();
    if (active) return res.json({ success: true, active: { provider: active.provider, model: active.model, label: active.label, id: String(active._id) } });
    res.json({ success: true, active: describeEnv() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Chat: stream NDJSON ({t:'text',v} | {t:'tool',name} | {t:'error',v}).
router.post('/admin/saas/agent/chat', authenticateToken, requireSuperadmin, async (req, res) => {
  let resolved;
  try {
    resolved = await resolveAgentModel(req.body?.providerId);
  } catch (e) {
    if (e instanceof AgentConfigError) return res.status(503).json({ success: false, error: e.message });
    req.logger.error('Agente: falha ao resolver modelo', { error: e.message });
    return res.status(500).json({ success: false, error: 'Erro ao carregar a IA configurada.' });
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (!messages.length) return res.status(400).json({ success: false, error: 'Histórico de mensagens vazio.' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const result = streamText({
      model: resolved.model,
      system: SYSTEM_PROMPT,
      messages,
      tools: { ...tools, ...proposeTools }, // leitura + propor ações (executar é fora da LLM)
      stopWhen: stepCountIs(8),
      maxOutputTokens: 2000
    });

    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        // fullStream (TextStreamPart) usa .text; .delta é fallback de versão
        const v = part.text ?? part.delta;
        if (typeof v === 'string' && v) res.write(JSON.stringify({ t: 'text', v }) + '\n');
      } else if (part.type === 'tool-call') {
        res.write(JSON.stringify({ t: 'tool', name: part.toolName }) + '\n');
      } else if (part.type === 'tool-result') {
        // uma propose tool devolveu um descritor → vira cartão de confirmação no front
        const out = part.output;
        if (out && out.proposal) res.write(JSON.stringify({ t: 'action', action: out.proposal }) + '\n');
      } else if (part.type === 'error') {
        req.logger.error('Agente IA: erro no stream', { error: String(part.error?.message || part.error) });
        res.write(JSON.stringify({ t: 'error', v: 'Falha ao consultar a IA (verifique a chave/modelo).' }) + '\n');
      }
    }

    // Uso/custo da conversa (somatório de todos os steps). Custo só se a IA tiver tarifa cadastrada.
    try {
      const usage = await result.totalUsage;
      if (usage) {
        const cost = computeCost(usage, resolved.priceInput, resolved.priceOutput);
        res.write(JSON.stringify({
          t: 'usage',
          input: usage.inputTokens ?? null,
          output: usage.outputTokens ?? null,
          total: usage.totalTokens ?? null,
          cost
        }) + '\n');
      }
    } catch (_) { /* usage é best-effort, não quebra o chat */ }

    res.end();
  } catch (e) {
    req.logger.error('Agente IA: falha', { error: e.message });
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Erro interno do agente.' });
    else { res.write(JSON.stringify({ t: 'error', v: 'Erro interno do agente.' }) + '\n'); res.end(); }
  }
});

// Executa uma ação proposta pelo agente. Disparada SÓ pelo clique "Confirmar" do
// superadmin no cartão — nunca pela LLM. Revalida tudo server-side e audita.
router.post('/admin/saas/agent/action/execute', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { type, orgId, params } = req.body || {};
    const result = await executeAction(req, { type, orgId, params });
    if (result.error) return res.status(result.status || 400).json({ success: false, error: result.error });
    res.json({ success: true, message: result.message, noChange: !!result.noChange });
  } catch (e) {
    req.logger.error('Agente: erro ao executar ação', { error: e.message, type: req.body?.type });
    res.status(500).json({ success: false, error: 'Erro ao executar a ação.' });
  }
});

// ============================================================================
// DIGEST PROATIVO + CONFIGURAÇÕES
// ============================================================================

const settingsView = (s) => ({
  digestEnabled: s.digestEnabled, digestFrequency: s.digestFrequency,
  digestEmail: s.digestEmail, lastDigestAt: s.lastDigestAt
});

// Lê as configurações do digest (singleton).
router.get('/admin/saas/agent/settings', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const s = await AgentSettings.getSingleton();
    res.json({ success: true, settings: settingsView(s) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Atualiza as configurações do digest.
router.put('/admin/saas/agent/settings', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const s = await AgentSettings.getSingleton();
    const { digestEnabled, digestFrequency, digestEmail } = req.body || {};
    if (typeof digestEnabled === 'boolean') s.digestEnabled = digestEnabled;
    if (digestFrequency === 'daily' || digestFrequency === 'weekly') s.digestFrequency = digestFrequency;
    if (typeof digestEmail === 'boolean') s.digestEmail = digestEmail;
    s.updatedAt = new Date();
    await s.save();
    res.json({ success: true, settings: settingsView(s) });
  } catch (e) {
    req.logger.error('Agente: erro ao salvar settings', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

const digestView = (d) => ({
  id: String(d._id), period: d.period, trigger: d.trigger,
  text: d.text, emailedTo: d.emailedTo, createdAt: d.createdAt
});

// Lista os resumos gerados (recentes primeiro).
router.get('/admin/saas/agent/digests', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const digests = await AgentDigest.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, digests: digests.map(digestView) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Gera um resumo agora (sob demanda). sendMail no body decide o e-mail (default: não envia).
router.post('/admin/saas/agent/digest/run', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const sendMail = req.body?.sendMail === true;
    const doc = await agentDigest.generate('manual', { sendMail });
    res.json({ success: true, digest: digestView(doc) });
  } catch (e) {
    if (e.name === 'AgentConfigError') return res.status(503).json({ success: false, error: e.message });
    req.logger.error('Agente: erro ao gerar digest', { error: e.message });
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
