import { appState } from '../state.js';

// Mapeamento de categorias para exibição amigável
const CATEGORY_LABELS = {
  dashboard: 'Painel / Visão Geral',
  clientes: 'Clientes',
  sessoes: 'Sessões & Galerias',
  portfolio: 'Meu Site (Portfólio)',
  crm_financeiro: 'CRM & Financeiro'
};

const CATEGORY_ICONS = {
  all: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  dashboard: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  clientes: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  sessoes: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  portfolio: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  crm_financeiro: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
};

const LEVEL_COLORS = {
  'Básico': { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
  'Intermediário': { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' },
  'Avançado': { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
};

let allTutorials = [];
let currentCategory = 'all';
let searchQuery = '';
let activeTutorial = null;
let ajudaView = 'tutorials'; // 'tutorials' | 'manual' | 'fala-conosco'
let openSections = { dashboard: true };
let activeManualModules = [];
let allTickets = [];
let ticketListView = 'list'; // 'list' | 'thread'
let activeTicketId = null;
let activeServico = null; // null = grid de serviços | id = tela de detalhe

export async function renderAjuda(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem; padding:1rem 0;">
      <div class="skeleton" style="height:40px; width:250px; border-radius:6px;"></div>
      <div class="skeleton" style="height:20px; width:350px; border-radius:6px;"></div>
      <div class="skeleton" style="height:350px; width:100%; border-radius:8px; margin-top:1rem;"></div>
    </div>
  `;

  // Buscar tutoriais do backend
  try {
    const res = await fetch('/api/tutorials', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const json = await res.json();
    if (json.success) {
      allTutorials = json.tutorials || [];
    }
  } catch (error) {
    window.showToast?.('Erro ao carregar tutoriais', 'error');
  }

  // Buscar manual do backend (fallback para estático)
  try {
    const mRes = await fetch('/api/manual', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    const mJson = await mRes.json();
    if (mJson.success && mJson.modules && mJson.modules.length > 0) {
      activeManualModules = mJson.modules;
    } else {
      activeManualModules = MANUAL_MODULES_STATIC;
    }
  } catch (error) {
    activeManualModules = MANUAL_MODULES_STATIC;
  }

  // Renderizar layout principal
  renderLayout(container);
}

function renderLayout(container) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.style.cssText = 'display:flex; flex-direction:column; gap:2rem; max-width:1100px; margin:0 auto; width:100%;';

  // Sub-navegação: Tutoriais em Vídeo | Manual do Usuário | Fala Conosco
  const subNav = document.createElement('div');
  subNav.style.cssText = 'display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;';
  subNav.innerHTML = `
    <button class="morph-tab ${ajudaView==='tutorials'?'active':''}" onclick="window._setAjudaView('tutorials')">
      <div class="morph-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
      <span class="morph-label">Tutoriais em Vídeo</span>
    </button>
    <button class="morph-tab ${ajudaView==='manual'?'active':''}" onclick="window._setAjudaView('manual')">
      <div class="morph-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <span class="morph-label">Manual do Usuário</span>
    </button>
    <button class="morph-tab ${ajudaView==='fala-conosco'?'active':''}" onclick="window._setAjudaView('fala-conosco')">
      <div class="morph-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
      <span class="morph-label">Fala Conosco</span>
    </button>
    <button class="morph-tab ${ajudaView==='servicos'?'active':''}" onclick="window._setAjudaView('servicos')">
      <div class="morph-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
      <span class="morph-label">Serviços Extras</span>
    </button>
  `;
  root.appendChild(subNav);

  // Renderizar Fala Conosco
  if (ajudaView === 'fala-conosco') {
    const ticketsEl = document.createElement('div');
    ticketsEl.id = 'fala-conosco-container';
    root.appendChild(ticketsEl);
    container.appendChild(root);
    renderFalaConosco(ticketsEl);
    return;
  }

  // Renderizar Serviços Extras
  if (ajudaView === 'servicos') {
    const servicosEl = document.createElement('div');
    servicosEl.innerHTML = activeServico
      ? renderServicoDetalheHTML(activeServico)
      : renderServicosGridHTML();
    root.appendChild(servicosEl);
    container.appendChild(root);
    return;
  }

  // Renderizar Manual do Usuário
  if (ajudaView === 'manual') {
    const manualEl = document.createElement('div');
    manualEl.innerHTML = renderManualHTML();
    root.appendChild(manualEl);
    container.appendChild(root);
    root.querySelectorAll('[data-manual-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.manualToggle;
        openSections[id] = !openSections[id];
        const body  = document.getElementById(`manual-body-${id}`);
        const arrow = document.getElementById(`manual-arrow-${id}`);
        if (body)  body.style.display = openSections[id] ? 'block' : 'none';
        if (arrow) arrow.style.transform = openSections[id] ? 'rotate(90deg)' : 'rotate(0deg)';
      });
    });
    return;
  }

  // 1. Cabeçalho Principal
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; flex-direction:column; align-items:center; text-align:center; gap:1.5rem; border-bottom:1px solid var(--border); padding-bottom:1.5rem;';
  header.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center;">
      <h2 style="font-size:1.75rem; font-weight:800; color:var(--text-primary); margin:0 0 0.375rem 0; font-family:inherit;">CliqueZoom Academy</h2>
      <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Aprenda a dominar a plataforma com tutoriais práticos em vídeo</p>
    </div>
    <div style="position:relative; width:100%; max-width:320px;">
      <svg style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); width:16px; height:16px; color:var(--text-muted);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="tutorialSearch" placeholder="Buscar tutoriais..." value="${searchQuery}"
        style="width:100%; padding:0.5rem 1rem 0.5rem 2.25rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; color:var(--text-primary); font-size:0.875rem; outline:none; transition:border-color 0.2s; font-family:inherit;">
    </div>
  `;
  root.appendChild(header);

  // 2. Player de Cinema / Destaque
  const playerSection = document.createElement('div');
  playerSection.id = 'cz-academy-player-section';
  playerSection.style.cssText = 'width:100%;';
  root.appendChild(playerSection);

  // Se houver tutoriais e nenhum estiver ativo, definir o primeiro como ativo por padrão
  if (allTutorials.length > 0 && !activeTutorial) {
    activeTutorial = allTutorials[0];
  }

  // 3. Barra de Categorias (Filtros)
  const filterBar = document.createElement('div');
  filterBar.className = 'tutorial-filters';
  filterBar.style.cssText = 'display:flex; gap:0.5rem; justify-content:center; overflow-x:auto; padding-bottom:0.5rem; scrollbar-width:none;';
  filterBar.innerHTML = `
    <button class="morph-tab ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">
      <div class="morph-icon">${CATEGORY_ICONS['all']}</div>
      <span class="morph-label">Todos</span>
    </button>
    ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
      <button class="morph-tab ${currentCategory === key ? 'active' : ''}" data-cat="${key}">
        <div class="morph-icon">${CATEGORY_ICONS[key] || CATEGORY_ICONS['all']}</div>
        <span class="morph-label">${label}</span>
      </button>
    `).join('')}
  `;
  root.appendChild(filterBar);

  // Injetar estilos CSS específicos para esta aba
  const styles = document.createElement('style');
  styles.innerHTML = `
    /* Morph Button - Ação Principal */
    .morph-btn-main {
      box-sizing: border-box;
      display: inline-flex !important;
      align-items: center;
      gap: 0 !important;
      height: 44px !important;
      width: auto !important;
      min-width: 44px !important;
      flex-shrink: 0 !important;
      padding: 0 !important;
      border: 1px solid var(--border) !important;
      border-radius: 9999px !important;
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
      background: var(--bg-elevated) !important;
      color: var(--text-secondary) !important;
      transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.2s;
      font-family: inherit;
      font-weight: 600;
      font-size: 0.875rem;
    }
    .morph-btn-main:hover {
      border-color: var(--text-primary) !important;
      color: var(--text-primary) !important;
    }
    .morph-btn-main:active {
      transform: scale(0.95);
    }
    .morph-btn-main .morph-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .morph-btn-main .morph-label {
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle;
      transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .morph-btn-main:hover .morph-label {
      max-width: 14rem;
      opacity: 1;
      padding-right: 1.25rem;
    }
    
    /* Morph Tab - Sub-Navegação e Filtros */
    .morph-tab {
      box-sizing: border-box;
      display: inline-flex !important;
      align-items: center;
      gap: 0 !important;
      height: 36px !important;
      width: auto !important;
      min-width: 36px !important;
      flex-shrink: 0 !important;
      padding: 0 !important;
      border: 1px solid var(--border);
      border-radius: 9999px !important;
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
      background: var(--bg-surface);
      color: var(--text-secondary);
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .morph-tab.active {
      border-color: var(--text-primary);
      color: var(--text-primary);
    }
    .morph-tab .morph-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex-shrink: 0;
    }
    .morph-tab .morph-label {
      max-width: 0;
      opacity: 0;
      overflow: hidden;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle;
      transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .morph-tab:hover .morph-label,
    .morph-tab.active .morph-label {
      max-width: 14rem;
      opacity: 1;
      padding-right: 1rem;
    }

    .tutorial-card {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      height: 100%;
      position: relative;
    }
    .tutorial-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }
    .tutorial-card:hover .play-overlay {
      opacity: 1 !important;
      transform: translate(-50%, -50%) scale(1.1) !important;
    }
    .tutorial-card.playing {
      border: 2px solid var(--accent);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
    }
    #tutorialSearch:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
  `;
  document.head.appendChild(styles);

  // 4. Grid de Tutoriais
  const gridContainer = document.createElement('div');
  gridContainer.id = 'cz-academy-grid';
  gridContainer.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1.5rem;';
  root.appendChild(gridContainer);

  container.appendChild(root);

  // Event Listeners
  document.getElementById('tutorialSearch').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterAndRenderGrid();
  });

  // 4. Delegação de Eventos para os botões de Filtro
  filterBar.querySelectorAll('.morph-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBar.querySelectorAll('.morph-tab').forEach(b => b.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      currentCategory = target.getAttribute('data-cat');
      filterAndRenderGrid();
    });
  });

  // Render inicial do player e do grid (root já está no DOM)
  updatePlayer();
  filterAndRenderGrid();
}

function updatePlayer() {
  const playerWrap = document.getElementById('cz-academy-player-section');
  if (!playerWrap) return;

  if (!activeTutorial) {
    playerWrap.innerHTML = `
      <div style="background:var(--bg-surface); border:1px dashed var(--border); border-radius:12px; height:320px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1rem; color:var(--text-secondary);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.6;"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        <p style="font-weight:600; font-size:0.9375rem; margin:0;">Nenhum tutorial cadastrado ou ativo.</p>
      </div>
    `;
    return;
  }

  const levelInfo = LEVEL_COLORS[activeTutorial.level] || { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-secondary)' };

  playerWrap.innerHTML = `
    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; display:grid; grid-template-columns:1.5fr 1fr; gap:0; box-shadow:0 10px 30px rgba(0,0,0,0.15); min-height:360px;">
      <!-- Lado Esquerdo: Player de Vídeo -->
      <div style="background:#000000; aspect-ratio:16/9; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
        <iframe src="https://www.youtube.com/embed/${activeTutorial.youtubeId}?rel=0&modestbranding=1"
          style="width:100%; height:100%; border:none;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>

      <!-- Lado Direito: Informações do Vídeo -->
      <div style="padding:2rem; display:flex; flex-direction:column; justify-content:space-between; gap:1.5rem; background:linear-gradient(to bottom, var(--bg-surface), var(--bg-elevated));">
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <span style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; background:rgba(99, 102, 241, 0.15); color:var(--accent); padding:0.2rem 0.625rem; border-radius:9999px;">
              ${CATEGORY_LABELS[activeTutorial.category] || activeTutorial.category}
            </span>
            <span style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; background:${levelInfo.bg}; color:${levelInfo.text}; padding:0.2rem 0.625rem; border-radius:9999px;">
              ${activeTutorial.level || 'Básico'}
            </span>
          </div>

          <h3 style="font-size:1.375rem; font-weight:800; color:var(--text-primary); margin:0.25rem 0 0 0; line-height:1.3;">
            ${activeTutorial.title}
          </h3>

          <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.6; margin:0.5rem 0 0 0; max-height:150px; overflow-y:auto; scrollbar-width:thin;">
            ${activeTutorial.description || 'Sem descrição.'}
          </p>
        </div>

        <div style="display:flex; align-items:center; gap:1rem; border-top:1px solid var(--border); padding-top:1.25rem; margin-top:auto;">
          <div style="display:flex; align-items:center; gap:0.375rem; color:var(--text-muted); font-size:0.8125rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style="font-weight:600; color:var(--text-secondary);">${activeTutorial.duration || '0 min'}</span>
          </div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-left:auto; display:flex; align-items:center; gap:0.25rem;">
            <span style="width:6px; height:6px; border-radius:50%; background:#22c55e;"></span>
            Reproduzindo interno
          </div>
        </div>
      </div>
    </div>
  `;
}

function filterAndRenderGrid() {
  const grid = document.getElementById('cz-academy-grid');
  if (!grid) return;

  const filtered = allTutorials.filter(t => {
    // Filtro por categoria
    if (currentCategory !== 'all' && t.category !== currentCategory) return false;
    
    // Filtro por busca
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = (t.description || '').toLowerCase().includes(q);
      return titleMatch || descMatch;
    }
    
    return true;
  });

  // Ordenar por 'order' crescente
  filtered.sort((a, b) => (a.order || 0) - (b.order || 0));

  if (filtered.length === 0) {
    grid.style.display = 'block';
    grid.innerHTML = `
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:3rem; text-align:center; color:var(--text-secondary); width:100%;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:0.75rem; opacity:0.5;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style="font-weight:600; font-size:0.875rem; margin:0;">Nenhum tutorial encontrado para os filtros atuais.</p>
      </div>
    `;
    return;
  }

  grid.style.display = 'grid';
  grid.innerHTML = filtered.map(t => {
    const isPlaying = activeTutorial && activeTutorial._id === t._id;
    const levelInfo = LEVEL_COLORS[t.level] || { bg: 'rgba(255,255,255,0.1)', text: 'var(--text-secondary)' };

    return `
      <div class="tutorial-card ${isPlaying ? 'playing' : ''}" data-id="${t._id}">
        <!-- Thumbnail -->
        <div style="position:relative; width:100%; aspect-ratio:16/9; background:#000000; overflow:hidden; flex-shrink:0;">
          <img src="https://img.youtube.com/vi/${t.youtubeId}/0.jpg" alt="${t.title}"
            style="width:100%; height:100%; object-fit:cover; opacity:0.75; transition:transform 0.3s;"
            onload="this.style.opacity=0.85;"
            onerror="this.style.display='none';">
          
          <!-- Play Overlay -->
          <div class="play-overlay" style="position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); width:36px; height:36px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; color:var(--accent-on, #ffffff); opacity:0.85; transition:all 0.2s ease; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>

        <!-- Info -->
        <div style="padding:1rem; display:flex; flex-direction:column; align-items:center; text-align:center; gap:0.5rem; flex:1;">
          <div style="display:flex; justify-content:center; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">
              ${CATEGORY_LABELS[t.category] || t.category}
            </span>
            <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; background:${levelInfo.bg}; color:${levelInfo.text}; padding:0.1rem 0.375rem; border-radius:4px;">
              ${t.level || 'Básico'}
            </span>
            <span style="font-size:0.625rem; font-weight:700; color:var(--text-secondary); background:var(--bg-elevated); padding:0.1rem 0.375rem; border-radius:4px;">
              ${t.duration || '0 min'}
            </span>
          </div>

          <h4 style="font-size:0.875rem; font-weight:700; color:var(--text-primary); margin:0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${t.title}
          </h4>

          <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.5; margin:0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin-top:0.25rem;">
            ${t.description || 'Sem descrição.'}
          </p>
        </div>
      </div>
    `;
  }).join('');

  // Adicionar eventos de click nos cards
  grid.querySelectorAll('.tutorial-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const selected = allTutorials.find(item => item._id === id);
      if (selected) {
        activeTutorial = selected;
        updatePlayer();
        
        // Rolar suavemente de volta para o player
        document.getElementById('cz-academy-player-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Atualizar estado de ativo no grid
        grid.querySelectorAll('.tutorial-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
      }
    });
  });
}

// ─── Manual do Usuário ────────────────────────────────────────────────────────

const MANUAL_MODULES_STATIC = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          O Dashboard é a tela inicial do seu negócio. Ele exibe um resumo imediato: <strong style="color:var(--text-primary);">métricas-chave (KPIs)</strong>, suas <strong style="color:var(--text-primary);">sessões recentes</strong> e <strong style="color:var(--text-primary);">atalhos rápidos</strong> para as ações mais frequentes.
        </p>

        <!-- ── VISUALIZAÇÃO DAS TELAS ───────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização das Telas</p>

          <!-- ─ ONBOARDING ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">CHECKLIST DE INÍCIO (ONBOARDING)</p>
            <div style="border:1px solid var(--accent); border-radius:12px; border-left:4px solid var(--accent); background:var(--bg-surface); padding:1.5rem; pointer-events:none;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                <div>
                  <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin:0;">Comece por aqui</h3>
                  <p style="color:var(--text-secondary); font-size:0.875rem; margin-top:0.25rem;">Complete estes passos para dominar o CliqueZoom.</p>
                </div>
                <span style="color:var(--text-muted); text-decoration:underline; font-size:0.875rem;">Ocultar guia</span>
              </div>
              <div style="margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.5rem; font-weight:600;">
                  <span>Progresso do Setup</span>
                  <span>66%</span>
                </div>
                <div style="height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
                  <div style="height:100%; width:66%; background:var(--accent);"></div>
                </div>
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1rem;">
                <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-elevated); border-radius:8px; opacity:0.6;">
                  <div style="width:20px; height:20px; border-radius:50%; border:2px solid var(--green); background:var(--green); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary); text-decoration:line-through;">Criar sua primeira sessão</div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.15rem;">Concluído!</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-elevated); border-radius:8px; opacity:0.6;">
                  <div style="width:20px; height:20px; border-radius:50%; border:2px solid var(--green); background:var(--green); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary); text-decoration:line-through;">Subir as primeiras fotos</div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.15rem;">Concluído!</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem; background:var(--bg-elevated); border-radius:8px;">
                  <div style="width:20px; height:20px; border-radius:50%; border:2px solid var(--border); background:transparent; display:flex; align-items:center; justify-content:center; flex-shrink:0;"></div>
                  <div>
                    <div style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Enviar link de acesso</div>
                    <div style="font-size:0.7rem; color:var(--text-secondary); margin-top:0.15rem;">Mande o código de acesso por e-mail • <span style="color:var(--accent); text-decoration:underline;">Ver Tutorial</span></div>
                  </div>
                </div>
              </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">O onboarding aparece automaticamente para novos usuários e tem três passos: criar a primeira sessão, subir as primeiras fotos e enviar o link de acesso. Ele é inteligente e risca os passos conforme você utiliza a plataforma. Você pode ocultá-lo a qualquer momento.</p>
          </div>

          <!-- ─ INDICADORES (KPI) ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">INDICADORES DE PERFORMANCE (KPIs)</p>
            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:1rem; pointer-events:none;">
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem;">
                <div style="width:44px; height:44px; border-radius:10px; background:var(--bg-elevated); color:var(--accent); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <div>
                  <div style="font-size:0.8125rem; color:var(--text-secondary); font-weight:500;">Total de Sessões</div>
                  <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">12</div>
                </div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem;">
                <div style="width:44px; height:44px; border-radius:10px; background:var(--bg-elevated); color:var(--orange); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div>
                  <div style="font-size:0.8125rem; color:var(--text-secondary); font-weight:500;">Fotos Upadas</div>
                  <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">480</div>
                </div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem;">
                <div style="width:44px; height:44px; border-radius:10px; background:var(--bg-elevated); color:var(--orange); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>
                </div>
                <div>
                  <div style="font-size:0.8125rem; color:var(--text-secondary); font-weight:500;">Espaço Usado</div>
                  <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">1.2 GB</div>
                </div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem;">
                <div style="width:44px; height:44px; border-radius:10px; background:var(--bg-elevated); color:var(--green); display:flex; align-items:center; justify-content:center; border:1px solid var(--border);">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <div style="font-size:0.8125rem; color:var(--text-secondary); font-weight:500;">Entregues</div>
                  <div style="font-size:1.5rem; font-weight:700; color:var(--text-primary);">8</div>
                </div>
              </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">São quatro métricas principais: Total de Sessões (criadas), Fotos Upadas (quantidade), Espaço Usado (em MB ou GB, conforme o volume) e Sessões marcadas como "Entregue".</p>
          </div>

          <!-- ─ SESSÕES E AÇÕES ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">SESSÕES RECENTES E AÇÕES RÁPIDAS</p>
            <div style="display:flex; gap:1.5rem; flex-wrap:wrap;">
              <div style="flex:1; min-width:280px; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; pointer-events:none;">
                <div style="padding:1.25rem; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                  <h3 style="font-size:1rem; font-weight:600; color:var(--text-primary); margin:0;">Sessões Recentes</h3>
                  <span style="color:var(--accent); font-size:0.875rem;">Ver todas</span>
                </div>
                <div style="padding:1rem 1.25rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:1rem;">
                  <div style="width:40px; height:40px; border-radius:8px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                  <div style="flex:1;">
                    <div style="font-weight:600; color:var(--text-primary);">Casamento Silva & Ana</div>
                    <div style="font-size:0.75rem; color:var(--text-secondary);">12 Mai 2025 • Seleção</div>
                  </div>
                  <div style="padding:0.25rem 0.625rem; border-radius:20px; font-size:0.75rem; font-weight:600; background:rgba(63,185,80,0.15); color:var(--green);">Entregue</div>
                </div>
              </div>
              <div style="width:280px; flex-shrink:0; pointer-events:none; display:flex; flex-direction:column; gap:1rem;">
                <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin:0;">Ações Rápidas</h3>
                <div style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary);">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(47,129,247,0.15); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                  </div>
                  <span style="font-weight:500;">Nova Sessão</span>
                </div>
                <div style="display:flex; align-items:center; gap:0.75rem; width:100%; padding:1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:10px; color:var(--text-primary);">
                  <div style="width:32px; height:32px; border-radius:8px; background:rgba(47,129,247,0.1); color:var(--accent); display:flex; align-items:center; justify-content:center;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                  <span style="font-weight:500;">Ver meu Site</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Acompanhar saúde do negócio', desc:'Logo ao entrar, bata o olho nos Indicadores (KPIs) para saber quantas fotos e quanto espaço você está usando, assim como a conversão (sessões entregues vs criadas).' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Finalizar o Onboarding',      desc:'Se sua conta é nova, siga os passos do Checklist de Início. O clique em "Ver Tutorial" leva você diretamente para o vídeo explicativo do módulo associado.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Checar Sessões Recentes',     desc:'A lista Sessões Recentes mostra as últimas 5 criadas. Você pode clicar diretamente em qualquer linha para abrir o Wizard da sessão e continuar seu fluxo de onde parou.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Nova Sessão (Ação Rápida)',   desc:'A forma mais rápida de iniciar um novo trabalho é clicando no botão "Nova Sessão" nas Ações Rápidas. Ele já abre o modal de criação sem precisar trocar de aba.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Ir para o Site Público',      desc:'Clique em "Ver meu Site" para abrir uma nova aba com a vitrine pública do seu portfólio (criada e editada no menu "Meu Site").' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem; ${i < arr.length - 1 ? 'padding-bottom:0;' : ''}">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:20px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `
  },
  {
    id: 'sessoes',
    label: 'Sessões',
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          O módulo Sessões é o coração do seu trabalho. Ao criar uma sessão você escolhe um <strong style="color:var(--text-primary);">modo de entrega</strong> — e é esse modo que define todo o fluxo, desde o upload das fotos até a experiência do cliente na galeria.
        </p>
        <div style="background:color-mix(in srgb, var(--accent) 7%, transparent); border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:8px; padding:0.75rem 1rem; font-size:0.8125rem; color:var(--text-secondary); line-height:1.6;">
          <strong style="color:var(--text-primary);">Como funciona o wizard:</strong> cada sessão aparece como um card na lista. <strong style="color:var(--text-primary);">Clique em qualquer parte do card</strong> para abrir o wizard — um painel fullscreen com três áreas: a <strong style="color:var(--text-primary);">barra de passos</strong> à esquerda, o <strong style="color:var(--text-primary);">conteúdo do passo ativo</strong> no centro e, à direita, o <strong style="color:var(--text-primary);">painel de Configurações</strong> sempre visível (pacote, resolução, prazo, preço de extras, armazenamento e mais), que <strong style="color:var(--text-primary);">salva sozinho</strong> a cada alteração. Você avança passo a passo: o sistema bloqueia os próximos até você concluir o atual. No topo do wizard: 🔔 notificações da sessão · 📋 histórico completo · 🗑️ excluir · ✕ fechar.
        </div>

        <!-- ── VISUALIZAÇÃO DAS TELAS ───────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização das Telas</p>

          <!-- ─ CARDS DA LISTA ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">LISTA DE SESSÕES — 3 MODOS</p>
            <div style="display:flex; flex-direction:column; gap:0.75rem; pointer-events:none;">

              <!-- Card Seleção — em seleção -->
              <div style="border:1px solid color-mix(in srgb, var(--green) 15%, transparent); border-radius:0.75rem; padding:1rem; background:color-mix(in srgb, var(--green) 4%, transparent); cursor:pointer;">
                <div style="display:flex; gap:1rem; align-items:flex-start;">
                  <div style="width:80px; height:80px; flex-shrink:0; border-radius:0.5rem; background:var(--bg-base); border:1px solid var(--border); display:flex; align-items:center; justify-content:center;">
                    <span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                      <span style="color:var(--text-primary); font-size:1.125rem; font-weight:700; text-decoration:underline dotted; text-underline-offset:4px;">Casamento Ribeiro</span>
                      <span style="color:var(--green); font-size:0.875rem; display:flex; align-items:center; gap:0.2rem; text-decoration:underline dotted;">
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>Ana Ribeiro
                      </span>
                      <span style="background:color-mix(in srgb, var(--yellow) 18%, transparent); border:1px solid color-mix(in srgb, var(--yellow) 35%, transparent); color:var(--yellow); font-size:0.6875rem; padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:600;">Em seleção</span>
                      <span style="background:color-mix(in srgb, var(--purple) 15%, transparent); border:1px solid color-mix(in srgb, var(--purple) 30%, transparent); color:var(--purple); font-size:0.6875rem; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:500;">Casamento</span>
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.75rem;">15/05/2026 · 48 fotos · 22/30 selecionadas · Prazo: 30/05/2026</div>
                  </div>
                </div>
                <!-- Stepper -->
                <div style="border-top:1px solid var(--border); margin-top:0.625rem; padding-top:0.5rem;">
                  <div style="display:flex; align-items:flex-start; margin-bottom:0.4rem;">
                    ${['Criada','Fotos','Link','Seleção','Entregue'].map((l, i) => {
                      const done = i < 3;
                      const active = i === 3;
                      const color = done ? 'var(--green)' : (active ? 'var(--accent)' : 'var(--border)');
                      const icon = done ? '✓' : (active ? '›' : '');
                      const parts = [`<div style="display:flex;flex-direction:column;align-items:center;gap:0.125rem;"><div style="width:1.1rem;height:1.1rem;border-radius:50%;background:${color};color:#fff;font-size:0.5rem;display:flex;align-items:center;justify-content:center;font-weight:700;">${icon}</div><span style="font-size:0.5rem;color:${done||active?'var(--text-primary)':'var(--text-muted)'};white-space:nowrap;">${l}</span></div>`];
                      if (i < 4) parts.push(`<div style="flex:1;height:1px;background:${done?'var(--green)':'var(--border)'};margin-top:0.5rem;"></div>`);
                      return parts.join('');
                    }).join('')}
                  </div>
                  <span style="font-size:0.6875rem; background:color-mix(in srgb, var(--yellow) 12%, transparent); border:1px solid color-mix(in srgb, var(--yellow) 30%, transparent); color:var(--yellow); padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:500;">⏳ Aguardando seleção do cliente</span>
                </div>
              </div>

              <!-- Card Galeria — entregue -->
              <div style="border:1px solid color-mix(in srgb, var(--purple) 15%, transparent); border-radius:0.75rem; padding:1rem; background:color-mix(in srgb, var(--purple) 4%, transparent); cursor:pointer;">
                <div style="display:flex; gap:1rem; align-items:flex-start;">
                  <div style="width:80px; height:80px; flex-shrink:0; border-radius:0.5rem; background:var(--bg-base); border:1px solid var(--border); display:flex; align-items:center; justify-content:center;">
                    <span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                      <span style="color:var(--text-primary); font-size:1.125rem; font-weight:700; text-decoration:underline dotted; text-underline-offset:4px;">Evento Corporativo XYZ</span>
                      <span style="background:color-mix(in srgb, var(--accent) 12%, transparent); border:1px solid color-mix(in srgb, var(--accent) 30%, transparent); color:var(--text-primary); font-size:0.6875rem; padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:600;">Entregue</span>
                      <span style="background:color-mix(in srgb, var(--purple) 15%, transparent); border:1px solid color-mix(in srgb, var(--purple) 30%, transparent); color:var(--purple); font-size:0.6875rem; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:500;">Corporativo</span>
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.75rem;">20/05/2026 · 45 fotos</div>
                  </div>
                </div>
                <div style="border-top:1px solid var(--border); margin-top:0.625rem; padding-top:0.5rem;">
                  <div style="display:flex; align-items:flex-start; margin-bottom:0.4rem;">
                    ${['Criada','Fotos','Link','Entregue'].map((l, i) => {
                      const done = true;
                      const color = 'var(--green)';
                      const parts = [`<div style="display:flex;flex-direction:column;align-items:center;gap:0.125rem;"><div style="width:1.1rem;height:1.1rem;border-radius:50%;background:${color};color:#fff;font-size:0.5rem;display:flex;align-items:center;justify-content:center;font-weight:700;">✓</div><span style="font-size:0.5rem;color:var(--text-primary);white-space:nowrap;">${l}</span></div>`];
                      if (i < 3) parts.push(`<div style="flex:1;height:1px;background:var(--green);margin-top:0.5rem;"></div>`);
                      return parts.join('');
                    }).join('')}
                  </div>
                  <span style="font-size:0.6875rem; background:color-mix(in srgb, var(--green) 12%, transparent); border:1px solid color-mix(in srgb, var(--green) 30%, transparent); color:var(--green); padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:500;">✓ Sessão concluída</span>
                </div>
              </div>

              <!-- Card Multi-Seleção — com reabertura e participantes -->
              <div style="border:1px solid color-mix(in srgb, var(--orange) 15%, transparent); border-radius:0.75rem; padding:1rem; background:color-mix(in srgb, var(--orange) 4%, transparent); cursor:pointer;">
                <div style="display:flex; gap:1rem; align-items:flex-start;">
                  <div style="width:80px; height:80px; flex-shrink:0; border-radius:0.5rem; background:var(--bg-base); border:1px solid var(--border); display:flex; align-items:center; justify-content:center;">
                    <span style="color:var(--text-muted); font-size:0.625rem; text-align:center;">Sem capa</span>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.25rem;">
                      <span style="color:var(--text-primary); font-size:1.125rem; font-weight:700; text-decoration:underline dotted; text-underline-offset:4px;">Formatura Turma 2026</span>
                      <span style="background:color-mix(in srgb, var(--yellow) 18%, transparent); border:1px solid color-mix(in srgb, var(--yellow) 35%, transparent); color:var(--yellow); font-size:0.6875rem; padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:600;">Em seleção</span>
                      <span style="background:color-mix(in srgb, var(--purple) 15%, transparent); border:1px solid color-mix(in srgb, var(--purple) 30%, transparent); color:var(--purple); font-size:0.6875rem; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:500;">Formatura</span>
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.75rem;">18/05/2026 · 120 fotos · 8 participantes · Prazo: 10/06/2026</div>
                  </div>
                </div>
                <div style="border-top:1px solid var(--border); margin-top:0.625rem; padding-top:0.5rem;">
                  <div style="display:flex; align-items:flex-start; margin-bottom:0.4rem;">
                    ${['Criada','Fotos','Link','Seleção','Entregue'].map((l, i) => {
                      const done = i < 2;
                      const active = i === 2;
                      const color = done ? 'var(--green)' : (active ? 'var(--accent)' : 'var(--border)');
                      const icon = done ? '✓' : (active ? '›' : '');
                      const parts = [`<div style="display:flex;flex-direction:column;align-items:center;gap:0.125rem;"><div style="width:1.1rem;height:1.1rem;border-radius:50%;background:${color};color:#fff;font-size:0.5rem;display:flex;align-items:center;justify-content:center;font-weight:700;">${icon}</div><span style="font-size:0.5rem;color:${done||active?'var(--text-primary)':'var(--text-muted)'};white-space:nowrap;">${l}</span></div>`];
                      if (i < 4) parts.push(`<div style="flex:1;height:1px;background:${done?'var(--green)':'var(--border)'};margin-top:0.5rem;"></div>`);
                      return parts.join('');
                    }).join('')}
                  </div>
                  <span style="font-size:0.6875rem; background:color-mix(in srgb, var(--accent) 12%, transparent); border:1px solid color-mix(in srgb, var(--accent) 30%, transparent); color:var(--text-primary); padding:0.15rem 0.5rem; border-radius:0.25rem; font-weight:500;">→ Envie o link ao cliente</span>
                </div>
              </div>

            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Clique em qualquer parte do card para abrir o wizard. A borda e o fundo do card mudam de cor por modo: <strong style="color:var(--green);">verde = Seleção</strong>, <strong style="color:var(--purple);">roxo = Galeria</strong>, <strong style="color:var(--orange);">laranja = Multi-Seleção</strong>.</p>
          </div>

          <!-- ─ WIZARD SELEÇÃO ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">WIZARD — MODO SELEÇÃO (PASSO 1 ATIVO)</p>
            <div style="border:1px solid var(--border); border-radius:0.75rem; overflow:hidden; background:var(--bg-base); pointer-events:none;">
              <!-- Header do wizard -->
              <div style="padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:0.75rem;">
                <div style="flex:1; display:flex; align-items:center; gap:0.5rem; min-width:0;">
                  <strong style="font-size:1rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Casamento Ribeiro</strong>
                  <span style="color:var(--text-muted);">·</span>
                  <span style="color:var(--text-secondary); font-size:0.875rem;">Ana Ribeiro</span>
                </div>
                <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                  ${['🔔','📋','🗑️','✕'].map(ic => `<div style="width:32px; height:32px; border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${ic}</div>`).join('')}
                </div>
              </div>
              <!-- Body: sidebar + conteúdo + config -->
              <div style="display:flex; min-height:450px;">
                <!-- Sidebar -->
                <div style="width:240px; flex-shrink:0; background:var(--bg-surface); border-right:1px solid var(--border); padding:1.25rem 0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                  <div style="font-size:0.6875rem; font-weight:600; letter-spacing:0.1em; color:var(--text-muted); padding:0 0.75rem 0.75rem; text-transform:uppercase;">ETAPAS</div>
                  ${[
                    { id:1, label:'Upload',       desc:'Suba as fotos brutas',       done:false, current:true,  locked:false },
                    { id:2, label:'Compartilhar', desc:'Código e envio ao cliente',  done:false, current:false, locked:true  },
                    { id:4, label:'Acompanhar',   desc:'Monitore a seleção',         done:false, current:false, locked:true  },
                    { id:5, label:'Editadas',     desc:'Suba as fotos finais',       done:false, current:false, locked:true  },
                    { id:6, label:'Entregar',     desc:'Libere o download',          done:false, current:false, locked:true  }
                  ].map((s,idx) => {
                    const circleBg = s.done ? 'var(--green)' : (s.current ? 'var(--accent)' : 'var(--bg-base)');
                    const circleColor = (s.done || s.current) ? 'white' : 'var(--text-muted)';
                    const circleBorder = (s.done || s.current) ? 'none' : '1px solid var(--border)';
                    const circleContent = s.done ? '✓' : (s.locked && !s.current ? '🔒' : String(idx+1));
                    const bg = s.current ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent';
                    const border = s.current ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent';
                    const textColor = s.locked && !s.current ? 'var(--text-muted)' : 'var(--text-primary)';
                    return `<div style="display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; border-radius:0.5rem; background:${bg}; border:${border}; opacity:${s.locked && !s.current ? '0.6' : '1'};">
                      <div style="width:28px; height:28px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:${circleBg}; color:${circleColor}; border:${circleBorder}; font-size:0.75rem; font-weight:600;">${circleContent}</div>
                      <div style="display:flex; flex-direction:column; gap:0.125rem;">
                        <div style="font-size:0.875rem; font-weight:500; color:${textColor};">${s.label}</div>
                        <div style="font-size:0.6875rem; color:var(--text-muted);">${s.desc}</div>
                      </div>
                    </div>`;
                  }).join('')}
                  <div style="margin-top:auto; padding:0.75rem; font-size:0.6875rem; color:var(--text-muted); text-align:center;">0 de 5 concluído(s)</div>
                </div>
                
                <!-- Conteúdo Passo 1 -->
                <div style="flex:1; padding:1.5rem; overflow-y:auto; background:var(--bg-base);">
                  <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Upload das Fotos</h3>
                  <p style="font-size:0.875rem; color:var(--text-secondary); margin:0 0 1.25rem;">Suba as fotos brutas da sessão. Quando terminar, marque "Concluí upload" para liberar o próximo passo.</p>
                  
                  <div style="display:flex; gap:0.75rem; background:color-mix(in srgb, var(--text-muted) 8%, transparent); border:1px solid var(--border); border-radius:0.5rem; padding:1rem; margin-bottom:1.25rem;">
                    <div style="width:24px; height:24px; background:color-mix(in srgb, var(--accent) 15%, transparent); border-radius:4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-weight:700; color:var(--accent); font-size:0.875rem;">i</div>
                    <div style="font-size:0.8125rem; color:var(--text-primary); line-height:1.5;">
                      <strong>Preview para seleção:</strong> As fotos enviadas aqui serão redimensionadas para <strong>1200px</strong> — é o preview que o cliente usará para fazer a seleção. Os originais em alta resolução são enviados no passo <strong>Editadas</strong>.
                    </div>
                  </div>

                  <div style="border:1px solid var(--border); border-radius:0.5rem; background:var(--bg-surface); padding:1rem 1.25rem; display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
                    <div>
                      <div style="font-weight:600; color:var(--text-primary); font-size:0.875rem;">0 fotos enviadas</div>
                      <div style="font-size:0.75rem; color:var(--orange); margin-top:0.25rem;">Faltam 30 fotos para atingir o mínimo do pacote (0/30).</div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                      <div style="background:var(--text-primary); color:var(--bg-base); padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:600;">+ Subir fotos</div>
                      <div style="background:var(--bg-elevated); color:var(--text-muted); padding:0.5rem 1rem; border-radius:0.375rem; font-size:0.8125rem; font-weight:500;">✓ Concluí upload</div>
                    </div>
                  </div>

                  <div style="border:2px dashed var(--border); border-radius:0.5rem; padding:3rem 2rem; text-align:center; background:var(--bg-surface);">
                    <div style="font-size:1.75rem; margin-bottom:0.75rem; color:var(--text-muted);">📷</div>
                    <div style="font-size:0.875rem; color:var(--text-muted);">Nenhuma foto ainda. Clique em "Subir fotos" acima para começar.</div>
                  </div>
                </div>

                <!-- Painel Configurações da Sessão -->
                <div style="width:280px; flex-shrink:0; background:var(--bg-surface); border-left:1px solid var(--border); padding:1.25rem 1rem; display:flex; flex-direction:column; gap:0.875rem; overflow-y:auto;">
                  <div style="font-size:0.6875rem; font-weight:700; letter-spacing:0.08em; color:var(--text-muted); text-transform:uppercase;">Configurações da sessão</div>

                  <div style="font-size:0.6875rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid var(--border); padding-bottom:0.25rem; margin-top:0.5rem;">Geral</div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Nome da sessão</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">Ricardo Pacheco Nunes</div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Foto de capa</label>
                    <div style="display:flex; align-items:center; gap:0.625rem;">
                      <div style="width:3.5rem; height:3.5rem; border-radius:0.375rem; background:var(--bg-base); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><span style="color:var(--text-muted); font-size:0.5625rem;">Sem capa</span></div>
                      <span style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.3rem 0.5rem; font-size:0.75rem; color:var(--text-primary);">🖼️ Alterar capa</span>
                    </div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Modo</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">Seleção</div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Prazo de seleção</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">11 / 06 / 2026, 12:30</div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Tipo de evento</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">Outro</div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Resolução do preview</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">1200px (padrão)</div>
                  </div>

                  <div style="font-size:0.6875rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid var(--border); padding-bottom:0.25rem; margin-top:0.5rem;">Seleção</div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Fotos do pacote</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">30</div>
                  </div>
                  <div style="display:flex; flex-direction:column; gap:0.25rem;">
                    <label style="font-size:0.75rem; color:var(--text-secondary);">Preço foto extra (R$)</label>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:0.375rem; padding:0.375rem 0.5rem; color:var(--text-primary); font-size:0.8125rem;">25</div>
                  </div>
                  <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:var(--text-primary);"><input type="checkbox" checked disabled style="accent-color:var(--text-primary);"> Permitir venda de fotos extras</label>
                  <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:var(--text-primary);"><input type="checkbox" checked disabled style="accent-color:var(--text-primary);"> Permitir pedido de reabertura</label>
                  <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.8125rem; color:var(--text-primary);"><input type="checkbox" checked disabled style="accent-color:var(--text-primary);"> Mensagens por foto</label>
                  
                  <div style="font-size:0.6875rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid var(--border); padding-bottom:0.25rem; margin-top:0.5rem;">Vendas</div>
                  <label style="display:flex; align-items:flex-start; gap:0.5rem; font-size:0.8125rem; color:var(--text-primary);"><input type="checkbox" checked disabled style="accent-color:var(--text-primary); margin-top:0.25rem;"><div style="display:flex; flex-direction:column; gap:0.125rem;"><strong>Automação de vendas (escassez)</strong><span style="font-size:0.6875rem; color:var(--text-muted); line-height:1.2;">Robô envia e-mails de urgência...</span></div></label>
                  
                  <div style="font-size:0.6875rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; border-bottom:1px solid var(--border); padding-bottom:0.25rem; margin-top:0.5rem;">Armazenamento</div>
                </div>
              </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">O painel fica fixo à direita do wizard e <strong style="color:var(--text-primary);">salva sozinho</strong> a cada alteração (aparece o "✓ salvo"). Aqui você ajusta tudo da sessão — inclusive a <strong style="color:var(--text-primary);">foto de capa</strong>. Campos que não podem mudar no estágio atual ficam <strong style="color:var(--text-primary);">travados (🔒)</strong> com o motivo: o <strong>Modo</strong> trava após o cliente enviar a seleção, a <strong>Resolução</strong> trava após o 1º upload e o <strong>Pacote</strong> trava após a entrega.</p>
          </div>

          <!-- ─ WIZARD GALERIA ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">WIZARD — MODO GALERIA (PASSO 3 DE 3 — ENTREGAR)</p>
            <div style="border:1px solid var(--border); border-radius:0.75rem; overflow:hidden; background:var(--bg-base); pointer-events:none;">
              <!-- Header -->
              <div style="padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:0.75rem;">
                <div style="flex:1; display:flex; align-items:center; gap:0.5rem;">
                  <strong style="font-size:1rem; color:var(--text-primary);">Evento Corporativo XYZ</strong>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  ${['🔔','📋','🗑️','✕'].map(ic => `<div style="width:32px; height:32px; border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${ic}</div>`).join('')}
                </div>
              </div>
              <div style="display:flex; min-height:220px;">
                <!-- Sidebar 3 passos — todos concluídos -->
                <div style="width:240px; flex-shrink:0; background:var(--bg-surface); border-right:1px solid var(--border); padding:1.25rem 0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                  <div style="font-size:0.6875rem; font-weight:600; letter-spacing:0.1em; color:var(--text-muted); padding:0 0.75rem 0.75rem; text-transform:uppercase;">ETAPAS</div>
                  ${[
                    { id:1, label:'Upload',       desc:'Suba as fotos brutas',      done:true,  current:false },
                    { id:2, label:'Compartilhar', desc:'Código e envio ao cliente', done:true,  current:false },
                    { id:6, label:'Entregar',     desc:'Libere o download',         done:false, current:true  }
                  ].map((s,idx) => {
                    const circleBg = s.done ? 'var(--green)' : 'var(--accent)';
                    const bg = s.current ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent';
                    const border = s.current ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent';
                    return `<div style="display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; border-radius:0.5rem; background:${bg}; border:${border};">
                      <div style="width:28px; height:28px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:${circleBg}; color:white; font-size:0.75rem; font-weight:600;">${s.done ? '✓' : String(idx+1)}</div>
                      <div style="display:flex; flex-direction:column; gap:0.125rem;">
                        <div style="font-size:0.875rem; font-weight:500; color:var(--text-primary);">${s.label}</div>
                        <div style="font-size:0.6875rem; color:var(--text-muted);">${s.desc}</div>
                      </div>
                    </div>`;
                  }).join('')}
                  <div style="margin-top:auto; padding:0.75rem; font-size:0.6875rem; color:var(--text-muted); text-align:center;">2 de 3 concluído(s)</div>
                </div>
                <!-- Conteúdo Passo 6 -->
                <div style="flex:1; padding:1.5rem 2rem;">
                  <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Entregar Sessão</h3>
                  <p style="font-size:0.875rem; color:var(--text-secondary); margin:0 0 1rem;">Confirme a entrega para liberar o download da galeria ao cliente.</p>
                  <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:0.75rem;">
                    <button style="background:var(--green); color:white; border:none; padding:0.75rem 1.5rem; border-radius:0.5rem; font-weight:600; font-size:0.9375rem; cursor:pointer; width:fit-content;">✅ Entregar e notificar cliente</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─ WIZARD MULTI-SELEÇÃO ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">WIZARD — MODO MULTI-SELEÇÃO (PASSO 4 — ACOMPANHAR)</p>
            <div style="border:1px solid var(--border); border-radius:0.75rem; overflow:hidden; background:var(--bg-base); pointer-events:none;">
              <!-- Header -->
              <div style="padding:0.75rem 1.25rem; border-bottom:1px solid var(--border); background:var(--bg-surface); display:flex; align-items:center; gap:0.75rem;">
                <div style="flex:1; display:flex; align-items:center; gap:0.5rem;">
                  <strong style="font-size:1rem; color:var(--text-primary);">Formatura Turma 2026</strong>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  ${['🔔','📋','🗑️','✕'].map(ic => `<div style="width:32px; height:32px; border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${ic}</div>`).join('')}
                </div>
              </div>
              <div style="display:flex; min-height:300px;">
                <!-- Sidebar 5 passos -->
                <div style="width:240px; flex-shrink:0; background:var(--bg-surface); border-right:1px solid var(--border); padding:1.25rem 0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                  <div style="font-size:0.6875rem; font-weight:600; letter-spacing:0.1em; color:var(--text-muted); padding:0 0.75rem 0.75rem; text-transform:uppercase;">ETAPAS</div>
                  ${[
                    { id:1, label:'Upload',       desc:'Suba as fotos brutas',       done:true,  current:false, locked:false },
                    { id:2, label:'Compartilhar', desc:'Código e envio ao cliente',  done:true,  current:false, locked:false },
                    { id:4, label:'Acompanhar',   desc:'Monitore a seleção',         done:false, current:true,  locked:false },
                    { id:5, label:'Editadas',     desc:'Suba as fotos finais',       done:false, current:false, locked:true  },
                    { id:6, label:'Entregar',     desc:'Libere o download',          done:false, current:false, locked:true  }
                  ].map((s,idx) => {
                    const circleBg = s.done ? 'var(--green)' : (s.current ? 'var(--accent)' : 'var(--bg-base)');
                    const circleColor = (s.done || s.current) ? 'white' : 'var(--text-muted)';
                    const circleBorder = (s.done || s.current) ? 'none' : '1px solid var(--border)';
                    const circleContent = s.done ? '✓' : (s.locked ? '🔒' : String(idx+1));
                    const bg = s.current ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent';
                    const border = s.current ? '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' : '1px solid transparent';
                    const textColor = s.locked ? 'var(--text-muted)' : 'var(--text-primary)';
                    return `<div style="display:flex; align-items:center; gap:0.75rem; padding:0.625rem 0.75rem; border-radius:0.5rem; background:${bg}; border:${border}; opacity:${s.locked ? '0.6' : '1'};">
                      <div style="width:28px; height:28px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:${circleBg}; color:${circleColor}; border:${circleBorder}; font-size:0.75rem; font-weight:600;">${circleContent}</div>
                      <div style="display:flex; flex-direction:column; gap:0.125rem;">
                        <div style="font-size:0.875rem; font-weight:500; color:${textColor};">${s.label}</div>
                        <div style="font-size:0.6875rem; color:var(--text-muted);">${s.desc}</div>
                      </div>
                    </div>`;
                  }).join('')}
                  <div style="margin-top:auto; padding:0.75rem; font-size:0.6875rem; color:var(--text-muted); text-align:center;">2 de 5 concluído(s)</div>
                </div>
                <!-- Conteúdo Passo 4 Multi -->
                <div style="flex:1; padding:1.5rem 2rem; overflow-y:auto;">
                  <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0 0 0.25rem;">Acompanhar Seleções</h3>
                  <p style="font-size:0.875rem; color:var(--text-secondary); margin:0 0 1rem;">Status de cada participante em tempo real. Atualização automática a cada 30 segundos.</p>
                  <div style="border:1px solid var(--border); border-radius:0.5rem; overflow:hidden;">
                    <div style="background:var(--bg-surface); padding:0.625rem 0.875rem; border-bottom:1px solid var(--border); font-size:0.6875rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Participantes</div>
                    ${[
                      { name:'João Silva',    sel:'15/15', status:'Pronto para entrega', color:'var(--green)'      },
                      { name:'Maria Santos',  sel:'10/15', status:'Selecionando',         color:'var(--yellow)'     },
                      { name:'Pedro Costa',   sel:'0/15',  status:'Não iniciou',          color:'var(--text-muted)' }
                    ].map((p, i) => `
                      <div style="padding:0.625rem 0.875rem; display:flex; align-items:center; gap:0.75rem; ${i > 0 ? 'border-top:1px solid var(--border);' : ''}">
                        <div style="flex:1;">
                          <div style="font-weight:500; color:var(--text-primary); font-size:0.875rem;">${p.name}</div>
                          <div style="font-size:0.6875rem; color:var(--text-muted);">${p.sel} fotos selecionadas</div>
                        </div>
                        <div style="font-size:0.75rem; color:${p.color}; font-weight:500;">${p.status}</div>
                        ${p.status === 'Pronto para entrega' ? `<button style="background:var(--green); color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:500; cursor:pointer; white-space:nowrap;">✅ Entregar</button>` : `<div style="width:84px;"></div>`}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ── NOVA SESSÃO — FORMULÁRIO DE CRIAÇÃO ─────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.5rem;">CRIANDO UMA NOVA SESSÃO — MODO SELEÇÃO</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 1.5rem;">Clique em <strong style="color:var(--text-primary);">+ Nova Sessão</strong> para abrir o formulário. Os campos ficam bloqueados até você escolher o modo — essa é a primeira e mais importante decisão.</p>

          <!-- 1. Modo -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">SELEÇÃO DO MODO</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; margin-bottom:0.5rem;">
              <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Modo da Sessão <span style="color:var(--red);">*</span></div>
              <div style="background:var(--bg-surface); border:1.5px solid var(--accent); border-radius:6px; padding:0.5rem 0.75rem; font-size:0.8125rem; color:var(--text-primary); font-weight:600; display:flex; align-items:center; justify-content:space-between;">
                <span>Seleção — cliente escolhe suas favoritas</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">O modo define toda a experiência — de como as fotos aparecem para o cliente até quais campos do formulário ficam disponíveis. Para ensaios individuais, use <strong style="color:var(--text-primary);">Seleção</strong>. Ao selecionar, todos os outros campos são desbloqueados automaticamente.</p>
          </div>

          <!-- 2. Cliente -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">CLIENTE</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; margin-bottom:0.5rem;">
              <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Cliente <span style="color:var(--red);">*</span></div>
              <div style="background:var(--bg-surface); border:1.5px solid var(--accent); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.8125rem; color:var(--text-primary); margin-bottom:0.3rem;">Ana Paula</div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; overflow:hidden;">
                <div style="padding:0.45rem 0.75rem; background:color-mix(in srgb, var(--accent) 10%, transparent); border-bottom:1px solid var(--border); display:flex; align-items:center; gap:0.375rem;">
                  <strong style="font-size:0.8125rem; color:var(--text-primary);">Ana Paula Ribeiro</strong>
                  <span style="font-size:0.75rem; color:var(--text-muted);">· ana@gmail.com</span>
                </div>
                <div style="padding:0.45rem 0.75rem; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:0.375rem;">
                  <span style="font-size:0.8125rem; color:var(--text-primary);">Ana Paula Souza</span>
                  <span style="font-size:0.75rem; color:var(--text-muted);">· souza.ap@outlook.com</span>
                </div>
                <div style="padding:0.45rem 0.75rem; color:var(--accent); font-size:0.8125rem; font-weight:600;">
                  + Cadastrar "Ana Paula" como novo cliente
                </div>
              </div>
            </div>
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">Digite o nome do cliente para buscar nos cadastros. Se ele ainda não existe, o dropdown exibe a opção <strong style="color:var(--text-primary);">Cadastrar como novo cliente</strong> — ao clicar, abre o formulário de cadastro sem sair da criação da sessão. Após concluir, você retorna automaticamente com o cliente já vinculado e a criação continua de onde parou.</p>
          </div>

          <!-- 3. Nome da Sessão -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">NOME DA SESSÃO</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; margin-bottom:0.5rem;">
              <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Nome da Sessão <span style="color:var(--red);">*</span></div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.8125rem; color:var(--text-primary);">Ana Paula Ribeiro</div>
              <div style="font-size:0.6875rem; color:var(--green); margin-top:0.3rem;">✓ preenchido automaticamente com o nome do cliente</div>
            </div>
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">Ao vincular um cliente, o campo é preenchido automaticamente com o nome dele. Você pode renomear livremente — por exemplo: <em style="color:var(--text-primary);">"Ensaio Gestante — Ana Paula"</em> ou <em style="color:var(--text-primary);">"Casamento Ribeiro &amp; Marques"</em>. Este nome aparece na lista de sessões e no cabeçalho da galeria do cliente.</p>
          </div>

          <!-- 4. Datas -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">DATAS</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; margin-bottom:0.5rem;">
              <div style="font-size:0.6875rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem;">📅 Datas</div>
              <div style="display:flex; flex-direction:column; gap:0.5rem;">
                <div>
                  <div style="font-size:0.6875rem; color:var(--text-secondary); margin-bottom:0.2rem; font-weight:600;">Criado em</div>
                  <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.625rem; font-size:0.8125rem; color:var(--text-primary);">19/05/2026</div>
                </div>
                <div>
                  <div style="font-size:0.6875rem; color:var(--text-secondary); margin-bottom:0.2rem; font-weight:600;">Data do Evento</div>
                  <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.4rem 0.625rem; font-size:0.8125rem; color:var(--text-primary);">15/05/2026</div>
                </div>
                <div>
                  <div style="font-size:0.6875rem; color:var(--text-secondary); margin-bottom:0.2rem; font-weight:600;">Prazo de Seleção <span style="color:var(--text-muted);">(opcional)</span></div>
                  <div style="background:var(--bg-surface); border:1.5px solid var(--accent); border-radius:6px; padding:0.4rem 0.625rem; font-size:0.8125rem; color:var(--text-primary);">26/05/2026 23:59</div>
                </div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--text-secondary); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Criado em</strong> — Apenas para registro. Não interfere em nenhuma regra de validação — você pode criar uma sessão hoje para um ensaio que aconteceu há 2 semanas ou para um agendamento futuro sem problema.</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--text-secondary); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Data do Evento</strong> — Quando o ensaio ou evento aconteceu. Opcional, mas recomendado para relatórios de marketing.</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:color-mix(in srgb, var(--accent) 8%, transparent); border-radius:7px; border:1px solid color-mix(in srgb, var(--accent) 20%, transparent);">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Prazo de Seleção</strong> — A única regra de validação: o prazo deve ser <strong style="color:var(--text-primary);">posterior à data do evento</strong>. Quando expira, o status muda para "Expirado" e a automação de escassez para de enviar e-mails ao cliente.</span>
              </div>
            </div>
          </div>

          <!-- 5. Foto de Capa -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">FOTO DE CAPA</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; display:flex; align-items:center; gap:0.875rem; margin-bottom:0.5rem;">
              <div style="width:80px; height:60px; background:var(--bg-base); border:1px dashed var(--border); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.25rem; flex-shrink:0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span style="font-size:0.5625rem; color:var(--text-muted);">Sem capa</span>
              </div>
              <div style="background:var(--accent); color:white; border-radius:6px; padding:0.375rem 0.875rem; font-size:0.8125rem; font-weight:600;">Upload</div>
            </div>
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">Aceita <strong style="color:var(--text-primary);">JPG ou PNG</strong>. A capa aparece como thumbnail na lista de sessões e no cabeçalho da galeria do cliente. Opcional — sem capa, o sistema exibe um ícone padrão.</p>
          </div>

          <!-- 6. Resolução -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">RESOLUÇÃO DAS FOTOS DE SELEÇÃO</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; margin-bottom:0.5rem;">
              <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Resolução das fotos de seleção</div>
              <div style="display:flex; flex-direction:column; gap:0.3rem;">
                ${[
                  { val:'960px',  desc:'menor armazenamento — ideal para quem tem muitos eventos', sel:false },
                  { val:'1200px', desc:'padrão — equilíbrio entre qualidade e armazenamento',      sel:true  },
                  { val:'1400px', desc:'alta qualidade',                                            sel:false },
                  { val:'1600px', desc:'máxima qualidade — mais armazenamento',                     sel:false },
                ].map(o => `
                  <div style="background:${o.sel ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-surface)'}; border:${o.sel ? '1.5px solid var(--accent)' : '1px solid var(--border)'}; border-radius:6px; padding:0.35rem 0.625rem; font-size:0.8rem; color:${o.sel ? 'var(--text-primary)' : 'var(--text-secondary)'}; font-weight:${o.sel ? '600' : '400'};">
                    <strong>${o.val}</strong> — ${o.desc}
                  </div>
                `).join('')}
              </div>
              <div style="font-size:0.6875rem; color:var(--red); margin-top:0.4rem; font-weight:600;">⚠ Não pode ser alterado após a criação da sessão.</div>
            </div>
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">Define em qual resolução as fotos aparecem <strong style="color:var(--text-primary);">na galeria de seleção do cliente</strong> (com marca d'água). Quanto maior a resolução, mais detalhes o cliente vê ao escolher — mas mais armazenamento é consumido na sua conta. As fotos editadas que você entrega são sempre os arquivos originais em alta resolução, independentemente desta configuração. <strong style="color:var(--red);">Não é possível alterar após criar a sessão.</strong> Após subir as fotos, o painel exibe as dimensões reais de cada imagem processada (ex: <strong style="color:var(--text-primary);">1200×800px</strong>) e o cabeçalho do modal de fotos mostra a resolução configurada — passe o mouse sobre o badge para ver a explicação da escolha.</p>
          </div>

          <!-- 7. Pacote + Extra -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">FOTOS DO PACOTE E PREÇO DE EXTRAS</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; display:flex; gap:0.75rem; margin-bottom:0.5rem;">
              <div style="flex:1;">
                <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Fotos do pacote</div>
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.875rem; color:var(--text-primary); font-weight:700; text-align:center;">30</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Preço foto extra (R$)</div>
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.875rem; color:var(--text-primary); font-weight:700; text-align:center;">25,00</div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Fotos do pacote</strong> — Quantidade máxima que o cliente pode escolher sem custo adicional. O sistema conta em tempo real e bloqueia quando o limite é atingido.</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Preço foto extra</strong> — Valor por foto além do pacote. Ex: cliente quer 35 fotos com pacote de 30 e preço R$ 25 → sistema calcula R$ 125 de extras. Só funciona com "Habilitar venda de extras" ativado.</span>
              </div>
            </div>
          </div>

          <!-- 8. Checkboxes -->
          <div style="margin-bottom:1.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">VENDA DE EXTRAS E REABERTURA</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; display:flex; flex-direction:column; gap:0.5rem; margin-bottom:0.5rem;">
              ${[
                { checked:true, label:'Habilitar venda de fotos extras' },
                { checked:true, label:'Permitir pedido de reabertura'   },
              ].map(c => `
                <div style="display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0.25rem;">
                  <div style="width:16px; height:16px; border-radius:4px; border:2px solid ${c.checked ? 'var(--accent)' : 'var(--border)'}; background:${c.checked ? 'var(--accent)' : 'transparent'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    ${c.checked ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                  </div>
                  <span style="font-size:0.8125rem; color:var(--text-primary);">${c.label}</span>
                </div>
              `).join('')}
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Habilitar venda de fotos extras</strong> — Permite que o cliente solicite fotos além do limite do pacote. O valor total é calculado e exibido na tela de confirmação da seleção. Desative se seu contrato não prevê esse recurso.</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Permitir pedido de reabertura</strong> — Após enviar a seleção, o cliente não pode alterar. Com essa opção ativada, ele pode solicitar reabertura e você decide se aceita. Evita arrependimentos sem perder flexibilidade.</span>
              </div>
            </div>
          </div>

          <!-- 9. CRM e Vendas -->
          <div style="margin-bottom:0.5rem;">
            <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">CRM E VENDAS</p>
            <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; display:flex; flex-direction:column; gap:0.625rem; margin-bottom:0.5rem;">
              <div>
                <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Tipo de Evento</div>
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.8125rem; color:var(--text-primary); display:flex; justify-content:space-between; align-items:center;">
                  <span>Ensaio</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div style="font-size:0.6875rem; color:var(--text-muted); margin-top:0.25rem;">Categoria do evento para relatórios e filtros.</div>
              </div>
              <div style="display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0.25rem;">
                <div style="width:16px; height:16px; border-radius:4px; border:2px solid var(--accent); background:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span style="font-size:0.8125rem; color:var(--text-primary);">🤖 Automação de vendas (escassez)</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Tipo de Evento</strong> — Classifica o ensaio (Casamento, Ensaio, Newborn, Formatura, etc.) para relatórios de marketing e filtros. Para agendar um e-mail de reativação para este cliente, acesse a tab <strong style="color:var(--text-primary);">Clientes</strong> e edite o campo "Próximo Contato".</span>
              </div>
              <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
                <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Automação de vendas</strong> — O robô monitora o prazo e envia e-mails de urgência automaticamente: 15 dias (aviso), 7 dias, 3 dias (com cupom para extras) e 1 dia antes de expirar. Requer que a automação esteja habilitada nas configurações da conta.</span>
              </div>
            </div>
          </div>

        </div>

        <!-- ── MODO SELEÇÃO ─────────────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--green) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--green) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--green) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--green); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Modo Seleção</span>
            <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:auto;">Ensaios, newborn, famílias, casamentos</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 1rem;">O cliente visualiza todas as fotos com marca d'água e escolhe as favoritas dentro do limite do pacote contratado. Você só edita e entrega o que ele escolheu. O wizard guia você em <strong style="color:var(--text-primary);">5 passos</strong>: Upload → Compartilhar → Acompanhar → Editadas → Entregar. Cada card exibe uma <strong style="color:var(--text-primary);">barra de progresso</strong> (Criada → Fotos → Link → Seleção → Entregue) com o próximo passo em destaque.</p>
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1,  who:'fotógrafo', color:'var(--accent)',  title:'Criar a sessão',                   desc:'Clique em + Nova Sessão e escolha o modo Seleção. No modal (enxuto) você informa só o essencial: nome, cliente, datas e capa. O wizard abre automaticamente — e os detalhes (pacote, preço de extras, prazo, resolução, armazenamento e a própria capa) ficam no painel de Configurações à direita, que salva sozinho a cada mudança.' },
                { n:2,  who:'fotógrafo', color:'var(--accent)',  title:'Passo 1 — Upload',                 desc:'Arraste as fotos originais do ensaio (JPG/PNG, até 10 MB cada) ou clique para selecionar. O sistema redimensiona para a resolução configurada. O botão "Concluí o upload" só fica disponível quando o número de fotos atinge o tamanho do pacote. As fotos ficam com marca d\'água.' },
                { n:3,  who:'fotógrafo', color:'var(--accent)',  title:'Passo 2 — Compartilhar',           desc:'O código de acesso gerado aparece com botões para enviar via WhatsApp (com mensagem personalizada por tipo de evento) ou e-mail direto. Ao abrir este passo, o sistema registra automaticamente que você visualizou o código.' },
                { n:4,  who:'cliente',   color:'var(--green)',   title:'Acessar a galeria',                desc:'O cliente entra em app.cliquezoom.com.br, insere o código e visualiza todas as fotos com marca d\'água. Pode navegar, fazer zoom e comparar.' },
                { n:5,  who:'cliente',   color:'var(--green)',   title:'Selecionar as favoritas',          desc:'O cliente clica nas fotos que quer receber. O sistema conta quantas foram escolhidas e avisa quando o limite for atingido. Se o pacote permite extras, ele pode solicitar fotos adicionais com o valor calculado na tela.' },
                { n:6,  who:'cliente',   color:'var(--green)',   title:'Enviar a seleção',                 desc:'Quando satisfeito, o cliente confirma e envia. O status da sessão muda para Seleção enviada e você recebe uma notificação no sininho.' },
                { n:7,  who:'cliente',   color:'var(--orange)',  title:'Pedido de reabertura (opcional)',  desc:'Se a sessão foi configurada com "Permitir reabertura", o cliente pode solicitar uma nova chance de alterar as fotos. O card exibe badge laranja ⚠ e o Passo 6 fica bloqueado até você decidir. No Passo 6 do wizard: ✓ Reabrir para permitir ou ✗ Recusar pedido para manter a seleção atual.' },
                { n:8,  who:'fotógrafo', color:'var(--accent)',  title:'Passo 4 — Acompanhar',            desc:'Veja em tempo real quais fotos o cliente escolheu. A tela atualiza automaticamente a cada 30 segundos (mais rápido quando há mudanças). Use o botão "Exportar Lightroom" para baixar um arquivo .txt com os nomes das fotos selecionadas para o seu editor.' },
                { n:9,  who:'fotógrafo', color:'var(--accent)',  title:'Passo 5 — Editadas',              desc:'Faça upload das fotos editadas. O sistema vincula automaticamente cada editada ao original selecionado pelo cliente. Fotos que você adicionou sem que o cliente tenha selecionado aparecem como ★ Cortesia — o cliente recebe sem custo adicional.' },
                { n:10, who:'fotógrafo', color:'var(--accent)',  title:'Passo 6 — Entregar',              desc:'Confirme a entrega. O cliente recebe um e-mail e o download é liberado sem marca d\'água. Use os botões 💬 WhatsApp ou 🔗 Copiar link para reforçar o aviso pelo canal preferido. Se precisar, clique em "Re-entregar" para notificar novamente.' },
                { n:11, who:'cliente',   color:'var(--green)',   title:'Baixar as fotos',                 desc:'O cliente acessa a galeria com o mesmo código e vê as fotos sem marca d\'água. Pode baixar individualmente ou todas de uma vez em ZIP. O sistema registra cada download — o fotógrafo pode ver o status antes de arquivar ou excluir as fotos.' },
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem; ${i < arr.length - 1 ? 'padding-bottom:0;' : ''}">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:20px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- ── MODO GALERIA ─────────────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--purple) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--purple) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--purple) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--purple); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Modo Galeria</span>
            <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:auto;">Entregas rápidas, eventos corporativos, imprensa</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 1rem;">O cliente visualiza e baixa as fotos diretamente, sem precisar fazer nenhuma seleção. Você entrega quando quiser liberar o acesso. Ideal quando você já decidiu quais fotos entregar. O wizard tem <strong style="color:var(--text-primary);">3 passos</strong>: Upload → Compartilhar → Entregar.</p>
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)',  title:'Criar a sessão',             desc:'Clique em + Nova Sessão e escolha o modo Galeria. Defina o nome do trabalho e, se quiser, um prazo de acesso. Não há configuração de pacote — o cliente baixa tudo.' },
                { n:2, who:'fotógrafo', color:'var(--accent)',  title:'Passo 1 — Upload',           desc:'Edite as fotos no seu software antes de subir. Arraste os arquivos no wizard ou clique para selecionar. As fotos aparecem na galeria com marca d\'água até você entregar.' },
                { n:3, who:'fotógrafo', color:'var(--accent)',  title:'Passo 2 — Compartilhar',     desc:'Opcional: envie o código antes de entregar para o cliente já ver a prévia com marca d\'água. Ou envie só após a entrega — como preferir. Use WhatsApp ou e-mail direto.' },
                { n:4, who:'cliente',   color:'var(--purple)',  title:'Visualizar a prévia',        desc:'Se o código foi enviado antes da entrega, o cliente entra na galeria e visualiza as fotos com marca d\'água. Ele não consegue baixar ainda.' },
                { n:5, who:'fotógrafo', color:'var(--accent)',  title:'Passo 6 — Entregar',         desc:'Confirme a entrega no wizard. A marca d\'água é removida e o cliente recebe um e-mail. Use 💬 WhatsApp ou 🔗 Copiar link para reforçar. Se precisar trocar fotos, clique em Re-entregar.' },
                { n:6, who:'cliente',   color:'var(--purple)',  title:'Baixar as fotos',            desc:'O cliente entra com o mesmo código e vê as fotos sem marca d\'água. Pode baixar individualmente ou todas de uma vez em ZIP. O sistema registra cada download.' },
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:20px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- ── MODO MULTI-SELEÇÃO ───────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--orange) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--orange) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--orange) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--orange); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Modo Multi-Seleção</span>
            <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:auto;">Formaturas, shows, eventos com muitos participantes</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 1rem;">Cada participante recebe um código próprio e seleciona suas fotos de forma independente — sem interferir nos outros. Você gerencia tudo em um só lugar e entrega individualmente conforme cada um finaliza. O wizard tem <strong style="color:var(--text-primary);">5 passos</strong> (igual ao Seleção, mas com tabela de participantes no Passo 6).</p>
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1,  who:'fotógrafo',    color:'var(--accent)',  title:'Criar a sessão',                desc:'Escolha o modo Multi-Seleção. No modal informe o nome do evento e o prazo compartilhado (todos os participantes têm o mesmo deadline). Resolução, armazenamento e demais ajustes ficam no painel de Configurações à direita do wizard.' },
                { n:2,  who:'fotógrafo',    color:'var(--accent)',  title:'Passo 1 — Upload',              desc:'Suba TODAS as fotos do evento. Na Multi-Seleção não há separação por participante no upload — todos veem a galeria completa e cada um encontra as suas.' },
                { n:3,  who:'fotógrafo',    color:'var(--accent)',  title:'Passo 2 — Compartilhar',        desc:'Gerencie participantes: clique em "Gerenciar participantes" para adicionar cada pessoa com nome, e-mail e limite individual (ex: 15 fotos por formando). O sistema gera um código único para cada um. Envie os códigos pelo e-mail cadastrado, pelo WhatsApp individual ou exporte a lista completa.' },
                { n:4,  who:'participante', color:'var(--orange)',  title:'Acessar com código individual', desc:'Cada participante entra em app.cliquezoom.com.br e insere SEU código. Ele vê todas as fotos do evento com marca d\'água e seleciona as suas favoritas.' },
                { n:5,  who:'participante', color:'var(--orange)',  title:'Fazer a seleção',               desc:'O participante clica nas fotos que quer e acompanha o contador (ex: 12/15). Quando termina, confirma e envia. O status individual muda para Seleção enviada.' },
                { n:6,  who:'fotógrafo',    color:'var(--accent)',  title:'Passo 4 — Acompanhar',          desc:'Veja o status de cada participante em tempo real: Pendente, Em seleção, Pronto para entrega. Não precisa esperar todos para começar a editar. Use Exportar Lightroom para criar coleções por pessoa.' },
                { n:7,  who:'fotógrafo',    color:'var(--accent)',  title:'Passo 5 — Editadas',            desc:'Faça upload das fotos editadas de cada participante. O sistema vincula automaticamente cada editada ao original selecionado.' },
                { n:8,  who:'fotógrafo',    color:'var(--accent)',  title:'Passo 6 — Entregar por participante', desc:'No Passo 6 aparece a tabela de participantes. Clique em ✅ Entregar ao lado de cada um quando estiver pronto — ou use "Entregar todos" para processar de uma vez. A entrega é individual: cada participante recebe no seu ritmo.' },
                { n:9,  who:'participante', color:'var(--orange)',  title:'Baixar as fotos',               desc:'O participante acessa com seu código e encontra as fotos entregues sem marca d\'água. Os outros participantes não veem o que ele escolheu nem o que você entregou para ele.' },
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:20px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- ── REFERÊNCIA RÁPIDA ────────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Referência Rápida — Status da Sessão</p>
          <div style="display:flex; flex-direction:column; gap:0.3rem; pointer-events:none;">
            ${[
              { color:'var(--text-muted)', label:'Pendente',         desc:'Sessão criada. Aguardando upload ou envio do código.' },
              { color:'var(--yellow)',     label:'Em seleção',       desc:'Cliente acessou e está escolhendo as fotos.' },
              { color:'var(--accent)',     label:'Seleção enviada',  desc:'Cliente finalizou. Hora de editar e subir as editadas.' },
              { color:'var(--green)',      label:'Entregue',         desc:'Fotos liberadas. Cliente pode baixar sem marca d\'água.' },
              { color:'var(--red)',        label:'Expirado',         desc:'Prazo passou sem o cliente enviar. Entre em contato.' },
            ].map(s => `
              <div style="display:flex; align-items:center; gap:0.625rem; padding:0.4rem 0.75rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:7px; height:7px; border-radius:50%; background:${s.color}; flex-shrink:0;"></span>
                <span style="font-size:0.8125rem; color:var(--text-primary); font-weight:600; min-width:120px;">${s.label}</span>
                <span style="font-size:0.75rem; color:var(--text-secondary);">${s.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Comentários em Fotos -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Comentários em Fotos</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 0.75rem;">Quando habilitado em Config → Comentários, o cliente pode deixar observações em fotos específicas e você responde diretamente. O ícone 💬 aparece nas fotos que têm comentários.</p>
          <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; pointer-events:none; background:var(--bg-surface);">
            <div style="padding:0.5rem 0.875rem; border-bottom:1px solid var(--border); font-size:0.8125rem; font-weight:700; color:var(--text-primary);">Comentários da Foto</div>
            <div style="padding:0.75rem; display:flex; flex-direction:column; gap:0.5rem; background:var(--bg-base);">
              <div style="align-self:flex-start; max-width:80%; background:var(--bg-elevated); padding:0.4rem 0.625rem; border-radius:7px;">
                <div style="font-size:0.6875rem; color:var(--text-secondary); font-weight:700; margin-bottom:0.15rem;">Cliente <span style="font-weight:normal; opacity:0.7;">14/05 09:32</span></div>
                <div style="font-size:0.8125rem; color:var(--text-primary);">Pode deixar essa com o sorriso mais aberto?</div>
              </div>
              <div style="align-self:flex-end; max-width:80%; background:color-mix(in srgb, var(--accent) 20%, transparent); padding:0.4rem 0.625rem; border-radius:7px;">
                <div style="font-size:0.6875rem; color:var(--accent); font-weight:700; margin-bottom:0.15rem;">Você <span style="font-weight:normal; opacity:0.7;">14/05 10:15</span></div>
                <div style="font-size:0.8125rem; color:var(--text-primary);">Claro! Vou ajustar e reenviar em breve.</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    `
  },
  { id: 'mensagens', label: 'Mensagens', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Mensagens reúne tudo que chega pelo <strong style="color:var(--text-primary);">seu site público</strong>: os <strong style="color:var(--text-primary);">contatos</strong> enviados pelo formulário e os <strong style="color:var(--text-primary);">depoimentos</strong> de clientes que aguardam sua aprovação antes de aparecerem no site.
        </p>

        <!-- ── VISUALIZAÇÃO DAS TELAS ───────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização das Telas</p>

          <!-- ─ DEPOIMENTOS PENDENTES ─ -->
          <div style="margin-bottom:2rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">DEPOIMENTOS AGUARDANDO APROVAÇÃO</p>
            <div style="background:var(--bg-elevated); border:1px solid var(--green); border-radius:8px; padding:1rem; pointer-events:none;">
              <h4 style="color:var(--green); font-size:0.875rem; font-weight:600; margin:0 0 0.75rem;">⭐ 1 depoimento aguardando aprovação</h4>
              <div style="background:var(--bg-surface); padding:0.75rem; border-radius:6px; border:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                  <div style="flex:1; min-width:0;">
                    <p style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Ana Ribeiro</p>
                    <p style="font-size:0.8125rem; color:var(--text-secondary); margin:0.25rem 0 0; line-height:1.5;">Trabalho impecável, superou todas as expectativas do nosso casamento!</p>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0.375rem 0 0;">⭐⭐⭐⭐⭐ 5/5 · ana@cliente.com</p>
                  </div>
                  <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                    <span style="background:var(--green); color:#fff; padding:0.375rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600;">✓ Aprovar</span>
                    <span style="background:var(--red); color:#fff; padding:0.375rem 0.75rem; border-radius:6px; font-size:0.75rem; font-weight:600;">✕ Rejeitar</span>
                  </div>
                </div>
              </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;"><strong style="color:var(--green);">Aprovar</strong> publica o depoimento na seção de depoimentos do seu site. <strong style="color:var(--red);">Rejeitar</strong> apaga em definitivo (pede confirmação). Esta caixa só aparece quando há depoimentos pendentes.</p>
          </div>

          <!-- ─ CONTATOS RECEBIDOS ─ -->
          <div style="margin-bottom:0.5rem;">
            <p style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0 0 0.75rem;">📩 CONTATOS RECEBIDOS</p>
            <div style="display:flex; flex-direction:column; gap:0.75rem; pointer-events:none;">
              <!-- Card não lido (recolhido) -->
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-left:3px solid var(--ad-accent, var(--accent)); border-radius:8px; overflow:hidden;">
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.875rem 1rem;">
                  <div style="display:flex; align-items:center; gap:0.75rem; min-width:0;">
                    <span style="width:8px; height:8px; background:var(--accent); border-radius:50%; flex-shrink:0;"></span>
                    <div style="min-width:0;">
                      <p style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Maria Souza — Orçamento de casamento</p>
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:0.125rem 0 0;">12/06/2026 14:32</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </div>
              </div>
              <!-- Card lido (expandido) -->
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; overflow:hidden;">
                <div style="display:flex; align-items:center; justify-content:space-between; padding:0.875rem 1rem;">
                  <div style="display:flex; align-items:center; gap:0.75rem; min-width:0;">
                    <span style="width:8px; height:8px; flex-shrink:0;"></span>
                    <div style="min-width:0;">
                      <p style="font-size:0.875rem; font-weight:400; color:var(--text-primary); margin:0;">João Lima — Ensaio newborn</p>
                      <p style="font-size:0.75rem; color:var(--text-muted); margin:0.125rem 0 0;">10/06/2026 09:10</p>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                </div>
                <div style="padding:0 1rem 1rem; border-top:1px solid var(--border);">
                  <div style="margin-top:0.875rem; display:flex; flex-direction:column; gap:0.5rem;">
                    <p style="font-size:0.8125rem; color:var(--text-secondary); margin:0;"><strong style="color:var(--text-primary);">E-mail:</strong> <span style="color:var(--accent);">joao@cliente.com</span></p>
                    <p style="font-size:0.8125rem; color:var(--text-secondary); margin:0;"><strong style="color:var(--text-primary);">Assunto:</strong> Ensaio newborn</p>
                    <div style="background:var(--bg-elevated); border-radius:6px; padding:0.75rem; margin-top:0.25rem;">
                      <p style="font-size:0.875rem; color:var(--text-primary); line-height:1.6; margin:0;">Olá! Meu bebê nasce em agosto, gostaria de saber valores e disponibilidade para um ensaio newborn.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Mensagens <strong style="color:var(--text-primary);">não lidas</strong> têm a bolinha azul e a borda lateral de destaque. Clique no card para <strong style="color:var(--text-primary);">expandir</strong> (mostra e-mail, assunto e a mensagem) — isso já marca como lida e atualiza o contador de não lidas no topo. O ícone de lixeira <strong style="color:var(--red);">exclui</strong> a mensagem (pede confirmação).</p>
          </div>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'cliente',   color:'var(--green)',  title:'Chega pelo site',            desc:'Quando um visitante preenche o formulário de contato ou envia um depoimento no seu site público, ele aparece automaticamente aqui — e você recebe um aviso no sininho do topo.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Aprovar um depoimento',       desc:'Leia o depoimento pendente e clique em ✓ Aprovar para publicá-lo na seção de depoimentos do seu site. É a sua curadoria: só vai ao ar o que você liberar.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Rejeitar um depoimento',      desc:'Se for spam ou algo que você não quer exibir, clique em ✕ Rejeitar. Ele é apagado em definitivo (com confirmação).' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Ler e responder um contato',  desc:'Clique no card do contato para abrir a mensagem completa (e-mail, assunto e texto). Ao abrir, ela é marcada como lida. Clique no e-mail para responder direto pelo seu aplicativo de e-mail.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Excluir um contato',          desc:'Terminou de tratar? Use o ícone de lixeira para remover a mensagem da lista e manter sua caixa organizada.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'gestao', label: 'Gestão', icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Gestão traz um <strong style="color:var(--text-primary);">ERP completo</strong> para dentro do CliqueZoom: clientes, ordens de serviço, catálogo de produtos e serviços, financeiro e CRM. Tudo com <strong style="color:var(--text-primary);">login único</strong> — ao abrir a aba você já entra autenticado, sem precisar de outra senha.
        </p>

        <!-- ── VISUALIZAÇÃO DA TELA ─────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>

          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none;">
            <!-- Sub-menu agrupado -->
            <div style="display:flex; gap:1.25rem; flex-wrap:wrap; padding-bottom:0.85rem; border-bottom:1px solid var(--border);">
              <div style="display:flex; flex-direction:column; gap:0.4rem;">
                <span style="font-size:0.6875rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:var(--text-muted);">Operação</span>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--accent); color:var(--accent-on, #ffffff);">Dashboard</span>
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Clientes</span>
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Ordens de Serviço</span>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.4rem;">
                <span style="font-size:0.6875rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:var(--text-muted);">Cadastros</span>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Produtos / Serviços</span>
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Categorias</span>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; gap:0.4rem;">
                <span style="font-size:0.6875rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; color:var(--text-muted);">Financeiro</span>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Contas a Receber</span>
                  <span style="padding:0.45rem 0.85rem; font-size:0.8125rem; font-weight:500; border-radius:8px; border:1px solid var(--border); background:var(--bg-base); color:var(--text-secondary);">Contas a Pagar</span>
                </div>
              </div>
            </div>
            <!-- Área do ERP -->
            <div style="margin-top:0.85rem; border:1px solid var(--border); border-radius:12px; background:var(--bg-surface); height:120px; display:flex; align-items:center; justify-content:center;">
              <span style="font-size:0.8125rem; color:var(--text-muted);">O módulo de gestão abre aqui, já logado — como parte do CliqueZoom</span>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Os botões do topo trocam a seção exibida. O grupo <strong style="color:var(--text-primary);">Operação</strong> concentra o dia a dia (clientes e ordens de serviço); <strong style="color:var(--text-primary);">Cadastros</strong> guarda o seu catálogo; <strong style="color:var(--text-primary);">Financeiro</strong> controla contas a receber/pagar; <strong style="color:var(--text-primary);">Relacionamento</strong> traz o CRM.</p>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'sistema',   color:'var(--green)',  title:'Login único, automático',       desc:'Ao abrir a aba, o CliqueZoom te autentica no módulo de gestão sozinho. Você nunca digita outra senha — parece (e funciona como) uma parte nativa do painel.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Clientes integrados',           desc:'O cadastro de clientes daqui é o MESMO usado nas suas sessões: quando você cria uma sessão e cadastra um cliente (com CPF), ele entra direto na base da Gestão.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Monte seu catálogo primeiro',   desc:'Em Cadastros › Produtos / Serviços, registre o que você vende (ensaios, pacotes, horas extras, álbuns). É a base para criar ordens de serviço com preços consistentes.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Ordens de serviço do catálogo', desc:'Ao criar uma OS, todo item precisa ser selecionado do catálogo — itens digitados à mão mostram o aviso ⚠ e não deixam salvar. Isso evita preço fora do padrão e mantém seus relatórios confiáveis.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Acompanhe o financeiro',        desc:'Use Contas a Receber e Contas a Pagar para acompanhar o caixa do seu negócio: parcelas das OS, despesas fixas e formas de pagamento, tudo num lugar só.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'meu-site',  label: 'Meu Site',  icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          O Meu Site é o <strong style="color:var(--text-primary);">construtor do seu site público</strong>. Ele abre em tela cheia: o painel de edição fica à esquerda e o <strong style="color:var(--text-primary);">preview ao vivo</strong> do site à direita — cada mudança aparece na hora, e só vai ao ar quando você salva.
        </p>

        <!-- ── VISUALIZAÇÃO DA TELA ─────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>
          <div style="border:1px solid var(--border); border-radius:10px; background:var(--bg-base); padding:0.75rem; display:flex; gap:0.75rem; pointer-events:none;">
            <!-- Painel de edição -->
            <div style="width:150px; flex-shrink:0; display:flex; flex-direction:column; gap:3px; border-right:1px solid var(--border); padding-right:0.6rem;">
              ${['Geral', 'Seções', 'Capa', 'Sobre', 'Portfólio', 'Serviços', 'Depoimentos', 'Álbuns', 'Estúdio', 'Contato', 'FAQ', 'Rodapé', 'Área do Cliente', 'Personalizar'].map((s, i) => `
                <span style="padding:0.3rem 0.6rem; border-radius:6px; font-size:0.72rem; font-weight:${i === 0 ? '700' : '500'}; background:${i === 0 ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'transparent'}; color:${i === 0 ? 'var(--accent)' : 'var(--text-secondary)'};">${s}</span>
              `).join('')}
            </div>
            <!-- Preview -->
            <div style="flex:1; display:flex; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.15rem 0.5rem; border-radius:20px; background:color-mix(in srgb, var(--green) 15%, transparent); color:var(--green);">Preview Ativo</span>
                <span style="font-size:0.72rem; color:var(--text-muted);">Tema: Elegante</span>
                <span style="margin-left:auto; display:flex; gap:0.3rem;">
                  <span style="font-size:0.65rem; padding:0.15rem 0.5rem; border:1px solid var(--accent); border-radius:6px; color:var(--accent); font-weight:600;">Desktop</span>
                  <span style="font-size:0.65rem; padding:0.15rem 0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted);">Tablet</span>
                  <span style="font-size:0.65rem; padding:0.15rem 0.5rem; border:1px solid var(--border); border-radius:6px; color:var(--text-muted);">Mobile</span>
                </span>
              </div>
              <div style="flex:1; min-height:130px; border:1px solid var(--border); border-radius:10px; background:var(--bg-surface); display:flex; align-items:center; justify-content:center;">
                <span style="font-size:0.8125rem; color:var(--text-muted);">Seu site, ao vivo — atualiza enquanto você edita</span>
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Cada item do painel edita uma parte do site. <strong style="color:var(--text-primary);">Geral</strong> controla o tema e o status (ativado/desativado); <strong style="color:var(--text-primary);">Seções</strong> liga/desliga e reordena os blocos; as demais abas editam o conteúdo de cada seção. Os botões Desktop/Tablet/Mobile simulam o site em cada tela.</p>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Escolha o tema (Geral)',          desc:'São 5 temas prontos. Clique em "Visualizar" para testar sem compromisso — só muda de verdade quando você seleciona o card e clica em Salvar Tema.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Organize as Seções',              desc:'Ligue e desligue blocos (Portfólio, Serviços, FAQ...) e arraste para mudar a ordem em que aparecem no site. O que estiver desativado some do site na hora.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Monte a Capa',                    desc:'Suba a imagem de fundo, ajuste zoom e posição, e adicione textos como camadas — cada texto tem posição, tamanho, cor e alinhamento próprios.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Preencha o conteúdo',             desc:'Sobre (sua história + fotos), Portfólio (suas melhores imagens), Serviços com preços, Depoimentos, Álbuns, Estúdio, Contato, FAQ e Rodapé. Cada aba tem o próprio botão Salvar.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Personalize o estilo',            desc:'Na aba Personalizar, ajuste a paleta de cores (principal, fundo, texto) e a fonte do site inteiro — ou volte ao padrão do tema com um clique.' },
                { n:6, who:'sistema',   color:'var(--green)',  title:'Ative quando estiver pronto',     desc:'O interruptor "Status do Site" (em Geral) controla a publicação: desativado, visitantes veem uma página elegante de "Em breve" — ative quando quiser ir ao ar.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'dominio', label: 'Domínio', icon: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Domínio conecta o <strong style="color:var(--text-primary);">seu próprio endereço</strong> (ex: www.seunome.com.br) ao seu site. Em vez do endereço padrão do CliqueZoom, seus clientes acessam o site pelo domínio que você já tem — com <strong style="color:var(--text-primary);">certificado de segurança (https) gerado automaticamente</strong>.
        </p>

        <!-- ── VISUALIZAÇÃO DA TELA ─────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>

          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Card do domínio -->
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); padding:0.85rem 1rem; border-radius:8px; border:1px solid var(--border); flex-wrap:wrap; gap:0.5rem;">
              <div>
                <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">www.seunome.com.br</div>
                <div style="color:var(--yellow); font-size:0.75rem; margin-top:0.2rem;">⏳ Aguardando verificação DNS</div>
              </div>
              <div style="display:flex; gap:0.4rem;">
                <span style="background:var(--accent); color:var(--accent-on, #ffffff); padding:0.4rem 0.85rem; border-radius:6px; font-size:0.75rem; font-weight:600;">Verificar DNS</span>
                <span style="background:var(--red); color:var(--accent-on, #ffffff); padding:0.4rem 0.85rem; border-radius:6px; font-size:0.75rem; font-weight:600;">Remover</span>
              </div>
            </div>
            <!-- Instruções de DNS -->
            <div style="border:1px solid var(--border); border-radius:8px; background:var(--bg-surface); padding:0.85rem 1rem;">
              <div style="font-size:0.8125rem; font-weight:700; color:var(--text-primary); margin-bottom:0.6rem;">Instruções de Configuração DNS</div>
              <div style="display:grid; grid-template-columns:auto 1fr auto auto; gap:0.35rem 1.25rem; font-size:0.75rem; color:var(--text-secondary);">
                <span style="font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:0.65rem;">Tipo</span>
                <span style="font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:0.65rem;">Nome</span>
                <span style="font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:0.65rem;">Valor</span>
                <span style="font-weight:700; color:var(--text-muted); text-transform:uppercase; font-size:0.65rem;">TTL</span>
                <span style="color:var(--accent); font-weight:600;">A Record</span>
                <span>www.seunome.com.br</span>
                <span style="font-family:monospace; background:var(--bg-base); border-radius:4px; padding:0 0.35rem;">IP do servidor</span>
                <span>3600</span>
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Enquanto o DNS não propaga, o card mostra <strong style="color:var(--text-primary);">⏳ Aguardando verificação</strong> e a tabela com o registro que você precisa criar no provedor. Depois de verificado, o status vira <strong style="color:var(--green);">✓ Verificado e Ativo</strong> e as instruções somem.</p>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Adicione o seu domínio',            desc:'Digite o endereço que você já comprou (ex: www.seunome.com.br) e clique em Adicionar. O domínio precisa estar registrado em algum provedor — o CliqueZoom não vende domínios.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Crie o registro DNS no provedor',   desc:'Acesse o painel onde comprou o domínio (Hostinger, GoDaddy, Registro.br...) e crie um registro do tipo A com o nome e o IP mostrados na tabela de instruções. TTL: 3600.' },
                { n:3, who:'sistema',   color:'var(--green)',  title:'Aguarde a propagação',              desc:'A mudança de DNS leva de alguns minutos até 48 horas para se espalhar pela internet. Não tem como acelerar — é o tempo normal do sistema de domínios.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Clique em Verificar DNS',           desc:'Quando a propagação terminar, o status muda para ✓ Verificado e Ativo. Se ainda aparecer "não propagado", aguarde mais um pouco e tente de novo.' },
                { n:5, who:'sistema',   color:'var(--green)',  title:'Certificado de segurança automático', desc:'Logo após a verificação, o CliqueZoom gera o certificado SSL sozinho — seu site abre com o cadeado (https) sem nenhuma configuração extra.' },
                { n:6, who:'fotógrafo', color:'var(--accent)', title:'Remover quando quiser',             desc:'O botão Remover desconecta o domínio (com confirmação). Seu site continua no ar normalmente pelo endereço padrão do CliqueZoom.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'integracoes', label: 'Integrações', icon: '<path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Integrações conecta o seu site público às <strong style="color:var(--text-primary);">ferramentas de medição de audiência</strong>: o Google Analytics 4 (quem visita, de onde vem, o que olha) e o Meta Pixel do Facebook/Instagram (essencial se você faz anúncios). Você só cola os códigos aqui — o CliqueZoom instala as tags no seu site sozinho.
        </p>

        <!-- ── VISUALIZAÇÃO DA TELA ─────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>

          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Card GA4 -->
            <div style="background:var(--bg-surface); padding:0.85rem 1rem; border-radius:8px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                <span style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">Google Analytics 4</span>
                <span style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-secondary);"><span style="width:13px; height:13px; border-radius:3px; background:var(--accent); display:inline-flex; align-items:center; justify-content:center; color:var(--accent-on, #ffffff); font-size:0.6rem;">✓</span> Ativar</span>
              </div>
              <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.25rem;">Measurement ID (G-XXXXXXXX)</div>
              <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.65rem; font-size:0.8rem; font-family:monospace; color:var(--text-primary);">G-ABC123456</div>
            </div>
            <!-- Card Meta Pixel -->
            <div style="background:var(--bg-surface); padding:0.85rem 1rem; border-radius:8px; border:1px solid var(--border);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                <span style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">Meta Pixel (Facebook)</span>
                <span style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-secondary);"><span style="width:13px; height:13px; border-radius:3px; border:1px solid var(--border); display:inline-block;"></span> Ativar</span>
              </div>
              <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:0.25rem;">Pixel ID</div>
              <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.65rem; font-size:0.8rem; font-family:monospace; color:var(--text-primary);">1234567890</div>
            </div>
            <!-- Aviso do lembrete de prazo -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem 0.9rem; font-size:0.75rem; color:var(--text-secondary);">💡 O <strong style="color:var(--text-primary);">lembrete de prazo de seleção</strong> agora é configurado em <span style="color:var(--accent); font-weight:600; text-decoration:underline;">Configurações › Escassês &amp; Vendas</span>.</div>
            <span style="background:var(--accent); color:var(--accent-on, #ffffff); padding:0.5rem 1rem; border-radius:6px; font-size:0.78rem; font-weight:700; align-self:flex-start;">Salvar Configurações</span>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Cada ferramenta tem o seu card: marque <strong style="color:var(--text-primary);">Ativar</strong>, cole o código e clique em <strong style="color:var(--text-primary);">Salvar Configurações</strong>. A tag só entra no site quando o card está ativado <em>e</em> com o código preenchido.</p>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Pegue o seu Measurement ID no Google',  desc:'Crie (ou abra) a sua propriedade no Google Analytics 4 e copie o Measurement ID — ele começa com G- (ex: G-ABC123456). Fica em Administrador › Fluxos de dados.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Ative e cole o código do GA4',          desc:'No card Google Analytics 4, marque Ativar e cole o Measurement ID no campo. Sem o Ativar marcado, o código fica guardado mas a medição não liga.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Pegue o Pixel ID no Facebook',          desc:'Se você anuncia no Facebook/Instagram, copie o ID do seu Pixel no Gerenciador de Eventos da Meta (é um número longo). Ele permite medir conversões e criar públicos dos visitantes do seu site.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Salve',                                  desc:'Clique em Salvar Configurações. Pronto — não precisa mexer em código nem instalar nada no site.' },
                { n:5, who:'sistema',   color:'var(--green)',  title:'As tags entram no site sozinhas',        desc:'A partir do próximo acesso, toda visita ao seu site público carrega o Google Analytics e o Meta Pixel automaticamente. Desmarcou Ativar e salvou? A tag sai do site na hora.' },
                { n:6, who:'fotógrafo', color:'var(--accent)', title:'Procurando o lembrete de prazo?',        desc:'O aviso automático para o cliente selecionar as fotos antes do prazo mudou de endereço: agora fica em Configurações › Escassês & Vendas, junto das outras automações.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'marketing', label: 'Marketing', icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Marketing mostra o <strong style="color:var(--text-primary);">desempenho real do seu negócio</strong> — tudo calculado sozinho a partir das suas sessões, sem você configurar nada. Ela tem duas visões, alternadas pelo botão no topo: <strong style="color:var(--text-primary);">Visão Geral</strong> (números, funil e taxas) e <strong style="color:var(--text-primary);">Vendas Automáticas</strong> (o robô que lembra o cliente do prazo e vende as fotos que sobraram após a entrega).
        </p>

        <!-- ── VISUALIZAÇÃO: VISÃO GERAL ─────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização — Visão Geral</p>

          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Toggle -->
            <div style="display:inline-flex; gap:0.25rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:9999px; padding:0.25rem; align-self:flex-start;">
              <span style="padding:0.3rem 0.7rem; font-size:0.72rem; font-weight:600; border-radius:9999px; background:var(--accent); color:var(--accent-on, #ffffff);">Visão Geral</span>
              <span style="padding:0.3rem 0.7rem; font-size:0.72rem; font-weight:600; border-radius:9999px; color:var(--text-primary);">Vendas Automáticas</span>
            </div>
            <!-- KPIs -->
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.6rem;">
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem;">
                <div style="font-size:0.58rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Sessões (30d)</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">8</div>
                <div style="font-size:0.6rem; color:var(--green);">+33% vs mês anterior</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem;">
                <div style="font-size:0.58rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Clientes (30d)</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">5</div>
                <div style="font-size:0.6rem; color:var(--text-muted);">42 no total</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem;">
                <div style="font-size:0.58rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Taxa de Acesso</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">85%</div>
                <div style="font-size:0.6rem; color:var(--text-muted);">cliente abriu a galeria</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem;">
                <div style="font-size:0.58rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">Taxa de Entrega</div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">90%</div>
                <div style="font-size:0.6rem; color:var(--text-muted);">seleções entregues</div>
              </div>
            </div>
            <!-- Funil -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem;">
              <div style="font-size:0.78rem; font-weight:700; color:var(--text-primary); margin-bottom:0.6rem;">Funil de Sessões</div>
              ${[
                { label:'Sessões criadas', pct:100, val:'20 (100%)', color:'var(--accent)' },
                { label:'Código enviado',  pct:85,  val:'17 (85%)',  color:'#3b82f6' },
                { label:'Cliente acessou', pct:70,  val:'14 (70%)',  color:'var(--green)' },
                { label:'Seleção enviada', pct:55,  val:'11 (55%)',  color:'var(--yellow)' },
                { label:'Entregue',        pct:50,  val:'10 (50%)',  color:'#a855f7' },
              ].map(f => `
                <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.35rem;">
                  <div style="width:6.5rem; text-align:right; font-size:0.62rem; color:var(--text-secondary); flex-shrink:0;">${f.label}</div>
                  <div style="flex:1; background:color-mix(in srgb, var(--text-primary) 8%, transparent); height:0.85rem; border-radius:0.2rem; overflow:hidden;"><div style="width:${f.pct}%; height:100%; background:${f.color}; border-radius:0.2rem;"></div></div>
                  <div style="width:3.6rem; font-size:0.62rem; font-weight:600; color:var(--text-primary);">${f.val}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Abaixo do funil a tela ainda mostra o <strong style="color:var(--text-primary);">status atual</strong> das sessões, os <strong style="color:var(--text-primary);">modos</strong> e <strong style="color:var(--text-primary);">tipos de evento</strong> mais frequentes, o resumo das vendas automáticas e o estado do Google Analytics.</p>
        </div>

        <!-- ── VISUALIZAÇÃO: VENDAS AUTOMÁTICAS ──────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização — Vendas Automáticas</p>

          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Status do robô -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                <div>
                  <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary);">Lembrete &amp; Escassês de Vendas</div>
                  <div style="font-size:0.62rem; color:var(--text-muted);">Lembra o cliente de selecionar e vende as fotos que sobraram após a entrega.</div>
                </div>
                <span style="background:var(--accent); color:var(--accent-on, #ffffff); padding:0.35rem 0.8rem; border-radius:6px; font-size:0.68rem; font-weight:700;">Configurar</span>
              </div>
              <div style="display:flex; gap:0.5rem; margin-top:0.7rem; flex-wrap:wrap;">
                <span style="display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.65rem; border:1px solid var(--border); border-radius:9999px; font-size:0.62rem; color:var(--text-primary);"><span style="width:7px; height:7px; border-radius:9999px; background:var(--green);"></span> Lembrete de seleção: <strong style="color:var(--green);">Ativado</strong></span>
                <span style="display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.65rem; border:1px solid var(--border); border-radius:9999px; font-size:0.62rem; color:var(--text-primary);"><span style="width:7px; height:7px; border-radius:9999px; background:var(--text-muted);"></span> Escassês de vendas: <strong style="color:var(--text-muted);">Desativado</strong></span>
              </div>
            </div>
            <!-- KPIs do robô -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem;">
              ${[
                ['📁 Sessões monitoradas','3'], ['🖼️ Fotos pendentes','27'], ['💰 Receita potencial','R$ 810,00'],
              ].map(([l,v]) => `
                <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.6rem 0.7rem;">
                  <div style="font-size:0.55rem; text-transform:uppercase; color:var(--text-muted);">${l}</div>
                  <div style="font-size:0.95rem; font-weight:700; color:var(--text-primary);">${v}</div>
                </div>
              `).join('')}
            </div>
            <!-- Cupom -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem;">
              <div style="font-size:0.78rem; font-weight:700; color:var(--text-primary); margin-bottom:0.5rem;">Cupons emitidos</div>
              <div style="border:1px solid var(--border); border-radius:6px; padding:0.55rem 0.75rem; display:flex; justify-content:space-between; align-items:center; gap:0.6rem; flex-wrap:wrap;">
                <div style="min-width:0;">
                  <div style="font-family:monospace; font-weight:700; font-size:0.72rem; color:var(--text-primary); letter-spacing:0.05em;">CZ-MARIA15</div>
                  <div style="font-size:0.6rem; color:var(--text-muted);">Casamento Maria · 7 dias (pós-entrega) · enviado em 02 de jun.</div>
                </div>
                <div style="display:flex; align-items:center; gap:0.4rem;">
                  <span style="font-size:0.58rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:20px; background:color-mix(in srgb, var(--text-muted) 15%, transparent); color:var(--text-secondary);">Em aberto</span>
                  <span style="font-size:0.6rem; font-weight:700; padding:0.25rem 0.55rem; border-radius:5px; background:var(--green); color:#fff;">Marcar como usado</span>
                </div>
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">O robô e os textos das mensagens são configurados em <strong style="color:var(--text-primary);">Configurações › Escassês &amp; Vendas</strong> — aqui você acompanha o resultado e gerencia os cupons.</p>
        </div>

        <!-- ── PASSO A PASSO NUMERADO ─────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'sistema',   color:'var(--green)',  title:'Os números se calculam sozinhos',       desc:'Tudo na Visão Geral vem das suas sessões reais: quantas você criou nos últimos 30 dias, quantos clientes entraram e as taxas de acesso e entrega. Não há nada para configurar — é só ler.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Leia o funil de cima para baixo',        desc:'O funil mostra onde os clientes travam: se muitos receberam o código mas poucos acessaram, vale reenviar o link; se acessam mas não finalizam a seleção, um lembrete resolve. Cada degrau que cai é uma oportunidade de cobrança gentil.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Conecte o Google Analytics (opcional)',  desc:'O último card mostra se o GA está ligado. Se ainda não estiver, configure o Measurement ID na aba Integrações — aí você passa a ver visitas e origem de tráfego do seu site no painel do Google.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Alterne para Vendas Automáticas',        desc:'O botão no topo troca para a visão do robô de vendas: as pills mostram se o lembrete de seleção e a escassês pós-entrega estão ativados, e o botão Configurar leva direto para Configurações › Escassês & Vendas.' },
                { n:5, who:'sistema',   color:'var(--green)',  title:'O robô emite cupons sozinho',            desc:'Com a escassês pós-entrega ativada, o robô avisa o cliente quando as fotos não compradas estão para expirar e envia um cupom de desconto. Cada cupom emitido aparece na lista, com a sessão e a data do envio.' },
                { n:6, who:'fotógrafo', color:'var(--accent)', title:'Fechou a venda? Marque o cupom',         desc:'A negociação acontece direto com você (WhatsApp, Pix) — a plataforma não cobra o cliente. Quando a venda fechar, clique em Marcar como usado para o cupom contar como convertido. Errou? O Desmarcar volta atrás.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'perfil', label: 'Perfil', icon: '<circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Perfil guarda a <strong style="color:var(--text-primary);">identidade do seu negócio</strong>: os dados de contato que aparecem para o cliente, o logotipo e o editor de <strong style="color:var(--text-primary);">marca d'água em camadas</strong> — a proteção que cobre as fotos na fase de prévia e some sozinha na entrega.
        </p>

        <!-- ── VISUALIZAÇÃO: DADOS + LOGO ─────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização — Dados do Negócio</p>
          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem;">
              <div style="font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.6rem;">Dados do Negócio</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                ${[['Nome do Negócio','Fotografia Maria Silva'],['Email de Contato','contato@mariasilva.com'],['Telefone / WhatsApp','(11) 99999-8888'],['Website','mariasilva.com.br']].map(([l,v]) => `
                  <div>
                    <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:0.2rem;">${l}</div>
                    <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:5px; padding:0.35rem 0.55rem; font-size:0.68rem; color:var(--text-primary);">${v}</div>
                  </div>`).join('')}
              </div>
            </div>
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.85rem 1rem; display:flex; align-items:center; gap:0.85rem;">
              <div style="background:#fff; border-radius:4px; padding:0.3rem 0.7rem; font-family:'Playfair Display',serif; font-size:0.8rem; color:#1a1a1a; border:1px solid var(--border);">Maria Silva</div>
              <span style="background:var(--bg-elevated); color:var(--text-primary); border:1px solid var(--border); padding:0.35rem 0.8rem; border-radius:6px; font-size:0.68rem; font-weight:600;">Enviar Logo</span>
            </div>
            <span style="background:var(--accent); color:var(--accent-on, #ffffff); padding:0.45rem 1.1rem; border-radius:6px; font-size:0.75rem; font-weight:700; align-self:flex-end;">Salvar Perfil</span>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Os dados do negócio só gravam quando você clica em <strong style="color:var(--text-primary);">Salvar Perfil</strong>. Já a marca d'água (abaixo) salva sozinha a cada ajuste.</p>
        </div>

        <!-- ── VISUALIZAÇÃO: EDITOR DE MARCA D'ÁGUA ──────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização — Marca D'água em Camadas</p>
          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.7rem;">
            <div style="display:flex; gap:0.3rem; flex-wrap:wrap; align-items:center;">
              <span style="background:var(--accent); color:var(--accent-on, #ffffff); padding:0.3rem 0.7rem; border-radius:5px; font-size:0.65rem; font-weight:700;">+ Texto</span>
              <span style="background:var(--bg-elevated); color:var(--text-primary); border:1px solid var(--border); padding:0.3rem 0.7rem; border-radius:5px; font-size:0.65rem;">+ Imagem</span>
              <span style="border:1px solid var(--border); color:var(--text-primary); padding:0.3rem 0.5rem; border-radius:5px; font-size:0.65rem;">⧉</span>
              <span style="border:1px solid var(--border); color:var(--text-primary); padding:0.3rem 0.5rem; border-radius:5px; font-size:0.65rem;">↑</span>
              <span style="border:1px solid var(--border); color:var(--text-primary); padding:0.3rem 0.5rem; border-radius:5px; font-size:0.65rem;">↓</span>
              <span style="border:1px solid var(--red); color:var(--red); padding:0.3rem 0.5rem; border-radius:5px; font-size:0.65rem;">🗑</span>
              <span style="border:1px solid var(--border); color:var(--text-muted); padding:0.3rem 0.5rem; border-radius:5px; font-size:0.62rem;">↺ Padrão</span>
            </div>
            <div style="display:grid; grid-template-columns:1.6fr 1fr; gap:0.7rem; align-items:start;">
              <div>
                <div style="position:relative; width:100%; aspect-ratio:4/3; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%); border-radius:8px; overflow:hidden;">
                  <div style="position:absolute; left:5%; top:40%; width:90%; text-align:center; transform:rotate(-25deg); opacity:0.4; border:1.5px dashed rgba(99,102,241,0.9); border-radius:3px; padding:0.3rem 0;">
                    <span style="color:#fff; font-size:0.8rem; font-weight:700; letter-spacing:2px; text-shadow:0 0 5px rgba(0,0,0,0.9);">Cópia não autorizada</span>
                  </div>
                  <div style="position:absolute; right:6%; bottom:8%; opacity:0.35;">
                    <span style="color:#fff; font-size:0.6rem; font-style:italic; font-family:'Playfair Display',serif;">Maria Silva</span>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.25rem; margin-top:0.5rem;">
                  <div style="display:flex; justify-content:space-between; padding:0.3rem 0.6rem; border-radius:5px; background:var(--accent); color:var(--bg-base); font-size:0.62rem;"><span>✏️ Cópia não autorizada</span><span style="opacity:0.6;">camada 2</span></div>
                  <div style="display:flex; justify-content:space-between; padding:0.3rem 0.6rem; border-radius:5px; background:var(--bg-base); border:1px solid var(--border); color:var(--text-primary); font-size:0.62rem;"><span>✏️ Maria Silva</span><span style="opacity:0.5;">camada 1</span></div>
                </div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem;">
                <div style="font-size:0.58rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; border-bottom:1px solid var(--border); padding-bottom:0.3rem; margin-bottom:0.5rem;">✏️ Camada de Texto</div>
                <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:0.15rem;">Texto</div>
                <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:4px; padding:0.3rem 0.5rem; font-size:0.62rem; color:var(--text-primary); margin-bottom:0.5rem;">Cópia não autorizada</div>
                ${[['Opacidade','35%',35],['Rotação','-25°',43]].map(([l,v,p]) => `
                  <div style="margin-bottom:0.45rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:var(--text-muted);"><span>${l}</span><span style="color:var(--text-primary);">${v}</span></div>
                    <div style="height:4px; background:color-mix(in srgb, var(--text-primary) 12%, transparent); border-radius:2px; margin-top:0.2rem;"><div style="width:${p}%; height:100%; background:var(--accent); border-radius:2px;"></div></div>
                  </div>`).join('')}
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;"><strong style="color:var(--text-primary);">Arraste</strong> a camada para posicionar, puxe os <strong style="color:var(--text-primary);">cantos</strong> para redimensionar e <strong style="color:var(--text-primary);">clique</strong> para abrir o painel de edição. Cada mudança salva sozinha (toast "Marca d'água salva!").</p>
        </div>

        <!-- ── PASSO A PASSO ─────────────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Preencha os dados do negócio',        desc:'Nome, e-mail, WhatsApp e site. São esses dados que aparecem para o cliente nos e-mails, no WhatsApp e no rodapé do seu site. Clique em Salvar Perfil para gravar — o nome é obrigatório.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Envie o seu logotipo',                desc:'Clique em Enviar Logo (JPG, PNG, SVG ou WebP). Ele aparece no site público, na galeria do cliente e pode virar uma camada da marca d\'água.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Monte a marca d\'água em camadas',    desc:'O editor já vem com um template pronto. Arraste cada camada para posicionar, puxe os cantos para redimensionar e clique nela para editar texto, fonte, cor, opacidade e rotação no painel ao lado.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Adicione, duplique e organize',       desc:'+ Texto e + Imagem criam camadas novas; ⧉ duplica a selecionada; ↑ ↓ mudam a ordem (o que fica por cima); 🗑 deleta; ↺ Padrão volta ao template de fábrica. Tudo salva sozinho.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Teste nos 3 fundos',                  desc:'Os botões de fundo (escuro, claro, colorido) simulam fotos diferentes — confira se a marca fica visível sem atrapalhar. Dica: opacidade entre 30% e 45% costuma equilibrar bem.' },
                { n:6, who:'sistema',   color:'var(--green)',  title:'A marca protege a prévia e some na entrega', desc:'O cliente vê a marca d\'água sobre todas as fotos enquanto escolhe. Depois que você entrega a sessão, as fotos saem limpas para download — sem você fazer nada.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'plano', label: 'Plano', icon: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Plano mostra <strong style="color:var(--text-primary);">quanto do seu plano você já usou</strong> — sessões, fotos e espaço em disco — e compara os planos disponíveis. As barras mudam de cor conforme o uso aperta, para você nunca ser pego de surpresa.
        </p>

        <!-- ── VISUALIZAÇÃO ───────────────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>
          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Card do plano atual -->
            <div style="background:var(--bg-surface); border:2px solid var(--accent); border-radius:8px; padding:0.9rem 1rem;">
              <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary);">Basic</div>
              <div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:0.7rem;">R$ 49,00/mês · Renova em 15/07/2026</div>
              ${[
                ['Sessões','12 / 50',24,'var(--accent)'],
                ['Fotos','3.800 / 5.000',76,'var(--yellow)'],
                ['Armazenamento (MB)','9.200 / 10.000',92,'var(--red)'],
              ].map(([l,v,p,c]) => `
                <div style="margin-bottom:0.55rem;">
                  <div style="display:flex; justify-content:space-between; font-size:0.65rem;"><span style="color:var(--text-secondary);">${l}</span><span style="color:var(--text-primary); font-weight:600;">${v}</span></div>
                  <div style="height:5px; background:color-mix(in srgb, var(--text-primary) 12%, transparent); border-radius:99px; margin-top:0.2rem; overflow:hidden;"><div style="width:${p}%; height:100%; background:${c}; border-radius:99px;"></div></div>
                  ${p >= 90 ? '<div style="font-size:0.58rem; color:var(--red); margin-top:0.15rem;">⚠ Limite quase atingido</div>' : ''}
                </div>`).join('')}
              <div style="display:flex; gap:0.7rem; border-top:1px solid var(--border); padding-top:0.5rem; font-size:0.58rem; color:var(--text-muted);">
                <span>Sessões: 8.900 MB</span><span>Site: 250 MB</span><span>Vídeos: 50 MB</span>
              </div>
            </div>
            <!-- Cards de planos -->
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0.6rem;">
              ${[['Free','Grátis',false],['Basic','R$ 49,00',true],['Pro','R$ 99,00',false]].map(([n,p,atual]) => `
                <div style="background:var(--bg-surface); border:2px solid ${atual ? 'var(--accent)' : 'var(--border)'}; border-radius:8px; padding:0.7rem; position:relative;">
                  ${atual ? '<span style="position:absolute; top:-1px; right:0.5rem; background:var(--accent); color:var(--accent-on, #ffffff); font-size:0.5rem; font-weight:700; padding:0.1rem 0.4rem; border-radius:0 0 4px 4px;">ATUAL</span>' : ''}
                  <div style="font-size:0.72rem; font-weight:700; color:var(--text-primary);">${n}</div>
                  <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary); margin-bottom:0.4rem;">${p}</div>
                  <div style="font-size:0.55rem; color:var(--text-muted); line-height:1.6;">✓ Sessões<br>✓ Armazenamento<br>✓ Suporte</div>
                  ${atual
                    ? '<div style="margin-top:0.4rem; text-align:center; border:1px solid var(--border); border-radius:4px; padding:0.25rem; font-size:0.55rem; color:var(--text-muted);">Plano Atual</div>'
                    : '<div style="margin-top:0.4rem; text-align:center; background:var(--accent); opacity:0.45; color:var(--accent-on, #ffffff); border-radius:4px; padding:0.25rem; font-size:0.55rem; font-weight:700;">Em Breve</div>'}
                </div>`).join('')}
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Barra <strong style="color:var(--text-primary);">escura</strong> = uso tranquilo · <strong style="color:var(--yellow);">amarela</strong> = passou de 70% · <strong style="color:var(--red);">vermelha</strong> = passou de 90% (com aviso). Limite ∞ = ilimitado no seu plano.</p>
        </div>

        <!-- ── PASSO A PASSO ─────────────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Acompanhe as barras de uso',          desc:'Sessões, fotos e armazenamento do seu plano, sempre atualizados. A cor avisa sozinha: amarelo passou de 70%, vermelho passou de 90% — hora de liberar espaço ou subir de plano.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Entenda o espaço em disco',           desc:'Abaixo das barras, o armazenamento aparece dividido: fotos das sessões, imagens do site e vídeos. Sessões antigas já entregues são as maiores candidatas a limpeza.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Compare os planos',                   desc:'Os cards mostram preço e o que cada plano inclui. O seu plano atual fica marcado com a etiqueta ATUAL.' },
                { n:4, who:'sistema',   color:'var(--green)',  title:'Upgrade online em breve',             desc:'O pagamento online dentro da plataforma está chegando — por enquanto os botões mostram "Em Breve". Precisa de mais limite agora? Fale com o suporte.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Cancelamento sem pegadinha',          desc:'Em planos pagos, o botão Cancelar Plano agenda o cancelamento: você continua com tudo até o fim do período já pago e depois volta ao plano gratuito.' },
                { n:6, who:'sistema',   color:'var(--green)',  title:'Os limites se aplicam sozinhos',      desc:'Ao atingir um limite, o CliqueZoom avisa na hora de criar sessões ou subir fotos — nada é apagado e nada quebra. Os seus dados ficam sempre seguros.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
  { id: 'configuracoes', label: 'Configurações', icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', content: `
      <div style="display:flex; flex-direction:column; gap:2rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0 0 0.75rem;">
          A aba Configurações deixa o CliqueZoom com o <strong style="color:var(--text-primary);">seu jeito de trabalhar</strong>: as mensagens que vão para o cliente, os padrões de cada sessão nova, o modo de entrega das galerias, os avisos que você recebe e o robô de Escassês &amp; Vendas. <strong style="color:var(--text-primary);">Tudo salva sozinho</strong> enquanto você edita — repare no "✓ Salvo" no canto de cada cartão.
        </p>

        <!-- ── VISUALIZAÇÃO ───────────────────────────────────────────────── -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 1rem;">Visualização da Tela</p>
          <div style="border:1px solid var(--border); border-radius:10px; padding:1rem; background:var(--bg-base); pointer-events:none; display:flex; flex-direction:column; gap:0.85rem;">
            <!-- Sub-nav -->
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${['Mensagens','Sessões','Entrega','Notificações','Escassês & Vendas'].map((s,i) => `
                <span style="padding:0.3rem 0.8rem; border-radius:9999px; font-size:0.65rem; font-weight:600; border:1px solid ${i===0 ? 'var(--accent)' : 'var(--border)'}; background:${i===0 ? 'var(--accent)' : 'var(--bg-elevated)'}; color:${i===0 ? 'var(--accent-on, #ffffff)' : 'var(--text-secondary)'};">${s}</span>`).join('')}
            </div>
            <!-- Card Mensagens -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.9rem 1rem;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.85rem; font-weight:700; color:var(--text-primary);">Mensagens</div>
                <span style="font-size:0.62rem; font-weight:700; color:var(--green);">✓ Salvo</span>
              </div>
              <div style="font-size:0.68rem; font-weight:600; color:var(--text-primary); margin:0.6rem 0 0.25rem;">WhatsApp — envio do link</div>
              <div style="display:flex; gap:0.3rem; flex-wrap:wrap; margin-bottom:0.35rem;">
                <span style="font-size:0.55rem; color:var(--text-muted);">Inserir:</span>
                ${['{nome}','{negocio}','{evento}','{link}','{codigo}'].map(v => `<span style="font-family:monospace; font-size:0.55rem; background:var(--bg-elevated); border:1px solid var(--border); color:var(--accent); border-radius:4px; padding:0.05rem 0.3rem;">${v}</span>`).join('')}
              </div>
              <div style="background:var(--bg-base); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.6rem; font-size:0.62rem; color:var(--text-primary); line-height:1.5;">Olá {nome}! 📸 As fotos do seu {evento} já estão prontas...</div>
              <div style="font-size:0.52rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin:0.45rem 0 0.2rem;">Pré-visualização</div>
              <div style="background:var(--bg-base); border:1px dashed var(--border); border-radius:6px; padding:0.45rem 0.6rem; font-size:0.62rem; color:var(--text-secondary); line-height:1.5;">Olá Marina! 📸 As fotos do seu casamento já estão prontas...</div>
            </div>
            <!-- Mini-cards das outras seções -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem 0.85rem;">
                <div style="font-size:0.68rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Padrões de novas sessões</div>
                <div style="font-size:0.58rem; color:var(--text-muted); line-height:1.7;">Pacote: <strong style="color:var(--text-primary);">30 fotos</strong> · Extra: <strong style="color:var(--text-primary);">R$ 25</strong><br>Resolução: <strong style="color:var(--text-primary);">1200px</strong> · ✓ Comentários</div>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.7rem 0.85rem;">
                <div style="font-size:0.68rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Escassês &amp; Vendas</div>
                <div style="font-size:0.58rem; color:var(--text-muted); line-height:1.7;">● Lembrete de seleção: <strong style="color:var(--green);">Ativado</strong><br>● Pós-entrega: cupom <strong style="color:var(--text-primary);">CZ</strong> · 15/7/1 dias</div>
              </div>
            </div>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.75rem; line-height:1.5;">Campo de mensagem <strong style="color:var(--text-primary);">em branco</strong> = o app usa a mensagem otimizada, que muda conforme o tipo de evento (casamento, newborn...). A pré-visualização mostra o texto como o cliente vai receber.</p>
        </div>

        <!-- ── PASSO A PASSO ─────────────────────────────────────────────── -->
        <div style="border:1px solid color-mix(in srgb, var(--accent) 20%, transparent); border-radius:12px; overflow:hidden;">
          <div style="background:color-mix(in srgb, var(--accent) 8%, transparent); border-bottom:1px solid color-mix(in srgb, var(--accent) 20%, transparent); padding:0.875rem 1.125rem; display:flex; align-items:center; gap:0.625rem;">
            <span style="width:10px; height:10px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>
            <span style="font-size:0.875rem; font-weight:800; color:var(--text-primary);">Passo a passo: O que fazer aqui?</span>
          </div>
          <div style="padding:1rem 1.125rem; background:var(--bg-surface);">
            <div style="display:flex; flex-direction:column; gap:0;">
              ${[
                { n:1, who:'fotógrafo', color:'var(--accent)', title:'Personalize as mensagens',             desc:'Em Mensagens, escreva o seu texto padrão para o envio do link e a entrega (e-mail e WhatsApp). Use os chips de variáveis — {nome}, {evento}, {link} — e confira na pré-visualização. Em branco, o app usa a mensagem otimizada por tipo de evento.' },
                { n:2, who:'fotógrafo', color:'var(--accent)', title:'Defina os padrões de sessão',          desc:'Em Sessões: pacote de fotos, preço da foto extra, resolução e prazo padrão, além dos toggles de compra extra, reabertura e comentários. Cada sessão nova já nasce preenchida assim — e você ainda pode ajustar caso a caso.' },
                { n:3, who:'fotógrafo', color:'var(--accent)', title:'Escolha o padrão de entrega',          desc:'Em Entrega, decida o que acontece nas galerias: sempre perguntar, compartilhar prévia com marca d\'água, ou entregar direto para download.' },
                { n:4, who:'fotógrafo', color:'var(--accent)', title:'Controle os avisos que você recebe',   desc:'Em Notificações, ligue ou desligue os e-mails de quando o cliente finaliza a seleção, pede fotos extras ou pede reabertura.' },
                { n:5, who:'fotógrafo', color:'var(--accent)', title:'Ligue a Escassês & Vendas',            desc:'O lembrete de seleção avisa o cliente antes do prazo (sem desconto). Depois da entrega, a escassês oferece as fotos que sobraram com desconto crescente — 15, 7 e 1 dia antes da exclusão — com cupom personalizado.' },
                { n:6, who:'sistema',   color:'var(--green)',  title:'Tudo salva sozinho',                   desc:'Não existe botão Salvar: cada mudança grava na hora ("Salvando… → ✓ Salvo"). Pode fechar a aba sem medo.' }
              ].map((s, i, arr) => `
                <div style="display:flex; gap:0.875rem;">
                  <div style="display:flex; flex-direction:column; align-items:center; flex-shrink:0;">
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:var(--bg-base); display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
                    ${i < arr.length - 1 ? `<div style="width:2px; flex:1; min-height:16px; background:var(--border); margin:3px 0;"></div>` : ''}
                  </div>
                  <div style="padding-bottom:${i < arr.length - 1 ? '0.625rem' : '0'}; min-width:0;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                      <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">${s.title}</span>
                      <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; padding:0.1rem 0.4rem; border-radius:9999px; background:color-mix(in srgb, ${s.color} 15%, transparent); color:${s.color};">${s.who}</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-secondary); margin:0; line-height:1.55;">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    ` },
];

function renderDynamicContent(blocks) {
  if (!blocks || !blocks.length) return '';
  return blocks.map(b => {
    if (b.type === 'intro') {
      return `<p style="color:var(--text-secondary); font-size:0.9375rem; line-height:1.6; margin:0 0 1.5rem 0;">${b.content}</p>`;
    }
    if (b.type === 'callout') {
      const colors = {
        accent: { bg: 'rgba(99,102,241,0.1)', border: 'var(--accent)', text: 'var(--text-primary)' },
        green:  { bg: 'rgba(34,197,94,0.1)', border: 'var(--green)', text: 'var(--text-primary)' },
        yellow: { bg: 'rgba(234,179,8,0.1)', border: 'var(--yellow)', text: 'var(--text-primary)' },
        red:    { bg: 'rgba(239,68,68,0.1)', border: 'var(--red)', text: 'var(--text-primary)' },
      };
      const c = colors[b.color] || colors.accent;
      return `<div style="background:${c.bg}; border-left:3px solid ${c.border}; padding:1rem; border-radius:0 0.5rem 0.5rem 0; margin-bottom:1.5rem; color:${c.text}; font-size:0.875rem; line-height:1.5;">${b.content}</div>`;
    }
    if (b.type === 'image') {
      if (!b.url) return '';
      return `
        <figure style="margin:0 0 1.5rem 0;">
          <img src="${b.url}" alt="${b.caption || 'Captura de tela'}" loading="lazy"
            style="max-width:100%; border-radius:0.5rem; border:1px solid var(--border); display:block; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          ${b.caption ? `<figcaption style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem; text-align:center;">${b.caption}</figcaption>` : ''}
        </figure>`;
    }
    if (b.type === 'steps') {
      return `
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:0.8125rem; font-weight:700; color:var(--text-secondary); letter-spacing:0.05em; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; justify-content:center;">
            <div style="flex:1; height:1px; background:var(--border);"></div>
            PASSO A PASSO
            <div style="flex:1; height:1px; background:var(--border);"></div>
          </h4>
          <div style="display:flex; flex-direction:column; gap:0; position:relative; padding-left:1.5rem;">
            <div style="position:absolute; left:0; top:0; bottom:0; width:1px; background:var(--border);"></div>
            ${b.steps.map(s => `
              <div style="position:relative; margin-bottom:1.5rem;">
                <div style="position:absolute; left:-1.5rem; top:0; width:0; display:flex; justify-content:center;">
                  <div style="width:1.5rem; height:1.5rem; background:var(--bg-surface); border:2px solid var(--${s.color}); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; color:var(--${s.color}); z-index:1;">${s.n}</div>
                </div>
                <div>
                  <span style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">${s.who === 'sistema' ? 'SISTEMA CLIQUEZOOM' : (s.who === 'cliente' ? 'O CLIENTE' : 'O FOTÓGRAFO')}</span>
                  <h5 style="font-size:0.9375rem; font-weight:700; color:var(--text-primary); margin:0.25rem 0;">${s.title}</h5>
                  <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.5; margin:0;">${s.desc}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    return '';
  }).join('');
}

function renderManualHTML() {
  return `
    <div style="display:flex; flex-direction:column; gap:0; border-radius:12px; overflow:hidden; border:1px solid var(--border);">
      ${activeManualModules.map((mod, i) => {
        const isOpen = openSections[mod.id] || false;
        const notLast = i < activeManualModules.length - 1;
        
        let bodyHtml = '';
        if (mod.content) {
          bodyHtml = mod.content;
        } else if (mod.blocks && mod.blocks.length > 0) {
          bodyHtml = renderDynamicContent(mod.blocks);
        } else {
          bodyHtml = '<p style="color:var(--text-muted); font-size:0.875rem; padding-top:1rem; margin:0; font-style:italic;">Conteúdo em breve.</p>';
        }

        return `
          <div style="${notLast ? 'border-bottom:1px solid var(--border);' : ''}">
            <button data-manual-toggle="${mod.id}" style="width:100%; display:flex; align-items:center; gap:0.875rem; padding:1rem 1.25rem; background:var(--bg-surface); border:none; cursor:pointer; text-align:left; font-family:inherit;">
              <div style="width:40px; height:40px; border-radius:50%; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1px solid var(--border);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${mod.icon}</svg>
              </div>
              <span style="font-size:0.9375rem; font-weight:700; color:var(--text-primary); flex:1;">${mod.label}</span>
              ${(!mod.content && (!mod.blocks || mod.blocks.length === 0)) ? '<span style="font-size:0.6875rem; color:var(--text-muted); font-weight:600; margin-right:0.5rem;">Em breve</span>' : ''}
              <svg id="manual-arrow-${mod.id}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s; transform:${isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}; color:var(--text-muted); flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div id="manual-body-${mod.id}" style="display:${isOpen ? 'block' : 'none'}; padding:0 1.25rem 1.25rem; background:var(--bg-surface); border-top:1px solid var(--border);">
              ${bodyHtml}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window._setAjudaView = function(view) {
  ajudaView = view;
  activeServico = null; // ao trocar de sub-aba, sempre volta ao grid de serviços
  const container = document.getElementById('tabContent');
  if (container) renderLayout(container);
};

// ─────────────────────────────────────────────────────────────────────────────
// FALA CONOSCO — Sistema de Suporte (Tickets)
// ─────────────────────────────────────────────────────────────────────────────

async function renderFalaConosco(container) {
  // Carregar tickets
  try {
    const res = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    if (!res.ok) {
      container.innerHTML = '<p style="color:var(--red); padding:1rem;">Erro ao carregar chamados</p>';
      return;
    }
    const data = await res.json();
    allTickets = data.tickets || [];
  } catch (error) {
    window.showToast?.('Erro ao carregar chamados', 'error');
    container.innerHTML = '<p style="color:var(--red); padding:1rem;">Erro ao carregar chamados</p>';
    return;
  }

  // Renderizar lista ou thread
  if (ticketListView === 'list') {
    renderTicketList(container);
  } else {
    renderTicketThread(container);
  }
}

function renderTicketList(container) {
  const html = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:900px; margin:0 auto;">
      <!-- Header + Botão novo -->
      <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:1.25rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border);">
        <div style="display:flex; flex-direction:column; align-items:center;">
          <h2 style="font-size:1.5rem; font-weight:800; margin:0 0 0.25rem 0; color:var(--text-primary);">Meus Chamados</h2>
          <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">Envie dúvidas, reporte bugs ou compartilhe sugestões</p>
        </div>
        <button onclick="window._openTicketForm()" class="morph-btn-main">
          <div class="morph-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span class="morph-label">Novo Chamado</span>
        </button>
      </div>

      <!-- Lista de Tickets -->
      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        ${allTickets.length === 0 ? `
          <div style="text-align:center; padding:2rem 1rem; color:var(--text-muted);">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5; margin:0 auto 0.5rem;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p style="margin:0; font-size:0.875rem;">Nenhum chamado ainda. Clique em "Novo Chamado" para começar!</p>
          </div>
        ` : `
          ${allTickets.map(t => `
            <div onclick="window._openTicketDetail('${t._id}')" style="
              padding:1rem;
              background:var(--bg-surface);
              border:1px solid var(--border);
              border-radius:8px;
              cursor:pointer;
              transition:all 0.2s;
              display:flex;
              justify-content:space-between;
              align-items:flex-start;
              gap:1rem;
            " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                  <span style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${_esc(t.subject)}</span>
                  <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; padding:0.2rem 0.5rem; border-radius:9999px; background:${getCategoryColor(t.category).bg}; color:${getCategoryColor(t.category).text};">
                    ${getCategoryLabel(t.category)}
                  </span>
                </div>
                <p style="margin:0 0 0.5rem 0; color:var(--text-secondary); font-size:0.875rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  ${t.messages.length > 0 ? _esc(t.messages[t.messages.length - 1].text.substring(0, 60)) + (t.messages[t.messages.length - 1].text.length > 60 ? '…' : '') : 'Sem mensagens'}
                </p>
                <p style="margin:0; color:var(--text-muted); font-size:0.75rem;">
                  ${_formatDate(new Date(t.updatedAt))} • ${t.messages.length} mensagem${t.messages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span style="
                font-weight:700;
                font-size:0.75rem;
                text-transform:uppercase;
                padding:0.4rem 0.75rem;
                border-radius:9999px;
                background:${getStatusColor(t.status).bg};
                color:${getStatusColor(t.status).text};
                flex-shrink:0;
              ">
                ${getStatusLabel(t.status)}
              </span>
            </div>
          `).join('')}
        `}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

function renderTicketThread(container) {
  const ticket = allTickets.find(t => t._id === activeTicketId);
  if (!ticket) {
    ticketListView = 'list';
    renderFalaConosco(container);
    return;
  }

  const html = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:900px; margin:0 auto;">
      <!-- Voltar + Info do Ticket -->
      <div style="display:flex; align-items:center; gap:1rem; padding-bottom:1rem; border-bottom:1px solid var(--border);">
        <button onclick="window._backToTicketList()" style="padding:0.5rem 1rem; background:transparent; border:1px solid var(--border); border-radius:6px; cursor:pointer; font-weight:600; font-size:0.875rem; transition:all 0.2s; font-family:inherit;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
          ← Voltar
        </button>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
            <span style="font-weight:800; font-size:1.125rem; color:var(--text-primary);">${_esc(ticket.subject)}</span>
            <span style="font-size:0.65rem; font-weight:700; text-transform:uppercase; padding:0.2rem 0.5rem; border-radius:9999px; background:${getStatusColor(ticket.status).bg}; color:${getStatusColor(ticket.status).text};">
              ${getStatusLabel(ticket.status)}
            </span>
          </div>
          <p style="margin:0; font-size:0.75rem; color:var(--text-muted);">
            Criado em ${_formatDate(new Date(ticket.createdAt))}
          </p>
        </div>
      </div>

      <!-- Thread de Mensagens -->
      <div style="display:flex; flex-direction:column; gap:1rem; max-height:500px; overflow-y:auto; padding:0.5rem 0;">
        ${ticket.messages.map((msg, i) => `
          <div style="display:flex; gap:0.75rem; ${msg.from === 'admin' ? 'flex-direction:row-reverse' : ''}">
            <div style="
              width:32px;
              height:32px;
              border-radius:50%;
              background:${msg.from === 'admin' ? 'var(--green)' : 'var(--accent)'};
              color:#fff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-weight:800;
              font-size:0.75rem;
              flex-shrink:0;
            ">${msg.from === 'admin' ? '👩‍💼' : '👤'}</div>
            <div>
              <p style="margin:0 0 0.25rem 0; font-size:0.75rem; color:var(--text-muted); font-weight:600;">
                ${msg.from === 'admin' ? 'CliqueZoom' : 'Você'} • ${_formatDate(new Date(msg.at))}
              </p>
              <div style="
                background:${msg.from === 'admin' ? 'var(--green)' : 'var(--bg-surface)'};
                color:${msg.from === 'admin' ? '#fff' : 'var(--text-primary)'};
                padding:0.75rem 1rem;
                border-radius:8px;
                max-width:500px;
                word-break:break-word;
                font-size:0.875rem;
                line-height:1.5;
              ">${_esc(msg.text)}</div>
              ${msg.attachmentUrl ? `
                <p style="margin:0.5rem 0 0; font-size:0.75rem;">
                  <a href="${msg.attachmentUrl}" target="_blank" style="color:${msg.from === 'admin' ? '#fff' : 'var(--accent)'}; text-decoration:underline;">📎 Ver anexo</a>
                </p>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Formulário de Resposta -->
      <div style="border-top:1px solid var(--border); padding-top:1rem;">
        <form onsubmit="window._submitTicketReply(event)" style="display:flex; flex-direction:column; gap:0.75rem;">
          <label style="font-size:0.875rem; font-weight:600; color:var(--text-primary);">Sua Resposta</label>
          <textarea id="ticketReplyText" placeholder="Escreva sua resposta aqui…" style="
            padding:0.75rem;
            background:var(--bg-surface);
            border:1px solid var(--border);
            border-radius:6px;
            color:var(--text-primary);
            font-family:inherit;
            font-size:0.875rem;
            resize:vertical;
            min-height:100px;
            outline:none;
            transition:border-color 0.2s;
          " onfocu="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>

          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; cursor:pointer;">
            <input type="file" id="ticketReplyFile" accept=".jpg,.jpeg,.png,.pdf" style="display:none;">
            <button type="button" onclick="document.getElementById('ticketReplyFile').click()" style="
              padding:0.5rem 0.75rem;
              background:var(--bg-surface);
              border:1px solid var(--border);
              border-radius:6px;
              cursor:pointer;
              font-size:0.75rem;
              font-weight:600;
              transition:all 0.2s;
              font-family:inherit;
            " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='var(--bg-surface)'">
              📎 Anexar arquivo (opcional)
            </button>
            <span id="ticketFileLabel" style="font-size:0.75rem; color:var(--text-muted);"></span>
          </label>

          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button type="button" onclick="window._backToTicketList()" style="
              padding:0.75rem 1.5rem;
              background:transparent;
              border:1px solid var(--border);
              border-radius:6px;
              cursor:pointer;
              font-weight:600;
              font-size:0.875rem;
              transition:all 0.2s;
              font-family:inherit;
            " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
              Cancelar
            </button>
            <button type="submit" style="
              padding:0.75rem 1.5rem;
              background:var(--accent);
              color:#fff;
              border:none;
              border-radius:6px;
              cursor:pointer;
              font-weight:600;
              font-size:0.875rem;
              transition:all 0.2s;
              font-family:inherit;
            " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
              Enviar Resposta
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // Attach file label listener
  document.getElementById('ticketReplyFile')?.addEventListener('change', (e) => {
    const label = document.getElementById('ticketFileLabel');
    if (e.target.files.length > 0) {
      label.textContent = `✓ ${e.target.files[0].name}`;
    } else {
      label.textContent = '';
    }
  });
}

function getCategoryColor(cat) {
  const colors = {
    duvida: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    bug: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    financeiro: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' },
    sugestao: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' },
    outro: { bg: 'rgba(107, 114, 128, 0.15)', text: '#6b7280' }
  };
  return colors[cat] || colors.outro;
}

function getCategoryLabel(cat) {
  const labels = { duvida: 'Dúvida', bug: 'Bug', financeiro: 'Financeiro', sugestao: 'Sugestão', outro: 'Outro' };
  return labels[cat] || 'Outro';
}

function getStatusColor(status) {
  const colors = {
    open: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    pending: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308' },
    resolved: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' }
  };
  return colors[status] || colors.open;
}

function getStatusLabel(status) {
  const labels = { open: 'Aberto', pending: 'Aguardando', resolved: 'Resolvido' };
  return labels[status] || 'Aberto';
}

function _formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  } else {
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

function _esc(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window._openTicketForm = function() {
  _showTicketFormModal();
};

window._closeTicketForm = function() {
  document.getElementById('ticketFormOverlay')?.remove();
};

function _showTicketFormModal() {
  _closeTicketFormIfOpen();
  const div = document.createElement('div');
  div.id = 'ticketFormOverlay';
  div.style.cssText = `
    position:fixed; top:0; left:0; right:0; bottom:0;
    background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center;
    z-index:9999;
  `;
  div.innerHTML = `
    <div style="background:var(--bg-base); border-radius:12px; padding:2rem; max-width:500px; width:90%; max-height:80vh; overflow-y:auto; box-shadow:0 20px 25px rgba(0,0,0,0.15);">
      <h3 style="margin:0 0 1rem 0; color:var(--text-primary); font-size:1.25rem;">Novo Chamado</h3>
      <form onsubmit="window._submitNewTicket(event)" style="display:flex; flex-direction:column; gap:1rem;">
        <div>
          <label style="display:block; font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">Assunto</label>
          <input type="text" id="ticketFormSubject" placeholder="Ex: Dúvida sobre marca d'água" maxlength="120" required style="width:100%; padding:0.75rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-family:inherit; outline:none;">
        </div>
        <div>
          <label style="display:block; font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">Categoria</label>
          <select id="ticketFormCategory" style="width:100%; padding:0.75rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-family:inherit; cursor:pointer; outline:none;">
            <option value="duvida">Dúvida</option>
            <option value="bug">Bug / Problema</option>
            <option value="financeiro">Financeiro</option>
            <option value="sugestao">Sugestão</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div>
          <label style="display:block; font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">Mensagem</label>
          <textarea id="ticketFormText" placeholder="Descreva seu assunto com detalhes…" style="width:100%; padding:0.75rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; color:var(--text-primary); font-family:inherit; resize:vertical; min-height:120px; outline:none;" required></textarea>
        </div>
        <div>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.875rem; cursor:pointer;">
            <input type="file" id="ticketFormFile" accept=".jpg,.jpeg,.png,.pdf" style="display:none;">
            <button type="button" onclick="document.getElementById('ticketFormFile').click()" style="padding:0.5rem 0.75rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:600; font-family:inherit;">
              📎 Anexar arquivo (opcional)
            </button>
            <span id="ticketFormFileLabel" style="font-size:0.75rem; color:var(--text-muted);"></span>
          </label>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button type="button" onclick="window._closeTicketForm()" style="padding:0.75rem 1.5rem; background:transparent; border:1px solid var(--border); border-radius:6px; cursor:pointer; font-weight:600; font-size:0.875rem; font-family:inherit; color:var(--text-primary);">
            Cancelar
          </button>
          <button type="submit" id="ticketFormSubmitBtn" style="padding:0.75rem 1.5rem; background:var(--accent); color:var(--accent-on, #ffffff); border:none; border-radius:9999px; cursor:pointer; font-weight:600; font-size:0.875rem; font-family:inherit;">
            Criar Chamado
          </button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(div);
  div.addEventListener('click', (e) => {
    if (e.target === div) div.remove();
  });
  document.getElementById('ticketFormFile')?.addEventListener('change', (e) => {
    const label = document.getElementById('ticketFormFileLabel');
    if (e.target.files.length > 0) {
      label.textContent = `✓ ${e.target.files[0].name}`;
    } else {
      label.textContent = '';
    }
  });
  document.getElementById('ticketFormSubject')?.focus();
}

function _closeTicketFormIfOpen() {
  document.getElementById('ticketFormOverlay')?.remove();
}

window._submitNewTicket = async function(event) {
  event.preventDefault();
  const subject = document.getElementById('ticketFormSubject').value.trim();
  const category = document.getElementById('ticketFormCategory').value;
  const text = document.getElementById('ticketFormText').value.trim();
  const fileInput = document.getElementById('ticketFormFile');

  if (!subject) {
    window.showToast?.('Informe o assunto', 'error');
    return;
  }
  if (!text) {
    window.showToast?.('Escreva uma mensagem', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('subject', subject);
  formData.append('category', category);
  formData.append('text', text);
  if (fileInput.files.length > 0) {
    formData.append('attachment', fileInput.files[0]);
  }

  const submitBtn = document.getElementById('ticketFormSubmitBtn');
  if (submitBtn) { submitBtn.textContent = 'Enviando…'; submitBtn.disabled = true; }

  try {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${appState.authToken}` },
      body: formData
    });
    if (!res.ok) {
      window.showToast?.('Erro ao criar chamado', 'error');
      if (submitBtn) { submitBtn.textContent = 'Criar Chamado'; submitBtn.disabled = false; }
      return;
    }
    window._closeTicketForm();
    window.showToast?.('Chamado criado com sucesso!', 'success');
    // Reload tickets
    const ticketsRes = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    allTickets = (await ticketsRes.json()).tickets || [];
    renderTicketList(document.getElementById('fala-conosco-container'));
  } catch (error) {
    window.showToast?.('Erro ao criar chamado', 'error');
    if (submitBtn) { submitBtn.textContent = 'Criar Chamado'; submitBtn.disabled = false; }
  }
};

window._openTicketDetail = function(ticketId) {
  activeTicketId = ticketId;
  ticketListView = 'thread';
  renderFalaConosco(document.getElementById('fala-conosco-container'));
};

window._backToTicketList = function() {
  ticketListView = 'list';
  activeTicketId = null;
  renderFalaConosco(document.getElementById('fala-conosco-container'));
};

window._submitTicketReply = async function(event) {
  event.preventDefault();
  const text = document.getElementById('ticketReplyText').value.trim();
  const fileInput = document.getElementById('ticketReplyFile');

  if (!text) {
    window.showToast?.('Escreva uma mensagem', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('text', text);
  if (fileInput.files.length > 0) {
    formData.append('attachment', fileInput.files[0]);
  }

  try {
    const res = await fetch(`/api/tickets/${activeTicketId}/reply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${appState.authToken}` },
      body: formData
    });
    if (!res.ok) {
      window.showToast?.('Erro ao enviar resposta', 'error');
      return;
    }
    window.showToast?.('Resposta enviada!', 'success');
    // Reload ticket
    const ticketsRes = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${appState.authToken}` }
    });
    allTickets = (await ticketsRes.json()).tickets || [];
    renderTicketThread(document.getElementById('fala-conosco-container'));
  } catch (error) {
    window.showToast?.('Erro ao enviar resposta', 'error');
  }
};

window._ajudaLoaded = true;
window._openTutorialHelpReal = function(category, queryText = '') {
  currentCategory = category || 'all';
  searchQuery = queryText;
  
  if (allTutorials.length > 0) {
    let match = null;
    if (queryText) {
      match = allTutorials.find(t => 
        (t.title.toLowerCase().includes(queryText.toLowerCase()) || (t.description || '').toLowerCase().includes(queryText.toLowerCase())) &&
        (category && category !== 'all' ? t.category === category : true)
      );
    }
    if (!match && category && category !== 'all') {
      match = allTutorials.find(t => t.category === category);
    }
    if (match) {
      activeTutorial = match;
    }
  }

  // Se já estivermos na aba ajuda, forçar re-renderização
  const container = document.getElementById('tabContent');
  if (container && appState.currentTab === 'ajuda') {
    renderLayout(container);
  }
};

// ─── Serviços Adicionais (Upsell) ─────────────────────────────────────────────

// WhatsApp da equipe CliqueZoom (vendas/suporte) usado para contratar os serviços
// extras. É um número da PLATAFORMA (não do fotógrafo) — manter centralizado aqui.
// Formato: somente dígitos com DDI/DDD, ex: '5511988887777'.
const SUPPORT_WHATSAPP = '';

// Catálogo de serviços extras. Estrutura orientada a dados: adicionar um serviço
// é adicionar um item neste array (o grid e a tela de detalhe se montam sozinhos).
const SERVICOS_EXTRAS = [
  {
    id: 'implantacao-guiada',
    titulo: 'Implantação guiada',
    resumo: 'Apoio inicial com um profissional especializado.',
    preco: 'R$ 300,00',
    precoNota: 'pagamento único',
    destaque: true,
    // Ícone Lucide (clipboard-check) — pill verde
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>',
    descricao: 'Quer ajuda para começar? Agende um treinamento online exclusivo, por chamada de vídeo, com um especialista CliqueZoom. Em cerca de 2 horas, configuramos o seu negócio junto com você e deixamos tudo pronto para você começar a vender suas fotos.',
    beneficios: [
      {
        titulo: 'Acompanhamento especializado',
        texto: 'Você aprende a configurar a marca d\'água, criar a sua primeira sessão, montar o seu site e enviar a galeria para o cliente.'
      },
      {
        titulo: 'Configuração completa',
        texto: 'Deixamos o seu painel, o seu site público e a sua primeira galeria prontos junto com você, ao vivo, sem você travar no caminho.'
      },
      {
        titulo: 'Mais autonomia',
        texto: 'Ao final, você entende o fluxo da plataforma de ponta a ponta e ganha confiança para seguir sozinho(a) no dia a dia.'
      }
    ],
    waMessage: 'Olá! Gostaria de contratar a Implantação Guiada do CliqueZoom.'
  }
];

function getServico(id) {
  return SERVICOS_EXTRAS.find(s => s.id === id) || null;
}

// Monta o link wa.me do serviço. Sem número configurado, retorna '' e o CTA
// cai para o Fala Conosco (ver window._contratarServico).
function buildServicoWaLink(servico) {
  if (!SUPPORT_WHATSAPP) return '';
  const msg = encodeURIComponent(servico?.waMessage || 'Olá! Gostaria de saber mais sobre os serviços extras do CliqueZoom.');
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`;
}

function renderServicosHeaderHTML() {
  return `
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; border-bottom:1px solid var(--border); padding-bottom:1.5rem; margin-bottom:2rem;">
      <h2 style="font-size:1.75rem; font-weight:800; color:var(--text-primary); margin:0 0 0.375rem 0; font-family:inherit;">Serviços Extras</h2>
      <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">Dê um upgrade no seu negócio com a ajuda dos nossos especialistas.</p>
    </div>
  `;
}

// Grid de cards (visão de lista)
function renderServicosGridHTML() {
  const cards = SERVICOS_EXTRAS.map(s => `
    <button type="button" onclick="window._openServico('${s.id}')"
      style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:0; display:flex; flex-direction:column; align-items:center; position:relative; overflow:hidden; cursor:pointer; font-family:inherit; transition:border-color 0.2s, transform 0.2s;"
      onmouseover="this.style.borderColor='var(--green)'; this.style.transform='translateY(-2px)';"
      onmouseout="this.style.borderColor='var(--border)'; this.style.transform='none';">
      ${s.destaque ? '<span style="position:absolute; top:0; left:0; right:0; height:3px; background:var(--green);"></span>' : ''}
      <div style="padding:1.5rem; display:flex; flex-direction:column; align-items:center; flex:1; width:100%;">
        <div style="width:56px; height:56px; border-radius:50%; background:rgba(63,185,80,0.15); color:var(--green); display:flex; align-items:center; justify-content:center; margin-bottom:1rem;">
          ${s.icon}
        </div>
        <h3 style="font-size:1.125rem; font-weight:700; color:var(--text-primary); margin:0 0 0.5rem 0;">${s.titulo}</h3>
        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.5; margin:0 0 1.5rem 0; flex:1;">${s.resumo}</p>
        <div style="display:flex; justify-content:center; gap:1.5rem; align-items:center; border-top:1px solid var(--border); padding-top:1.25rem; width:100%;">
          <div style="text-align:center;">
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.125rem;">${s.precoNota || 'Por'}</span>
            <span style="font-size:1.125rem; font-weight:800; color:var(--green);">${s.preco}</span>
          </div>
          <span style="display:inline-flex; align-items:center; gap:0.375rem; color:var(--text-secondary); font-size:0.8125rem; font-weight:600;">
            Saiba mais
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </span>
        </div>
      </div>
    </button>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column;">
      ${renderServicosHeaderHTML()}
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1.5rem;">
        ${cards}
      </div>
    </div>
  `;
}

// Tela de detalhe (visão expandida — ilustração + descrição + 3 benefícios + CTA)
function renderServicoDetalheHTML(id) {
  const s = getServico(id);
  if (!s) {
    activeServico = null;
    return renderServicosGridHTML();
  }

  const beneficios = (s.beneficios || []).map(b => `
    <div style="display:flex; gap:1rem; align-items:flex-start;">
      <div style="flex-shrink:0; width:36px; height:36px; border-radius:50%; background:rgba(63,185,80,0.15); color:var(--green); display:flex; align-items:center; justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <h4 style="font-size:0.9375rem; font-weight:700; color:var(--text-primary); margin:0 0 0.25rem 0;">${b.titulo}</h4>
        <p style="font-size:0.875rem; color:var(--text-secondary); line-height:1.6; margin:0;">${b.texto}</p>
      </div>
    </div>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column;">
      <button type="button" onclick="window._backToServicos()" class="morph-tab"
        style="align-self:center; margin-bottom:1.5rem;">
        <div class="morph-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </div>
        <span class="morph-label">Voltar aos serviços</span>
      </button>

      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; max-width:760px; margin:0 auto;">
        <!-- Hero -->
        <div style="background:linear-gradient(to bottom, var(--bg-elevated), var(--bg-surface)); padding:2.5rem 2rem; display:flex; flex-direction:column; align-items:center; text-align:center; gap:1.5rem;">
          <div style="flex-shrink:0; width:64px; height:64px; border-radius:50%; border:1px solid var(--border); background:var(--bg-elevated); color:var(--text-primary); display:flex; align-items:center; justify-content:center;">
            ${s.icon}
          </div>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            <h2 style="font-size:1.5rem; font-weight:800; color:var(--text-primary); margin:0 0 0.25rem 0; font-family:inherit;">${s.titulo}</h2>
            <p style="font-size:0.875rem; color:var(--text-secondary); margin:0;">${s.resumo}</p>
          </div>
        </div>

        <div style="padding:2rem;">
          <p style="font-size:0.9375rem; color:var(--text-secondary); line-height:1.7; margin:0 0 2rem 0;">${s.descricao}</p>

          <div style="display:flex; flex-direction:column; gap:1.5rem; margin-bottom:2rem;">
            ${beneficios}
          </div>

          <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; border-top:1px solid var(--border); padding-top:1.5rem;">
            <div style="text-align:center;">
              <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.125rem;">${s.precoNota || 'Por'}</span>
              <span style="font-size:1.5rem; font-weight:800; color:var(--text-primary);">${s.preco}</span>
            </div>
            <button type="button" onclick="window._contratarServico('${s.id}')" class="morph-btn-main">
              <div class="morph-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>
              </div>
              <span class="morph-label">Contratar pelo WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

window._openServico = function(id) {
  activeServico = id;
  const container = document.getElementById('tabContent');
  if (container) renderLayout(container);
};

window._backToServicos = function() {
  activeServico = null;
  const container = document.getElementById('tabContent');
  if (container) renderLayout(container);
};

window._contratarServico = function(id) {
  const s = getServico(id);
  const link = buildServicoWaLink(s);
  if (link) {
    window.open(link, '_blank');
  } else {
    // Sem WhatsApp configurado: encaminha para o Fala Conosco
    window.showToast('Abra um chamado no Fala Conosco para contratar este serviço.', 'info');
    window._setAjudaView('fala-conosco');
  }
};
