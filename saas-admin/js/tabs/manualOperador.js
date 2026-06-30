// Manual do Operador — runbook interno do superadmin (somente leitura).
// Conteúdo versionado em Markdown (src/docs/manual-operador), servido por
// GET /api/admin/manual-operador. Distinto da aba "Manual" (que edita o manual
// do FOTÓGRAFO). Estilos via tokens CSS (dual-theme), Markdown via md.js.
import { apiRequest, saasToast, esc } from '../core.js';
import { renderMarkdown } from '../md.js';

let _sections = [];
let _activeSlug = null;

async function loadManualOperador() {
  const el = document.getElementById('tabManualOperador');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando manual...</div>';
  try {
    const data = await apiRequest('GET', '/api/admin/manual-operador');
    _sections = data.sections || [];
    if (!_sections.length) {
      el.innerHTML = '<div class="loading" style="color:var(--text-muted);">Nenhuma seção do manual cadastrada.</div>';
      return;
    }
    _activeSlug = _sections.some((s) => s.slug === _activeSlug) ? _activeSlug : _sections[0].slug;
    renderShell(el);
    await openSection(_activeSlug);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:var(--red);">Erro: ${esc(err.message)}</div>`;
  }
}

function renderShell(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div>
        <h2 style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin:0;">Manual do Operador</h2>
        <p style="font-size:0.78rem; color:var(--text-muted); margin:0.25rem 0 0;">
          Runbook interno do dono — só você (superadmin) vê. Não é o manual do fotógrafo.
        </p>
      </div>
      <div style="display:grid; grid-template-columns:220px 1fr; gap:1rem; align-items:start;">
        <!-- Índice de seções -->
        <nav id="moSections" style="display:flex; flex-direction:column; gap:0.25rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:0.5rem;">
          ${_sections.map((s) => sectionBtn(s)).join('')}
        </nav>
        <!-- Conteúdo -->
        <article id="moContent" class="agente-md"
          style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem 1.5rem; min-height:200px; font-size:0.85rem; color:var(--text-primary); line-height:1.6;">
          <div class="loading" style="color:var(--text-muted);">Carregando...</div>
        </article>
      </div>
    </div>
  `;
}

function sectionBtn(s) {
  const active = s.slug === _activeSlug;
  return `<button data-slug="${esc(s.slug)}" onclick="window.openManualOperadorSection('${esc(s.slug)}')"
    style="text-align:left; cursor:pointer; border:none; border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.8125rem; font-family:inherit;
    background:${active ? 'var(--accent-soft)' : 'transparent'}; color:${active ? 'var(--accent)' : 'var(--text-secondary)'}; font-weight:${active ? '600' : '400'};">
    ${esc(s.title)}</button>`;
}

async function openSection(slug) {
  _activeSlug = slug;
  // realça o item ativo no índice sem re-renderizar tudo
  document.querySelectorAll('#moSections [data-slug]').forEach((btn) => {
    const on = btn.getAttribute('data-slug') === slug;
    btn.style.background = on ? 'var(--accent-soft)' : 'transparent';
    btn.style.color = on ? 'var(--accent)' : 'var(--text-secondary)';
    btn.style.fontWeight = on ? '600' : '400';
  });
  const content = document.getElementById('moContent');
  if (content) content.innerHTML = '<div class="loading" style="color:var(--text-muted);">Carregando...</div>';
  try {
    const data = await apiRequest('GET', `/api/admin/manual-operador/${encodeURIComponent(slug)}`);
    if (content) content.innerHTML = renderMarkdown(data.section?.markdown || '');
  } catch (err) {
    if (content) content.innerHTML = `<div style="color:var(--red);">Erro ao carregar a seção: ${esc(err.message)}</div>`;
    saasToast('Erro: ' + err.message, 'error');
  }
}

window.openManualOperadorSection = (slug) => { openSection(slug); };

export { loadManualOperador };
