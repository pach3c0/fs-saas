// Aba Configurações — personalização do app pelo fotógrafo.
// Seções: Mensagens · Sessões · Galeria · Notificações · Escassês & Vendas · Privacidade.
// Persiste em Organization.preferences (/api/organization/preferences) e, na seção
// de vendas, em Organization.integrations.salesAutomator (/api/organization/integrations).

import { appState } from '../state.js';
import { apiGet, apiPut } from '../utils/api.js';
import { getPushState, enablePush, disablePush, sendTest, listDevices } from '../utils/push.js';

let prefs = {};
let supportAccess = { enabled: false }; // consentimento p/ suporte acessar o painel
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
  shareWhatsApp:   'Olá {nome}! As fotos do seu {evento} já estão prontas para você visualizar e escolher.\n\nAcesse sua galeria: {link}\n\nCódigo de acesso: {codigo}\n\n— {negocio}',
  deliverEmail:    'Olá {nome}! As fotos editadas do seu {evento} estão prontas para download em alta resolução.',
  deliverWhatsApp: 'Olá {nome}! As fotos editadas do seu {evento} estão prontas para download em alta resolução!\n\nAcesse para baixar: {link}\n\nCódigo de acesso: {codigo}\n\n— {negocio}'
};

const VARS_BY_KIND = {
  email:    ['{nome}', '{negocio}', '{evento}'],
  whatsapp: ['{nome}', '{negocio}', '{evento}', '{link}', '{codigo}']
};

const SECTIONS = [
  { id: 'mensagens',     label: 'Mensagens', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>' },
  { id: 'sessoes',       label: 'Sessões', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>' },
  { id: 'galeria',       label: 'Galeria', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' },
  { id: 'notificacoes',  label: 'Notificações', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>' },
  { id: 'vendas',        label: 'Escassês & Vendas', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x1="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  { id: 'privacidade',   label: 'Privacidade', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 6.5 2a1 1 0 0 1 1 1v7z"/></svg>' }
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
  if (window._pendingConfigSection) {
    currentSection = window._pendingConfigSection;
    delete window._pendingConfigSection;
  }

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
    supportAccess = resPrefs.supportAccess || { enabled: false };
    salesCfg = resInteg.integrations?.salesAutomator || {};
    deadlineCfg = resInteg.integrations?.deadlineAutomation || {};
  } catch (err) {
    window.showToast?.('Erro ao carregar configurações: ' + err.message, 'error');
    prefs = {};
    supportAccess = { enabled: false };
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
  nav.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;';
  SECTIONS.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const active = s.id === currentSection;
    btn.className = 'header-expand-btn' + (active ? ' active' : '');
    btn.innerHTML = `<span class="header-expand-icon">${s.icon}</span><span class="header-expand-label">${s.label}</span>`;
    if (active) {
      btn.style.cssText = 'border-color:var(--text-primary); color:var(--text-primary); background:var(--bg-hover); font-weight:600;';
    }
    btn.onclick = () => { currentSection = s.id; renderLayout(container); };
    nav.appendChild(btn);
  });
  root.appendChild(nav);

  const content = document.createElement('div');
  if (currentSection === 'mensagens')    content.appendChild(renderMensagens());
  if (currentSection === 'sessoes')      content.appendChild(renderSessoes());
  if (currentSection === 'galeria')      content.appendChild(renderGaleria());
  if (currentSection === 'notificacoes') content.appendChild(renderNotificacoes());
  if (currentSection === 'vendas')       content.appendChild(renderVendas());
  if (currentSection === 'privacidade')  content.appendChild(renderPrivacidade());
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
  head.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; text-align:center;';
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
  l.style.cssText = 'font-size:0.8125rem; font-weight:600; color:var(--text-primary); display:block; margin-bottom:0.375rem; text-align:center; width:100%;';
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
    help.style.cssText = 'font-size:0.75rem; color:var(--text-muted); margin-top:-0.25rem; text-align:center;';
    block.appendChild(help);

    const textarea = document.createElement('textarea');
    textarea.value = tpls[ch.key] || '';
    textarea.placeholder = 'Usando a mensagem padrão do app…';
    textarea.rows = ch.kind === 'whatsapp' ? 7 : 4;
    textarea.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; line-height:1.5; resize:vertical; text-align:center;';

    const preview = document.createElement('div');
    preview.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); background:var(--bg-base); border:1px dashed var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; white-space:pre-wrap; line-height:1.5; text-align:center;';
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
    chips.style.cssText = 'display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center; justify-content:center;';
    const chipsLabel = document.createElement('span');
    chipsLabel.textContent = 'Inserir:';
    chipsLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted);';
    chips.appendChild(chipsLabel);
    VARS_BY_KIND[ch.kind].forEach(v => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'header-expand-btn';
      const varName = v.replace(/\{|\}/g, '');
      chip.innerHTML = `<span class="header-expand-icon" style="font-family:monospace; font-size:12px; font-weight:bold; color:var(--accent);">{}</span><span class="header-expand-label" style="font-family:monospace; font-size:0.75rem; color:var(--accent);">${varName}</span>`;
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
    actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;';
    const exampleBtn = document.createElement('button');
    exampleBtn.type = 'button';
    exampleBtn.className = 'header-expand-btn';
    exampleBtn.innerHTML = `<span class="header-expand-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x1="8" y1="13" y2="13"/><line x1="16" x1="8" y1="17" y2="17"/><line x1="10" x1="8" y1="9" y2="9"/></svg></span><span class="header-expand-label">Usar exemplo</span>`;
    exampleBtn.onclick = () => {
      textarea.value = STARTERS[ch.key];
      refreshPreview();
      scheduleSave({ messageTemplates: { [ch.key]: textarea.value } }, status, true);
    };
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'header-expand-btn';
    resetBtn.innerHTML = `<span class="header-expand-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span><span class="header-expand-label">Restaurar padrão</span>`;
    resetBtn.onclick = () => {
      textarea.value = '';
      refreshPreview();
      scheduleSave({ messageTemplates: { [ch.key]: '' } }, status, true);
    };
    actions.appendChild(exampleBtn);
    actions.appendChild(resetBtn);

    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Pré-visualização';
    previewLabel.style.cssText = 'font-size:0.6875rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-muted); margin-top:0.25rem; text-align:center;';

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

  grid.appendChild(numberField('Pacote padrão (fotos)', d.packageLimit ?? 0, 0, 1000,
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

// ── Seção Galeria ────────────────────────────────────────────────────────────
function renderGaleria() {
  const { card, status } = sectionCard('Galeria do cliente', 'Aparência da galeria que seus clientes acessam. Vale para todas as galerias, inclusive as já criadas.');
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;';
  grid.appendChild(selectField('Ícone de seleção da foto', prefs.selectionIcon || 'heart',
    [['heart', '❤️ Coração (favoritar)'], ['cart', '🛒 Carrinho (comprar)']],
    v => { prefs.selectionIcon = v; scheduleSave({ selectionIcon: v }, status, true); }));
  card.appendChild(grid);

  const hint = document.createElement('p');
  hint.style.cssText = 'margin-top:0.75rem; font-size:0.8125rem; color:var(--text-muted);';
  hint.textContent = 'Define o ícone que o cliente toca para selecionar uma foto: ❤️ para "favoritar/escolher" ou 🛒 para um clima de loja/compra.';
  card.appendChild(hint);
  return card;
}

// ── Seção Notificações ───────────────────────────────────────────────────────
function renderNotificacoes() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; flex-direction:column; gap:1.25rem;';

  // Card 1 — quais eventos notificam (valem para o sino do navegador E o push do celular)
  const { card, status } = sectionCard('Preferências de notificação', 'Escolha quando ser avisado. Cada opção vale para o sino do painel e para o push no celular.');
  const n = prefs.notifications || {};
  const list = document.createElement('div');
  list.style.cssText = 'display:flex; flex-direction:column; gap:0.75rem;';
  list.appendChild(toggleField('Cliente ficou online na galeria', n.clientOnline !== false,
    v => scheduleSave({ notifications: { clientOnline: v } }, status, true)));
  list.appendChild(toggleField('Cliente baixou fotos', n.photosDownloaded !== false,
    v => scheduleSave({ notifications: { photosDownloaded: v } }, status, true)));
  list.appendChild(toggleField('Cliente finaliza a seleção de fotos', n.selectionSubmitted !== false,
    v => scheduleSave({ notifications: { selectionSubmitted: v } }, status, true)));
  list.appendChild(toggleField('Cliente pede fotos extras', n.extraRequested !== false,
    v => scheduleSave({ notifications: { extraRequested: v } }, status, true)));
  list.appendChild(toggleField('Cliente pede reabertura da seleção', n.reopenRequested !== false,
    v => scheduleSave({ notifications: { reopenRequested: v } }, status, true)));
  card.appendChild(list);
  wrap.appendChild(card);

  // Card 2 — notificações no celular (Web Push / PWA)
  wrap.appendChild(renderPushCard());
  return wrap;
}

// ── Card: Notificações no celular (Web Push) ─────────────────────────────────
function renderPushCard() {
  const { card } = sectionCard('Notificações no celular', 'Instale o app e ative para receber os avisos no celular mesmo com ele fechado.');
  const body = document.createElement('div');
  body.style.cssText = 'display:flex; flex-direction:column; gap:0.875rem; align-items:center; width:100%; max-width:420px; margin:0 auto;';
  body.innerHTML = '<p style="font-size:0.8125rem; color:var(--text-muted);">Carregando…</p>';
  card.appendChild(body);
  _populatePushCard(body);
  return card;
}

function _pushMsg(text, color = 'var(--text-secondary)') {
  const p = document.createElement('p');
  p.textContent = text;
  p.style.cssText = `font-size:0.8125rem; color:${color}; text-align:center; margin:0; line-height:1.5;`;
  return p;
}

function _pushButton(label, onClick, variant = 'primary') {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  const primary = variant === 'primary';
  b.style.cssText = `
    border:1px solid var(--border); border-radius:0.5rem; padding:0.6rem 1.1rem;
    font-family:inherit; font-size:0.875rem; font-weight:600; cursor:pointer; transition:opacity 0.1s;
    background:${primary ? 'var(--accent)' : 'transparent'};
    color:${primary ? 'var(--bg-surface)' : 'var(--text-primary)'};`;
  b.onmouseenter = () => { b.style.opacity = '0.85'; };
  b.onmouseleave = () => { b.style.opacity = '1'; };
  b.onclick = onClick;
  return b;
}

async function _populatePushCard(body) {
  let st;
  try { st = await getPushState(); } catch (_) { body.innerHTML = ''; body.appendChild(_pushMsg('Não foi possível verificar o suporte a notificações.')); return; }
  body.innerHTML = '';

  if (!st.supported) {
    body.appendChild(_pushMsg('Este navegador não suporta notificações push.'));
    return;
  }

  // iOS só recebe push com o PWA instalado na Tela de Início (não funciona na aba do Safari).
  if (st.isIos && !st.isStandalone) {
    body.appendChild(_pushMsg('📲 No iPhone, primeiro adicione o app à Tela de Início para receber notificações.', 'var(--text-primary)'));
    const steps = document.createElement('p');
    steps.innerHTML = 'No Safari: toque em <b>Compartilhar</b> (□↑) → <b>Adicionar à Tela de Início</b>. Depois abra o app pelo ícone e volte aqui.';
    steps.style.cssText = 'font-size:0.75rem; color:var(--text-muted); text-align:center; margin:0; line-height:1.5;';
    body.appendChild(steps);
    return;
  }

  if (st.permission === 'denied') {
    body.appendChild(_pushMsg('🔕 As notificações estão bloqueadas para este site. Reative nas configurações do navegador/sistema e recarregue a página.'));
    return;
  }

  // Android/desktop: instalação nativa do app (quando o navegador oferece e ainda não instalado).
  if (window._deferredInstallPrompt && !st.isStandalone) {
    body.appendChild(_pushButton('📲 Instalar o app', async () => {
      const dp = window._deferredInstallPrompt;
      if (!dp) return;
      try { dp.prompt(); await dp.userChoice; } catch (_) { /* ignore */ }
      window._deferredInstallPrompt = null;
      _populatePushCard(body);
    }));
    body.appendChild(_pushMsg('Instale para abrir pelo ícone e receber notificações mesmo com o app fechado.', 'var(--text-muted)'));
  }

  if (st.isSubscribed) {
    body.appendChild(_pushMsg('✅ Notificações ativadas neste aparelho.', 'var(--green)'));
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;';
    row.appendChild(_pushButton('Enviar teste', async () => {
      try {
        const { sent } = await sendTest();
        window.showToast?.(sent > 0 ? 'Teste enviado — confira a notificação.' : 'Nenhum aparelho recebeu (verifique a permissão).', sent > 0 ? 'success' : 'warning');
      } catch (err) { window.showToast?.('Erro ao enviar teste: ' + err.message, 'error'); }
    }, 'secondary'));
    row.appendChild(_pushButton('Desativar', async () => {
      try { await disablePush(); window.showToast?.('Notificações desativadas neste aparelho.', 'success'); }
      catch (err) { window.showToast?.('Erro: ' + err.message, 'error'); }
      _populatePushCard(body);
    }, 'secondary'));
    body.appendChild(row);
    _appendDeviceList(body);
    return;
  }

  // Suportado, sem assinatura → botão de ativar
  body.appendChild(_pushButton('🔔 Ativar notificações no celular', async () => {
    try {
      await enablePush();
      window.showToast?.('Notificações ativadas! Você receberá os avisos no celular.', 'success');
    } catch (err) {
      window.showToast?.(err.message || 'Não foi possível ativar.', 'error');
    }
    _populatePushCard(body);
  }));
  body.appendChild(_pushMsg('Ative em cada aparelho onde quiser receber (celular e/ou computador).', 'var(--text-muted)'));
  _appendDeviceList(body);
}

async function _appendDeviceList(body) {
  try {
    const devices = await listDevices();
    if (!devices.length) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%; border-top:1px solid var(--border); padding-top:0.625rem; margin-top:0.25rem; display:flex; flex-direction:column; gap:0.375rem;';
    const label = document.createElement('p');
    label.textContent = `${devices.length} aparelho(s) registrado(s):`;
    label.style.cssText = 'font-size:0.6875rem; color:var(--text-muted); text-align:center; margin:0;';
    wrap.appendChild(label);
    devices.forEach(d => {
      const line = document.createElement('p');
      line.textContent = '• ' + _deviceLabel(d.userAgent);
      line.style.cssText = 'font-size:0.6875rem; color:var(--text-secondary); text-align:center; margin:0;';
      wrap.appendChild(line);
    });
    body.appendChild(wrap);
  } catch (_) { /* lista é opcional */ }
}

function _deviceLabel(ua = '') {
  const s = String(ua);
  let os = /iPhone|iPad|iPod/.test(s) ? 'iPhone/iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac/.test(s) ? 'Mac' : 'Aparelho';
  let br = /Edg/.test(s) ? 'Edge' : /Chrome/.test(s) ? 'Chrome' : /Firefox/.test(s) ? 'Firefox' : /Safari/.test(s) ? 'Safari' : '';
  return br ? `${br} no ${os}` : os;
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
  input.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; text-align:center;';
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
  sel.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; cursor:pointer; text-align:center;';
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
  row.style.cssText = 'display:flex; align-items:center; justify-content:center; gap:0.625rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary); text-align:center;';
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
  daysWrap.style.cssText = 'max-width:260px; width:100%; margin:0 auto;';
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
  prefixWrap.style.cssText = 'max-width:220px; width:100%; margin:0 auto;';
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
  postBlock.appendChild(fieldLabel('Etapas de escassês (dias antes da exclusão do storage)'));
  postBlock.appendChild(buildDayDiscountEditor(pdDays, pd.discountByDay, fallbackPct,
    (newDays, newMap) => scheduleIntegrationsSave({
      salesAutomator: { postDelivery: { daysSchedule: newDays, discountByDay: newMap } }
    }, status)));

  postBlock.appendChild(fieldLabel('Mensagem (corpo do e-mail)'));
  postBlock.appendChild(buildSalesTemplateEditor(pd.messageTemplate || '', SALES_STARTERS.postDelivery,
    val => scheduleIntegrationsSave({ salesAutomator: { postDelivery: { messageTemplate: val } } }, status), SALES_VARS));
  card.appendChild(postBlock);

  return card;
}

function vendasSubBlock(title, desc) {
  const b = document.createElement('div');
  b.style.cssText = 'display:flex; flex-direction:column; gap:0.625rem; padding-top:1.25rem; border-top:1px solid var(--border); text-align:center;';
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
    c.style.cssText = 'background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.875rem 1rem; text-align:center;';
    c.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:0.375rem;">
        <span style="width:1.25rem; height:1.25rem; border-radius:9999px; background:var(--accent); color:#fff; font-size:0.6875rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${n}</span>
        <span style="font-size:0.8125rem; font-weight:600; color:var(--text-primary);">${t}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-secondary); line-height:1.45;">${d}</div>`;
    wrap.appendChild(c);
  });
  return wrap;
}

// Editor combinado: dia (editável) + desconto (%) por etapa de pós-entrega
// onChange(newDays: number[], newMap: {[day]: pct}) — salva ambos juntos
function buildDayDiscountEditor(daysList, discountMap, fallback, onChange) {
  let days = daysList.slice().sort((a, b) => b - a);
  const map = { ...(discountMap || {}) };

  // Garante desconto para todos os dias existentes
  days.forEach(d => { if (map[String(d)] == null) map[String(d)] = fallback; });

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;';

  function rebuild() {
    wrap.innerHTML = '';
    days.slice().sort((a, b) => b - a).forEach((day, idx) => {
      const col = document.createElement('div');
      col.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem; flex:1; min-width:110px; align-items:center;';

      // Input: dia
      const dayLabel = document.createElement('div');
      dayLabel.textContent = 'Dias antes';
      dayLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted); text-align:center;';
      const dayInput = document.createElement('input');
      dayInput.type = 'number'; dayInput.min = 1; dayInput.max = 365;
      dayInput.value = day;
      dayInput.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; text-align:center;';
      dayInput.onchange = () => {
        const newDay = parseInt(dayInput.value);
        if (isNaN(newDay) || newDay < 1) return;
        const oldKey = String(day);
        const newKey = String(newDay);
        if (oldKey !== newKey) {
          map[newKey] = map[oldKey] ?? fallback;
          delete map[oldKey];
          days[idx] = newDay;
        }
        onChange(days.slice(), { ...map });
        rebuild();
      };

      // Input: desconto
      const pctLabel = document.createElement('div');
      pctLabel.textContent = 'Desconto (%)';
      pctLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted); text-align:center;';
      const pctInput = document.createElement('input');
      pctInput.type = 'number'; pctInput.min = 0; pctInput.max = 100;
      pctInput.value = map[String(day)] ?? fallback;
      pctInput.style.cssText = dayInput.style.cssText;
      pctInput.oninput = () => {
        const v = parseInt(pctInput.value);
        if (!isNaN(v)) { map[String(day)] = v; onChange(days.slice(), { ...map }); }
      };

      col.appendChild(dayLabel);
      col.appendChild(dayInput);
      col.appendChild(pctLabel);
      col.appendChild(pctInput);
      wrap.appendChild(col);
    });
  }

  rebuild();
  return wrap;
}

function buildDiscountRow(daysList, discountMap, fallback, onChange) {
  const map = { ...(discountMap || {}) };
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;';
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
  textarea.style.cssText = 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; line-height:1.5; resize:vertical; text-align:center;';

  const preview = document.createElement('div');
  preview.style.cssText = 'font-size:0.8125rem; color:var(--text-secondary); background:var(--bg-base); border:1px dashed var(--border); border-radius:0.5rem; padding:0.625rem 0.75rem; white-space:pre-wrap; line-height:1.5; text-align:center;';
  const refreshPreview = () => { preview.textContent = interpolateSalesSample(textarea.value.trim() || starter); };

  textarea.oninput = () => { refreshPreview(); onChange(textarea.value); };

  const chips = document.createElement('div');
  chips.style.cssText = 'display:flex; gap:0.375rem; flex-wrap:wrap; align-items:center; justify-content:center;';
  const chipsLabel = document.createElement('span');
  chipsLabel.textContent = 'Inserir:';
  chipsLabel.style.cssText = 'font-size:0.6875rem; color:var(--text-muted);';
  chips.appendChild(chipsLabel);
  varsList.forEach(v => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'header-expand-btn';
    const varName = v.replace(/\{|\}/g, '');
    chip.innerHTML = `<span class="header-expand-icon" style="font-family:monospace; font-size:12px; font-weight:bold; color:var(--accent);">{}</span><span class="header-expand-label" style="font-family:monospace; font-size:0.75rem; color:var(--accent);">${varName}</span>`;
    chip.onclick = () => { insertAtCursor(textarea, v); textarea.focus(); refreshPreview(); onChange(textarea.value); };
    chips.appendChild(chip);
  });

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;';
  const exampleBtn = document.createElement('button');
  exampleBtn.type = 'button';
  exampleBtn.className = 'header-expand-btn';
  exampleBtn.innerHTML = `<span class="header-expand-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x1="8" y1="13" y2="13"/><line x1="16" x1="8" y1="17" y2="17"/><line x1="10" x1="8" y1="9" y2="9"/></svg></span><span class="header-expand-label">Usar exemplo</span>`;
  exampleBtn.onclick = () => { textarea.value = starter; refreshPreview(); onChange(textarea.value); };
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'header-expand-btn';
  resetBtn.innerHTML = `<span class="header-expand-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span><span class="header-expand-label">Restaurar padrão</span>`;
  resetBtn.onclick = () => { textarea.value = ''; refreshPreview(); onChange(''); };
  actions.appendChild(exampleBtn);
  actions.appendChild(resetBtn);

  const previewLabel = document.createElement('div');
  previewLabel.textContent = 'Pré-visualização';
  previewLabel.style.cssText = 'font-size:0.6875rem; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; color:var(--text-muted); margin-top:0.25rem; text-align:center;';

  block.appendChild(chips);
  block.appendChild(textarea);
  block.appendChild(actions);
  block.appendChild(previewLabel);
  block.appendChild(preview);
  refreshPreview();
  return block;
}

function inputCss() {
  return 'width:100%; box-sizing:border-box; background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem 0.75rem; color:var(--text-primary); font-family:inherit; font-size:0.875rem; text-align:center;';
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

// ── Seção Privacidade ────────────────────────────────────────────────────────
// "Ativar usuário de suporte": o superadmin SÓ consegue entrar no painel deste
// fotógrafo (modo suporte) se este toggle estiver ligado. Default: desligado.
function renderPrivacidade() {
  const { card } = sectionCard(
    'Privacidade & Acesso de Suporte',
    'Controle quem pode acessar o seu painel além de você.'
  );

  const row = document.createElement('div');
  row.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1.5rem; padding:1rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.625rem; text-align:center;';

  const info = document.createElement('div');
  info.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-bottom:0.35rem;">
      <span style="font-size:1rem; display:flex; align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2-1 4-2 7-2 2.5 0 4.5 1 6.5 2a1 1 0 0 1 1 1v7z"/></svg></span>
      <span style="font-weight:700; color:var(--text-primary); font-size:0.9375rem;">Ativar o usuário de suporte</span>
    </div>
    <p style="margin:0; font-size:0.8125rem; color:var(--text-secondary); line-height:1.55;">
      Libera o acesso temporário da equipe CliqueZoom ao seu painel para te ajudar a resolver problemas.
      Com isto <strong>desligado, ninguém do suporte consegue entrar na sua conta</strong> — nem visualizar suas fotos e clientes.
    </p>
    <p style="margin:0.4rem 0 0; font-size:0.75rem; color:var(--text-muted); line-height:1.5;">
      Você pode desligar a qualquer momento. Todo acesso do suporte expira em 30 minutos,
      fica registrado em auditoria e você é avisado no sininho.
    </p>
  `;

  // Switch visual (pill) no padrão dual-theme
  const switchWrap = document.createElement('button');
  switchWrap.type = 'button';
  const paint = () => {
    const on = supportAccess.enabled === true;
    switchWrap.style.cssText = `flex-shrink:0; width:48px; height:26px; border-radius:9999px; border:1px solid ${on ? 'var(--green)' : 'var(--border)'}; background:${on ? 'var(--green)' : 'var(--bg-surface)'}; position:relative; cursor:pointer; transition:all 0.2s; padding:0;`;
    switchWrap.innerHTML = `<span style="position:absolute; top:2px; ${on ? 'right:2px' : 'left:2px'}; width:20px; height:20px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:all 0.2s;"></span>`;
    switchWrap.setAttribute('aria-checked', on);
    switchWrap.title = on ? 'Acesso de suporte ATIVO — clique para desligar' : 'Acesso de suporte desligado — clique para liberar';
  };
  paint();

  switchWrap.onclick = async () => {
    const ligar = supportAccess.enabled !== true;
    if (ligar) {
      const ok = await window.showConfirm(
        'Você está liberando o acesso da equipe de suporte CliqueZoom ao seu painel — incluindo sessões, fotos e clientes. O acesso é auditado, expira em 30 minutos por sessão e você pode desligar quando quiser. Continuar?',
        { title: 'Liberar acesso de suporte', confirmText: 'Liberar acesso' }
      );
      if (!ok) return;
    }
    try {
      const res = await apiPut('/api/organization/support-access', { enabled: ligar });
      supportAccess = res.supportAccess || { enabled: ligar };
      paint();
      window.showToast?.(ligar ? 'Acesso de suporte liberado' : 'Acesso de suporte desligado', 'success');
    } catch (err) {
      window.showToast?.('Erro ao salvar: ' + err.message, 'error');
    }
  };

  row.appendChild(info);
  row.appendChild(switchWrap);
  card.appendChild(row);
  return card;
}
