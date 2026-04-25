// admin/js/tabs/albuns-prova.js
// Aba Prova de Álbuns — ES Module
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api.js';

const pal = {
  bg: 'var(--bg-base)',
  card: 'var(--bg-surface)',
  input: 'var(--bg-elevated)',
  border: 'var(--border)',
  text: 'var(--text-primary)',
  text2: 'var(--text-secondary)',
  text3: 'var(--text-muted)',
  primary: 'var(--accent)',
  add: 'var(--green)',
  del: 'var(--red)',
  warn: 'var(--yellow)',
  success: '#34d399',
  error: 'var(--red)',
};

const STATUS = {
  draft:              { color: '#6b7280', label: 'Rascunho' },
  sent:               { color: '#2563eb', label: 'Enviado' },
  revision_requested: { color: '#dc2626', label: 'Revisão solicitada' },
  approved:           { color: '#16a34a', label: 'Aprovado ✓' },
};

const PAGE_STATUS = {
  awaiting_review:    { color: '#6b7280', label: 'Aguardando' },
  approved:           { color: '#16a34a', label: 'Aprovada ✓' },
  revision_requested: { color: '#dc2626', label: 'Revisão' },
};

let albums = [];
let sessions = [];

export async function renderAlbunsProva(container) {
  container.style.background = pal.bg;
  container.style.minHeight = '100vh';
  container.innerHTML = '';
  renderHeader(container);
  await loadAlbums(container);
}

// ─── Header ────────────────────────────────────────────────────────────────

function renderHeader(container) {
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin:32px 0 24px 0;';

  const title = document.createElement('h2');
  title.textContent = 'Prova de Álbuns';
  title.style.cssText = `color:${pal.text};font-size:2rem;font-weight:bold;margin:0;`;

  const btn = document.createElement('button');
  btn.textContent = '+ Novo Álbum';
  btn.style.cssText = `background:${pal.add};color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer;`;
  btn.onclick = () => openNovoAlbumModal(container);

  header.append(title, btn);
  container.appendChild(header);
}

// ─── Carga e lista ─────────────────────────────────────────────────────────

async function loadAlbums(container) {
  try {
    const res = await apiGet('/api/albums');
    albums = res.albums || [];
  } catch (e) {
    albums = [];
  }
  renderAlbumsList(container);
}

function renderAlbumsList(container) {
  let list = container.querySelector('.albuns-list');
  if (list) list.remove();

  list = document.createElement('div');
  list.className = 'albuns-list';
  list.style.cssText = 'display:flex;flex-wrap:wrap;gap:24px;margin:0 0 32px 0;';

  if (!albums.length) {
    const empty = document.createElement('div');
    empty.style.cssText = `color:${pal.text3};font-size:1rem;padding:32px 0;`;
    empty.textContent = 'Nenhum álbum criado ainda. Clique em "+ Novo Álbum" para começar.';
    list.appendChild(empty);
  }

  for (const album of albums) {
    list.appendChild(renderAlbumCard(album, container));
  }
  container.appendChild(list);
}

function renderAlbumCard(album, container) {
  const card = document.createElement('div');
  card.style.cssText = `background:${pal.card};border:1px solid ${pal.border};border-radius:10px;padding:20px;width:320px;display:flex;flex-direction:column;gap:10px;`;

  const name = document.createElement('div');
  name.textContent = album.name;
  name.style.cssText = `color:${pal.text};font-weight:bold;font-size:1.15rem;`;

  const meta = document.createElement('div');
  meta.style.cssText = `color:${pal.text3};font-size:0.875rem;`;
  const session = album.sessionId;
  meta.textContent = session
    ? `Sessão: ${session.name} · ${session.date ? new Date(session.date).toLocaleDateString('pt-BR') : ''}`
    : 'Sem sessão vinculada';

  const st = STATUS[album.status] || { color: '#6b7280', label: album.status };
  const badge = document.createElement('span');
  badge.textContent = st.label;
  badge.style.cssText = `background:${st.color};color:#fff;padding:2px 10px;border-radius:6px;font-size:0.875rem;align-self:flex-start;`;

  const pages = document.createElement('div');
  pages.textContent = `${album.pages?.length || 0} página(s)`;
  pages.style.cssText = `color:${pal.text2};font-size:0.9rem;`;

  // Revisões pendentes
  const revPending = (album.pages || []).filter(p => p.status === 'revision_requested').length;
  if (revPending) {
    const rev = document.createElement('div');
    rev.textContent = `⚠️ ${revPending} página(s) com revisão solicitada`;
    rev.style.cssText = `color:${pal.warn};font-size:0.875rem;font-weight:600;`;
    card.append(name, meta, badge, pages, rev);
  } else {
    card.append(name, meta, badge, pages);
  }

  // Botões
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;';

  const btnEdit = makeBtn('Editar Páginas', pal.input, pal.text2, pal.border);
  btnEdit.onclick = () => openPagesEditor(album, container);

  const btnCopy = makeBtn('Copiar Link', pal.input, pal.primary, pal.primary);
  btnCopy.onclick = () => {
    const url = `${window.location.origin}/album/?code=${album.accessCode}`;
    navigator.clipboard?.writeText(url) || fallbackCopy(url);
    btnCopy.textContent = 'Copiado!';
    setTimeout(() => (btnCopy.textContent = 'Copiar Link'), 1500);
  };

  const btnSend = makeBtn('Enviar', pal.primary, '#fff', 'none');
  btnSend.disabled = album.status === 'approved';
  btnSend.onclick = async () => {
    if (album.pages?.length === 0) {
      window.showToast?.('Adicione pelo menos uma página antes de enviar.', 'warning');
      return;
    }
    if (!confirm('Enviar álbum para aprovação do cliente?')) return;
    await apiPost(`/api/albums/${album._id}/send`);
    await loadAlbums(container);
  };

  // Reabrir revisão
  if (album.status === 'revision_requested') {
    const btnReopen = makeBtn('Reabrir', pal.warn, '#fff', 'none');
    btnReopen.onclick = async () => {
      await apiPut(`/api/albums/${album._id}`, { status: 'sent' });
      await loadAlbums(container);
    };
    btns.append(btnEdit, btnCopy, btnSend, btnReopen);
  } else {
    btns.append(btnEdit, btnCopy, btnSend);
  }

  const btnDel = makeBtn('Excluir', 'none', pal.del, 'none');
  btnDel.onclick = async () => {
    if (!confirm(`Excluir o álbum "${album.name}"?`)) return;
    await apiDelete(`/api/albums/${album._id}`);
    await loadAlbums(container);
  };
  btns.appendChild(btnDel);

  card.appendChild(btns);
  return card;
}

// ─── Modal Novo Álbum ──────────────────────────────────────────────────────

async function openNovoAlbumModal(container) {
  // Carregar sessões se ainda não carregadas
  if (!sessions.length) {
    try {
      const res = await apiGet('/api/sessions');
      sessions = res.sessions || [];
    } catch (e) { sessions = []; }
  }

  const modal = createModal();
  const box = modal.querySelector('.modal-box');

  addModalTitle(box, 'Novo Álbum');

  const inputNome = addInput(box, 'Nome do álbum / cliente', 'text');
  const inputWelcome = addTextarea(box, 'Mensagem de boas-vindas (opcional)');

  // Select de sessão (opcional)
  const labelSessao = document.createElement('label');
  labelSessao.textContent = 'Sessão de fotos (opcional)';
  labelSessao.style.cssText = `font-size:0.875rem;color:${pal.text2};display:block;margin-bottom:4px;`;

  const select = document.createElement('select');
  select.className = 'select';
  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Sem sessão vinculada';
  select.appendChild(opt0);
  for (const s of sessions) {
    const opt = document.createElement('option');
    opt.value = s._id;
    opt.textContent = `${s.name} — ${s.date ? new Date(s.date).toLocaleDateString('pt-BR') : 'sem data'}`;
    select.appendChild(opt);
  }
  box.append(labelSessao, select);

  addModalButtons(box, {
    save: async () => {
      const nome = inputNome.value.trim();
      if (!nome) {
        inputNome.style.border = `2px solid ${pal.del}`;
        return;
      }
      const res = await apiPost('/api/albums', {
        name: nome,
        welcomeText: inputWelcome.value,
        sessionId: select.value || undefined,
      });
      if (res.success && res.album) {
        // Mostrar código de acesso gerado
        showAccessCode(box, res.album.accessCode);
        await loadAlbums(container);
      }
    },
    saveLabel: 'Criar Álbum',
    cancel: () => modal.remove(),
  });

  document.body.appendChild(modal);
  inputNome.focus();
}

function showAccessCode(box, code) {
  const codeBox = document.createElement('div');
  codeBox.style.cssText = `background:${pal.input};border:1px solid ${pal.border};border-radius:8px;padding:16px;text-align:center;margin-top:8px;`;
  codeBox.innerHTML = `<div style="color:${pal.text3};font-size:0.8rem;margin-bottom:6px;">Código de acesso do cliente:</div>
    <div style="color:${pal.primary};font-size:1.5rem;font-weight:bold;letter-spacing:4px;">${code}</div>`;
  box.insertBefore(codeBox, box.querySelector('.modal-btns'));
}

// ─── Editor de Páginas ─────────────────────────────────────────────────────

async function openPagesEditor(album, container) {
  // Buscar álbum completo (com pages populadas)
  let fullAlbum = album;
  try {
    const res = await apiGet(`/api/albums/${album._id}`);
    if (res.success) fullAlbum = res.album;
  } catch (e) {}

  // Buscar fotos da sessão vinculada
  let sessionPhotos = [];
  if (fullAlbum.sessionId) {
    const sid = fullAlbum.sessionId._id || fullAlbum.sessionId;
    try {
      const res = await apiGet(`/api/sessions/${sid}`);
      sessionPhotos = res.session?.photos || [];
    } catch (e) {}
  }

  const modal = createModal(true); // wide
  const box = modal.querySelector('.modal-box');

  addModalTitle(box, `Editar Páginas: ${fullAlbum.name}`);

  // Status badge
  const st = STATUS[fullAlbum.status] || { color: '#6b7280', label: fullAlbum.status };
  const badge = document.createElement('span');
  badge.textContent = st.label;
  badge.style.cssText = `background:${st.color};color:#fff;padding:2px 10px;border-radius:6px;font-size:0.875rem;display:inline-block;margin-bottom:8px;`;
  box.appendChild(badge);

  // Link do cliente
  const linkRow = document.createElement('div');
  linkRow.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:12px;';
  const linkInput = document.createElement('input');
  linkInput.readOnly = true;
  linkInput.value = `${window.location.origin}/album/?code=${fullAlbum.accessCode}`;
  linkInput.className = 'input';
  const btnCopyLink = makeBtn('Copiar Link', pal.input, pal.primary, pal.primary);
  btnCopyLink.style.fontSize = '0.8rem';
  btnCopyLink.onclick = () => {
    navigator.clipboard?.writeText(linkInput.value);
    btnCopyLink.textContent = 'Copiado!';
    setTimeout(() => (btnCopyLink.textContent = 'Copiar Link'), 1500);
  };
  linkRow.append(linkInput, btnCopyLink);
  box.appendChild(linkRow);

  // Seção: Fotos da sessão disponíveis
  if (sessionPhotos.length) {
    const secTitle = document.createElement('div');
    secTitle.textContent = 'Fotos da sessão (clique para adicionar ao álbum):';
    secTitle.style.cssText = `color:${pal.text2};font-size:0.875rem;font-weight:600;margin-bottom:8px;`;
    box.appendChild(secTitle);

    const photosGrid = document.createElement('div');
    photosGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;margin-bottom:16px;max-height:180px;overflow-y:auto;';

    for (const photo of sessionPhotos) {
      const thumb = document.createElement('div');
      thumb.style.cssText = 'position:relative;cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid transparent;transition:border-color 0.2s;';
      thumb.title = 'Clique para adicionar como página';

      const img = document.createElement('img');
      img.src = photo.url;
      img.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;display:block;pointer-events:none;';

      thumb.appendChild(img);

      thumb.onmouseenter = () => { thumb.style.borderColor = pal.primary; };
      thumb.onmouseleave = () => { thumb.style.borderColor = 'transparent'; };

      thumb.onclick = async () => {
        // Adicionar como nova página no álbum
        const newPage = {
          pageNumber: (fullAlbum.pages?.length || 0) + 1,
          layoutType: 'single',
          status: 'awaiting_review',
          comments: [],
          photos: [{
            photoId: photo._id || photo.id,
            photoUrl: photo.url,
            position: 0,
            posX: 50,
            posY: 50,
            scale: 1,
          }],
        };
        const updatedPages = [...(fullAlbum.pages || []), newPage];
        const res = await apiPut(`/api/albums/${fullAlbum._id}`, { pages: updatedPages });
        if (res.success) {
          fullAlbum.pages = res.album.pages;
          renderPagesSection();
        }
      };

      photosGrid.appendChild(thumb);
    }
    box.appendChild(photosGrid);
  } else if (fullAlbum.sessionId) {
    const noPhotos = document.createElement('div');
    noPhotos.style.cssText = `color:${pal.text3};font-size:0.875rem;margin-bottom:16px;`;
    noPhotos.textContent = 'Nenhuma foto encontrada na sessão vinculada.';
    box.appendChild(noPhotos);
  } else {
    const noSession = document.createElement('div');
    noSession.style.cssText = `color:${pal.text3};font-size:0.875rem;margin-bottom:16px;padding:12px;border:1px solid ${pal.border};border-radius:6px;`;
    noSession.textContent = '💡 Este álbum não tem sessão vinculada. Edite o álbum e vincule a uma sessão para poder adicionar fotos às páginas.';
    box.appendChild(noSession);
  }

  // Seção: Páginas do álbum
  const pagesSection = document.createElement('div');
  pagesSection.id = 'pages-section';
  box.appendChild(pagesSection);

  function renderPagesSection() {
    pagesSection.innerHTML = '';
    const secTitle = document.createElement('div');
    secTitle.textContent = `Páginas do álbum (${fullAlbum.pages?.length || 0}):`;
    secTitle.style.cssText = `color:${pal.text2};font-size:0.875rem;font-weight:600;margin-bottom:8px;`;
    pagesSection.appendChild(secTitle);

    if (!fullAlbum.pages?.length) {
      const empty = document.createElement('div');
      empty.style.cssText = `color:${pal.text3};font-size:0.875rem;padding:12px;text-align:center;border:1px dashed ${pal.border};border-radius:6px;`;
      empty.textContent = 'Nenhuma página ainda. Clique nas fotos acima para adicioná-las.';
      pagesSection.appendChild(empty);
      return;
    }

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;';

    for (let i = 0; i < fullAlbum.pages.length; i++) {
      const page = fullAlbum.pages[i];
      const pst = PAGE_STATUS[page.status] || { color: '#888', label: page.status };

      const card = document.createElement('div');
      card.style.cssText = `background:${pal.input};border:1px solid ${pst.color};border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px;`;

      const firstPhoto = page.photos?.[0];
      if (firstPhoto?.photoUrl) {
        const img = document.createElement('img');
        img.src = firstPhoto.photoUrl;
        img.style.cssText = 'width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:4px;';
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `width:100%;aspect-ratio:3/4;background:${pal.border};border-radius:4px;display:flex;align-items:center;justify-content:center;color:${pal.text3};font-size:0.7rem;`;
        placeholder.textContent = 'Sem foto';
        card.appendChild(placeholder);
      }

      const num = document.createElement('div');
      num.style.cssText = `color:${pal.text3};font-size:0.75rem;`;
      num.textContent = `Página ${i + 1}`;
      card.appendChild(num);

      const stBadge = document.createElement('span');
      stBadge.textContent = pst.label;
      stBadge.style.cssText = `background:${pst.color};color:#fff;padding:1px 8px;border-radius:4px;font-size:0.7rem;align-self:flex-start;`;
      card.appendChild(stBadge);

      // Comentários de revisão
      if (page.comments?.length) {
        const lastComment = page.comments[page.comments.length - 1];
        const comment = document.createElement('div');
        comment.style.cssText = `color:${pal.warn};font-size:0.7rem;border-left:2px solid ${pal.warn};padding-left:6px;`;
        comment.textContent = `"${lastComment.text}"`;
        card.appendChild(comment);
      }

      // Botão remover página
      const btnRemove = document.createElement('button');
      btnRemove.textContent = 'Remover';
      btnRemove.style.cssText = `background:none;color:${pal.del};border:none;font-size:0.75rem;cursor:pointer;padding:0;text-align:left;`;
      btnRemove.onclick = async () => {
        const updatedPages = fullAlbum.pages.filter((_, idx) => idx !== i);
        // Renumerar
        updatedPages.forEach((p, idx) => { p.pageNumber = idx + 1; });
        const res = await apiPut(`/api/albums/${fullAlbum._id}`, { pages: updatedPages });
        if (res.success) {
          fullAlbum.pages = res.album.pages;
          renderPagesSection();
        }
      };
      card.appendChild(btnRemove);
      grid.appendChild(card);
    }
    pagesSection.appendChild(grid);
  }

  renderPagesSection();

  // Botões finais
  const footer = document.createElement('div');
  footer.className = 'modal-btns';
  footer.style.cssText = 'display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;';

  const btnSend = makeBtn('Enviar para Cliente', pal.primary, '#fff', 'none');
  btnSend.onclick = async () => {
    if (!fullAlbum.pages?.length) {
      window.showToast?.('Adicione pelo menos uma página antes de enviar.', 'warning');
      return;
    }
    if (!confirm('Enviar álbum para aprovação do cliente?')) return;
    await apiPost(`/api/albums/${fullAlbum._id}/send`);
    modal.remove();
    await loadAlbums(container);
  };

  const btnClose = makeBtn('Fechar', 'none', pal.text2, 'none');
  btnClose.onclick = () => {
    modal.remove();
    loadAlbums(container);
  };

  footer.append(btnSend, btnClose);
  box.appendChild(footer);
  document.body.appendChild(modal);
}

// ─── Helpers de UI ─────────────────────────────────────────────────────────

function createModal(wide = false) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:9999;';

  const box = document.createElement('div');
  box.className = 'modal-box';
  box.style.cssText = `background:${pal.card};padding:32px;border-radius:12px;${wide ? 'min-width:660px;max-width:90vw;' : 'min-width:360px;max-width:480px;'}max-height:90vh;overflow-y:auto;display:flex;flex-direction:column;gap:14px;border:1px solid ${pal.border};`;

  modal.appendChild(box);
  return modal;
}

function addModalTitle(box, text) {
  const title = document.createElement('h3');
  title.textContent = text;
  title.style.cssText = `color:${pal.text};font-size:1.25rem;margin:0 0 4px 0;`;
  box.appendChild(title);
}

function addInput(box, placeholder, type = 'text') {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.className = 'input';
  box.appendChild(input);
  return input;
}

function addTextarea(box, placeholder) {
  const ta = document.createElement('textarea');
  ta.placeholder = placeholder;
  ta.rows = 3;
  ta.className = 'input';
  box.appendChild(ta);
  return ta;
}

function addModalButtons(box, { save, saveLabel = 'Salvar', cancel }) {
  const row = document.createElement('div');
  row.className = 'modal-btns';
  row.style.cssText = 'display:flex;gap:10px;margin-top:6px;';

  const btnSave = makeBtn(saveLabel, pal.primary, '#fff', 'none');
  btnSave.style.fontWeight = 'bold';
  btnSave.onclick = save;

  const btnCancel = makeBtn('Cancelar', 'none', pal.text2, 'none');
  btnCancel.onclick = cancel;

  row.append(btnSave, btnCancel);
  box.appendChild(row);
}

function makeBtn(text, bg, color, border) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.cssText = `background:${bg};color:${color};border:1px solid ${border};padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.875rem;`;
  return btn;
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
}
