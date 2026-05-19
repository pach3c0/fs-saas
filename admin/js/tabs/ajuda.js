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
  { id: 'sessoes',   label: 'Sessões',   icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>', content: null },
  { id: 'clientes',  label: 'Clientes',  icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', content: null },
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
