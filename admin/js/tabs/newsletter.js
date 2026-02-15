/**
 * Tab: Newsletter
 */

import { appState } from '../state.js';

export async function renderNewsletter(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Newsletter</h2>
      <p style="color:#9ca3af;">Inscritos na newsletter</p>

      <div id="newsletterList" style="display:flex; flex-direction:column; gap:0.5rem; border:1px solid #374151; border-radius:0.375rem; padding:1rem; background:#1f2937; max-height:24rem; overflow-y:auto;">
        <p style="color:#9ca3af; text-align:center;">Carregando...</p>
      </div>

      <button id="exportBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Exportar CSV
      </button>
    </div>
  `;

  // Carrega lista de inscritos
  try {
    const response = await fetch('/api/newsletter', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });

    if (!response.ok) throw new Error('Erro ao carregar');

    const data = await response.json();
    const list = container.querySelector('#newsletterList');

    if (data.subscribers && data.subscribers.length > 0) {
      list.innerHTML = data.subscribers.map((sub) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#111827; padding:0.5rem 0.75rem; border-radius:0.25rem;">
          <span style="color:#f3f4f6;">${sub.email}</span>
          <button onclick="deleteNewsletter('${sub.email}')" style="color:#ef4444; font-size:0.875rem; background:none; border:none; cursor:pointer;">🗑️</button>
        </div>
      `).join('');
    } else {
      list.innerHTML = '<p style="color:#9ca3af; text-align:center;">Nenhum inscrito</p>';
    }
  } catch (error) {
    const list = container.querySelector('#newsletterList');
    if (list) list.innerHTML = `<p style="color:#f87171;">Erro: ${error.message}</p>`;
  }

  // Exportar CSV
  const exportBtn = container.querySelector('#exportBtn');
  if (!exportBtn) return;
  exportBtn.onclick = async () => {
    try {
      const response = await fetch('/api/newsletter', {
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      const data = await response.json();

      const csv = 'Email\n' + (data.subscribers?.map(s => s.email) || []).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'newsletter.csv';
      a.click();
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };

  window.deleteNewsletter = async (email) => {
    if (!confirm('Tem certeza?')) return;

    try {
      const response = await fetch(`/api/newsletter/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${appState.authToken}` }
      });
      if (response.ok) {
        await renderNewsletter(container);
      }
    } catch (error) {
      alert('Erro: ' + error.message);
    }
  };
}
