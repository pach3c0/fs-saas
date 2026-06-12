// Organizações — tabela, ações, modal de detalhes e painel lateral
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';
import { loadDashboard } from './dashboard.js';

// Cache das orgs para filtro client-side
let allOrgs = [];

function renderOrgsTable(orgs) {
  const tbody = document.getElementById('orgsTable');
  if (!orgs.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">Nenhuma organizacao encontrada</td></tr>';
    return;
  }
  tbody.innerHTML = orgs.map(org => {
    const owner = org.ownerId;
    const statusClass = org.isActive ? 'badge-active' : (org.plan === 'free' ? 'badge-pending' : 'badge-inactive');
    const statusText = org.isActive ? 'Ativa' : 'Inativa';
    const date = new Date(org.createdAt).toLocaleDateString('pt-BR');
    return `
      <tr>
        <td style="font-weight:600;">${esc(org.name)}</td>
        <td style="color:#94a3b8;">${esc(org.slug)}</td>
        <td>${owner ? esc(owner.name || owner.email) : '-'}</td>
        <td><span style="text-transform:uppercase; font-size:0.6875rem; color:#94a3b8;">${org.plan}</span></td>
        <td>${org.stats?.sessions || 0}</td>
        <td>${org.stats?.photos || 0}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td style="color:#94a3b8; font-size:0.75rem;">${date}</td>
        <td>
          <div class="btn-actions">
            <button class="btn btn-panel" onclick="openOrgPanel('${org._id}', '${esc(org.name)}', '${esc(org.slug)}')">Painel</button>
            ${org.isActive
              ? `<button class="btn btn-deactivate" onclick="deactivateOrg('${org._id}', '${esc(org.name)}')">Desativar</button>`
              : `<button class="btn btn-approve" onclick="approveOrg('${org._id}', '${esc(org.name)}')">Aprovar</button>
                 <button class="btn btn-trash" onclick="trashOrg('${org._id}', '${esc(org.name)}')">Excluir</button>`
            }
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadOrganizations() {
  try {
    const data = await apiRequest('GET', '/api/admin/organizations');
    allOrgs = data.organizations;

    // Adicionar barra de busca acima da tabela (se ainda não existe)
    let searchBar = document.getElementById('orgsSearchBar');
    if (!searchBar) {
      const tabOrgs = document.getElementById('tabOrgs');
      searchBar = document.createElement('div');
      searchBar.id = 'orgsSearchBar';
      searchBar.style.cssText = 'margin-bottom:1rem; display:flex; gap:0.75rem; align-items:center;';
      searchBar.innerHTML = `
        <input type="text" id="orgsSearchInput" placeholder="Buscar por nome, slug ou e-mail do owner..."
          style="flex:1; padding:0.5rem 0.875rem; border:1px solid #334155; border-radius:0.375rem; background:#0f172a; color:#e2e8f0; font-size:0.8125rem; outline:none;">
        <span id="orgsCount" style="color:#64748b; font-size:0.75rem; white-space:nowrap;"></span>
      `;
      tabOrgs.insertBefore(searchBar, tabOrgs.firstChild);

      document.getElementById('orgsSearchInput').oninput = (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = q
          ? allOrgs.filter(org => {
              const owner = org.ownerId;
              return org.name.toLowerCase().includes(q)
                || org.slug.toLowerCase().includes(q)
                || (owner?.email || '').toLowerCase().includes(q)
                || (owner?.name || '').toLowerCase().includes(q);
            })
          : allOrgs;
        document.getElementById('orgsCount').textContent = `${filtered.length} de ${allOrgs.length}`;
        renderOrgsTable(filtered);
      };
    }

    document.getElementById('orgsCount').textContent = `${allOrgs.length} organizacoes`;
    renderOrgsTable(allOrgs);
  } catch (err) {
    document.getElementById('orgsTable').innerHTML = `<tr><td colspan="9" class="loading" style="color:#f87171;">Erro: ${err.message}</td></tr>`;
  }
}

// ============================================================================
// AÇÕES
// ============================================================================

window.approveOrg = async (id, name) => {
  if (!await saasConfirm(`Aprovar a organização "${name}"?`, { title: 'Aprovar', confirmText: 'Aprovar' })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/approve`);
    saasToast('Organização aprovada!', 'success');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.deactivateOrg = async (id, name) => {
  if (!await saasConfirm(`Desativar a organização "${name}"? O site dela ficará offline.`, { title: 'Desativar', confirmText: 'Desativar', danger: true })) return;
  try {
    await apiRequest('PUT', `/api/admin/organizations/${id}/deactivate`);
    saasToast('Organização desativada.', 'warning');
    await loadDashboard();
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

window.showDetails = async (id) => {
  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');
  modal.classList.add('active');
  content.innerHTML = '<div class="loading">Carregando detalhes...</div>';

  try {
    const data = await apiRequest('GET', `/api/admin/organizations/${id}/details`);
    const org = data.organization;
    const stats = data.stats;

    document.getElementById('modalTitle').textContent = org.name;

    let usersHtml = data.users.map(u => `
      <li>
        <span>${esc(u.name)} (${esc(u.email)})</span>
        <span style="color:#94a3b8;">${u.role} - ${u.approved ? 'Aprovado' : 'Pendente'}</span>
      </li>
    `).join('');

    let sessionsHtml = data.recentSessions.map(s => {
      const statusColors = { pending: '#fbbf24', in_progress: '#60a5fa', submitted: '#34d399', delivered: '#a78bfa' };
      return `
        <li>
          <span>${esc(s.name)} <span style="color:#64748b;">(${s.type || '-'})</span></span>
          <span>
            ${s.photosCount} fotos
            <span style="color:${statusColors[s.status] || '#94a3b8'}; margin-left:0.5rem;">${s.status}</span>
          </span>
        </li>
      `;
    }).join('') || '<li style="color:#64748b;">Nenhuma sessao</li>';

    const planOptions = ['free', 'basic', 'pro'].map(p =>
      `<option value="${p}" ${org.plan === p ? 'selected' : ''}>${p.toUpperCase()}</option>`
    ).join('');

    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-card">
          <h4>Slug / URL</h4>
          <div class="val" style="font-size:1rem;">${esc(org.slug)}.cliquezoom.com.br</div>
        </div>
        <div class="detail-card">
          <h4>Plano</h4>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
            <select id="planSelect" style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.875rem; font-weight:700; text-transform:uppercase; cursor:pointer;">
              ${planOptions}
            </select>
            <button id="savePlanBtn" style="background:#6366f1; color:white; border:none; border-radius:0.25rem; padding:0.25rem 0.75rem; font-size:0.75rem; font-weight:600; cursor:pointer;">Salvar</button>
          </div>
        </div>
        <div class="detail-card">
          <h4>Sessoes</h4>
          <div class="val">${stats.sessions}</div>
        </div>
        <div class="detail-card">
          <h4>Fotos</h4>
          <div class="val">${stats.photos}</div>
        </div>
        <div class="detail-card">
          <h4>Storage</h4>
          <div class="val">${stats.storageMB} MB</div>
          <div style="margin-top:0.4rem; background:#334155; height:4px; border-radius:2px; overflow:hidden;">
            <div style="background:#60a5fa; width:${Math.min(100, (stats.storageMB / stats.maxStorageMB) * 100)}%; height:100%;"></div>
          </div>
          <div style="font-size:0.625rem; color:#64748b; margin-top:0.25rem;">Limite: ${stats.maxStorageMB} MB</div>
          ${stats.breakdown ? `
          <div style="margin-top:0.5rem; display:flex; flex-wrap:wrap; gap:0.5rem; font-size:0.625rem; color:#94a3b8;">
            <span>📁 Sessões: ${stats.breakdown.sessionsMB} MB</span>
            <span>🌐 Site: ${stats.breakdown.siteMB} MB</span>
            <span>🎬 Vídeos: ${stats.breakdown.videosMB} MB</span>
          </div>` : ''}
        </div>
        <div class="detail-card">
          <h4>Newsletter</h4>
          <div class="val">${stats.newsletterSubs}</div>
        </div>
      </div>

      <div class="detail-section">
        <h3>Limites Customizados</h3>
        <div id="customLimitsForm" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:0.75rem; margin-top:0.75rem;">
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Storage (MB)
            <input id="lim_storage" type="number" value="${stats.maxStorageMB}" min="0"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Sessões (-1 = ∞)
            <input id="lim_sessions" type="number" value="${stats.maxSessions ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Fotos (-1 = ∞)
            <input id="lim_photos" type="number" value="${stats.maxPhotos ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.75rem; color:#94a3b8;">
            Álbuns (-1 = ∞)
            <input id="lim_albums" type="number" value="${stats.maxAlbums ?? -1}" min="-1"
              style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.375rem 0.5rem; font-size:0.875rem;">
          </label>
        </div>
        <button id="saveLimitsBtn" style="margin-top:0.75rem; background:#0369a1; color:white; border:none; border-radius:0.25rem; padding:0.375rem 1rem; font-size:0.8rem; font-weight:600; cursor:pointer;">
          Salvar limites desta org
        </button>
      </div>

      <div class="detail-section">
        <h3>Usuarios</h3>
        <ul class="detail-list">${usersHtml}</ul>
      </div>

      <div class="detail-section">
        <h3>Sessoes recentes</h3>
        <ul class="detail-list">${sessionsHtml}</ul>
      </div>
    `;

    content.querySelector('#savePlanBtn').onclick = async () => {
      const newPlan = content.querySelector('#planSelect').value;
      const btn = content.querySelector('#savePlanBtn');
      btn.textContent = 'Salvando...';
      btn.disabled = true;
      try {
        await apiRequest('PUT', `/api/admin/organizations/${id}/plan`, { plan: newPlan });
        btn.textContent = 'Salvo!';
        btn.style.background = '#065f46';
        // Atualizar cache local
        const orgIdx = allOrgs.findIndex(o => o._id === id);
        if (orgIdx !== -1) allOrgs[orgIdx].plan = newPlan;
        setTimeout(() => {
          btn.textContent = 'Salvar';
          btn.style.background = '#6366f1';
          btn.disabled = false;
        }, 2000);
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        btn.textContent = 'Salvar';
        btn.disabled = false;
      }
    };
    content.querySelector('#saveLimitsBtn').onclick = async () => {
      const btn = content.querySelector('#saveLimitsBtn');
      btn.textContent = 'Salvando...';
      btn.disabled = true;
      try {
        await apiRequest('PUT', `/api/admin/organizations/${id}/limits`, {
          maxStorage:  parseInt(content.querySelector('#lim_storage').value),
          maxSessions: parseInt(content.querySelector('#lim_sessions').value),
          maxPhotos:   parseInt(content.querySelector('#lim_photos').value),
          maxAlbums:   parseInt(content.querySelector('#lim_albums').value),
          customDomain: false
        });
        btn.textContent = 'Salvo!';
        btn.style.background = '#065f46';
        setTimeout(() => { btn.textContent = 'Salvar limites desta org'; btn.style.background = '#0369a1'; btn.disabled = false; }, 2000);
      } catch (err) {
        saasToast('Erro: ' + err.message, 'error');
        btn.textContent = 'Salvar limites desta org';
        btn.disabled = false;
      }
    };
  } catch (err) {
    content.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
};

window.closeModal = () => {
  document.getElementById('detailModal').classList.remove('active');
};

// ============================================================================
// PAINEL LATERAL DO USUÁRIO
// ============================================================================

let currentPanelOrgId = null;
let currentPanelTab = 'overview';

window.openOrgPanel = async (id, name, slug) => {
  currentPanelOrgId = id;
  currentPanelTab = 'overview';
  document.getElementById('panelOrgName').textContent = name;
  document.getElementById('panelOrgSlug').textContent = slug + '.cliquezoom.com.br';
  document.getElementById('orgPanel').classList.add('open');
  document.getElementById('orgPanelOverlay').classList.add('open');

  // Resetar nav
  document.querySelectorAll('.panel-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector('.panel-nav-item[data-panel="overview"]').classList.add('active');

  await loadPanelTab('overview');
};

window.closeOrgPanel = () => {
  document.getElementById('orgPanel').classList.remove('open');
  document.getElementById('orgPanelOverlay').classList.remove('open');
  currentPanelOrgId = null;
};

window.switchPanelTab = async (el) => {
  const tab = el.dataset.panel;
  document.querySelectorAll('.panel-nav-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentPanelTab = tab;
  await loadPanelTab(tab);
};

async function loadPanelTab(tab) {
  const content = document.getElementById('panelContent');
  content.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    if (tab === 'overview') await renderPanelOverview(content);
    else if (tab === 'jornada') await renderPanelJornada(content);
    else if (tab === 'meusite') await renderPanelMeuSite(content);
    else {
      content.innerHTML = `<div class="coming-soon"><span class="cs-icon">🚧</span><p>Em breve</p></div>`;
    }
  } catch (err) {
    content.innerHTML = `<div class="loading" style="color:#f87171;">Erro: ${err.message}</div>`;
  }
}

// ── Impersonação: "entrar como" a org em nova aba (modo suporte) ────────────

async function impersonateOrg(orgId) {
  const ok = await saasConfirm(
    'Isto abrirá o painel da org em nova aba, logado como o fotógrafo. ' +
    'Se houver uma sessão de fotógrafo neste navegador, ela será substituída. Continuar?',
    { title: 'Modo suporte', confirmText: 'Entrar como' }
  );
  if (!ok) return;

  try {
    const data = await apiRequest('POST', `/api/admin/organizations/${orgId}/impersonate`);
    saasToast(`Modo suporte: ${data.orgName} (30 min)`, 'success');
    window.open('/admin/?impersonate=' + encodeURIComponent(data.token), '_blank');
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
}

window.impersonateOrg = impersonateOrg;

// ── Jornada do cliente: timeline de eventos do ActivityEvent ────────────────

const EVENT_META = {
  login:                   { icon: '🔑', label: 'Fez login' },
  session_created:         { icon: '📸', label: 'Criou sessão' },
  photos_uploaded:         { icon: '🖼️', label: 'Subiu fotos' },
  code_sent:               { icon: '📤', label: 'Compartilhou galeria' },
  code_viewed_by_client:   { icon: '👀', label: 'Cliente acessou a galeria' },
  selection_submitted:     { icon: '✅', label: 'Cliente enviou a seleção' },
  session_delivered:       { icon: '🎉', label: 'Entregou a sessão' },
  feature_configured:      { icon: '⚙️', label: 'Configurou recurso' },
  plan_upgraded:           { icon: '⭐', label: 'Mudou de plano' },
  domain_verified:         { icon: '🌐', label: 'Verificou domínio' },
  support_ticket_created:  { icon: '💬', label: 'Abriu chamado de suporte' },
  support_ticket_resolved: { icon: '✔️', label: 'Chamado resolvido' }
};

function _eventDetail(ev) {
  const m = ev.meta || {};
  const parts = [];
  if (m.mode) parts.push(m.mode);
  if (m.eventType) parts.push(m.eventType);
  if (m.photoCount) parts.push(`${m.photoCount} fotos`);
  if (m.channel && m.channel !== 'unknown') parts.push(`via ${m.channel}`);
  if (m.feature) parts.push(m.feature);
  if (m.category) parts.push(m.category);
  if (m.selectedPhotos) parts.push(`${m.selectedPhotos} selecionadas`);
  return parts.length ? ` <span style="color:#64748b;">(${esc(parts.join(', '))})</span>` : '';
}

async function renderPanelJornada(content) {
  const data = await apiRequest('GET', `/api/admin/organizations/${currentPanelOrgId}/activity`);
  const events = data.events || [];

  if (!events.length) {
    content.innerHTML = `
      <div class="coming-soon"><span class="cs-icon">👣</span>
        <p>Nenhuma atividade registrada ainda.<br>
        <span style="font-size:0.75rem; color:#64748b;">Os eventos começaram a ser coletados em 12/06/2026 — ações anteriores não aparecem aqui.</span></p>
      </div>`;
    return;
  }

  // Agrupar por dia
  const byDay = {};
  events.forEach(ev => {
    const day = new Date(ev.at).toLocaleDateString('pt-BR');
    (byDay[day] = byDay[day] || []).push(ev);
  });

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      ${Object.entries(byDay).map(([day, evs]) => `
        <div>
          <div style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:0.4rem;">${day}</div>
          <ul style="list-style:none; margin:0; padding:0; border-left:2px solid #334155;">
            ${evs.map(ev => {
              const meta = EVENT_META[ev.type] || { icon: '·', label: ev.type };
              const time = new Date(ev.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              return `
                <li style="padding:0.3rem 0 0.3rem 0.85rem; font-size:0.85rem; display:flex; gap:0.5rem; align-items:baseline;">
                  <span style="color:#64748b; font-size:0.7rem; flex-shrink:0; width:2.6rem;">${time}</span>
                  <span>${meta.icon} ${meta.label}${_eventDetail(ev)}</span>
                </li>`;
            }).join('')}
          </ul>
        </div>
      `).join('')}
    </div>`;
}

async function renderPanelOverview(content) {
  const data = await apiRequest('GET', `/api/admin/organizations/${currentPanelOrgId}/details`);
  const org = data.organization;
  const stats = data.stats;

  const planOptions = ['free', 'basic', 'pro'].map(p =>
    `<option value="${p}" ${org.plan === p ? 'selected' : ''}>${p.toUpperCase()}</option>`
  ).join('');

  const usersHtml = data.users.map(u => `
    <li><span>${esc(u.name)} <span style="color:#64748b;">(${esc(u.email)})</span></span>
    <span style="color:${u.approved ? '#34d399' : '#fbbf24'};">${u.approved ? 'Aprovado' : 'Pendente'}</span></li>
  `).join('') || '<li style="color:#64748b;">Nenhum usuário</li>';

  const sessionsHtml = data.recentSessions.slice(0, 5).map(s => `
    <li><span>${esc(s.name)}</span><span style="color:#64748b;">${s.photosCount} fotos</span></li>
  `).join('') || '<li style="color:#64748b;">Nenhuma sessão</li>';

  content.innerHTML = `
    <h3 style="font-size:0.875rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:1rem;">Visão Geral</h3>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1.25rem;">
      <div class="detail-card"><h4>Sessões</h4><div class="val">${stats.sessions}</div></div>
      <div class="detail-card"><h4>Fotos</h4><div class="val">${stats.photos}</div></div>
      <div class="detail-card"><h4>Storage</h4><div class="val">${stats.storageMB} MB</div></div>
      <div class="detail-card">
        <h4>Plano</h4>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.25rem;">
          <select id="panelPlanSelect" style="background:#0f172a; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8125rem; cursor:pointer;">${planOptions}</select>
          <button id="panelSavePlan" style="background:#6366f1; color:white; border:none; border-radius:0.25rem; padding:0.25rem 0.625rem; font-size:0.75rem; font-weight:600; cursor:pointer;">Salvar</button>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Usuários</h3>
      <ul class="detail-list">${usersHtml}</ul>
    </div>
    <div class="detail-section">
      <h3>Sessões recentes</h3>
      <ul class="detail-list">${sessionsHtml}</ul>
    </div>

    <div style="margin-top:1.25rem; padding-top:1rem; border-top:1px solid #334155;">
      <button id="panelImpersonate" style="background:#b45309; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1rem; font-size:0.8125rem; font-weight:600; cursor:pointer;">
        🛠️ Entrar como este fotógrafo
      </button>
      <p style="font-size:0.7rem; color:#64748b; margin:0.4rem 0 0;">Abre o painel da org em nova aba (modo suporte, expira em 30 min). Ação registrada em auditoria.</p>
    </div>
  `;

  content.querySelector('#panelImpersonate').onclick = () => impersonateOrg(currentPanelOrgId);

  content.querySelector('#panelSavePlan').onclick = async () => {
    const plan = content.querySelector('#panelPlanSelect').value;
    const btn = content.querySelector('#panelSavePlan');
    btn.textContent = '...';
    btn.disabled = true;
    try {
      await apiRequest('PUT', `/api/admin/organizations/${currentPanelOrgId}/plan`, { plan });
      saasToast('Plano atualizado!', 'success');
    } catch (err) {
      saasToast('Erro: ' + err.message, 'error');
    } finally {
      btn.textContent = 'Salvar';
      btn.disabled = false;
    }
  };
}

async function renderPanelMeuSite(content) {
  const sections = [
    { id: 'hero',        icon: '🖼️', label: 'Hero / Capa',   desc: 'Imagem, título e subtítulo do hero' },
    { id: 'portfolio',   icon: '📷', label: 'Portfólio',      desc: 'Fotos do portfólio' },
    { id: 'albuns',      icon: '📁', label: 'Álbuns',         desc: 'Álbuns de fotos' },
    { id: 'servicos',    icon: '💼', label: 'Serviços',       desc: 'Lista de serviços' },
    { id: 'estudio',     icon: '🏠', label: 'Estúdio',        desc: 'Info do estúdio e vídeo' },
    { id: 'depoimentos', icon: '⭐', label: 'Depoimentos',    desc: 'Depoimentos de clientes' },
    { id: 'contato',     icon: '📞', label: 'Contato',        desc: 'Título, texto e endereço' },
    { id: 'sobre',       icon: '👤', label: 'Sobre Mim',      desc: 'Texto e foto de perfil' },
    { id: 'faq',         icon: '❓', label: 'FAQ',            desc: 'Perguntas frequentes' },
    { id: 'secoes',      icon: '📋', label: 'Ordem das Seções', desc: 'Ordem e visibilidade' },
    { id: 'personalizar',icon: '🎨', label: 'Personalizar',   desc: 'Cores e fontes' },
  ];

  content.innerHTML = `
    <h3 style="font-size:0.875rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Meu Site — Resets</h3>
    <p style="font-size:0.75rem; color:#475569; margin-bottom:1rem;">Restaura os valores padrão de cada seção. <strong style="color:#fbbf24;">Ação irreversível.</strong></p>

    <div class="reset-grid">
      ${sections.map(s => `
        <div class="reset-item">
          <div class="reset-item-info">
            <span class="reset-item-icon">${s.icon}</span>
            <div>
              <div class="reset-item-label">${s.label}</div>
              <div class="reset-item-desc">${s.desc}</div>
            </div>
          </div>
          <button class="btn-reset" onclick="resetSiteSection('${currentPanelOrgId}', '${s.id}', '${s.label}')">Reset</button>
        </div>
      `).join('')}
    </div>

    <button class="btn-reset-all" onclick="resetSiteSection('${currentPanelOrgId}', 'all', 'Meu Site completo')">
      ⚠️ Reset Completo — Meu Site
    </button>
  `;
}

window.resetSiteSection = async (orgId, section, label) => {
  if (!orgId || orgId === 'null') { saasToast('Erro: organização não identificada', 'error'); return; }
  const ok = await saasConfirm(
    `Resetar "${label}"? Todos os dados desta seção serão apagados e voltarão ao padrão.`,
    { title: 'Confirmar Reset', confirmText: 'Resetar', danger: true }
  );
  if (!ok) return;

  try {
    await apiRequest('POST', `/api/admin/organizations/${orgId}/reset/site`, { section });
    saasToast(`"${label}" resetado com sucesso!`, 'success');
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};


export { loadOrganizations };
