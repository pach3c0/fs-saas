/**
 * Tab: Clientes (CRM)
 * Gerencia a base de clientes do fotografo
 */

import { appState } from '../state.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

let clientesData = [];
let searchTerm = '';

export async function renderClientes(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Clientes</h2>
        <button id="btnNovoCliente" style="background:#16a34a; color:white; padding:0.5rem 1.25rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
          + Novo Cliente
        </button>
      </div>

      <!-- Busca -->
      <div>
        <input type="text" id="searchClientes" placeholder="Buscar por nome, e-mail ou telefone..."
          style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#1f2937; color:#f3f4f6; box-sizing:border-box;"
          value="${searchTerm}">
      </div>

      <!-- Lista -->
      <div id="clientesLista"></div>
    </div>

    <!-- Modal Criar/Editar Cliente -->
    <div id="modalCliente" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; width:100%; max-width:520px; margin:1rem; max-height:90vh; overflow-y:auto;">
        <h3 id="modalClienteTitulo" style="font-size:1.25rem; font-weight:bold; color:#f3f4f6; margin:0 0 1.25rem;">Novo Cliente</h3>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Nome *</label>
            <input type="text" id="clienteNome" placeholder="Nome completo"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; box-sizing:border-box;">
          </div>

          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">E-mail</label>
            <input type="email" id="clienteEmail" placeholder="email@exemplo.com"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; box-sizing:border-box;">
          </div>

          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Telefone / WhatsApp</label>
            <input type="text" id="clienteTelefone" placeholder="(11) 99999-9999"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; box-sizing:border-box;">
          </div>

          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Tags</label>
            <input type="text" id="clienteTags" placeholder="casamento, aniversario, familia (separadas por vírgula)"
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; box-sizing:border-box;">
            <p style="font-size:0.75rem; color:#9ca3af; margin:0.25rem 0 0;">Separe as tags por vírgula</p>
          </div>

          <div>
            <label style="display:block; font-size:0.875rem; font-weight:500; margin-bottom:0.375rem; color:#d1d5db;">Notas</label>
            <textarea id="clienteNotas" rows="3" placeholder="Observações sobre o cliente..."
              style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; box-sizing:border-box; resize:vertical;"></textarea>
          </div>
        </div>

        <div id="modalClienteErro" style="display:none; color:#f87171; font-size:0.875rem; margin-top:0.75rem;"></div>

        <div style="display:flex; gap:0.75rem; margin-top:1.25rem; justify-content:flex-end;">
          <button id="btnCancelarCliente" style="background:#374151; color:#f3f4f6; padding:0.5rem 1.25rem; border-radius:0.375rem; border:none; cursor:pointer;">
            Cancelar
          </button>
          <button id="btnSalvarCliente" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
            Salvar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Sessoes do Cliente -->
    <div id="modalSessoesCliente" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; align-items:center; justify-content:center;">
      <div style="background:#1f2937; border-radius:0.5rem; padding:1.5rem; width:100%; max-width:600px; margin:1rem; max-height:90vh; overflow-y:auto;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
          <h3 id="modalSessoesTitulo" style="font-size:1.25rem; font-weight:bold; color:#f3f4f6; margin:0;">Sessões do Cliente</h3>
          <button id="btnFecharSessoes" style="background:none; border:none; color:#9ca3af; font-size:1.5rem; cursor:pointer; line-height:1;">×</button>
        </div>
        <div id="sessoesClienteLista"></div>
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
    renderLista(container);
  } catch (error) {
    document.getElementById('clientesLista').innerHTML =
      `<p style="color:#f87171;">Erro ao carregar clientes: ${error.message}</p>`;
  }
}

function renderLista(container) {
  const lista = container.querySelector('#clientesLista');
  const term = searchTerm.toLowerCase();

  const filtrados = clientesData.filter(c => {
    if (!term) return true;
    return (
      (c.name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term)
    );
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem; color:#9ca3af;">
        ${clientesData.length === 0
          ? 'Nenhum cliente cadastrado ainda. Clique em "+ Novo Cliente" para começar.'
          : 'Nenhum cliente encontrado para a busca.'}
      </div>
    `;
    return;
  }

  lista.innerHTML = filtrados.map(c => `
    <div class="cliente-item" data-id="${c._id}"
      style="border:1px solid #374151; border-radius:0.5rem; padding:1rem 1.25rem; background:#1f2937; margin-bottom:0.75rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">

      <div style="flex:1; min-width:200px;">
        <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <span style="font-weight:600; color:#f3f4f6; font-size:1rem;">${escapeHtml(c.name)}</span>
          ${c.tags && c.tags.length > 0 ? c.tags.map(t =>
            `<span style="background:#374151; color:#9ca3af; font-size:0.7rem; padding:0.15rem 0.5rem; border-radius:9999px;">${escapeHtml(t)}</span>`
          ).join('') : ''}
        </div>
        <div style="display:flex; gap:1.5rem; margin-top:0.375rem; flex-wrap:wrap;">
          ${c.email ? `<span style="color:#9ca3af; font-size:0.8rem;">✉ ${escapeHtml(c.email)}</span>` : ''}
          ${c.phone ? `<span style="color:#9ca3af; font-size:0.8rem;">📱 ${escapeHtml(c.phone)}</span>` : ''}
          <span style="color:#60a5fa; font-size:0.8rem; cursor:pointer;" data-ver-sessoes="${c._id}">
            📁 ${c.sessionCount || 0} sessão${c.sessionCount !== 1 ? 's' : ''}
          </span>
        </div>
        ${c.notes ? `<p style="color:#6b7280; font-size:0.8rem; margin:0.375rem 0 0; font-style:italic;">${escapeHtml(c.notes.substring(0, 100))}${c.notes.length > 100 ? '...' : ''}</p>` : ''}
      </div>

      <div style="display:flex; gap:0.5rem; flex-shrink:0;">
        <button data-editar="${c._id}"
          style="background:#374151; color:#60a5fa; padding:0.4rem 0.75rem; border-radius:0.375rem; border:none; font-size:0.8rem; cursor:pointer;">
          Editar
        </button>
        <button data-deletar="${c._id}"
          style="background:#374151; color:#ef4444; padding:0.4rem 0.75rem; border-radius:0.375rem; border:none; font-size:0.8rem; cursor:pointer;">
          Excluir
        </button>
      </div>
    </div>
  `).join('');

  // Eventos da lista
  lista.querySelectorAll('[data-editar]').forEach(btn => {
    btn.onclick = () => abrirModalEditar(container, btn.dataset.editar);
  });

  lista.querySelectorAll('[data-deletar]').forEach(btn => {
    btn.onclick = () => deletarCliente(container, btn.dataset.deletar);
  });

  lista.querySelectorAll('[data-ver-sessoes]').forEach(span => {
    span.onclick = () => verSessoesCliente(container, span.dataset.verSessoes);
  });
}

function setupEventos(container) {
  // Busca
  container.querySelector('#searchClientes').oninput = (e) => {
    searchTerm = e.target.value;
    renderLista(container);
  };

  // Botao novo cliente
  container.querySelector('#btnNovoCliente').onclick = () => abrirModalNovo(container);

  // Cancelar modal
  container.querySelector('#btnCancelarCliente').onclick = () => fecharModal(container);

  // Salvar cliente
  container.querySelector('#btnSalvarCliente').onclick = () => salvarCliente(container);

  // Fechar modal sessoes
  container.querySelector('#btnFecharSessoes').onclick = () => {
    container.querySelector('#modalSessoesCliente').style.display = 'none';
  };
}

function abrirModalNovo(container) {
  container.querySelector('#modalClienteTitulo').textContent = 'Novo Cliente';
  container.querySelector('#clienteNome').value = '';
  container.querySelector('#clienteEmail').value = '';
  container.querySelector('#clienteTelefone').value = '';
  container.querySelector('#clienteTags').value = '';
  container.querySelector('#clienteNotas').value = '';
  container.querySelector('#modalClienteErro').style.display = 'none';
  container.querySelector('#btnSalvarCliente').dataset.editandoId = '';
  const modal = container.querySelector('#modalCliente');
  modal.style.display = 'flex';
  setTimeout(() => container.querySelector('#clienteNome').focus(), 50);
}

function abrirModalEditar(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  container.querySelector('#modalClienteTitulo').textContent = 'Editar Cliente';
  container.querySelector('#clienteNome').value = cliente.name || '';
  container.querySelector('#clienteEmail').value = cliente.email || '';
  container.querySelector('#clienteTelefone').value = cliente.phone || '';
  container.querySelector('#clienteTags').value = (cliente.tags || []).join(', ');
  container.querySelector('#clienteNotas').value = cliente.notes || '';
  container.querySelector('#modalClienteErro').style.display = 'none';
  container.querySelector('#btnSalvarCliente').dataset.editandoId = id;
  container.querySelector('#modalCliente').style.display = 'flex';
}

function fecharModal(container) {
  container.querySelector('#modalCliente').style.display = 'none';
}

async function salvarCliente(container) {
  const nome = container.querySelector('#clienteNome').value.trim();
  const email = container.querySelector('#clienteEmail').value.trim();
  const telefone = container.querySelector('#clienteTelefone').value.trim();
  const tagsRaw = container.querySelector('#clienteTags').value;
  const notas = container.querySelector('#clienteNotas').value.trim();
  const editandoId = container.querySelector('#btnSalvarCliente').dataset.editandoId;
  const erroEl = container.querySelector('#modalClienteErro');

  if (!nome) {
    erroEl.textContent = 'O nome é obrigatório.';
    erroEl.style.display = 'block';
    return;
  }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t);
  const payload = { name: nome, email, phone: telefone, notes: notas, tags };

  const btnSalvar = container.querySelector('#btnSalvarCliente');
  btnSalvar.disabled = true;
  btnSalvar.textContent = 'Salvando...';
  erroEl.style.display = 'none';

  try {
    if (editandoId) {
      const data = await apiPut(`/api/clients/${editandoId}`, payload);
      const idx = clientesData.findIndex(c => c._id === editandoId);
      if (idx >= 0) clientesData[idx] = { ...clientesData[idx], ...data.client };
    } else {
      const data = await apiPost('/api/clients', payload);
      clientesData.unshift({ ...data.client, sessionCount: 0 });
    }
    fecharModal(container);
    renderLista(container);
  } catch (error) {
    erroEl.textContent = error.message || 'Erro ao salvar cliente.';
    erroEl.style.display = 'block';
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = 'Salvar';
  }
}

async function deletarCliente(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  const sessoes = cliente.sessionCount || 0;
  const msg = sessoes > 0
    ? `Excluir "${cliente.name}"? Este cliente possui ${sessoes} sessão(ões) vinculada(s). As sessões não serão excluídas, apenas desvinculadas.`
    : `Excluir "${cliente.name}"?`;

  if (!confirm(msg)) return;

  try {
    await apiDelete(`/api/clients/${id}`);
    clientesData = clientesData.filter(c => c._id !== id);
    renderLista(container);
  } catch (error) {
    alert('Erro ao excluir cliente: ' + error.message);
  }
}

async function verSessoesCliente(container, id) {
  const cliente = clientesData.find(c => c._id === id);
  if (!cliente) return;

  container.querySelector('#modalSessoesTitulo').textContent = `Sessões de ${cliente.name}`;
  const lista = container.querySelector('#sessoesClienteLista');
  lista.innerHTML = '<p style="color:#9ca3af;">Carregando...</p>';
  container.querySelector('#modalSessoesCliente').style.display = 'flex';

  try {
    const data = await apiGet(`/api/clients/${id}/sessions`);
    const sessoes = data.sessions || [];

    if (sessoes.length === 0) {
      lista.innerHTML = '<p style="color:#9ca3af; text-align:center; padding:1.5rem 0;">Nenhuma sessão vinculada a este cliente.</p>';
      return;
    }

    const statusLabel = {
      pending: 'Aguardando',
      in_progress: 'Em andamento',
      submitted: 'Enviada',
      delivered: 'Entregue',
      expired: 'Expirada'
    };
    const statusColor = {
      pending: '#9ca3af',
      in_progress: '#60a5fa',
      submitted: '#facc15',
      delivered: '#34d399',
      expired: '#f87171'
    };

    lista.innerHTML = sessoes.map(s => {
      const data = s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '—';
      const status = s.selectionStatus || 'pending';
      return `
        <div style="border:1px solid #374151; border-radius:0.375rem; padding:0.875rem 1rem; margin-bottom:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
          <div>
            <div style="font-weight:600; color:#f3f4f6;">${escapeHtml(s.name)}</div>
            <div style="font-size:0.8rem; color:#9ca3af; margin-top:0.2rem;">
              ${escapeHtml(s.type || '—')} • ${data}
              ${s.mode === 'gallery' ? ' • Galeria' : ' • Seleção'}
            </div>
          </div>
          <span style="font-size:0.8rem; font-weight:600; color:${statusColor[status] || '#9ca3af'};">
            ${statusLabel[status] || status}
          </span>
        </div>
      `;
    }).join('');
  } catch (error) {
    lista.innerHTML = `<p style="color:#f87171;">Erro ao carregar sessões: ${error.message}</p>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
