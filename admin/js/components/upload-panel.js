export class UploadPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
    this.items = new Map();
    this.onCancel = null;
    this.onRetry = null;
    this.onClose = null;
    
    this.renderBase();
  }

  renderBase() {
    this.container.innerHTML = `
      <div id="upload-panel-container" style="
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
        width: 380px; 
        background: var(--bg-surface, #1f2937); 
        border: 1px solid var(--border, #374151); 
        border-radius: 0.5rem; 
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
        flex-direction: column;
        overflow: hidden;
      ">
        <div style="
          padding: 12px 16px; 
          background: var(--bg-elevated, #111827); 
          border-bottom: 1px solid var(--border, #374151);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        " id="upload-panel-header">
          <div>
            <h4 style="margin: 0; color: var(--text-primary, #f3f4f6); font-size: 0.875rem; font-weight: 600;">Uploads</h4>
            <div id="upload-panel-stats" style="font-size: 0.75rem; color: var(--text-secondary, #9ca3af); margin-top: 2px;"></div>
          </div>
          <div style="display:flex; gap:8px;">
             <button id="upload-panel-toggle" style="background:none; border:none; color:#9ca3af; cursor:pointer; font-size:1.2rem;">▼</button>
             <button id="upload-panel-close" style="background:none; border:none; color:#9ca3af; cursor:pointer; font-size:1.2rem; display:none;">×</button>
          </div>
        </div>
        <div id="upload-panel-list" style="
          max-height: 300px;
          overflow-y: auto;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        "></div>
      </div>
    `;

    this.panelContainer = this.container.querySelector('#upload-panel-container');
    this.listContainer = this.container.querySelector('#upload-panel-list');
    this.statsContainer = this.container.querySelector('#upload-panel-stats');
    
    const header = this.container.querySelector('#upload-panel-header');
    const toggleBtn = this.container.querySelector('#upload-panel-toggle');
    const closeBtn = this.container.querySelector('#upload-panel-close');

    header.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      this.toggleCollapse();
    });

    closeBtn.addEventListener('click', () => {
      this.hide();
      if (this.onClose) this.onClose();
    });
  }

  show() {
    this.panelContainer.style.display = 'flex';
    this.listContainer.style.display = 'flex';
    this.container.querySelector('#upload-panel-toggle').textContent = '▼';
    this.container.querySelector('#upload-panel-close').style.display = 'none';
  }

  hide() {
    this.panelContainer.style.display = 'none';
  }

  toggleCollapse() {
    const isVisible = this.listContainer.style.display !== 'none';
    this.listContainer.style.display = isVisible ? 'none' : 'flex';
    this.container.querySelector('#upload-panel-toggle').textContent = isVisible ? '▲' : '▼';
  }

  updateStats(stats) {
    const { total, done, error, pending, eta } = stats;
    let etaText = '';
    if (eta !== null && pending > 0) {
      if (eta < 60) etaText = ` • ETA: ${eta}s`;
      else etaText = ` • ETA: ${Math.floor(eta/60)}m ${eta%60}s`;
    }
    
    this.statsContainer.textContent = `${done}/${total} concluídos${etaText}`;

    if (pending === 0 && error === 0) {
      this.container.querySelector('#upload-panel-close').style.display = 'block';
    }
  }

  updateItem(item) {
    let el = this.items.get(item.id);
    
    if (!el) {
      el = document.createElement('div');
      el.style.cssText = `
        background: var(--bg-base, #111827);
        border: 1px solid var(--border, #374151);
        border-radius: 4px;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.75rem;
      `;
      this.listContainer.appendChild(el);
      this.items.set(item.id, el);
    }

    let statusColor = 'var(--text-secondary, #9ca3af)';
    let statusText = 'Aguardando';
    let progressWidth = item.progress;
    let actionBtn = '';

    if (item.status === 'uploading') {
      statusColor = 'var(--accent, #3b82f6)';
      statusText = `${item.progress}%`;
      actionBtn = `<button class="cancel-btn" data-id="${item.id}" title="Cancelar" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.2rem; line-height:1;">&times;</button>`;
    } else if (item.status === 'done') {
      statusColor = 'var(--green, #10b981)';
      statusText = 'Concluído';
      progressWidth = 100;
    } else if (item.status === 'error') {
      statusColor = 'var(--red, #ef4444)';
      statusText = 'Erro';
      progressWidth = 100;
      actionBtn = `<button class="retry-btn" data-id="${item.id}" title="Tentar Novamente" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; line-height:1;">🔄</button>`;
    } else if (item.status === 'cancelled') {
      statusColor = 'var(--text-muted, #6b7280)';
      statusText = 'Cancelado';
      progressWidth = 0;
    }

    const nameTruncated = item.file.name.length > 25 ? item.file.name.substring(0, 22) + '...' : item.file.name;

    el.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:var(--text-primary, #f3f4f6);">
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.file.name}">${nameTruncated}</span>
          <span style="color:${statusColor}; font-weight:600; font-size:0.7rem;">${statusText}</span>
        </div>
        <div style="height:4px; background:var(--bg-surface, #1f2937); border-radius:2px; overflow:hidden;">
          <div style="height:100%; width:${progressWidth}%; background:${statusColor}; transition:width 0.2s;"></div>
        </div>
        ${item.errorMsg ? `<div style="color:var(--red, #ef4444); font-size:0.65rem; margin-top:2px;">${item.errorMsg}</div>` : ''}
      </div>
      ${actionBtn ? `<div style="display:flex; align-items:center;">${actionBtn}</div>` : ''}
    `;

    // Atachar eventos aos botões recém renderizados
    const cancelBtn = el.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onCancel) this.onCancel(item.id);
      });
    }

    const retryBtn = el.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onRetry) this.onRetry(item.id);
      });
    }
  }

  clear() {
    this.listContainer.innerHTML = '';
    this.items.clear();
  }
}
