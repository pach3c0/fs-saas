// Fundo dos cards do catálogo de sessões — imagem de fundo por MODO de sessão (Superadmin).
// Espelha o padrão dos Cards do Dashboard: upload via /api/admin/upload, persistência em
// /api/admin/session-card-backgrounds/:key. As keys são fixas (3 modos V1 do catálogo).
// O front do fotógrafo (admin/js/tabs/sessoes/list.js) consome /api/session-card-backgrounds
// e desenha a imagem atrás do conteúdo do card; sem imagem, cai no tint sólido por modo.
import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

// Metadados de cada modo de sessão. `tint`/`border` espelham o color-mix usado no card real
// (list.js): selection=verde, multi_selection=laranja, gallery=roxo.
const MODES = [
  { key: 'selection',       label: 'Seleção',       sub: 'Cliente escolhe suas favoritas',       tint: 'rgba(63,185,80,0.06)',   border: 'rgba(63,185,80,0.22)',  badge: 'Em seleção',     badgeColor: '#d29922' },
  { key: 'gallery',         label: 'Galeria',        sub: 'Cliente visualiza e baixa',            tint: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.22)', badge: 'Em visualização', badgeColor: '#d29922' },
  { key: 'multi_selection', label: 'Multi-Seleção',  sub: 'Formaturas, shows, eventos',           tint: 'rgba(255,166,87,0.06)',  border: 'rgba(255,166,87,0.22)',  badge: 'Em seleção',     badgeColor: '#d29922' },
  { key: 'multi_gallery',   label: 'Galeria em Grupo',sub: 'Galeria para múltiplos convidados',   tint: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.22)', badge: 'Em visualização', badgeColor: '#d29922' },
];

let _state = {}; // key -> { key, imageUrl, opacity, active }
let _platformConfig = {}; // global platform configs

async function loadSessionBackgrounds() {
  const el = document.getElementById('tabSessionBackgrounds');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando fundos...</div>';
  try {
    const [data, configData] = await Promise.all([
      apiRequest('GET', '/api/admin/session-card-backgrounds'),
      apiRequest('GET', '/api/admin/saas/platform-config')
    ]);
    _state = {};
    (data.backgrounds || []).forEach(b => { _state[b.key] = b; });
    _platformConfig = configData.config || {};
    renderSessionBackgrounds(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderSessionBackgrounds(container) {
  const wmImageUrl = _platformConfig.watermarkPreviewImage || '';
  
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2.5rem;">
      <!-- Configuração de Previews da Marca d'água -->
      <div>
        <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Preview Global da Marca D'água</h2>
        <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 1rem; max-width:680px;">
          Imagem usada como plano de fundo para o fotógrafo configurar o tamanho e a posição de sua marca d'água 
          (simulando uma foto real em proporções 16:9 e 9:16).
        </p>
        <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
          <div style="width:160px; height:90px; background:#0f172a; border:1px solid #334155; border-radius:0.375rem; overflow:hidden; display:flex; align-items:center; justify-content:center;">
            ${wmImageUrl ? `<img src="${esc(wmImageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="color:#64748b; font-size:0.75rem;">Sem imagem</span>`}
          </div>
          <div style="flex:1;">
            <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer; font-weight:600; display:inline-block; margin-bottom:0.5rem;">
              ${wmImageUrl ? 'Trocar imagem' : 'Upload imagem'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadPlatformWatermarkBg(this)">
            </label>
            <p style="font-size:0.68rem; color:#475569; margin:0;">Recomendado: Imagem em alta qualidade (paisagem 16:9), será cortada no admin do fotógrafo para simular fotos em retrato.</p>
            <span id="wmBgStatus" style="font-size:0.72rem; color:#34d399; margin-left:0.5rem;"></span>
          </div>
        </div>
      </div>

      <!-- Configuração de Fundo dos Cards de Sessão -->
      <div>
        <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Fundo dos Cards de Sessão</h2>
        <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 1rem; max-width:680px;">
          Imagem de fundo dos cards no <strong style="color:#cbd5e1;">catálogo de sessões</strong> de todos os fotógrafos,
          por <strong style="color:#cbd5e1;">modo de sessão</strong>. Quando o fotógrafo cria uma sessão de
          <em>Seleção</em>, <em>Galeria</em> ou <em>Multi-Seleção</em>, o card correspondente usa o fundo que você
          definir aqui. Sem imagem, o card mantém o tint sólido padrão. Reflete para todos assim que você salva.
        </p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:1rem;">
          ${MODES.map(renderModeEditor).join('')}
        </div>
      </div>
    </div>
  `;
}

const USER_ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';

function renderModeEditor(meta) {
  const bg = _state[meta.key] || { key: meta.key, imageUrl: '', opacity: 0.18, active: true };
  const hasImage = !!bg.imageUrl;
  const active = bg.active !== false;
  const opacity = (typeof bg.opacity === 'number') ? bg.opacity : 0.18;

  const opacitySlider = (hasImage || bg.text) ? `
      <div style="display:flex; align-items:center; gap:0.6rem;">
        <span style="font-size:0.72rem; color:#94a3b8; white-space:nowrap;">Opacidade</span>
        <input type="range" min="0" max="100" value="${Math.round(opacity * 100)}" style="flex:1; cursor:pointer;"
          oninput="window.previewSessionBgOpacity('${meta.key}', this.value)"
          onchange="window.saveSessionBgOpacity('${meta.key}', this.value)">
        <span id="sbgOpLabel-${meta.key}" style="font-size:0.72rem; color:#cbd5e1; width:36px; text-align:right;">${Math.round(opacity * 100)}%</span>
      </div>` : '';

  return `
    <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.75rem; opacity:${active ? '1' : '0.6'};">
      <!-- nome + toggle -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
        <div>
          <strong style="color:#f1f5f9; font-size:0.95rem;">${esc(meta.label)}</strong>
          <div style="font-size:0.7rem; color:#64748b;">${esc(meta.sub)}</div>
        </div>
        <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; cursor:pointer; ${active ? 'background:#064e3b; color:#34d399;' : 'background:#0f172a; color:#64748b; border:1px solid #334155;'}"
          onclick="window.toggleSessionBgActive('${meta.key}', ${active})">
          ${active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      ${renderCardPreview(meta, bg, opacity)}
      ${opacitySlider}

      <!-- campos adicionais -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:0.25rem;">
        <div style="display:flex; flex-direction:column; gap:0.25rem;">
          <label style="font-size:0.72rem; color:#94a3b8;">Texto (Marca d'água)</label>
          <input type="text" placeholder="Ex: Galeria" value="${esc(bg.text || '')}" style="background:#0f172a; border:1px solid #334155; color:#f1f5f9; border-radius:0.375rem; padding:0.4rem; font-size:0.8rem;"
            oninput="window.previewSessionBgText('${meta.key}', this.value)"
            onchange="window.saveSessionBgField('${meta.key}', 'text', this.value)">
        </div>
        <div style="display:flex; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.25rem; flex:1;">
            <label style="font-size:0.72rem; color:#94a3b8;">Cor Texto</label>
            <input type="color" value="${esc(bg.textColor || '#ffffff')}" style="background:#0f172a; border:1px solid #334155; border-radius:0.375rem; width:100%; height:32px; cursor:pointer;"
              oninput="window.previewSessionBgTextColor('${meta.key}', this.value)"
              onchange="window.saveSessionBgField('${meta.key}', 'textColor', this.value)">
          </div>
          <div style="display:flex; flex-direction:column; gap:0.25rem; flex:1;">
            <label style="font-size:0.72rem; color:#94a3b8;">Cor do Card</label>
            <input type="color" value="${bg.bgColor ? esc(bg.bgColor) : '#000000'}" style="background:#0f172a; border:1px solid #334155; border-radius:0.375rem; width:100%; height:32px; cursor:pointer;"
              oninput="window.previewSessionBgColor('${meta.key}', this.value)"
              onchange="window.saveSessionBgField('${meta.key}', 'bgColor', this.value)">
            ${bg.bgColor ? `<button onclick="window.saveSessionBgField('${meta.key}', 'bgColor', '')" style="font-size:0.6rem; background:none; border:none; color:#fca5a5; cursor:pointer; padding:0; text-align:left;">Limpar Cor</button>` : `<span style="font-size:0.6rem; color:#64748b;">(Padrão)</span>`}
          </div>
        </div>
      </div>

      <!-- ações -->
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer; font-weight:600;">
          ${hasImage ? 'Trocar imagem' : 'Upload imagem'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadSessionBgImage(this, '${meta.key}')">
        </label>
        ${hasImage ? `<button onclick="window.removeSessionBgImage('${meta.key}', '${esc(meta.label)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer;">Remover</button>` : ''}
        <span id="sbgStatus-${meta.key}" style="font-size:0.72rem; color:#64748b;"></span>
      </div>
      <p style="font-size:0.68rem; color:#475569; margin:0;">Imagem larga (paisagem). JPG, PNG ou WEBP, até 2 MB. Ajuste a opacidade para o conteúdo do card ficar legível.</p>
    </div>
  `;
}

// Preview fiel ao card real do catálogo do fotógrafo: superfície clara (tema light do
// admin) + tint do modo + imagem de fundo na opacidade escolhida + conteúdo por cima.
function renderCardPreview(meta, bg, opacity) {
  const hasImage = !!bg.imageUrl;
  const text = bg.text || '';
  const textColor = bg.textColor || '#ffffff';
  const bgColor = bg.bgColor || '';
  
  const imgLayer = hasImage
    ? `<div id="sbgPreviewImg-${meta.key}" style="position:absolute; inset:0; background-image:url('${esc(bg.imageUrl)}'); background-size:cover; background-position:center; opacity:${opacity}; pointer-events:none;"></div>`
    : '';

  const textLayer = `<div id="sbgPreviewTextWrapper-${meta.key}" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; overflow:hidden; opacity:${opacity}; ${!text ? 'display:none;' : ''}">
      <span id="sbgPreviewText-${meta.key}" style="font-size:clamp(3rem, 10vw, 8rem); font-weight:800; color:${esc(textColor)}; line-height:1; white-space:nowrap;">${esc(text)}</span>
    </div>`;

  const cardBackground = bgColor ? bgColor : '#f1f1f3';

  return `
    <div id="sbgPreviewCard-${meta.key}" style="position:relative; overflow:hidden; border:1px solid ${meta.border}; border-radius:12px; background:${esc(cardBackground)};">
      ${imgLayer}
      ${textLayer}
      <div style="position:relative; padding:0.85rem;">
        <div style="display:flex; gap:0.6rem; align-items:flex-start;">
          <div style="width:46px; height:46px; flex-shrink:0; border-radius:8px; background:rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.1); display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:0.5rem;">Capa</div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <span style="color:#1a1a1a; font-size:0.85rem; font-weight:700;">Ana &amp; João</span>
              <span style="color:#3fb950; font-size:0.66rem; display:inline-flex; align-items:center; gap:0.15rem;">${USER_ICON} Cliente</span>
              <span style="background:${meta.badgeColor}22; color:${meta.badgeColor}; border:1px solid ${meta.badgeColor}55; font-size:0.6rem; padding:0.05rem 0.4rem; border-radius:9999px; font-weight:600;">${esc(meta.badge)}</span>
            </div>
            <div style="color:#52525b; font-size:0.66rem; margin-top:0.2rem;">12/06/2026 • 84 fotos</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.25rem; margin-top:0.6rem; padding-top:0.45rem; border-top:1px solid rgba(0,0,0,0.08);">
          ${['Criada', 'Fotos', 'Link', 'Entregue'].map((s, i) => `
            <div style="width:0.8rem; height:0.8rem; border-radius:50%; background:${i < 2 ? '#3fb950' : 'rgba(0,0,0,0.15)'}; color:#fff; font-size:0.4rem; display:flex; align-items:center; justify-content:center;">${i < 2 ? '✓' : ''}</div>
            ${i < 3 ? `<div style="flex:1; height:1px; background:${i < 1 ? '#3fb950' : 'rgba(0,0,0,0.12)'};"></div>` : ''}
          `).join('')}
        </div>
      </div>
    </div>`;
}

// ── Upload + persistência ──────────────────────────────────────────────────────

window.uploadSessionBgImage = async (input, key) => {
  const file = input.files && input.files[0];
  if (!file) return;
  const status = document.getElementById(`sbgStatus-${key}`);
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

    await apiRequest('POST', `/api/admin/session-card-backgrounds/${key}`, { imageUrl: json.url });
    saasToast('Fundo do card atualizado!', 'success');
    await loadSessionBackgrounds();
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

window.uploadPlatformWatermarkBg = async (input) => {
  const file = input.files && input.files[0];
  if (!file) return;
  const status = document.getElementById('wmBgStatus');
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

    await apiRequest('PATCH', `/api/admin/saas/platform-config`, { watermarkPreviewImage: json.url });
    saasToast('Preview da marca d\'água atualizado!', 'success');
    await loadSessionBackgrounds();
  } catch (err) {
    if (status) status.textContent = 'Erro ao enviar.';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

window.removeSessionBgImage = async (key, label) => {
  if (!await saasConfirm(`Remover a imagem de fundo das sessões "${label}"? Os cards voltam ao tint sólido.`, { title: 'Remover imagem', confirmText: 'Remover', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/session-card-backgrounds/${key}`);
    saasToast('Imagem removida.', 'success');
    await loadSessionBackgrounds();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.toggleSessionBgActive = async (key, current) => {
  try {
    await apiRequest('PATCH', `/api/admin/session-card-backgrounds/${key}`, { active: !current });
    saasToast(!current ? 'Fundo ativado!' : 'Fundo desativado.', 'success');
    await loadSessionBackgrounds();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// Atualiza só o preview ao vivo (sem salvar) enquanto arrasta o slider.
window.previewSessionBgOpacity = (key, val) => {
  const op = Math.max(0, Math.min(100, Number(val))) / 100;
  const img = document.getElementById(`sbgPreviewImg-${key}`);
  const txt = document.getElementById(`sbgPreviewTextWrapper-${key}`);
  const label = document.getElementById(`sbgOpLabel-${key}`);
  if (img) img.style.opacity = op;
  if (txt) txt.style.opacity = op;
  if (label) label.textContent = `${Math.round(op * 100)}%`;
};

// Preview e Save para Text, TextColor e BGColor
window.previewSessionBgText = (key, val) => {
  const wrapper = document.getElementById(`sbgPreviewTextWrapper-${key}`);
  const textEl = document.getElementById(`sbgPreviewText-${key}`);
  if (textEl && wrapper) {
    textEl.textContent = val;
    wrapper.style.display = val ? 'flex' : 'none';
  }
};

window.previewSessionBgTextColor = (key, val) => {
  const textEl = document.getElementById(`sbgPreviewText-${key}`);
  if (textEl) textEl.style.color = val;
};

window.previewSessionBgColor = (key, val) => {
  const card = document.getElementById(`sbgPreviewCard-${key}`);
  if (card) card.style.background = val;
};

window.saveSessionBgField = async (key, field, val) => {
  try {
    await apiRequest('PATCH', `/api/admin/session-card-backgrounds/${key}`, { [field]: val });
    if (!_state[key]) _state[key] = { key, imageUrl: '', opacity: 0.18, active: true, text: '', textColor: '#ffffff', bgColor: '' };
    _state[key][field] = val;
    saasToast('Atualizado!', 'success');
    await loadSessionBackgrounds();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// Salva a opacidade ao soltar o slider. Não recarrega — preserva a posição do slider.
window.saveSessionBgOpacity = async (key, val) => {
  const op = Math.max(0, Math.min(100, Number(val))) / 100;
  try {
    await apiRequest('PATCH', `/api/admin/session-card-backgrounds/${key}`, { opacity: op });
    if (_state[key]) _state[key].opacity = op;
    else _state[key] = { key, imageUrl: '', opacity: op, active: true };
    saasToast('Opacidade salva.', 'success');
  } catch (err) {
    saasToast('Erro ao salvar opacidade: ' + err.message, 'error');
  }
};

export { loadSessionBackgrounds };
