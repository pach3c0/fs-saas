// Agente IA (somente leitura) do SaaS Admin — chat com ferramentas read-only
// sobre o toolkit de operação. Multi-provider via Vercel AI SDK; as IAs e suas
// chaves são gerenciadas pelo superadmin no painel (model AgentConfig).
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { streamText, stepCountIs } = require('ai');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { buildModel, getModelFromEnv, describeEnv, AgentConfigError } = require('../services/aiProvider');
const { tools } = require('../services/agentTools');
const AgentConfig = require('../models/AgentConfig');
const { encrypt, decrypt } = require('../utils/secretBox');

const PROVIDERS = ['anthropic', 'openai', 'google', 'openai-compatible'];

const SYSTEM_PROMPT = `Você é o assistente de operação do CliqueZoom — uma plataforma SaaS onde fotógrafos (organizações/tenants) criam galerias e seleções para seus clientes. Você atende o SUPERADMIN da plataforma (o dono), ajudando a operar tudo: investigar erros, entender métricas, ver a jornada dos fotógrafos e identificar risco de churn.

POSTURA — SOMENTE LEITURA:
- Você só consulta dados via ferramentas. Você NUNCA executa ações de escrita (não aprova org, não muda plano, não envia e-mail, não impersona). Se pedirem uma ação, explique que sua função é só análise e indique a aba/botão do painel onde isso é feito manualmente.

DADOS DISPONÍVEIS (via ferramentas):
- getPlatformOverview: totais e saúde da plataforma. "Org em risco" = dias sem atividade registrada (amarelo ≥14d, vermelho ≥30d).
- listErrors: erros/avisos (backend + frontend). listEmails: envios de e-mail (falhas primeiro).
- findOrgs: localizar uma org. getOrgDiagnostics: raio-x de uma org. getOrgJourney: linha do tempo do fotógrafo.
- getAuditLog: ações do superadmin. getSystemStatus: Mongo, schedulers, processo.

COMO RESPONDER:
- Use as ferramentas para buscar dados reais antes de responder — não invente números nem nomes.
- Para localizar uma org pelo nome, use findOrgs primeiro e depois o slug nas demais ferramentas.
- Cite números e nomes concretos (org, slug, idleDays, contadores). Seja direto e objetivo.
- Responda sempre em português do Brasil. Datas em formato legível (pt-BR).
- Se uma ferramenta retornar { error }, explique o que faltou (ex.: org não encontrada) em vez de inventar.`;

// ── Resolução do modelo: config do banco (por id ou ativa) → fallback env ────
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
      descriptor: { provider: cfg.provider, model: cfg.model, label: cfg.label, id: String(cfg._id) }
    };
  }
  return { model: getModelFromEnv(), descriptor: describeEnv() };
}

// View pública (mascarada) de uma config — nunca expõe a chave.
const maskCfg = (c) => ({
  id: String(c._id), provider: c.provider, label: c.label, model: c.model,
  baseURL: c.baseURL || null, apiKeyLast4: c.apiKeyLast4 || null, isActive: !!c.isActive
});

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
    const { provider, label, model, baseURL, apiKey, isActive } = req.body || {};
    if (!PROVIDERS.includes(provider)) return res.status(400).json({ success: false, error: 'Provider inválido.' });
    if (!label || !model || !apiKey) return res.status(400).json({ success: false, error: 'Preencha rótulo, modelo e chave.' });
    if (provider === 'openai-compatible' && !baseURL) return res.status(400).json({ success: false, error: 'baseURL é obrigatório para openai-compatible.' });

    const total = await AgentConfig.countDocuments();
    const makeActive = isActive === true || total === 0; // primeira IA vira ativa automaticamente
    if (makeActive) await AgentConfig.updateMany({}, { isActive: false });

    const doc = await AgentConfig.create({
      provider, label: String(label).slice(0, 60), model: String(model).slice(0, 120),
      baseURL: provider === 'openai-compatible' ? String(baseURL).slice(0, 300) : undefined,
      apiKeyEnc: encrypt(apiKey), apiKeyLast4: String(apiKey).slice(-4), isActive: makeActive
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
    const { provider, label, model, baseURL, apiKey } = req.body || {};
    if (provider && PROVIDERS.includes(provider)) cfg.provider = provider;
    if (label) cfg.label = String(label).slice(0, 60);
    if (model) cfg.model = String(model).slice(0, 120);
    if (typeof baseURL === 'string') cfg.baseURL = baseURL.slice(0, 300) || undefined;
    if (apiKey) { cfg.apiKeyEnc = encrypt(apiKey); cfg.apiKeyLast4 = String(apiKey).slice(-4); }
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
      tools,
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
      } else if (part.type === 'error') {
        req.logger.error('Agente IA: erro no stream', { error: String(part.error?.message || part.error) });
        res.write(JSON.stringify({ t: 'error', v: 'Falha ao consultar a IA (verifique a chave/modelo).' }) + '\n');
      }
    }
    res.end();
  } catch (e) {
    req.logger.error('Agente IA: falha', { error: e.message });
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Erro interno do agente.' });
    else { res.write(JSON.stringify({ t: 'error', v: 'Erro interno do agente.' }) + '\n'); res.end(); }
  }
});

module.exports = router;
