// album/js/viewer.js — Visualizador de Prova de Álbum

const state = {
  accessCode: null,
  albumId: null,
  album: null,
  pages: [],
  currentIndex: 0,
  pollingInterval: null
};

const main = document.getElementById('main-container');
const albumTitle = document.getElementById('album-title');

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
    const res = await fetch('/api/client/album/verify-code', {
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
    state.pages = res.album.pages || [];
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

  // Mensagem de boas-vindas
  if (state.album.welcomeText) {
    const welcome = document.createElement('div');
    welcome.textContent = state.album.welcomeText;
    welcome.style.cssText = 'font-style:italic;color:#555;text-align:center;margin-bottom:12px;font-size:0.95rem;';
    main.appendChild(welcome);
  }

  // Header com progresso
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:18px;display:flex;flex-direction:column;align-items:center;';

  const name = document.createElement('div');
  name.textContent = state.album.name;
  name.style.fontFamily = 'Playfair Display, serif';
  name.style.fontWeight = '700';
  name.style.fontSize = '1.2rem';
  header.appendChild(name);

  const aprovadas = state.pages.filter(p => p.status === 'approved').length;
  const total = state.pages.length;
  const progress = document.createElement('div');
  progress.textContent = `${aprovadas} de ${total} página(s) aprovada(s)`;
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

  if (!state.pages.length) {
    const empty = document.createElement('div');
    empty.textContent = 'Nenhuma página disponível ainda. Aguarde o fotógrafo.';
    empty.style.textAlign = 'center';
    main.appendChild(empty);
    return;
  }

  renderCarousel();
}

function renderCarousel() {
  let old = document.getElementById('carousel');
  if (old) old.remove();

  const carousel = document.createElement('div');
  carousel.id = 'carousel';
  carousel.className = 'carousel';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'carousel-btn';
  btnPrev.innerHTML = '⟨';
  btnPrev.onclick = prevPage;

  const page = state.pages[state.currentIndex];
  const photoUrl = page.photos?.[0]?.photoUrl || '';

  const img = document.createElement('img');
  img.className = 'carousel-img';
  img.src = photoUrl;
  img.alt = `Página ${state.currentIndex + 1}`;
  img.draggable = false;
  img.oncontextmenu = () => false;
  img.style.pointerEvents = 'none';
  img.style.userSelect = 'none';

  if (!photoUrl) {
    img.style.cssText += 'background:#f3f4f6;min-width:200px;min-height:150px;';
    img.alt = 'Sem imagem';
  }

  const btnNext = document.createElement('button');
  btnNext.className = 'carousel-btn';
  btnNext.innerHTML = '⟩';
  btnNext.onclick = nextPage;

  carousel.append(btnPrev, img, btnNext);

  // Swipe touch
  let touchStartX = 0;
  carousel.addEventListener('touchstart', e => touchStartX = e.touches[0].clientX, { passive: true });
  carousel.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? nextPage() : prevPage();
  });

  main.appendChild(carousel);

  // Contador
  const count = document.createElement('div');
  count.textContent = `Página ${state.currentIndex + 1} de ${state.pages.length}`;
  count.style.textAlign = 'center';
  main.appendChild(count);

  // Status da página
  const status = document.createElement('div');
  status.className = 'sheet-status';
  status.textContent = statusLabel(page.status);
  main.appendChild(status);

  renderPageActions();
}

function statusLabel(status) {
  switch (status) {
    case 'awaiting_review': return 'Aguardando revisão';
    case 'approved': return 'Aprovada ✓';
    case 'revision_requested': return 'Revisão solicitada';
    default: return status;
  }
}

function prevPage() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderCarousel();
  }
}

function nextPage() {
  if (state.currentIndex < state.pages.length - 1) {
    state.currentIndex++;
    renderCarousel();
  }
}

function renderPageActions() {
  let old = document.getElementById('actions');
  if (old) old.remove();

  const actions = document.createElement('div');
  actions.id = 'actions';
  actions.className = 'actions';

  const page = state.pages[state.currentIndex];

  if (page.status === 'approved') {
    const ok = document.createElement('div');
    ok.className = 'success';
    ok.textContent = 'Página aprovada!';
    actions.appendChild(ok);
  } else if (page.status === 'revision_requested') {
    // Mostrar comentário enviado
    const lastComment = page.comments?.[page.comments.length - 1];
    const rev = document.createElement('div');
    rev.className = 'error';
    rev.textContent = lastComment
      ? `Revisão solicitada: "${lastComment.text}"`
      : 'Revisão solicitada.';
    actions.appendChild(rev);
  } else {
    // Aprovar página
    const btnApprove = document.createElement('button');
    btnApprove.className = 'btn btn-approve';
    btnApprove.textContent = '✓ Aprovar esta página';
    btnApprove.onclick = async () => {
      btnApprove.disabled = true;
      btnApprove.textContent = 'Aprovando...';
      await fetch(`/api/client/album/${state.albumId}/pages/${page._id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: state.accessCode })
      });
      await loadAlbum();
    };
    actions.appendChild(btnApprove);

    // Pedir revisão
    const btnRev = document.createElement('button');
    btnRev.className = 'btn btn-revision';
    btnRev.textContent = '✎ Pedir revisão';
    btnRev.onclick = () => showCommentBox(page);
    actions.appendChild(btnRev);
  }

  main.appendChild(actions);
  renderApproveAllBtn();
}

function showCommentBox(page) {
  let old = document.getElementById('comment-box');
  if (old) old.remove();

  const box = document.createElement('div');
  box.id = 'comment-box';
  box.className = 'comment-box';

  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Descreva o que deseja revisar nesta página...';

  const btnSend = document.createElement('button');
  btnSend.className = 'btn btn-revision';
  btnSend.textContent = 'Enviar revisão';
  btnSend.onclick = async () => {
    if (!textarea.value.trim()) {
      textarea.style.border = '2px solid #f87171';
      return;
    }
    btnSend.disabled = true;
    btnSend.textContent = 'Enviando...';
    await fetch(`/api/client/album/${state.albumId}/pages/${page._id}/request-revision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: state.accessCode, comment: textarea.value.trim() })
    });
    await loadAlbum();
  };

  box.appendChild(textarea);
  box.appendChild(btnSend);
  main.appendChild(box);
}

function renderApproveAllBtn() {
  let old = document.getElementById('approve-all');
  if (old) old.remove();

  const aprovadas = state.pages.filter(p => p.status === 'approved').length;
  const todasAprovadas = aprovadas === state.pages.length && state.pages.length > 0;

  if (todasAprovadas && state.album.status !== 'approved') {
    const btn = document.createElement('button');
    btn.id = 'approve-all';
    btn.className = 'btn-approve-all';
    btn.textContent = '✓ Aprovar Álbum Completo';
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = 'Aprovando...';
      await fetch(`/api/client/album/${state.albumId}/approve-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: state.accessCode })
      });
      await loadAlbum();
    };
    main.appendChild(btn);
  }

  // Mensagem de status final
  if (state.album.status === 'approved') {
    const msg = document.createElement('div');
    msg.className = 'status-message';
    msg.textContent = 'Álbum Aprovado! Obrigado. Aguarde o contato do fotógrafo.';
    main.appendChild(msg);
  } else if (state.album.status === 'revision_requested') {
    const msg = document.createElement('div');
    msg.className = 'status-message';
    msg.style.color = '#dc2626';
    msg.textContent = 'Revisão solicitada. O fotógrafo irá atualizar as páginas em breve.';
    main.appendChild(msg);
  }
}

function startPolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);
  state.pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/client/album/${state.albumId}?code=${state.accessCode}`).then(r => r.json());
      if (res.success && res.album.version !== state.album.version) {
        state.album = res.album;
        state.pages = res.album.pages || [];
        state.currentIndex = 0;
        renderAlbum();
      }
    } catch (e) {}
  }, 15000);
}

// Inicialização
renderLogin();
