// album/js/viewer.js — Visualizador de Prova de Álbum

const state = {
  accessCode: null,
  albumId: null,
  album: null,
  sheets: [],
  currentIndex: 0,
  pollingInterval: null
};

const main = document.getElementById('main-container');
const albumTitle = document.getElementById('album-title');
const logo = document.getElementById('logo');

function renderLogin(error = '') {
  main.innerHTML = '';
  const title = document.createElement('h2');
  title.textContent = 'Digite o código de acesso';
  title.style.fontFamily = 'Playfair Display, serif';
  title.style.fontWeight = '700';
  title.style.fontSize = '1.3rem';
  title.style.marginBottom = '18px';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.placeholder = 'Código de acesso';
  input.autofocus = true;
  input.maxLength = 12;
  input.style.textTransform = 'uppercase';

  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = 'Entrar';
  btn.onclick = async () => {
    await tryLogin(input.value.trim().toUpperCase());
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.onclick();
  });

  if (error) {
    const err = document.createElement('div');
    err.className = 'error';
    err.textContent = error;
    main.appendChild(err);
  }
  main.append(title, input, btn);
}

async function tryLogin(code) {
  if (!code) return renderLogin('Informe o código.');
  try {
    const res = await fetch('/api/client/album/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: code })
    }).then(r => r.json());
    if (!res.success) return renderLogin(res.error || 'Código inválido.');
    state.accessCode = code;
    state.albumId = res.albumId;
    await loadAlbum();
  } catch (e) {
    renderLogin('Erro de conexão.');
  }
}

async function loadAlbum() {
  try {
    const res = await fetch(`/api/client/album/${state.albumId}?code=${state.accessCode}`).then(r => r.json());
    if (!res.success) return renderLogin('Acesso negado.');
    state.album = res.album;
    state.sheets = res.album.sheets || [];
    state.currentIndex = 0;
    albumTitle.textContent = state.album.name;
    renderAlbum();
    startPolling();
  } catch (e) {
    renderLogin('Erro ao carregar álbum.');
  }
}

function renderAlbum() {
  main.innerHTML = '';
  // Header
  const header = document.createElement('div');
  header.style.marginBottom = '18px';
  header.style.display = 'flex';
  header.style.flexDirection = 'column';
  header.style.alignItems = 'center';

  const name = document.createElement('div');
  name.textContent = state.album.name;
  name.style.fontFamily = 'Playfair Display, serif';
  name.style.fontWeight = '700';
  name.style.fontSize = '1.2rem';
  header.appendChild(name);

  // Progresso
  const aprovadas = state.sheets.filter(s => s.status === 'approved').length;
  const total = state.sheets.length;
  const progress = document.createElement('div');
  progress.textContent = `${aprovadas} de ${total} lâminas aprovadas`;
  progress.style.margin = '8px 0 0 0';
  header.appendChild(progress);

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  const barInner = document.createElement('div');
  barInner.className = 'progress-bar-inner';
  barInner.style.width = total ? `${(aprovadas / total) * 100}%` : '0%';
  bar.appendChild(barInner);
  header.appendChild(bar);

  main.appendChild(header);

  // Carrossel
  if (!state.sheets.length) {
    const empty = document.createElement('div');
    empty.textContent = 'Nenhuma lâmina enviada.';
    empty.style.textAlign = 'center';
    main.appendChild(empty);
    return;
  }
  renderCarousel();
}

function renderCarousel() {
  // ...remove antigo
  let old = document.getElementById('carousel');
  if (old) old.remove();
  const carousel = document.createElement('div');
  carousel.id = 'carousel';
  carousel.className = 'carousel';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'carousel-btn';
  btnPrev.innerHTML = '⟨';
  btnPrev.onclick = prevSheet;

  const img = document.createElement('img');
  img.className = 'carousel-img';
  img.src = state.sheets[state.currentIndex].url;
  img.alt = `Lâmina ${state.currentIndex + 1}`;
  img.draggable = false;
  img.oncontextmenu = () => false;
  img.style.pointerEvents = 'none';
  img.style.userSelect = 'none';

  const btnNext = document.createElement('button');
  btnNext.className = 'carousel-btn';
  btnNext.innerHTML = '⟩';
  btnNext.onclick = nextSheet;

  carousel.append(btnPrev, img, btnNext);

  // Swipe no container (não na img, pois img tem pointer-events:none)
  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX, { passive: true });
  carousel.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextSheet() : prevSheet();
  });

  main.appendChild(carousel);

  // Contador
  const count = document.createElement('div');
  count.textContent = `Lâmina ${state.currentIndex + 1} de ${state.sheets.length}`;
  count.style.textAlign = 'center';
  main.appendChild(count);

  // Status da lâmina
  const status = document.createElement('div');
  status.className = 'sheet-status';
  status.textContent = statusLabel(state.sheets[state.currentIndex].status);
  main.appendChild(status);

  // Ações
  renderSheetActions();
}

function statusLabel(status) {
  switch (status) {
    case 'awaiting_review': return 'Aguardando revisão';
    case 'approved': return 'Aprovada ✓';
    case 'revision_requested': return 'Revisão solicitada';
    default: return status;
  }
}

function prevSheet() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderCarousel();
  }
}
function nextSheet() {
  if (state.currentIndex < state.sheets.length - 1) {
    state.currentIndex++;
    renderCarousel();
  }
}

function renderSheetActions() {
  // Remove antigo
  let old = document.getElementById('actions');
  if (old) old.remove();
  const actions = document.createElement('div');
  actions.id = 'actions';
  actions.className = 'actions';

  const sheet = state.sheets[state.currentIndex];
  if (sheet.status === 'approved') {
    const ok = document.createElement('div');
    ok.className = 'success';
    ok.textContent = 'Lâmina aprovada!';
    actions.appendChild(ok);
  } else if (sheet.status === 'revision_requested') {
    const rev = document.createElement('div');
    rev.className = 'error';
    rev.textContent = 'Revisão solicitada.';
    actions.appendChild(rev);
  } else {
    // Aprovar
    const btnApprove = document.createElement('button');
    btnApprove.className = 'btn btn-approve';
    btnApprove.textContent = '✓ Aprovar esta lâmina';
    btnApprove.onclick = async () => {
      await fetch(`/api/client/album/${state.albumId}/sheets/${sheet._id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      await loadAlbum();
    };
    actions.appendChild(btnApprove);
    // Pedir revisão
    const btnRev = document.createElement('button');
    btnRev.className = 'btn btn-revision';
    btnRev.textContent = '✎ Pedir revisão';
    btnRev.onclick = () => showCommentBox(sheet);
    actions.appendChild(btnRev);
  }
  main.appendChild(actions);
  renderApproveAllBtn();
}

function showCommentBox(sheet) {
  // Remove antigo
  let old = document.getElementById('comment-box');
  if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'comment-box';
  box.className = 'comment-box';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Descreva o que deseja revisar nesta lâmina...';

  const btnSend = document.createElement('button');
  btnSend.className = 'btn btn-revision';
  btnSend.textContent = 'Enviar revisão';
  btnSend.onclick = async () => {
    if (!textarea.value.trim()) {
      textarea.style.border = '2px solid #f87171';
      return;
    }
    await fetch(`/api/client/album/${state.albumId}/sheets/${sheet._id}/request-revision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: textarea.value })
    });
    await loadAlbum();
  };

  box.appendChild(textarea);
  box.appendChild(btnSend);
  main.appendChild(box);
}

function renderApproveAllBtn() {
  // Remove antigo
  let old = document.getElementById('approve-all');
  if (old) old.remove();
  const aprovadas = state.sheets.filter(s => s.status === 'approved').length;
  if (aprovadas === state.sheets.length && state.sheets.length > 0 && state.album.status !== 'approved') {
    const btn = document.createElement('button');
    btn.id = 'approve-all';
    btn.className = 'btn-approve-all';
    btn.textContent = 'Aprovar Álbum Completo';
    btn.onclick = async () => {
      await fetch(`/api/client/album/${state.albumId}/approve-all`, { method: 'POST' });
      await loadAlbum();
    };
    main.appendChild(btn);
  }
  // Mensagem de status
  if (state.album.status === 'approved') {
    const msg = document.createElement('div');
    msg.className = 'status-message';
    msg.textContent = 'Álbum Aprovado! Aguarde o fotógrafo.';
    main.appendChild(msg);
  } else if (state.album.status === 'revision_requested') {
    const msg = document.createElement('div');
    msg.className = 'status-message';
    msg.style.color = '#dc2626';
    msg.textContent = 'Revisão solicitada.';
    main.appendChild(msg);
  }
}

function startPolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);
  state.pollingInterval = setInterval(async () => {
    const res = await fetch(`/api/client/album/${state.albumId}?code=${state.accessCode}`).then(r => r.json());
    if (res.success && res.album.version !== state.album.version) {
      state.album = res.album;
      state.sheets = res.album.sheets || [];
      state.currentIndex = 0;
      renderAlbum();
    }
  }, 15000);
}

// Inicialização
renderLogin();
