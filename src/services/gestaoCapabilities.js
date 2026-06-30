// Mapa AUTORITATIVO rota(Rhyno) → capability — a CERCA real da aba Gestão (camada "a").
// Fonte: skills/mapa-cercas-gestao-rhyno-2026-06-30.md (furo #2 das cercas de plano).
//
// Esta é a 1ª metade do híbrido: validar o `redirect` ANTES de cunhar o SSO no
// gestao.js. Esconder itens do menu (GRUPOS) é só cosmético — a cerca é esta.
// A 2ª metade (camada "b": dependency no Rhyno) fecha o URL-direct dentro do iframe.
//
// REGRA DE MATCH: por SEGMENTO de rota (limite de "/"), NUNCA substring.
//   '/financial'  casa '/financial' e '/financial/dre', mas NUNCA '/financialx'.
//   '/categories' (catálogo de produtos, TODOS) é rota própria e fica de FORA daqui
//                 → não pode ser confundida com '/financial/categories' (DRE, Pro+).
// Rota sem regra = base (liberada a todos os planos). A 1ª regra que casa vence.

const { can } = require('./subscriptionPricing');

// Cada regra: { seg, cap, plan, need?, preview? }. `need` (ex.: 'full') força igualdade —
// usado no `crm`, que vale 'taste' (todos) ou 'full' (Basic+); sem `need` basta truthy.
// `preview:true` → o módulo fora do plano NÃO toma 403: o gestao.js cunha o SSO e
// devolve preview:true. O front carrega o módulo REAL (com os dados do fotógrafo) porém
// NÃO-INTERATIVO + faixa de upgrade — teaser que gera desejo no ponto de intenção.
// A trava de clique é client-side; a defesa dura (sem-escrita) é a camada (b) no Rhyno.
//
// As rotas abaixo foram CONFERIDAS contra as <Route> reais do Rhyno
// (ERP1/frontend/src/App.tsx) — não confiar só no mapa, que tinha caminhos defasados.
const GATE_RULES = [
  // ── Financeiro empresa + Estoque + relatórios financeiros (financasEmpresa, Pro+) ──
  // O cluster financeiro tem rotas DENTRO de /financial e TAMBÉM fora dele: as telas
  // /new e /trash de receivables/payables ficam em raiz própria, e DRE/fluxo de caixa
  // são rotas /reports/* separadas do índice /reports (que é só vendas/OS = base).
  { seg: '/financial',              cap: 'financasEmpresa', plan: 'Pro' }, // receivables, payables, cash, accounts, categories(DRE), payment-methods, reconciliation, :id
  { seg: '/receivables',            cap: 'financasEmpresa', plan: 'Pro' }, // /receivables/new, /receivables/trash
  { seg: '/payables',               cap: 'financasEmpresa', plan: 'Pro' }, // /payables/new, /payables/trash
  { seg: '/purchase-orders',        cap: 'financasEmpresa', plan: 'Pro' }, // Estoque / Pedidos de Compra
  { seg: '/reports/dre',            cap: 'financasEmpresa', plan: 'Pro' }, // DRE (≠ índice /reports, que é vendas/OS = base)
  { seg: '/reports/cash-flow-real', cap: 'financasEmpresa', plan: 'Pro' }, // fluxo de caixa realizado
  // ── Tarefas + Metas (tarefasMetas, Pro+) ──
  // '/tasks' NÃO é rota navegável (a TaskList mora na Home, rota base → só a camada b
  // cerca isso); a regra cobre a única rota real do cluster, /tasks/archived. /goals é rota.
  { seg: '/tasks',                  cap: 'tarefasMetas',    plan: 'Pro' }, // cobre /tasks/archived
  { seg: '/goals',                  cap: 'tarefasMetas',    plan: 'Pro' },
  // ── Importação em massa (importacaoMassa, Basic+) ──
  // Rotas reais ficam sob /settings/import/* (e /settings é base) → gateamos só esse sub-segmento.
  { seg: '/settings/import',        cap: 'importacaoMassa', plan: 'Basic' },
  // ── CRM Central (crm:'full', Basic+) ──
  // '/customers' fica de FORA (crm:'taste' = todos). leads/lead-sources/crm-event-types
  // NÃO são rotas próprias: são seções DENTRO de /crm (CRMCentral) → já cobertas por '/crm'.
  { seg: '/crm',                    cap: 'crm', need: 'full', plan: 'Basic', preview: true }, // /crm e /crm/:id — PRÉVIA (teaser) em vez de 403
  // ── Sem <Route> navegável no Rhyno hoje (IA, Google Agenda, finanças pessoais) ──
  // A feature é widget/escopo, não rota → a camada (a) (cerca por redirect) NÃO alcança;
  // o enforcement real é a camada (b) no Rhyno. Mantidas como placeholder fail-closed:
  // forjar o path apenas devolve 403, sem efeito colateral. Atualizar quando virarem rota.
  { seg: '/ai',                       cap: 'iaGestao',         plan: 'Pro' },
  { seg: '/google-calendar',          cap: 'integracaoAgenda', plan: 'Pro' },
  { seg: '/personal-finance-sharing', cap: 'financasPessoal',  plan: 'Studio' },
];

// Normaliza um `redirect` cru ANTES de casar a regra. Crítico de segurança: o
// browser/React-Router do Rhyno resolve o path DEPOIS da nossa checagem (case-insensitive,
// resolve %2F, '.', '..', barras repetidas). Se não espelharmos isso aqui, um plano Free
// passaria '/FINANCIAL', '/./financial', '//financial' ou '/financial%2Fdre' e furaria a
// cerca. Normalizamos para a MESMA forma que o destino resolve, sempre fail-closed.
function normalizePath(redirect) {
  let p = String(redirect == null ? '/dashboard' : redirect).trim();
  p = p.split('?')[0].split('#')[0];            // tira query/hash
  try { p = decodeURIComponent(p); } catch { /* path inválido → casa cru */ }
  p = p.toLowerCase();                           // rotas do Rhyno são case-insensitive
  if (!p.startsWith('/')) p = '/' + p;
  // resolve segmentos '', '.' e '..' (colapsa barras repetidas no processo)
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return '/' + out.join('/');
}

// Casamento por segmento: path === seg OU path começa com seg + '/'.
function segMatch(path, seg) {
  return path === seg || path.startsWith(seg + '/');
}

// Regra que cerca a rota — ou null se for base (liberada).
function gateForRoute(redirect) {
  const path = normalizePath(redirect);
  return GATE_RULES.find((r) => segMatch(path, r.seg)) || null;
}

// A assinatura `sub` pode abrir esta rota da Gestão? (null/free trata como Free.)
function canAccessRoute(sub, redirect) {
  const rule = gateForRoute(redirect);
  if (!rule) return true; // base / não cercada
  const val = can(sub, rule.cap);
  return rule.need ? val === rule.need : !!val;
}

module.exports = { GATE_RULES, normalizePath, gateForRoute, canAccessRoute };
