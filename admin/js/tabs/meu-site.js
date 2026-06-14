/**
 * Tab: Meu Site (Configuração do Site Profissional)
 */

import { appState } from '../state.js';
import { apiGet, apiPut, apiPost, apiDelete } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';
import { renderPortfolio } from './portfolio.js';
import { renderSobre, destroySobreCanvas, getSobreCanvasState } from './sobre.js';
import { renderAlbuns } from './albuns.js';
import { renderEstudio, getStudioState } from './estudio.js';
import { renderFaq } from './faq.js';
import { renderCliente } from './cliente.js';


export async function renderMeuSite(container) {
  // Registrar cleanup de canvas ao sair do builder (feito aqui para garantir
  // que o módulo portfolio.js já foi carregado quando o cleanup for chamado)
  window._cleanupBuilderCanvases = function () {
    const heroEl = document.getElementById('hero-canvas-container');
    if (heroEl) heroEl.remove();
    // Sobre agora não usa canvas isolado, limpeza feita pelo destroySobreCanvas em sobre.js se necessário
    destroySobreCanvas();
  };

  // Enter builder mode — render properties into the builder panel
  if (typeof window.enterBuilderMode === 'function') {
    window.enterBuilderMode();
    const propsContent = document.getElementById('builder-props-content');
    const propsTabs = document.getElementById('builder-props-tabs');
    if (propsContent && propsTabs) {
      container.innerHTML = '<p style="color:var(--text-muted,#484f58); font-size:0.8125rem; padding:1rem; text-align:center;">Editor de site aberto ao lado →</p>';
      await renderBuilderContent(propsContent, propsTabs);
      return;
    }
  }

  // Fallback: normal render (when builder elements aren't available)
  await renderSiteContent(container, null);
}

async function renderBuilderContent(propsContent, propsTabs) {
  // Render into builder props panel
  await renderSiteContent(propsContent, propsTabs);
}

async function renderSiteContent(container, builderTabsEl) {
  const isBuilder = !!builderTabsEl;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      ${!isBuilder ? `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Meu Site Profissional</h2>
        <div style="display:flex; gap:1rem; align-items:center;">
            <button id="copySiteLink" style="background:#374151; color:#d1d5db; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem;">📋 Copiar Link</button>
            <a id="viewSiteLink" href="#" target="_blank" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; text-decoration:none; font-weight:600; font-size:0.875rem;">Ver Site</a>
        </div>
      </div>` : ''}

      <!-- Layout: nav vertical + conteúdo -->
      <div style="display:flex; gap:0; flex:1; min-height:0;">

        <!-- Nav vertical (Morph compacta) -->
        <div style="width:46px; flex-shrink:0; display:flex; flex-direction:column; gap:4px; align-items:flex-start; border-right:1px solid var(--border,#30363d); padding:0 5px; overflow:visible; z-index:10;">
          <button class="sub-tab-btn builder-nav-item active" data-target="config-geral"><span class="material-symbols-outlined">tune</span><span class="builder-nav-label">Geral</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-secoes"><span class="material-symbols-outlined">layers</span><span class="builder-nav-label">Seções</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-hero"><span class="material-symbols-outlined">view_carousel</span><span class="builder-nav-label">Capa</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-sobre"><span class="material-symbols-outlined">person</span><span class="builder-nav-label">Sobre</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-portfolio"><span class="material-symbols-outlined">collections</span><span class="builder-nav-label">Portfólio</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-servicos"><span class="material-symbols-outlined">handyman</span><span class="builder-nav-label">Serviços</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-depoimentos"><span class="material-symbols-outlined">chat</span><span class="builder-nav-label">Depoimentos</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-albuns"><span class="material-symbols-outlined">photo_library</span><span class="builder-nav-label">Álbuns</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-estudio"><span class="material-symbols-outlined">apartment</span><span class="builder-nav-label">Estúdio</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-contato"><span class="material-symbols-outlined">mail</span><span class="builder-nav-label">Contato</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-faq"><span class="material-symbols-outlined">help</span><span class="builder-nav-label">FAQ</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-rodape"><span class="material-symbols-outlined">bottom_app_bar</span><span class="builder-nav-label">Rodapé</span></button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-cliente"><span class="material-symbols-outlined">group</span><span class="builder-nav-label">Área do Cliente</span></button>
          <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem; flex-shrink:0;"></div>
          <button class="sub-tab-btn builder-nav-item" data-target="config-personalizar" style="color:var(--purple,#bc8cff);"><span class="material-symbols-outlined" style="color:var(--purple,#bc8cff);">palette</span><span class="builder-nav-label" style="color:var(--purple,#bc8cff);">Personalizar</span></button>
          <div id="adminTemplateNavItem" style="display:none;">
            <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem; flex-shrink:0;"></div>
            <button class="sub-tab-btn builder-nav-item" data-target="config-default-template" style="color:#f59e0b;"><span class="material-symbols-outlined" style="color:#f59e0b;">admin_panel_settings</span><span class="builder-nav-label" style="color:#f59e0b;">Padrão</span></button>
          </div>
          <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem; flex-shrink:0;"></div>
          <button class="sub-tab-btn builder-nav-item" id="siteStatusToggleBtn" style="transition: color 0.15s;">
            <span class="material-symbols-outlined" id="siteStatusIcon" style="transition: color 0.15s;">visibility</span>
            <span class="builder-nav-label" id="siteStatusLabel">Ativar Site</span>
          </button>
        </div>

        <!-- Conteúdo das Abas -->
        <div id="subTabContent" style="flex:1; min-width:0; padding-left:0.75rem; overflow-y:auto; scrollbar-width:none; -ms-overflow-style:none;">
          <style>#subTabContent::-webkit-scrollbar { display: none; }</style>
        <!-- Geral -->
        <div id="config-geral" class="sub-tab-content">
            <div style="display:flex; flex-direction:column; gap:2rem; text-align:center; align-items:center;">
                <div style="width:100%; display:flex; flex-direction:column; align-items:center;">
                    <h3 style="color:#f3f4f6; font-weight:600; font-size:1.125rem; margin-bottom:0.5rem; text-align:center;">Escolha o Tema do Seu Site</h3>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:1.5rem; text-align:center; max-width:320px;">Use o "Visualizar" para testar. Para definir, clique no card e salve.</p>
                    <div id="templateGallery" style="display:flex; flex-direction:column; gap:0.625rem; margin-bottom:1.5rem; width:100%; text-align:left;">
                        <!-- Templates inseridos via JS -->
                    </div>
                    <input type="hidden" id="siteTheme">
                </div>
                <div style="width:100%; display:flex; justify-content:center;">
                    <button id="saveGeralBtn" class="header-expand-btn" title="Salvar Tema" style="border-radius: 9999px !important; box-sizing: border-box; display: inline-flex !important;">
                      <span class="header-expand-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                          <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                      </span>
                      <span class="header-expand-label" style="font-weight: 600; padding-left: 2px;">Salvar Tema</span>
                    </button>
                </div>
                <!-- Restaurar conteúdo de exemplo -->
                <div style="padding:1.25rem 1rem; background:rgba(255,255,255,0.03); border:1px solid var(--border,#30363d); border-radius:var(--radius-lg, 0.5rem); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; width:100%; box-sizing:border-box;">
                    <p style="font-weight:600; color:#f3f4f6; margin:0; font-size:0.9rem; text-align:center;">Restaurar conteúdo de exemplo</p>
                    <p style="font-size:0.78rem; color:#9ca3af; margin:0 0 0.25rem; text-align:center; line-height:1.4;">Preenche seu site com textos, serviços e FAQ de exemplo para você visualizar como ficará. O conteúdo atual será substituído.</p>
                    <button id="applyDefaultTemplateBtn" class="header-expand-btn" title="Aplicar Exemplo" style="border-radius: 9999px !important; box-sizing: border-box; display: inline-flex !important;">
                      <span class="header-expand-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"></path>
                          <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z"></path>
                          <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"></path>
                        </svg>
                      </span>
                      <span class="header-expand-label" style="font-weight: 600; padding-left: 2px;">Aplicar Exemplo</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Seções (Ativar/Desativar) -->
        <div id="config-secoes" class="sub-tab-content" style="display:none;"></div>

        <!-- Hero -->
        <div id="config-hero" class="sub-tab-content" style="display:none;"></div>

        <!-- Sobre (canvas editor — renderizado por sobre.js) -->
        <div id="config-sobre" class="sub-tab-content" style="display:none;"></div>

        <!-- Portfólio (renderizado pelo portfolio.js) -->
        <div id="config-portfolio" class="sub-tab-content" style="display:none;"></div>

        <!-- Serviços -->
        <div id="config-servicos" class="sub-tab-content" style="display:none;"></div>

        <!-- Depoimentos -->
        <div id="config-depoimentos" class="sub-tab-content" style="display:none;"></div>

        <!-- Álbuns (renderizado pelo albuns.js) -->
        <div id="config-albuns" class="sub-tab-content" style="display:none;"></div>

        <!-- Estúdio (renderizado pelo estudio.js) -->
        <div id="config-estudio" class="sub-tab-content" style="display:none;"></div>

        <!-- Contato -->
        <div id="config-contato" class="sub-tab-content" style="display:none;"></div>

        <!-- FAQ (renderizado pelo faq.js) -->
        <div id="config-faq" class="sub-tab-content" style="display:none;"></div>

        <!-- Rodapé -->
        <div id="config-rodape" class="sub-tab-content" style="display:none;"></div>

        <!-- Área do Cliente -->
        <div id="config-cliente" class="sub-tab-content" style="display:none;"></div>

        <!-- Personalizar -->
        <div id="config-personalizar" class="sub-tab-content" style="display:none;"></div>

        <!-- Template Padrão (admin CliqueZoom only) -->
        <div id="config-default-template" class="sub-tab-content" style="display:none;"></div>
      </div>
      <!-- fim subTabContent -->
      </div>
      <!-- fim layout flex nav+conteudo -->
    </div>
  `;

  // Carregar dados
  let configData = {};
  let defaultTmpl = {};
  try {
    const [cfgRes, tmplRes] = await Promise.all([
      apiGet('/api/site/admin/config'),
      apiGet('/api/site/default-template')
    ]);
    configData = cfgRes || {};
    defaultTmpl = tmplRes?.template || {};
  } catch (e) {
    console.error(e);
  }
  // Disponibilizar para sub-módulos (portfolio.js, etc.)
  appState.configData = configData;

  // Buscar slug da organização para montar URLs de preview
  let orgSlug = new URLSearchParams(window.location.search).get('_tenant') || '';
  if (!orgSlug) {
    orgSlug = appState.orgSlug || '';
  }
  if (!orgSlug) {
    try {
      const profile = await apiGet('/api/organization/profile');
      orgSlug = profile.data?.slug || profile.slug || '';
    } catch (e) { /* usa fallback vazio */ }
  }

  // Preencher campos
  const { siteEnabled, siteTheme, siteConfig = {}, siteContent = {} } = configData;

  // Tema selecionado no momento (pode mudar sem salvar)
  let selectedTheme = siteTheme || 'elegante';

  const themeBackgrounds = defaultTmpl.siteStyle?.themeBackgrounds || {};

  // Renderizar galeria de templates
  const templates = [
    { id: 'elegante', name: 'Elegante', desc: 'Clássico com dourado e serif', colors: ['#c9a962', '#2c2c2c', '#f5f5f5'], bgImage: themeBackgrounds.elegante || '' },
    { id: 'minimalista', name: 'Minimalista', desc: 'Clean com muito espaço branco', colors: ['#000000', '#666666', '#ffffff'], bgImage: themeBackgrounds.minimalista || '' },
    { id: 'moderno', name: 'Moderno', desc: 'Azul com gradientes e cards', colors: ['#3b82f6', '#667eea', '#f8fafc'], bgImage: themeBackgrounds.moderno || '' },
    { id: 'escuro', name: 'Escuro', desc: 'Dark mode com laranja', colors: ['#ff9500', '#0a0a0a', '#1a1a1a'], bgImage: themeBackgrounds.escuro || '' },
    { id: 'galeria', name: 'Galeria', desc: 'Masonry grid foco em fotos', colors: ['#8b7355', '#2c2c2c', '#fafafa'], bgImage: themeBackgrounds.galeria || '' }
  ];

  function buildPreviewUrl(themeId) {
    const base = `${window.location.origin}/site?_preview=1&_preview_theme=${themeId}`;
    return orgSlug ? `${base}&_tenant=${orgSlug}` : base;
  }

  function renderTemplateCards() {
    const templateGallery = container.querySelector('#templateGallery');
    templateGallery.innerHTML = templates.map(t => {
      const isActive = siteTheme === t.id;
      const isSelected = selectedTheme === t.id;
      return `
        <div class="template-card builder-theme-card ${isSelected ? 'active' : ''}" 
             data-theme="${t.id}"
             style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 0.75rem; padding: 1.25rem; border-radius: var(--radius-lg, 0.5rem); cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; min-height: 140px; background-size: cover; background-position: center; ${t.bgImage ? `background-image: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url('${t.bgImage}');` : 'background: rgba(49, 53, 60, 0.3);'}">
          
          <!-- Ícone de Check do Tema Ativo (Padrão Lucide) -->
          ${isActive ? `
            <div style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(63, 185, 80, 0.15); border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(63, 185, 80, 0.25);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green,#3fb950)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>` : ''}

          <!-- Textos Centralizados -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
            <h4 style="color:var(--text-primary,#e6edf3); font-weight:700; font-size:0.9375rem; margin:0;">${t.name}</h4>
            <p style="color:var(--text-secondary,#8b949e); font-size:0.75rem; margin:0; line-height: 1.3;">${t.desc}</p>
          </div>

          <!-- Cores do Tema -->
          <div style="display:flex; gap:0.375rem; justify-content: center;">
            ${t.colors.map(c => `<div style="width:0.875rem; height:0.875rem; background:${c}; border-radius:50%; border:1px solid rgba(255,255,255,0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>`).join('')}
          </div>

          <!-- Botão Visualizar (Morph com Lucide) -->
          <div style="margin-top: 0.25rem;">
            <a href="${buildPreviewUrl(t.id)}" target="_blank" rel="noopener"
              onclick="event.stopPropagation()"
              class="header-expand-btn"
              title="Visualizar"
              style="text-decoration: none; border-radius: 9999px !important; box-sizing: border-box; display: inline-flex !important;">
              <span class="header-expand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </span>
              <span class="header-expand-label" style="font-weight: 600; padding-left: 2px;">Visualizar</span>
            </a>
          </div>

        </div>
      `;
    }).join('');

    // Click nos cards — seleciona sem salvar
    container.querySelectorAll('.template-card').forEach(card => {
      card.onclick = () => {
        selectedTheme = card.dataset.theme;
        container.querySelector('#siteTheme').value = selectedTheme;
        renderTemplateCards();
      };
    });
  }

  renderTemplateCards();
  container.querySelector('#siteTheme').value = selectedTheme;

  // Atualiza label da topbar do builder com o tema atual ao carregar
  const _themeLabel = document.getElementById('builder-preview-theme-label');
  if (_themeLabel) {
    const _themeName = templates.find(t => t.id === selectedTheme)?.name || selectedTheme;
    _themeLabel.textContent = `Tema: ${_themeName}`;
  }

  // Status do Site na Sidebar
  let currentSiteEnabled = !!siteEnabled;
  const statusBtn = container.querySelector('#siteStatusToggleBtn');
  const statusIcon = container.querySelector('#siteStatusIcon');
  const statusLabel = container.querySelector('#siteStatusLabel');

  const updateStatusBtnUI = (enabled) => {
    if (statusBtn && statusIcon && statusLabel) {
      if (enabled) {
        statusBtn.style.color = 'var(--green,#3fb950)';
        statusIcon.style.color = 'var(--green,#3fb950)';
        statusIcon.textContent = 'visibility';
        statusLabel.textContent = 'Site Ativo';
      } else {
        statusBtn.style.color = 'var(--red,#f85149)';
        statusIcon.style.color = 'var(--red,#f85149)';
        statusIcon.textContent = 'visibility_off';
        statusLabel.textContent = 'Site Inativo';
      }
    }
  };

  if (statusBtn) {
    updateStatusBtnUI(currentSiteEnabled);

    statusBtn.onclick = async (e) => {
      e.stopPropagation();
      
      const targetStatus = !currentSiteEnabled;
      const actionText = targetStatus ? 'ativar' : 'desativar';
      
      const ok = await window.showConfirm?.(`Deseja ${actionText} o seu site público?`, {
        title: targetStatus ? 'Ativar Site' : 'Desativar Site',
        confirmText: targetStatus ? 'Ativar' : 'Desativar',
        cancelText: 'Cancelar'
      });
      if (!ok) return;
      
      try {
        await apiPut('/api/site/admin/config', { siteEnabled: targetStatus });
        configData.siteEnabled = targetStatus;
        currentSiteEnabled = targetStatus;
        updateStatusBtnUI(targetStatus);
        window.showToast?.(targetStatus ? 'Site ativado! Visitantes já podem acessar.' : 'Site desativado. Visitantes verão "Em breve".', targetStatus ? 'success' : 'warning');
        liveRefresh({});
      } catch (err) {
        window.showToast?.('Erro ao alterar status do site', 'error');
      }
    };
  }

  // Links (only in non-builder mode)
  // URL pública usa subdomínio: joao.cliquezoom.com.br/site
  // Em localhost usa ?_tenant= para compatibilidade com desenvolvimento
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseDomain = window.location.hostname.split('.').slice(-2).join('.');
  const siteUrl = orgSlug
    ? (isLocalhost
        ? `${window.location.origin}/site?_tenant=${orgSlug}`
        : `${window.location.protocol}//${orgSlug}.${baseDomain}/site`)
    : `${window.location.origin}/site`;
  const viewSiteLink = container.querySelector('#viewSiteLink');
  if (viewSiteLink) viewSiteLink.href = siteUrl;
  const copySiteLink = container.querySelector('#copySiteLink');
  if (copySiteLink) copySiteLink.onclick = () => {
    navigator.clipboard.writeText(siteUrl);
    window.showToast?.('Link copiado!', 'success');
  };

  // ── Helper: loading state em botão de salvar ─────────────────────────
  async function withBtnLoading(btn, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;vertical-align:middle;"></span>Salvando...`;
    try {
      await fn();
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  }

  // ── Detecção de alterações não salvas (SISTEMA ROBUSTO) ─────────────
  let _dirtySection = null;
  let _dirtySectionLabel = '';
  let _originalValues = {}; // { 'config-hero': { field1: 'value1', ... }, ... }

  // Captura snapshot dos valores originais de uma aba
  function captureOriginalValues(sectionId, container) {
    const inputs = container.querySelectorAll('input, textarea, select');
    const snapshot = {};
    inputs.forEach(input => {
      const key = input.id || input.name || input.getAttribute('data-field');
      if (key) {
        snapshot[key] = input.type === 'checkbox' ? input.checked : input.value;
      }
    });
    _originalValues[sectionId] = snapshot;
  }

  // Verifica se houve mudanças REAIS comparando com snapshot original
  function hasRealChanges(sectionId, container) {
    const inputs = container.querySelectorAll('input, textarea, select');
    const original = _originalValues[sectionId] || {};

    for (let input of inputs) {
      const key = input.id || input.name || input.getAttribute('data-field');
      if (!key) continue;
      const currentValue = input.type === 'checkbox' ? input.checked : input.value;
      const originalValue = original[key];

      // Se o valor mudou comparado ao original, retorna true
      if (currentValue !== originalValue) {
        return true;
      }
    }

    return false;
  }

  function markDirty(sectionId, label) {
    _dirtySection = sectionId;
    _dirtySectionLabel = label;
  }

  function clearDirty() {
    _dirtySection = null;
    _dirtySectionLabel = '';
  }

  async function checkDirtyBeforeSwitch() {
    if (!_dirtySection) return true;

    const activeContent = container.querySelector('.sub-tab-content:not([style*="display: none"]):not([style*="display:none"])');
    if (activeContent && !hasRealChanges(_dirtySection, activeContent)) {
      clearDirty();
      return true;
    }

    const label = _dirtySectionLabel;
    const save = await window.showConfirm?.(`Você tem alterações não salvas em "${label}". Deseja salvar antes de continuar?`, {
      title: 'Alterações não salvas',
      confirmText: 'Salvar',
      cancelText: 'Descartar',
    });

    if (save) {
      const saveBtn = activeContent?.querySelector('button[id*="save"], button[id*="Save"]');
      if (saveBtn && !saveBtn.disabled) {
        saveBtn.click();
        await new Promise(r => setTimeout(r, 600));
      }
    } else {
      // Descartar: restaurar campos ao valor original
      const original = _originalValues[_dirtySection] || {};
      if (activeContent) {
        activeContent.querySelectorAll('input, textarea, select').forEach(input => {
          const key = input.id || input.name || input.getAttribute('data-field');
          if (key && key in original) {
            if (input.type === 'checkbox') input.checked = original[key];
            else input.value = original[key];
          }
        });
      }
    }
    clearDirty();
    return true;
  }

  // Helper: Adiciona listeners automáticos a inputs para detectar mudanças
  function setupDirtyTracking(sectionId, sectionLabel, targetContainer) {
    const inputs = targetContainer.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const eventType = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(eventType, () => {
        if (hasRealChanges(sectionId, targetContainer)) {
          markDirty(sectionId, sectionLabel);
        } else {
          clearDirty();
        }
      });
    });
  }

  // ── Preview em tempo real ─────────────────────────────────────────────
  // Referência ao canvas editor (quando hero está aberto)
  // let _heroCanvasEditor = null; // Removido

  let _heroImageUrlForPreview = '';

  // Monta snapshot dos dados atuais (campos do form + configData) e envia
  // via postMessage ao iframe do builder — sem reload, sem salvar no banco.
  function postPreviewData() {
    if (!window.builderPostPreview) return;

    // Base: dados carregados do servidor
    const snap = {
      name: configData.name || '',
      logo: configData.logo || '',
      email: configData.email || '',
      primaryColor: configData.primaryColor || '',
      siteEnabled: true, // sempre mostrar no preview
      siteTheme: container.querySelector('#siteTheme')?.value || configData.siteTheme || 'elegante',
      siteSections: configData.siteSections || [],
      siteStyle: { ...(configData.siteStyle || {}) },
      siteConfig: { ...(configData.siteConfig || {}) },
      siteContent: {
        sobre: { ...(configData.siteContent?.sobre || {}) },
        servicos: configData.siteContent?.servicos || [],
        depoimentos: configData.siteContent?.depoimentos || [],
        portfolio: configData.siteContent?.portfolio || { photos: [] },
        contato: { ...(configData.siteContent?.contato || {}) },
        faq: configData.siteContent?.faq || [],
        albums: configData.siteContent?.albums || [],
        studio: getStudioState() || configData.siteContent?.studio || {},
        footer: configData.siteContent?.footer || {},
        areaCliente: configData.siteContent?.areaCliente || {},
      },
      integrations: configData.integrations || {},
    };

    // Sobrescrever com valores atuais dos campos visíveis

    // Sobre Canvas (se aberto)
    const sobreState = getSobreCanvasState();
    if (sobreState) {
      snap.siteContent.sobre = {
        ...snap.siteContent.sobre,
        image: sobreState.image,
        canvasLayers: sobreState.layers,
      };
      const scTitle = container.querySelector('#scTitle');
      const scText = container.querySelector('#scText');
      if (scTitle) snap.siteContent.sobre.title = scTitle.value;
      if (scText) snap.siteContent.sobre.text = scText.value;
    }

    // Hero (sempre enviar a partir do configData atualizado pelos inputs)
    if (_heroImageUrlForPreview) {
      snap.siteConfig.heroImage = _heroImageUrlForPreview;
    }
    // Manter campos legados para templates antigos
    const layers = snap.siteConfig.heroLayers || [];
    if (!snap.siteConfig.heroTitle && layers[0]?.text) snap.siteConfig.heroTitle = layers[0]?.text;
    if (!snap.siteConfig.heroSubtitle && layers[1]?.text) snap.siteConfig.heroSubtitle = layers[1]?.text;

    // Portfolio agora usa nativamente configData.siteContent.portfolio

    // Contato
    const contatoTitle = container.querySelector('#contatoTitle');
    const contatoText = container.querySelector('#contatoText');
    const contatoAddress = container.querySelector('#contatoAddress');
    if (contatoTitle) snap.siteContent.contato.title = contatoTitle.value;
    if (contatoText) snap.siteContent.contato.text = contatoText.value;
    if (contatoAddress) snap.siteContent.contato.address = contatoAddress.value;

    // Estilo visual (Personalizar)
    const accentColor = container.querySelector('#styleAccentColor');
    const bgColor = container.querySelector('#styleBgColor');
    const textColor = container.querySelector('#styleTextColor');
    const fontFamily = container.querySelector('#styleFontFamily');
    if (accentColor) snap.siteStyle.accentColor = accentColor.value;
    if (bgColor) snap.siteStyle.bgColor = bgColor.value;
    if (textColor) snap.siteStyle.textColor = textColor.value;
    if (fontFamily) snap.siteStyle.fontFamily = fontFamily.value;

    window.builderPostPreview(snap);
  }

  // Expor globalmente para que sub-funções (heroStudio, etc.) chamem
  window._meuSitePostPreview = postPreviewData;

  // Atualiza configData localmente e dispara postMessage — sem reload do iframe
  // IMPORTANTE: usar Object.assign em vez de spread para preservar referências
  // (cfg = configData.siteConfig — se criar novo objeto, cfg fica desincronizado)
  function liveRefresh(patch = {}) {
    if (patch.siteContent) {
      if (!configData.siteContent) configData.siteContent = {};
      Object.assign(configData.siteContent, patch.siteContent);
    }
    if (patch.siteConfig) {
      if (!configData.siteConfig) configData.siteConfig = {};
      Object.assign(configData.siteConfig, patch.siteConfig);
    }
    if (patch.siteStyle) {
      if (!configData.siteStyle) configData.siteStyle = {};
      Object.assign(configData.siteStyle, patch.siteStyle);
    }
    if (patch.siteSections) configData.siteSections = patch.siteSections;
    if (patch.siteTheme) configData.siteTheme = patch.siteTheme;
    postPreviewData();
  }

  // ── Navegação de Abas
  const tabs = container.querySelectorAll('.sub-tab-btn');
  const contents = container.querySelectorAll('.sub-tab-content');

  // Enviar comando de scroll ao iframe
  function scrollToSection(sectionId) {
    const iframe = document.getElementById('builder-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'cz_scroll_to', sectionId }, window.location.origin);
    }
  }

  async function doSwitchSubTab(btn, targetContainer) {
    const heroCanvasEl = document.getElementById('hero-canvas-container');
    const iframe = document.getElementById('builder-iframe');

    const target = btn.dataset.target;
    // Ocultar canvas (se houver) e mostrar iframe real
    if (heroCanvasEl) heroCanvasEl.style.display = 'none';
    if (iframe) iframe.style.display = '';

    // Rolar preview para a seção correspondente
    const sectionMap = {
      'config-hero': 'hero',
      'config-secoes': 'hero',
      'config-sobre': 'sobre',
      'config-portfolio': 'portfolio',
      'config-servicos': 'servicos',
      'config-depoimentos': 'depoimentos',
      'config-albuns': 'albuns',
      'config-estudio': 'estudio',
      'config-contato': 'contato',
      'config-faq': 'faq',
      'config-rodape': 'footer',
      'config-cliente': 'areacliente'
    };
    if (sectionMap[target]) scrollToSection(sectionMap[target]);

    tabs.forEach(t => {
      if (t.id === 'siteStatusToggleBtn') return;
      t.classList.remove('active');
      t.style.background = '';
      t.style.color = '';
      t.style.fontWeight = '';
    });
    btn.classList.add('active');
    btn.style.background = '';
    btn.style.color = '';
    btn.style.fontWeight = '';
    contents.forEach(c => c.style.display = 'none');
    targetContainer.style.display = 'block';

    // Renderizar conteúdo específico de cada tab
    if (btn.dataset.target === 'config-secoes') {
      renderSecoes();
    } else if (btn.dataset.target === 'config-hero') {
      const heroEl = container.querySelector('#config-hero');
      if (!heroEl.dataset.hcInitialized) {
        initHeroStudio();
        heroEl.dataset.hcInitialized = 'true';
      } else {
        syncHeroStudioUI();
      }
    } else if (btn.dataset.target === 'config-sobre') {
      renderSobre(targetContainer);
    } else if (btn.dataset.target === 'config-portfolio') {
      await renderPortfolio(targetContainer);
    } else if (btn.dataset.target === 'config-servicos') {
      renderServicos();
    } else if (btn.dataset.target === 'config-depoimentos') {
      renderDepoimentos();
    } else if (btn.dataset.target === 'config-albuns') {
      await renderAlbuns(targetContainer);
    } else if (btn.dataset.target === 'config-estudio') {
      renderEstudio(targetContainer);
    } else if (btn.dataset.target === 'config-contato') {
      renderContato();
    } else if (btn.dataset.target === 'config-faq') {
      await renderFaq(targetContainer);
    } else if (btn.dataset.target === 'config-rodape') {
      renderRodape();
    } else if (btn.dataset.target === 'config-cliente') {
      renderCliente(targetContainer);
    } else if (btn.dataset.target === 'config-personalizar') {
      renderPersonalizar();
    }
  }

  tabs.forEach(btn => {
    if (btn.id === 'siteStatusToggleBtn') return;
    btn.onclick = async () => {
      const targetContainer = container.querySelector(`#${btn.dataset.target}`);
      await checkDirtyBeforeSwitch();
      doSwitchSubTab(btn, targetContainer);
    };
  });

  // Builder mode: nav vertical já está embutido no painel, limpar área de tabs do header
  if (isBuilder && builderTabsEl) {
    builderTabsEl.innerHTML = '';
  }

  // --- GERAL ---
  container.querySelector('#saveGeralBtn').onclick = async (e) => {
    await withBtnLoading(e.currentTarget, async () => {
      const newTheme = container.querySelector('#siteTheme').value;
      await apiPut('/api/site/admin/config', { siteTheme: newTheme });
      configData.siteTheme = newTheme;
      selectedTheme = newTheme;
      renderTemplateCards();
      window.showToast?.('Tema salvo!', 'success');
      // Atualiza label do preview
      const themeLabel = document.getElementById('builder-preview-theme-label');
      if (themeLabel) themeLabel.textContent = `Tema: ${templates.find(t => t.id === newTheme)?.name || newTheme}`;
      // Atualiza URL na barra do browser chrome
      const browserUrl = document.getElementById('builder-browser-url');
      if (browserUrl && orgSlug) browserUrl.textContent = `${orgSlug}.cliquezoom.com.br`;
      // Tema agora é instantâneo via CSS data-theme (sem reload)
      liveRefresh({ siteTheme: newTheme });
    });
  };

  // --- RESTAURAR EXEMPLO ---
  const applyDefaultBtn = container.querySelector('#applyDefaultTemplateBtn');
  if (applyDefaultBtn) {
    applyDefaultBtn.onclick = async () => {
      const ok = await window.showConfirm?.('Aplicar conteúdo de exemplo?', {
        message: 'Textos, serviços e FAQ serão substituídos pelo conteúdo de exemplo da plataforma. Fotos e configurações visuais não serão afetadas.',
        confirmText: 'Aplicar Exemplo',
        cancelText: 'Cancelar'
      });
      if (!ok) return;
      applyDefaultBtn.textContent = 'Aplicando...';
      applyDefaultBtn.disabled = true;
      try {
        await apiPost('/api/site/default-template/apply', {});
        window.showToast?.('Conteúdo de exemplo aplicado! Recarregando...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        window.showToast?.('Erro: ' + err.message, 'error');
        applyDefaultBtn.textContent = 'Aplicar Exemplo';
        applyDefaultBtn.disabled = false;
      }
    };
  }

  // --- ADMIN: TEMPLATE PADRÃO (só para superadmin) ---
  const adminNavItem = container.querySelector('#adminTemplateNavItem');
  let isSuperadmin = false;
  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token') || '';
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isSuperadmin = payload.role === 'superadmin';
    }
  } catch (_) {}

  if (isSuperadmin && adminNavItem) {
    adminNavItem.style.display = 'block';
    const adminTabEl = container.querySelector('#config-default-template');
    if (adminTabEl) _renderDefaultTemplateAdmin(adminTabEl, container);
  }

  // --- SOBRE --- (canvas editor — setup feito por sobre.js ao abrir a sub-aba)

  // --- HERO CANVAS ---
  // Editor visual completo estilo Canva — canvas interativo com layers
  const HERO_FONTS = [
    { value: '', label: 'Padrão do Tema' },
    { value: "'Playfair Display', serif", label: 'Playfair Display' },
    { value: "'Inter', sans-serif", label: 'Inter' },
    { value: "'Poppins', sans-serif", label: 'Poppins' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat' },
    { value: "'Lato', sans-serif", label: 'Lato' },
    { value: "'Raleway', sans-serif", label: 'Raleway' },
    { value: "'Oswald', sans-serif", label: 'Oswald' },
    { value: "Georgia, serif", label: 'Georgia' },
  ];

  // Estado do Hero — versão básica (sem dispositivos)
  let _heroSelectedLayerId = null;

  const syncHeroStudioUI = () => {
    const heroContainer = container.querySelector('#config-hero');
    if (!heroContainer) return;
    const cfg = configData.siteConfig || {};

    _heroSelectedLayerId = null;
    _heroImageUrlForPreview = cfg.heroImage || '';

    // Atualizar sliders e valores de exibição (Global)
    const setV = (id, val, suffix, isFloat = false) => {
      const el = heroContainer.querySelector('#' + id);
      if (el) el.value = val;
      const vEl = heroContainer.querySelector('#' + id + 'Val');
      if (vEl) vEl.textContent = (isFloat ? parseFloat(val).toFixed(1) : val) + suffix;
    };
    setV('hcBgScale', cfg.heroScale ?? 1, 'x', true);
    setV('hcBgPosX', cfg.heroPosX ?? 50, '%');
    setV('hcBgPosY', cfg.heroPosY ?? 50, '%');
    setV('hcBgOverlayOpacity', cfg.overlayOpacity ?? 30, '%');

    // Re-renderizar lista de camadas e esconder painel de propriedades
    heroRenderLayerList();
    const p = heroContainer.querySelector('#hcLayerProps');
    if (p) p.style.display = 'none';
  };

  // Funções internas do Hero
  let heroRenderLayerList = () => {};
  let heroRenderPropsForLayer = (l) => {};

  const initHeroStudio = () => {
    const heroContainer = container.querySelector('#config-hero');
    if (!configData.siteConfig) configData.siteConfig = {};
    const cfg = configData.siteConfig;

    // Migração/Limpeza: garantir que heroLayers existe
    if (!cfg.heroLayers) cfg.heroLayers = [];
    
    _heroSelectedLayerId = null;
    _heroImageUrlForPreview = cfg.heroImage || '';

    // ── Sidebar: Painel de Propriedades (Versão Básica) ──
    heroContainer.innerHTML = `
      <style>
        #config-hero { display:flex; flex-direction:column; height:100%; overflow:hidden; }
        .hc-sidebar { display:flex; flex-direction:column; flex:1; min-height:0; overflow-y:auto; }
        .hc-sidebar::-webkit-scrollbar { width:4px; }
        .hc-sidebar::-webkit-scrollbar-thumb { background:#374151; border-radius:2px; }
        .hc-section { border-bottom:1px solid #1f2937; }
        .hc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:space-between; }
        .hc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
        .hc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }
        .hc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
        .hc-input:focus { border-color:#3b82f6; }
        .hc-range { width:100%; accent-color:#3b82f6; }
        .hc-range-row { display:flex; align-items:center; gap:0.4rem; }
        .hc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
        .hc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
        .hc-btn:hover { background:#374151; color:#fff; }
        .hc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
        .hc-btn.primary:hover { background:#2563eb; }
        .hc-btn.success { background:#16a34a; border-color:#16a34a; color:#fff; font-weight:700; }
        .hc-btn.success:hover { background:#15803d; }
        .hc-layer-item { margin:0 0.5rem 0.35rem; padding:0.4rem 0.6rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.75rem; color:#d1d5db; }
        .hc-layer-item:hover { background:#2d3748; }
        .hc-layer-item.active { border-color:#3b82f6; background:#172554; }
        .hc-layer-item .layer-icon { font-size:0.8rem; opacity:0.6; }
        .hc-layer-item .layer-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .hc-layer-item .layer-del { color:#ef4444; cursor:pointer; font-size:0.85rem; opacity:0.6; }
        .hc-layer-item .layer-del:hover { opacity:1; }
        .hc-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0.35rem; }
      </style>

      <div class="hc-sidebar">
        <!-- ADICIONAR -->
        <div class="hc-section">
          <div class="hc-section-head">Adicionar</div>
          <div style="display:flex; gap:0.35rem; padding:0.4rem 0.75rem;">
            <button class="hc-btn primary" id="hcAddText" style="flex:1;">+ Texto</button>
          </div>
        </div>

        <!-- FUNDO -->
        <div class="hc-section">
          <div class="hc-section-head">Imagem de Fundo</div>
          <div style="display:flex; gap:0.35rem; padding:0.4rem 0.75rem;">
            <label class="hc-btn primary" style="flex:1; cursor:pointer;">
              Upload <input type="file" id="hcBgUpload" accept="image/*" style="display:none;">
            </label>
          </div>
          <div id="hcBgProgress"></div>
          <details style="margin:0;" open>
            <summary style="padding:0.4rem 0.75rem; font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between;">
              Ajustes da Imagem <span style="font-size:0.6rem; opacity:0.6;">▼</span>
            </summary>
            <div class="hc-row">
              <div class="hc-label">Zoom</div>
              <div class="hc-range-row">
                <input type="range" class="hc-range" id="hcBgScale" min="1" max="3" step="0.05" value="${cfg.heroScale ?? 1}">
                <span class="hc-range-val" id="hcBgScaleVal">${parseFloat(cfg.heroScale ?? 1).toFixed(1)}x</span>
              </div>
            </div>
            <div class="hc-row">
              <div class="hc-label">Posição X</div>
              <div class="hc-range-row">
                <input type="range" class="hc-range" id="hcBgPosX" min="0" max="100" step="1" value="${cfg.heroPosX ?? 50}">
                <span class="hc-range-val" id="hcBgPosXVal">${cfg.heroPosX ?? 50}%</span>
              </div>
            </div>
            <div class="hc-row">
              <div class="hc-label">Posição Y</div>
              <div class="hc-range-row">
                <input type="range" class="hc-range" id="hcBgPosY" min="0" max="100" step="1" value="${cfg.heroPosY ?? 50}">
                <span class="hc-range-val" id="hcBgPosYVal">${cfg.heroPosY ?? 50}%</span>
              </div>
            </div>
            <div class="hc-row">
              <div class="hc-label">Escurecer Capa</div>
              <div class="hc-range-row">
                <input type="range" class="hc-range" id="hcBgOverlayOpacity" min="0" max="100" step="1" value="${cfg.overlayOpacity ?? 30}">
                <span class="hc-range-val" id="hcBgOverlayOpacityVal">${cfg.overlayOpacity ?? 30}%</span>
              </div>
            </div>
          </details>
        </div>

        <!-- PROPRIEDADES DO ITEM -->
        <div class="hc-section" id="hcLayerProps" style="display:none;">
          <div class="hc-section-head" id="hcPropTitle">Propriedades</div>
          <div id="hcPropContent"></div>
        </div>

        <!-- LISTA DE CAMADAS -->
        <div class="hc-section">
          <div class="hc-section-head">Camadas</div>
          <div id="hcLayerList"></div>
        </div>

        <!-- SALVAR -->
        <div style="padding:1rem 0.75rem; margin-top:auto;">
          <button class="hc-btn success" id="hcSaveBtn" style="width:100%; padding:0.75rem;">Salvar</button>
          <button class="hc-btn" id="hcRestoreBtn" style="width:100%; margin-top:0.5rem; background:none; border:none; font-size:0.7rem;">Restaurar Padrão</button>
        </div>
      </div>
    `;

    // ── Funções de Estado e Preview ──
    const liveNotify = () => {
      markDirty('config-hero', 'Capa');
      window._meuSitePostPreview?.();
    };

    const updateConfigFromUI = () => {
      cfg.heroScale = parseFloat(heroContainer.querySelector('#hcBgScale').value);
      cfg.heroPosX = parseInt(heroContainer.querySelector('#hcBgPosX').value);
      cfg.heroPosY = parseInt(heroContainer.querySelector('#hcBgPosY').value);
      cfg.overlayOpacity = parseInt(heroContainer.querySelector('#hcBgOverlayOpacity').value);
      liveNotify();
    };

    // ── Sliders Bind ──
    ['hcBgScale', 'hcBgPosX', 'hcBgPosY', 'hcBgOverlayOpacity'].forEach(id => {
      heroContainer.querySelector('#' + id).oninput = (e) => {
        const val = e.target.value;
        const suffix = id === 'hcBgScale' ? 'x' : '%';
        heroContainer.querySelector('#' + id + 'Val').textContent = (id === 'hcBgScale' ? parseFloat(val).toFixed(1) : val) + suffix;
        updateConfigFromUI();
      };
    });

    // ── Background Upload ──
    heroContainer.querySelector('#hcBgUpload').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const result = await uploadImage(file, appState.authToken, (p) => showUploadProgress('hcBgProgress', p));
        cfg.heroImage = result.url;
        _heroImageUrlForPreview = result.url;
        liveNotify();
      } catch (err) { window.showToast?.('Erro no upload', 'error'); }
    };

    // ── Camadas ──
    const getLayer = (id) => cfg.heroLayers.find(l => l.id === id);
    const updateLayer = (id, props) => {
      const l = getLayer(id);
      if (!l) return;
      Object.assign(l, props);
      liveNotify();
    };

    const renderLayerList = () => {
      const list = heroContainer.querySelector('#hcLayerList');
      const layers = [...cfg.heroLayers].reverse();
      if (!layers.length) {
        list.innerHTML = '<div style="padding:0.75rem; color:#4b5563; font-size:0.7rem; text-align:center;">Nenhum texto adicionado</div>';
        return;
      }

      list.innerHTML = layers.map((l, idx) => `
        <div class="hc-layer-item ${l.id === _heroSelectedLayerId ? 'active' : ''}" data-id="${l.id}" data-idx="${idx}" draggable="true">
          <span class="layer-drag" style="cursor:grab; color:#4b5563; font-size:0.75rem; flex-shrink:0; padding-right:0.2rem;">⠿</span>
          <span class="layer-icon">T</span>
          <span class="layer-name">${l.name || 'Texto'}</span>
          <span class="layer-del" data-del="${l.id}">✕</span>
        </div>
      `).join('');

      // Drag & Drop nas camadas
      let dragLayerIdx = null;
      list.querySelectorAll('.hc-layer-item').forEach(el => {
        el.addEventListener('dragstart', (e) => {
          dragLayerIdx = parseInt(el.dataset.idx);
          el.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        el.addEventListener('dragend', () => { el.style.opacity = '1'; list.querySelectorAll('.hc-layer-item').forEach(i => i.style.borderTop = ''); });
        el.addEventListener('dragover', (e) => { e.preventDefault(); el.style.borderTop = '2px solid #3b82f6'; });
        el.addEventListener('dragleave', () => { el.style.borderTop = ''; });
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          el.style.borderTop = '';
          const targetIdx = parseInt(el.dataset.idx);
          if (dragLayerIdx === null || dragLayerIdx === targetIdx) return;
          const realLen = cfg.heroLayers.length;
          const realDrag = realLen - 1 - dragLayerIdx;
          const realTarget = realLen - 1 - targetIdx;
          const moved = cfg.heroLayers.splice(realDrag, 1)[0];
          cfg.heroLayers.splice(realTarget, 0, moved);
          dragLayerIdx = null;
          renderLayerList();
          liveNotify();
        });

        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('layer-del')) {
            cfg.heroLayers = cfg.heroLayers.filter(l => l.id !== el.dataset.id);
            if (_heroSelectedLayerId === el.dataset.id) _heroSelectedLayerId = null;
            renderLayerList();
            renderPropsForLayer(null);
            liveNotify();
            return;
          }
          if (e.target.classList.contains('layer-drag')) return;
          _heroSelectedLayerId = el.dataset.id;
          renderLayerList();
          renderPropsForLayer(getLayer(_heroSelectedLayerId));
        });
      });
    };

    const renderPropsForLayer = (l) => {
      const p = heroContainer.querySelector('#hcLayerProps');
      const c = heroContainer.querySelector('#hcPropContent');
      if (!l) { p.style.display = 'none'; return; }
      p.style.display = 'block';

      c.innerHTML = `
        <div class="hc-row"><div class="hc-label">Texto</div><input type="text" class="hc-input" id="lpText" value="${l.text || ''}"></div>
        <div class="hc-grid2">
          <div class="hc-row"><div class="hc-label">Pos X (%)</div><input type="range" class="hc-range" id="lpX" value="${l.x ?? 50}"></div>
          <div class="hc-row"><div class="hc-label">Pos Y (%)</div><input type="range" class="hc-range" id="lpY" value="${l.y ?? 50}"></div>
        </div>
        <div class="hc-row">
          <div class="hc-label">Tamanho: <span id="lpSizeVal">${l.fontSize ?? 60}px</span></div>
          <input type="range" class="hc-range" id="lpSize" min="10" max="300" value="${l.fontSize ?? 60}">
        </div>
        <div class="hc-row"><div class="hc-label">Cor</div><input type="color" id="lpColor" value="${l.color || '#ffffff'}" style="width:100%;"></div>
        <div class="hc-row">
          <div class="hc-label">Alinhamento</div>
          <select class="hc-input" id="lpAlign">
            <option value="left" ${l.align === 'left' ? 'selected' : ''}>Esquerda</option>
            <option value="center" ${l.align === 'center' ? 'selected' : ''}>Centro</option>
            <option value="right" ${l.align === 'right' ? 'selected' : ''}>Direita</option>
          </select>
        </div>
      `;
      heroContainer.querySelector('#lpText').oninput = (e) => {
        l.text = e.target.value;
        l.name = e.target.value ? e.target.value.substring(0, 20) : 'Texto';
        renderLayerList();
        liveNotify();
      };
      heroContainer.querySelector('#lpX').oninput = (e) => updateLayer(l.id, { x: parseInt(e.target.value) });
      heroContainer.querySelector('#lpY').oninput = (e) => updateLayer(l.id, { y: parseInt(e.target.value) });
      heroContainer.querySelector('#lpSize').oninput = (e) => {
        const val = parseInt(e.target.value);
        heroContainer.querySelector('#lpSizeVal').textContent = val + 'px';
        updateLayer(l.id, { fontSize: val });
      };
      heroContainer.querySelector('#lpColor').onchange = (e) => updateLayer(l.id, { color: e.target.value });
      heroContainer.querySelector('#lpAlign').onchange = (e) => updateLayer(l.id, { align: e.target.value });
    };

    // ── Botões Adicionar ──
    heroContainer.querySelector('#hcAddText').onclick = () => {
      cfg.heroLayers.push({ id: 'l_' + Date.now(), type: 'text', name: 'Novo Texto', text: 'Novo Texto', x: 50, y: 50, fontSize: 40, color: '#ffffff', align: 'center', shadow: true });
      renderLayerList();
      liveNotify();
    };

    // ── Salvar / Restaurar ──
    heroContainer.querySelector('#hcSaveBtn').onclick = async (e) => {
      await withBtnLoading(e.currentTarget, async () => {
        await apiPut('/api/site/admin/config', { siteConfig: cfg });
        Object.assign(configData.siteConfig, JSON.parse(JSON.stringify(cfg)));
        clearDirty();
        window.showToast?.('Capa salva!', 'success');
        liveRefresh({ siteConfig: cfg });
      });
    };
    heroContainer.querySelector('#hcRestoreBtn').onclick = async () => {
      if (!await window.showConfirm?.('Restaurar padrão? As camadas, imagem de fundo e ajustes serão removidos.', { title: 'Restaurar Padrão', confirmText: 'Restaurar', danger: true })) return;
      cfg.heroLayers = [];
      cfg.heroImage = '';
      cfg.heroTitle = '';
      cfg.heroSubtitle = '';
      cfg.titlePosX = 50; cfg.titlePosY = 40; cfg.titleFontSize = 80;
      cfg.subtitlePosX = 50; cfg.subtitlePosY = 55; cfg.subtitleFontSize = 40;
      cfg.heroScale = 1; cfg.heroPosX = 50; cfg.heroPosY = 50;
      cfg.overlayOpacity = 30; cfg.topBarHeight = 0; cfg.bottomBarHeight = 0;
      cfg.bgPresets = {}; cfg.overlayPresets = {};
      _heroImageUrlForPreview = '';
      syncHeroStudioUI();
      try {
        await apiPut('/api/site/admin/config', { siteConfig: cfg });
        Object.assign(configData.siteConfig, JSON.parse(JSON.stringify(cfg)));
        clearDirty();
        liveRefresh({ siteConfig: cfg });
        window.showToast?.('Padrão restaurado!', 'success');
      } catch (err) { window.showToast?.('Erro ao salvar. Tente novamente.', 'error'); }
    };

    // ── Init — expor funções internas para syncHeroStudioUI ──
    heroRenderLayerList = renderLayerList;
    heroRenderPropsForLayer = renderPropsForLayer;
    renderLayerList();
  };

  // --- SEÇÕES (Ativar/Desativar) ---
  const renderSecoes = () => {
    const secoesContainer = container.querySelector('#config-secoes');
    const DEFAULT_SECTIONS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'areacliente', 'faq'];
    const allSectionDefs = [
      { id: 'hero', label: 'Capa' },
      { id: 'portfolio', label: 'Portfólio' },
      { id: 'areacliente', label: 'Área do Cliente' },
      { id: 'albuns', label: 'Álbuns' },
      { id: 'servicos', label: 'Serviços' },
      { id: 'estudio', label: 'Estúdio' },
      { id: 'depoimentos', label: 'Depoimentos' },
      { id: 'contato', label: 'Contato' },
      { id: 'sobre', label: 'Sobre Mim' },
      { id: 'faq', label: 'FAQ' },
    ];

    // Ordem atual: ativas primeiro (na ordem salva), depois inativas
    const saved = configData.siteSections?.length ? configData.siteSections : DEFAULT_SECTIONS;
    let ordered = [
      ...saved.map(id => allSectionDefs.find(s => s.id === id)).filter(Boolean),
      ...allSectionDefs.filter(s => !saved.includes(s.id))
    ];
    let activeSet = new Set(saved);

    const renderList = () => {
      secoesContainer.innerHTML = `
        <div style="max-width:580px;">
          <div style="margin-bottom:1.25rem;">
            <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:0.25rem;">Seções do Site</h3>
            <p style="color:#9ca3af; font-size:0.875rem;">Ative/desative e arraste para reordenar as seções.</p>
          </div>

          <div id="sectionsList" style="display:flex; flex-direction:column; gap:0.5rem;">
            ${ordered.map((sec, idx) => {
        const active = activeSet.has(sec.id);
        return `
                <div class="sec-drag-item" draggable="true" data-sec-id="${sec.id}" data-sec-idx="${idx}"
                  style="display:flex; align-items:center; gap:0.625rem; background:${active ? '#1f2937' : '#161e2a'}; padding:0.625rem 0.875rem; border-radius:0.5rem; border:1px solid ${active ? '#374151' : '#1f2937'}; transition:all 0.15s; user-select:none; min-width:0; overflow:hidden;">
                  <span style="cursor:grab; color:#4b5563; font-size:1rem; flex-shrink:0;">⠿</span>
                  <input type="checkbox" data-sec-check="${sec.id}" ${active ? 'checked' : ''} style="width:14px; height:14px; cursor:pointer; flex-shrink:0;" onchange="toggleSection('${sec.id}')">
                  <span style="flex:1; min-width:0; color:${active ? '#f3f4f6' : '#6b7280'}; font-weight:500; font-size:0.8125rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sec.label}</span>
                  <div style="display:flex; gap:0.25rem; flex-shrink:0;">
                    <button onclick="moveSection(${idx}, -1)" style="background:#374151; border:none; color:#9ca3af; width:1.5rem; height:1.5rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem;" ${idx === 0 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>▲</button>
                    <button onclick="moveSection(${idx}, 1)" style="background:#374151; border:none; color:#9ca3af; width:1.5rem; height:1.5rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem;" ${idx === ordered.length - 1 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>▼</button>
                  </div>
                </div>
              `;
      }).join('')}
          </div>

          <div style="display:flex; gap:0.75rem; margin-top:1.25rem;">
            <button id="saveSectionsBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; flex:1;">Salvar</button>
            <button id="restoreSectionsBtn" style="background:transparent; color:#9ca3af; padding:0.75rem 1rem; border:1px solid #374151; border-radius:0.375rem; font-weight:500; cursor:pointer; font-size:0.8125rem;">Restaurar</button>
          </div>
        </div>
      `;

      // Botões mover
      window.moveSection = (idx, dir) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= ordered.length) return;
        [ordered[idx], ordered[newIdx]] = [ordered[newIdx], ordered[idx]];
        renderList();
      };

      // Toggle ativo
      window.toggleSection = (id) => {
        if (activeSet.has(id)) activeSet.delete(id);
        else activeSet.add(id);
        renderList();
      };

      // Drag & drop com indicador visual
      let dragIdx = null;
      secoesContainer.querySelectorAll('.sec-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragIdx = parseInt(item.dataset.secIdx);
          item.style.opacity = '0.4';
          item.style.transform = 'scale(0.98)';
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => { 
          item.style.opacity = '1'; 
          item.style.transform = '';
          secoesContainer.querySelectorAll('.sec-drag-item').forEach(el => el.style.borderTop = '');
        });
        item.addEventListener('dragover', (e) => { 
          e.preventDefault(); 
          e.dataTransfer.dropEffect = 'move';
          // Indicador visual de drop
          secoesContainer.querySelectorAll('.sec-drag-item').forEach(el => el.style.borderTop = '');
          item.style.borderTop = '2px solid var(--accent, #2f81f7)';
        });
        item.addEventListener('dragleave', () => {
          item.style.borderTop = '';
        });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          item.style.borderTop = '';
          const targetIdx = parseInt(item.dataset.secIdx);
          if (dragIdx === null || dragIdx === targetIdx) return;
          const moved = ordered.splice(dragIdx, 1)[0];
          ordered.splice(targetIdx, 0, moved);
          dragIdx = null;
          renderList();
        });
      });

      // Salvar
      secoesContainer.querySelector('#saveSectionsBtn').onclick = async (e) => {
        await withBtnLoading(e.currentTarget, async () => {
          const selected = ordered.filter(s => activeSet.has(s.id)).map(s => s.id);
          await apiPut('/api/site/admin/config', { siteSections: selected });
          window.showToast?.('Seções salvas!', 'success');
          liveRefresh({ siteSections: selected });
        });
      };

      // Restaurar
      secoesContainer.querySelector('#restoreSectionsBtn').onclick = async () => {
        const ok = await window.showConfirm?.('Deseja restaurar a ordem padrão das seções?', {
          title: 'Restaurar Padrão',
          confirmText: 'Restaurar',
          danger: true,
          desc: 'Isso redefinirá apenas a ordem e visibilidade. Nenhum conteúdo será apagado.'
        });
        if (!ok) return;

        const DEFAULTS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];
        activeSet = new Set(DEFAULTS);
        ordered = [
          ...DEFAULTS.map(id => allSectionDefs.find(s => s.id === id)).filter(Boolean),
          ...allSectionDefs.filter(s => !DEFAULTS.includes(s.id))
        ];
        renderList();
        try {
          await apiPut('/api/site/admin/config', { siteSections: DEFAULTS });
          configData.siteSections = [...DEFAULTS];
          liveRefresh({ siteSections: DEFAULTS });
          window.showToast?.('Padrão restaurado!', 'success');
        } catch (err) {
          window.showToast?.('Erro ao salvar. Tente novamente.', 'error');
        }
      };
    };

    renderList();
  };

  // --- SERVIÇOS ---
  const renderServicos = () => {
    const servicosContainer = container.querySelector('#config-servicos');
    const servicos = configData.siteContent?.servicos || [];

    const renderList = () => {
      const list = servicos.map((srv, idx) => `
        <div style="background:var(--bg-surface); padding:1rem; border-radius:0.5rem; border:1px solid var(--border);">
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <div style="display:flex; gap:0.5rem; align-items:flex-end;">
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Título</label>
                <input type="text" id="srv-title-${idx}" class="input" value="${srv.title || ''}" data-srv-title="${idx}">
              </div>
              <button onclick="deleteServico(${idx})" class="btn btn-ghost" style="color:var(--red);" title="Remover">🗑️</button>
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Descrição</label>
              <textarea rows="2" id="srv-desc-${idx}" class="input" data-srv-desc="${idx}">${srv.description || ''}</textarea>
            </div>
            <div style="display:flex; gap:0.75rem;">
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Ícone (Emoji ou nome do Lucide)</label>
                <input type="text" id="srv-icon-${idx}" class="input" value="${srv.icon || '📸'}" data-srv-icon="${idx}" placeholder="Ex: camera, gem, baby, heart ou 📸">
              </div>
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Preço (opcional)</label>
                <input type="text" id="srv-price-${idx}" class="input" value="${srv.price || ''}" data-srv-price="${idx}" placeholder="R$ 500">
              </div>
            </div>
          </div>
        </div>
      `).join('');

      servicosContainer.innerHTML = `
        <div style="max-width:700px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <div>
              <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6;">Serviços</h3>
              <p style="color:#9ca3af; font-size:0.875rem;">Adicione os serviços que você oferece</p>
            </div>
            <button id="addServicoBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">+ Adicionar</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
            ${list || '<p style="color:#9ca3af; text-align:center; padding:2rem; background:#1f2937; border-radius:0.5rem;">Nenhum serviço adicionado</p>'}
          </div>

          <button id="saveServicosBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">Salvar Serviços</button>
        </div>
      `;

      servicosContainer.querySelector('#addServicoBtn').onclick = () => {
        servicos.push({ title: 'Novo Serviço', description: '', icon: '📸', price: '' });
        renderList(); // re-render para gerar novos IDs
      };

      window.deleteServico = async (idx) => {
        const ok = await window.showConfirm?.('Remover este serviço?', { confirmText: 'Remover', danger: true });
        if (!ok) return;
        servicos.splice(idx, 1);
        renderList();
      };

      // Setup dirty tracking após renderizar inputs
      captureOriginalValues('config-servicos', servicosContainer);
      setupDirtyTracking('config-servicos', 'Serviços', servicosContainer);

      const saveBtn = servicosContainer.querySelector('#saveServicosBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const updated = [];
          servicos.forEach((_, idx) => {
            updated.push({
              title: servicosContainer.querySelector(`[data-srv-title="${idx}"]`)?.value || '',
              description: servicosContainer.querySelector(`[data-srv-desc="${idx}"]`)?.value || '',
              icon: servicosContainer.querySelector(`[data-srv-icon="${idx}"]`)?.value || '📸',
              price: servicosContainer.querySelector(`[data-srv-price="${idx}"]`)?.value || ''
            });
          });
          await apiPut('/api/site/admin/config', { siteContent: { ...siteContent, servicos: updated } });
          clearDirty();
          // Recapturar valores originais após salvar
          captureOriginalValues('config-servicos', servicosContainer);
          window.showToast?.('Serviços salvos!', 'success');
          liveRefresh({ siteContent: { servicos: updated } });
        };
      }
    };

    renderList();
  };

  // --- DEPOIMENTOS ---
  const renderDepoimentos = async () => {
    const depoContainer = container.querySelector('#config-depoimentos');
    const depoimentos = configData.siteContent?.depoimentos || [];

    // Carregar pendentes
    let pendentes = [];
    try {
      const resp = await apiGet('/api/site/admin/depoimentos-pendentes');
      pendentes = resp.pending || [];
    } catch (e) { }

    const renderPendentes = () => {
      if (pendentes.length === 0) return '';
      return `
        <div style="background:#1c2a1c; border:1px solid #166534; border-radius:0.5rem; padding:1rem; margin-bottom:1.5rem;">
          <h4 style="color:#34d399; font-size:0.875rem; font-weight:600; margin-bottom:0.75rem;">
            🔔 ${pendentes.length} depoimento${pendentes.length > 1 ? 's' : ''} aguardando aprovação
          </h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${pendentes.map(p => `
              <div style="background:#111827; padding:0.75rem; border-radius:0.375rem; border:1px solid #374151;">
                <div style="display:flex; justify-content:space-between; align-items:start; gap:0.5rem;">
                  <div style="flex:1;">
                    <p style="color:#f3f4f6; font-weight:600; margin:0 0 0.25rem;">${p.name}${p.email ? ` <span style="color:#6b7280;font-size:0.75rem;font-weight:400;">(${p.email})</span>` : ''}</p>
                    <p style="color:#d1d5db; font-size:0.875rem; margin:0 0 0.25rem;">"${p.text}"</p>
                    <p style="color:#9ca3af; font-size:0.75rem; margin:0;">⭐ ${p.rating}/5</p>
                  </div>
                  <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                    <button onclick="aprovarDepoimento('${p.id}')" style="background:#16a34a; color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer;">✓ Aprovar</button>
                    <button onclick="rejeitarDepoimento('${p.id}')" style="background:#dc2626; color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer;">✕ Rejeitar</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    window.aprovarDepoimento = async (id) => {
      try {
        await apiPost(`/api/site/admin/depoimentos-pendentes/${id}/aprovar`, {});
        pendentes = pendentes.filter(p => p.id !== id);
        const resp2 = await apiGet('/api/site/admin/config');
        configData.siteContent = resp2.siteContent || configData.siteContent;
        renderDepoimentos();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    window.rejeitarDepoimento = async (id) => {
      const ok = await window.showConfirm?.('Rejeitar e apagar este depoimento?', { confirmText: 'Rejeitar', danger: true });
      if (!ok) return;
      try {
        await apiDelete(`/api/site/admin/depoimentos-pendentes/${id}`);
        pendentes = pendentes.filter(p => p.id !== id);
        renderDepoimentos();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    const renderList = () => {
      const list = depoimentos.map((dep, idx) => `
        <div style="background:var(--bg-surface); padding:1rem; border-radius:0.5rem; border:1px solid var(--border);">
          <div style="display:flex; flex-direction:column; gap:0.75rem;">

            <!-- Nome + deletar -->
            <div style="display:flex; gap:0.5rem; align-items:flex-end;">
              <div class="input-group" style="flex:1; margin-bottom:0;">
                <label>Nome do Cliente</label>
                <input type="text" class="input" value="${dep.name || ''}" data-dep-name="${idx}">
              </div>
              <button onclick="deleteDepoimento(${idx})" class="btn btn-ghost" style="color:var(--red);" title="Remover">🗑️</button>
            </div>

            <!-- Texto -->
            <div class="input-group" style="margin-bottom:0;">
              <label>Depoimento</label>
              <textarea rows="3" class="input" data-dep-text="${idx}">${dep.text || ''}</textarea>
            </div>

            <!-- Foto + nota -->
            <div style="display:flex; gap:0.75rem; align-items:flex-end;">
              <!-- Preview da foto -->
              <div style="width:56px; height:56px; border-radius:50%; background:var(--bg-base); border:1px dashed var(--border); overflow:hidden; flex-shrink:0;">
                ${dep.photo ? `<img src="${resolveImagePath(dep.photo)}" style="width:100%; height:100%; object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.5rem;">👤</div>'}
              </div>
              <div class="input-group" style="margin-bottom:0;">
                <label>Foto do Cliente</label>
                <label class="btn btn-primary btn-sm" style="margin:0; cursor:pointer;">
                  Upload
                  <input type="file" accept="image/*" data-dep-photo-upload="${idx}" style="display:none;">
                </label>
                <input type="hidden" data-dep-photo="${idx}" value="${dep.photo || ''}">
              </div>
              <div class="input-group" style="margin-bottom:0;">
                <label>Nota (1-5)</label>
                <input type="number" class="input" min="1" max="5" value="${dep.rating || 5}" data-dep-rating="${idx}" style="width:70px;">
              </div>
            </div>

            <!-- Link social -->
            <div class="input-group" style="margin-bottom:0;">
              <label>Link Instagram ou Facebook (opcional)</label>
              <input type="text" class="input" value="${dep.socialLink || ''}" data-dep-social="${idx}" placeholder="https://instagram.com/cliente">
            </div>

          </div>
        </div>
      `).join('');

      depoContainer.innerHTML = `
        <div style="max-width:700px;">
          ${renderPendentes()}

          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <div>
              <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6;">Depoimentos Publicados</h3>
              <p style="color:#9ca3af; font-size:0.875rem;">Adicione ou gerencie depoimentos visíveis no site</p>
            </div>
            <button id="addDepoimentoBtn" style="background:#2563eb; color:white; padding:0.5rem 1rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">+ Adicionar</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
            ${list || '<p style="color:#9ca3af; text-align:center; padding:2rem; background:#1f2937; border-radius:0.5rem;">Nenhum depoimento adicionado</p>'}
          </div>

          <button id="saveDepoimentosBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">Salvar Depoimentos</button>
        </div>
      `;

      depoContainer.querySelector('#addDepoimentoBtn').onclick = () => {
        depoimentos.push({ name: 'Cliente', text: '', photo: '', rating: 5, socialLink: '' });
        renderList();
      };

      // Upload de foto por depoimento
      depoContainer.querySelectorAll('[data-dep-photo-upload]').forEach(input => {
        input.onchange = async (e) => {
          const idx = parseInt(input.dataset.depPhotoUpload);
          const file = e.target.files[0];
          if (!file) return;
          try {
            const result = await uploadImage(file, appState.authToken);
            depoimentos[idx].photo = result.url;
            renderList();
          } catch (err) {
            window.showToast?.('Erro: ' + err.message, 'error');
          }
        };
      });

      window.deleteDepoimento = async (idx) => {
        const ok = await window.showConfirm?.('Remover este depoimento?', { confirmText: 'Remover', danger: true });
        if (!ok) return;
        depoimentos.splice(idx, 1);
        renderList();
      };

      depoContainer.querySelector('#saveDepoimentosBtn').onclick = async () => {
        const updated = [];
        depoimentos.forEach((dep, idx) => {
          updated.push({
            name: depoContainer.querySelector(`[data-dep-name="${idx}"]`)?.value || '',
            text: depoContainer.querySelector(`[data-dep-text="${idx}"]`)?.value || '',
            photo: depoContainer.querySelector(`[data-dep-photo="${idx}"]`)?.value || dep.photo || '',
            rating: parseInt(depoContainer.querySelector(`[data-dep-rating="${idx}"]`)?.value || 5),
            socialLink: depoContainer.querySelector(`[data-dep-social="${idx}"]`)?.value || ''
          });
        });
        await apiPut('/api/site/admin/config', { siteContent: { depoimentos: updated } });
        clearDirty();
        captureOriginalValues('config-depoimentos', depoContainer);
        window.showToast?.('Depoimentos salvos!', 'success');
        liveRefresh({ siteContent: { depoimentos: updated } });
      };

      // Capturar valores originais e setup dirty tracking
      captureOriginalValues('config-depoimentos', depoContainer);
      setupDirtyTracking('config-depoimentos', 'Depoimentos', depoContainer);
    };

    renderList();
  };

  // --- PERSONALIZAR ---
  const renderPersonalizar = () => {
    const personalizarContainer = container.querySelector('#config-personalizar');
    const style = configData.siteStyle || {};

    const FONTS = [
      { value: '', label: 'Padrão do Tema' },
      { value: "'Inter', sans-serif", label: 'Inter (Moderno)' },
      { value: "'Poppins', sans-serif", label: 'Poppins (Elegante)' },
      { value: "'Playfair Display', serif", label: 'Playfair Display (Clássico)' },
      { value: "'Lato', sans-serif", label: 'Lato (Clean)' },
      { value: "'Montserrat', sans-serif", label: 'Montserrat (Bold)' },
      { value: "'Raleway', sans-serif", label: 'Raleway (Sofisticado)' },
      { value: "Georgia, serif", label: 'Georgia (Serif)' },
    ];

    personalizarContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2rem; max-width:720px;">

        <!-- Estilo Global -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem;">
          <h3 style="font-size:1rem; font-weight:700; color:var(--purple); margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem;">
            ✦ Estilo Visual do Site
          </h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem;">
            <div>
              <label style="display:block; color:var(--text-secondary); font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor Principal (Accent)</label>
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="color" id="styleAccentColor" value="${style.accentColor || '#c9a96e'}" style="width:3rem; height:2.5rem; border:1px solid var(--border); border-radius:0.5rem; background:none; cursor:pointer;">
                <span id="styleAccentColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.accentColor || '#c9a96e'}</span>
              </div>
            </div>
            <div>
              <label style="display:block; color:var(--text-secondary); font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor de Fundo</label>
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="color" id="styleBgColor" value="${style.bgColor || '#fafafa'}" style="width:3rem; height:2.5rem; border:1px solid var(--border); border-radius:0.5rem; background:none; cursor:pointer;">
                <span id="styleBgColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.bgColor || '#fafafa'}</span>
              </div>
            </div>
            <div>
              <label style="display:block; color:var(--text-secondary); font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor do Texto</label>
              <div style="display:flex; gap:0.5rem; align-items:center;">
                <input type="color" id="styleTextColor" value="${style.textColor || '#111827'}" style="width:3rem; height:2.5rem; border:1px solid var(--border); border-radius:0.5rem; background:none; cursor:pointer;">
                <span id="styleTextColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.textColor || '#111827'}</span>
              </div>
            </div>
            <div>
              <label style="display:block; color:var(--text-secondary); font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Fonte do Site</label>
              <select id="styleFontFamily" class="select">
                ${FONTS.map(f => `<option value="${f.value}" ${style.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <!-- Preview da paleta -->
          <div id="stylePalettePreview" style="border-radius:0.5rem; overflow:hidden; margin-bottom:1.25rem;">
            <div style="background:${style.accentColor || '#c9a96e'}; padding:0.75rem 1rem;">
              <span style="color:#fff; font-weight:700; font-size:0.9rem;">Cor Principal</span>
            </div>
            <div style="background:${style.bgColor || '#fafafa'}; padding:0.75rem 1rem; border:1px solid var(--border);">
              <span style="color:${style.textColor || '#111827'}; font-size:0.9rem;">Texto do site com sua paleta de cores</span>
            </div>
          </div>
          <button id="saveStyleBtn" style="background:var(--purple); color:#fff; padding:0.625rem 1.5rem; border:none; border-radius:0.375rem; font-weight:700; cursor:pointer;">Salvar Estilo</button>
          <button id="resetStyleBtn" style="background:none; border:1px solid var(--border); color:var(--text-secondary); padding:0.625rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-left:0.5rem;">Resetar Padrão</button>
        </div>
      </div>
    `;

    // Capturar snapshot original para dirty tracking
    captureOriginalValues('config-personalizar', personalizarContainer);
    setupDirtyTracking('config-personalizar', 'Personalizar', personalizarContainer);

    // Live preview da paleta
    const accentInput = personalizarContainer.querySelector('#styleAccentColor');
    const bgInput = personalizarContainer.querySelector('#styleBgColor');
    const textInput = personalizarContainer.querySelector('#styleTextColor');

    function updatePalettePreview() {
      const preview = personalizarContainer.querySelector('#stylePalettePreview');
      if (preview) {
        preview.innerHTML = `
          <div style="background:${accentInput.value}; padding:0.75rem 1rem; border-radius:0.5rem 0.5rem 0 0;">
            <span style="color:#fff; font-weight:700; font-size:0.9rem;">Cor Principal</span>
          </div>
          <div style="background:${bgInput.value}; padding:0.75rem 1rem; border:1px solid var(--border); border-radius:0 0 0.5rem 0.5rem;">
            <span style="color:${textInput.value}; font-size:0.9rem;">Texto do site com sua paleta de cores</span>
          </div>
        `;
      }
      personalizarContainer.querySelector('#styleAccentColorText').textContent = accentInput.value;
      personalizarContainer.querySelector('#styleBgColorText').textContent = bgInput.value;
      personalizarContainer.querySelector('#styleTextColorText').textContent = textInput.value;
    }

    if (accentInput) accentInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); };
    if (bgInput) bgInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); };
    if (textInput) textInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); };
    const fontFamilyInput = personalizarContainer.querySelector('#styleFontFamily');
    if (fontFamilyInput) fontFamilyInput.onchange = () => { window._meuSitePostPreview?.(); };

    // Salvar estilo
    const saveStyleBtn = personalizarContainer.querySelector('#saveStyleBtn');
    if (saveStyleBtn) {
      saveStyleBtn.onclick = async () => {
        const newStyle = {
          accentColor: accentInput?.value || '',
          bgColor: bgInput?.value || '',
          textColor: textInput?.value || '',
          fontFamily: personalizarContainer.querySelector('#styleFontFamily')?.value || ''
        };
        await apiPut('/api/site/admin/config', { siteStyle: newStyle });
        clearDirty();
        captureOriginalValues('config-personalizar', personalizarContainer);
        saveStyleBtn.textContent = '✓ Salvo!';
        setTimeout(() => { saveStyleBtn.textContent = 'Salvar Estilo'; }, 2000);
        liveRefresh({ siteStyle: newStyle });
      };
    }

    // Resetar estilo
    const resetStyleBtn = personalizarContainer.querySelector('#resetStyleBtn');
    if (resetStyleBtn) {
      resetStyleBtn.onclick = async () => {
        const ok = await window.showConfirm?.('Resetar para o estilo padrão do tema?', { confirmText: 'Resetar', danger: true });
        if (!ok) return;
        await apiPut('/api/site/admin/config', { siteStyle: {} });
        configData.siteStyle = {};
        renderPersonalizar();
        liveRefresh({ siteStyle: {} });
      };
    }
  };

  // --- CONTATO ---
  const renderContato = () => {
    const contatoContainer = container.querySelector('#config-contato');
    const contato = configData.siteContent?.contato || {};

    contatoContainer.innerHTML = `
      <div style="max-width:600px;">
        <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:1.5rem;">Seção de Contato</h3>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Título</label>
            <input type="text" id="contatoTitle" class="input" value="${contato.title || 'Entre em Contato'}">
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Texto</label>
            <textarea id="contatoText" class="input" rows="3">${contato.text || 'Gostou do meu trabalho? Entre em contato para agendar sua sessão!'}</textarea>
          </div>

          <div class="input-group" style="margin-bottom:0;">
            <label>Endereço (opcional)</label>
            <input type="text" id="contatoAddress" class="input" value="${contato.address || ''}" placeholder="Rua Exemplo, 123 - São Paulo/SP">
          </div>

          <button id="saveContatoBtn" style="background:var(--green); color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:0.5rem;">Salvar Contato</button>
        </div>
      </div>
    `;

    // Capturar valores originais e setup dirty tracking
    captureOriginalValues('config-contato', contatoContainer);
    setupDirtyTracking('config-contato', 'Contato', contatoContainer);

    // Preview em tempo real
    contatoContainer.querySelector('#contatoTitle').oninput = () => { window._meuSitePostPreview?.(); };
    contatoContainer.querySelector('#contatoText').oninput = () => { window._meuSitePostPreview?.(); };
    contatoContainer.querySelector('#contatoAddress').oninput = () => { window._meuSitePostPreview?.(); };

    contatoContainer.querySelector('#saveContatoBtn').onclick = async () => {
      const newContato = {
        title: contatoContainer.querySelector('#contatoTitle').value,
        text: contatoContainer.querySelector('#contatoText').value,
        address: contatoContainer.querySelector('#contatoAddress').value
      };
      await apiPut('/api/site/admin/config', { siteContent: { contato: newContato } });
      clearDirty();
      // Recapturar valores originais após salvar
      captureOriginalValues('config-contato', contatoContainer);
      window.showToast?.('Contato salvo!', 'success');
      liveRefresh({ siteContent: { contato: newContato } });
    };
  };

  // --- RODAPÉ ---
  const renderRodape = () => {
    const rodapeContainer = container.querySelector('#config-rodape');
    const f = configData.siteContent?.footer || {};
    // Cópia local: re-renderizações parciais (adicionar/remover link) NÃO podem
    // re-ler do configData, senão descartam edições ainda não salvas.
    let _rodape = {
      copyright: f.copyright || '',
      socialMedia: { ...(f.socialMedia || {}) },
      quickLinks: (f.quickLinks || []).map(l => ({ ...l })),
    };

    // Captura o que está digitado nos inputs antes de qualquer re-render
    const lerInputs = () => {
      const el = (sel) => rodapeContainer.querySelector(sel);
      if (el('#rodapeCopyright')) _rodape.copyright = el('#rodapeCopyright').value;
      [['#socialInstagram', 'instagram'], ['#socialFacebook', 'facebook'], ['#socialLinkedin', 'linkedin'],
        ['#socialTiktok', 'tiktok'], ['#socialYoutube', 'youtube'], ['#socialEmail', 'email']].forEach(([sel, key]) => {
        if (el(sel)) _rodape.socialMedia[key] = el(sel).value;
      });
      const links = [];
      rodapeContainer.querySelectorAll('[data-link-label]').forEach((input, idx) => {
        links.push({ label: input.value, url: el(`[data-link-url="${idx}"]`)?.value || '' });
      });
      _rodape.quickLinks = links;
    };

    const saveRodape = async (silent = false) => {
      await apiPut('/api/site/admin/config', { siteContent: { footer: _rodape } });
      configData.siteContent = configData.siteContent || {};
      configData.siteContent.footer = { ..._rodape };
      if (!silent) window.showToast?.('Rodapé salvo!', 'success');
      liveRefresh({ siteContent: { footer: _rodape } });
    };

    const buildLinksHtml = (quickLinks) => quickLinks.map((link, idx) => `
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <input type="text" class="input" data-link-label="${idx}" value="${link.label || ''}" placeholder="Texto do link">
        <input type="text" class="input" data-link-url="${idx}" value="${link.url || ''}" placeholder="URL (ex: #portfolio)">
        <button data-remove-link="${idx}" class="btn btn-ghost" style="color:var(--red);" title="Remover">🗑️</button>
      </div>
    `).join('');

    const renderList = () => {
    rodapeContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.5rem; max-width:640px;">
        <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-elevated); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Copyright</h3>
          <div class="input-group" style="margin-bottom:0;">
            <input type="text" id="rodapeCopyright" class="input" value="${_rodape.copyright}" placeholder="Ex: © 2026 Studio. Todos os direitos reservados.">
          </div>
        </div>

        <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-elevated); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
          <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Redes Sociais</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div class="input-group" style="margin-bottom:0;">
              <label>Instagram</label>
              <input type="text" id="socialInstagram" class="input" value="${_rodape.socialMedia.instagram || ''}" placeholder="https://instagram.com/...">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Facebook</label>
              <input type="text" id="socialFacebook" class="input" value="${_rodape.socialMedia.facebook || ''}" placeholder="https://facebook.com/...">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>LinkedIn</label>
              <input type="text" id="socialLinkedin" class="input" value="${_rodape.socialMedia.linkedin || ''}" placeholder="https://linkedin.com/...">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>TikTok</label>
              <input type="text" id="socialTiktok" class="input" value="${_rodape.socialMedia.tiktok || ''}" placeholder="https://tiktok.com/...">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>YouTube</label>
              <input type="text" id="socialYoutube" class="input" value="${_rodape.socialMedia.youtube || ''}" placeholder="https://youtube.com/...">
            </div>
            <div class="input-group" style="margin-bottom:0;">
              <label>Email</label>
              <input type="email" id="socialEmail" class="input" value="${_rodape.socialMedia.email || ''}" placeholder="contato@exemplo.com">
            </div>
          </div>
        </div>

        <div style="border:1px solid var(--border); border-radius:0.75rem; background:var(--bg-elevated); padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1rem; font-weight:600; color:var(--text-secondary);">Links Úteis</h3>
            <button id="addRodapeLinkBtn" style="background:var(--accent); color:white; padding:0.25rem 0.75rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.75rem; font-weight:500;">+ Adicionar</button>
          </div>
          <div id="rodapeLinksList" style="display:flex; flex-direction:column; gap:0.5rem;">
            ${buildLinksHtml(_rodape.quickLinks) || '<p style="color:var(--text-muted); font-size:0.875rem;">Nenhum link adicionado</p>'}
          </div>
        </div>

        <button id="saveRodapeBtn" style="background:var(--accent); color:white; padding:0.5rem 1.5rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">Salvar Rodapé</button>
      </div>
    `;

    rodapeContainer.querySelector('#addRodapeLinkBtn').onclick = () => {
      lerInputs(); // preserva o que já foi digitado antes do re-render
      _rodape.quickLinks.push({ label: '', url: '' });
      renderList();
    };

    rodapeContainer.querySelectorAll('[data-remove-link]').forEach(btn => {
      btn.onclick = async () => {
        const idx = parseInt(btn.dataset.removeLink);
        const ok = await window.showConfirm?.('Remover este link?', { danger: true });
        if (!ok) return;
        lerInputs();
        _rodape.quickLinks.splice(idx, 1);
        await saveRodape(true);
        renderList();
      };
    });

    rodapeContainer.querySelector('#saveRodapeBtn').onclick = async () => {
      lerInputs();
      await saveRodape();
    };
    };

    renderList();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Editor do Template Padrão da Plataforma
// Visível apenas para contato@cliquezoom.com.br
// ─────────────────────────────────────────────────────────────────────────────
async function _renderDefaultTemplateAdmin(el, rootContainer) {
  el.innerHTML = `<div style="color:#9ca3af; font-size:0.8rem; padding:0.5rem;">Carregando template...</div>`;

  let tmpl = {};
  try {
    const res = await apiGet('/api/site/default-template');
    tmpl = res.template || {};
  } catch (e) {
    el.innerHTML = `<div style="color:#f85149;">Erro ao carregar: ${e.message}</div>`;
    return;
  }

  const cfg = tmpl.siteConfig || {};
  const cnt = tmpl.siteContent || {};
  const servicos = cnt.servicos || [];
  const faq = cnt.faq || [];
  const sections = tmpl.siteSections || [];
  let _dtHeroImageUrl = cfg.heroImage || '';

  const cfgThemeBgs = tmpl.siteStyle?.themeBackgrounds || {};
  const _themeBgUrls = {
    elegante: cfgThemeBgs.elegante || '',
    minimalista: cfgThemeBgs.minimalista || '',
    moderno: cfgThemeBgs.moderno || '',
    escuro: cfgThemeBgs.escuro || '',
    galeria: cfgThemeBgs.galeria || ''
  };

  const SECTION_OPTIONS = ['hero','portfolio','albuns','servicos','estudio','depoimentos','contato','sobre','faq'];

  const _svcItem = (s, i) => `
    <div class="dt-svc-item" data-idx="${i}" style="background:rgba(255,255,255,0.04); border:1px solid #374151; border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-svc-icon" value="${s.icon||'📸'}" style="width:2.5rem; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem; font-size:1rem; text-align:center;">
        <input class="dt-svc-title" placeholder="Título" value="${s.title||''}" style="flex:1; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button class="dt-svc-remove" style="background:none; border:none; color:#f85149; cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <input class="dt-svc-desc" placeholder="Descrição" value="${s.description||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
      <input class="dt-svc-price" placeholder="Preço (ex: A partir de R$ 350)" value="${s.price||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
    </div>`;

  const _faqItem = (f, i) => `
    <div class="dt-faq-item" data-idx="${i}" style="background:rgba(255,255,255,0.04); border:1px solid #374151; border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-faq-q" placeholder="Pergunta" value="${f.question||''}" style="flex:1; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button class="dt-faq-remove" style="background:none; border:none; color:#f85149; cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <textarea class="dt-faq-a" placeholder="Resposta" rows="2" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem; resize:vertical;">${f.answer||''}</textarea>
    </div>`;

  el.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem; padding-bottom:2rem;">
      <div style="background:#f59e0b22; border:1px solid #f59e0b55; border-radius:0.375rem; padding:0.625rem 0.75rem;">
        <p style="color:#f59e0b; font-size:0.8rem; margin:0; font-weight:600;">⚙ Conteúdo Padrão da Plataforma</p>
        <p style="color:#9ca3af; font-size:0.75rem; margin:0.25rem 0 0;">Este conteúdo é aplicado automaticamente em novos cadastros e pode ser restaurado por qualquer fotógrafo.</p>
      </div>

      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título do Hero</label>
        <input id="dt-heroTitle" value="${cfg.heroTitle||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem;">
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Subtítulo do Hero</label>
        <input id="dt-heroSubtitle" value="${cfg.heroSubtitle||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem;">
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Imagem de Fundo do Hero</label>
        <div id="dt-heroImgPreview" style="width:100%; height:7rem; background:#111827; border:1px solid #374151; border-radius:0.375rem; margin-bottom:0.375rem; overflow:hidden; display:flex; align-items:center; justify-content:center;">
          ${cfg.heroImage
            ? `<img src="${cfg.heroImage}" style="width:100%; height:100%; object-fit:cover;">`
            : `<span style="color:#4b5563; font-size:0.8rem;">Sem imagem</span>`}
        </div>
        <div id="dt-heroBgProgress" style="margin-bottom:0.375rem;"></div>
        <div style="display:flex; gap:0.5rem;">
          <label style="cursor:pointer; background:#1f2937; border:1px solid #374151; color:#d1d5db; padding:0.3rem 0.75rem; border-radius:0.25rem; font-size:0.8rem; display:inline-flex; align-items:center; gap:0.3rem;">
            <span class="material-symbols-outlined" style="font-size:1rem;">upload</span>Enviar Imagem
            <input type="file" id="dt-heroBgFile" accept="image/*" style="display:none;">
          </label>
          <button id="dt-heroBgRemove" style="background:none; border:1px solid #374151; color:#f85149; padding:0.3rem 0.75rem; border-radius:0.25rem; font-size:0.8rem; cursor:pointer;">Remover</button>
        </div>
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título — Sobre</label>
        <input id="dt-sobreTitle" value="${cnt.sobre?.title||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem;">
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Texto — Sobre</label>
        <textarea id="dt-sobreText" rows="3" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem; resize:vertical;">${cnt.sobre?.text||''}</textarea>
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título — Contato</label>
        <input id="dt-contatoTitle" value="${cnt.contato?.title||''}" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem;">
      </div>
      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Texto — Contato</label>
        <textarea id="dt-contatoText" rows="2" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem; resize:vertical;">${cnt.contato?.text||''}</textarea>
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <label style="color:#9ca3af; font-size:0.8rem;">Serviços de Exemplo</label>
          <button id="dt-addSvc" style="background:none; border:1px solid #374151; color:#d1d5db; padding:0.2rem 0.6rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem;">+ Adicionar</button>
        </div>
        <div id="dt-svcList">${servicos.map(_svcItem).join('')}</div>
      </div>

      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <label style="color:#9ca3af; font-size:0.8rem;">FAQ de Exemplo</label>
          <button id="dt-addFaq" style="background:none; border:1px solid #374151; color:#d1d5db; padding:0.2rem 0.6rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem;">+ Adicionar</button>
        </div>
        <div id="dt-faqList">${faq.map(_faqItem).join('')}</div>
      </div>

      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.5rem;">Seções Ativas por Default</label>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          ${SECTION_OPTIONS.map(s => `
            <label style="display:flex; align-items:center; gap:0.3rem; cursor:pointer; background:rgba(255,255,255,0.04); border:1px solid #374151; border-radius:0.375rem; padding:0.25rem 0.6rem;">
              <input type="checkbox" class="dt-section-chk" value="${s}" ${sections.includes(s)?'checked':''}>
              <span style="color:#d1d5db; font-size:0.8rem;">${s}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Imagens de Fundo dos Temas -->
      <div style="border-top:1px solid #374151; padding-top:1.25rem;">
        <label style="color:#9ca3af; font-size:0.85rem; display:block; margin-bottom:0.375rem; font-weight:600;">Imagens de Fundo dos Temas (Galeria Geral)</label>
        <p style="color:#6b7280; font-size:0.75rem; margin:0 0 1rem;">Envie as imagens de fundo que aparecerão nos cards de seleção de tema para os fotógrafos.</p>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.25rem;">
          ${['elegante', 'minimalista', 'moderno', 'escuro', 'galeria'].map(themeId => {
            const themeName = themeId.charAt(0).toUpperCase() + themeId.slice(1);
            const currentImg = _themeBgUrls[themeId];
            const hasImage = !!currentImg;
            
            const themeColors = {
              elegante: ['#c9a962', '#2c2c2c', '#f5f5f5'],
              minimalista: ['#000000', '#666666', '#ffffff'],
              moderno: ['#3b82f6', '#667eea', '#f8fafc'],
              escuro: ['#ff9500', '#0a0a0a', '#1a1a1a'],
              galeria: ['#8b7355', '#2c2c2c', '#fafafa']
            }[themeId];

            return `
              <div style="background:#1b1f24; border:1px solid #30363d; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
                <!-- nome -->
                <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem;">
                  <strong style="color:#f1f5f9; font-size:0.9rem;">${themeName}</strong>
                </div>

                <!-- Preview real do Card -->
                <div id="dt-themeBgPreview-${themeId}" class="template-card builder-theme-card" 
                     style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 0.75rem; padding: 1.25rem; border-radius: var(--radius-lg, 0.5rem); min-height: 140px; background-size: cover; background-position: center; border: 1px solid rgba(139, 144, 159, 0.15); position: relative; overflow: hidden; ${currentImg ? `background-image: linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url('${currentImg}');` : 'background: rgba(49, 53, 60, 0.3);'}">
                  
                  <!-- Check do tema ativo -->
                  <div style="position: absolute; top: 0.75rem; right: 0.75rem; background: rgba(63, 185, 80, 0.15); border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(63, 185, 80, 0.25);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green,#3fb950)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>

                  <!-- Nome do Tema -->
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;">
                    <h4 style="color:var(--text-primary,#e6edf3); font-weight:700; font-size:0.9375rem; margin:0;">${themeName}</h4>
                  </div>

                  <!-- Cores -->
                  <div style="display:flex; gap:0.375rem; justify-content: center;">
                    ${themeColors.map(c => `<div style="width:0.875rem; height:0.875rem; background:${c}; border-radius:50%; border:1px solid rgba(255,255,255,0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.25);"></div>`).join('')}
                  </div>

                  <!-- Botão Visualizar fake (estático para o preview) -->
                  <div style="margin-top: 0.25rem;">
                    <div class="header-expand-btn" style="text-decoration: none; border-radius: 9999px !important; box-sizing: border-box; display: inline-flex !important; pointer-events: none; opacity: 0.85;">
                      <span class="header-expand-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </span>
                      <span class="header-expand-label" style="font-weight: 600; padding-left: 2px;">Visualizar</span>
                    </div>
                  </div>
                </div>

                <!-- Progresso de Upload -->
                <div id="dt-themeBgProgress-${themeId}" style="margin-top: -0.25rem;"></div>

                <!-- Ações -->
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-top:0.25rem;" class="dt-theme-actions">
                  <label class="header-expand-btn" title="Enviar Imagem" style="background:#1e3a5f; color:#93c5fd; border:1px solid #2563eb; border-radius:0.375rem !important; padding:0.4rem 0.9rem !important; height:auto !important; min-width:0 !important; font-size:0.78rem; cursor:pointer; font-weight:600; display:inline-flex; align-items:center; gap:0.3rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>${hasImage ? 'Trocar imagem' : 'Upload imagem'}</span>
                    <input type="file" class="dt-themeBgFile" data-theme="${themeId}" accept="image/*" style="display:none;">
                  </label>
                  ${hasImage ? `
                    <button type="button" class="dt-themeBgRemove" data-theme="${themeId}" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer; font-weight:600; transition:background 0.15s;" onmouseenter="this.style.background='#681010'" onmouseleave="this.style.background='#450a0a'">
                      Remover
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div>
        <label style="color:#9ca3af; font-size:0.8rem; display:block; margin-bottom:0.375rem;">Chave de Administrador</label>
        <input id="dt-adminKey" type="password" placeholder="Chave secreta da plataforma" style="width:100%; box-sizing:border-box; background:#1f2937; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; padding:0.4rem 0.6rem; font-size:0.875rem;">
      </div>

      <button id="dt-saveBtn" style="background:#f59e0b; color:#000; font-weight:700; border:none; padding:0.6rem 1.25rem; border-radius:0.375rem; cursor:pointer; font-size:0.9rem; align-self:flex-start;">Salvar como Padrão</button>
    </div>`;

  // Adicionar serviço
  el.querySelector('#dt-addSvc').onclick = () => {
    const list = el.querySelector('#dt-svcList');
    const idx = list.querySelectorAll('.dt-svc-item').length;
    list.insertAdjacentHTML('beforeend', _svcItem({ icon:'📸', title:'', description:'', price:'' }, idx));
    _bindRemove(list, '.dt-svc-remove', '.dt-svc-item');
  };

  // Adicionar FAQ
  el.querySelector('#dt-addFaq').onclick = () => {
    const list = el.querySelector('#dt-faqList');
    const idx = list.querySelectorAll('.dt-faq-item').length;
    list.insertAdjacentHTML('beforeend', _faqItem({ question:'', answer:'' }, idx));
    _bindRemove(list, '.dt-faq-remove', '.dt-faq-item');
  };

  function _bindRemove(list, btnSel, itemSel) {
    list.querySelectorAll(btnSel).forEach(btn => {
      btn.onclick = () => btn.closest(itemSel).remove();
    });
  }

  _bindRemove(el.querySelector('#dt-svcList'), '.dt-svc-remove', '.dt-svc-item');
  _bindRemove(el.querySelector('#dt-faqList'), '.dt-faq-remove', '.dt-faq-item');

  // Upload imagem hero
  el.querySelector('#dt-heroBgFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (p) => showUploadProgress('dt-heroBgProgress', p));
      _dtHeroImageUrl = result.url;
      el.querySelector('#dt-heroImgPreview').innerHTML = `<img src="${result.url}" style="width:100%; height:100%; object-fit:cover;">`;
    } catch (err) {
      window.showToast?.('Erro ao enviar imagem: ' + err.message, 'error');
    }
  };

  el.querySelector('#dt-heroBgRemove').onclick = () => {
    _dtHeroImageUrl = '';
    el.querySelector('#dt-heroImgPreview').innerHTML = `<span style="color:#4b5563; font-size:0.8rem;">Sem imagem</span>`;
  };

  // Lógica para atrelar evento ao botão Remover
  const _bindRemoveBtn = (btn) => {
    btn.onclick = () => {
      const themeId = btn.dataset.theme;
      _themeBgUrls[themeId] = '';
      
      // Reseta o preview do card para o estilo sólido
      const previewEl = el.querySelector(`#dt-themeBgPreview-${themeId}`);
      if (previewEl) {
        previewEl.style.backgroundImage = '';
        previewEl.style.background = 'rgba(49, 53, 60, 0.3)';
      }

      // Altera o texto de upload de volta
      const actionsContainer = btn.closest('.dt-theme-actions');
      const uploadLabelSpan = actionsContainer?.querySelector('label span');
      if (uploadLabelSpan) uploadLabelSpan.textContent = 'Upload imagem';

      // Remove o botão remover
      btn.remove();
    };
  };

  // Upload imagens de temas
  el.querySelectorAll('.dt-themeBgFile').forEach(input => {
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const themeId = input.dataset.theme;
      const progressContainer = el.querySelector(`#dt-themeBgProgress-${themeId}`);
      if (progressContainer) progressContainer.style.display = 'block';

      try {
        const result = await uploadImage(file, appState.authToken, (p) => showUploadProgress(`dt-themeBgProgress-${themeId}`, p));
        _themeBgUrls[themeId] = result.url;
        
        // Atualiza o preview real do card com overlay
        const previewEl = el.querySelector(`#dt-themeBgPreview-${themeId}`);
        if (previewEl) {
          previewEl.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.7)), url('${result.url}')`;
        }

        // Atualiza as ações: altera texto de upload e adiciona botão remover
        const actionsContainer = input.closest('.dt-theme-actions');
        const uploadLabelSpan = actionsContainer?.querySelector('label span');
        if (uploadLabelSpan) uploadLabelSpan.textContent = 'Trocar imagem';

        let removeBtn = actionsContainer?.querySelector('.dt-themeBgRemove');
        if (actionsContainer && !removeBtn) {
          const btnHtml = `
            <button type="button" class="dt-themeBgRemove" data-theme="${themeId}" style="background:#450a0a; color:#fca5a5; border:none; border-radius:0.375rem; padding:0.4rem 0.9rem; font-size:0.78rem; cursor:pointer; font-weight:600; transition:background 0.15s;" onmouseenter="this.style.background='#681010'" onmouseleave="this.style.background='#450a0a'">
              Remover
            </button>
          `;
          actionsContainer.insertAdjacentHTML('beforeend', btnHtml);
          _bindRemoveBtn(actionsContainer.querySelector('.dt-themeBgRemove'));
        }
      } catch (err) {
        window.showToast?.('Erro ao enviar imagem: ' + err.message, 'error');
      } finally {
        if (progressContainer) {
          setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
        }
        input.value = '';
      }
    };
  });

  // Bind inicial para os botões de remover existentes
  el.querySelectorAll('.dt-themeBgRemove').forEach(_bindRemoveBtn);

  // Salvar
  el.querySelector('#dt-saveBtn').onclick = async (e) => {
    const btn = e.currentTarget;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const svcItems = [...el.querySelectorAll('.dt-svc-item')].map((item, i) => ({
      id: `svc-${i+1}`,
      icon:        item.querySelector('.dt-svc-icon').value,
      title:       item.querySelector('.dt-svc-title').value,
      description: item.querySelector('.dt-svc-desc').value,
      price:       item.querySelector('.dt-svc-price').value
    }));

    const faqItems = [...el.querySelectorAll('.dt-faq-item')].map((item, i) => ({
      id: `faq-${i+1}`,
      question: item.querySelector('.dt-faq-q').value,
      answer:   item.querySelector('.dt-faq-a').value
    }));

    const checkedSections = [...el.querySelectorAll('.dt-section-chk:checked')].map(c => c.value);
    const adminKey = el.querySelector('#dt-adminKey').value.trim();
    if (!adminKey) { window.showToast?.('Insira a chave de administrador.', 'error'); btn.textContent = 'Salvar como Padrão'; btn.disabled = false; return; }

    try {
      await fetch('/api/site/default-template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          siteConfig: {
            heroTitle:    el.querySelector('#dt-heroTitle').value,
            heroSubtitle: el.querySelector('#dt-heroSubtitle').value,
            heroImage:    _dtHeroImageUrl
          },
          siteContent: {
            sobre:   { title: el.querySelector('#dt-sobreTitle').value, text: el.querySelector('#dt-sobreText').value },
            contato: { title: el.querySelector('#dt-contatoTitle').value, text: el.querySelector('#dt-contatoText').value },
            servicos: svcItems,
            faq: faqItems
          },
          siteStyle: {
            themeBackgrounds: _themeBgUrls
          },
          siteSections: checkedSections
        })
      }).then(async r => {
        if (!r.ok) throw new Error((await r.json()).error || r.statusText);
        window.showToast?.('Template padrão salvo!', 'success');
      });
    } catch (err) {
      window.showToast?.('Erro: ' + err.message, 'error');
    } finally {
      btn.textContent = 'Salvar como Padrão';
      btn.disabled = false;
    }
  };
}