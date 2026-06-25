import { formatDate, resolveImagePath } from '../../utils/helpers.js';
import { apiGet } from '../../utils/api.js';
import { icon } from '../../utils/icons.js';

const EVENT_LABELS = {
  aniversario: 'Aniversário', casamento: 'Casamento', formatura: 'Formatura',
  corporativo: 'Corporativo', show: 'Show', ensaio: 'Ensaio',
  gestante: 'Gestante', newborn: 'Newborn', debutante: 'Debutante',
  batizado: 'Batizado'
};

const STATUS_LABELS = {
  pending: { text: 'Pendente', class: 'badge-neutral' },
  in_progress: { text: 'Em seleção', class: 'badge-warning' },
  submitted: { text: 'Seleção enviada', class: 'badge-success' },
  delivered: { text: 'Entregue', class: 'badge-blue' },
  redelivering: { text: 'Re-entregando', class: 'badge-warning' },
  expired: { text: 'Expirado', class: 'badge-danger' }
};

const GALLERY_STATUS_LABELS = {
  pending: { text: 'Aguardando upload', class: 'badge-neutral' },
  in_progress: { text: 'Em visualização', class: 'badge-warning' },
  submitted: { text: 'Em visualização', class: 'badge-warning' },
  delivered: { text: 'Entregue', class: 'badge-blue' },
  redelivering: { text: 'Re-entregando', class: 'badge-warning' },
  expired: { text: 'Expirado', class: 'badge-danger' }
};

// Fundos por modo de sessão configurados pelo Superadmin (SaaS Admin › Fundo das Sessões).
// { selection?: {imageUrl, opacity}, gallery?: {...}, multi_selection?: {...} }.
// Vazio => cada card cai no tint sólido padrão. Persistido em nível de módulo para não
// refazer o fetch a cada filtro (filterAndRender/renderList rodam várias vezes).
let sessionBackgrounds = {};

export async function loadSessions(container, state) {
  try {
    const [result, bgRes] = await Promise.all([
      apiGet('/api/sessions'),
      apiGet('/api/session-card-backgrounds').catch(() => ({ backgrounds: {} })),
    ]);
    state.sessionsData = result.sessions || [];
    sessionBackgrounds = bgRes.backgrounds || {};
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
  const eventTypeValue = container.querySelector('#filterEventType')?.value || 'all';
  const checkedStatuses = Array.from(container.querySelectorAll('#statusFilters input:checked')).map(cb => cb.value);
  const dateFromVal = container.querySelector('#filterDateFrom').value;
  const dateToVal = container.querySelector('#filterDateTo').value;
  const dateFrom = dateFromVal ? new Date(dateFromVal + 'T00:00:00') : null;
  const dateTo = dateToVal ? new Date(dateToVal + 'T23:59:59') : null;

  let filtered = state.sessionsData.filter(session => {
    if (searchTerm && !session.name.toLowerCase().includes(searchTerm)) return false;
    if (modeValue !== 'all' && session.mode !== modeValue) return false;
    if (eventTypeValue !== 'all' && session.eventType !== eventTypeValue) return false;

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

function getSessionProgress(session) {
  const isGallery = session.mode === 'gallery';
  // Galeria com "Entregar direto": pula o passo Compartilhar — o "Link" não se aplica.
  const isGalleryDirect = isGallery && session.galleryDeliveryMode === 'direct';
  const hasPhotos = (session.photos?.length || 0) > 0;
  const isGroupGallery = session.mode === 'multi_gallery';
  const hasGuests = (session.participants?.length || 0) > 0;
  const linkSent = !!session.codeSentAt;
  const clientAccessed = !!session.firstAccessAt;
  const selectionDone = ['submitted', 'delivered'].includes(session.selectionStatus);
  const delivered = session.selectionStatus === 'delivered';
  const isExpired = (() => {
    const dl = session.selectionDeadline ? new Date(session.selectionDeadline) : null;
    return dl && new Date() > dl && !selectionDone;
  })();

  // Pedido de reabertura pendente: na seleção individual é flag da sessão; em Seleção em
  // Grupo é por participante (qualquer um que tenha pedido conta para o aviso no card).
  const anyParticipantReopen = (session.participants || []).some(p => p.reopenRequested);
  const reopenPending = !isGallery && (!!session.reopenRequested || anyParticipantReopen);

  const steps = isGroupGallery
    ? [
        { label: 'Criada',     done: true },
        { label: 'Fotos',      done: hasPhotos },
        { label: 'Convidados', done: hasGuests },
        { label: 'Pronto',     done: hasPhotos && hasGuests },
      ]
    : isGalleryDirect
    ? [
        { label: 'Criada',   done: true },
        { label: 'Fotos',    done: hasPhotos },
        { label: 'Entregue', done: delivered },
      ]
    : isGallery
    ? [
        { label: 'Criada',   done: true },
        { label: 'Fotos',    done: hasPhotos },
        { label: 'Link',     done: linkSent },
        { label: 'Entregue', done: delivered },
      ]
    : reopenPending
    ? [
        { label: 'Criada',     done: true },
        { label: 'Fotos',      done: hasPhotos },
        { label: 'Link',       done: linkSent },
        { label: 'Seleção',    done: true },
        { label: 'Reabertura', done: false, active: true, warn: true },
        { label: 'Entregue',   done: false },
      ]
    : [
        { label: 'Criada',   done: true },
        { label: 'Fotos',    done: hasPhotos },
        { label: 'Link',     done: linkSent },
        { label: 'Seleção',  done: selectionDone },
        { label: 'Entregue', done: delivered },
      ];

  if (!reopenPending) {
    const activeIdx = steps.findIndex(s => !s.done);
    if (activeIdx !== -1) steps[activeIdx].active = true;
  }

  let nextAction, nextType;
  if (isGroupGallery) {
    if (!hasPhotos) { nextAction = 'Faça upload das fotos'; nextType = 'action'; }
    else if (!hasGuests) { nextAction = 'Adicione os convidados e compartilhe os links'; nextType = 'action'; }
    else if (isExpired) { nextAction = 'Prazo de acesso vencido'; nextType = 'warn'; }
    else { nextAction = 'Convidados podem ver e baixar — pronto'; nextType = 'done'; }
  } else if (reopenPending) {
    nextAction = 'Cliente pediu reabertura — reabrir ou recusar?'; nextType = 'warn';
  } else if (delivered) {
    nextAction = 'Sessão concluída'; nextType = 'done';
  } else if (isExpired) {
    nextAction = 'Prazo vencido — considere reabrir'; nextType = 'warn';
  } else if (!hasPhotos) {
    nextAction = 'Faça upload das fotos'; nextType = 'action';
  } else if (!linkSent && !isGalleryDirect) {
    nextAction = 'Envie o link ao cliente'; nextType = 'action';
  } else if (isGallery) {
    nextAction = 'Libere o download ao cliente'; nextType = 'action';
  } else if (!clientAccessed) {
    nextAction = 'Aguardando o cliente acessar'; nextType = 'wait';
  } else if (!selectionDone) {
    nextAction = 'Aguardando seleção do cliente'; nextType = 'wait';
  } else {
    nextAction = 'Entregue as fotos selecionadas'; nextType = 'action';
  }

  return { steps, nextAction, nextType };
}

function renderProgressStepper(session) {
  const { steps, nextAction, nextType } = getSessionProgress(session);

  const parts = [];
  steps.forEach((step, i) => {
    const color = step.done ? 'var(--green)' : (step.warn ? 'var(--orange)' : (step.active ? 'var(--accent)' : 'var(--border)'));
    const icon = step.done ? '✓' : (step.warn ? '!' : (step.active ? '›' : ''));
    parts.push(`<div style="display:flex;flex-direction:column;align-items:center;gap:0.125rem;"><div style="width:1.1rem;height:1.1rem;border-radius:50%;background:${color};color:#fff;font-size:0.5rem;display:flex;align-items:center;justify-content:center;font-weight:700;">${icon}</div><span style="font-size:0.5rem;color:${step.done || step.active ? 'var(--text-primary)' : 'var(--text-muted)'};white-space:nowrap;">${step.label}</span></div>`);
    if (i < steps.length - 1) {
      parts.push(`<div style="flex:1;height:1px;background:${step.done ? 'var(--green)' : 'var(--border)'};margin-top:0.5rem;"></div>`);
    }
  });

  const chips = {
    action: { bg: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: 'color-mix(in srgb, var(--accent) 30%, transparent)', color: 'var(--text-primary)', icon: '→' },
    wait:   { bg: 'var(--bg-hover)', border: 'var(--border)', color: 'var(--text-secondary)',       icon: '⏳' },
    done:   { bg: 'color-mix(in srgb, var(--green) 12%, transparent)',  border: 'color-mix(in srgb, var(--green) 30%, transparent)',  color: 'var(--green)',        icon: '✓' },
    warn:   { bg: 'color-mix(in srgb, var(--red) 12%, transparent)',    border: 'color-mix(in srgb, var(--red) 30%, transparent)',    color: 'var(--red)',          icon: '⚠' },
  };
  const c = chips[nextType] || chips.action;

  return `<div style="border-top:1px solid var(--border);margin-top:0.625rem;padding-top:0.5rem;"><div style="display:flex;align-items:flex-start;margin-bottom:0.4rem;">${parts.join('')}</div><span style="font-size:0.6875rem;background:${c.bg};border:1px solid ${c.border};color:${c.color};padding:0.15rem 0.5rem;border-radius:var(--r-chip);font-weight:500;">${c.icon} ${nextAction}</span></div>`;
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
    const mode = session.mode || 'gallery';
    const isExpired = deadline && now > deadline && session.selectionStatus !== 'submitted' && session.selectionStatus !== 'delivered';
    const isRedelivering = session.selectionStatus === 'delivered' && session.redeliveryMode === true;
    // Galeria em Grupo não tem etapa de seleção/entrega: deriva o status do progresso real
    // (sem fotos → aguardando upload; com fotos sem convidados → em visualização; com ambos → entregue).
    let statusKey;
    if (mode === 'multi_gallery') {
      const _hasPhotos = (session.photos?.length || 0) > 0;
      const _hasGuests = (session.participants?.length || 0) > 0;
      statusKey = isExpired ? 'expired' : (!_hasPhotos ? 'pending' : (!_hasGuests ? 'in_progress' : 'delivered'));
    } else {
      statusKey = isExpired ? 'expired' : (isRedelivering ? 'redelivering' : session.selectionStatus);
    }
    const statusMap = (mode === 'gallery' || mode === 'multi_gallery') ? GALLERY_STATUS_LABELS : STATUS_LABELS;
    const status = statusMap[statusKey] || statusMap.pending;
    const isMulti = mode === 'multi_selection' || mode === 'multi_instant' || mode === 'multi_gallery';
    const selectedCount = (session.selectedPhotos || []).length;
    const limit = session.packageLimit || 30;
    const extras = Math.max(0, selectedCount - limit);
    const extraPrice = session.extraPhotoPrice || 25;
    const deliveredPhotosCount = (session.photos || []).filter(p => p.urlOriginal).length;
    const isSubmitted = session.selectionStatus === 'submitted';
    const isDelivered = session.selectionStatus === 'delivered';

    let cardBg = 'var(--bg-surface)';
    let cardBorder = 'var(--border)';
    
    if (session.clientAccessBlocked) {
      cardBg = 'color-mix(in srgb, var(--red) 5%, transparent)';
      cardBorder = 'color-mix(in srgb, var(--red) 35%, transparent)';
    }

    // Rascunho: sessão recém-criada (via card de tipo) ainda sem nada preenchido.
    // Some sozinho assim que o fotógrafo vincula cliente, sobe foto ou renomeia.
    const isDraft = !(session.photos?.length) && !((session.participants || []).length)
      && !session.clientId && !session.clientName && !session.clientEmail
      && !session.codeSentAt && (!session.name || session.name.trim() === 'Nova sessão');

    // Fundo configurado pelo Superadmin para este modo (imagem, texto, cor atrás do conteúdo).
    const modeBg = sessionBackgrounds[mode];
    if (modeBg && modeBg.bgColor) {
      cardBg = modeBg.bgColor;
    }
    
    let bgLayer = '';
    if (modeBg) {
      if (modeBg.imageUrl) {
        bgLayer += `<div style="position:absolute; inset:0; background-image:url('${resolveImagePath(modeBg.imageUrl)}'); background-size:cover; background-position:center; opacity:${modeBg.opacity ?? 0.18}; pointer-events:none; z-index:0;"></div>`;
      }
      if (modeBg.text) {
        bgLayer += `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; overflow:hidden; opacity:${modeBg.opacity ?? 0.18}; z-index:0;">
          <span style="font-size:clamp(3rem, 10vw, 8rem); font-weight:800; color:${modeBg.textColor || '#ffffff'}; line-height:1; white-space:nowrap;">${modeBg.text}</span>
        </div>`;
      }
    }

    return `
      <div onclick="window.openSessionWizard?.('${session._id}')"
           title="Clique para abrir a sessão"
           style="position:relative; overflow:hidden; border:1px solid ${cardBorder}; border-radius:var(--r-card); padding:1.25rem; background:${cardBg}; cursor:pointer; transition: box-shadow 0.18s, transform 0.18s, border-color 0.18s;"
           onmouseenter="this.style.boxShadow='var(--cz-lift)'; this.style.transform='translateY(-2px)';"
           onmouseleave="this.style.boxShadow='none'; this.style.transform='none';">
        ${bgLayer}
        <div style="position:relative; z-index:1;">
        <div style="display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:0.75rem;">
          <div style="width:80px; height:80px; flex-shrink:0; border-radius:50%; overflow:hidden; background:var(--bg-base); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
            ${session.coverPhoto
        ? `<img src="${resolveImagePath(session.coverPhoto)}" style="width:100%; height:100%; object-fit:cover;" alt="Capa">`
        : `<span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>`}
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-start; width:100%;">
            <div style="display:flex; align-items:center; justify-content:flex-start; gap:0.5rem; flex-wrap:wrap; width:100%;">
              <span style="color:var(--text-primary); font-size:1.125rem; font-weight:700; text-decoration: underline; text-decoration-style: dotted; text-decoration-color: color-mix(in srgb, var(--accent) 50%, transparent); text-underline-offset: 4px;">${session.name}</span>
              ${session.clientId
                ? `<button onclick="event.stopPropagation(); window._pendingOpenClientId='${session.clientId._id}'; window.switchTab?.('clientes');" style="background:none; border:none; cursor:pointer; color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem; padding:0; text-decoration:underline; text-decoration-style:dotted; text-underline-offset:2px;" title="Ir para o cadastro do cliente"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${session.clientId.name}</button>`
                : (session.clientName ? `<span style="color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.25rem;" title="Cliente do Rhyno"><svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>${session.clientName}</span>` : '')}
              <span class="badge ${status.class}">${status.text}</span>
              ${isDraft ? `<span style="background:color-mix(in srgb, var(--text-muted) 15%, transparent);border:1px solid color-mix(in srgb, var(--text-muted) 30%, transparent);color:var(--text-muted);font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:var(--r-chip);font-weight:600;">Rascunho</span>` : ''}
              <span style="background:var(--bg-hover); border:1px solid var(--border); color:var(--text-secondary); font-size:0.6875rem; padding:0.15rem 0.5rem; border-radius:var(--r-chip); font-weight:500;">${{ selection: 'Seleção', multi_selection: 'Seleção em Grupo', gallery: 'Galeria', multi_gallery: 'Galeria em Grupo', instant: 'Entrega Imediata', multi_instant: 'Imediata em Grupo' }[session.mode] || 'Sessão'}</span>
              ${session.eventType && session.eventType !== 'outro' ? `<span style="background:var(--bg-hover); border:1px solid var(--border); color:var(--text-secondary); font-size:0.6875rem; padding:0.15rem 0.5rem; border-radius:var(--r-chip); font-weight:500;">${EVENT_LABELS[session.eventType] || session.eventType}</span>` : ''}
              ${(() => {
                const sessPending = session.extraRequest?.status === 'pending';
                const partExtras = (session.participants || []).filter(p => p.extraRequest?.status === 'pending');
                if (!sessPending && partExtras.length === 0) return '';
                const total = (sessPending ? (session.extraRequest.photos?.length || 0) : 0)
                  + partExtras.reduce((a, p) => a + (p.extraRequest.photos?.length || 0), 0);
                return `<span class="badge badge-warning">📸 ${total} extra(s)</span>`;
              })()}
              ${(session.mode !== 'gallery' && (session.reopenRequested || (session.participants || []).some(p => p.reopenRequested))) ? `<span style="background:color-mix(in srgb, var(--orange) 15%, transparent);border:1px solid color-mix(in srgb, var(--orange) 35%, transparent);color:var(--orange);font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:var(--r-chip);font-weight:600;">⚠ Reabertura solicitada</span>` : ''}
              ${session.clientAccessBlocked ? `<span style="background:color-mix(in srgb, var(--red) 15%, transparent);border:1px solid color-mix(in srgb, var(--red) 35%, transparent);color:var(--red);font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:var(--r-chip);font-weight:600;">🔒 Acesso bloqueado</span>` : ''}
              ${session.archivedAt ? `<span style="background:color-mix(in srgb, var(--text-muted) 15%, transparent);border:1px solid color-mix(in srgb, var(--text-muted) 30%, transparent);color:var(--text-muted);font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:var(--r-chip);font-weight:500;">📦 Arquivada</span>` : (() => { const ret = session.storageRetentionUntil ? new Date(session.storageRetentionUntil) : null; if (!ret) return ''; const daysLeft = Math.ceil((ret - now) / 86400000); if (daysLeft > 30) return ''; const label = daysLeft <= 0 ? '⏳ Storage vencido' : `⏳ Storage expira ${ret.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}`; const color = daysLeft <= 7 ? 'var(--red)' : 'var(--orange)'; return `<span style="background:color-mix(in srgb, ${color} 15%, transparent);border:1px solid color-mix(in srgb, ${color} 35%, transparent);color:${color};font-size:0.6875rem;padding:0.15rem 0.45rem;border-radius:var(--r-chip);font-weight:500;">${label}</span>`; })()}
            </div>
            <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:0.25rem; text-align:left;">
              ${formatDate(session.date)} • ${session.photos?.length || 0} fotos
              ${mode === 'selection' ? ` • ${selectedCount}/${limit} selecionadas` : (isMulti ? ` • ${(session.participants || []).length} participantes` : '')}
              ${deadline ? ` • ${(mode === 'gallery' || mode === 'multi_gallery') ? 'Acesso até' : 'Prazo'}: ${new Date(deadline).toLocaleDateString('pt-BR')}` : ''}
              ${!isMulti && extras > 0 ? ` • <span style="color:var(--yellow);">${extras} extras (R$ ${(extras * extraPrice).toFixed(2)})</span>` : ''}
            </div>
          </div>
        </div>
        ${renderProgressStepper(session)}
        <div class="card-actions-container">
          <button onclick="event.stopPropagation(); window.toggleSessionAccessFromList?.('${session._id}')"
            title="${session.clientAccessBlocked ? 'Liberar acesso do cliente' : 'Bloquear acesso do cliente'}"
            class="card-action-btn ${session.clientAccessBlocked ? 'blocked' : ''}">
            <span class="card-action-icon">${session.clientAccessBlocked ? icon('cadeadoAberto', 16) : icon('cadeado', 16)}</span>
            <span class="card-action-label">${session.clientAccessBlocked ? 'Liberar' : 'Bloquear'}</span>
          </button>
          <button onclick="event.stopPropagation(); window.openSessionWizardHistory?.('${session._id}')"
            title="Histórico da sessão"
            class="card-action-btn">
            <span class="card-action-icon">${icon('historico', 16)}</span>
            <span class="card-action-label">Histórico</span>
          </button>
          <button onclick="event.stopPropagation(); window.deleteSession?.('${session._id}')"
            title="Deletar sessão"
            class="card-action-btn danger">
            <span class="card-action-icon">${icon('lixeira', 16)}</span>
            <span class="card-action-label">Deletar</span>
          </button>
        </div>
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
  container.querySelector('#filterEventType')?.addEventListener('change', refilter);
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
