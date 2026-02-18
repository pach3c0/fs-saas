// admin/js/tabs/albuns-prova.js
// Aba Prova de Álbuns — ES Module
import { appState } from '../state.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';
import { copyToClipboard } from '../utils/helpers.js';

const palette = {
  bg: '#111827',
  card: '#1f2937',
  input: '#111827',
  border: '#374151',
  text: '#f3f4f6',
  text2: '#d1d5db',
  primary: '#2563eb',
  add: '#16a34a',
  del: '#ef4444',
  success: '#34d399',
  error: '#f87171',
  status: {
    draft: { color: '#6b7280', label: 'Rascunho' },
    sent: { color: '#2563eb', label: 'Enviado' },
    in_review: { color: '#d97706', label: 'Em revisão' },
    revision_requested: { color: '#dc2626', label: 'Revisão solicitada' },
    approved: { color: '#16a34a', label: 'Aprovado ✓' }
  }
};

let albums = [];
let sessions = [];
let currentAlbum = null;

export async function renderAlbunsProva(container) {
  const tabEl = container;
  tabEl.innerHTML = '';
  tabEl.style.background = palette.bg;
  tabEl.style.minHeight = '100vh';
  renderHeader(tabEl);
  await loadAlbums(tabEl);
}

function renderHeader(tabEl) {
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.margin = '32px 0 24px 0';

  const title = document.createElement('h2');
  title.textContent = 'Prova de Álbuns';
  title.style.color = palette.text;
  title.style.fontSize = '2rem';
  title.style.fontWeight = 'bold';

  const btn = document.createElement('button');
  btn.textContent = '+ Novo Álbum';
  btn.style.background = palette.add;
  btn.style.color = palette.text;
  btn.style.border = 'none';
  btn.style.padding = '10px 20px';
  btn.style.borderRadius = '6px';
  btn.style.fontWeight = 'bold';
  btn.style.cursor = 'pointer';
  btn.onclick = () => openNovoAlbumModal(tabEl);

  header.appendChild(title);
  header.appendChild(btn);
  tabEl.appendChild(header);
}

async function loadAlbums(tabEl) {
  const res = await apiGet('/api/albums?status=');
  albums = res.albums || [];
  renderAlbumsList(tabEl);
}

function renderAlbumsList(tabEl) {
  // Limpa cards antigos
  let list = tabEl.querySelector('.albuns-prova-list');
  if (list) list.remove();
  list = document.createElement('div');
  list.className = 'albuns-prova-list';
  list.style.display = 'flex';
  list.style.flexWrap = 'wrap';
  list.style.gap = '24px';
  list.style.margin = '0 0 32px 0';

  for (const album of albums) {
    list.appendChild(renderAlbumCard(album, tabEl));
  }
  tabEl.appendChild(list);
}

function renderAlbumCard(album, tabEl) {
  const card = document.createElement('div');
  card.style.background = palette.card;
  card.style.border = `1px solid ${palette.border}`;
  card.style.borderRadius = '10px';
  card.style.padding = '20px';
  card.style.width = '320px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '10px';

  const name = document.createElement('div');
  name.textContent = album.name;
  name.style.color = palette.text;
  name.style.fontWeight = 'bold';
  name.style.fontSize = '1.2rem';

  const version = document.createElement('div');
  version.textContent = `Versão: ${album.version || 1}`;
  version.style.color = palette.text2;
  version.style.fontSize = '0.95rem';

  const status = document.createElement('span');
  const st = palette.status[album.status] || { color: '#6b7280', label: album.status };
  status.textContent = st.label;
  status.style.background = st.color;
  status.style.color = '#fff';
  status.style.padding = '2px 10px';
  status.style.borderRadius = '6px';
  status.style.fontSize = '0.95rem';
  status.style.alignSelf = 'flex-start';

  const total = document.createElement('div');
  total.textContent = `Páginas: ${album.pages?.length || 0}`;
  total.style.color = palette.text2;
  total.style.fontSize = '0.95rem';

  // Botões
  const btns = document.createElement('div');
  btns.style.display = 'flex';
  btns.style.gap = '8px';
  btns.style.marginTop = '10px';

  const btnEdit = document.createElement('button');
  btnEdit.textContent = 'Editar';
  btnEdit.style.background = palette.input;
  btnEdit.style.color = palette.text2;
  btnEdit.style.border = `1px solid ${palette.border}`;
  btnEdit.style.padding = '6px 12px';
  btnEdit.style.borderRadius = '5px';
  btnEdit.style.cursor = 'pointer';
  btnEdit.onclick = () => openEditor(album, tabEl);

  const btnSend = document.createElement('button');
  btnSend.textContent = 'Enviar para Cliente';
  btnSend.style.background = palette.primary;
  btnSend.style.color = '#fff';
  btnSend.style.border = 'none';
  btnSend.style.padding = '6px 12px';
  btnSend.style.borderRadius = '5px';
  btnSend.style.cursor = 'pointer';
  btnSend.onclick = async () => {
    if (confirm('Enviar álbum para aprovação do cliente?')) {
      await apiPost(`/api/albums/${album._id}/send`);
      const url = `${window.location.origin}/album/?code=${album.accessCode}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        alert(`Álbum enviado! Link copiado: ${url}`);
      }
      await loadAlbums(tabEl);
    }
  };

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Excluir';
  btnDel.style.background = 'none';
  btnDel.style.color = palette.del;
  btnDel.style.border = 'none';
  btnDel.style.padding = '6px 12px';
  btnDel.style.cursor = 'pointer';
  btnDel.onclick = async () => {
    if (confirm('Excluir este álbum?')) {
      await apiDelete(`/api/albums/${album._id}`);
      await loadAlbums(tabEl);
    }
  };

  btns.append(btnEdit, btnSend, btnDel);
  card.append(name, version, status, total, btns);
  return card;
}

// --- Modais ---
async function openNovoAlbumModal(tabEl) {
  if (!sessions.length) {
    const res = await apiGet('/api/sessions');
    sessions = res.sessions || [];
  }
  showAlbumModal({ tabEl, isNew: true });
}

function showAlbumModal({ tabEl, album = {}, isNew }) {
  // Remove modal antigo
  let modal = document.getElementById('albuns-prova-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'albuns-prova-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const box = document.createElement('div');
  box.style.background = palette.card;
  box.style.padding = '32px';
  box.style.borderRadius = '12px';
  box.style.minWidth = '340px';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '18px';
  box.style.border = `1px solid ${palette.border}`;

  const title = document.createElement('h3');
  title.textContent = isNew ? 'Novo Álbum' : 'Editar Álbum';
  title.style.color = palette.text;
  title.style.fontSize = '1.3rem';
  title.style.marginBottom = '8px';

  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.placeholder = 'Nome do cliente/álbum';
  inputNome.value = album.name || '';
  inputNome.style.background = palette.input;
  inputNome.style.color = palette.text;
  inputNome.style.border = `1px solid ${palette.border}`;
  inputNome.style.padding = '8px';
  inputNome.style.borderRadius = '6px';
  inputNome.required = true;

  const select = document.createElement('select');
  select.style.background = palette.input;
  select.style.color = palette.text2;
  select.style.border = `1px solid ${palette.border}`;
  select.style.padding = '8px';
  select.style.borderRadius = '6px';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Selecione a Sessão de Fotos';
  select.appendChild(opt0);
  for (const s of sessions) {
    const opt = document.createElement('option');
    opt.value = s._id;
    opt.textContent = `${s.name} - ${new Date(s.date).toLocaleDateString()}`;
    if (album.sessionId && s._id === album.sessionId._id) opt.selected = true;
    select.appendChild(opt);
  }

  const btnSalvar = document.createElement('button');
  btnSalvar.textContent = isNew ? 'Criar Álbum' : 'Salvar';
  btnSalvar.style.background = palette.primary;
  btnSalvar.style.color = '#fff';
  btnSalvar.style.border = 'none';
  btnSalvar.style.padding = '10px 0';
  btnSalvar.style.borderRadius = '6px';
  btnSalvar.style.fontWeight = 'bold';
  btnSalvar.style.cursor = 'pointer';
  btnSalvar.onclick = async () => {
    if (!inputNome.value.trim()) {
      inputNome.style.border = `2px solid ${palette.error}`;
      return;
    }
    if (isNew) {
      const res = await apiPost('/api/albums', {
        name: inputNome.value,
        welcomeText: textarea.value,
        clientId: select.value || null
      });
      if (res.album && res.album.accessCode) {
        showAccessCode(res.album.accessCode, modal);
      }
      await loadAlbums(tabEl);
    } else {
      await apiPut(`/api/albums/${album._id}`, {
        name: inputNome.value,
        welcomeText: textarea.value,
        clientId: select.value || null
      });
      await loadAlbums(tabEl);
    }
    modal.remove();
  };

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancelar';
  btnCancel.style.background = 'none';
  btnCancel.style.color = palette.text2;
  btnCancel.style.border = 'none';
  btnCancel.style.padding = '10px 0';
  btnCancel.style.cursor = 'pointer';
  btnCancel.onclick = () => modal.remove();

  box.append(title, inputNome, textarea, select, btnSalvar, btnCancel);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function showAccessCode(code, modal) {
  const codeBox = document.createElement('div');
  codeBox.textContent = `Código de acesso: ${code}`;
  codeBox.style.background = palette.input;
  codeBox.style.color = palette.primary;
  codeBox.style.fontWeight = 'bold';
  codeBox.style.fontSize = '1.2rem';
  codeBox.style.padding = '16px';
  codeBox.style.margin = '18px 0 0 0';
  codeBox.style.borderRadius = '8px';
  codeBox.style.textAlign = 'center';
  modal.querySelector('div').appendChild(codeBox);
}

// --- Modal Lâminas ---
function openLaminasModal(album, tabEl) {
  // Remove modal antigo
  let modal = document.getElementById('albuns-prova-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'albuns-prova-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.7)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  const box = document.createElement('div');
  box.style.background = palette.card;
  box.style.padding = '32px';
  box.style.borderRadius = '12px';
  box.style.minWidth = '600px';
  box.style.maxWidth = '90vw';
  box.style.maxHeight = '90vh';
  box.style.overflowY = 'auto';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '18px';
  box.style.border = `1px solid ${palette.border}`;

  const title = document.createElement('h3');
  title.textContent = `Lâminas do Álbum: ${album.name}`;
  title.style.color = palette.text;
  title.style.fontSize = '1.2rem';
  title.style.marginBottom = '8px';

  // Grid de lâminas
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '18px';

  for (const [i, sheet] of (album.sheets || []).entries()) {
    grid.appendChild(renderSheetCard(sheet, i, album, tabEl, modal));
  }

  // Upload múltiplo
  const uploadLabel = document.createElement('label');
  uploadLabel.textContent = '+ Upload Lâminas';
  uploadLabel.style.background = palette.add;
  uploadLabel.style.color = '#fff';
  uploadLabel.style.padding = '8px 16px';
  uploadLabel.style.borderRadius = '6px';
  uploadLabel.style.cursor = 'pointer';
  uploadLabel.style.fontWeight = 'bold';
  uploadLabel.style.marginTop = '10px';
  uploadLabel.style.display = 'inline-block';

  const uploadInput = document.createElement('input');
  uploadInput.type = 'file';
  uploadInput.accept = 'image/*';
  uploadInput.multiple = true;
  uploadInput.style.display = 'none';
  uploadInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const form = new FormData();
    for (const f of files) form.append('sheets', f);
    await apiPost(`/api/albums/${album._id}/sheets`, form, true);
    modal.remove();
    await loadAlbums(tabEl);
  };
  uploadLabel.appendChild(uploadInput);

  // Copiar link do cliente
  const btnCopy = document.createElement('button');
  btnCopy.textContent = 'Copiar Link do Cliente';
  btnCopy.style.background = palette.input;
  btnCopy.style.color = palette.primary;
  btnCopy.style.border = `1px solid ${palette.primary}`;
  btnCopy.style.padding = '8px 16px';
  btnCopy.style.borderRadius = '6px';
  btnCopy.style.cursor = 'pointer';
  btnCopy.style.fontWeight = 'bold';
  btnCopy.onclick = () => {
    const url = `${window.location.origin}/album/?code=${album.accessCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      copyToClipboard(url);
    }
    btnCopy.textContent = 'Link copiado!';
    setTimeout(() => (btnCopy.textContent = 'Copiar Link do Cliente'), 1500);
  };

  // Enviar para cliente
  const btnSend = document.createElement('button');
  btnSend.textContent = 'Enviar para Cliente';
  btnSend.style.background = palette.primary;
  btnSend.style.color = '#fff';
  btnSend.style.border = 'none';
  btnSend.style.padding = '8px 16px';
  btnSend.style.borderRadius = '6px';
  btnSend.style.cursor = 'pointer';
  btnSend.style.fontWeight = 'bold';
  btnSend.onclick = async () => {
    await apiPost(`/api/albums/${album._id}/send`);
    modal.remove();
    await loadAlbums(tabEl);
  };

  const btnClose = document.createElement('button');
  btnClose.textContent = 'Fechar';
  btnClose.style.background = 'none';
  btnClose.style.color = palette.text2;
  btnClose.style.border = 'none';
  btnClose.style.padding = '8px 0';
  btnClose.style.cursor = 'pointer';
  btnClose.onclick = () => modal.remove();

  box.append(title, grid, uploadLabel, btnCopy, btnSend, btnClose);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

function renderSheetCard(sheet, idx, album, tabEl, modal) {
  const card = document.createElement('div');
  card.style.background = palette.input;
  card.style.border = `1px solid ${palette.border}`;
  card.style.borderRadius = '8px';
  card.style.padding = '10px';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.alignItems = 'center';
  card.style.gap = '8px';

  const img = document.createElement('img');
  img.src = sheet.url;
  img.alt = `Lâmina ${idx + 1}`;
  img.style.maxWidth = '100%';
  img.style.maxHeight = '120px';
  img.style.borderRadius = '6px';
  img.style.marginBottom = '6px';

  const badge = document.createElement('span');
  let st = palette.status[sheet.status] || { color: '#888', label: sheet.status };
  badge.textContent = st.label;
  badge.style.background = st.color;
  badge.style.color = '#fff';
  badge.style.padding = '2px 10px';
  badge.style.borderRadius = '6px';
  badge.style.fontSize = '0.95rem';

  const num = document.createElement('div');
  num.textContent = `#${idx + 1}`;
  num.style.color = palette.text2;
  num.style.fontSize = '0.95rem';

  const btnDel = document.createElement('button');
  btnDel.textContent = 'Deletar';
  btnDel.style.background = 'none';
  btnDel.style.color = palette.del;
  btnDel.style.border = 'none';
  btnDel.style.padding = '4px 0';
  btnDel.style.cursor = 'pointer';
  btnDel.onclick = async () => {
    if (confirm('Deletar esta lâmina?')) {
      await apiDelete(`/api/albums/${album._id}/sheets/${sheet._id}`);
      modal.remove();
      await loadAlbums(tabEl);
    }
  };

  card.append(img, badge, num, btnDel);
  return card;
}
