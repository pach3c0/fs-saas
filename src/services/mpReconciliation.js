// Conciliação READ-ONLY do MRR: compara o que PROJETAMOS (nossos registros, do banco)
// com o valor recorrente que o Mercado Pago TEM EM FICHA por assinatura (PreApproval).
// Nunca escreve nada — nem no MP, nem no banco. Reusa o helper exportado `getPreapproval`
// (não recria client do MP). "Caixa recebido de fato" é Fase 2 (livro-caixa via webhooks).

const Subscription = require('../models/Subscription');
const { effectiveMonthlyCents } = require('./subscriptionPricing');
const { getPreapproval } = require('../middleware/mercadopago');
const logger = require('../utils/logger');

const CALL_TIMEOUT_MS = 4000;    // teto por chamada ao MP (uma assinatura lenta não trava o lote)
const CONCURRENCY     = 4;       // chamadas simultâneas ao MP
const CACHE_TTL_MS    = 30 * 1000; // micro-cache anti-stampede (segue "ao vivo", protege a API)

// Status do MP → rótulo PT-BR + se é o estado saudável (cobrando de fato).
const MP_STATUS = {
  authorized: { label: 'Ativa no MP',            healthy: true  },
  paused:     { label: 'Pausada (inadimplente)', healthy: false },
  cancelled:  { label: 'Cancelada no MP',        healthy: false },
  pending:    { label: 'Pendente no MP',         healthy: false },
};

let _cache = { at: 0, payload: null };

// MP só está configurado se há token — sem token, o painel mostra aviso (não erro).
function mpConfigured() {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

// Promise.race com timeout: uma PreApproval lenta vira `mp_error`, não trava a conciliação.
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout ${ms}ms (${label})`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Pool simples de concorrência limitada, preservando a ordem do array de entrada.
async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return out;
}

function _cents(n) { return Math.round(Number(n || 0) * 100); }

// Concilia UMA assinatura: nossa projeção × o que o MP tem em ficha (read-only).
async function reconcileOrg(sub) {
  const org = sub.organizationId || {};
  const projectedCents = effectiveMonthlyCents(sub);
  const base = {
    orgId: String(org._id || ''),
    orgName: org.name || '(sem nome)',
    orgSlug: org.slug || '',
    plan: sub.plan,
    ourStatus: sub.status,
    projectedCents,
  };

  // Sem assinatura viva no MP: legado / override / pago por fora. NÃO é divergência.
  if (!sub.mpPreapprovalId) {
    return { ...base, outsideMp: true, flags: ['outside_mp'] };
  }

  try {
    const pre = await withTimeout(getPreapproval(sub.mpPreapprovalId), CALL_TIMEOUT_MS, base.orgName);
    const mpStatus = pre?.status || 'unknown';
    const mpAmountCents = _cents(pre?.auto_recurring?.transaction_amount);
    const meta = MP_STATUS[mpStatus] || { label: `MP: ${mpStatus}`, healthy: false };

    const flags = [];
    if (!meta.healthy) flags.push('status_mismatch');                          // nós contamos, MP não cobra
    if (meta.healthy && mpAmountCents !== projectedCents) flags.push('amount_mismatch'); // valor divergente

    return {
      ...base,
      mpStatus,
      mpStatusLabel: meta.label,
      mpHealthy: meta.healthy,
      mpAmountCents,
      nextPaymentDate: pre?.next_payment_date || null,
      flags,
    };
  } catch (err) {
    logger.warn(`[reconcile] falha ao ler PreApproval org=${base.orgName}: ${err.message}`);
    return { ...base, mpError: err.message, flags: ['mp_error'] };
  }
}

// Concilia TODAS as assinaturas pagas vivas (mesma população do /metrics:
// status active/past_due, não-cortesia). Devolve linhas + totais + contagens.
async function reconcilePaidSubs() {
  const reconciledAt = new Date().toISOString();

  if (!mpConfigured()) {
    return { mpConfigured: false, reconciledAt, rows: [], projectedMrrCents: 0, mpRecurringMrrCents: 0, deltaCents: 0, counts: {} };
  }

  // Micro-cache anti-stampede: reloads em janela < 30s reaproveitam (continua "ao vivo").
  if (_cache.payload && (Date.now() - _cache.at) < CACHE_TTL_MS) {
    return { ..._cache.payload, cached: true };
  }

  const subs = await Subscription.find({ status: { $in: ['active', 'past_due'] }, isCourtesy: { $ne: true } })
    .select('plan customPriceCents storageAddonPriceCents status mpPreapprovalId organizationId')
    .populate('organizationId', 'name slug')
    .lean();

  const rows = await mapLimit(subs, CONCURRENCY, reconcileOrg);

  // Projeção = soma do que projetamos para TODAS (espelha o MRR do /metrics).
  const projectedMrrCents = rows.reduce((s, r) => s + (r.projectedCents || 0), 0);
  // Recorrente no MP = só o que o MP de fato cobra (assinaturas saudáveis); o resto é divergência.
  const mpRecurringMrrCents = rows.reduce((s, r) => s + (r.mpHealthy ? (r.mpAmountCents || 0) : 0), 0);
  const deltaCents = mpRecurringMrrCents - projectedMrrCents;

  const has = (r, f) => Array.isArray(r.flags) && r.flags.includes(f);
  const payload = {
    mpConfigured: true,
    reconciledAt,
    rows,
    projectedMrrCents,
    mpRecurringMrrCents,
    deltaCents,
    counts: {
      total: rows.length,
      statusMismatch: rows.filter(r => has(r, 'status_mismatch')).length,
      amountMismatch: rows.filter(r => has(r, 'amount_mismatch')).length,
      outsideMp: rows.filter(r => has(r, 'outside_mp')).length,
      mpError: rows.filter(r => has(r, 'mp_error')).length,
    },
  };

  _cache = { at: Date.now(), payload };
  return payload;
}

module.exports = { reconcilePaidSubs, reconcileOrg, mpConfigured };
