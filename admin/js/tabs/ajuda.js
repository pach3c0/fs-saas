import { appState } from '../state.js';

// Mapeamento de categorias para exibição amigável
const CATEGORY_LABELS = {
  dashboard: 'Painel / Visão Geral',
  clientes: 'Clientes',
  sessoes: 'Sessões & Galerias',
  portfolio: 'Meu Site (Portfólio)',
  crm_financeiro: 'CRM & Financeiro'
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
    console.error('Erro ao buscar tutoriais:', error);
  }

  // Renderizar layout principal
  renderLayout(container);
}

function renderLayout(container) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.style.cssText = 'display:flex; flex-direction:column; gap:2rem; max-width:1100px; margin:0 auto; width:100%;';

  // 1. Cabeçalho Principal
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem; border-bottom:1px solid var(--border); padding-bottom:1.5rem;';
  header.innerHTML = `
    <div>
      <h2 style="font-size:1.75rem; font-weight:800; color:var(--text-primary); margin:0 0 0.375rem 0; font-family:inherit; background:linear-gradient(135deg, var(--accent) 0%, #a78bfa 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">CliqueZoom Academy</h2>
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

  updatePlayer();

  // 3. Barra de Categorias (Filtros)
  const filterBar = document.createElement('div');
  filterBar.style.cssText = 'display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.5rem; scrollbar-width:none;';
  filterBar.innerHTML = `
    <button class="cat-pill ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">Todos</button>
    ${Object.entries(CATEGORY_LABELS).map(([key, label]) => `
      <button class="cat-pill ${currentCategory === key ? 'active' : ''}" data-cat="${key}">${label}</button>
    `).join('')}
  `;
  root.appendChild(filterBar);

  // Injetar estilos CSS específicos para esta aba (Pills de Categoria)
  const styles = document.createElement('style');
  styles.innerHTML = `
    .cat-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .cat-pill:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--text-muted);
    }
    .cat-pill.active {
      background: var(--accent);
      color: var(--accent-on, #ffffff);
      border-color: var(--accent);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
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
    searchQuery = e.target.value.toLowerCase().trim();
    filterAndRenderGrid();
  });

  filterBar.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.cat;
      filterAndRenderGrid();
    });
  });

  // Render inicial do Grid
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
        <iframe src="https://www.youtube.com/embed/${activeTutorial.youtubeId}?rel=0&modestbranding=1&autoplay=1"
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
      const titleMatch = t.title.toLowerCase().includes(searchQuery);
      const descMatch = (t.description || '').toLowerCase().includes(searchQuery);
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
        <div style="position:relative; aspect-ratio:16/9; background:#000000; width:100%; overflow:hidden;">
          <img src="https://img.youtube.com/vi/${t.youtubeId}/0.jpg" alt="${t.title}"
            style="width:100%; height:100%; object-fit:cover; opacity:0.75; transition:transform 0.3s;"
            onload="this.style.opacity=0.85;"
            onerror="this.style.display='none';">
          
          <!-- Play Overlay -->
          <div class="play-overlay" style="position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); width:48px; height:48px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; color:#ffffff; opacity:0.85; transition:all 0.2s ease; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-left:2px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>

          <!-- Badge Duração -->
          <div style="position:absolute; right:0.5rem; bottom:0.5rem; background:rgba(0,0,0,0.8); color:#ffffff; font-size:0.6875rem; font-weight:700; padding:0.15rem 0.4rem; border-radius:4px; font-family:monospace;">
            ${t.duration || '0 min'}
          </div>
        </div>

        <!-- Info -->
        <div style="padding:1rem; display:flex; flex-direction:column; gap:0.5rem; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; color:var(--text-muted);">
              ${CATEGORY_LABELS[t.category] || t.category}
            </span>
            <span style="font-size:0.625rem; font-weight:700; text-transform:uppercase; background:${levelInfo.bg}; color:${levelInfo.text}; padding:0.1rem 0.375rem; border-radius:4px;">
              ${t.level || 'Básico'}
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
