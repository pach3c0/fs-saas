import { UploadPanel } from '../../components/upload-panel.js';
import { UploadQueue } from '../../utils/upload.js';

export function showUploadValidationModal(container, report, onConfirm) {
  const modal = container.querySelector('#uploadValidationModal');
  const content = container.querySelector('#validationContent');
  const confirmBtn = container.querySelector('#confirmValidationBtn');
  const cancelBtn = container.querySelector('#cancelValidationBtn');

  let html = '';

  if (report.unmatched.length > 0) {
    html += `
      <div style="background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2); padding:0.75rem; border-radius:0.5rem;">
        <strong style="color:var(--red); font-size:0.875rem; display:block; margin-bottom:0.25rem;">🔴 Arquivos Não Encontrados (${report.unmatched.length})</strong>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Esses nomes não existem na galeria atual. Se continuar, elas serão adicionadas como novas fotos.</p>
        <div style="max-height:80px; overflow-y:auto; font-family:monospace; font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:0.25rem;">
          ${report.unmatched.join('<br>')}
        </div>
      </div>
    `;
  }

  if (report.notSelected.length > 0) {
    html += `
      <div style="background:rgba(210,153,34,0.1); border:1px solid rgba(210,153,34,0.2); padding:0.75rem; border-radius:0.5rem;">
        <strong style="color:var(--yellow); font-size:0.875rem; display:block; margin-bottom:0.25rem;">🟡 Não Selecionadas pelo Cliente (${report.notSelected.length})</strong>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem;">Estas fotos existem na galeria, mas o cliente NÃO as escolheu no pacote.</p>
        <div style="max-height:80px; overflow-y:auto; font-family:monospace; font-size:0.7rem; color:var(--text-muted); background:rgba(0,0,0,0.2); padding:0.4rem; border-radius:0.25rem;">
          ${report.notSelected.join('<br>')}
        </div>
      </div>
    `;
  }

  if (report.extraCount > 0) {
    html += `
      <div style="background:rgba(47,129,247,0.1); border:1px solid rgba(47,129,247,0.2); padding:0.75rem; border-radius:0.5rem;">
        <strong style="color:var(--accent); font-size:0.875rem; display:block; margin-bottom:0.25rem;">📊 Resumo de Quantidade</strong>
        <p style="font-size:0.875rem; color:var(--text-primary);">Você está enviando <b>${report.total}</b> fotos.</p>
        <p style="font-size:0.75rem; color:var(--text-secondary);">O limite do pacote/seleção é de <b>${report.limit}</b> fotos. Você está entregando <b>${report.extraCount}</b> fotos a mais (Brinde).</p>
      </div>
    `;
  } else if (report.total > 0 && report.unmatched.length === 0 && report.notSelected.length === 0) {
    html += `
      <div style="background:rgba(63,185,80,0.1); border:1px solid rgba(63,185,80,0.2); padding:0.75rem; border-radius:0.5rem;">
        <strong style="color:var(--green); font-size:0.875rem; display:block; margin-bottom:0.25rem;">✅ Tudo Certo!</strong>
        <p style="font-size:0.875rem; color:var(--text-primary);">Total de <b>${report.total}</b> fotos compatíveis com a seleção.</p>
      </div>
    `;
  }

  content.innerHTML = html;
  confirmBtn.textContent = 'Upload';
  modal.style.display = 'flex';

  confirmBtn.onclick = () => { modal.style.display = 'none'; onConfirm(true); };
  cancelBtn.onclick = () => { modal.style.display = 'none'; onConfirm(false); };
}

function getOrCreateQueue(container, state, renderSessoes, onDone) {
  if (!window.globalUploadPanel) {
    window.globalUploadPanel = new UploadPanel('upload-panel-root');
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
    panel.onRetry = (id) => window.globalUploadQueue.retry(id);
  }
  return window.globalUploadQueue;
}

export function setupUpload(container, state, renderSessoes) {
  container.querySelector('#sessionUploadInput').onchange = async (e) => {
    if (!state.currentSessionId) return;
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const queue = getOrCreateQueue(container, state, renderSessoes, async () => {
      window.showToast?.('Uploads finalizados!', 'success');
      await renderSessoes(container);
      if (state.currentSessionId) window.viewSessionPhotos(state.currentSessionId);
      window.loadSidebarStorage?.();
    });

    queue.add(files, `/api/sessions/${state.currentSessionId}/photos`);
    e.target.value = '';
  };

  container.querySelector('#sessionEditedInput').onchange = async (e) => {
    if (!state.currentSessionId) return;
    const session = state.sessionsData.find(s => s._id === state.currentSessionId);
    if (!session) return;

    const files = Array.from(e.target.files);
    if (!files.length) return;

    const photosInSession = session.photos || [];
    const selectedIds = session.selectedPhotos || [];
    const packageLimit = session.packageLimit || 30;

    const report = { unmatched: [], notSelected: [], extraCount: 0, total: files.length, limit: packageLimit };
    files.forEach(file => {
      const match = photosInSession.find(p => p.filename === file.name);
      if (!match) { report.unmatched.push(file.name); }
      else if (!selectedIds.includes(match.id)) { report.notSelected.push(file.name); }
    });
    report.extraCount = Math.max(0, files.length - selectedIds.length);

    showUploadValidationModal(container, report, (confirmed) => {
      if (!confirmed) { e.target.value = ''; return; }

      const queue = getOrCreateQueue(container, state, renderSessoes, async () => {
        window.showToast?.('Uploads de editadas finalizados!', 'success');
        await renderSessoes(container);
        if (state.currentSessionId) {
          window.viewSessionPhotos(state.currentSessionId);
          window.switchPhotoTab('entrega');
        }
      });

      const allowUnmatched = report.unmatched.length > 0;
      queue.add(files, `/api/sessions/${state.currentSessionId}/photos/upload-edited?allowUnmatched=${allowUnmatched}`);
      e.target.value = '';
    });
  };
}
