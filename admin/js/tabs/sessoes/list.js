import { formatDate, resolveImagePath } from '../../utils/helpers.js';
import { apiGet } from '../../utils/api.js';

const STATUS_LABELS = {
  pending: { text: 'Pendente', class: 'badge-neutral' },
  in_progress: { text: 'Em seleção', class: 'badge-warning' },
  submitted: { text: 'Seleção enviada', class: 'badge-success' },
  delivered: { text: 'Entregue', class: 'badge-blue' },
  redelivering: { text: 'Re-entregando', class: 'badge-warning' },
  expired: { text: 'Expirado', class: 'badge-danger' }
};

export async function loadSessions(container, state) {
  try {
    const result = await apiGet('/api/sessions');
    state.sessionsData = result.sessions || [];
    filterAndRender(container, state);
  } catch (error) {
    const list = container.querySelector('#sessionsList');
    if (list) list.innerHTML = `<p style="color:var(--red);">${error.message}</p>`;
  }
}

export function filterAndRender(container, state) {
  const searchTerm = container.querySelector('#filterSearch').value.toLowerCase();
  const sortValue = container.querySelector('#filterSort').value;
  const modeValue = container.querySelector('#filterMode').value;
  const checkedStatuses = Array.from(container.querySelectorAll('#statusFilters input:checked')).map(cb => cb.value);
  const dateFromVal = container.querySelector('#filterDateFrom').value;
  const dateToVal = container.querySelector('#filterDateTo').value;
  const dateFrom = dateFromVal ? new Date(dateFromVal + 'T00:00:00') : null;
  const dateTo = dateToVal ? new Date(dateToVal + 'T23:59:59') : null;

  let filtered = state.sessionsData.filter(session => {
    if (searchTerm && !session.name.toLowerCase().includes(searchTerm)) return false;
    if (modeValue !== 'all' && session.mode !== modeValue) return false;

    const now = new Date();
    const deadline = session.selectionDeadline ? new Date(session.selectionDeadline) : null;
    const isExpired = deadline && now > deadline && session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered';
    let effectiveStatus = session.selectionStatus;
    if (isExpired) effectiveStatus = 'expired';
    if (!checkedStatuses.includes(effectiveStatus)) return false;

    if (dateFrom || dateTo) {
      const dateField = container.querySelector('#filterDateField')?.value || 'createdAt';
      const rawValue = session[dateField];
      if (!rawValue) return (dateFrom || dateTo) ? false : true;
      const fieldDate = new Date(rawValue);
      if (dateFrom && fieldDate < dateFrom) return false;
      if (dateTo && fieldDate > dateTo) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortValue === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortValue === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortValue === 'az') return a.name.localeCompare(b.name);
    if (sortValue === 'za') return b.name.localeCompare(a.name);
    return 0;
  });

  renderList(container, filtered);
}

function renderList(container, items) {
  const list = container.querySelector('#sessionsList');
  if (items.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:2rem;">Nenhuma sessão encontrada com os filtros atuais.</p>';
    return;
  }

  list.innerHTML = items.map(session => {
    const now = new Date();
    const deadline = session.selectionDeadline ? new Date(session.selectionDeadline) : null;
    const isExpired = deadline && now > deadline && session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered';
    const isRedelivering = session.selectionStatus === 'delivered' && session.redeliveryMode === true;
    const statusKey = isExpired ? 'expired' : (isRedelivering ? 'redelivering' : session.selectionStatus);
    const status = STATUS_LABELS[statusKey] || STATUS_LABELS.pending;

    const mode = session.mode || 'gallery';
    const isMulti = mode === 'multi_selection';
    const selectedCount = (session.selectedPhotos || []).length;
    const limit = session.packageLimit || 30;
    const extras = Math.max(0, selectedCount - limit);
    const extraPrice = session.extraPhotoPrice || 25;
    const deliveredPhotosCount = (session.photos || []).filter(p => p.urlOriginal).length;
    const isSubmitted = session.selectionStatus === 'submitted';
    const isDelivered = session.selectionStatus === 'delivered';

    let cardBg = 'var(--bg-surface)';
    let cardBorder = 'var(--border)';
    if (mode === 'selection') {
      cardBg = 'rgba(63, 185, 80, 0.04)';
      cardBorder = 'rgba(63, 185, 80, 0.15)';
    } else if (mode === 'multi_selection') {
      cardBg = 'rgba(255, 166, 87, 0.04)';
      cardBorder = 'rgba(255, 166, 87, 0.15)';
    } else if (mode === 'gallery') {
      cardBg = 'rgba(188, 140, 255, 0.04)';
      cardBorder = 'rgba(188, 140, 255, 0.15)';
    }

    return `
      <div style="border:1px solid ${cardBorder}; border-radius:0.75rem; padding:1rem; background:${cardBg};">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="display:flex; gap:1rem; flex:1;">
            <div style="width:80px; height:80px; flex-shrink:0; border-radius:0.5rem; overflow:hidden; background:var(--bg-base); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
              ${session.coverPhoto
        ? `<img src="${resolveImagePath(session.coverPhoto)}" style="width:100%; height:100%; object-fit:cover;" alt="Capa">`
        : `<span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>`}
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <strong style="color:var(--text-primary); font-size:1.125rem;">${session.name}</strong>
              ${session.clientId ? `<span style="color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem;" title="Cliente vinculado"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${session.clientId.name}</span>` : ''}
              <span class="badge ${status.class}">
                ${status.text}
              </span>
              ${session.extraRequest?.status === 'pending' ? `<span class="badge badge-warning">📸 ${session.extraRequest.photos?.length || 0} extra(s)</span>` : ''}
            </div>
            <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:0.25rem;">
              ${formatDate(session.date)} • ${session.photos?.length || 0} fotos
              ${mode === 'selection' ? ` • ${selectedCount}/${limit} selecionadas` : (isMulti ? ` • ${(session.participants || []).length} participantes` : '')}
              ${deadline ? ` • Prazo: ${new Date(deadline).toLocaleDateString('pt-BR')}` : ''}
              ${!isMulti && extras > 0 ? ` • <span style="color:var(--yellow);">${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})</span>` : ''}
            </div>
            </div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center; flex-shrink:0; flex-wrap:wrap; justify-content:flex-end;">
            <button onclick="viewSessionPhotos('${session._id}')" class="btn btn-sm btn-primary">
              Fotos
            </button>
            ${isMulti ? `
            <button onclick="viewParticipants('${session._id}')" class="btn btn-sm" style="background:var(--purple); border-color:var(--purple); color:white;">
              Participantes
            </button>` : ''}
            <button onclick="editSession('${session._id}')" class="btn btn-sm" style="background:var(--orange); border-color:var(--orange); color:white;">
              Config
            </button>
            <button onclick="sendSessionCode('${session._id}', '${session.accessCode}')"
              style="background:${(session.photos?.length || 0) >= limit ? 'var(--bg-hover)' : 'rgba(255,255,255,0.05)'};
                     color:${(session.photos?.length || 0) >= limit ? 'var(--text-secondary)' : 'var(--text-muted)'};
                     padding:0.375rem 0.75rem; border-radius:0.375rem; border:1px solid var(--border);
                     cursor:${(session.photos?.length || 0) >= limit ? 'pointer' : 'not-allowed'}; font-size:0.75rem;"
              ${(session.photos?.length || 0) >= limit ? '' : 'disabled'}
              title="${(session.photos?.length || 0) >= limit ? 'Enviar código por e-mail ao cliente' : `Suba pelo menos ${limit} fotos para habilitar o envio`}">
              📧 Enviar
            </button>
            <button onclick="${!isMulti && isSubmitted ? `reopenSelection('${session._id}')` : ''}"
              class="btn btn-sm"
              style="background:${!isMulti && isSubmitted ? 'var(--yellow)' : 'rgba(255,255,255,0.05)'};
                     border-color:${!isMulti && isSubmitted ? 'var(--yellow)' : 'var(--border)'};
                     color:${!isMulti && isSubmitted ? 'white' : 'var(--text-muted)'};
                     cursor:${!isMulti && isSubmitted ? 'pointer' : 'not-allowed'};"
              ${!isMulti && isSubmitted ? '' : 'disabled'}
              title="${isMulti ? 'Não disponível em multi-seleção' : (!isSubmitted ? 'Aguardando cliente enviar seleção' : 'Reabrir seleção do cliente')}">
              Reabrir
            </button>
            ${!isMulti && isDelivered && !isRedelivering ? `
            <button onclick="reopenForRedelivery('${session._id}')"
              style="background:var(--orange); border:none; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; cursor:pointer; font-size:0.75rem; font-weight:500;"
              title="Reabrir sessão para subir fotos faltantes e re-entregar">
              Re-entregar
            </button>` : ''}
            <button onclick="deliverSession('${session._id}')"
              style="background:${(isSubmitted || isRedelivering) && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'var(--green)' : 'rgba(255,255,255,0.05)'};
                     color:${(isSubmitted || isRedelivering) && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'white' : 'var(--text-muted)'};
                     padding:0.375rem 0.75rem; border-radius:0.375rem;
                     border:${(isSubmitted || isRedelivering) && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'none' : '1px solid var(--border)'};
                     cursor:${(isSubmitted || isRedelivering) && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? 'pointer' : 'not-allowed'}; font-size:0.75rem; font-weight:500;"
              ${(isSubmitted || isRedelivering) && deliveredPhotosCount >= selectedCount && selectedCount > 0 ? '' : 'disabled'}
              title="${!(isSubmitted || isRedelivering) ? 'Aguardando cliente finalizar seleção' : (selectedCount === 0 ? 'Nenhuma foto selecionada' : (deliveredPhotosCount < selectedCount ? `Faltam fotos editadas (${deliveredPhotosCount}/${selectedCount})` : (isRedelivering ? 'Confirmar re-entrega' : 'Entregar sessão')))}">
              ${isRedelivering ? 'Confirmar entrega' : 'Entregar'}
            </button>
            <button onclick="viewSessionHistory('${session._id}')" class="btn btn-sm" style="background:var(--bg-elevated); border:1px solid var(--border); color:var(--text-secondary);" title="Ver linha do tempo e atividades da sessão">
              Historico
            </button>
            ${session.extraRequest?.status === 'pending' ? `
            <button onclick="acceptExtraRequest('${session._id}')" class="btn btn-sm btn-success" title="Aceitar fotos extras">
              ✅ Aceitar extras
            </button>
            <button onclick="rejectExtraRequest('${session._id}')" class="btn btn-sm btn-danger" title="Recusar fotos extras">
              ✗ Recusar
            </button>` : ''}
            <button onclick="deleteSession('${session._id}')" class="btn btn-sm btn-danger" title="Deletar">
              &times;
            </button>
          </div>
        </div>
        <div style="font-size:0.75rem; background:var(--bg-base); border-radius:0.25rem; padding:0.375rem 0.75rem; font-family:monospace; color:var(--accent); margin-top:0.5rem; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
          <span>Codigo: ${session.accessCode}</span>
          <button onclick="copySessionCode('${session.accessCode}', this)" style="background:var(--bg-hover); color:var(--text-secondary); padding:0.2rem 0.5rem; border-radius:0.25rem; border:1px solid var(--border); cursor:pointer; font-size:0.625rem; font-family:sans-serif; transition: all 0.2s;" title="Copiar codigo">
              Copiar
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function setupListFilters(container, state) {
  const refilter = () => filterAndRender(container, state);
  container.querySelector('#filterSearch').addEventListener('input', refilter);
  container.querySelector('#filterSort').addEventListener('change', refilter);
  container.querySelector('#filterMode').addEventListener('change', refilter);
  container.querySelectorAll('#statusFilters input').forEach(cb => cb.addEventListener('change', refilter));
  container.querySelector('#filterDateFrom').addEventListener('change', refilter);
  container.querySelector('#filterDateTo').addEventListener('change', refilter);
  container.querySelector('#filterDateField').addEventListener('change', refilter);
  container.querySelector('#clearDateFilter').addEventListener('click', () => {
    container.querySelector('#filterDateFrom').value = '';
    container.querySelector('#filterDateTo').value = '';
    refilter();
  });
}
