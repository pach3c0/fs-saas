// unified-grid/styles.js — Injeção (única) dos estilos do grid unificado.
// Extraído de unified-photo-grid.js sem alteração de comportamento.

// ── Injeção de estilos (uma vez) ───────────────────────────────────────────
export function ensureStyles() {
  if (document.getElementById('cz-unified-grid-styles')) return;
  const s = document.createElement('style');
  s.id = 'cz-unified-grid-styles';
  s.textContent = `
    /* Lightbox */
    #czUGLightbox {
      position:fixed; inset:0; z-index:9999;
      background:rgba(0,0,0,0.88);
      backdrop-filter:saturate(180%) blur(18px);
      -webkit-backdrop-filter:saturate(180%) blur(18px);
      display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:1rem;
      animation:czUGFadeIn .22s ease;
    }
    @keyframes czUGFadeIn { from{opacity:0} to{opacity:1} }
    #czUGLightbox img {
      max-width:90vw; max-height:78vh; object-fit:contain;
      border-radius:var(--r-field);
      box-shadow:0 32px 80px rgba(0,0,0,.7);
      animation:czUGImgIn .2s cubic-bezier(.4,0,.2,1);
    }
    @keyframes czUGImgIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
    .cz-ug-btn {
      box-sizing:border-box;
      display:inline-flex; align-items:center;
      height:44px; min-width:44px; padding:0;
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.15); border-radius:9999px;
      color:white; cursor:pointer;
      overflow:hidden; white-space:nowrap;
      font-family:inherit; font-weight:500; font-size:.875rem;
      transition:background .2s, border-color .2s;
      backdrop-filter:blur(8px);
    }
    .cz-ug-btn:hover { background:rgba(255,255,255,.16); border-color:rgba(255,255,255,.35); }
    .cz-ug-btn .cz-ug-ic { width:44px; height:44px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
    .cz-ug-btn .cz-ug-lbl { overflow:hidden; padding-right:1rem; }
    .cz-ug-btn[disabled] { opacity:.3; cursor:not-allowed; }
    #czUGCounter { font-size:.75rem; color:rgba(255,255,255,.5); font-variant-numeric:tabular-nums; letter-spacing:.04em; }

    /* Pílula de upload da toolbar */
    .cz-ug-pill {
      box-sizing:border-box;
      display:inline-flex; align-items:center; gap:.5rem;
      height:36px; padding:0 1rem;
      border:1px solid var(--border); border-radius:9999px;
      cursor:pointer; font-weight:500; font-size:.8125rem;
      font-family:inherit; white-space:nowrap;
      transition:all .2s cubic-bezier(.4,0,.2,1);
      background:transparent; color:var(--text-primary);
    }
    .cz-ug-pill:not([disabled]):hover {
      background:color-mix(in srgb, var(--accent) 10%, var(--bg-surface));
      border-color:var(--accent); color:var(--accent);
      transform:translateY(-1px);
      box-shadow:0 4px 12px color-mix(in srgb, var(--accent) 15%, transparent);
    }
    .cz-ug-pill[disabled] { opacity:.45; cursor:not-allowed; }
    .cz-ug-pill.primary { background:var(--green); color:white; border-color:transparent; }
    .cz-ug-pill.primary:hover { filter:brightness(1.1); box-shadow:0 4px 14px color-mix(in srgb, var(--green) 30%, transparent); }

    /* Chip de filtro */
    .cz-ug-chip {
      padding:.2rem .55rem; border-radius:9999px;
      font-size:.75rem; font-weight:500; cursor:pointer;
      border:1px solid var(--border); background:transparent;
      color:var(--text-secondary); font-family:inherit;
      transition:background .15s, border-color .15s, color .15s;
    }
    .cz-ug-chip.active {
      background:color-mix(in srgb, var(--accent) 12%, transparent);
      border-color:color-mix(in srgb, var(--accent) 35%, transparent);
      color:var(--text-primary);
    }
    /* Chip de filtro por pessoa (face): thumb redonda + nome + contagem */
    .cz-ug-face-chip {
      display:inline-flex; align-items:center; gap:.35rem;
      padding:.2rem .55rem .2rem .25rem;
    }

    /* Bulk */
    .cz-ug-bulk {
      padding:.25rem .75rem; border-radius:9999px;
      font-size:.8125rem; font-weight:500; cursor:pointer;
      background:transparent; font-family:inherit;
      transition:border-color .15s, color .15s;
    }
    .cz-ug-bulk.danger { color:var(--red); border:1px solid var(--red); }
    .cz-ug-bulk.neutral { color:var(--text-primary); border:1px solid var(--border); }
  `;
  document.head.appendChild(s);
}
