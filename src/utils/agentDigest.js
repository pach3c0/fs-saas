// Digest proativo do agente: um briefing periódico de saúde da plataforma.
// Coleta os dados via as MESMAS ferramentas read-only do chat (sem duplicar query),
// pede um resumo à IA ativa, grava em AgentDigest e (opcional) manda por e-mail.
// Default desligado em AgentSettings — só roda se o superadmin habilitar no painel.
const { generateText } = require('ai');
const logger = require('./logger');
const { tools } = require('../services/agentTools');
const { resolveAgentModel } = require('../services/agentModel');
const AgentDigest = require('../models/AgentDigest');
const AgentSettings = require('../models/AgentSettings');

const DIGEST_SYSTEM = `Você é o assistente de operação do CliqueZoom (plataforma SaaS de galerias para fotógrafos). Escreva um BRIEFING curto e direto para o superadmin (o dono), em português do Brasil, a partir dos dados fornecidos. Estruture em tópicos curtos:
- 🩺 Saúde geral (orgs ativas, sessões recentes, chamados abertos).
- ⚠️ Orgs em risco (cite nome/slug e dias ocioso das que estão amarelas/vermelhas; se nenhuma, diga "nenhuma").
- 🐞 Erros (quantos nas últimas 24h; destaque os mais relevantes com a org afetada; se zero, diga "sem erros").
- 📧 E-mails (falhas de envio relevantes; se nenhuma, diga "sem falhas").
- 🛠️ Sistema (só mencione se algo estiver fora do normal: Mongo, scheduler com erro).
- 👉 Ações sugeridas (no máximo 3, concretas — qual org contatar, qual erro investigar).
Cite apenas números e nomes que aparecem nos dados. Não invente. Seja conciso (não mais que ~250 palavras). Não escreva preâmbulo nem despedida.`;

// Coleta o estado da plataforma reusando os tools read-only.
async function gather(period) {
  const hours = period === 'weekly' ? 168 : 24;
  const [overview, errors, emails, system] = await Promise.all([
    tools.getPlatformOverview.execute({}),
    tools.listErrors.execute({ hours, level: 'error', limit: 25 }),
    tools.listEmails.execute({ hours, ok: false, limit: 15 }),
    tools.getSystemStatus.execute({})
  ]);
  return { period, hours, overview, errors, emails, system };
}

// Gera um digest (trigger: 'scheduled' | 'manual'), grava e opcionalmente envia e-mail.
async function generate(trigger = 'manual', { sendMail } = {}) {
  const settings = await AgentSettings.getSingleton();
  const period = settings.digestFrequency || 'daily';
  const data = await gather(period);

  const { model } = await resolveAgentModel(); // IA ativa (banco) ou fallback .env
  const userPrompt = `Período: ${period === 'weekly' ? 'últimos 7 dias' : 'últimas 24h'}.
Dados (JSON):
${JSON.stringify(data, null, 2)}`;

  const { text } = await generateText({
    model,
    system: DIGEST_SYSTEM,
    prompt: userPrompt,
    maxOutputTokens: 1200
  });

  const briefing = (text || '').trim();
  if (!briefing) throw new Error('A IA retornou um resumo vazio.');

  let emailedTo = null;
  const wantsMail = sendMail !== undefined ? sendMail : settings.digestEmail;
  if (wantsMail) {
    try {
      emailedTo = await emailDigest(period, briefing);
    } catch (e) {
      logger.error(`[agentDigest] falha ao enviar e-mail: ${e.message}`);
    }
  }

  const doc = await AgentDigest.create({
    period, trigger, text: briefing, emailedTo
  });
  return doc;
}

// Envia o resumo por e-mail ao dono da plataforma. Retorna o destinatário.
async function emailDigest(period, briefing) {
  const { sendEmail } = require('./email');
  const to = process.env.OWNER_EMAIL || 'contato@cliquezoom.com.br';
  const titulo = period === 'weekly' ? 'Resumo semanal da plataforma' : 'Resumo diário da plataforma';
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a">
    <h2 style="margin:0 0 12px">🤖 ${titulo} — CliqueZoom</h2>
    <div style="white-space:pre-wrap;line-height:1.5;font-size:14px">${escapeHtml(briefing)}</div>
    <p style="margin-top:20px;font-size:12px;color:#888">Gerado automaticamente pelo agente de operação do SaaS Admin.</p>
  </div>`;
  await sendEmail(to, `🤖 ${titulo}`, html, { template: 'agent_digest' });
  return to;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Guarda de frequência: só gera se habilitado e se já passou a janela (24h/7d).
async function run() {
  const settings = await AgentSettings.getSingleton();
  if (!settings.digestEnabled) return;
  const period = settings.digestFrequency || 'daily';
  const minMs = (period === 'weekly' ? 7 : 1) * 24 * 60 * 60 * 1000;
  if (settings.lastDigestAt && Date.now() - new Date(settings.lastDigestAt).getTime() < minMs) return;

  await generate('scheduled');
  settings.lastDigestAt = new Date();
  settings.updatedAt = new Date();
  await settings.save();
  logger.info(`[agentDigest] resumo ${period} gerado (agendado)`);
}

module.exports = { generate, run, gather };
