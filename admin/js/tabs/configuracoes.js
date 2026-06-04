// Aba Configurações — personalização do app pelo fotógrafo.
// 5 seções: Mensagens · Sessões · Entrega · Notificações · Escassês & Vendas.
// Persiste em Organization.preferences (/api/organization/preferences) e, na seção
// de vendas, em Organization.integrations.salesAutomator (/api/organization/integrations).

import { appState } from '../state.js';
import { apiGet, apiPut } from '../utils/api.js';

let prefs = {};
let salesCfg = {};      // integrations.salesAutomator (postDelivery, couponPrefix, ...)
let deadlineCfg = {};   // integrations.deadlineAutomation (lembrete de seleção)
let currentSection = 'mensagens';

// Canais de mensagem (ordem de exibição na seção Mensagens)
const MSG_CHANNELS = [
  { key: 'shareEmail',      label: 'E-mail — envio do link',     kind: 'email',
    help: 'Parágrafo de introdução. O código e o botão de acesso já aparecem no e-mail automaticamente.' },
  { key: 'shareWhatsApp',   label: 'WhatsApp — envio do link',   kind: 'whatsapp',
    help: 'Mensagem completa enviada pelo WhatsApp.' },
  { key: 'deliverEmail',    label: 'E-mail — entrega',           kind: 'email',
    help: 'Parágrafo de introdução do e-mail de entrega. O link e o código já aparecem no layout.' },
  { key: 'deliverWhatsApp', label: 'WhatsApp — entrega',         kind: 'whatsapp',
    help: 'Mensagem completa de entrega enviada pelo WhatsApp.' }
];

// Exemplos prontos (apenas ponto de partida — o fotógrafo edita à vontade).
const STARTERS = {
  shareEmail:      'Olá {nome}! As fotos do seu {evento} já estão disponíveis para visualização. Use o código abaixo para acessar sua galeria.',
  shareWhatsApp:   'Olá {nome}! 📸 As fotos do seu {evento} já estão prontas para você visualizar e escolher.\n\nAcesse sua galeria: {link}\n\nCódigo de acesso: {codigo}\n\n— {negocio}',
  deliverEmail:    'Olá {nome}! As fotos editadas do seu {evento} estão prontas para download em alta resolução.',
  deliverWhatsApp: 'Olá {nome}! 📸 As fotos editadas do seu {evento} estão prontas para download em alta resolução!\n\nAcesse para baixar: {link}\n\nCódigo de acesso: {codigo}\n\n— {negocio}'
};

const VARS_BY_KIND = {
  email:    ['{nome}', '{negocio}', '{evento}'],
  whatsapp: ['{nome}', '{negocio}', '{evento}', '{link}', '{codigo}']
};

const SECTIONS = [
  { id: 'mensagens',     label: 'Mensagens' },
  { id: 'sessoes',       label: 'Sessões' },
  { id: 'entrega',       label: 'Entrega' },
  { id: 'notificacoes',  label: 'Notificações' },
  { id: 'vendas',        label: 'Escassês & Vendas' }
];

// Variáveis disponíveis nas mensagens de venda (pós-entrega, com cupom)
const SALES_VARS = ['{nome}', '{negocio}', '{evento}', '{fotos_restantes}', '{dias}', '{cupom}', '{desconto}', '{preco_extra}', '{link}'];
// Variáveis do lembrete de seleção (pré-entrega) — sem nada de dinheiro
const REMINDER_VARS = ['{nome}', '{negocio}', '{evento}', '{dias}', '{link}'];
const SALES_STARTERS = {
  reminder:     'Olá {nome}! As fotos do seu {evento} já estão na galeria esperando a sua escolha. Você tem {dias} dia(s) para selecionar antes do prazo. Acesse: {link}',
  postDelivery: 'Olá {nome}! As fotos do seu {evento} saem do nosso servidor em {dias} dias. Você ainda pode levar as {fotos_restantes} fotos que ficaram de fora do pacote com {desconto}% de desconto — use o cupom {cupom}: {link}'
};

// ── Entry ───────────────────────────────────────────────────────────────────
export async function renderConfiguracoes(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem; padding:1rem 0;">
      <div class="skeleton" style="height:36px; width:280px; border-radius:6px;"></div>
      <div class="skeleton" style="height:320px; width:100%; border-radius:8px;"></div>
    </div>`;

  try {
    const [resPrefs, resInteg] = await Promise.all([
      apiGet('/api/organization/preferences'),
      apiGet('/api/organization/integrations')
    ]);
    prefs = resPrefs.preferences || {};
    salesCfg = resInteg.integrations?.salesAutomator || {};
    deadlineCfg = resInteg.integrations?.deadlineAutomation || {};
  } catch (err) {
    window.showToast?.('Erro ao carregar configurações: ' + err.message, 'error');
    prefs = {};
    salesCfg = {};
    deadlineCfg = {};
  }
  renderLayout(container);
}

function renderLayout(container) {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem; max-width:880px; margin:0 auto; width:100%;';

  // Sub-navegação
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap;';
  const btnBase = 'padding:0.5rem 1.125rem; border-radius:9999px; font-size:0.875rem; font-weight:600; cursor:pointer; border:1px solid; transition:all 0.2s; font-family:inherit;';
  SECTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const active = s.id === currentSection;
    btn.style.cssText = btnBase + (active
      ? 'background:var(--accent); color:#fff; border-color:var(--accent);'
      : 'background:var(--bg-elevated); color:var(--text-secondary); border-color:var(--border);');
    btn.textContent = s.label;
    btn.onclick = () => { currentSection = s.id; renderLayout(container); };
    nav.appendChild(btn);
  });
  root.appendChild(nav);

  const content = document.createElement('div');
  if (currentSection === 'mensagens')    content.appendChild(renderMensagens());
  if (currentSection === 'sessoes')      content.appendChild(renderSessoes());
  if (currentSection === 'entrega')      content.appendChild(renderEntrega());
  if (currentSection === 'notificacoes') content.appendChild(renderNotificacoes());
  if (currentSection === 'vendas')       content.appendChild(renderVendas());
  root.appendChild(content);

  container.appendChild(root);
}

// ── Save (debounced, com acumulador para não perder edições) ──────────────────
let saveTimer = null;
let pendingPartial = {};
let pendingStatus = null;

function deepMerge(target, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) {
      target[k] = deepMerge(target[k] || {}, src[k]);
    } else {
      target[k] = src[k];
    }
  }
  return target;
}

function scheduleSave(partial, statusEl, immediate = false) {
  deepMerge(pendingPartial, partial);
  if (statusEl) pendingStatus = statusEl;
  if (pendingStatus) { pendingStatus.textContent = 'Salvando…'; pendingStatus.style.color = 'var(--text-muted)'; }
  clearTimeout(saveTimer);
  const flush = async () => {
    const body = pendingPartial; pendingPartial = {};
    const statusRef = pendingStatus;
    try {
      const res = await apiPut('/api/organization/preferences', body);
      prefs = res.preferences || prefs;
      // Reflete no appData global pra que wizard/modal-form usem na hora
      if (appState.appData?.organization) appState.appData.organization.preferences = prefs;
      if (statusRef) { statusRef.textContent = '✓ Salvo'; statusRef.style.color = 'var(--green)'; }
    } catch (err) {
      if (statusRef) statusRef.textContent = '';
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    }
  };
  if (immediate) flush(); else saveTimer = setTimeout(flush, 600);
}

// ── Helpers de UI ────────────────────────────────────────────────────────────
function sectionCard(title, subtitle) {
  const card = document.createElement('div');
  card.style.cssText = 'background:var(--bg-surface); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;';
  const head = document.createElement('div');
  head.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:1rem;';
  const titleWrap = document.createElement('div');
  titleWrap.innerHTML = `
    <h2 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0;">${title}</h2>
    ${subtitle ? `<p style="font-size:0.8125rem; color:var(--text-secondary); margin:0.25rem 0 0;">${subtitle}</p>` : ''}`;
  const status = document.createElement('span');
  status.style.cssText = 'font-size:0.75rem; font-weight:600; white-space:nowrap;';
  head.appendChild(titleWrap);
  head.appendChild(status);
  card.appendChild(head);
  return { card, status };
}

function fieldLabel(text) {
  const l = document.createElement('label');
  l.textContent = text;
  l.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-primary); display:block; margin-bottom:0.375rem;';
  return l;
}

// ── Seção Mensagens ──────────────────────────────────────────────────────────
function renderMensagens() {
  const { card, status } = sectionCard(
    'Mensagens',
    'Defina o seu padrão para o envio do link e a entrega. Em branco = usa a mensagem otimizada do app (varia por tipo de evento). Você ainda pode editar caso a caso em cada sessão.'
  );
  const tpls = prefs.messageTemplates || {};

  MSG_CHANNELS.forEach(ch => {
    const block = document.createElement('div');
    block.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem; padding-top:1rem; border-top:1px solid var(--border);';

    block.appendChild(fieldLabel(ch.label));

    const help = document.createElement('div');
    help.textContent = ch.help;
    help.style.cssText = 'font-size:0.75rem; color:var(--text-muted); margin-top:-0.25rem;';
    block.appendChild(help);

    const textarea = document.createElement('textarea');
    textarea.value = tpls[ch.key] || '';
    textarea.placeholder = 'Usando a mensagem padrão do app…';
    textarea.rows = ch.kind === 'whatsapp' ? 7 : 4;
    textarea.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; line-height:1.5; resize:vertical;';

    const preview = document.createElement('div');
    preview.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); background:var(--bg-base); border:1px dashed var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; white-space:pre-wrap; line-height:1.5;';
    const refreshPreview = () => {
      const raw = textarea.value.trim() || STARTERS[ch.key];
      preview.textContent = interpolateSample(raw);
    };

    textarea.oninput = () => {
      refreshPreview();
      scheduleSave({ messageTemplates: { [ch.key]: textarea.value } }, status);
    };

    // Chips de variáveis
    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center;';
    const chipsLabel = document.createElement('span');
    chipsLabel.textContent = 'Inserir:';
    chipsLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted);';
    chips.appendChild(chipsLabel);
    VARS_BY_KIND[ch.kind].forEach(v => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = v;
      chip.style.cssText = 'font-family:monospace; font-size:0.75rem; background:var(--bg-elevated); border:1px solid var(--border); color:var(--accent); border-radius:0.375rem; padding:0.125rem 0.5rem; cursor:pointer;';
      chip.onclick = () => {
        insertAtCursor(textarea, v);
        textarea.focus();
        refreshPreview();
        scheduleSave({ messageTemplates: { [ch.key]: textarea.value } }, status);
      };
      chips.appendChild(chip);
    });

    // Ações: usar exemplo / restaurar padrão
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap;';
    const exampleBtn = document.createElement('button');
    exampleBtn.type = 'button';
    exampleBtn.textContent = 'Usar exemplo';
    exampleBtn.style.cssText = ghostBtnCss();
    exampleBtn.onclick = () => {
      textarea.value = STARTERS[ch.key];
      refreshPreview();
      scheduleSave({ messageTemplates: { [ch.key]: textarea.value } }, status, true);
    };
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Restaurar padrão do app';
    resetBtn.style.cssText = ghostBtnCss();
    resetBtn.onclick = () => {
      textarea.value = '';
      refreshPreview();
      scheduleSave({ messageTemplates: { [ch.key]: '' } }, status, true);
    };
    actions.appendChild(exampleBtn);
    actions.appendChild(resetBtn);

    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Pré-visualização';
    previewLabel.style.cssText = 'font-size:0.6875rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-muted); margin-top:0.25rem;';

    block.appendChild(chips);
    block.appendChild(textarea);
    block.appendChild(actions);
    block.appendChild(previewLabel);
    block.appendChild(preview);
    refreshPreview();

    card.appendChild(block);
  });

  return card;
}

// ── Seção Sessões ────────────────────────────────────────────────────────────
function renderSessoes() {
  const { card, status } = sectionCard('Padrões de novas sessões', 'Pré-preenche o formulário ao criar uma nova sessão. Não altera sessões já criadas.');
  const d = prefs.sessionDefaults || {};

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;';

  grid.appendChild(numberField('Pacote padrão (fotos)', d.packageLimit ?? 30, 1, 1000,
    v => scheduleSave({ sessionDefaults: { packageLimit: v } }, status)));
  grid.appendChild(numberField('Preço por foto extra (R$)', d.extraPhotoPrice ?? 25, 0, 10000,
    v => scheduleSave({ sessionDefaults: { extraPhotoPrice: v } }, status), true));
  grid.appendChild(selectField('Resolução padrão', String(d.photoResolution ?? 1200),
    [['960', '960px'], ['1200', '1200px'], ['1400', '1400px'], ['1600', '1600px']],
    v => scheduleSave({ sessionDefaults: { photoResolution: parseInt(v) } }, status, true)));
  grid.appendChild(numberField('Prazo padrão (dias, 0 = sem prazo)', d.deadlineDays ?? 0, 0, 365,
    v => scheduleSave({ sessionDefaults: { deadlineDays: v } }, status)));

  card.appendChild(grid);

  const toggles = document.createElement('div');
  toggles.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem; padding-top:1rem; border-top:1px solid var(--border);';
  toggles.appendChild(toggleField('Permitir compra de fotos extras', d.allowExtraPurchase !== false,
    v => scheduleSave({ sessionDefaults: { allowExtraPurchase: v } }, status, true)));
  toggles.appendChild(toggleField('Permitir pedido de reabertura da seleção', d.allowReopen !== false,
    v => scheduleSave({ sessionDefaults: { allowReopen: v } }, status, true)));
  toggles.appendChild(toggleField('Comentários nas fotos habilitados', d.commentsEnabled !== false,
    v => scheduleSave({ sessionDefaults: { commentsEnabled: v } }, status, true)));
  card.appendChild(toggles);

  return card;
}

// ── Seção Entrega ────────────────────────────────────────────────────────────
function renderEntrega() {
  const { card, status } = sectionCard('Padrão de entrega da galeria', 'No modo Galeria, define o que acontece ao chegar no passo Compartilhar.');
  const current = prefs.galleryDeliveryDefault || 'ask';

  const opts = [
    ['ask',     'Sempre perguntar',      'Mostra a tela de escolha (Compartilhar prévia ou Entregar direto) a cada galeria.'],
    ['preview', 'Compartilhar prévia',   'Já abre no fluxo com prévia (cliente vê com marca d\'água, entrega depois).'],
    ['direct',  'Entregar direto',       'Pula a etapa Compartilhar — vai direto para a entrega do download.']
  ];

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:0.625rem;';
  opts.forEach(([val, label, desc]) => {
    const row = document.createElement('label');
    const active = current === val;
    row.style.cssText = `display:flex; gap:0.75rem; align-items:flex-start; padding:0.875rem 1rem; border-radius:0.5rem; cursor:pointer; border:1px solid ${active ? 'var(--accent)' : 'var(--border)'}; background:var(--bg-base);`;
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'galleryDeliveryDefault';
    radio.checked = active;
    radio.style.cssText = 'margin-top:0.2rem; accent-color:var(--accent);';
    radio.onchange = () => {
      prefs.galleryDeliveryDefault = val; // reflete na hora antes do re-render
      scheduleSave({ galleryDeliveryDefault: val }, status, true);
      renderLayoutAfterRadio();
    };
    const txt = document.createElement('div');
    txt.innerHTML = `<div style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">${label}</div>
      <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.125rem;">${desc}</div>`;
    row.appendChild(radio);
    row.appendChild(txt);
    list.appendChild(row);
  });
  card.appendChild(list);
  return card;
}

// Re-render leve para refletir a borda do radio selecionado
function renderLayoutAfterRadio() {
  const container = document.getElementById('tabContent');
  if (container) renderLayout(container);
}

// ── Seção Notificações ───────────────────────────────────────────────────────
function renderNotificacoes() {
  const { card, status } = sectionCard('Preferências de notificação', 'Escolha quais e-mails você recebe quando o cliente age na galeria.');
  const n = prefs.notifications || {};

  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';
  list.appendChild(toggleField('Cliente finaliza a seleção de fotos', n.selectionSubmitted !== false,
    v => scheduleSave({ notifications: { selectionSubmitted: v } }, status, true)));
  list.appendChild(toggleField('Cliente pede fotos extras', n.extraRequested !== false,
    v => scheduleSave({ notifications: { extraRequested: v } }, status, true)));
  list.appendChild(toggleField('Cliente pede reabertura da seleção', n.reopenRequested !== false,
    v => scheduleSave({ notifications: { reopenRequested: v } }, status, true)));
  card.appendChild(list);
  return card;
}

// ── Campos reutilizáveis ─────────────────────────────────────────────────────
function numberField(label, value, min, max, onChange, isFloat = false) {
  const wrap = document.createElement('div');
  wrap.appendChild(fieldLabel(label));
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  input.min = min; input.max = max;
  if (isFloat) input.step = '0.01';
  input.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem;';
  input.oninput = () => {
    const v = isFloat ? parseFloat(input.value) : parseInt(input.value);
    if (!isNaN(v)) onChange(v);
  };
  wrap.appendChild(input);
  return wrap;
}

function selectField(label, value, options, onChange) {
  const wrap = document.createElement('div');
  wrap.appendChild(fieldLabel(label));
  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; cursor:pointer;';
  options.forEach(([val, lbl]) => {
    const o = document.createElement('option');
    o.value = val; o.textContent = lbl;
    if (val === value) o.selected = true;
    sel.appendChild(o);
  });
  sel.onchange = () => onChange(sel.value);
  wrap.appendChild(sel);
  return wrap;
}

function toggleField(label, checked, onChange) {
  const row = document.createElement('label');
  row.style.cssText = 'display:flex; align-items:center; gap:0.625rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary);';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = checked;
  cb.style.cssText = 'width:1.05rem; height:1.05rem; accent-color:var(--accent); cursor:pointer;';
  cb.onchange = () => onChange(cb.checked);
  const span = document.createElement('span');
  span.textContent = label;
  row.appendChild(cb);
  row.appendChild(span);
  return row;
}

function ghostBtnCss() {
  return 'background:transparent; border:1px solid var(--border); color:var(--text-secondary); padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem; font-family:inherit;';
}

// ── Utilidades ───────────────────────────────────────────────────────────────
function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const pos = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = pos;
}

function interpolateSample(tpl) {
  const negocio = appState.appData?.organization?.name || 'Seu negócio';
  return String(tpl)
    .replace(/\{nome\}/g, 'Marina')
    .replace(/\{negocio\}/g, negocio)
    .replace(/\{evento\}/g, 'casamento')
    .replace(/\{link\}/g, 'https://galeria.exemplo.com/AB12CD')
    .replace(/\{codigo\}/g, 'AB12CD');
}

// ── Seção Escassês & Vendas ───────────────────────────────────────────────────
// Persiste em integrations (deadlineAutomation + salesAutomator) — endpoint diferente das demais seções.
let salesSaveTimer = null;
let salesPending = {};
let salesPendingStatus = null;

// `partial` já vem no nível de integrations, ex: { deadlineAutomation: {...} } ou { salesAutomator: { postDelivery: {...} } }
function scheduleIntegrationsSave(partial, statusEl, immediate = false) {
  deepMerge(salesPending, partial);
  if (statusEl) salesPendingStatus = statusEl;
  if (salesPendingStatus) { salesPendingStatus.textContent = 'Salvando…'; salesPendingStatus.style.color = 'var(--text-muted)'; }
  clearTimeout(salesSaveTimer);
  const flush = async () => {
    const body = salesPending; salesPending = {};
    const statusRef = salesPendingStatus;
    try {
      const res = await apiPut('/api/organization/integrations', body);
      if (res.integrations) {
        salesCfg = res.integrations.salesAutomator || salesCfg;
        deadlineCfg = res.integrations.deadlineAutomation || deadlineCfg;
      }
      if (statusRef) { statusRef.textContent = '✓ Salvo'; statusRef.style.color = 'var(--green)'; }
    } catch (err) {
      if (statusRef) statusRef.textContent = '';
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    }
  };
  if (immediate) flush(); else salesSaveTimer = setTimeout(flush, 600);
}

function renderVendas() {
  const { card, status } = sectionCard(
    'Escassês & Vendas',
    'No modo seleção: lembra o cliente de selecionar (sem desconto) e, depois da entrega, oferece as fotos que sobraram com desconto.'
  );
  const sa = salesCfg || {};
  const pd = sa.postDelivery || {};
  const dl = deadlineCfg || {};
  const fallbackPct = sa.couponDiscountPercent ?? 10;

  // Painel dos 3 prazos
  card.appendChild(buildDeadlinesPanel());

  // ── Lembrete de seleção (pré-entrega) — SEM desconto ──
  const preBlock = vendasSubBlock('Lembrete de seleção (pré-entrega)',
    'Só avisa o cliente para entrar e escolher as fotos que ele já comprou, antes do prazo. Sem desconto, sem venda.');

  preBlock.appendChild(toggleField('Ativar lembrete de seleção', dl.enabled === true,
    v => scheduleIntegrationsSave({ deadlineAutomation: { enabled: v } }, status, true)));
  preBlock.appendChild(toggleField('Enviar por e-mail', dl.sendEmail !== false,
    v => scheduleIntegrationsSave({ deadlineAutomation: { sendEmail: v } }, status, true)));

  const daysWrap = document.createElement('div');
  daysWrap.style.maxWidth = '260px';
  daysWrap.appendChild(numberField('Avisar quantos dias antes do prazo', dl.daysWarning ?? 3, 1, 30,
    v => scheduleIntegrationsSave({ deadlineAutomation: { daysWarning: v } }, status)));
  preBlock.appendChild(daysWrap);

  preBlock.appendChild(fieldLabel('Mensagem do lembrete (corpo do e-mail)'));
  preBlock.appendChild(buildSalesTemplateEditor(dl.messageTemplate || '', SALES_STARTERS.reminder,
    val => scheduleIntegrationsSave({ deadlineAutomation: { messageTemplate: val } }, status), REMINDER_VARS));
  card.appendChild(preBlock);

  // ── Escassês de vendas (pós-entrega) — COM desconto, só na sobra ──
  const postBlock = vendasSubBlock('Escassês de vendas (pós-entrega)',
    'Depois da entrega, oferece com desconto as fotos que sobraram (subidas − compradas) até a data de exclusão do storage. Só dispara se houver sobra e data de exclusão definida.');

  postBlock.appendChild(toggleField('Ativar escassês de vendas', pd.enabled === true,
    v => scheduleIntegrationsSave({ salesAutomator: { postDelivery: { enabled: v } } }, status, true)));

  const prefixWrap = document.createElement('div');
  prefixWrap.style.maxWidth = '220px';
  prefixWrap.appendChild(fieldLabel('Prefixo do cupom'));
  const prefixInput = document.createElement('input');
  prefixInput.type = 'text'; prefixInput.maxLength = 8;
  prefixInput.value = sa.couponPrefix || 'CZ';
  prefixInput.style.cssText = inputCss();
  prefixInput.oninput = () => scheduleIntegrationsSave({ salesAutomator: { couponPrefix: prefixInput.value } }, status);
  prefixWrap.appendChild(prefixInput);
  postBlock.appendChild(prefixWrap);

  const pdDays = (Array.isArray(pd.daysSchedule) && pd.daysSchedule.length ? pd.daysSchedule : [15, 7, 1])
    .slice().sort((a, b) => b - a);
  postBlock.appendChild(fieldLabel('Desconto por etapa (dias antes da exclusão)'));
  postBlock.appendChild(buildDiscountRow(pdDays, pd.discountByDay, fallbackPct,
    map => scheduleIntegrationsSave({ salesAutomator: { postDelivery: { discountByDay: map } } }, status)));

  postBlock.appendChild(fieldLabel('Mensagem (corpo do e-mail)'));
  postBlock.appendChild(buildSalesTemplateEditor(pd.messageTemplate || '', SALES_STARTERS.postDelivery,
    val => scheduleIntegrationsSave({ salesAutomator: { postDelivery: { messageTemplate: val } } }, status), SALES_VARS));
  card.appendChild(postBlock);

  return card;
}

function vendasSubBlock(title, desc) {
  const b = document.createElement('div');
  b.style.cssText = 'display:flex; flex-direction:column; gap:0.625rem; padding-top:1.25rem; border-top:1px solid var(--border);';
  const h = document.createElement('div');
  h.innerHTML = `<div style="font-size:0.9375rem; font-weight:600; color:var(--text-primary);">${title}</div>
    <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:0.125rem;">${desc}</div>`;
  b.appendChild(h);
  return b;
}

function buildDeadlinesPanel() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.75rem;';
  const items = [
    ['1', 'Prazo de seleção', 'O cliente entra e escolhe as fotos do pacote que já comprou. O lembrete (sem desconto) corre até aqui.'],
    ['2', 'Janela de compra', 'Após a entrega, o cliente pode voltar e comprar as fotos que sobraram. Vai até a data de exclusão.'],
    ['3', 'Exclusão do storage', 'As fotos saem do servidor (ou vão pro Drive). Fim da janela; a escassês de vendas corre até aqui.']
  ];
  items.forEach(([n, t, d]) => {
    const c = document.createElement('div');
    c.style.cssText = 'background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.875rem 1rem;';
    c.innerHTML = `<div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.375rem;">
        <span style="width:1.25rem; height:1.25rem; border-radius:9999px; background:var(--accent); color:#fff; font-size:0.6875rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${n}</span>
        <span style="font-size:0.8125rem; font-weight:600; color:var(--text-primary);">${t}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45;">${d}</div>`;
    wrap.appendChild(c);
  });
  return wrap;
}

function buildDiscountRow(daysList, discountMap, fallback, onChange) {
  const map = { ...(discountMap || {}) };
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:0.75rem; flex-wrap:wrap;';
  daysList.forEach(day => {
    const key = String(day);
    const field = numberField(`${day} dia${day > 1 ? 's' : ''} antes (%)`, (map[key] ?? fallback), 0, 100, v => {
      map[key] = v;
      onChange({ ...map });
    });
    field.style.flex = '1';
    field.style.minWidth = '110px';
    wrap.appendChild(field);
  });
  return wrap;
}

function buildSalesTemplateEditor(value, starter, onChange, varsList = SALES_VARS) {
  const block = document.createElement('div');
  block.style.cssText = 'display:flex; flex-direction:column; gap:0.5rem;';

  const textarea = document.createElement('textarea');
  textarea.value = value || '';
  textarea.placeholder = 'Em branco = usa a mensagem otimizada do app (urgência por etapa).';
  textarea.rows = 6;
  textarea.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; line-height:1.5; resize:vertical;';

  const preview = document.createElement('div');
  preview.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); background:var(--bg-base); border:1px dashed var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; white-space:pre-wrap; line-height:1.5;';
  const refreshPreview = () => { preview.textContent = interpolateSalesSample(textarea.value.trim() || starter); };

  textarea.oninput = () => { refreshPreview(); onChange(textarea.value); };

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center;';
  const chipsLabel = document.createElement('span');
  chipsLabel.textContent = 'Inserir:';
  chipsLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted);';
  chips.appendChild(chipsLabel);
  varsList.forEach(v => {
    const chip = document.createElement('button');
    chip.type = 'button'; chip.textContent = v;
    chip.style.cssText = 'font-family:monospace; font-size:0.75rem; background:var(--bg-elevated); border:1px solid var(--border); color:var(--accent); border-radius:0.375rem; padding:0.125rem 0.5rem; cursor:pointer;';
    chip.onclick = () => { insertAtCursor(textarea, v); textarea.focus(); refreshPreview(); onChange(textarea.value); };
    chips.appendChild(chip);
  });

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap;';
  const exampleBtn = document.createElement('button');
  exampleBtn.type = 'button'; exampleBtn.textContent = 'Usar exemplo'; exampleBtn.style.cssText = ghostBtnCss();
  exampleBtn.onclick = () => { textarea.value = starter; refreshPreview(); onChange(textarea.value); };
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button'; resetBtn.textContent = 'Restaurar padrão do app'; resetBtn.style.cssText = ghostBtnCss();
  resetBtn.onclick = () => { textarea.value = ''; refreshPreview(); onChange(''); };
  actions.appendChild(exampleBtn);
  actions.appendChild(resetBtn);

  const previewLabel = document.createElement('div');
  previewLabel.textContent = 'Pré-visualização';
  previewLabel.style.cssText = 'font-size:0.6875rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-muted); margin-top:0.25rem;';

  block.appendChild(chips);
  block.appendChild(textarea);
  block.appendChild(actions);
  block.appendChild(previewLabel);
  block.appendChild(preview);
  refreshPreview();
  return block;
}

function inputCss() {
  return 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem;';
}

function interpolateSalesSample(tpl) {
  const negocio = appState.appData?.organization?.name || 'Seu negócio';
  return String(tpl)
    .replace(/\{nome\}/g, 'Marina')
    .replace(/\{negocio\}/g, negocio)
    .replace(/\{evento\}/g, 'casamento')
    .replace(/\{fotos_restantes\}/g, '8')
    .replace(/\{dias\}/g, '3')
    .replace(/\{cupom\}/g, 'CZ-AB12CD-3D')
    .replace(/\{desconto\}/g, '15')
    .replace(/\{preco_extra\}/g, '25')
    .replace(/\{link\}/g, 'https://galeria.exemplo.com/AB12CD');
}
