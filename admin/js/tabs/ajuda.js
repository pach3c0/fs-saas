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
let ajudaView = 'tutorials'; // 'tutorials' | 'manual'
let openSections = { dashboard: true };

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

  // Renderizar layout principal
  renderLayout(container);
}

function renderLayout(container) {
  container.innerHTML = '';

  const root = document.createElement('div');
  root.style.cssText = 'display:flex; flex-direction:column; gap:2rem; max-width:1100px; margin:0 auto; width:100%;';

  // Sub-navegação: Tutoriais em Vídeo | Manual do Usuário
  const btnBase = 'display:flex; align-items:center; gap:0.5rem; padding:0.5rem 1.125rem; border-radius:9999px; font-size:0.875rem; font-weight:600; cursor:pointer; border:1px solid; transition:all 0.2s; font-family:inherit;';
  const btnActive = btnBase + 'background:var(--accent); color:#fff; border-color:var(--accent);';
  const btnIdle   = btnBase + 'background:var(--bg-elevated); color:var(--text-secondary); border-color:var(--border);';
  const subNav = document.createElement('div');
  subNav.style.cssText = 'display:flex; gap:0.5rem;';
  subNav.innerHTML = `
    <button onclick="window._setAjudaView('tutorials')" style="${ajudaView === 'tutorials' ? btnActive : btnIdle}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      Tutoriais em Vídeo
    </button>
    <button onclick="window._setAjudaView('manual')" style="${ajudaView === 'manual' ? btnActive : btnIdle}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
      Manual do Usuário
    </button>
  `;
  root.appendChild(subNav);

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
    searchQuery = e.target.value;
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

// ─── Manual do Usuário ────────────────────────────────────────────────────────

const MANUAL_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    content: `
      <div style="display:flex; flex-direction:column; gap:1.75rem; padding-top:1.25rem;">

        <p style="color:var(--text-secondary); font-size:0.875rem; line-height:1.7; margin:0;">
          O Dashboard é a tela inicial do painel. Exibe um resumo do seu negócio — KPIs atualizados, as sessões mais recentes e atalhos para as ações mais comuns.
        </p>

        <!-- KPI Cards -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Indicadores (KPIs)</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 0.875rem;">Quatro cartões no topo da tela mostram os números-chave do seu negócio em tempo real:</p>
          <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:0.4rem; margin-bottom:0.875rem; pointer-events:none; border:1px solid var(--border); border-radius:10px; padding:0.625rem; background:var(--bg-elevated);">
            ${[
              { color:'var(--accent)',  icon:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',        label:'Total de Sessões', value:'12'     },
              { color:'var(--orange)', icon:'<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',label:'Fotos Upadas',      value:'486'    },
              { color:'var(--orange)', icon:'<line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',label:'Espaço Usado','value':'230 MB' },
              { color:'var(--green)',  icon:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',                                          label:'Entregues',          value:'8'      },
            ].map(k => `
              <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:8px; padding:0.625rem 0.75rem; display:flex; align-items:center; gap:0.5rem;">
                <div style="width:28px; height:28px; border-radius:6px; background:var(--bg-elevated); color:${k.color}; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1px solid var(--border);">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${k.icon}</svg>
                </div>
                <div>
                  <div style="font-size:0.6rem; color:var(--text-secondary); line-height:1.2;">${k.label}</div>
                  <div style="font-size:1rem; font-weight:700; color:var(--text-primary); line-height:1.2;">${k.value}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${[
              { color:'var(--accent)',  label:'Total de Sessões', desc:'Número total de sessões criadas na sua conta.' },
              { color:'var(--orange)', label:'Fotos Upadas',      desc:'Soma de todas as fotos enviadas em todas as sessões.' },
              { color:'var(--orange)', label:'Espaço Usado',      desc:'Armazenamento em MB consumido pelos seus uploads.' },
              { color:'var(--green)',  label:'Entregues',         desc:'Sessões finalizadas com status "Entregue".' },
            ].map(k => `
              <div style="display:flex; align-items:flex-start; gap:0.625rem; padding:0.5rem 0.75rem; background:var(--bg-elevated); border-radius:7px;">
                <span style="width:7px; height:7px; border-radius:50%; background:${k.color}; flex-shrink:0; margin-top:0.3rem;"></span>
                <span style="font-size:0.8125rem; color:var(--text-primary);"><strong>${k.label}</strong> — <span style="color:var(--text-secondary);">${k.desc}</span></span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sessões Recentes -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Sessões Recentes</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 0.875rem;">Lista as últimas 5 sessões. <strong style="color:var(--text-primary);">Clique em qualquer item</strong> para abrir a sessão e gerenciar fotos, status e entrega.</p>
          <div style="border:1px solid var(--border); border-radius:10px; overflow:hidden; pointer-events:none; background:var(--bg-surface); margin-bottom:0.5rem;">
            ${[
              { name:'Casamento Silva & Ana', date:'12 Mai 2025', status:'Entregue',   statusColor:'var(--green)',  statusBg:'rgba(63,185,80,0.12)'  },
              { name:'Ensaio Newborn — Lara', date:'08 Mai 2025', status:'Revisar',    statusColor:'var(--accent)', statusBg:'rgba(47,129,247,0.12)' },
              { name:'Book Profissional — João', date:'02 Mai 2025', status:'Pendente', statusColor:'var(--yellow)', statusBg:'rgba(210,153,34,0.12)' },
            ].map((s, i) => `
              <div style="padding:0.625rem 0.875rem; ${i < 2 ? 'border-bottom:1px solid var(--border);' : ''} display:flex; align-items:center; gap:0.75rem;">
                <div style="width:32px; height:32px; border-radius:7px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:0.8125rem; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</div>
                  <div style="font-size:0.6875rem; color:var(--text-secondary);">${s.date}</div>
                </div>
                <div style="padding:0.2rem 0.5rem; border-radius:20px; font-size:0.6875rem; font-weight:600; background:${s.statusBg}; color:${s.statusColor}; flex-shrink:0;">${s.status}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Ações Rápidas -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Ações Rápidas</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 0.875rem;">Dois atalhos para as tarefas mais frequentes:</p>
          <div style="display:flex; flex-direction:column; gap:0.4rem; margin-bottom:0.75rem; pointer-events:none;">
            ${[
              { label:'Nova Sessão',  icon:'<path d="M12 5v14M5 12h14"/>',                                                                                desc:'Abre o formulário de criação de sessão.' },
              { label:'Ver meu Site', icon:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',                    desc:'Abre o site público do seu negócio em nova aba.' },
            ].map(a => `
              <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem; background:var(--bg-surface); border:1px solid var(--border); border-radius:9px;">
                <div style="width:28px; height:28px; border-radius:7px; background:rgba(47,129,247,0.1); color:var(--accent); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a.icon}</svg>
                </div>
                <div>
                  <div style="font-size:0.8125rem; font-weight:600; color:var(--text-primary);">${a.label}</div>
                  <div style="font-size:0.75rem; color:var(--text-secondary);">${a.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Checklist de Início -->
        <div>
          <p style="font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-muted); margin:0 0 0.625rem;">Checklist de Início</p>
          <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0 0 0.875rem;">Aparece para novos usuários com 4 passos guiados. Some após completar tudo ou ao clicar <strong style="color:var(--text-primary);">"Ocultar guia"</strong>.</p>
          <div style="background:var(--bg-surface); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:10px; padding:0.875rem 1rem; pointer-events:none; margin-bottom:0.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.625rem;">
              <span style="font-size:0.8125rem; font-weight:700; color:var(--text-primary);">Comece por aqui</span>
              <span style="font-size:0.6875rem; color:var(--text-muted); text-decoration:underline;">Ocultar guia</span>
            </div>
            <div style="margin-bottom:0.75rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.6875rem; color:var(--text-secondary); margin-bottom:0.3rem; font-weight:600;">
                <span>Progresso do Setup</span><span>50%</span>
              </div>
              <div style="height:5px; background:var(--bg-elevated); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:50%; background:var(--accent);"></div>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              ${[
                { label: 'Criar sua primeira sessão', done: true  },
                { label: 'Subir as primeiras fotos',  done: true  },
                { label: 'Vincular um cliente',       done: false },
                { label: 'Enviar link de acesso',     done: false },
              ].map(step => `
                <div style="display:flex; align-items:center; gap:0.5rem; padding:0.35rem 0.5rem; background:var(--bg-elevated); border-radius:6px; opacity:${step.done ? '0.55' : '1'};">
                  <div style="width:16px; height:16px; border-radius:50%; border:2px solid ${step.done ? 'var(--green)' : 'var(--border)'}; background:${step.done ? 'var(--green)' : 'transparent'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    ${step.done ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                  </div>
                  <span style="font-size:0.75rem; font-weight:600; color:var(--text-primary); text-decoration:${step.done ? 'line-through' : 'none'};">${step.label}</span>
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
          <strong style="color:var(--text-primary);">Como funciona o wizard:</strong> cada sessão aparece como um card na lista. <strong style="color:var(--text-primary);">Clique em qualquer parte do card</strong> para abrir o wizard — um painel fullscreen com uma barra lateral de passos à esquerda e o conteúdo do passo ativo à direita. Você avança passo a passo: o sistema bloqueia os próximos até você concluir o atual. No topo do wizard: 🔔 notificações da sessão · 📋 histórico completo · ⚙️ editar configurações · 🗑️ excluir · ✕ fechar.
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
                  ${['🔔','📋','⚙️','🗑️','✕'].map(ic => `<div style="width:32px; height:32px; border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${ic}</div>`).join('')}
                </div>
              </div>
              <!-- Body: sidebar + conteúdo -->
              <div style="display:flex; min-height:280px;">
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
                <div style="flex:1; padding:1.5rem 2rem; overflow-y:auto;">
                  <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin:0 0 0.5rem;">Upload das Fotos</h3>
                  <p style="font-size:0.875rem; color:var(--text-secondary); margin:0 0 1rem;">Envie as fotos brutas do ensaio. O sistema processa e armazena na resolução configurada (1200px).</p>
                  <div style="border:2px dashed var(--border); border-radius:0.5rem; padding:2rem; text-align:center; background:var(--bg-surface); margin-bottom:1rem;">
                    <div style="font-size:1.5rem; margin-bottom:0.5rem;">☁️</div>
                    <div style="font-size:0.875rem; color:var(--text-muted);">Arraste fotos aqui ou clique para selecionar</div>
                    <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">JPG · PNG · até 10 MB cada</div>
                  </div>
                  <div style="background:color-mix(in srgb, var(--text-muted) 8%, transparent); border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem 1rem; font-size:0.8125rem; color:var(--text-muted);">
                    Botão "Concluí o upload" disponível quando atingir <strong>30 fotos</strong> (tamanho do pacote). Atualmente: <strong>0 / 30</strong>.
                  </div>
                </div>
              </div>
            </div>
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
                  ${['🔔','📋','⚙️','🗑️','✕'].map(ic => `<div style="width:32px; height:32px; border:1px solid var(--border); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; font-size:0.9rem;">${ic}</div>`).join('')}
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
                { n:1,  who:'fotógrafo', color:'var(--accent)',  title:'Criar a sessão',                   desc:'Clique em + Nova Sessão. Escolha o modo Seleção. Defina o nome, vincule o cliente, configure o pacote (ex: 30 fotos), o preço de extras (R$/foto adicional), o prazo de seleção e a resolução das fotos. O wizard abre automaticamente após a criação.' },
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
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:white; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
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
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:white; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
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
                { n:1,  who:'fotógrafo',    color:'var(--accent)',  title:'Criar a sessão',                desc:'Escolha o modo Multi-Seleção. Defina o nome do evento e um prazo compartilhado (todos os participantes têm o mesmo deadline). A resolução também é configurada aqui.' },
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
                    <div style="width:26px; height:26px; border-radius:50%; background:${s.color}; color:white; display:flex; align-items:center; justify-content:center; font-size:0.6875rem; font-weight:800; flex-shrink:0;">${s.n}</div>
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
  { id: 'clientes',  label: 'Clientes',  icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', content: `
    <div style="display:flex; flex-direction:column; gap:1.25rem; padding-top:1rem;">

      <p style="font-size:0.8125rem; color:var(--text-secondary); line-height:1.6; margin:0;">
        A tab Clientes é o CRM da sua base — registra o histórico de cada cliente, o valor gerado e permite agendar e-mails de reativação automáticos para manter o relacionamento ativo.
      </p>

      <!-- Cadastro de clientes -->
      <div style="margin-bottom:0.5rem;">
        <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">CADASTRO</p>
        <div style="display:flex; flex-direction:column; gap:0.3rem;">
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Nome, e-mail, telefone e CPF</strong> são obrigatórios. Os demais campos (tags, data de nascimento, tipo de evento) são opcionais e servem para segmentação futura.</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);">Ao vincular um cliente a uma sessão (campo Cliente no modal de criação), o histórico de sessões aparece automaticamente no perfil do cliente — sem nenhuma ação extra.</span>
          </div>
        </div>
      </div>

      <!-- Próximo Contato / Reativação -->
      <div style="margin-bottom:0.5rem;">
        <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">REATIVAÇÃO AUTOMÁTICA</p>
        <div style="border:1px solid var(--border); border-radius:10px; padding:0.875rem; background:var(--bg-elevated); pointer-events:none; display:flex; flex-direction:column; gap:0.625rem; margin-bottom:0.5rem;">
          <div>
            <div style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin-bottom:0.375rem;">Próximo Contato</div>
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:6px; padding:0.45rem 0.75rem; font-size:0.8125rem; color:var(--text-primary);">19/09/2026</div>
            <div style="font-size:0.6875rem; color:var(--text-muted); margin-top:0.25rem;">O sistema envia um e-mail automático nesta data convidando para um novo trabalho.</div>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.3rem;">
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Como agendar</strong> — Abra o modal de edição do cliente (botão ✏️), role até a seção <em>Próximo Contato</em> e escolha a data. Salve. O sistema envia o e-mail automaticamente na data escolhida e limpa o campo após o envio.</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Badge 📅 na lista</strong> — Clientes com data agendada exibem um badge com a data. Clientes já contactados exibem "✓ Último: DD/MM" indicando o envio mais recente.</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);"><strong style="color:var(--text-primary);">Fotos no e-mail</strong> — O sistema inclui automaticamente a capa e até 2 fotos da última sessão entregue do cliente para tornar o e-mail mais pessoal e difícil de ignorar.</span>
          </div>
        </div>
      </div>

      <!-- Disparo manual -->
      <div style="margin-bottom:0.5rem;">
        <p style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--accent); margin:0 0 0.5rem;">DISPARO MANUAL</p>
        <div style="display:flex; flex-direction:column; gap:0.3rem;">
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);">O botão <strong style="color:var(--text-primary);">📧 Disparar Reativações</strong> (topo da listagem) processa imediatamente todos os clientes cuja data de próximo contato já chegou. Útil para testar ou adiantar um envio planejado.</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);">Ao clicar, o sistema pergunta se você quer incluir fotos do último evento nos e-mails. Escolha <em>Sim, incluir fotos</em> para um e-mail mais visual, ou <em>Não, só texto</em> para um envio mais simples.</span>
          </div>
          <div style="display:flex; align-items:flex-start; gap:0.5rem; padding:0.4rem 0.625rem; background:var(--bg-elevated); border-radius:7px;">
            <span style="width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:0.35rem;"></span>
            <span style="font-size:0.8rem; color:var(--text-secondary);">O disparo automático (sem clicar nada) acontece uma vez por dia. O manual é apenas um atalho — não envia duplicado se o automático já rodou.</span>
          </div>
        </div>
      </div>

    </div>
  ` },
  { id: 'mensagens', label: 'Mensagens', icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', content: null },
  { id: 'meu-site',  label: 'Meu Site',  icon: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>', content: null },
];

function renderManualHTML() {
  return `
    <div style="display:flex; flex-direction:column; gap:0; border-radius:12px; overflow:hidden; border:1px solid var(--border);">
      ${MANUAL_MODULES.map((mod, i) => {
        const isOpen = openSections[mod.id] || false;
        const notLast = i < MANUAL_MODULES.length - 1;
        return `
          <div style="${notLast ? 'border-bottom:1px solid var(--border);' : ''}">
            <button data-manual-toggle="${mod.id}" style="width:100%; display:flex; align-items:center; gap:0.875rem; padding:1rem 1.25rem; background:var(--bg-surface); border:none; cursor:pointer; text-align:left; font-family:inherit;">
              <div style="width:30px; height:30px; border-radius:7px; background:var(--bg-elevated); display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1px solid var(--border);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${mod.icon}</svg>
              </div>
              <span style="font-size:0.9375rem; font-weight:700; color:var(--text-primary); flex:1;">${mod.label}</span>
              ${!mod.content ? '<span style="font-size:0.6875rem; color:var(--text-muted); font-weight:600; margin-right:0.5rem;">Em breve</span>' : ''}
              <svg id="manual-arrow-${mod.id}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s; transform:${isOpen ? 'rotate(90deg)' : 'rotate(0deg)'}; color:var(--text-muted); flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <div id="manual-body-${mod.id}" style="display:${isOpen ? 'block' : 'none'}; padding:0 1.25rem 1.25rem; background:var(--bg-surface); border-top:1px solid var(--border);">
              ${mod.content || '<p style="color:var(--text-muted); font-size:0.875rem; padding-top:1rem; margin:0; font-style:italic;">Conteúdo em breve.</p>'}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

window._setAjudaView = function(view) {
  ajudaView = view;
  const container = document.getElementById('tabContent');
  if (container) renderLayout(container);
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
