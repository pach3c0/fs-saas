/**
 * Tab: Estudio
 */

import { apiGet, apiPut } from '../utils/api.js';
import { resolveImagePath } from '../utils/helpers.js';
import { uploadImage, uploadVideo, showUploadProgress } from '../utils/upload.js';
import { appState } from '../state.js';
import { addInlineToolbar, createRichEditor } from '../utils/richtext.js';

let _studio = null;
let _studioSelectedLayerId = null;

async function saveEstudio(silent = false) {
  try {
    const indicator = document.getElementById('builder-save-indicator');
    if (indicator && !silent) {
      indicator.textContent = 'Salvando...';
      indicator.style.opacity = '1';
    }
    await apiPut('/api/site/admin/config', { siteContent: { studio: _studio } });
    if (indicator && !silent) {
      indicator.textContent = 'Salvo!';
      setTimeout(() => {
        if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
      }, 1500);
    }
    if (!silent) window._meuSitePostPreview?.();
  } catch (err) {
    console.error('Erro no auto-save de estudio:', err);
    const indicator = document.getElementById('builder-save-indicator');
    if (indicator) {
      indicator.textContent = 'Erro ao salvar!';
      indicator.style.color = 'var(--red,#f85149)';
    }
  }
}

function getCurrentStudio(container, overrides = {}) {
  const msgs = [];
  container.querySelectorAll('[data-whatsapp-text]').forEach((textarea, idx) => {
    msgs.push({
      text: textarea.value,
      delay: parseInt(container.querySelector(`[data-whatsapp-delay="${idx}"]`)?.value || 5)
    });
  });
  const videoToggle = container.querySelector('#videoEnabledToggle');
  const mapToggle = container.querySelector('#studioMapEnabledToggle');
  // Coleta valores dos RTE se disponíveis, senão cai para os inputs ocultos
  const titleEl = container.querySelector('#studioTitle');
  const descEl = container.querySelector('#studioDesc');
  const hoursEl = container.querySelector('#studioHours');
  return {
    ..._studio,
    title: overrides.title ?? (titleEl ? titleEl.value : _studio.title || ''),
    description: overrides.description ?? (descEl ? descEl.value : _studio.description || ''),
    address: container.querySelector('#studioAddress')?.value || _studio.address || '',
    hours: overrides.hours ?? (hoursEl ? hoursEl.value : _studio.hours || ''),
    whatsapp: container.querySelector('#studioWhatsapp')?.value || _studio.whatsapp || '',
    whatsappMessages: msgs.length > 0 ? msgs : _studio.whatsappMessages,
    videoEnabled: videoToggle ? videoToggle.checked : (_studio.videoEnabled ?? false),
    mapEnabled: mapToggle ? mapToggle.checked : (_studio.mapEnabled ?? true),
  };
}

export function getStudioState() {
  return _studio;
}

export async function renderEstudio(container) {
  if (_studio === null) {
    const config = await apiGet('/api/site/admin/config');
    _studio = config?.siteContent?.studio || {};
  }
  if (!_studio.studioLayers) _studio.studioLayers = [];
  if (!_studio.whatsappMessages) _studio.whatsappMessages = [{ text: 'Olá! Como posso ajudar você hoje?', delay: 5 }];

  const whatsappHtml = _studio.whatsappMessages.map((msg, idx) => `
    <div style="display:flex; gap:0.75rem; align-items:flex-start; padding:1.25rem; background:var(--bg-elevated); border-radius:0.5rem; border:1px solid var(--border);">
      <div style="width:2rem; height:2rem; background:var(--green); color:white; border-radius:9999px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.875rem; flex-shrink:0;">
        ${idx + 1}
      </div>
      <div style="flex:1; display:flex; flex-direction:column; gap:0.75rem;">
        <textarea class="input" rows="2" data-whatsapp-text="${idx}" placeholder="Digite a mensagem..." style="background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem; border-radius:0.375rem; font-size:0.8rem; outline:none; resize:vertical;">${msg.text}</textarea>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <label style="font-size:0.75rem; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Delay (seg):</label>
          <input type="number" data-whatsapp-delay="${idx}" value="${msg.delay}" min="1" max="60"
            style="width:4rem; padding:0.4rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-surface); color:var(--text-primary); font-size:0.8rem; text-align:center; outline:none;">
        </div>
      </div>
      <button onclick="removeWhatsappMessage(${idx})" class="p-action-btn" title="Remover" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border); color:var(--red,#f85149);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  container.innerHTML = `
    <style>
      #config-estudio { display:flex; flex-direction:column; height:100%; }
      .se-section { border-bottom:1px solid #1f2937; }
      .se-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:space-between; }
      .se-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
      .se-label { font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
      .se-input { width:100%; padding:0.35rem 0.5rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; color:var(--text-primary); font-size:0.78rem; outline:none; box-sizing:border-box; }
      .se-input:focus { border-color:var(--accent); }
      .se-textarea { width:100%; padding:0.35rem 0.5rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; color:var(--text-primary); font-size:0.78rem; outline:none; box-sizing:border-box; resize:vertical; min-height:60px; }
      .se-range-row { display:flex; align-items:center; gap:0.4rem; }
      .se-range { flex:1; accent-color:var(--accent); }
      .se-range-val { font-size:0.65rem; font-family:monospace; color:var(--text-muted); min-width:2.5rem; text-align:right; }
      .se-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
      .se-btn:hover { background:var(--bg-hover); }
      .se-btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
      .se-btn.success { background:var(--green); border-color:var(--green); color:#fff; font-weight:700; }
      .se-btn.danger { background:var(--red); border-color:var(--red); color:#fff; }
      .se-layer-item { margin:0 0.5rem 0.35rem; padding:0.4rem 0.6rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.75rem; color:var(--text-primary); }
      .se-layer-item:hover { background:var(--bg-hover); }
      .se-layer-item.active { border-color:var(--accent); background:#172554; }
      .se-layer-item .layer-del { color:var(--red); margin-left:auto; opacity:0.6; font-size:0.85rem; }
      .se-layer-item .layer-del:hover { opacity:1; }
      .se-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; }
    </style>

    <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
      <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
        <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Estúdio</h3>
        <p style="color:var(--text-muted); font-size:0.875rem; text-align:center; max-width:320px;">Edite as informações e imagens do seu estúdio.</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:1.5rem; width:100%;">
        <!-- APRESENTAÇÃO -->
        <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:1.25rem; width:100%; box-sizing:border-box;">
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); text-align:center;">Apresentação</h3>
          <div style="width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Título</label>
            <div id="studioTitleWrap" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.375rem; padding:0.25rem;"></div>
            <input type="text" id="studioTitle" class="se-input" style="display:none;" value="${(_studio.title || '').replace(/"/g, '&quot;')}">
          </div>
          <div style="width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Descrição</label>
            <div id="studioDescWrap" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.375rem; padding:0.25rem;"></div>
            <textarea id="studioDesc" class="se-textarea" rows="3" style="display:none;">${_studio.description || ''}</textarea>
          </div>
        </div>

        <!-- INFORMAÇÕES -->
        <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:1.25rem; width:100%; box-sizing:border-box;">
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); text-align:center;">Informações</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; width:100%;">
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Endereço</label>
              <input type="text" id="studioAddress" class="input" value="${(_studio.address || '').replace(/"/g, '&quot;')}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">WhatsApp (com DDD)</label>
              <input type="text" id="studioWhatsapp" class="input" value="${_studio.whatsapp || ''}" placeholder="5511999999999" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>
          </div>
          <div style="width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Horário de Atendimento</label>
            <div id="studioHoursWrap" style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.375rem; padding:0.25rem;"></div>
            <textarea id="studioHours" class="se-textarea" rows="2" style="display:none;">${_studio.hours || ''}</textarea>
          </div>
          <div style="display:flex; justify-content:center; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-surface); border-radius:0.5rem; border:1px solid var(--border); width:100%; box-sizing:border-box;">
            <label style="position:relative; display:inline-block; width:2.5rem; height:1.375rem; flex-shrink:0; cursor:pointer;">
              <input type="checkbox" id="studioMapEnabledToggle" ${_studio.mapEnabled !== false ? 'checked' : ''} style="opacity:0; width:0; height:0; position:absolute;">
              <span id="studioMapToggleTrack" style="position:absolute; inset:0; border-radius:9999px; background:${_studio.mapEnabled !== false ? 'var(--accent)' : 'var(--border)'}; transition:background 0.2s;">
                <span style="position:absolute; left:${_studio.mapEnabled !== false ? '1.125rem' : '0.125rem'}; top:0.125rem; width:1.125rem; height:1.125rem; border-radius:9999px; background:white; transition:left 0.2s;"></span>
              </span>
            </label>
            <span style="font-size:0.875rem; color:var(--text-primary);">Exibir mapa interativo no site</span>
          </div>
        </div>

        <!-- FOTOS (CANVAS DE CAMADAS) -->
        <div style="background:var(--bg-elevated); border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; width:100%; box-sizing:border-box;">
          <div style="padding:1.5rem; border-bottom:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:1rem;">
            <div style="text-align:center;">
              <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); text-align:center;">Fotos do Estúdio</h3>
              <p style="font-size:0.75rem; color:var(--text-secondary); text-align:center;">Composição livre de camadas — máximo 4 fotos</p>
            </div>
            <div id="studioAddPhotoWrapper" style="display:flex; justify-content:center;">
              <label class="btn" style="cursor:pointer; border-radius:9999px; padding:0.5rem 1.25rem; font-weight:600;" title="Adicionar Foto">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Adicionar Foto
                <input type="file" accept=".jpg,.jpeg,.png" id="studioUploadInput" style="display:none;">
              </label>
            </div>
          </div>
          <div id="studioUploadProgress" style="padding:0 1.5rem;"></div>

          <!-- Lista de camadas -->
          <div class="se-section" style="border-bottom:none;">
            <div class="se-section-head" style="justify-content:center;">Camadas</div>
            <div id="studio-layer-list"></div>
          </div>

          <!-- Painel de propriedades da camada selecionada -->
          <div id="studio-layer-props" class="se-section" style="display:none; border-top:1px solid var(--border);">
            <div class="se-section-head" style="justify-content:center;">Ajustes da Foto</div>
            <div id="studio-layer-props-content"></div>
          </div>
        </div>

        <!-- MENSAGENS WHATSAPP -->
        <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:1.25rem; width:100%; box-sizing:border-box;">
          <div style="text-align:center;">
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); text-align:center;">Mensagens do WhatsApp</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary); text-align:center;">Mensagens que aparecem na bolha flutuante</p>
          </div>
          
          <div style="display:flex; justify-content:center; width:100%;">
            <button id="addWhatsappMsgBtn" class="btn" style="border-radius:9999px; padding:0.5rem 1.25rem; font-weight:600;" title="Nova Mensagem">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova Mensagem
            </button>
          </div>

          <div id="whatsappList" style="display:flex; flex-direction:column; gap:1rem; width:100%;">
            ${whatsappHtml}
          </div>
        </div>

        <!-- VÍDEO -->
        <div style="background:var(--bg-elevated); padding:1.5rem; border-radius:0.75rem; border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; gap:1.25rem; width:100%; box-sizing:border-box;">
          <div style="text-align:center;">
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); text-align:center;">Vídeo do Estúdio</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary); text-align:center;">Exibido abaixo das fotos no site. Máximo 300MB.</p>
          </div>
          
          <div style="display:flex; justify-content:center; gap:1rem; align-items:center;">
            <label style="background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              ${_studio.videoUrl ? 'Trocar Vídeo' : 'Upload de Vídeo'}
              <input type="file" accept=".mp4,.mov,.webm" id="studioVideoInput" style="display:none;">
            </label>
            ${_studio.videoUrl ? `
              <button id="removeVideoBtn" class="p-action-btn" title="Remover Vídeo" style="width:32px !important; min-width:32px !important; height:32px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:color-mix(in srgb, var(--red) 15%, transparent); border:1px solid color-mix(in srgb, var(--red) 30%, transparent); color:var(--red);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            ` : ''}
          </div>
          
          <div id="studioVideoProgress" style="width:100%;"></div>
          
          ${_studio.videoUrl ? `
            <div style="display:flex; justify-content:center; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-surface); border-radius:0.5rem; border:1px solid var(--border); width:100%; box-sizing:border-box;">
              <label style="position:relative; display:inline-block; width:2.5rem; height:1.375rem; flex-shrink:0; cursor:pointer;">
                <input type="checkbox" id="videoEnabledToggle" ${_studio.videoEnabled ? 'checked' : ''} style="opacity:0; width:0; height:0; position:absolute;">
                <span id="videoToggleTrack" style="position:absolute; inset:0; border-radius:9999px; background:${_studio.videoEnabled ? 'var(--accent)' : 'var(--border)'}; transition:background 0.2s;">
                  <span style="position:absolute; left:${_studio.videoEnabled ? '1.125rem' : '0.125rem'}; top:0.125rem; width:1.125rem; height:1.125rem; border-radius:9999px; background:white; transition:left 0.2s;"></span>
                </span>
              </label>
              <span style="font-size:0.875rem; color:var(--text-primary);">Exibir vídeo no site</span>
            </div>
            <div style="width:100%; aspect-ratio:16/9; border-radius:0.5rem; overflow:hidden; background:#000; border:1px solid var(--border);">
              <video src="${resolveImagePath(_studio.videoUrl)}" controls style="width:100%; height:100%; object-fit:contain;"></video>
            </div>
          ` : '<p style="color:var(--text-secondary); text-align:center; padding:1.5rem; width:100%; border:1px dashed var(--border); border-radius:0.5rem; background:rgba(0,0,0,0.2);">Nenhum vídeo adicionado.</p>'}
        </div>
      </div>
    </div>
  `;

  const doAutoSave = async () => {
    _studio = {
      ...getCurrentStudio(container, {
        title: studioTitleRte?.getValue(),
        description: studioDescRte?.getValue(),
        hours: studioHoursRte?.getValue(),
      }),
    };
    await saveEstudio();
  };

  const liveNotify = () => {
    window._meuSitePostPreview?.();
    doAutoSave();
  };
  const layers = _studio.studioLayers;

  // ── Rich text editors ──
  const studioTitleInput = container.querySelector('#studioTitle');
  const studioTitleRte = addInlineToolbar(
    studioTitleInput,
    () => liveNotify(),
    { placeholder: 'Nome ou título do estúdio', features: ['bold', 'italic', 'emoji'] }
  );
  studioTitleRte.setValue(_studio.title || '');

  const studioDescWrap = container.querySelector('#studioDescWrap');
  const studioDescRte = createRichEditor(
    studioDescWrap,
    _studio.description || '',
    () => liveNotify(),
    {
      placeholder: 'Descrição do estúdio...',
      minHeight: 80,
      features: ['bold', 'italic', 'underline', 'br', 'list', 'emoji', 'clear'],
    }
  );

  const studioHoursWrap = container.querySelector('#studioHoursWrap');
  const studioHoursRte = createRichEditor(
    studioHoursWrap,
    _studio.hours || '',
    () => liveNotify(),
    {
      placeholder: 'Ex: Seg-Sex: 9h às 18h...',
      minHeight: 50,
      features: ['bold', 'italic', 'br'],
    }
  );

  // --- Renderização da lista de camadas ---
  const _renderLayerList = () => {
    const list = container.querySelector('#studio-layer-list');
    const addWrap = container.querySelector('#studioAddPhotoWrapper');
    if (addWrap) addWrap.style.display = layers.length >= 4 ? 'none' : 'block';

    if (!layers.length) {
      list.innerHTML = '<p style="padding:0.75rem; color:var(--text-muted); font-size:0.7rem; text-align:center;">Nenhuma foto adicionada ao estúdio.</p>';
      return;
    }

    list.innerHTML = [...layers].reverse().map((l, idx) => `
      <div class="se-layer-item ${l.id === _studioSelectedLayerId ? 'active' : ''}" data-id="${l.id}" data-idx="${idx}" draggable="true">
        <span class="layer-drag" style="cursor:grab; color:var(--text-muted); font-size:0.75rem; flex-shrink:0; padding-right:0.2rem;">⠿</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${l.name}</span>
        <span class="layer-del" data-del="${l.id}">✕</span>
      </div>
    `).join('');

    let dragLayerIdx = null;
    list.querySelectorAll('.se-layer-item').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        dragLayerIdx = parseInt(item.dataset.idx);
        item.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        list.querySelectorAll('.se-layer-item').forEach(i => i.style.borderTop = '');
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.style.borderTop = '2px solid var(--accent)';
      });
      item.addEventListener('dragleave', () => { item.style.borderTop = ''; });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.style.borderTop = '';
        const targetIdx = parseInt(item.dataset.idx);
        if (dragLayerIdx === null || dragLayerIdx === targetIdx) return;
        const realLen = layers.length;
        const realDrag = realLen - 1 - dragLayerIdx;
        const realTarget = realLen - 1 - targetIdx;
        const moved = layers.splice(realDrag, 1)[0];
        layers.splice(realTarget, 0, moved);
        dragLayerIdx = null;
        _renderLayerList();
        liveNotify();
      });

      item.onclick = async (e) => {
        const id = item.dataset.id;
        if (e.target.dataset.del) {
          e.stopPropagation();
          const ok = await window.showConfirm?.('Remover esta foto?', { confirmText: 'Remover', danger: true });
          if (!ok) return;
          const idx = layers.findIndex(l => l.id === id);
          if (idx !== -1) layers.splice(idx, 1);
          if (_studioSelectedLayerId === id) _studioSelectedLayerId = null;
          _renderLayerList();
          _renderPropsForLayer(null);
          liveNotify();
          return;
        }
        if (e.target.classList.contains('layer-drag')) return;
        _studioSelectedLayerId = id;
        _renderLayerList();
        _renderPropsForLayer(layers.find(l => l.id === _studioSelectedLayerId));
        const iframe = document.getElementById('builder-iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'cz_highlight_layer', layerId: id }, window.location.origin);
        }
      };
    });
  };

  // --- Painel de propriedades da camada ---
  const _renderPropsForLayer = (l) => {
    const props = container.querySelector('#studio-layer-props');
    const content = container.querySelector('#studio-layer-props-content');
    if (!l) { props.style.display = 'none'; return; }
    props.style.display = 'block';

    content.innerHTML = `
      <div class="se-grid2">
        <div class="se-row">
          <span class="se-label">Pos X (%)</span>
          <div class="se-range-row">
            <input type="range" class="se-range" id="slX" min="0" max="100" value="${l.x ?? 50}">
            <span class="se-range-val" id="slXVal">${l.x ?? 50}%</span>
          </div>
        </div>
        <div class="se-row">
          <span class="se-label">Pos Y (%)</span>
          <div class="se-range-row">
            <input type="range" class="se-range" id="slY" min="0" max="100" value="${l.y ?? 50}">
            <span class="se-range-val" id="slYVal">${l.y ?? 50}%</span>
          </div>
        </div>
      </div>
      <div class="se-row">
        <span class="se-label">Escala / Zoom (%)</span>
        <div class="se-range-row">
          <input type="range" class="se-range" id="slScale" min="10" max="300" value="${l.scale ?? 100}">
          <span class="se-range-val" id="slScaleVal">${l.scale ?? 100}%</span>
        </div>
      </div>
      <div class="se-grid2">
        <div class="se-row">
          <span class="se-label">Largura (%)</span>
          <div class="se-range-row">
            <input type="range" class="se-range" id="slW" min="5" max="150" value="${l.width ?? 70}">
            <span class="se-range-val" id="slWVal">${l.width ?? 70}%</span>
          </div>
        </div>
        <div class="se-row">
          <span class="se-label">Altura (%)</span>
          <div class="se-range-row">
            <input type="range" class="se-range" id="slH" min="5" max="150" value="${l.height ?? 70}">
            <span class="se-range-val" id="slHVal">${l.height ?? 70}%</span>
          </div>
        </div>
      </div>
      <div class="se-row">
        <span class="se-label">Rotação</span>
        <div class="se-range-row">
          <input type="range" class="se-range" id="slRot" min="-180" max="180" value="${l.rotation ?? 0}">
          <span class="se-range-val" id="slRotVal">${l.rotation ?? 0}°</span>
        </div>
      </div>
      <div class="se-row">
        <span class="se-label">Opacidade</span>
        <div class="se-range-row">
          <input type="range" class="se-range" id="slOp" min="0" max="100" value="${l.opacity ?? 100}">
          <span class="se-range-val" id="slOpVal">${l.opacity ?? 100}%</span>
        </div>
      </div>
      <div class="se-row">
        <span class="se-label">Bordas</span>
        <div class="se-range-row">
          <input type="range" class="se-range" id="slRad" min="0" max="200" value="${l.borderRadius ?? 0}">
          <span class="se-range-val" id="slRadVal">${l.borderRadius ?? 0}px</span>
        </div>
      </div>
      <div class="se-row">
        <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; padding:0.2rem 0;">
          <input type="checkbox" id="slShadow" ${l.shadow ? 'checked' : ''}>
          <span class="se-label" style="margin:0;">Ativar Sombra</span>
        </label>
      </div>
      <div class="se-row" id="slShadowBlurRow" style="display:${l.shadow ? 'block' : 'none'}">
        <span class="se-label">Intensidade Sombra</span>
        <div class="se-range-row">
          <input type="range" class="se-range" id="slShadowBlur" min="0" max="60" value="${l.shadowBlur ?? 10}">
          <span class="se-range-val" id="slShadowBlurVal">${l.shadowBlur ?? 10}px</span>
        </div>
      </div>
      <div class="se-grid2" style="padding:0.4rem 0.75rem 0.75rem;">
        <button class="se-btn ${l.flipH ? 'primary' : ''}" id="slFlipH">↔ H</button>
        <button class="se-btn ${l.flipV ? 'primary' : ''}" id="slFlipV">↕ V</button>
      </div>
    `;

    const update = (field, val) => {
      l[field] = val;
      const suffixes = { rotation: '°', borderRadius: 'px', shadowBlur: 'px' };
      const suffix = suffixes[field] || '%';
      const labelId = `sl${field.charAt(0).toUpperCase() + field.slice(1)}Val`;
      const label = content.querySelector(`#${labelId}`);
      if (label) label.textContent = val + suffix;
      liveNotify();
    };

    content.querySelector('#slX').oninput = (e) => update('x', parseInt(e.target.value));
    content.querySelector('#slY').oninput = (e) => update('y', parseInt(e.target.value));
    content.querySelector('#slScale').oninput = (e) => update('scale', parseInt(e.target.value));
    content.querySelector('#slW').oninput = (e) => update('width', parseInt(e.target.value));
    content.querySelector('#slH').oninput = (e) => update('height', parseInt(e.target.value));
    content.querySelector('#slRot').oninput = (e) => update('rotation', parseInt(e.target.value));
    content.querySelector('#slOp').oninput = (e) => update('opacity', parseInt(e.target.value));
    content.querySelector('#slRad').oninput = (e) => update('borderRadius', parseInt(e.target.value));
    content.querySelector('#slShadow').onchange = (e) => {
      l.shadow = e.target.checked;
      content.querySelector('#slShadowBlurRow').style.display = e.target.checked ? 'block' : 'none';
      liveNotify();
    };
    content.querySelector('#slShadowBlur').oninput = (e) => update('shadowBlur', parseInt(e.target.value));
    content.querySelector('#slFlipH').onclick = () => { l.flipH = !l.flipH; _renderPropsForLayer(l); liveNotify(); };
    content.querySelector('#slFlipV').onclick = () => { l.flipV = !l.flipV; _renderPropsForLayer(l); liveNotify(); };
  };

  _renderLayerList();
  if (_studioSelectedLayerId) {
    const l = layers.find(l => l.id === _studioSelectedLayerId);
    if (l) _renderPropsForLayer(l);
  }

  // --- Upload de fotos ---
  container.querySelector('#studioUploadInput').onchange = async (e) => {
    if (layers.length >= 4) {
      window.showToast?.('Limite máximo de 4 fotos atingido.', 'warning');
      e.target.value = '';
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (p) => showUploadProgress('studioUploadProgress', p));
      const newLayer = {
        id: 'st_' + Date.now(),
        type: 'image',
        url: result.url,
        name: `Foto ${layers.length + 1}`,
        x: 50, y: 50, width: 60, height: 90, rotation: 0, opacity: 100,
        borderRadius: 0, shadow: false, shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.5)', flipH: false, flipV: false
      };
      layers.push(newLayer);
      _studioSelectedLayerId = newLayer.id;
      _studio = getCurrentStudio(container);
      await saveEstudio(true);
      _renderLayerList();
      _renderPropsForLayer(newLayer);
    } catch (err) {
      window.showToast?.('Erro no upload: ' + err.message, 'error');
    }
    e.target.value = '';
  };

  // --- Vídeo ---
  container.querySelector('#studioVideoInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 300 * 1024 * 1024) {
      window.showToast?.('O vídeo deve ter no máximo 300MB.', 'warning');
      return;
    }
    try {
      showUploadProgress('studioVideoProgress', 0);
      const result = await uploadVideo(file, appState.authToken, (percent) => {
        showUploadProgress('studioVideoProgress', percent);
      });
      showUploadProgress('studioVideoProgress', 100);
      _studio = { ...getCurrentStudio(container), videoUrl: result.url };
      e.target.value = '';
      await saveEstudio(true);
      renderEstudio(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    }
  };

  const removeVideoBtn = container.querySelector('#removeVideoBtn');
  if (removeVideoBtn) {
    removeVideoBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Remover o video do estudio?', { danger: true });
      if (!ok) return;
      _studio = { ...getCurrentStudio(container), videoUrl: '', videoEnabled: false };
      await saveEstudio(true);
      renderEstudio(container);
    };
  }

  const videoToggle = container.querySelector('#videoEnabledToggle');
  if (videoToggle) {
    videoToggle.onchange = async () => {
      const track = container.querySelector('#videoToggleTrack');
      if (track) {
        track.style.background = videoToggle.checked ? 'var(--accent)' : 'var(--border)';
        track.querySelector('span').style.left = videoToggle.checked ? '1.125rem' : '0.125rem';
      }
      _studio = getCurrentStudio(container);
      await saveEstudio(true);
    };
  }

  const mapToggle = container.querySelector('#studioMapEnabledToggle');
  if (mapToggle) {
    mapToggle.onchange = async () => {
      const track = container.querySelector('#studioMapToggleTrack');
      if (track) {
        track.style.background = mapToggle.checked ? 'var(--accent)' : 'var(--border)';
        track.querySelector('span').style.left = mapToggle.checked ? '1.125rem' : '0.125rem';
      }
      _studio = getCurrentStudio(container);
      await saveEstudio(true);
    };
  }

  const studioAddressInput = container.querySelector('#studioAddress');
  if (studioAddressInput) {
    studioAddressInput.oninput = (e) => {
      _studio.address = e.target.value;
      liveNotify();
    };
    studioAddressInput.onblur = async () => {
      _studio = getCurrentStudio(container);
      await saveEstudio(true);
    };
  }

  // --- WhatsApp ---
  container.querySelector('#addWhatsappMsgBtn').onclick = () => {
    _studio = getCurrentStudio(container);
    _studio.whatsappMessages.push({ text: '', delay: 5 });
    renderEstudio(container);
    doAutoSave();
  };

  window.removeWhatsappMessage = async (idx) => {
    const ok = await window.showConfirm?.('Remover esta mensagem?', { danger: true });
    if (!ok) return;
    _studio = getCurrentStudio(container);
    _studio.whatsappMessages.splice(idx, 1);
    await saveEstudio(true);
    renderEstudio(container);
  };
  
  // Auto-save WhatsApp changes
  container.querySelectorAll('[data-whatsapp-text], [data-whatsapp-delay]').forEach(input => {
    input.oninput = () => {
      window._meuSitePostPreview?.();
      doAutoSave();
    };
  });
  
  // Auto-save Endereco e WhatsApp inputs
  const studioWhatsappInput = container.querySelector('#studioWhatsapp');
  if (studioWhatsappInput) {
    studioWhatsappInput.oninput = () => {
      window._meuSitePostPreview?.();
      doAutoSave();
    };
  }


}
