/**
 * Utilitário global para o modal de cliente
 */
import { apiPost, apiPut } from './api.js';

let _onSuccessCallback = null;

export function setupClientModal() {
  const btnCancelar = document.getElementById('btnCancelarCliente');
  const btnSalvar = document.getElementById('btnSalvarCliente');

  if (btnCancelar) btnCancelar.onclick = fecharModal;
  if (btnSalvar) btnSalvar.onclick = salvarCliente;
}

export function abrirModalClienteNovo(initialName = '', callback = null) {
  _onSuccessCallback = callback;
  
  document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
  document.getElementById('clienteNome').value = initialName;
  document.getElementById('clienteEmail').value = '';
  document.getElementById('clienteTelefone').value = '';
  document.getElementById('clienteTags').value = '';
  document.getElementById('clienteNotas').value = '';
  document.getElementById('modalClienteErro').style.display = 'none';
  document.getElementById('btnSalvarCliente').dataset.editandoId = '';
  
  document.getElementById('modalCliente').style.display = 'flex';
  setTimeout(() => document.getElementById('clienteNome').focus(), 50);
}

export function abrirModalClienteEditar(cliente, callback = null) {
  _onSuccessCallback = callback;
  
  document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
  document.getElementById('clienteNome').value = cliente.name || '';
  document.getElementById('clienteEmail').value = cliente.email || '';
  document.getElementById('clienteTelefone').value = cliente.phone || '';
  document.getElementById('clienteTags').value = (cliente.tags || []).join(', ');
  document.getElementById('clienteNotas').value = cliente.notes || '';
  document.getElementById('modalClienteErro').style.display = 'none';
  document.getElementById('btnSalvarCliente').dataset.editandoId = cliente._id;
  
  document.getElementById('modalCliente').style.display = 'flex';
}

export function fecharModal() {
  const modal = document.getElementById('modalCliente');
  if (modal) modal.style.display = 'none';
}

async function salvarCliente() {
  const nome = document.getElementById('clienteNome').value.trim();
  const email = document.getElementById('clienteEmail').value.trim();
  const telefone = document.getElementById('clienteTelefone').value.trim();
  const tagsRaw = document.getElementById('clienteTags').value;
  const notas = document.getElementById('clienteNotas').value.trim();
  const btnSalvar = document.getElementById('btnSalvarCliente');
  const editandoId = btnSalvar.dataset.editandoId;
  const erroEl = document.getElementById('modalClienteErro');

  if (!nome) {
    erroEl.textContent = 'O nome é obrigatório.';
    erroEl.style.display = 'block';
    return;
  }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t);
  const payload = { name: nome, email, phone: telefone, notes: notas, tags };

  btnSalvar.disabled = true;
  const originalText = btnSalvar.textContent;
  btnSalvar.textContent = 'Salvando...';
  erroEl.style.display = 'none';

  try {
    let result;
    if (editandoId) {
      result = await apiPut(`/api/clients/${editandoId}`, payload);
    } else {
      result = await apiPost('/api/clients', payload);
    }
    
    fecharModal();
    if (_onSuccessCallback) _onSuccessCallback(result.client);
    
  } catch (error) {
    erroEl.textContent = error.message || 'Erro ao salvar cliente.';
    erroEl.style.display = 'block';
  } finally {
    btnSalvar.disabled = false;
    btnSalvar.textContent = originalText;
  }
}
