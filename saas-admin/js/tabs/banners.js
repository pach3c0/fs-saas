// Banners de Parceiros — criador de banners (Superadmin)
import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

let _banners = [];
let _bannerEditMode = null; // null | 'new' | id
let _bannerEditData = null; // dados locais do banner sendo editado
let _bannerConfig = { interval: 0, accentColor: '#3fb950' };

function _inp(style = '') {
  return `background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.8125rem; font-family:inherit; outline:none; ${style}`;
}

// ── Tela 1: Lista de Banners ──────────────────────────────────────────────────

async function loadBanners() {
  const el = document.getElementById('tabBanners');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando banners...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/banners');
    const configData = await apiRequest('GET', '/api/admin/banners/config').catch(() => ({ interval: 0 }));
    _banners = data.banners || [];
    _bannerConfig = { interval: configData.interval || 0, accentColor: configData.accentColor || '#3fb950' };
    renderBannersList(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderBannersList(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Banners de Parceiros</h2>
          <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 0;">Banners de patrocinadores e parceiros exibidos no topo do dashboard dos fotógrafos.</p>
        </div>
        <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:0.6rem; background:#1e293b; border:1px solid #334155; padding:0.4rem 0.75rem; border-radius:0.375rem;">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <label style="font-size:0.75rem; color:#94a3b8; margin:0;" title="Tempo em segundos (0 = manual)">Auto-slide (s):</label>
              <input type="number" id="bInterval" value="${_bannerConfig.interval}" min="0" style="${_inp('width:56px; padding:0.2rem;')}" title="Tempo em segundos (0 = manual)">
            </div>
            <span style="width:1px; height:20px; background:#334155;"></span>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <label for="bAccentColor" style="font-size:0.75rem; color:#94a3b8; margin:0; cursor:pointer;" title="Cor do brilho e do botão do banner (a base escura é fixa)">Cor do banner:</label>
              <input type="color" id="bAccentColor" value="${esc(_bannerConfig.accentColor || '#3fb950')}" style="width:30px; height:24px; padding:0; border:1px solid #334155; border-radius:4px; background:transparent; cursor:pointer;" title="Cor do brilho e do botão (verde→preto por padrão)">
            </div>
            <button onclick="window.saveBannerConfig()" style="background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:3px; padding:0.25rem 0.6rem; font-size:0.75rem; cursor:pointer;">Salvar</button>
          </div>
          <button onclick="window.openBannerNew()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.125rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Novo Banner</button>
        </div>
      </div>

      <!-- lista -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#0f172a; border-bottom:1px solid #334155;">
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:60px; text-align:center;">Ordem</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:120px;">Preview</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Título / Nome</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Link de Destino</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:100px; text-align:center;">Status</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:180px; text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody id="bannersTableBody">
            ${_banners.length === 0
              ? '<tr><td colspan="6" style="color:#64748b; font-size:0.875rem; padding:2rem; text-align:center;">Nenhum banner cadastrado. Clique em "+ Novo Banner" para começar.</td></tr>'
              : _banners.map((b, i) => `
                <tr style="border-bottom:1px solid #334155; hover:background:#1e293b;">
                  <td style="padding:0.75rem 1rem; text-align:center; font-weight:600; color:#f1f5f9;">${b.order || 0}</td>
                  <td style="padding:0.75rem 1rem;">
                    <div style="width:100px; height:32px; border-radius:4px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:flex; align-items:center; justify-content:center;">
                      <img src="${esc(b.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                  </td>
                  <td style="padding:0.75rem 1rem; font-weight:600; color:#f1f5f9;">${esc(b.title)}</td>
                  <td style="padding:0.75rem 1rem; color:#94a3b8; font-size:0.78rem; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${b.linkUrl ? `<a href="${esc(b.linkUrl)}" target="_blank" style="color:#93c5fd; text-decoration:none;">${esc(b.linkUrl)}</a>` : '<em style="color:#475569;">Informativo (sem link)</em>'}
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; cursor:pointer; ${b.active ? 'background:#064e3b; color:#34d399;' : 'background:#1e293b; color:#64748b; border:1px solid #334155;'}"
                      onclick="window.toggleBannerActive('${b._id}', ${b.active})">
                      ${b.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <div style="display:flex; gap:0.375rem; justify-content:center;">
                      <button onclick="window.openBannerEdit('${b._id}')" style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Editar</button>
                      <button onclick="window.deleteBanner('${b._id}', '${esc(b.title)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Excluir</button>
                    </div>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Toggle Status Ativo ──────────────────────────────────────────────────────

window.toggleBannerActive = async (id, current) => {
  try {
    await apiRequest('PUT', `/api/admin/banners/${id}`, { active: !current });
    saasToast(!current ? 'Banner ativado!' : 'Banner desativado.', 'success');
    await loadBanners();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Excluir Banner ───────────────────────────────────────────────────────────

window.deleteBanner = async (id, title) => {
  if (!await saasConfirm(`Excluir definitivamente o banner "${title}"?`, { title: 'Excluir Banner', confirmText: 'Excluir', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/banners/${id}`);
    saasToast(`Banner "${title}" excluído.`, 'success');
    await loadBanners();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.saveBannerConfig = async () => {
  const input = document.getElementById('bInterval');
  if (!input) return;
  const interval = parseInt(input.value) || 0;
  const colorInput = document.getElementById('bAccentColor');
  const accentColor = colorInput ? colorInput.value : (_bannerConfig.accentColor || '#3fb950');

  try {
    const r = await apiRequest('POST', '/api/admin/banners/config', { interval, accentColor });
    saasToast('Configuração dos banners salva!', 'success');
    _bannerConfig.interval = interval;
    _bannerConfig.accentColor = (r && r.accentColor) || accentColor;
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
  }
};

// ── Tela 2: Editor de Banner ──────────────────────────────────────────────────

window.openBannerNew = () => {
  _bannerEditMode = 'new';
  _bannerEditData = { title: '', description: '', imageUrl: '', linkUrl: '', order: _banners.length, active: true };
  renderBannerEditor();
};

window.openBannerEdit = (id) => {
  const b = _banners.find(item => item._id === id);
  if (!b) return;
  _bannerEditMode = id;
  _bannerEditData = JSON.parse(JSON.stringify(b)); // clone
  renderBannerEditor();
};

function renderBannerEditor() {
  const el = document.getElementById('tabBanners');
  const d = _bannerEditData;
  const isNew = _bannerEditMode === 'new';

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:640px;">
      <!-- header -->
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button onclick="window.backToBannersList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer;">← Voltar</button>
        <h2 style="font-size:1.1rem; font-weight:700; color:#f1f5f9; margin:0;">${isNew ? 'Novo Banner de Parceiro' : `Editar: ${esc(d.title)}`}</h2>
      </div>

      <!-- formulário -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Título / Nome do Parceiro *
          <input id="bTitle" type="text" value="${esc(d.title)}" placeholder="Ex: Bling ERP" style="${_inp('width:100%;')}">
        </label>

        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Descrição / Conteúdo Abaixo da Imagem
          <div style="border:1px solid #334155; border-radius:0.375rem; overflow:hidden;">
            <div style="background:#1e293b; border-bottom:1px solid #334155; padding:0.25rem 0.5rem; display:flex; flex-wrap:wrap; gap:0.25rem;">
              <button type="button" onclick="document.execCommand('bold',false,null)" style="background:transparent; border:none; color:#f1f5f9; cursor:pointer; font-weight:bold; padding:0.2rem 0.5rem;" title="Negrito">B</button>
              <button type="button" onclick="document.execCommand('italic',false,null)" style="background:transparent; border:none; color:#f1f5f9; cursor:pointer; font-style:italic; padding:0.2rem 0.5rem;" title="Itálico">I</button>
              <button type="button" onclick="document.execCommand('underline',false,null)" style="background:transparent; border:none; color:#f1f5f9; cursor:pointer; text-decoration:underline; padding:0.2rem 0.5rem;" title="Sublinhado">U</button>
              <button type="button" onclick="document.execCommand('insertUnorderedList',false,null)" style="background:transparent; border:none; color:#f1f5f9; cursor:pointer; padding:0.2rem 0.5rem;">• Lista</button>
              <select onchange="document.execCommand('formatBlock', false, this.value); this.selectedIndex=0;" style="background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:3px; outline:none; font-size:0.75rem; margin-left:0.5rem;">
                <option value="">Formato...</option>
                <option value="P">Texto Normal</option>
                <option value="H3">Título Grande</option>
                <option value="H4">Subtítulo</option>
              </select>
              <div style="display:flex; align-items:center; gap:0.2rem; margin-left:0.5rem;">
                <label for="bTextColor" style="color:#f1f5f9; font-size:0.75rem; cursor:pointer;" title="Cor do Texto">Cor:</label>
                <input id="bTextColor" type="color" onchange="document.execCommand('foreColor', false, this.value);" title="Cor do Texto" style="border:none; padding:0; width:20px; height:20px; cursor:pointer; background:transparent;">
              </div>
            </div>
            <div id="bDescription" contenteditable="true" style="${_inp('width:100%; border:none; border-radius:0; min-height:80px;')} outline:none;">${d.description || ''}</div>
          </div>
        </label>

        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Link de Redirecionamento (Opcional - se vazio, o banner será puramente informativo)
          <input id="bLinkUrl" type="url" value="${esc(d.linkUrl || '')}" placeholder="Ex: https://bling.com.br/parceiro" style="${_inp('width:100%;')}">
        </label>
        
        <div style="font-size:0.7rem; color:#64748b; margin-top:0.3rem; display:flex; flex-direction:column; gap:0.25rem;">
          <strong style="color:#cbd5e1;">Navegação Interna (SPA)</strong>
          <span style="margin-bottom:0.15rem;">Para direcionar o fotógrafo a uma tela interna do painel, utilize um dos códigos abaixo:</span>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.15rem 0.5rem; font-family:monospace; color:#cbd5e1;">
            <div>Painel: <strong>#dashboard</strong></div>
            <div>Sessões: <strong>#sessoes</strong></div>
            <div>Clientes: <strong>#clientes</strong></div>
            <div>Álbuns Prova: <strong>#albuns-prova</strong></div>
            <div>Mensagens: <strong>#mensagens</strong></div>
            <div>CRM: <strong>#crm</strong></div>
            <div>Finanças/Gestão: <strong>#gestao</strong></div>
            <div>Meu Site: <strong>#meu-site</strong></div>
            <div>Domínio: <strong>#dominio</strong></div>
            <div>Integrações: <strong>#integracoes</strong></div>
            <div>Marketing: <strong>#marketing</strong></div>
            <div>Perfil: <strong>#perfil</strong></div>
            <div>Plano: <strong>#plano</strong></div>
            <div>Ajuda/Manual: <strong>#ajuda</strong></div>
            <div>Configurações: <strong>#configuracoes</strong></div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
            Ordem de Exibição
            <input id="bOrder" type="number" min="0" value="${d.order || 0}" style="${_inp('width:100%;')}">
          </label>

          <div style="display:flex; align-items:center; gap:0.5rem; padding-top:1.25rem;">
            <input id="bActive" type="checkbox" ${d.active ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
            <label for="bActive" style="font-size:0.8125rem; color:#94a3b8; cursor:pointer;">Banner Ativo (Visível)</label>
          </div>
        </div>

        <!-- Área de Upload de Imagem -->
        <div style="border-top:1px solid #334155; padding-top:1rem; margin-top:0.5rem;">
          <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.5rem;">Imagem do Banner *</span>
          
          <div id="bPreviewContainer" style="margin-bottom:0.75rem; width:100%; border-radius:6px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:${d.imageUrl ? 'flex' : 'none'}; align-items:center; justify-content:center; aspect-ratio:16/9;">
            ${d.imageUrl ? `<img id="bPreviewImg" src="${esc(d.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">` : ''}
          </div>
          
          <div style="display:flex; gap:0.75rem; align-items:center;">
            <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.45rem 1rem; font-size:0.8rem; cursor:pointer; font-weight:600;">
              ${d.imageUrl ? 'Trocar Imagem' : 'Upload Imagem'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadBannerImage(this)">
            </label>
            <span id="bUploadStatus" style="font-size:0.75rem; color:#64748b;"></span>
          </div>
          <p style="font-size:0.7rem; color:#64748b; margin-top:0.5rem;">Tamanho recomendado: Proporção 4.8:1 (ex: 960x200px ou 1200x250px). JPG, PNG ou WEBP.</p>
        </div>
      </div>

      <!-- footer botoes -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #334155; padding-top:1rem;">
        <button onclick="window.backToBannersList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.875rem; cursor:pointer;">Cancelar</button>
        <button onclick="window.saveBanner()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.5rem; font-size:0.875rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
    </div>
  `;
}

// ── Upload da imagem ──────────────────────────────────────────────────────────

window.uploadBannerImage = async (input) => {
  const file = input.files && input.files[0];
  if (!file) return;

  const status = document.getElementById('bUploadStatus');
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
    
    _bannerEditData.imageUrl = json.url;
    
    // Atualizar preview visual imediato sem reconstruir todo o HTML do formulário
    const previewContainer = document.getElementById('bPreviewContainer');
    previewContainer.innerHTML = `<img id="bPreviewImg" src="${esc(json.url)}" style="width:100%; height:100%; object-fit:cover;">`;
    previewContainer.style.display = 'flex';
    
    if (status) status.textContent = '✓ Enviado!';
    saasToast('Imagem de banner carregada!', 'success');
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

// ── Salvar Banner no Banco ────────────────────────────────────────────────────

window.saveBanner = async () => {
  const title = document.getElementById('bTitle')?.value.trim();
  const description = document.getElementById('bDescription')?.innerHTML.trim() || '';
  const linkUrl = document.getElementById('bLinkUrl')?.value.trim();
  const order = parseInt(document.getElementById('bOrder')?.value) || 0;
  const active = document.getElementById('bActive')?.checked || false;
  
  if (!title) { saasToast('Título é obrigatório.', 'error'); return; }
  if (!_bannerEditData.imageUrl) { saasToast('Imagem do banner é obrigatória.', 'error'); return; }

  const payload = {
    title,
    description,
    linkUrl,
    order,
    active,
    imageUrl: _bannerEditData.imageUrl
  };

  const btn = document.querySelector('button[onclick*="saveBanner"]');
  const originalText = btn ? btn.textContent : 'Salvar';
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

  try {
    if (_bannerEditMode === 'new') {
      await apiRequest('POST', '/api/admin/banners', payload);
      saasToast('Banner de parceiro criado!', 'success');
    } else {
      await apiRequest('PUT', `/api/admin/banners/${_bannerEditMode}`, payload);
      saasToast('Banner de parceiro atualizado!', 'success');
    }
    await loadBanners();
    _bannerEditMode = null;
    _bannerEditData = null;
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
};

window.backToBannersList = () => {
  _bannerEditMode = null;
  _bannerEditData = null;
  loadBanners();
};

export { loadBanners };
