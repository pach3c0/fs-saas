/**
 * Aba "Minha conta" — superfície mínima do MEMBRO (Slice 2): ver nome/e-mail e trocar a
 * própria senha. O dono usa "Perfil" (identidade do negócio); o membro não acessa isso, mas
 * precisa poder trocar a senha definida pelo convite. Estilos inline + tokens --ad-*.
 */
import { apiGet, apiPut } from '../utils/api.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const inputStyle = 'padding:0.55rem 0.7rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); color:var(--ad-text); font-size:0.875rem;';
const labelStyle = 'display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:var(--ad-text); opacity:0.8;';
const cardStyle = 'background:var(--ad-bg-surface); border:1px solid var(--ad-border, rgba(128,128,128,0.2)); border-radius:12px; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.75rem;';

export async function renderMinhaConta(container) {
  let me = {};
  try { me = (await apiGet('/api/auth/me')) || {}; } catch { me = {}; }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem; max-width:520px;">
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        <h2 style="margin:0; font-size:1.25rem; color:var(--ad-text);">Minha conta</h2>
        <p style="margin:0; font-size:0.8125rem; color:var(--ad-text); opacity:0.7;">Seus dados de acesso.</p>
      </div>

      <div style="${cardStyle}">
        <div style="display:flex; flex-direction:column; gap:0.2rem;">
          <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.03em; color:var(--ad-text); opacity:0.55;">Nome</span>
          <span style="font-size:0.9rem; color:var(--ad-text);">${esc(me.name || '—')}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.2rem;">
          <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.03em; color:var(--ad-text); opacity:0.55;">E-mail</span>
          <span style="font-size:0.9rem; color:var(--ad-text);">${esc(me.email || '—')}</span>
        </div>
      </div>

      <div style="${cardStyle}">
        <span style="font-size:0.875rem; font-weight:600; color:var(--ad-text);">Trocar senha</span>
        <label style="${labelStyle}">Senha atual
          <input id="mc-current" type="password" autocomplete="current-password" style="${inputStyle}">
        </label>
        <label style="${labelStyle}">Nova senha
          <input id="mc-new" type="password" autocomplete="new-password" style="${inputStyle}">
        </label>
        <label style="${labelStyle}">Confirmar nova senha
          <input id="mc-confirm" type="password" autocomplete="new-password" style="${inputStyle}">
        </label>
        <div style="display:flex; justify-content:flex-end;">
          <button id="mc-save" style="padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface); font-size:0.8125rem; font-weight:600; cursor:pointer;">Salvar nova senha</button>
        </div>
      </div>
    </div>`;

  const $ = (id) => container.querySelector(id);
  $('#mc-save').onclick = async () => {
    const currentPassword = $('#mc-current').value;
    const newPassword = $('#mc-new').value;
    const confirmar = $('#mc-confirm').value;
    if (!currentPassword || !newPassword) { window.showToast?.('Preencha a senha atual e a nova.', 'warning'); return; }
    if (newPassword.length < 6) { window.showToast?.('A nova senha deve ter no mínimo 6 caracteres.', 'warning'); return; }
    if (newPassword !== confirmar) { window.showToast?.('A confirmação não confere.', 'warning'); return; }
    const btn = $('#mc-save');
    btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await apiPut('/api/auth/me/password', { currentPassword, newPassword });
      window.showToast?.('Senha alterada com sucesso.', 'success');
      $('#mc-current').value = ''; $('#mc-new').value = ''; $('#mc-confirm').value = '';
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao trocar a senha.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Salvar nova senha';
    }
  };
}
