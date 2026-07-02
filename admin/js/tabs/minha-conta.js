/**
 * Aba "Minha conta" — superfície PESSOAL de todo usuário (Slice 2): foto de perfil, nome/e-mail
 * e trocar a própria senha. Universal (dono e membro). O dono usa "Perfil" para a identidade do
 * NEGÓCIO (logo/contato); aqui é a pessoa. Estilos inline + tokens --ad-*.
 */
import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';
import { appState } from '../state.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const initialsOf = (name) => {
  const n = String(name || '').trim();
  if (!n) return '?';
  return n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

const inputStyle = 'padding:0.55rem 0.7rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); color:var(--ad-text); font-size:0.875rem;';
const labelStyle = 'display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem; color:var(--ad-text); opacity:0.8;';
const cardStyle = 'background:var(--ad-bg-surface); border:1px solid var(--ad-border, rgba(128,128,128,0.2)); border-radius:12px; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:0.75rem;';
const btnStyle = 'padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-accent); background:var(--ad-accent); color:var(--ad-bg-surface); font-size:0.8125rem; font-weight:600; cursor:pointer;';
const ghostBtnStyle = 'padding:0.5rem 0.9rem; border-radius:8px; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:transparent; color:var(--ad-text); font-size:0.8125rem; font-weight:500; cursor:pointer;';

export async function renderMinhaConta(container) {
  let me = {};
  try { me = (await apiGet('/api/auth/me')) || {}; } catch { me = {}; }
  let avatarUrl = me.avatarUrl || '';
  const name = me.name || appState.userName || '';

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem; max-width:520px;">
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        <h2 style="margin:0; font-size:1.25rem; color:var(--ad-text);">Minha conta</h2>
        <p style="margin:0; font-size:0.8125rem; color:var(--ad-text); opacity:0.7;">Sua foto e seus dados de acesso.</p>
      </div>

      <div style="${cardStyle}">
        <span style="font-size:0.875rem; font-weight:600; color:var(--ad-text);">Foto de perfil</span>
        <div style="display:flex; align-items:center; gap:1rem;">
          <div id="mc-avatar" style="width:72px; height:72px; border-radius:50%; flex-shrink:0; border:1px solid var(--ad-border, rgba(128,128,128,0.3)); background:var(--ad-bg-base); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:700; color:var(--ad-text); overflow:hidden; background-size:cover; background-position:center;"></div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <button id="mc-photo-pick" style="${btnStyle}">Enviar foto</button>
              <button id="mc-photo-remove" style="${ghostBtnStyle}; display:${avatarUrl ? 'inline-block' : 'none'};">Remover</button>
            </div>
            <span style="font-size:0.7rem; color:var(--ad-text); opacity:0.6;">JPG, PNG ou WebP. Fica redonda na barra do topo.</span>
          </div>
          <input id="mc-photo-input" type="file" accept="image/jpeg,image/png,image/webp" style="display:none;">
        </div>
        <div id="mc-photo-progress"></div>
      </div>

      <div style="${cardStyle}">
        <div style="display:flex; flex-direction:column; gap:0.2rem;">
          <span style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.03em; color:var(--ad-text); opacity:0.55;">Nome</span>
          <span style="font-size:0.9rem; color:var(--ad-text);">${esc(name || '—')}</span>
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
          <button id="mc-save" style="${btnStyle}">Salvar nova senha</button>
        </div>
      </div>
    </div>`;

  const $ = (id) => container.querySelector(id);

  // ── Foto de perfil ──────────────────────────────────────────────────────
  const avatarEl = $('#mc-avatar');
  const removeBtn = $('#mc-photo-remove');
  const paintAvatar = () => {
    if (avatarUrl) {
      avatarEl.style.backgroundImage = `url("${resolveImagePath(avatarUrl)}")`;
      avatarEl.textContent = '';
      removeBtn.style.display = 'inline-block';
    } else {
      avatarEl.style.backgroundImage = '';
      avatarEl.textContent = initialsOf(name);
      removeBtn.style.display = 'none';
    }
  };
  paintAvatar();

  const syncTopbar = () => {
    appState.avatarUrl = avatarUrl;
    window.refreshIdentityUI?.();
  };

  $('#mc-photo-pick').onclick = () => $('#mc-photo-input').click();
  $('#mc-photo-input').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadImage(file, appState.authToken, (pct) => showUploadProgress('mc-photo-progress', pct));
      await apiPut('/api/auth/me/avatar', { avatarUrl: url });
      avatarUrl = url;
      paintAvatar();
      syncTopbar();
      showUploadProgress('mc-photo-progress', 100);
      setTimeout(() => { const p = $('#mc-photo-progress'); if (p) p.innerHTML = ''; }, 800);
      window.showToast?.('Foto de perfil atualizada.', 'success');
    } catch (err) {
      const p = $('#mc-photo-progress'); if (p) p.innerHTML = '';
      window.showToast?.(err.message || 'Erro ao enviar a foto.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  removeBtn.onclick = async () => {
    const ok = await (window.showConfirm ? window.showConfirm('Remover sua foto de perfil?') : Promise.resolve(true));
    if (!ok) return;
    try {
      await apiPut('/api/auth/me/avatar', { avatarUrl: '' });
      avatarUrl = '';
      paintAvatar();
      syncTopbar();
      window.showToast?.('Foto removida.', 'success');
    } catch (err) {
      window.showToast?.(err.message || 'Erro ao remover a foto.', 'error');
    }
  };

  // ── Trocar senha ────────────────────────────────────────────────────────
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
