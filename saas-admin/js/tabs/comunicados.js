// Comunicados da Plataforma (Dashboard Eventos) — gerenciador de avisos (Superadmin)
import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

let _announcements = [];
let _annEditMode = null; // null | 'new' | id
let _annEditData = null; // dados locais do comunicado sendo editado

function _inp(style = '') {
  return `background:#0f172a; color:#f1f5f9; border:1px solid #334155; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.8125rem; font-family:inherit; outline:none; ${style}`;
}

// ── Tela 1: Lista de Comunicados ──────────────────────────────────────────────

async function loadAnnouncements() {
  const el = document.getElementById('tabComunicados');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando comunicados...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/announcements');
    _announcements = data.announcements || [];
    renderAnnouncementsList(el);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro: ${err.message}</div>`;
  }
}

function renderAnnouncementsList(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <!-- header -->
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem;">
        <div>
          <h2 style="font-size:1.2rem; font-weight:700; color:#f1f5f9; margin:0;">Comunicados da Plataforma</h2>
          <p style="font-size:0.78rem; color:#64748b; margin:0.25rem 0 0;">Avisos e comunicados importantes exibidos na aba "Eventos" do dashboard dos fotógrafos.</p>
        </div>
        <button onclick="window.openAnnNew()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.125rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">+ Novo Comunicado</button>
      </div>

      <!-- lista -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:#0f172a; border-bottom:1px solid #334155;">
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:120px;">Preview Img</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Título</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600;">Link</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:150px;">Criado em</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:100px; text-align:center;">Status</th>
              <th style="padding:0.75rem 1rem; font-size:0.75rem; color:#94a3b8; font-weight:600; width:180px; text-align:center;">Ações</th>
            </tr>
          </thead>
          <tbody id="annTableBody">
            ${_announcements.length === 0
              ? '<tr><td colspan="6" style="color:#64748b; font-size:0.875rem; padding:2rem; text-align:center;">Nenhum comunicado cadastrado. Clique em "+ Novo Comunicado" para começar.</td></tr>'
              : _announcements.map((a, i) => `
                <tr style="border-bottom:1px solid #334155; hover:background:#1e293b;">
                  <td style="padding:0.75rem 1rem;">
                    ${a.imageUrl 
                      ? `<div style="width:90px; height:50px; border-radius:4px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:flex; align-items:center; justify-content:center;">
                          <img src="${esc(a.imageUrl)}" style="width:100%; height:100%; object-fit:cover;">
                        </div>`
                      : '<em style="color:#475569; font-size:0.75rem;">Sem imagem</em>'
                    }
                  </td>
                  <td style="padding:0.75rem 1rem; font-weight:600; color:#f1f5f9;">
                    <div style="font-size:0.875rem;">${esc(a.title)}</div>
                    <div style="font-size:0.7rem; color:#64748b; margin-top:0.2rem; max-width:300px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical;">
                      ${esc(a.content.replace(/<[^>]*>/g, ''))}
                    </div>
                  </td>
                  <td style="padding:0.75rem 1rem; color:#94a3b8; font-size:0.78rem;">
                    ${a.linkUrl ? `<a href="${esc(a.linkUrl)}" target="_blank" style="color:#93c5fd; text-decoration:none;">${esc(a.linkText || 'Link')}</a>` : '<em style="color:#475569;">Sem link</em>'}
                  </td>
                  <td style="padding:0.75rem 1rem; color:#94a3b8; font-size:0.78rem;">
                    ${new Date(a.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <span style="font-size:0.6875rem; font-weight:700; padding:0.2rem 0.55rem; border-radius:9999px; cursor:pointer; ${a.active ? 'background:#064e3b; color:#34d399;' : 'background:#1e293b; color:#64748b; border:1px solid #334155;'}"
                      onclick="window.toggleAnnActive('${a._id}', ${a.active})">
                      ${a.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style="padding:0.75rem 1rem; text-align:center;">
                    <div style="display:flex; gap:0.375rem; justify-content:center;">
                      <button onclick="window.openAnnEdit('${a._id}')" style="background:#1e3a5f; color:#93c5fd; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Editar</button>
                      <button onclick="window.deleteAnn('${a._id}', '${esc(a.title)}')" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.25rem; padding:0.3rem 0.625rem; font-size:0.7rem; cursor:pointer;">Excluir</button>
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

window.toggleAnnActive = async (id, current) => {
  try {
    await apiRequest('PUT', `/api/admin/announcements/${id}`, { active: !current });
    saasToast(!current ? 'Comunicado ativado!' : 'Comunicado desativado.', 'success');
    await loadAnnouncements();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Excluir Comunicado ────────────────────────────────────────────────────────

window.deleteAnn = async (id, title) => {
  if (!await saasConfirm(`Excluir definitivamente o comunicado "${title}"?`, { title: 'Excluir Comunicado', confirmText: 'Excluir', danger: true })) return;
  try {
    await apiRequest('DELETE', `/api/admin/announcements/${id}`);
    saasToast(`Comunicado "${title}" excluído.`, 'success');
    await loadAnnouncements();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

// ── Tela 2: Editor de Comunicado ──────────────────────────────────────────────

window.openAnnNew = () => {
  _annEditMode = 'new';
  _annEditData = { title: '', content: '', imageUrl: '', linkUrl: '', linkText: 'Saiba mais', active: true };
  renderAnnEditor();
};

window.openAnnEdit = (id) => {
  const a = _announcements.find(item => item._id === id);
  if (!a) return;
  _annEditMode = id;
  _annEditData = JSON.parse(JSON.stringify(a)); // clone
  renderAnnEditor();
};

function renderAnnEditor() {
  const el = document.getElementById('tabComunicados');
  const d = _annEditData;
  const isNew = _annEditMode === 'new';

  // Toolbar B/I simples para formatar HTML básico no textarea
  const toolbarHtml = `
    <div style="display:flex; gap:0.3rem; margin-bottom:0.25rem;">
      <button type="button" onclick="window._annInsertTag('strong')" title="Negrito" style="background:#0f172a; border:1px solid #334155; color:#f1f5f9; border-radius:0.25rem; width:26px; height:24px; font-size:0.75rem; font-weight:700; cursor:pointer; font-family:serif;">B</button>
      <button type="button" onclick="window._annInsertTag('em')" title="Itálico" style="background:#0f172a; border:1px solid #334155; color:#f1f5f9; border-radius:0.25rem; width:26px; height:24px; font-size:0.75rem; cursor:pointer; font-style:italic; font-family:serif;">I</button>
      <button type="button" onclick="window._annInsertTag('p')" title="Parágrafo" style="background:#0f172a; border:1px solid #334155; color:#f1f5f9; border-radius:0.25rem; padding:0 0.25rem; height:24px; font-size:0.75rem; cursor:pointer; font-weight:500;">P</button>
    </div>
  `;

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:720px;">
      <!-- header -->
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <button onclick="window.backToAnnList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.375rem 0.75rem; font-size:0.8rem; cursor:pointer;">← Voltar</button>
        <h2 style="font-size:1.1rem; font-weight:700; color:#f1f5f9; margin:0;">${isNew ? 'Novo Comunicado de Plataforma' : `Editar: ${esc(d.title)}`}</h2>
      </div>

      <!-- formulário -->
      <div style="background:#1e293b; border:1px solid #334155; border-radius:0.5rem; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
          Título do Comunicado *
          <input id="annTitle" type="text" value="${esc(d.title)}" placeholder="Ex: Manutenção Programada dia 20/06" style="${_inp('width:100%;')}">
        </label>

        <div style="display:flex; flex-direction:column; gap:0.3rem;">
          <span style="font-size:0.75rem; color:#94a3b8;">Conteúdo / Mensagem (Suporta HTML simples) *</span>
          ${toolbarHtml}
          <textarea id="annContent" rows="6" placeholder="Escreva a mensagem do comunicado aqui..." style="${_inp('width:100%; resize:vertical;')}">${esc(d.content)}</textarea>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
            Link Externo (Opcional)
            <input id="annLinkUrl" type="url" value="${esc(d.linkUrl || '')}" placeholder="Ex: https://help.cliquezoom.com.br" style="${_inp('width:100%;')}">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:#94a3b8;">
            Texto do Botão de Link (Opcional)
            <input id="annLinkText" type="text" value="${esc(d.linkText || 'Saiba mais')}" placeholder="Ex: Saiba mais" style="${_inp('width:100%;')}">
          </label>
        </div>
        
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

        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
          <input id="annActive" type="checkbox" ${d.active ? 'checked' : ''} style="cursor:pointer; width:16px; height:16px;">
          <label for="annActive" style="font-size:0.8125rem; color:#94a3b8; cursor:pointer;">Comunicado Ativo (Visível no Dashboard)</label>
        </div>

        <!-- Área de Upload de Imagem -->
        <div style="border-top:1px solid #334155; padding-top:1rem; margin-top:0.5rem;">
          <span style="font-size:0.75rem; color:#94a3b8; display:block; margin-bottom:0.5rem;">Imagem do Comunicado (Opcional)</span>
          
          <div id="annPreviewContainer" style="margin-bottom:0.75rem; width:100%; border-radius:6px; overflow:hidden; background:#0f172a; border:1px solid #334155; display:${d.imageUrl ? 'flex' : 'none'}; align-items:center; justify-content:center; max-height:240px; aspect-ratio:16/9;">
            ${d.imageUrl ? `<img id="annPreviewImg" src="${esc(d.imageUrl)}" style="width:100%; height:100%; object-fit:contain;">` : ''}
          </div>
          
          <div style="display:flex; gap:0.75rem; align-items:center;">
            <label style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem; padding:0.45rem 1rem; font-size:0.8rem; cursor:pointer; font-weight:600;">
              ${d.imageUrl ? 'Trocar Imagem' : 'Upload Imagem'}
              <input type="file" accept=".jpg,.jpeg,.png,.webp" style="display:none;" onchange="window.uploadAnnImage(this)">
            </label>
            <span id="annUploadStatus" style="font-size:0.75rem; color:#64748b;"></span>
          </div>
          <p style="font-size:0.7rem; color:#64748b; margin-top:0.5rem;">Imagens horizontais em proporção aproximada de 16:9 ou 2:1 são recomendadas. JPG, PNG ou WEBP.</p>
        </div>
      </div>

      <!-- footer botoes -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem; border-top:1px solid #334155; padding-top:1rem;">
        <button onclick="window.backToAnnList()" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.875rem; cursor:pointer;">Cancelar</button>
        <button onclick="window.saveAnnouncement()" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.5rem; font-size:0.875rem; font-weight:600; cursor:pointer;">Salvar</button>
      </div>
    </div>
  `;
}

// ── Inserção de tags HTML simples (Negrito/Itálico/Parágrafo) ─────────────────

window._annInsertTag = (tag) => {
  const ta = document.getElementById('annContent');
  if (!ta) return;
  const [s, e] = [ta.selectionStart, ta.selectionEnd];
  const selected = ta.value.slice(s, e) || '';
  
  let insert = '';
  if (tag === 'p') {
    insert = `<p>${selected || 'Texto do parágrafo'}</p>`;
  } else {
    insert = `<${tag}>${selected || 'texto'}</${tag}>`;
  }
  
  ta.value = ta.value.slice(0, s) + insert + ta.value.slice(e);
  ta.focus();
};

// ── Upload da imagem ──────────────────────────────────────────────────────────

window.uploadAnnImage = async (input) => {
  const file = input.files && input.files[0];
  if (!file) return;

  const status = document.getElementById('annUploadStatus');
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
    
    _annEditData.imageUrl = json.url;
    
    // Atualizar preview visual imediato
    const previewContainer = document.getElementById('annPreviewContainer');
    previewContainer.innerHTML = `<img id="annPreviewImg" src="${esc(json.url)}" style="width:100%; height:100%; object-fit:contain;">`;
    previewContainer.style.display = 'flex';
    
    if (status) status.textContent = '✓ Enviado!';
    saasToast('Imagem do comunicado carregada!', 'success');
  } catch (err) {
    if (status) status.textContent = '';
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    input.value = '';
  }
};

// ── Salvar Comunicado no Banco ────────────────────────────────────────────────

window.saveAnnouncement = async () => {
  const title = document.getElementById('annTitle')?.value.trim();
  const content = document.getElementById('annContent')?.value.trim();
  const linkUrl = document.getElementById('annLinkUrl')?.value.trim();
  const linkText = document.getElementById('annLinkText')?.value.trim() || 'Saiba mais';
  const active = document.getElementById('annActive')?.checked || false;
  
  if (!title) { saasToast('Título é obrigatório.', 'error'); return; }
  if (!content) { saasToast('Conteúdo é obrigatório.', 'error'); return; }

  const payload = {
    title,
    content,
    linkUrl,
    linkText,
    active,
    imageUrl: _annEditData.imageUrl || ''
  };

  const btn = document.querySelector('button[onclick*="saveAnnouncement"]');
  const originalText = btn ? btn.textContent : 'Salvar';
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }

  try {
    if (_annEditMode === 'new') {
      await apiRequest('POST', '/api/admin/announcements', payload);
      saasToast('Comunicado criado com sucesso!', 'success');
    } else {
      await apiRequest('PUT', `/api/admin/announcements/${_annEditMode}`, payload);
      saasToast('Comunicado atualizado com sucesso!', 'success');
    }
    await loadAnnouncements();
    _annEditMode = null;
    _annEditData = null;
  } catch (err) {
    saasToast('Erro ao salvar: ' + err.message, 'error');
    if (btn) { btn.textContent = originalText; btn.disabled = false; }
  }
};

window.backToAnnList = () => {
  _annEditMode = null;
  _annEditData = null;
  loadAnnouncements();
};

export { loadAnnouncements };
