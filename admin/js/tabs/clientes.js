/**
 * Tab: Clientes (CRM)
 * Gerencia a base de clientes do fotografo
 */

import { apiGet, apiDelete } from '../utils/api.js';
import { escapeHtml } from '../utils/helpers.js';
import { setupClientModal, abrirModalClienteNovo, abrirModalClienteEditar } from '../utils/client-modal.js';

let clientesData = [];
let searchTerm = '';
let filterAniversariantes = false;
let filterEventType = '';

// Helpers de data
function formatBirthShort(d) {
  if (!d) return '';
  const dt = new Date(d);
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${String(dt.getUTCDate()).padStart(2,'0')}/${meses[dt.getUTCMonth()]}`;
}

// Retorna numero de dias ate o proximo aniversario (ignorando ano)
function diasAteAniversario(d) {
  if (!d) return null;
  const hoje = new Date();
  const dt = new Date(d);
  const proxAniv = new Date(hoje.getFullYear(), dt.getUTCMonth(), dt.getUTCDate());
  if (proxAniv < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) {
    proxAniv.setFullYear(hoje.getFullYear() + 1);
  }
  const diff = proxAniv - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function aniversarioNoMes(d) {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getUTCMonth() === new Date().getMonth();
}

export async function renderClientes(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Clientes</h2>
        <button id="btnNovoCliente" class="btn btn-success">
          + Adicionar Cliente
        </button>
      </div>

      <!-- Filtros avancados CRM -->
      <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
        <button id="btnFiltroAniversariantes" class="btn btn-sm" style="background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary);">
          🎂 Aniversariantes do Mês
        </button>
        <select id="filtroTipoEvento" class="input" style="max-width:240px;">
          <option value="">Todos os tipos de evento</option>
        </select>
      </div>

      <!-- Busca -->
      <div class="input-group" style="margin-bottom:0;">
        <input type="text" id="searchClientes" class="input" placeholder="Buscar por nome, e-mail ou telefone..." value="${searchTerm}">
      </div>

      <!-- Lista -->
      <div id="clientesLista"></div>
    </div>

    <!-- Modal Timeline do Cliente -->
    <div id="modalTimelineCliente" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
      <div style="background:var(--bg-surface); border-radius:0.5rem; padding:1.5rem; width:100%; max-width:640px; margin:1rem; max-height:90vh; overflow-y:auto;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
          <h3 id="modalTimelineTitulo" style="font-size:1.25rem; font-weight:bold; color:var(--text-primary); margin:0;">Histórico do Cliente</h3>
          <button id="btnFecharTimeline" class="btn btn-ghost btn-sm">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div id="timelineClienteLista"></div>
      </div>
    </div>
  `;

  await carregarClientes(container);
  setupEventos(container);
}

async function carregarClientes(container) {
  try {
    const data = await apiGet('/api/clients');
    clientesData = data.clients || [];
    popularFiltroEventos(container);
    renderLista(container);
  } catch (error) {
    document.getElementById('clientesLista').innerHTML =
      `<p style="color:var(--red);">Erro ao carregar clientes: ${error.message}</p>`;
  }
}

function popularFiltroEventos(container) {
  const select = container.querySelector('#filtroTipoEvento');
  if (!select) return;
  const tipos = [...new Set(clientesData.map(c => c.lastEventType).filter(Boolean))].sort();
  const atual = filterEventType;
  select.innerHTML = `<option value="">Todos os tipos de evento</option>` +
    tipos.map(t => `<option value="${escapeHtml(t)}"${t === atual ? ' selected' : ''}>${escapeHtml(t)}</option>`).join('');
}

function renderLista(container) {
  const lista = container.querySelector('#clientesLista');
  const term = searchTerm.toLowerCase();

  // Atualizar visual do botao toggle
  const btnAniv = container.querySelector('#btnFiltroAniversariantes');
  if (btnAniv) {
    btnAniv.style.background = filterAniversariantes ? 'var(--accent)' : 'var(--bg-surface)';
    btnAniv.style.color = filterAniversariantes ? 'var(--bg-base)' : 'var(--text-primary)';
  }

  const filtrados = clientesData.filter(c => {
    if (term) {
      const matchTerm = (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term);
      if (!matchTerm) return false;
    }
    if (filterAniversariantes && !aniversarioNoMes(c.birthDate)) return false;
    if (filterEventType && c.lastEventType !== filterEventType) return false;
    return true;
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
        ${clientesData.length === 0
          ? 'Você não tem clientes cadastrados ainda. Clique em "+ Adicionar Cliente" para começar.'
          : 'Nenhum cliente encontrado para os filtros aplicados.'}
      </div>
    `;
    return;
  }

  lista.innerHTML = filtrados.map(c => {
    const dias = diasAteAniversario(c.birthDate);
    const badgeAniv = (dias !== null && dias <= 30)
      ? `<span class="badge badge-warning">🎂 Aniversário em ${dias === 0 ? 'hoje' : `${dias} dia${dias !== 1 ? 's' : ''}`}</span>`
      : '';
    const ltv = c.lifetimeValue || 0;
    const ltvBlock = ltv > 0
      ? `<span style="color:var(--accent); font-size:0.8rem;">💰 LTV: ${ltv} foto${ltv !== 1 ? 's' : ''} extra${ltv !== 1 ? 's' : ''}</span>`
      : '';
    const birthBlock = c.birthDate
      ? `<span style="color:var(--text-muted); font-size:0.8rem;">🎂 ${formatBirthShort(c.birthDate)}</span>`
      : '';
    const eventBlock = c.lastEventType
      ? `<span class="badge badge-neutral">${escapeHtml(c.lastEventType)}</span>`
      : '';

    return `
    <div class="cliente-item" data-id="${c._id}"
      style="border:1px solid var(--border); border-radius:0.5rem; padding:1rem 1.25rem; background:var(--bg-surface); margin-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">

      <div style="flex:1; min-width:200px;">
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <span style="font-weight:600; color:var(--text-primary); font-size:1rem;">${escapeHtml(c.name)}</span>
          ${eventBlock}
          ${(c.tags && c.tags.length > 0) ? c.tags.map(t => `<span class="badge badge-neutral">${escapeHtml(t)}</span>`).join('') : ''}
          ${badgeAniv}
        </div>
        <div style="display:flex; gap:1.5rem; margin-top:0.375rem; flex-wrap:wrap;">
          ${c.email ? `<span style="color:var(--text-muted); font-size:0.8rem;">✉ ${escapeHtml(c.email)}</span>` : ''}
          ${c.phone ? `<span style="color:var(--text-muted); font-size:0.8rem;">📱 ${escapeHtml(c.phone)}</span>` : ''}
          ${birthBlock}
          <span style="color:var(--text-muted); font-size:0.8rem;">📁 ${c.sessionCount || 0} sessão${c.sessionCount !== 1 ? 's' : ''}</span>
          ${ltvBlock}
        </div>
        ${c.notes ? `<p style="color:var(--text-muted); font-size:0.8rem; margin:0.375rem 0 0; font-style:italic;">${escapeHtml(c.notes.substring(0, 100))}${c.notes.length > 100 ? '...' : ''}</p>` : ''}
      </div>

      <div style="display:flex; gap:0.5rem; flex-shrink:0; flex-wrap:wrap;">
        <button data-ver-timeline="${c._id}" class="btn btn-sm btn-ghost">
          🕒 Ver Timeline
        </button>
        <button data-editar="${c._id}" class="btn btn-sm btn-ghost">
          Editar
        </button>
        <button data-deletar="${c._id}" class="btn btn-sm btn-danger">
          Excluir
        </button>
      </div>
    </div>
  `;
  }).join('');

  // Eventos da lista
  lista.querySelectorAll('[data-editar]').forEach(btn => {
    btn.onclick = () => abrirModalEditar(container, btn.dataset.editar);
  });
  lista.querySelectorAll('[data-deletar]').forEach(btn => {
    btn.onclick = () => deletarCliente(container, btn.dataset.deletar);
  });
  lista.querySelectorAll('[data-ver-timeline]').forEach(btn => {
    btn.onclick = () => verTimelineCliente(container, btn.dataset.verTimeline);
  });
}

function setupEventos(container) {
  // Busca
  container.querySelector('#searchClientes').oninput = (e) => {
    searchTerm = e.target.value;
    renderLista(container);
  };

  // Filtro aniversariantes
  container.querySelector('#btnFiltroAniversariantes').onclick = () => {
    filterAniversariantes = !filterAniversariantes;
    renderLista(container);
  };

  // Filtro tipo de evento
  container.querySelector('#filtroTipoEvento').onchange = (e) => {
    filterEventType = e.target.value;
    renderLista(container);
  };

  // Botao novo cliente
  container.querySelector('#btnNovoCliente').onclick = () => {
    abrirModalClienteNovo('', (novoCliente) => {
      clientesData.unshift({ ...novoCliente, sessionCount: 0, lifetimeValue: 0 });
      popularFiltroEventos(container);
      renderLista(container);
    });
  };

  // Inicializar o modal global (eventos de salvar/cancelar)
  setupClientModal();

  // Fechar modal timeline
  container.querySelector('#btnFecharTimeline').onclick = () => {
    container.querySelector('#modalTimelineCliente').style.display = 'none';
  };
}

function abrirModalEditar(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  abrirModalClienteEditar(cliente, (updated) => {
    const idx = clientesData.findIndex(c => c._id === id);
    if (idx >= 0) {
      clientesData[idx] = { ...clientesData[idx], ...updated };
      popularFiltroEventos(container);
      renderLista(container);
    }
  });
}

async function deletarCliente(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  const sessoes = cliente.sessionCount || 0;
  const msg = sessoes > 0
    ? `Excluir "${cliente.name}"? Este cliente possui ${sessoes} sessão(ões) vinculada(s). As sessões não serão excluídas, apenas desvinculadas.`
    : `Excluir "${cliente.name}"?`;

  const confirmado = await window.showConfirm?.(msg);
  if (!confirmado) return;

  try {
    await apiDelete(`/api/clients/${id}`);
    clientesData = clientesData.filter(c => c._id !== id);
    renderLista(container);
  } catch (error) {
    window.showToast?.('Erro: ' + error.message, 'error');
  }
}

async function verTimelineCliente(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  container.querySelector('#modalTimelineTitulo').textContent = `Histórico de ${cliente.name}`;
  const lista = container.querySelector('#timelineClienteLista');
  lista.innerHTML = '<p style="color:var(--text-muted);">Carregando...</p>';
  container.querySelector('#modalTimelineCliente').style.display = 'flex';

  try {
    const data = await apiGet(`/api/clients/${id}/timeline`);
    const events = data.events || [];

    if (events.length === 0) {
      lista.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1.5rem 0;">Nenhum evento registrado ainda.</p>';
      return;
    }

    lista.innerHTML = `
      <div style="position:relative; padding-left:1.25rem; border-left:2px solid var(--border);">
        ${events.map(ev => {
          const dataFmt = ev.at
            ? new Date(ev.at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';
          return `
            <div style="position:relative; margin-bottom:1.25rem;">
              <span style="position:absolute; left:-1.7rem; top:0.1rem; width:0.85rem; height:0.85rem; border-radius:50%; background:var(--accent); display:inline-block;"></span>
              <div style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(dataFmt)}</div>
              <div style="color:var(--text-primary); margin-top:0.15rem;">
                <span style="margin-right:0.4rem;">${ev.icon || '•'}</span>${escapeHtml(ev.label || '')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (error) {
    lista.innerHTML = `<p style="color:var(--red);">Erro ao carregar histórico: ${error.message}</p>`;
  }
}
