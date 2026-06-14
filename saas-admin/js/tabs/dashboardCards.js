// Cards do Dashboard — imagens de fundo dos 4 cards de métrica (Superadmin).
// Espelha o padrão dos Banners: upload via /api/admin/upload, persistência em
// /api/admin/dashboard-cards/:key. As keys são fixas (não é conteúdo livre).
import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

// Metadados de cada elemento personalizável do dashboard do fotógrafo.
//  - type 'metric'  → card pequeno: imagem com véu escuro + texto branco.
//  - type 'surface' → painel/ação: imagem suave atrás do conteúdo, com opacidade ajustável.
const CARDS = [
  { key: 'sessions',  label: 'Total de Sessões', sample: '128',    type: 'metric' },
  { key: 'photos',    label: 'Fotos Upadas',     sample: '3.412',  type: 'metric' },
  { key: 'storage',   label: 'Espaço Usado',     sample: '8.2 GB', type: 'metric' },
  { key: 'delivered', label: 'Entregues',        sample: '96',     type: 'metric' },
  { key: 'recentSessions',  label: 'Sessões Recentes',           type: 'surface' },
  { key: 'quickActionNew',  label: 'Ação rápida · Nova Sessão',  type: 'surface' },
  { key: 'quickActionSite', label: 'Ação rápida · Ver meu Site', type: 'surface' },
  { key: 'platformNews',    label: 'Card de Novidades',          type: 'surface' },
];

let _state = {}; // key -> { key, imageUrl, opacity, active }

async function loadDashboardCards() {
  const el = document.getElementById('tabDashboardCards');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando cards...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/dashboard-cards');
    _state = {};
    (data.cards || []).forEach(c => { _state[c.key] = c; });
    renderDashboardCards(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderDashboardCards(container) {
  const metric = CARDS.filter(c => c.type === 'metric');
  const surface = CARDS.filter(c => c.type === 'surface');
  const grid = (items) => `<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">${items.map(renderCardEditor).join('')}</div>`;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.75rem;">
      <!-- header -->
      <div>
        <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Cards do Dashboard</h2>
        <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 0; max-width:680px;">
          Imagem de fundo dos elementos do topo do painel de todos os fotógrafos.
          Sem imagem, o elemento usa o estilo sólido padrão. Reflete em tempo real
          para todos assim que você salva.
        </p>
      </div>

      <!-- cards de métrica -->
      <div>
        <h3 style="font-size:0.95rem; font-weight:700; color:#e2e8f0; margin:0 0 0.2rem;">Cards de métrica</h3>
        <p style="font-size:0.74rem; color:#64748b; margin:0 0 0.75rem;">Imagem com véu escuro e texto branco (números grandes). Use fotos com boa área escura atrás do número.</p>
        ${grid(metric)}
      </div>

      <!-- painéis e ações -->
      <div>
        <h3 style="font-size:0.95rem; font-weight:700; color:#e2e8f0; margin:0 0 0.2rem;">Painéis e ações</h3>
        <p style="font-size:0.74rem; color:#64748b; margin:0 0 0.75rem;">Imagem suave atrás do conteúdo, com <strong style="color:#cbd5e1;">opacidade ajustável</strong> para manter o texto legível.</p>
        ${grid(surface)}
      </div>
    </div>
  `;
}

const IMG_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>';

function renderCardEditor(meta) {
  const card = _state[meta.key] || { key: meta.key, imageUrl: '', opacity: 0.2, active: true };
  const hasImage = !!card.imageUrl;
  const active = card.active !== false;
  const opacity = (typeof card.opacity === 'number') ? card.opacity : 0.2;

  const preview = meta.type === 'surface'
    ? renderSurfacePreview(meta, card, opacity)
    : renderMetricPreview(meta, card);

  // Slider de opacidade só faz sentido nas superfícies com imagem.
  const opacitySlider = (meta.type === 'surface' && hasImage) ? `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:0.72rem; color:#94a3b8; white-space:nowrap;">Opacidade</span>
        <input type="range" min="0" max="100" value="${Math.round(opacity * 100)}" style="flex:1; cursor:pointer;"
          oninput="window.previewDashboardCardOpacity('${meta.key}', this.value)"
          onchange="window.saveDashboardCardOpacity('${meta.key}', this.value)">
        <span id="opLabel-${meta.key}" style="font-size:0.72rem; color:#cbd5e1; width:36px; text-align:right;">${Math.round(opacity * 100)}%</span>
      </div>` : '';

  const hint = meta.type === 'surface'
    ? 'Imagem larga (paisagem). JPG, PNG ou WEBP, até 2 MB. Ajuste a opacidade para o texto ficar legível.'
    : 'Proporção recomendada ~3:1 (card largo e baixo). JPG, PNG ou WEBP, até 2 MB.';

  return `
    <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.75rem; opacity:${active ? '1' : '0.6'};">
      <!-- nome + toggle -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
        <strong style="color:#f1f5f9; font-size:0.9rem;">${esc(meta.label)}</strong>
        <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; cursor:pointer; ${active ? 'background:#064e3b; color:#34d399;' : 'background:#0f172a; color:#64748b; border:1px solid #334155;'}"
          onclick="window.toggleDashboardCardActive('${meta.key}', ${active})">
          ${active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      ${preview}
      ${opacitySlider}

      <!-- ações -->
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer; font-weight:600;">
          ${hasImage ? 'Trocar imagem' : 'Upload imagem'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadDashboardCardImage(this, '${meta.key}')">
        </label>
        ${hasImage ? `<button onclick="window.removeDashboardCardImage('${meta.key}', '${esc(meta.label)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer;">Remover</button>` : ''}
        <span id="cardStatus-${meta.key}" style="font-size:0.72rem; color:#64748b;"></span>
      </div>
      <p style="font-size:0.68rem; color:#475569; margin:0;">${hint}</p>
    </div>
  `;
}

// Preview do card de métrica (véu escuro + texto branco), como o fotógrafo vê.
function renderMetricPreview(meta, card) {
  const hasImage = !!card.imageUrl;
  const previewBg = hasImage
    ? `background-image:url('${esc(card.imageUrl)}'); background-size:cover; background-position:center;`
    : 'background:#0f172a;';
  const veil = hasImage
    ? '<div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.62) 100%); z-index:1;"></div>'
    : '';
  const tileBg = hasImage ? 'background:rgba(255,255,255,0.92); color:#1a1a1a;' : 'background:#1e293b; color:#cbd5e1;';
  const labelColor = hasImage ? 'color:rgba(255,255,255,0.85); text-shadow:0 1px 2px rgba(0,0,0,0.55);' : 'color:#94a3b8;';
  const valueColor = hasImage ? 'color:#fff; text-shadow:0 1px 3px rgba(0,0,0,0.55);' : 'color:#f1f5f9;';
  return `
    <div style="position:relative; overflow:hidden; border-radius:18px; border:1px solid #334155; padding:1rem; display:flex; align-items:center; gap:0.75rem; min-height:76px; ${previewBg}">
      ${veil}
      <div style="width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; z-index:2; border:1px solid rgba(255,255,255,0.18); ${tileBg}">
        ${IMG_ICON}
      </div>
      <div style="position:relative; z-index:2; display:flex; flex-direction:column; gap:0.1rem;">
        <div style="font-size:0.8125rem; font-weight:500; ${labelColor}">${esc(meta.label)}</div>
        <div style="font-size:1.4rem; font-weight:700; line-height:1.2; ${valueColor}">${esc(meta.sample || '')}</div>
      </div>
    </div>`;
}

// Preview de superfície (painel/ação) — mimetiza o painel claro do fotógrafo:
// fundo claro + imagem suave (opacidade) + texto escuro, para avaliar a legibilidade real.
function renderSurfacePreview(meta, card, opacity) {
  const hasImage = !!card.imageUrl;
  return `
    <div style="position:relative; overflow:hidden; border-radius:18px; border:1px solid #334155; min-height:84px; background:#e8e8eb;">
      ${hasImage ? `<div id="surfPreviewImg-${meta.key}" style="position:absolute; inset:0; background-image:url('${esc(card.imageUrl)}'); background-size:cover; background-position:center; opacity:${opacity};"></div>` : ''}
      <div style="position:relative; padding:1rem; display:flex; align-items:center; gap:0.75rem;">
        <div style="width:40px; height:40px; border-radius:14px; background:#f7f7f8; border:1px solid rgba(0,0,0,0.12); display:flex; align-items:center; justify-content:center; color:#1a1a1a; flex-shrink:0;">
          ${IMG_ICON}
        </div>
        <div style="color:#1a1a1a; font-weight:600; font-size:0.95rem;">${esc(meta.label)}</div>
      </div>
    </div>`;
}

// ── Upload + persistência ──────────────────────────────────────────────────────

window.uploadDashboardCardImage = async (input, key) => {
  const file = input.files && input.files[0];
  if (!file) return;
  const status = document.getElementById(`cardStatus-${key}`);
  if (status) status.textContent = 'Enviando...';
  try {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: fd
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

    await apiRequest('POST', `/api/admin/dashboard-cards/${key}`, { imageUrl: json.url });
    saasToast('Imagem do card atualizada!', 'success');
    await loadDashboardCards();
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

window.removeDashboardCardImage = async (key, label) => {
  if (!await saasConfirm(`Remover a imagem de fundo do card "${label}"? Ele volta ao estilo sólido.`, { title: 'Remover imagem', confirmText: 'Remover', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/dashboard-cards/${key}`);
    saasToast('Imagem removida.', 'success');
    await loadDashboardCards();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.toggleDashboardCardActive = async (key, current) => {
  try {
    await apiRequest('PATCH', `/api/admin/dashboard-cards/${key}`, { active: !current });
    saasToast(!current ? 'Card ativado!' : 'Card desativado.', 'success');
    await loadDashboardCards();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// Atualiza só o preview ao vivo (sem salvar) enquanto arrasta o slider.
window.previewDashboardCardOpacity = (key, val) => {
  const op = Math.max(0, Math.min(100, Number(val))) / 100;
  const img = document.getElementById(`surfPreviewImg-${key}`);
  const label = document.getElementById(`opLabel-${key}`);
  if (img) img.style.opacity = op;
  if (label) label.textContent = `${Math.round(op * 100)}%`;
};

// Salva a opacidade ao soltar o slider. Não recarrega — preserva a posição do slider.
window.saveDashboardCardOpacity = async (key, val) => {
  const op = Math.max(0, Math.min(100, Number(val))) / 100;
  try {
    await apiRequest('PATCH', `/api/admin/dashboard-cards/${key}`, { opacity: op });
    if (_state[key]) _state[key].opacity = op;
    else _state[key] = { key, imageUrl: '', opacity: op, active: true };
    saasToast('Opacidade salva.', 'success');
  } catch (err) {
    saasToast('Erro ao salvar opacidade: ' + err.message, 'error');
  }
};

export { loadDashboardCards };
