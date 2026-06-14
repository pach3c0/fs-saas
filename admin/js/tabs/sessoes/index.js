import { state } from './state.js';
import { apiGet } from '../../utils/api.js';
import { loadSessions, setupListFilters } from './list.js';
import { setupModalForm } from './modal-form.js';
import { setupComments } from './comments.js';
import { setupParticipantes } from './modal-participantes.js';
import { setupUpload } from './upload.js';
import { setupActions } from './actions.js';
import { icon } from '../../utils/icons.js';
// Wizard de sessões (Onda 2): registra window.openSessionWizard como side-effect do import.
import './wizard/index.js';

export async function renderSessoes(container) {
  container.innerHTML = `
    <!-- Estilos de Abas com reveal/morph animation em formato de bolinha -->
    <style id="sessoes-filter-styles">
        .filter-bar-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: var(--bg-surface);
            padding: 0.75rem 1rem;
            border-radius: var(--r-card);
            border: 1px solid var(--border);
            position: relative;
            z-index: 10;
        }

        /* --- Busca Expansível (Morph Search) --- */
        .search-morph-wrapper {
            position: relative;
            display: inline-flex;
            align-items: center;
            height: 36px;
            border: 1px solid var(--border);
            border-radius: 9999px;
            background: var(--bg-elevated);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
            width: 36px; /* Começa como círculo */
            min-width: 36px;
        }
        .search-morph-wrapper:hover,
        .search-morph-wrapper:focus-within,
        .search-morph-wrapper.has-value {
            width: 260px; /* Expande */
            border-color: var(--accent);
            background: var(--bg-hover);
        }
        .search-morph-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 34px;
            height: 34px;
            flex-shrink: 0;
            color: var(--text-secondary);
            cursor: pointer;
        }
        .search-morph-wrapper:hover .search-morph-icon,
        .search-morph-wrapper:focus-within .search-morph-icon {
            color: var(--text-primary);
        }
        .search-morph-input {
            flex: 1;
            border: none !important;
            background: transparent !important;
            height: 100%;
            padding: 0 1rem 0 0 !important;
            margin: 0 !important;
            font-family: inherit;
            font-size: 0.875rem;
            color: var(--text-primary);
            outline: none;
            width: 0;
            opacity: 0;
            transition: opacity 0.25s ease;
        }
        .search-morph-wrapper:hover .search-morph-input,
        .search-morph-wrapper:focus-within .search-morph-input,
        .search-morph-wrapper.has-value .search-morph-input {
            width: 100%;
            opacity: 1;
        }

        /* --- Botões Utilitários Morph (Bolinhas) --- */
        .filter-morph-btn {
            box-sizing: border-box;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 0 !important;
            height: 36px !important;
            width: auto !important;
            min-width: 36px !important;
            flex-shrink: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 1px solid var(--border);
            border-radius: 9999px !important;
            cursor: pointer;
            overflow: hidden;
            white-space: nowrap;
            font-family: inherit;
            font-weight: 600;
            font-size: 0 !important;
            line-height: 0 !important;
            outline: none;
            position: relative;
            background: var(--bg-elevated);
            color: var(--text-secondary);
            transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .filter-morph-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--text-muted);
        }
        .filter-morph-btn.active {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--accent);
        }
        .filter-morph-btn .filter-morph-icon {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 34px !important;
            height: 34px !important;
            flex-shrink: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .filter-morph-btn .filter-morph-icon svg {
            display: block !important;
            margin: auto !important;
            padding: 0 !important;
        }
        .filter-morph-btn .filter-morph-label {
            font-size: 0.8125rem !important;
            line-height: 1 !important;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            white-space: nowrap;
            display: inline-block;
            vertical-align: middle;
            padding: 0 !important;
            margin: 0 !important;
            transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .filter-morph-btn:hover .filter-morph-label {
            max-width: 12rem;
            opacity: 1;
            padding-right: 1rem !important;
        }

        /* --- Select Transparente por Cima para Morph de Ordenação --- */
        .select-overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            z-index: 2;
            font-size: 14px;
        }

        /* --- Painel Deslizante de Filtros Avançados --- */
        .advanced-filters-panel {
            background: var(--bg-surface);
            border: 1px solid var(--border);
            border-radius: var(--r-card);
            padding: 0;
            margin-top: -0.5rem;
            max-height: 0;
            opacity: 0;
            overflow: hidden;
            transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding 0.3s ease, margin 0.3s ease;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.25rem;
            z-index: 5;
        }
        .advanced-filters-panel.open {
            max-height: 500px;
            opacity: 1;
            padding: 1.25rem;
            margin-top: 0;
            overflow: visible;
        }

        /* --- Filtros de Status (Chips Modernos) --- */
        .status-chips-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
        }
        .status-chip {
            display: inline-flex;
            align-items: center;
            padding: 0.4rem 0.75rem;
            border-radius: 9999px;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
        }
        .status-chip:hover {
            border-color: var(--text-muted);
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        .status-chip input[type="checkbox"] {
            display: none;
        }
        
        .status-chip.checked {
            background: var(--bg-hover);
            border-color: var(--text-primary);
            color: var(--text-primary);
            font-weight: 600;
        }

        /* --- Ajuste Geral dos Dropdowns no Painel --- */
        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .filter-group label {
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .filter-group .select-wrap {
            width: 100%;
        }
        .filter-group .input, .filter-group .select {
            height: 36px;
            border-radius: var(--radius-sm);
            background: var(--bg-elevated);
            border-color: var(--border);
            font-size: 0.8125rem;
        }

        .date-filter-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        .date-filter-row .input {
            flex: 1;
            min-width: 110px;
        }

        /* --- Ações do Card de Sessão (Morph) --- */
        .card-actions-container {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-top: 0.75rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border);
        }

        .card-action-btn {
            box-sizing: border-box;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 0 !important;
            height: 32px !important;
            width: auto !important;
            min-width: 32px !important;
            flex-shrink: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            border: 1px solid var(--border);
            border-radius: 9999px !important;
            cursor: pointer;
            overflow: hidden;
            white-space: nowrap;
            font-family: inherit;
            font-weight: 500;
            font-size: 0 !important;
            line-height: 0 !important;
            outline: none;
            position: relative;
            background: var(--bg-base);
            color: var(--text-secondary);
            transition: background 0.15s, border-color 0.15s, color 0.15s, width 0.3s;
        }
        .card-action-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--text-muted);
        }
        .card-action-btn .card-action-icon {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 30px !important;
            height: 30px !important;
            flex-shrink: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
        }
        .card-action-btn .card-action-icon svg {
            display: block !important;
            margin: auto !important;
            padding: 0 !important;
        }
        .card-action-btn .card-action-label {
            font-size: 0.75rem !important;
            line-height: 1 !important;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            white-space: nowrap;
            display: inline-block;
            vertical-align: middle;
            padding: 0 !important;
            margin: 0 !important;
            transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-action-btn:hover .card-action-label {
            max-width: 8rem;
            opacity: 1;
            padding-right: 0.75rem !important;
        }

        .card-action-btn.danger {
            color: var(--red);
            border-color: color-mix(in srgb, var(--red) 25%, transparent);
            background: color-mix(in srgb, var(--red) 5%, transparent);
        }
        .card-action-btn.danger:hover {
            background: var(--red);
            color: #fff;
            border-color: var(--red);
        }

        .card-action-btn.blocked {
            color: var(--red);
            border-color: color-mix(in srgb, var(--red) 30%, transparent);
            background: color-mix(in srgb, var(--red) 12%, transparent);
        }
        .card-action-btn.blocked:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: var(--text-muted);
        }
    </style>

    <div style="display:flex; flex-direction:column; gap:1rem; min-height:calc(100vh - 120px);">
      <!-- Barra de Filtros e Busca Simplificada (Morph) -->
      <div class="filter-bar-container">
        <!-- Busca Expansível (Morph) -->
        <div class="search-morph-wrapper" id="searchMorphWrapper">
          <span class="search-morph-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input type="text" id="filterSearch" class="search-morph-input" placeholder="Buscar cliente..." autocomplete="off">
        </div>

        <!-- Espaçador Flex -->
        <div style="flex: 1;"></div>

        <!-- Botão Filtros Avançados (Morph Toggle) -->
        <button id="toggleAdvancedFiltersBtn" class="filter-morph-btn" type="button">
          <span class="filter-morph-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg>
          </span>
          <span class="filter-morph-label">Filtros</span>
          <!-- Badge de Filtros Ativos (bolinha) -->
          <span id="activeFiltersBadge" style="display:none; position:absolute; top:-2px; right:-2px; background:var(--accent); width:8px; height:8px; border-radius:50%; box-shadow:0 0 0 2px var(--bg-surface);"></span>
        </button>

        <!-- Botão Ordenação (Morph com Select Transparente) -->
        <div class="filter-morph-btn" id="sortMorphBtn">
          <span class="filter-morph-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </span>
          <span class="filter-morph-label" id="sortMorphLabel">Ordenar por</span>
          <select id="filterSort" class="select-overlay">
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="az">Nome A-Z</option>
            <option value="za">Nome Z-A</option>
          </select>
        </div>

        <!-- Botão Nova Sessão (Morph) -->
        <button id="addSessionBtn" class="filter-morph-btn" type="button">
          <span class="filter-morph-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          </span>
          <span class="filter-morph-label">Nova Sessão</span>
        </button>
      </div>

      <!-- Painel Deslizante de Filtros Avançados -->
      <div class="advanced-filters-panel" id="advancedFiltersPanel">
        <!-- Coluna 1: Status -->
        <div class="filter-group">
          <label>Status</label>
          <div class="status-chips-group" id="statusFilters">
            <label class="status-chip">
              <input type="checkbox" value="pending" checked> Pendente
            </label>
            <label class="status-chip">
              <input type="checkbox" value="in_progress" checked> Em seleção
            </label>
            <label class="status-chip">
              <input type="checkbox" value="submitted" checked> Enviada
            </label>
            <label class="status-chip">
              <input type="checkbox" value="delivered" checked> Entregue
            </label>
            <label class="status-chip">
              <input type="checkbox" value="expired" checked> Expirado
            </label>
          </div>
        </div>

        <!-- Coluna 2: Categorias (Tipo & Modo) -->
        <div class="filter-group" style="display:flex; flex-direction:row; gap:0.75rem;">
          <div class="filter-group" style="flex:1;">
            <label>Tipo de Evento</label>
            <div class="select-wrap">
              <select id="filterEventType" class="select input">
                <option value="all">Todos os tipos</option>
                <option value="aniversario">Aniversário</option>
                <option value="casamento">Casamento</option>
                <option value="formatura">Formatura</option>
                <option value="corporativo">Corporativo</option>
                <option value="show">Show</option>
                <option value="ensaio">Ensaio</option>
                <option value="gestante">Gestante</option>
                <option value="newborn">Newborn</option>
                <option value="debutante">Debutante</option>
                <option value="batizado">Batizado</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>
          <div class="filter-group" style="flex:1;">
            <label>Modo de Sessão</label>
            <div class="select-wrap">
              <select id="filterMode" class="select input">
                <option value="all">Todos os modos</option>
                <option value="selection">Seleção</option>
                <option value="multi_selection">Multi-Seleção</option>
                <option value="gallery">Galeria</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Coluna 3: Período -->
        <div class="filter-group">
          <label>Período</label>
          <div class="date-filter-row">
            <div class="select-wrap" style="flex: 1; min-width: 110px;">
              <select id="filterDateField" class="select input">
                <option value="createdAt">Criado em</option>
                <option value="date">Data do Evento</option>
                <option value="selectionDeadline">Prazo de Seleção</option>
              </select>
            </div>
            <input type="date" id="filterDateFrom" class="input">
            <span style="color:var(--text-muted); font-size:0.875rem;">até</span>
            <input type="date" id="filterDateTo" class="input">
            <button id="clearDateFilter" class="btn btn-ghost btn-sm" style="height:36px; padding:0 0.75rem;">Limpar</button>
          </div>
        </div>
      </div>

      <div id="sessionsList" style="display:flex; flex-direction:column; gap:0.75rem;">
        <p style="color:var(--text-secondary); text-align:center;">Carregando...</p>
      </div>
    </div>

    <!-- Modal Nova Sessao -->
    <div id="newSessionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1000; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--glass-bg); backdrop-filter:saturate(180%) blur(var(--glass-blur)); -webkit-backdrop-filter:saturate(180%) blur(var(--glass-blur)); border:1px solid var(--border); border-radius:var(--r-card); padding:1.75rem; width:30rem; max-width:100%; display:flex; flex-direction:column; gap:1.25rem; margin:2rem auto; box-shadow: var(--cz-lift); text-align: center;">
        <h3 style="font-size:1.25rem; font-weight:bold; color:var(--text-primary); letter-spacing:-0.01em; text-align: center; width: 100%;">Nova Sessão</h3>

        <!-- PRIMEIRO: Modo da Sessão -->
        <div class="input-group" style="margin-bottom:0; text-align: center;">
          <label style="display: block; text-align: center; width: 100%;">Modo da Sessão <span style="color:var(--red);">*</span></label>
          <div class="select-wrap">
            <select id="sessionMode" class="select input" style="text-align: center; text-align-last: center;">
              <option value="">Escolher modo de sessão</option>
              <option value="selection">Seleção — cliente escolhe suas favoritas</option>
              <option value="gallery">Galeria — cliente visualiza e baixa</option>
              <option value="multi_selection">Multi-seleção — formaturas, shows, eventos</option>
                  <!-- v2: Multi-Imediata oculta até implementação de face search -->
                  <!-- <option value="multi_instant">Multi-Imediata — cliente escolhe e baixa na hora (Real-Time)</option> -->
            </select>
          </div>
        </div>

        <!-- Wrapper para campos que serão desabilitados até escolher o modo -->
        <div id="sessionFieldsWrapper" style="display:flex; flex-direction:column; gap:1rem; opacity:0.4; pointer-events:none; transition:opacity 0.2s;">

          <!-- Campo Cliente (oculto em multi_selection) -->
          <div id="clientRowWrapper" class="input-group" style="position:relative; margin-bottom:0; text-align: center;">
            <label style="display: block; text-align: center; width: 100%;">Cliente <span style="color:var(--red);">*</span></label>
            <input type="text" id="clientSearchInput" class="input" disabled autocomplete="off" placeholder="Busque ou cadastre o cliente..." style="text-align: center;">
            <input type="hidden" id="sessionClientId" value="">
            <div id="clientSearchDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-field); z-index:10; max-height:200px; overflow-y:auto; margin-top:2px;"></div>
            <p id="clientSearchHint" class="input-hint" style="margin-top:0.25rem; text-align: center;"></p>
          </div>

          <!-- Nome da Sessão -->
          <div class="input-group" style="margin-bottom:0; text-align: center;">
            <label style="display: block; text-align: center; width: 100%;">Nome da Sessão <span style="color:var(--red);">*</span></label>
            <input type="text" id="sessionName" class="input" disabled placeholder="Ex: Ensaio Família Silva ou Formatura Direito 2026" style="text-align: center;">
          </div>

          <!-- Datas -->
          <div style="border:1px solid var(--border); border-radius:var(--r-field); background:rgba(0,0,0,0.15); padding:0.75rem; display:flex; flex-direction:column; gap:0.75rem; text-align: center;">
            <h4 style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); margin:0; text-align: center;">📅 Datas</h4>
            <div class="input-group" style="margin-bottom:0; text-align: center;">
              <label style="display: block; text-align: center; width: 100%;">Criado em</label>
              <input type="date" id="sessionCreatedAtDate" class="input" disabled style="text-align: center;">
              <p class="input-hint" style="text-align: center;">Data de abertura da sessão (hoje por padrão).</p>
            </div>
            <div class="input-group" style="margin-bottom:0; text-align: center;">
              <label style="display: block; text-align: center; width: 100%;">Data do Evento</label>
              <input type="date" id="sessionDate" class="input" disabled style="text-align: center;">
              <p class="input-hint" style="text-align: center;">Quando o ensaio/evento aconteceu.</p>
            </div>
            <div class="input-group" style="margin-bottom:0; text-align: center;">
              <label id="deadlineLabel" style="display: block; text-align: center; width: 100%;">Prazo de Seleção <span style="color:var(--text-muted);">(opcional)</span></label>
              <input type="datetime-local" id="sessionDeadline" class="input" disabled style="text-align: center;">
              <p class="input-hint" style="text-align: center;">Limite para o cliente escolher as fotos. Deve ser após a data do evento.</p>
            </div>
            <p id="dateValidationMsg" style="display:none; font-size:0.75rem; color:var(--red); font-weight:500; text-align: center;"></p>
          </div>

          <!-- Foto de Capa -->
          <div class="input-group" style="margin-bottom:0; display:flex; flex-direction:column; align-items:center; text-align:center;">
            <label style="display: block; text-align: center; width: 100%;">Foto de Capa</label>
            <div style="display:flex; flex-direction:column; align-items:center; gap:0.75rem; margin-top:0.25rem;">
              <div id="coverPreview" style="width:80px; height:80px; background:var(--bg-base); border:1px dashed var(--border); border-radius:50%; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                <span style="color:var(--text-muted); font-size:0.625rem;">Sem capa</span>
              </div>
              <label class="btn btn-sm" style="margin:0; cursor:pointer;">
                Upload
                <input type="file" accept=".jpg,.jpeg,.png" id="coverInput" style="display:none;" disabled>
              </label>
              <div id="coverProgress" style="text-align: center;"></div>
            </div>
            <input type="hidden" id="sessionCoverPhoto" value="">
          </div>

          <!-- Config avançada movida para o painel direito do wizard (visível após criar).
               Mantida no DOM (oculta) só para alimentar os valores-padrão no payload de criação. -->
          <div id="advancedConfigHidden" style="display:none;">
          <!-- Configuração da Galeria -->
          <div style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Configuração da Galeria</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Resolução do preview (grid de visualização)</label>
              <div class="select-wrap">
                <select id="sessionResolution" class="select input" disabled>
                  <option value="960">960px — menor armazenamento (ideal para muitos eventos)</option>
                  <option value="1200" selected>1200px — padrão (equilíbrio)</option>
                  <option value="1400">1400px — alta qualidade</option>
                  <option value="1600">1600px — máxima qualidade (mais armazenamento)</option>
                </select>
              </div>
              <p class="input-hint">Afeta apenas a miniatura exibida no grid. A entrega usa a resolução original do arquivo subido. Não pode ser alterado após a criação.</p>
            </div>
            <div id="selectionFields" style="display:flex; gap:0.75rem;">
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Fotos do pacote</label>
                <input type="number" id="sessionLimit" class="input" value="30" min="1" disabled>
              </div>
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Preço foto extra (R$)</label>
                <input type="number" id="sessionExtraPrice" class="input" value="25" min="0" step="0.01" disabled>
              </div>
            </div>
            <div id="extraConfigFields" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionAllowExtraPurchase" checked class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Habilitar venda de fotos extras</span>
              </label>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionAllowReopen" checked class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Permitir pedido de reabertura</span>
              </label>
            </div>
            <div id="commentsConfigField" style="display:none; flex-direction:column; gap:0.25rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionCommentsEnabled" class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Habilitar mensagens por foto</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">O cliente poderá comentar em cada foto durante a seleção. Você responde diretamente no painel.</p>
            </div>
            <div id="multiOptionsField" style="display:none; flex-direction:column; gap:0.25rem; margin-top:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionShowQueuePosition" class="check" disabled>
                <span style="color:var(--text-primary); font-size:0.875rem;">Mostrar posição na fila de entrega</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">Cada participante vê quantos estão à sua frente. Gatilho de urgência: incentiva o cliente a finalizar logo para ser entregue antes.</p>
            </div>
            <p id="multiSelectionHint" style="display:none; font-size:0.75rem; color:var(--yellow); margin-top:0.5rem;">No modo Multi-Seleção, você adicionará os participantes após criar a sessão.</p>
          </div>

          <!-- CRM: classificacao + automacao de vendas -->
          <div id="crmFields" style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">CRM e Vendas</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Tipo de Evento</label>
              <div class="select-wrap">
                <select id="sessionEventType" class="select input" disabled>
                  <option value="outro">Outro</option>
                  <option value="aniversario">Aniversário</option>
                  <option value="casamento">Casamento</option>
                  <option value="formatura">Formatura</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="show">Show</option>
                  <option value="ensaio">Ensaio</option>
                  <option value="gestante">Gestante</option>
                  <option value="newborn">Newborn</option>
                  <option value="debutante">Debutante</option>
                  <option value="batizado">Batizado</option>
                </select>
              </div>
              <p class="input-hint">Categoria do evento para relatórios e filtros.</p>
            </div>
            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
              <input type="checkbox" id="sessionSalesAutomation" checked class="check" disabled>
              <span style="color:var(--text-primary); font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;"><i data-lucide="bot" style="width:16px; height:16px;"></i> Automação de vendas (escassez)</span>
            </label>
            <p class="input-hint" style="margin:0;">O robô envia e-mails de urgência ao cliente conforme o prazo se aproxima. Requer ativar a automação na configuração da organização.</p>
          </div>

          <!-- Retenção de storage -->
          <div style="border-top:1px solid var(--border); padding-top:1rem; display:flex; flex-direction:column; gap:0.75rem;">
            <h4 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin:0;">Armazenamento</h4>
            <div class="input-group" style="margin-bottom:0;">
              <label>Guardar fotos no storage até</label>
              <input type="date" id="sessionStorageRetentionUntil" class="input" disabled>
              <p class="input-hint">Deixe em branco para guardar sem prazo. Quando a data chegar, você receberá uma notificação para decidir o que fazer.</p>
            </div>
            <div id="storageAutoDeleteField" style="display:none; flex-direction:column; gap:0.5rem;">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionStorageAutoDelete" class="check">
                <span style="color:var(--text-primary); font-size:0.875rem;">Deletar automaticamente nesta data</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">As fotos (exceto a capa) serão excluídas do servidor automaticamente. Use somente se tiver certeza de que não precisará das originais.</p>
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" id="sessionStorageBackupOnExpire" class="check">
                <span style="color:var(--text-primary); font-size:0.875rem;">Gerar backup ZIP antes de deletar</span>
              </label>
              <p class="input-hint" style="margin:0 0 0 1.5rem;">Gera um arquivo .zip com todas as fotos no servidor antes da exclusão. Útil para ter uma cópia local de segurança.</p>
            </div>
          </div>
          </div>
          <!-- /advancedConfigHidden -->

        </div>

        <div style="display:flex; gap:0.5rem; justify-content:center;">
          <button id="cancelNewSession" class="btn">Cancelar</button>
          <button id="confirmNewSession" class="btn">Criar Sessão</button>
        </div>
      </div>
    </div>

    <!-- Modal Ver Fotos (Dual Grid) -->
    <div id="sessionPhotosModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:50; flex-direction:column;">
      <div style="background:var(--bg-surface); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <h3 id="photosModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Fotos da Sessao</h3>
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <div id="sessionUploadProgress" style="min-width:150px;"></div>
          <div id="uploadButtonGroup" style="display:flex; gap:0.5rem; align-items:center;">
            <label id="mainUploadBtn" style="padding:0.5rem 1rem; background:var(--accent); color:white; border-radius:var(--r-field); cursor:pointer; font-weight:600; font-size:0.875rem; border:none; display:flex; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
            <label id="secondaryUploadBtn" style="display:none; padding:0.5rem 1rem; background:var(--purple); color:white; border-radius:var(--r-field); cursor:pointer; font-weight:600; font-size:0.875rem; border:none; align-items:center; gap:0.5rem; transition: background 0.2s;"></label>
          </div>
          <input type="file" id="sessionUploadInput" accept="image/*" multiple style="display:none;">
          <input type="file" id="sessionEditedInput" accept="image/*" multiple style="display:none;">
          <button id="closePhotosModal" class="btn">Fechar</button>
        </div>
      </div>

      <div id="photoTabBar" style="padding:0 1.5rem; display:flex; gap:1.5rem; border-bottom:1px solid var(--border); background:var(--bg-surface); flex-shrink:0;">
          <button id="tabGeralBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid var(--accent); color:var(--text-primary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('geral')">
              🖼️ Galeria Geral
          </button>
          <button id="tabEntregaBtn" style="padding:1rem 0; background:none; border:none; border-bottom:2px solid transparent; color:var(--text-secondary); font-weight:600; cursor:pointer; font-size:0.875rem; display:flex; align-items:center; gap:0.5rem;" onclick="window.switchPhotoTab('entrega')">
              🚀 Entrega Final (<span id="deliveryCountBadge">0</span>)
          </button>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:1.5rem; overflow:hidden; background:var(--bg-base);">
          <div id="tabGeral" style="flex:1; display:flex; flex-direction:column; min-height:0;">
              <div id="bulkActionsBar" style="display:none; justify-content:space-between; align-items:center; margin-bottom:1rem; background:var(--bg-elevated); padding:0.5rem 1rem; border-radius:var(--r-card); border:1px solid var(--border);">
                  <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.875rem; color:var(--text-primary);">
                      <input type="checkbox" id="selectAllPhotos" class="check">
                      <span>Selecionar Tudo</span>
                  </label>
                  <div style="display:flex; gap:0.75rem; align-items:center;">
                      <span id="selectedPhotosCount" style="font-size:0.875rem; color:var(--text-secondary);">0 selecionadas</span>
                      <button id="bulkDeleteBtn" class="btn btn-danger btn-sm" style="background:var(--red); color:white; border:none; display:none;">Deletar selecionadas</button>
                  </div>
              </div>
              <div id="sessionPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: max-content; gap:1rem; align-content:start;"></div>
          </div>

          <div id="tabEntrega" style="flex:1; display:flex; flex-direction:column; min-height:0; display:none;">
              <div style="display:flex; justify-content:flex-end; align-items:center; margin-bottom:1rem;">
                  <button id="exportSelectionBtn" style="background:var(--purple); color:white; padding:0.5rem 1rem; border-radius:var(--r-field); border:none; cursor:pointer; font-size:0.875rem; font-weight:600; display:flex; align-items:center; gap:0.5rem;" title="Exportar lista de seleção para o Lightroom">
                    📋 Exportar Lightroom
                  </button>
              </div>
              <div id="selectedPhotosGrid" style="flex:1; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); grid-auto-rows: max-content; gap:1rem; align-content:start;"></div>
          </div>
      </div>
    </div>

    <!-- Modal de Validacao de Upload -->
    <div id="uploadValidationModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:100; align-items:center; justify-content:center; padding:1.5rem;">
      <div style="background:var(--glass-bg); backdrop-filter:saturate(180%) blur(var(--glass-blur)); -webkit-backdrop-filter:saturate(180%) blur(var(--glass-blur)); border:1px solid var(--border); border-radius:var(--r-card); width:100%; max-width:500px; overflow:hidden; box-shadow: var(--cz-lift);">
        <div style="padding:1.5rem; border-bottom:1px solid var(--border); background:rgba(255,166,87,0.08);">
          <h3 style="font-size:1.125rem; font-weight:bold; color:var(--orange); display:flex; align-items:center; gap:0.5rem;">
            ⚠️ Validação de Entrega
          </h3>
          <p style="font-size:0.875rem; color:var(--text-secondary); margin-top:0.25rem;">Analisamos seus arquivos antes de iniciar o upload.</p>
        </div>
        <div id="validationContent" style="padding:1.5rem; max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:1rem;"></div>
        <div style="padding:1.25rem; background:rgba(0,0,0,0.15); border-top:1px solid var(--border); display:flex; justify-content:flex-end; gap:0.75rem;">
          <button id="cancelValidationBtn" class="btn">Cancelar</button>
          <button id="confirmValidationBtn" class="btn btn-primary"></button>
        </div>
      </div>
    </div>

    <!-- Modal Participantes (Multi-Seleção) -->
    <div id="participantsModal" style="display:none; position:fixed; inset:0; background:rgba(13,17,23,0.85); backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur)); z-index:1200; flex-direction:column;">
      <div style="background:var(--glass-bg); backdrop-filter:saturate(180%) blur(var(--glass-blur)); -webkit-backdrop-filter:saturate(180%) blur(var(--glass-blur)); border-bottom:1px solid var(--border); padding:1rem 1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
            <h3 id="participantsModalTitle" style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Participantes</h3>
            <p style="font-size:0.75rem; color:var(--text-secondary);">Gerencie os alunos/clientes desta sessão</p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button id="exportParticipantsBtn" class="header-expand-btn" title="Exportar Seleções" style="cursor: pointer;">
            <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
              ${icon('download', 18)}
            </span>
            <span class="header-expand-label">Exportar Seleções</span>
          </button>
          <button id="closeParticipantsModal" class="header-expand-btn" title="Fechar" style="cursor: pointer;">
            <span class="header-expand-icon" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 34px !important; height: 34px !important;">
              ${icon('x', 18)}
            </span>
            <span class="header-expand-label">Fechar</span>
          </button>
        </div>
      </div>
      <div style="flex:1; overflow-y:auto; overflow-x:hidden; padding:1.5rem;">
        <div style="background:rgba(0,0,0,0.15); padding:1.25rem; border-radius:var(--r-card); border:1px solid var(--border); margin-bottom:1.5rem;">
            <h4 style="color:var(--text-primary); font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">Adicionar Participante</h4>
            <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:end;">
                <div style="flex:2; min-width:200px; position:relative;">
                    <input type="text" id="newPartName" class="input" placeholder="Buscar cliente ou digitar nome" style="border-radius:var(--r-field); height:36px;">
                    <div id="partClientDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-field); z-index:200; max-height:200px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
                    <input type="hidden" id="newPartClientId">
                </div>
                <div style="flex:1; min-width:150px;">
                    <input type="email" id="newPartEmail" class="input" placeholder="Email (opcional)" style="border-radius:var(--r-field); height:36px;">
                </div>
                <div style="flex:1; min-width:100px;">
                    <input type="number" id="newPartLimit" class="input" placeholder="Limite" value="30" style="border-radius:var(--r-field); height:36px;">
                </div>
                <button id="addParticipantBtn" class="btn btn-primary" style="border-radius:var(--r-field); height:36px; padding: 0 1.5rem;">Adicionar</button>
            </div>
        </div>
        <div id="participantsList" style="display:flex; flex-direction:column; gap:0.5rem;"></div>
      </div>
    </div>

    <!-- Modal Comentarios -->
    <div id="commentsModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); z-index:1200; align-items:flex-start; justify-content:center; overflow-y:auto; padding:2rem 1rem;">
      <div style="background:var(--glass-bg); backdrop-filter:saturate(180%) blur(var(--glass-blur)); -webkit-backdrop-filter:saturate(180%) blur(var(--glass-blur)); border:1px solid var(--border); border-radius:var(--r-card); padding:1.75rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1.25rem; margin:2rem auto; box-shadow: var(--cz-lift);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1.25rem; font-weight:bold; color:var(--text-primary); letter-spacing:-0.01em;">Comentários da Foto</h3>
            <button id="closeCommentsModal" style="color:var(--text-secondary); background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <!-- Preview da foto que está sendo comentada -->
        <div id="commentsPhotoPreview" style="display:flex; gap:0.75rem; align-items:center; padding:0.625rem; background:rgba(0,0,0,0.15); border:1px solid var(--border); border-radius:var(--r-field);">
          <img id="commentsPhotoThumb" alt="Foto" style="width:84px; height:84px; object-fit:cover; border-radius:var(--r-field); flex-shrink:0; background:var(--bg-elevated);">
          <div style="flex:1; min-width:0;">
            <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.125rem;">Conversa sobre a foto</div>
            <div id="commentsPhotoFilename" style="font-size:0.8125rem; color:var(--text-primary); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
            <div id="commentsPhotoMeta" style="font-size:0.6875rem; color:var(--text-muted); margin-top:0.125rem;"></div>
          </div>
        </div>
        <div id="commentsList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:0.75rem; min-height:200px; max-height:400px; background:rgba(0,0,0,0.15); padding:1rem; border-radius:var(--r-field); border:1px solid var(--border);"></div>
        <div style="display:flex; gap:0.5rem;">
            <input type="text" id="adminCommentInput" class="input" placeholder="Escreva uma resposta..." style="flex:1;">
            <button id="sendAdminCommentBtn" class="btn btn-primary">Enviar</button>
        </div>
      </div>
    </div>

    <!-- Modal Estender Retenção de Storage -->
    <div id="storageRetentionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1200; align-items:center; justify-content:center;">
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--r-card); padding:1.5rem; width:28rem; max-width:100%; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:1.125rem; font-weight:bold; color:var(--text-primary);">Estender Armazenamento</h3>
          <button id="closeStorageRetentionModal" style="color:var(--text-secondary); background:none; border:none; cursor:pointer; font-size:1.25rem;">&times;</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <p style="color:var(--text-secondary); font-size:0.875rem; margin:0;">
            As fotos desta sessão expiram em <span id="storageExpiryDaysText" style="font-weight:600; color:var(--orange);">— dias</span>.
          </p>
          <div class="input-group" style="margin-bottom:0;">
            <label>Nova data de expiração</label>
            <input type="date" id="storageRetentionNewDate" class="input">
            <p class="input-hint">Deixe em branco para remover a data de expiração.</p>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
          <button id="cancelStorageRetentionModal" class="btn">Cancelar</button>
          <button id="confirmStorageRetentionExtend" class="btn btn-success">Estender</button>
        </div>
      </div>
    </div>
  `;

  await loadSessions(container, state);
  setupListFilters(container, state);
  setupModalForm(container, state, renderSessoes);
  setupComments(container, state);
  setupParticipantes(container, state, renderSessoes);
  setupUpload(container, state, renderSessoes);
  setupActions(container, state, renderSessoes);

  // --- Lógica Interativa dos Novos Filtros Morph ---
  // 1. Busca Expansível: adiciona/remove classe .has-value
  const filterSearch = container.querySelector('#filterSearch');
  const searchWrapper = container.querySelector('#searchMorphWrapper');
  if (filterSearch && searchWrapper) {
    const checkSearchVal = () => {
      if (filterSearch.value.trim().length > 0) {
        searchWrapper.classList.add('has-value');
      } else {
        searchWrapper.classList.remove('has-value');
      }
    };
    filterSearch.addEventListener('input', checkSearchVal);
    checkSearchVal(); // inicializa
  }

  // 2. toggle do painel deslizante de filtros avançados
  const toggleBtn = container.querySelector('#toggleAdvancedFiltersBtn');
  const advancedPanel = container.querySelector('#advancedFiltersPanel');
  if (toggleBtn && advancedPanel) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = advancedPanel.classList.toggle('open');
      toggleBtn.classList.toggle('active', isOpen);
    });
  }

  // 3. Atualizar texto do label de ordenação conforme select
  const filterSort = container.querySelector('#filterSort');
  const sortLabel = container.querySelector('#sortMorphLabel');
  const updateSortLabel = () => {
    if (filterSort && sortLabel) {
      const selectedOpt = filterSort.options[filterSort.selectedIndex];
      sortLabel.textContent = `Ordenar por: ${selectedOpt.text}`;
    }
  };
  if (filterSort) {
    filterSort.addEventListener('change', updateSortLabel);
    updateSortLabel();
  }

  // 4. Sincronizar estilo dos status-chips (classe .checked)
  const statusChips = container.querySelectorAll('.status-chip');
  statusChips.forEach(chip => {
    const cb = chip.querySelector('input[type="checkbox"]');
    if (cb) {
      const updateChipState = () => {
        chip.classList.toggle('checked', cb.checked);
      };
      cb.addEventListener('change', updateChipState);
      updateChipState();
    }
  });

  // 5. Badge de Filtros Ativos (bolinha indicadora de estado modificado)
  const activeBadge = container.querySelector('#activeFiltersBadge');
  const filterEventType = container.querySelector('#filterEventType');
  const filterMode = container.querySelector('#filterMode');
  const filterDateFrom = container.querySelector('#filterDateFrom');
  const filterDateTo = container.querySelector('#filterDateTo');
  const statusCbs = container.querySelectorAll('#statusFilters input[type="checkbox"]');
  
  const updateActiveFiltersBadge = () => {
    if (!activeBadge) return;
    let hasActiveFilters = false;
    
    // Se algum status estiver desmarcado (default é tudo marcado)
    const anyStatusUnchecked = Array.from(statusCbs).some(cb => !cb.checked);
    if (anyStatusUnchecked) hasActiveFilters = true;
    
    // Se tipo ou modo de sessão não for "all"
    if (filterEventType && filterEventType.value !== 'all') hasActiveFilters = true;
    if (filterMode && filterMode.value !== 'all') hasActiveFilters = true;
    
    // Se datas estiverem preenchidas
    if (filterDateFrom && filterDateFrom.value) hasActiveFilters = true;
    if (filterDateTo && filterDateTo.value) hasActiveFilters = true;
    
    activeBadge.style.display = hasActiveFilters ? 'block' : 'none';
  };

  if (filterEventType) filterEventType.addEventListener('change', updateActiveFiltersBadge);
  if (filterMode) filterMode.addEventListener('change', updateActiveFiltersBadge);
  if (filterDateFrom) filterDateFrom.addEventListener('change', updateActiveFiltersBadge);
  if (filterDateTo) filterDateTo.addEventListener('change', updateActiveFiltersBadge);
  statusCbs.forEach(cb => cb.addEventListener('change', updateActiveFiltersBadge));
  container.querySelector('#clearDateFilter')?.addEventListener('click', () => {
    setTimeout(updateActiveFiltersBadge, 50);
  });
  updateActiveFiltersBadge();

  // Personaliza o botão "Nova Sessão" com a mesma imagem de fundo do card
  // "Ação rápida · Nova Sessão" do dashboard (chave quickActionNew, definida
  // pelo superadmin via SaaS Admin). Sem imagem => estilo sólido padrão.
  applyNewSessionBtnBg(container);
}

// Espelha o applySurfaceBg do dashboard: aplica a imagem de fundo configurada
// para o card quickActionNew num layer atrás do conteúdo do botão.
async function applyNewSessionBtnBg(container) {
  const btn = container.querySelector('#addSessionBtn');
  if (!btn) return;
  try {
    const data = await apiGet('/api/dashboard-cards').catch(() => null);
    const cfg = data?.cards?.quickActionNew;
    if (!cfg || !cfg.imageUrl) return;
    btn.style.position = 'relative';
    btn.style.isolation = 'isolate';
    btn.style.overflow = 'hidden';
    let layer = btn.querySelector(':scope > .cz-surface-bg');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'cz-surface-bg';
      btn.insertBefore(layer, btn.firstChild);
    }
    const opacity = (typeof cfg.opacity === 'number') ? cfg.opacity : 0.2;
    layer.style.cssText = `position:absolute; inset:0; z-index:-1; background-image:url('${cfg.imageUrl}'); background-size:cover; background-position:center; opacity:${opacity}; pointer-events:none;`;
  } catch (_) { /* silencioso — botão cai no estilo sólido */ }
}
