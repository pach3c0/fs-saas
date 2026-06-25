// Agente IA (somente leitura) do SaaS Admin — chat com ferramentas read-only
// sobre o toolkit de operação (erros, e-mails, jornada, métricas, sistema).
// Provider-agnóstico via Vercel AI SDK (Anthropic default; troca por env).
const express = require('express');
const router = express.Router();
const { streamText, stepCountIs } = require('ai');
const { authenticateToken, requireSuperadmin } = require('../middleware/auth');
const { getModel, describeProvider, AgentConfigError } = require('../services/aiProvider');
const { tools } = require('../services/agentTools');

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

// Saneia o histórico vindo do front: só user/assistant com content string.
function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }))
    .slice(-20); // só os últimos 20 turnos
}

// Info do provider/modelo ativo (cabeçalho do chat).
router.get('/admin/saas/agent/info', authenticateToken, requireSuperadmin, (req, res) => {
  res.json({ success: true, ...describeProvider() });
});

// Chat: stream NDJSON ({t:'text',v} | {t:'tool',name} | {t:'error',v}).
router.post('/admin/saas/agent/chat', authenticateToken, requireSuperadmin, async (req, res) => {
  let model;
  try {
    model = getModel();
  } catch (e) {
    if (e instanceof AgentConfigError) return res.status(503).json({ success: false, error: e.message });
    throw e;
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (!messages.length) return res.status(400).json({ success: false, error: 'Histórico de mensagens vazio.' });

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no'); // não bufferizar no proxy

  try {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages,
      tools,
      stopWhen: stepCountIs(8), // teto de iterações de ferramenta
      maxOutputTokens: 2000
    });

    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') {
        res.write(JSON.stringify({ t: 'text', v: part.delta }) + '\n');
      } else if (part.type === 'tool-call') {
        res.write(JSON.stringify({ t: 'tool', name: part.toolName }) + '\n');
      } else if (part.type === 'error') {
        req.logger.error('Agente IA: erro no stream', { error: String(part.error?.message || part.error) });
        res.write(JSON.stringify({ t: 'error', v: 'Falha ao consultar a IA.' }) + '\n');
      }
    }
    res.end();
  } catch (e) {
    req.logger.error('Agente IA: falha', { error: e.message });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Erro interno do agente.' });
    } else {
      res.write(JSON.stringify({ t: 'error', v: 'Erro interno do agente.' }) + '\n');
      res.end();
    }
  }
});

module.exports = router;
