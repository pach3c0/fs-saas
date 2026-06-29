// unified-grid/upload-actions.js — Filas de upload (originais/editadas), handlers de
// envio e os cards do estado vazio (originais × já editadas).
// Extraído de unified-photo-grid.js sem alteração de comportamento.

import { apiPut } from '../../../../utils/api.js';
import { UploadQueue } from '../../../../utils/upload.js';
import { UploadPanel } from '../../../../components/upload-panel.js';
import { icon } from '../../../../utils/icons.js';

// ── Upload Queue global (compartilhado com 1-upload.js) ────────────────────
function getOrCreateQueue(onDone) {
  if (!window.globalUploadPanel) {
    window.globalUploadPanel = new UploadPanel('upload-panel-root', { title: 'Uploads Originais' });
  }
  const panel = window.globalUploadPanel;
  panel.show();
  if (!window.globalUploadQueue) {
    window.globalUploadQueue = new UploadQueue({
      concurrency: 3,
      onItemUpdate: (item) => panel.updateItem(item),
      onQueueUpdate: (stats) => panel.updateStats(stats),
      onQueueDone: onDone
    });
    panel.onCancel = (id) => window.globalUploadQueue.cancel(id);
    panel.onRetry  = (id) => window.globalUploadQueue.retry(id);
  }
  window.globalUploadQueue.onQueueDone = onDone;
  return window.globalUploadQueue;
}

function getOrCreateEditedQueue(onDone) {
  if (!window.globalEditedUploadPanel) {
    window.globalEditedUploadPanel = new UploadPanel('upload-edited-panel-root', { title: 'Uploads Editadas' });
  }
  const panel = window.globalEditedUploadPanel;
  panel.show();
  if (!window.globalEditedUploadQueue) {
    window.globalEditedUploadQueue = new UploadQueue({
      concurrency: 3,
      onItemUpdate: (item) => panel.updateItem(item),
      onQueueUpdate: (stats) => panel.updateStats(stats),
      onQueueDone: onDone
    });
    panel.onCancel = (id) => window.globalEditedUploadQueue.cancel(id);
    panel.onRetry  = (id) => window.globalEditedUploadQueue.retry(id);
  }
  window.globalEditedUploadQueue.onQueueDone = onDone;
  return window.globalEditedUploadQueue;
}

// ── Handlers de upload ─────────────────────────────────────────────────────
export function handleUploadBrutas(e, session, refresh) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const queue = getOrCreateQueue(async () => {
    window.showToast?.('Uploads finalizados!', 'success');
    await refresh();
  });
  queue.add(files, `/api/sessions/${session._id}/photos`);
  e.target.value = '';
}

// Caminho B (galeria vazia): fotos JÁ EDITADAS viram o pool de escolha direto.
// Cada arquivo é uma foto nova com a alta preservada (urlOriginal) + thumb leve pra escolha,
// então não precisa do passo "Subir editadas" depois. allowUnmatched=true porque aqui é
// intencional: ainda não há galeria de originais pra casar por nome.
export function handleUploadEditedDirect(e, session, refresh) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const queue = getOrCreateEditedQueue(async () => {
    window.showToast?.('Fotos editadas enviadas!', 'success');
    await refresh();
  });
  queue.add(files, `/api/sessions/${session._id}/photos/upload-edited?allowUnmatched=true`);
  e.target.value = '';
}

// Cards do estado vazio: explicam os dois caminhos da seleção (originais × já editadas)
// antes do clique. O upload já vai pro endpoint certo de cada caminho.
export function renderUploadChoiceCards(session, fileInputBrutas, fileInputEditedDirect) {
  // Persiste o caminho escolhido ANTES de abrir o seletor de arquivos. O refresh pós-upload
  // recarrega a sessão com o uploadFlow novo → a toolbar já nasce travada no caminho certo.
  const pickFlow = async (flow, openInput) => {
    try { await apiPut(`/api/sessions/${session._id}`, { uploadFlow: flow }); }
    catch (_) { /* falha de rede não deve impedir o upload; o backend revalida */ }
    openInput.click();
  };
  const box = document.createElement('div');
  box.style.cssText = 'display:flex; flex-direction:column; gap:1rem;';

  const heading = document.createElement('div');
  heading.style.cssText = 'text-align:center;';
  heading.innerHTML = `
    <div style="font-size:1rem; font-weight:600; color:var(--text-primary); margin-bottom:.25rem;">Como você quer enviar as fotos para o cliente escolher?</div>
    <div style="font-size:.8125rem; color:var(--text-muted);">São dois caminhos para o mesmo objetivo — escolha conforme você já editou ou não.</div>
  `;
  box.appendChild(heading);

  const cards = document.createElement('div');
  cards.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:1rem;';

  const mkCard = ({ ic, title, desc, footnote, btnLabel, accent, onClick }) => {
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex; flex-direction:column; gap:.625rem;
      background:var(--bg-surface); border:1px solid var(--border);
      border-radius:var(--r-card); padding:1.25rem; text-align:left;
      transition:border-color .15s, box-shadow .15s;
    `;
    card.onmouseenter = () => { card.style.borderColor = accent; };
    card.onmouseleave = () => { card.style.borderColor = 'var(--border)'; };

    const head = document.createElement('div');
    head.style.cssText = 'display:flex; align-items:center; gap:.5rem;';
    head.innerHTML = `
      <span style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9999px; background:color-mix(in srgb, ${accent} 14%, transparent); color:${accent}; flex-shrink:0;">${ic}</span>
      <span style="font-size:.9375rem; font-weight:600; color:var(--text-primary);">${title}</span>
    `;
    card.appendChild(head);

    const body = document.createElement('div');
    body.style.cssText = 'font-size:.8125rem; color:var(--text-secondary); line-height:1.5;';
    body.textContent = desc;
    card.appendChild(body);

    const foot = document.createElement('div');
    foot.style.cssText = 'font-size:.75rem; color:var(--text-muted); line-height:1.4;';
    foot.textContent = footnote;
    card.appendChild(foot);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cz-ug-pill';
    btn.style.cssText += `margin-top:.25rem; align-self:flex-start; border-color:${accent}; color:${accent};`;
    btn.innerHTML = `<span style="display:flex;align-items:center;">${icon('upload', 14)}</span><span>${btnLabel}</span>`;
    btn.onclick = onClick;
    card.appendChild(btn);
    return card;
  };

  cards.appendChild(mkCard({
    ic: icon('camera', 18),
    title: 'Fotos originais (sem edição)',
    desc: 'Suba as fotos da sessão sem tratar. O sistema cria versões leves para o cliente escolher; depois você edita só as escolhidas e sobe as finais.',
    footnote: '↳ Tem um passo a mais: subir as editadas no fim.',
    btnLabel: 'Subir originais',
    accent: 'var(--accent)',
    onClick: () => pickFlow('originals', fileInputBrutas)
  }));

  cards.appendChild(mkCard({
    ic: icon('brilho', 18),
    title: 'Fotos já editadas',
    desc: 'Já tem as fotos prontas? Suba as versões finais. O cliente escolhe vendo o tratamento final e você pula o trabalho de subir tudo de novo no fim.',
    footnote: '↳ Mais rápido: sem re-upload depois da escolha.',
    btnLabel: 'Subir editadas',
    accent: 'var(--green)',
    onClick: () => pickFlow('edited', fileInputEditedDirect)
  }));

  box.appendChild(cards);
  return box;
}

export async function handleUploadEdited(e, session, refresh, selectedIds) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  const photos = session.photos || [];
  const unmatched   = [];
  const notSelected = [];

  files.forEach(f => {
    const match = photos.find(p => p.filename === f.name);
    if (!match) unmatched.push(f.name);
    else if (!selectedIds.includes(match.id)) notSelected.push(f.name);
  });

  const allowUnmatched = unmatched.length > 0;

  const proceed = () => {
    const queue = getOrCreateEditedQueue(async () => {
      window.showToast?.('Editadas enviadas!', 'success');
      await refresh();
    });
    queue.add(files, `/api/sessions/${session._id}/photos/upload-edited?allowUnmatched=${allowUnmatched}`);
    e.target.value = '';
  };

  if (unmatched.length || notSelected.length) {
    const msgs = [
      unmatched.length   ? `${unmatched.length} arquivo(s) sem correspondente na galeria` : '',
      notSelected.length ? `${notSelected.length} arquivo(s) não foram selecionado(s) pelo cliente` : ''
    ].filter(Boolean).join(' · ');
    const ok = await window.showConfirm?.(`Atenção: ${msgs}. Continuar mesmo assim?`, { confirmText: 'Sim, continuar', cancelText: 'Cancelar' });
    if (ok) proceed();
    else e.target.value = '';
  } else {
    proceed();
  }
}
