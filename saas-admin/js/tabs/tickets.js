// Chamados (Fala Conosco) — fila, thread e resposta do superadmin
import { apiRequest, saasToast, saasConfirm, esc, formatSize, getToken } from '../core.js';

// ============================================================================
// CHAMADOS (TICKETS)
// ============================================================================

let allTicketsAdmin = [];

async function loadTickets() {
  const tbody = document.getElementById('ticketsTable');
  try {
    const status = document.getElementById('ticketStatusFilter').value;
    const category = document.getElementById('ticketCategoryFilter').value;

    let url = '/api/admin/tickets';
    const params = [];
    if (status) params.push(`status=${status}`);
    if (category) params.push(`category=${category}`);
    if (params.length > 0) url += '?' + params.join('&');

    const data = await apiRequest('GET', url);
    const tickets = data.tickets || [];
    allTicketsAdmin = tickets;

    // Atualizar badge
    const openCount = tickets.filter(t => t.status === 'open').length;
    const badge = document.getElementById('ticketsBadge');
    if (openCount > 0) {
      badge.textContent = openCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }

    if (!tickets.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">Nenhum chamado encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      const orgName = t.organizationId.name || 'Desconhecido';
      const updatedDate = new Date(t.updatedAt).toLocaleDateString('pt-BR');
      const msgCount = t.messages.length;
      const categoryLabels = { duvida: 'Dúvida', bug: 'Bug', financeiro: 'Financeiro', sugestao: 'Sugestão', outro: 'Outro' };
      const statusLabels = { open: 'Aberto', pending: 'Aguardando', resolved: 'Resolvido' };
      const statusColors = { open: 'rgba(59, 130, 246, 0.12)', pending: 'rgba(234, 179, 8, 0.12)', resolved: 'rgba(63, 185, 80, 0.12)' };
      const statusTexts = { open: '#3b82f6', pending: '#eab308', resolved: '#22c55e' };

      return `
        <tr>
          <td><strong>${esc(orgName)}</strong></td>
          <td>${esc(t.subject)}</td>
          <td>${categoryLabels[t.category] || t.category}</td>
          <td style="color:${statusTexts[t.status]}; background:${statusColors[t.status]}; border-radius:4px; font-weight:600; text-align:center;">${statusLabels[t.status] || t.status}</td>
          <td style="text-align:center;">${msgCount}</td>
          <td>${updatedDate}</td>
          <td>
            <button class="btn btn-details" onclick="openTicketDetail('${t._id}')">Ver</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red); text-align:center; padding:2rem;">Erro ao carregar: ${esc(err.message)}</td></tr>`;
  }
}

window.openTicketDetail = (ticketId) => {
  const ticket = allTicketsAdmin.find(t => t._id === ticketId);
  if (!ticket) {
    saasToast('Chamado não encontrado — recarregue a lista', 'error');
    return;
  }

  const modal = document.getElementById('detailModal');
  const content = document.getElementById('modalContent');
  document.getElementById('modalTitle').textContent = `Chamado: ${ticket.subject}`;
  modal.classList.add('active');
  renderTicketModal(content, ticket);
};

function renderTicketModal(content, ticket) {
  const categoryLabels = { duvida: 'Dúvida', bug: 'Bug', financeiro: 'Financeiro', sugestao: 'Sugestão', outro: 'Outro' };
  const statusLabels = { open: 'Aberto', pending: 'Aguardando fotógrafo', resolved: 'Resolvido' };
  const orgName = ticket.organizationId?.name || 'Desconhecido';
  const createdDate = new Date(ticket.createdAt).toLocaleString('pt-BR');

  const messagesHtml = ticket.messages.map(msg => {
    const isAdmin = msg.from === 'admin';
    const when = new Date(msg.at).toLocaleString('pt-BR');
    return `
      <div style="display:flex; flex-direction:column; align-items:${isAdmin ? 'flex-end' : 'flex-start'}; gap:0.25rem;">
        <span style="font-size:0.7rem; color:#64748b; font-weight:600;">${isAdmin ? 'Suporte (você)' : esc(orgName)} • ${when}</span>
        <div style="background:${isAdmin ? '#312e81' : '#1e293b'}; border:1px solid ${isAdmin ? '#4f46e5' : '#334155'}; color:#f1f5f9; padding:0.6rem 0.85rem; border-radius:0.5rem; max-width:80%; font-size:0.85rem; line-height:1.5; white-space:pre-wrap; word-break:break-word;">${esc(msg.text)}</div>
        ${msg.attachmentUrl ? `<a href="${esc(msg.attachmentUrl)}" target="_blank" style="font-size:0.75rem; color:#818cf8;">📎 Ver anexo</a>` : ''}
      </div>
    `;
  }).join('');

  const statusOptions = ['open', 'pending', 'resolved'].map(s =>
    `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${statusLabels[s]}</option>`
  ).join('');

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div style="display:flex; gap:1.5rem; flex-wrap:wrap; align-items:center; padding-bottom:0.75rem; border-bottom:1px solid #334155;">
        <div><span style="font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Fotógrafo</span><div style="font-weight:700;">${esc(orgName)}</div></div>
        <div><span style="font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Categoria</span><div>${categoryLabels[ticket.category] || ticket.category}</div></div>
        <div><span style="font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Aberto em</span><div>${createdDate}</div></div>
        <div style="margin-left:auto; display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:0.7rem; color:#64748b; text-transform:uppercase; font-weight:700;">Status</span>
          <select id="ticketStatusSelect" style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.25rem; padding:0.3rem 0.5rem; font-size:0.8rem; cursor:pointer;">${statusOptions}</select>
        </div>
      </div>

      <div id="ticketThread" style="display:flex; flex-direction:column; gap:0.85rem; max-height:340px; overflow-y:auto; padding:0.25rem 0.25rem 0.25rem 0;">
        ${messagesHtml || '<p style="color:#64748b;">Sem mensagens</p>'}
      </div>

      <div style="border-top:1px solid #334155; padding-top:0.75rem; display:flex; flex-direction:column; gap:0.5rem;">
        <textarea id="ticketReplyInput" placeholder="Escreva sua resposta ao fotógrafo…" style="background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:0.375rem; padding:0.6rem; font-family:inherit; font-size:0.85rem; min-height:90px; resize:vertical;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button id="ticketReplyBtn" style="background:#6366f1; color:#fff; border:none; border-radius:0.375rem; padding:0.5rem 1.25rem; font-size:0.85rem; font-weight:600; cursor:pointer;">Enviar resposta</button>
        </div>
        <p style="font-size:0.7rem; color:#64748b; margin:0;">A resposta notifica o fotógrafo no sininho do painel e por e-mail. O status muda para "Aguardando fotógrafo".</p>
      </div>
    </div>
  `;

  // Scroll da thread para a última mensagem
  const thread = content.querySelector('#ticketThread');
  thread.scrollTop = thread.scrollHeight;

  // Mudar status
  content.querySelector('#ticketStatusSelect').onchange = async (e) => {
    const newStatus = e.target.value;
    try {
      const data = await apiRequest('PUT', `/api/admin/tickets/${ticket._id}/status`, { status: newStatus });
      _updateTicketCache(data.ticket);
      saasToast(`Status alterado para "${statusLabels[newStatus]}"`, 'success');
      loadTickets();
    } catch (err) {
      saasToast('Erro ao mudar status: ' + err.message, 'error');
      e.target.value = ticket.status;
    }
  };

  // Responder
  content.querySelector('#ticketReplyBtn').onclick = async () => {
    const input = content.querySelector('#ticketReplyInput');
    const text = input.value.trim();
    if (!text) {
      saasToast('Escreva uma mensagem antes de enviar', 'error');
      return;
    }
    const btn = content.querySelector('#ticketReplyBtn');
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    try {
      const data = await apiRequest('POST', `/api/admin/tickets/${ticket._id}/reply`, { text });
      _updateTicketCache(data.ticket);
      saasToast('Resposta enviada ao fotógrafo', 'success');
      renderTicketModal(content, data.ticket);
      loadTickets();
    } catch (err) {
      saasToast('Erro ao enviar: ' + err.message, 'error');
      btn.textContent = 'Enviar resposta';
      btn.disabled = false;
    }
  };
}

function _updateTicketCache(updated) {
  if (!updated) return;
  const idx = allTicketsAdmin.findIndex(t => t._id === updated._id);
  if (idx !== -1) {
    // populate de organizationId se perde no retorno do save — preserva o da cache
    if (typeof updated.organizationId === 'string') updated.organizationId = allTicketsAdmin[idx].organizationId;
    allTicketsAdmin[idx] = updated;
  }
}


export { loadTickets };
