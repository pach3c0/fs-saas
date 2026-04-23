/**
 * Sistema de toasts para o admin — substitui alert() e confirm()
 */

let toastContainer = null;

function getContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const COLORS = {
  success: { bg: '#065f46', border: '#059669', text: '#d1fae5', icon: '#34d399' },
  error:   { bg: '#7f1d1d', border: '#dc2626', text: '#fee2e2', icon: '#f87171' },
  warning: { bg: '#78350f', border: '#d97706', text: '#fef3c7', icon: '#fbbf24' },
  info:    { bg: '#1e3a5f', border: '#3b82f6', text: '#dbeafe', icon: '#60a5fa' },
};

/**
 * Exibe um toast
 * @param {string} message - Mensagem
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - ms (0 = não fecha automaticamente)
 */
export function showToast(message, type = 'success', duration = 3500) {
  const c = COLORS[type] || COLORS.info;
  const icon = ICONS[type] || ICONS.info;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: ${c.bg};
    border: 1px solid ${c.border};
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    min-width: 260px;
    max-width: 380px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    pointer-events: all;
    opacity: 0;
    transform: translateX(20px);
    transition: opacity 0.25s ease, transform 0.25s ease;
    cursor: pointer;
  `;

  toast.innerHTML = `
    <span style="color:${c.icon}; flex-shrink:0;">${icon}</span>
    <span style="color:${c.text}; font-size:0.875rem; line-height:1.4; flex:1;">${message}</span>
    <button style="background:none;border:none;color:${c.icon};cursor:pointer;padding:0;flex-shrink:0;opacity:0.7;line-height:1;" aria-label="Fechar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('button').onclick = dismiss;
  toast.onclick = (e) => { if (e.target !== toast.querySelector('button')) dismiss(); };

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}

/**
 * Substituição do confirm() — retorna Promise<boolean>
 */
export function showConfirm(message, { title = 'Confirmar', confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = {}) {
  return new Promise((resolve) => {
    // Remove modal anterior se existir
    document.getElementById('confirm-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-modal';
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      animation: fadeInOverlay 0.15s ease;
    `;

    const confirmColor = danger ? '#dc2626' : '#2563eb';
    const confirmHover = danger ? '#b91c1c' : '#1d4ed8';

    overlay.innerHTML = `
      <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem; width:360px; max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <h3 style="font-size:1rem; font-weight:600; color:#f3f4f6; margin-bottom:0.5rem;">${title}</h3>
        <p style="color:#9ca3af; font-size:0.875rem; line-height:1.5; margin-bottom:1.25rem;">${message}</p>
        <div style="display:flex; gap:0.75rem; justify-content:flex-end;">
          <button id="confirmCancel" style="background:#374151; color:#d1d5db; border:none; border-radius:0.375rem; padding:0.5rem 1rem; cursor:pointer; font-size:0.875rem;">${cancelText}</button>
          <button id="confirmOk" style="background:${confirmColor}; color:white; border:none; border-radius:0.375rem; padding:0.5rem 1rem; cursor:pointer; font-size:0.875rem; font-weight:500;">${confirmText}</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 150);
      resolve(result);
    };

    overlay.querySelector('#confirmCancel').onclick = () => close(false);
    overlay.querySelector('#confirmOk').onclick = () => close(true);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };

    // Hover states
    const okBtn = overlay.querySelector('#confirmOk');
    okBtn.onmouseenter = () => okBtn.style.background = confirmHover;
    okBtn.onmouseleave = () => okBtn.style.background = confirmColor;

    document.body.appendChild(overlay);
    overlay.querySelector('#confirmOk').focus();
  });
}

/**
 * Toast de erro com botão "Tentar de novo". Não fecha automaticamente.
 * @param {string} message
 * @param {() => Promise<any>|void} onRetry — chamado ao clicar em "Tentar de novo"
 */
export function showToastWithRetry(message, onRetry) {
  const c = COLORS.error;
  const icon = ICONS.error;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.625rem;
    background: ${c.bg};
    border: 1px solid ${c.border};
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    min-width: 300px;
    max-width: 420px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    pointer-events: all;
    opacity: 0;
    transform: translateX(20px);
    transition: opacity 0.25s ease, transform 0.25s ease;
  `;

  toast.innerHTML = `
    <span style="color:${c.icon}; flex-shrink:0;">${icon}</span>
    <span style="color:${c.text}; font-size:0.875rem; line-height:1.4; flex:1;">${message}</span>
    <button data-retry style="background:${c.border};color:#fff;border:none;border-radius:0.375rem;padding:0.25rem 0.625rem;cursor:pointer;font-size:0.75rem;font-weight:500;flex-shrink:0;">Tentar de novo</button>
    <button data-close style="background:none;border:none;color:${c.icon};cursor:pointer;padding:0;flex-shrink:0;opacity:0.7;line-height:1;" aria-label="Fechar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('[data-close]').onclick = dismiss;
  toast.querySelector('[data-retry]').onclick = () => {
    dismiss();
    try { onRetry?.(); } catch (e) { console.error(e); }
  };

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  return dismiss;
}

// Expor globalmente para uso em inline onclick handlers
window.showToast = showToast;
window.showConfirm = showConfirm;
window.showToastWithRetry = showToastWithRetry;
