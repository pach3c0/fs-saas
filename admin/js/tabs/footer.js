/**
 * Tab: Rodape
 */

import { apiGet, apiPut } from '../utils/api.js';

let _footer = null;

async function saveFooter(silent = false) {
  await apiPut('/api/site/admin/config', { siteContent: { footer: _footer } });
  if (!silent) window.showToast?.('Rodapé salvo!', 'success');
  window._meuSitePostPreview?.();
}

export async function renderFooter(container) {
  if (_footer === null) {
    const config = await apiGet('/api/site/admin/config');
    const f = config?.siteContent?.footer || {};
    _footer = {
      copyright: f.copyright || '',
      socialMedia: f.socialMedia || {},
      quickLinks: f.quickLinks || [],
    };
  }

  const { copyright, socialMedia, quickLinks } = _footer;

  const linksHtml = quickLinks.map((link, idx) => `
    <div style="display:flex; gap:0.5rem; align-items:center;">
      <input type="text" data-link-label="${idx}" style="flex:1; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
        value="${link.label || ''}" placeholder="Texto do link">
      <input type="text" data-link-url="${idx}" style="flex:1; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
        value="${link.url || ''}" placeholder="URL (ex: #portfolio)">
      <button onclick="removeFooterLink(${idx})" style="color:var(--red); background:none; border:none; cursor:pointer; font-size:1rem; padding:0.25rem;">🗑️</button>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Rodape</h2>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Copyright</h3>
        <input type="text" id="footerCopyright" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary);"
          value="${copyright}" placeholder="Ex: © 2026 CliqueZoom. Todos os direitos reservados.">
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Redes Sociais</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Instagram</label>
            <input type="text" id="socialInstagram" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.instagram || ''}" placeholder="https://instagram.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Facebook</label>
            <input type="text" id="socialFacebook" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.facebook || ''}" placeholder="https://facebook.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">LinkedIn</label>
            <input type="text" id="socialLinkedin" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.linkedin || ''}" placeholder="https://linkedin.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">TikTok</label>
            <input type="text" id="socialTiktok" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.tiktok || ''}" placeholder="https://tiktok.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">YouTube</label>
            <input type="text" id="socialYoutube" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.youtube || ''}" placeholder="https://youtube.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.25rem;">Email</label>
            <input type="email" id="socialEmail" style="width:100%; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.375rem; background:var(--bg-elevated); color:var(--text-primary); font-size:0.875rem;"
              value="${socialMedia.email || ''}" placeholder="contato@exemplo.com">
          </div>
        </div>
      </div>

      <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-surface); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Links Uteis</h3>
          <button id="addLinkBtn" style="background:var(--accent); color:white; padding:0.25rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
            + Adicionar
          </button>
        </div>
        <div id="linksList" style="display:flex; flex-direction:column; gap:0.5rem;">
          ${linksHtml || '<p style="color:var(--text-muted); font-size:0.875rem;">Nenhum link adicionado</p>'}
        </div>
      </div>

      <button id="saveFooterBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>
  `;

  container.querySelector('#addLinkBtn').onclick = () => {
    _footer.quickLinks.push({ label: '', url: '' });
    renderFooter(container);
  };

  window.removeFooterLink = async (idx) => {
    const ok = await window.showConfirm?.('Remover este link?', { danger: true });
    if (!ok) return;
    _footer.quickLinks.splice(idx, 1);
    await saveFooter(true);
    renderFooter(container);
  };

  container.querySelector('#saveFooterBtn').onclick = async () => {
    const links = [];
    container.querySelectorAll('[data-link-label]').forEach((input, idx) => {
      const url = container.querySelector(`[data-link-url="${idx}"]`)?.value || '';
      links.push({ label: input.value, url });
    });

    _footer = {
      copyright: container.querySelector('#footerCopyright').value,
      socialMedia: {
        instagram: container.querySelector('#socialInstagram').value,
        facebook: container.querySelector('#socialFacebook').value,
        linkedin: container.querySelector('#socialLinkedin').value,
        tiktok: container.querySelector('#socialTiktok').value,
        youtube: container.querySelector('#socialYoutube').value,
        email: container.querySelector('#socialEmail').value
      },
      quickLinks: links,
    };

    await saveFooter();
  };
}
