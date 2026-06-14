// Novidades da Plataforma (Whats New) — gerenciador de atualizações (Superadmin)
import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

let _updates = [];
let _upEditMode = null; // null | 'new' | id
let _upEditData = null; // dados locais do item de novidade sendo editado

function _inp(style = '') {
  return `background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.8125rem; font-family:inherit; outline:none; ${style}`;
}

// ── Tela 1: Lista de Novidades ───────────────────────────────────────────────

async function loadPlatformUpdates() {
  const el = document.getElementById('tabNovidades');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando novidades...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/platform-updates');
    _updates = data.updates || [];
    renderUpdatesList(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderUpdatesList(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Novidades no CliqueZoom</h2>
          <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 0;">Atualizações, recursos e melhorias listados no rodapé do dashboard dos fotógrafos.</p>
        </div>
        <button onclick="window.openUpNew()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.125rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Nova Novidade</button>
      </div>

      <!-- lista -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#0f172a; border-bottom:1px solid #334155;">
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:60px; text-align:center;">Ordem</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:80px; text-align:center;">Ícone</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Título</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Descrição</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:120px;">Link</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:100px; text-align:center;">Status</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:180px; text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody id="updatesTableBody">
            ${_updates.length === 0
              ? '<tr><td colspan="7" style="color:#64748b; font-size:0.875rem; padding:2rem; text-align:center;">Nenhuma novidade cadastrada. Clique em "+ Nova Novidade" para começar.</td></tr>'
              : _updates.map((u, i) => `
                <tr style="border-bottom:1px solid #334155; hover:background:#1e293b;">
                  <td style="padding:0.75rem 1rem; text-align:center; font-weight:600; color:#f1f5f9;">${u.order || 0}</td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    ${u.iconUrl 
                      ? `<div style="width:36px; height:36px; border-radius:6px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:inline-flex; align-items:center; justify-content:center; padding:0.25rem;">
                          <img src="${esc(u.iconUrl)}" style="width:100%; height:100%; object-fit:contain;">
                        </div>`
                      : '<em style="color:#475569; font-size:0.75rem;">Sem ícone</em>'
                    }
                  </td>
                  <td style="padding:0.75rem 1rem; font-weight:600; color:#f1f5f9;">${esc(u.title)}</td>
                  <td style="padding:0.75rem 1rem; color:#94a3b8; font-size:0.8125rem; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${esc(u.description)}
                  </td>
                  <td style="padding:0.75rem 1rem; color:#94a3b8; font-size:0.78rem;">
                    ${u.linkUrl ? `<a href="${esc(u.linkUrl)}" target="_blank" style="color:#93c5fd; text-decoration:none;">Ver Link</a>` : '<em style="color:#475569;">Sem link</em>'}
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; cursor:pointer; ${u.active ? 'background:#064e3b; color:#34d399;' : 'background:#1e293b; color:#64748b; border:1px solid #334155;'}"
                      onclick="window.toggleUpdateActive('${u._id}', ${u.active})">
                      ${u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <div style="display:flex; gap:0.375rem; justify-content:center;">
                      <button onclick="window.openUpEdit('${u._id}')" style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Editar</button>
                      <button onclick="window.deleteUpdate('${u._id}', '${esc(u.title)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Excluir</button>
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

window.toggleUpdateActive = async (id, current) => {
  try {
    await apiRequest('PUT', `/api/admin/platform-updates/${id}`, { active: !current });
    saasToast(!current ? 'Novidade ativada!' : 'Novidade desativada.', 'success');
    await loadPlatformUpdates();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Excluir Novidade ─────────────────────────────────────────────────────────

window.deleteUpdate = async (id, title) => {
  if (!await saasConfirm(`Excluir definitivamente a novidade "${title}"?`, { title: 'Excluir Novidade', confirmText: 'Excluir', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/platform-updates/${id}`);
    saasToast(`Novidade "${title}" excluída.`, 'success');
    await loadPlatformUpdates();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Tela 2: Editor de Novidade ────────────────────────────────────────────────

window.openUpNew = () => {
  _upEditMode = 'new';
  _upEditData = { title: '', description: '', iconUrl: '', linkUrl: '', order: _updates.length, active: true };
  renderUpdateEditor();
};

window.openUpEdit = (id) => {
  const u = _updates.find(item => item._id === id);
  if (!u) return;
  _upEditMode = id;
  _upEditData = JSON.parse(JSON.stringify(u)); // clone
  renderUpdateEditor();
};

function renderUpdateEditor() {
  const el = document.getElementById('tabNovidades');
  const d = _upEditData;
  const isNew = _upEditMode === 'new';

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:640px;">
      <!-- header -->
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button onclick="window.backToUpdatesList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer;">← Voltar</button>
        <h2 style="font-size:1.1rem; font-weight:700; color:#f1f5f9; margin:0;">${isNew ? 'Nova Novidade da Plataforma' : `Editar: ${esc(d.title)}`}</h2>
      </div>

      <!-- formulário -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Título da Novidade *
          <input id="upTitle" type="text" value="${esc(d.title)}" placeholder="Ex: Planilha de estoque com mais flexibilidade" style="${_inp('width:100%;')}">
        </label>

        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Descrição Curta (Mensagem principal) *
          <textarea id="upDescription" rows="3" placeholder="Escreva um resumo rápido sobre a novidade..." style="${_inp('width:100%; resize:vertical;')}">${esc(d.description)}</textarea>
        </label>

        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Link Externo / Saiba mais (Opcional - se vazio, a novidade não será clicável)
          <input id="upLinkUrl" type="url" value="${esc(d.linkUrl || '')}" placeholder="Ex: https://help.cliquezoom.com.br" style="${_inp('width:100%;')}">
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
            <input id="upOrder" type="number" min="0" value="${d.order || 0}" style="${_inp('width:100%;')}">
          </label>

          <div style="display:flex; align-items:center; gap:0.5rem; padding-top:1.25rem;">
            <input id="upActive" type="checkbox" ${d.active ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
            <label for="upActive" style="font-size:0.8125rem; color:#94a3b8; cursor:pointer;">Novidade Ativa (Visível)</label>
          </div>
        </div>

        <!-- Área de Upload do Ícone -->
        <div style="border-top:1px solid #334155; padding-top:1rem; margin-top:0.5rem;">
          <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.5rem;">Ícone Ilustrativo (Opcional)</span>
          
          <div style="display:flex; gap:1rem; align-items:center;">
            <div id="upPreviewContainer" style="width:64px; height:64px; border-radius:8px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:${d.iconUrl ? 'flex' : 'none'}; align-items:center; justify-content:center; padding:0.25rem;">
              ${d.iconUrl ? `<img id="upPreviewImg" src="${esc(d.iconUrl)}" style="width:100%; height:100%; object-fit:contain;">` : ''}
            </div>
            
            <div style="display:flex; flex-direction:column; gap:0.35rem;">
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.45rem 1rem; font-size:0.8rem; cursor:pointer; font-weight:600;">
                  ${d.iconUrl ? 'Trocar Ícone' : 'Upload Ícone'}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadUpdateIcon(this)">
                </label>
                <span id="upUploadStatus" style="font-size:0.75rem; color:#64748b;"></span>
              </div>
              <p style="font-size:0.7rem; color:#64748b; margin:0;">Tamanho recomendado: 64x64px (quadrado). Imagem transparente PNG ou SVG/WEBP.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- footer botoes -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #334155; padding-top:1rem;">
        <button onclick="window.backToUpdatesList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.875rem; cursor:pointer;">Cancelar</button>
        <button onclick="window.savePlatformUpdate()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.5rem; font-size:0.875rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
    </div>
  `;
}

// ── Upload do ícone ───────────────────────────────────────────────────────────

window.uploadUpdateIcon = async (input) => {
  const file = input.files && input.files[0];
  if (!file) return;

  const status = document.getElementById('upUploadStatus');
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
    
    _upEditData.iconUrl = json.url;
    
    // Atualizar preview visual imediato
    const previewContainer = document.getElementById('upPreviewContainer');
    previewContainer.innerHTML = `<img id="upPreviewImg" src="${esc(json.url)}" style="width:100%; height:100%; object-fit:contain;">`;
    previewContainer.style.display = 'flex';
    
    if (status) status.textContent = '✓ Enviado!';
    saasToast('Ícone de novidade carregado!', 'success');
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

// ── Salvar Novidade no Banco ─────────────────────────────────────────────────

window.savePlatformUpdate = async () => {
  const title = document.getElementById('upTitle')?.value.trim();
  const description = document.getElementById('upDescription')?.value.trim();
  const linkUrl = document.getElementById('upLinkUrl')?.value.trim();
  const order = parseInt(document.getElementById('upOrder')?.value) || 0;
  const active = document.getElementById('upActive')?.checked || false;
  
  if (!title) { saasToast('Título é obrigatório.', 'error'); return; }
  if (!description) { saasToast('Descrição é obrigatória.', 'error'); return; }

  const payload = {
    title,
    description,
    linkUrl,
    order,
    active,
    iconUrl: _upEditData.iconUrl || ''
  };

  const btn = document.querySelector('button[onclick*="savePlatformUpdate"]');
  const originalText = btn ? btn.textContent : 'Salvar';
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

  try {
    if (_upEditMode === 'new') {
      await apiRequest('POST', '/api/admin/platform-updates', payload);
      saasToast('Novidade de plataforma criada!', 'success');
    } else {
      await apiRequest('PUT', `/api/admin/platform-updates/${_upEditMode}`, payload);
      saasToast('Novidade de plataforma atualizada!', 'success');
    }
    await loadPlatformUpdates();
    _upEditMode = null;
    _upEditData = null;
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
};

window.backToUpdatesList = () => {
  _upEditMode = null;
  _upEditData = null;
  loadPlatformUpdates();
};

export { loadPlatformUpdates };
