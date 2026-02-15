/**
 * Tab: Rodape
 */

import { appState, saveAppData } from '../state.js';
import { generateId } from '../utils/helpers.js';

export async function renderFooter(container) {
  const footer = appState.appData.footer || {};
  const socialMedia = footer.socialMedia || footer.socialLinks || {};
  const quickLinks = footer.quickLinks || [];
  const newsletter = footer.newsletter || { enabled: true, title: '', description: '' };

  let linksHtml = '';
  quickLinks.forEach((link, idx) => {
    linksHtml += `
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <input type="text" data-link-label="${idx}" style="flex:1; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
          value="${link.label || ''}" placeholder="Texto do link">
        <input type="text" data-link-url="${idx}" style="flex:1; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
          value="${link.url || ''}" placeholder="URL (ex: #portfolio)">
        <button onclick="removeFooterLink(${idx})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:1rem; padding:0.25rem;">🗑️</button>
      </div>
    `;
  });

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Rodape</h2>

      <!-- Copyright -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Copyright</h3>
        <input type="text" id="footerCopyright" style="width:100%; padding:0.5rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;"
          value="${footer.copyright || ''}" placeholder="Ex: © 2026 FS FOTOGRAFIAS. Todos os direitos reservados.">
      </div>

      <!-- Redes Sociais -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Redes Sociais</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Instagram</label>
            <input type="text" id="socialInstagram" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.instagram || ''}" placeholder="https://instagram.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Facebook</label>
            <input type="text" id="socialFacebook" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.facebook || ''}" placeholder="https://facebook.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">LinkedIn</label>
            <input type="text" id="socialLinkedin" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.linkedin || ''}" placeholder="https://linkedin.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">TikTok</label>
            <input type="text" id="socialTiktok" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.tiktok || ''}" placeholder="https://tiktok.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">YouTube</label>
            <input type="text" id="socialYoutube" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.youtube || ''}" placeholder="https://youtube.com/...">
          </div>
          <div>
            <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Email</label>
            <input type="email" id="socialEmail" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
              value="${socialMedia.email || ''}" placeholder="contato@exemplo.com">
          </div>
        </div>
      </div>

      <!-- Links Uteis -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Links Uteis</h3>
          <button id="addLinkBtn" style="background:#2563eb; color:white; padding:0.25rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">
            + Adicionar
          </button>
        </div>
        <div id="linksList" style="display:flex; flex-direction:column; gap:0.5rem;">
          ${linksHtml || '<p style="color:#9ca3af; font-size:0.875rem;">Nenhum link adicionado</p>'}
        </div>
      </div>

      <!-- Newsletter -->
      <div style="border:1px solid #374151; border-radius:0.75rem; background:#1f2937; padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:1rem; font-weight:600; color:#d1d5db;">Newsletter</h3>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Titulo</label>
          <input type="text" id="newsletterTitle" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
            value="${newsletter.title || ''}" placeholder="Ex: Receba Novidades">
        </div>
        <div>
          <label style="display:block; font-size:0.75rem; color:#9ca3af; margin-bottom:0.25rem;">Descricao</label>
          <input type="text" id="newsletterDesc" style="width:100%; padding:0.375rem 0.75rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6; font-size:0.875rem;"
            value="${newsletter.description || ''}" placeholder="Ex: Inscreva-se para atualizacoes exclusivas.">
        </div>
      </div>

      <button id="saveFooterBtn" style="background:#2563eb; color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
        Salvar
      </button>
    </div>
  `;

  // Adicionar link
  container.querySelector('#addLinkBtn').onclick = () => {
    quickLinks.push({ label: '', url: '' });
    renderFooter(container);
  };

  // Remover link
  window.removeFooterLink = async (idx) => {
    if (!confirm('Remover este link?')) return;
    quickLinks.splice(idx, 1);
    const currentFooter = { ...footer, quickLinks };
    appState.appData.footer = currentFooter;
    await saveAppData('footer', currentFooter, true);
    renderFooter(container);
  };

  // Salvar
  container.querySelector('#saveFooterBtn').onclick = async () => {
    // Coletar links
    const links = [];
    container.querySelectorAll('[data-link-label]').forEach((input, idx) => {
      const url = container.querySelector(`[data-link-url="${idx}"]`)?.value || '';
      links.push({ label: input.value, url });
    });

    const newFooter = {
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
      newsletter: {
        enabled: true,
        title: container.querySelector('#newsletterTitle').value,
        description: container.querySelector('#newsletterDesc').value
      }
    };
    await saveAppData('footer', newFooter);
  };
}
