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
        <div style="width:46px; height:100%; box-sizing:border-box; padding-bottom:8px; flex-shrink:0; display:flex; flex-direction:column; gap:4px; align-items:flex-start; border-right:1px solid var(--border,#30363d); padding:0 5px 8px 5px; overflow:visible; z-index:10;">
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
          <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem; flex-shrink:0;"></div>
          <button class="sub-tab-btn builder-nav-item" id="siteStatusToggleBtn" style="transition: color 0.15s;">
            <span class="material-symbols-outlined" id="siteStatusIcon" style="transition: color 0.15s;">visibility</span>
            <span class="builder-nav-label" id="siteStatusLabel">Ativar Site</span>
          </button>
          <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem; flex-shrink:0; margin-top: auto;"></div>

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
                    <div id="templateGallery" style="display:flex; flex-direction:column; gap:0.625rem; margin-bottom:1.5rem; width:100%; text-align:center; align-items:center;">
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
             style="display: flex; flex-direction: column; background: var(--bg-elevated); border: 1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}; border-radius: var(--radius-lg, 0.75rem); cursor: pointer; transition: all 0.2s ease; overflow: hidden; padding: 0.5rem; gap: 0.5rem; width: 100%; max-width: 280px; margin: 0 auto; box-sizing: border-box;">
          
          <!-- Miniatura de Preview (Prioridade para Imagem - altura aumentada para 150px) -->
          <div style="width: 100%; height: 150px; border-radius: 0.5rem; background-size: cover; background-position: center; position: relative; overflow: hidden; ${t.bgImage ? `background-image: url('${t.bgImage}');` : 'background: rgba(49, 53, 60, 0.4); border: 1px dashed var(--border);'}">
            <!-- Ícone de Check se ativo -->
            ${isActive ? `
              <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: var(--green,#2ea043); border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--bg-surface); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>` : ''}
          </div>

          <!-- Informações fora da imagem (Espaço otimizado e centralizado) -->
          <div style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.25rem; text-align: center; align-items: center; justify-content: center;">
            <h4 style="color: var(--text-primary,#e6edf3); font-weight: 700; font-size: 0.875rem; margin: 0;">${t.name}</h4>
            
            <!-- Cores do Tema (Centralizadas) -->
            <div style="display: flex; gap: 0.25rem; justify-content: center; align-items: center;">
              ${t.colors.map(c => `<div style="width: 0.65rem; height: 0.65rem; background: ${c}; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 1px 2px rgba(0,0,0,0.25);"></div>`).join('')}
            </div>
            
            <p style="color: var(--text-secondary,#8b949e); font-size: 0.72rem; margin: 0; line-height: 1.25; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${t.desc}">
              ${t.desc}
            </p>

            <!-- Botão Visualizar Centralizado -->
            <div style="margin-top: 0.15rem; display: flex; justify-content: center; width: 100%;">
              <a href="${buildPreviewUrl(t.id)}" target="_blank" rel="noopener"
                onclick="event.stopPropagation()"
                class="header-expand-btn"
                title="Visualizar Tema"
                style="text-decoration: none; border-radius: 9999px !important; box-sizing: border-box; display: inline-flex !important; font-size: 0.7rem; padding: 0.25rem 0.5rem; gap: 0.25rem; border: 1px solid var(--border,#30363d); background: transparent;">
                <span class="header-expand-icon" style="display: flex; align-items: center;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
                <span class="header-expand-label" style="font-weight: 600; font-size: 0.65rem; padding-left: 1px;">Ver</span>
              </a>
            </div>
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

  const exitBtn = container.querySelector('#exitBuilderBtn');
  if (exitBtn) {
    exitBtn.onclick = (e) => {
      e.stopPropagation();
      window.exitBuilderMode?.();
    };
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
        .hc-section-head { padding:0.6rem 0.75rem; font-size:0.7rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; justify-content:center; text-align:center; }
        .hc-row { padding:0.4rem 0.75rem; display:flex; flex-direction:column; gap:0.2rem; }
        .hc-label { font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center; display:block; width:100%; }
        .hc-input { width:100%; padding:0.35rem 0.5rem; background:#1f2937; border:1px solid #374151; border-radius:0.375rem; color:#f3f4f6; font-size:0.78rem; outline:none; box-sizing:border-box; }
        .hc-input:focus { border-color:#3b82f6; }
        .hc-range { width:100%; accent-color:#3b82f6; }
        .hc-range-row { display:flex; align-items:center; justify-content:center; gap:0.4rem; width:100%; }
        .hc-range-val { font-size:0.65rem; font-family:monospace; color:#9ca3af; min-width:2.2rem; text-align:right; }
        .hc-btn { padding:0.4rem 0.6rem; border-radius:0.375rem; border:1px solid #374151; background:#1f2937; color:#d1d5db; font-size:0.75rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.3rem; }
        .hc-btn:hover { background:#374151; color:#fff; }
        .hc-btn.primary { background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
        .hc-btn.primary:hover { background:#2563eb; }
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
          <div style="display:flex; gap:0.5rem; padding:0.4rem 0.75rem; align-items:center; justify-content:center;">
            <button class="header-expand-btn" id="hcAddText" title="Adicionar Texto" style="border:1px solid var(--border);">
              <span class="header-expand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="12" y2="12"></line>
                </svg>
              </span>
              <span class="header-expand-label" style="font-weight: 600;">+ Texto</span>
            </button>
          </div>
        </div>

        <!-- FUNDO -->
        <div class="hc-section">
          <div class="hc-section-head">Imagem de Fundo</div>
          <div style="display:flex; gap:0.5rem; padding:0.4rem 0.75rem; align-items:center; justify-content:center;">
            <label class="header-expand-btn" style="cursor:pointer;" title="Upload de Imagem">
              <span class="header-expand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-upload">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </span>
              <span class="header-expand-label" style="font-weight: 600;">Upload</span>
              <input type="file" id="hcBgUpload" accept="image/*" style="display:none;">
            </label>
          </div>
          <div id="hcBgProgress"></div>
          <details style="margin:0;" open>
            <summary style="padding:0.4rem 0.75rem; font-size:0.65rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:0.08em; cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:center; gap:0.4rem;">
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

        <!-- RESTAURAR PADRÃO (Sem botão Salvar) -->
        <div style="padding:1rem 0.75rem; margin-top:auto; display:flex; justify-content:center;">
          <button class="hc-btn" id="hcRestoreBtn" style="width:100%; background:none; border:none; font-size:0.75rem; color:var(--text-secondary); cursor:pointer;">Restaurar Padrão</button>
        </div>
      </div>
    `;

    // ── Função de Auto-Salvar ──
    const saveHeroData = async () => {
      try {
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Salvando...';
          indicator.style.opacity = '1';
        }
        await apiPut('/api/site/admin/config', { siteConfig: cfg });
        Object.assign(configData.siteConfig, JSON.parse(JSON.stringify(cfg)));
        if (indicator) {
          indicator.textContent = 'Salvo!';
          setTimeout(() => {
            indicator.style.opacity = '0';
          }, 1500);
        }
      } catch (err) {
        console.error('Erro ao salvar Hero auto-save:', err);
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Erro ao salvar!';
          indicator.style.color = 'var(--red)';
        }
      }
    };

    const updateConfigFromUI = async () => {
      cfg.heroScale = parseFloat(heroContainer.querySelector('#hcBgScale').value);
      cfg.heroPosX = parseInt(heroContainer.querySelector('#hcBgPosX').value);
      cfg.heroPosY = parseInt(heroContainer.querySelector('#hcBgPosY').value);
      cfg.overlayOpacity = parseInt(heroContainer.querySelector('#hcBgOverlayOpacity').value);
      window._meuSitePostPreview?.();
      await saveHeroData();
    };

    // ── Sliders Bind ──
    ['hcBgScale', 'hcBgPosX', 'hcBgPosY', 'hcBgOverlayOpacity'].forEach(id => {
      heroContainer.querySelector('#' + id).oninput = async (e) => {
        const val = e.target.value;
        const suffix = id === 'hcBgScale' ? 'x' : '%';
        heroContainer.querySelector('#' + id + 'Val').textContent = (id === 'hcBgScale' ? parseFloat(val).toFixed(1) : val) + suffix;
        await updateConfigFromUI();
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
        window._meuSitePostPreview?.();
        await saveHeroData();
      } catch (err) { window.showToast?.('Erro no upload', 'error'); }
    };

    // ── Camadas ──
    const getLayer = (id) => cfg.heroLayers.find(l => l.id === id);
    const updateLayer = async (id, props) => {
      const l = getLayer(id);
      if (!l) return;
      Object.assign(l, props);
      window._meuSitePostPreview?.();
      await saveHeroData();
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
        el.addEventListener('drop', async (e) => {
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
          window._meuSitePostPreview?.();
          await saveHeroData();
        });

        el.addEventListener('click', async (e) => {
          if (e.target.classList.contains('layer-del')) {
            cfg.heroLayers = cfg.heroLayers.filter(l => l.id !== el.dataset.id);
            if (_heroSelectedLayerId === el.dataset.id) _heroSelectedLayerId = null;
            renderLayerList();
            renderPropsForLayer(null);
            window._meuSitePostPreview?.();
            await saveHeroData();
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
      heroContainer.querySelector('#lpText').oninput = async (e) => {
        l.text = e.target.value;
        l.name = e.target.value ? e.target.value.substring(0, 20) : 'Texto';
        renderLayerList();
        window._meuSitePostPreview?.();
        await saveHeroData();
      };
      heroContainer.querySelector('#lpX').oninput = (e) => updateLayer(l.id, { x: parseInt(e.target.value) });
      heroContainer.querySelector('#lpY').oninput = (e) => updateLayer(l.id, { y: parseInt(e.target.value) });
      heroContainer.querySelector('#lpSize').oninput = (e) => {
        const val = parseInt(e.target.value);
        heroContainer.querySelector('#lpSizeVal').textContent = val + 'px';
        updateLayer(l.id, { fontSize: val });
      };
      heroContainer.querySelector('#lpColor').oninput = (e) => updateLayer(l.id, { color: e.target.value });
      heroContainer.querySelector('#lpAlign').onchange = (e) => updateLayer(l.id, { align: e.target.value });
    };

    // ── Botões Adicionar ──
    heroContainer.querySelector('#hcAddText').onclick = async () => {
      cfg.heroLayers.push({ id: 'l_' + Date.now(), type: 'text', name: 'Novo Texto', text: 'Novo Texto', x: 50, y: 50, fontSize: 40, color: '#ffffff', align: 'center', shadow: true });
      renderLayerList();
      window._meuSitePostPreview?.();
      await saveHeroData();
    };

    // ── Restaurar Padrão ──
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
        window._meuSitePostPreview?.();
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

    // Função interna para Auto-Salvar
    const autoSaveSections = async () => {
      const selected = ordered.filter(s => activeSet.has(s.id)).map(s => s.id);
      try {
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Salvando...';
          indicator.style.opacity = '1';
        }
        await apiPut('/api/site/admin/config', { siteSections: selected });
        configData.siteSections = [...selected];
        if (indicator) {
          indicator.textContent = 'Salvo!';
          setTimeout(() => {
            indicator.style.opacity = '0';
          }, 1500);
        }
        liveRefresh({ siteSections: selected });
      } catch (err) {
        console.error('Erro ao salvar seções auto-save:', err);
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Erro ao salvar!';
          indicator.style.color = 'var(--red,#f85149)';
        }
      }
    };

    const renderList = () => {
      secoesContainer.innerHTML = `
        <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center;">
          <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center;">
            <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:0.25rem; text-align:center;">Seções do Site</h3>
            <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Ative/desative e arraste para reordenar as seções.</p>
          </div>

          <div id="sectionsList" style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
            ${ordered.map((sec, idx) => {
        const active = activeSet.has(sec.id);
        return `
                <div class="sec-drag-item" draggable="true" data-sec-id="${sec.id}" data-sec-idx="${idx}"
                  style="display:flex; align-items:center; gap:0.625rem; background:${active ? 'var(--bg-elevated)' : 'transparent'}; padding:0.625rem 0.875rem; border-radius:0.5rem; border:1px solid ${active ? 'var(--accent)' : 'var(--border)'}; opacity:${active ? '1' : '0.55'}; transition:all 0.15s; user-select:none; min-width:0; overflow:hidden;">
                  <span style="cursor:grab; color:#4b5563; font-size:1rem; flex-shrink:0;">⠿</span>
                  <input type="checkbox" data-sec-check="${sec.id}" ${active ? 'checked' : ''} style="width:14px; height:14px; cursor:pointer; flex-shrink:0;" onchange="toggleSection('${sec.id}')">
                  <span style="flex:1; min-width:0; color:${active ? '#f3f4f6' : '#6b7280'}; font-weight:500; font-size:0.8125rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${sec.label}</span>
                  <div style="display:flex; gap:0.25rem; flex-shrink:0;">
                    <button onclick="moveSection(${idx}, -1)" class="header-expand-btn" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border);" ${idx === 0 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button onclick="moveSection(${idx}, 1)" class="header-expand-btn" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border);" ${idx === ordered.length - 1 ? 'disabled style="opacity:0.2; cursor:not-allowed;"' : ''}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
              `;
      }).join('')}
          </div>

          <div style="padding:1.25rem 0.75rem; display:flex; justify-content:center; width:100%;">
            <button id="restoreSectionsBtn" style="background:none; border:none; font-size:0.75rem; color:var(--text-secondary); cursor:pointer;">Restaurar Padrão</button>
          </div>
        </div>
      `;

      // Botões mover
      window.moveSection = async (idx, dir) => {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= ordered.length) return;
        [ordered[idx], ordered[newIdx]] = [ordered[newIdx], ordered[idx]];
        renderList();
        await autoSaveSections();
      };

      // Toggle ativo
      window.toggleSection = async (id) => {
        if (activeSet.has(id)) activeSet.delete(id);
        else activeSet.add(id);
        renderList();
        await autoSaveSections();
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
          secoesContainer.querySelectorAll('.sec-drag-item').forEach(el => el.style.borderTop = '');
          item.style.borderTop = '2px solid var(--accent, #2f81f7)';
        });
        item.addEventListener('dragleave', () => {
          item.style.borderTop = '';
        });
        item.addEventListener('drop', async (e) => {
          e.preventDefault();
          item.style.borderTop = '';
          const targetIdx = parseInt(item.dataset.secIdx);
          if (dragIdx === null || dragIdx === targetIdx) return;
          const moved = ordered.splice(dragIdx, 1)[0];
          ordered.splice(targetIdx, 0, moved);
          dragIdx = null;
          renderList();
          await autoSaveSections();
        });
      });

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
        await autoSaveSections();
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
        <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Título</label>
              <input type="text" id="srv-title-${idx}" class="input" value="${(srv.title || '').replace(/"/g, '&quot;')}" data-srv-title="${idx}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Descrição</label>
              <textarea rows="2" id="srv-desc-${idx}" class="input" data-srv-desc="${idx}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none; resize:vertical;">${srv.description || ''}</textarea>
            </div>
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Preço (opcional)</label>
              <input type="text" id="srv-price-${idx}" class="input" value="${(srv.price || '').replace(/"/g, '&quot;')}" data-srv-price="${idx}" placeholder="Ex: Consulte ou R$ 500" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>
            
            <div style="display:flex; justify-content:center; margin-top:0.5rem; width:100%;">
              <button onclick="event.stopPropagation(); deleteServico(${idx})" class="p-action-btn header-expand-btn" title="Remover Serviço" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border); color:var(--red,#f85149);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      servicosContainer.innerHTML = `
        <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
          <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
            <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:0.25rem; text-align:center;">Serviços</h3>
            <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Adicione os serviços que você oferece no site.</p>
          </div>

          <div style="display:flex; justify-content:center; width:100%; margin-bottom:1.5rem;">
            <button id="addServicoBtn" class="header-expand-btn" title="Adicionar Serviço">
              <span class="header-expand-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </span>
              <span class="header-expand-label" style="font-weight: 600;">Adicionar Serviço</span>
            </button>
          </div>

          <div id="srvListWrapper" style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem; width:100%;">
            ${list || '<p style="color:#9ca3af; text-align:center; padding:2rem; background:rgba(0,0,0,0.2); border:1px dashed var(--border); border-radius:0.5rem; font-size:0.8rem; width:100%; box-sizing:border-box;">Nenhum serviço adicionado</p>'}
          </div>
        </div>
      `;

      // Função central para Auto-Salvar Serviços
      const autoSaveServicos = async () => {
        try {
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Salvando...';
            indicator.style.opacity = '1';
          }
          const updated = [];
          servicos.forEach((_, idx) => {
            updated.push({
              title: servicosContainer.querySelector(`[data-srv-title="${idx}"]`)?.value || '',
              description: servicosContainer.querySelector(`[data-srv-desc="${idx}"]`)?.value || '',
              price: servicosContainer.querySelector(`[data-srv-price="${idx}"]`)?.value || ''
            });
          });
          await apiPut('/api/site/admin/config', { siteContent: { ...configData.siteContent, servicos: updated } });
          configData.siteContent.servicos = updated;
          if (indicator) {
            indicator.textContent = 'Salvo!';
            setTimeout(() => {
              if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
            }, 1500);
          }
          liveRefresh({ siteContent: { servicos: updated } });
        } catch (err) {
          console.error('Erro no auto-save de serviços:', err);
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Erro ao salvar!';
            indicator.style.color = 'var(--red,#f85149)';
          }
        }
      };

      // Adiciona eventos oninput/onchange para auto-salvar qualquer alteração nos inputs
      servicosContainer.querySelectorAll('input, textarea').forEach(el => {
        el.oninput = autoSaveServicos;
      });

      servicosContainer.querySelector('#addServicoBtn').onclick = async () => {
        servicos.push({ title: 'Novo Serviço', description: '', price: '' });
        renderList(); // re-render para mostrar novos campos
        await autoSaveServicos(); // salva o novo serviço no banco
      };

      window.deleteServico = async (idx) => {
        const ok = await window.showConfirm?.('Remover este serviço?', { confirmText: 'Remover', danger: true });
        if (!ok) return;
        servicos.splice(idx, 1);
        renderList();
        await autoSaveServicos(); // salva a remoção no banco
      };
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

      // Função central para Auto-Salvar Depoimentos
      const autoSaveDepoimentos = async () => {
        try {
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Salvando...';
            indicator.style.opacity = '1';
          }
          const updated = [];
          depoimentos.forEach((_, idx) => {
            updated.push({
              name: depoContainer.querySelector(`[data-dep-name="${idx}"]`)?.value || '',
              text: depoContainer.querySelector(`[data-dep-text="${idx}"]`)?.value || '',
              photo: depoContainer.querySelector(`[data-dep-photo="${idx}"]`)?.value || depoimentos[idx].photo || '',
              rating: parseInt(depoContainer.querySelector(`[data-dep-rating="${idx}"]`)?.value || 5),
              socialLink: depoContainer.querySelector(`[data-dep-social="${idx}"]`)?.value || ''
            });
          });
          await apiPut('/api/site/admin/config', { siteContent: { ...configData.siteContent, depoimentos: updated } });
          if (!configData.siteContent) configData.siteContent = {};
          configData.siteContent.depoimentos = updated;
          if (indicator) {
            indicator.textContent = 'Salvo!';
            setTimeout(() => {
              if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
            }, 1500);
          }
          liveRefresh({ siteContent: { depoimentos: updated } });
        } catch (err) {
          console.error('Erro no auto-save de depoimentos:', err);
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Erro ao salvar!';
            indicator.style.color = 'var(--red,#f85149)';
          }
        }
      };

    const renderList = () => {
      const list = depoimentos.map((dep, idx) => `
        <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
          <div style="display:flex; flex-direction:column; gap:0.75rem;">

            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Nome do Cliente</label>
              <input type="text" class="input" value="${(dep.name || '').replace(/"/g, '&quot;')}" data-dep-name="${idx}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>

            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Depoimento</label>
              <textarea rows="3" class="input" data-dep-text="${idx}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none; resize:vertical;">${dep.text || ''}</textarea>
            </div>

            <div style="display:flex; gap:0.75rem; justify-content:center; align-items:flex-end;">
              <div style="display:flex; flex-direction:column; align-items:center;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Foto</label>
                <div style="width:48px; height:48px; border-radius:50%; background:var(--bg-base); border:1px dashed var(--border); overflow:hidden; flex-shrink:0; margin-bottom:0.25rem;">
                  ${dep.photo ? `<img src="${resolveImagePath(dep.photo)}" style="width:100%; height:100%; object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:1.2rem;">👤</div>'}
                </div>
                <label style="font-size:0.7rem; color:var(--accent); cursor:pointer; font-weight:600;">
                  Alterar
                  <input type="file" accept="image/*" data-dep-photo-upload="${idx}" style="display:none;">
                </label>
                <input type="hidden" data-dep-photo="${idx}" value="${dep.photo || ''}">
              </div>
              <div class="input-group" style="margin-bottom:0;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Nota</label>
                <input type="number" class="input" min="1" max="5" value="${dep.rating || 5}" data-dep-rating="${idx}" style="text-align:center; width:60px; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
            </div>

            <div class="input-group" style="margin-bottom:0; width:100%;">
              <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Link Social (opcional)</label>
              <input type="text" class="input" value="${(dep.socialLink || '').replace(/"/g, '&quot;')}" data-dep-social="${idx}" placeholder="https://instagram.com/cliente" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>

            <div style="display:flex; justify-content:center; margin-top:0.5rem; width:100%;">
              <button onclick="event.stopPropagation(); deleteDepoimento(${idx})" class="p-action-btn header-expand-btn" title="Remover Depoimento" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border); color:var(--red,#f85149);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>
      `).join('');

      depoContainer.innerHTML = `
        <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
          ${renderPendentes()}

          <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
            <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:0.25rem; text-align:center;">Depoimentos Publicados</h3>
            <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Adicione ou gerencie depoimentos visíveis no site.</p>
          </div>

          <div style="display:flex; justify-content:center; width:100%; margin-bottom:1.5rem;">
            <button id="addDepoimentoBtn" class="btn" style="border-radius:9999px; padding:0.5rem 1.25rem; font-weight:600;" title="Adicionar Depoimento">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicionar Depoimento
            </button>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem; width:100%;">
            ${list || '<p style="color:#9ca3af; text-align:center; padding:2rem; background:rgba(0,0,0,0.2); border:1px dashed var(--border); border-radius:0.5rem; font-size:0.8rem; width:100%; box-sizing:border-box;">Nenhum depoimento adicionado</p>'}
          </div>
        </div>
      `;

      // Auto-save bindings
      depoContainer.querySelectorAll('input:not([type="file"]), textarea').forEach(el => {
        el.oninput = autoSaveDepoimentos;
      });

      depoContainer.querySelector('#addDepoimentoBtn').onclick = async () => {
        depoimentos.push({ name: 'Cliente', text: '', photo: '', rating: 5, socialLink: '' });
        renderList();
        await autoSaveDepoimentos();
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
            await autoSaveDepoimentos();
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
        await autoSaveDepoimentos();
      };
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

    // Função central para Auto-Salvar Estilo
    const autoSaveEstilo = async () => {
      try {
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Salvando...';
          indicator.style.opacity = '1';
        }
        const newStyle = {
          accentColor: accentInput?.value || '',
          bgColor: bgInput?.value || '',
          textColor: textInput?.value || '',
          fontFamily: personalizarContainer.querySelector('#styleFontFamily')?.value || ''
        };
        await apiPut('/api/site/admin/config', { siteStyle: newStyle });
        configData.siteStyle = newStyle;
        if (indicator) {
          indicator.textContent = 'Salvo!';
          setTimeout(() => {
            if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
          }, 1500);
        }
        liveRefresh({ siteStyle: newStyle });
      } catch (err) {
        console.error('Erro no auto-save de estilo:', err);
        const indicator = document.getElementById('builder-save-indicator');
        if (indicator) {
          indicator.textContent = 'Erro ao salvar!';
          indicator.style.color = 'var(--red,#f85149)';
        }
      }
    };

    personalizarContainer.innerHTML = `
      <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">

        <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
          <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Estilo Visual do Site</h3>
          <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Edite cores e fontes. As alterações são salvas automaticamente.</p>
        </div>

        <!-- Estilo Global -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.75rem; padding:1.5rem; width:100%; box-sizing:border-box; display:flex; flex-direction:column; align-items:center;">
          <div style="display:grid; grid-template-columns:1fr; gap:1.25rem; margin-bottom:1.5rem; width:100%;">
            <div style="display:flex; flex-direction:column; align-items:center;">
              <label style="display:block; color:var(--text-secondary); font-size:0.65rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Cor Principal (Accent)</label>
              <div style="display:flex; gap:0.75rem; align-items:center; background:var(--bg-surface); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.5rem;">
                <input type="color" id="styleAccentColor" value="${style.accentColor || '#c9a96e'}" style="width:2rem; height:2rem; border:none; border-radius:50%; background:none; cursor:pointer; padding:0;">
                <span id="styleAccentColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.accentColor || '#c9a96e'}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <label style="display:block; color:var(--text-secondary); font-size:0.65rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Cor de Fundo</label>
              <div style="display:flex; gap:0.75rem; align-items:center; background:var(--bg-surface); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.5rem;">
                <input type="color" id="styleBgColor" value="${style.bgColor || '#fafafa'}" style="width:2rem; height:2rem; border:none; border-radius:50%; background:none; cursor:pointer; padding:0;">
                <span id="styleBgColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.bgColor || '#fafafa'}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <label style="display:block; color:var(--text-secondary); font-size:0.65rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Cor do Texto</label>
              <div style="display:flex; gap:0.75rem; align-items:center; background:var(--bg-surface); border:1px solid var(--border); padding:0.5rem 1rem; border-radius:0.5rem;">
                <input type="color" id="styleTextColor" value="${style.textColor || '#111827'}" style="width:2rem; height:2rem; border:none; border-radius:50%; background:none; cursor:pointer; padding:0;">
                <span id="styleTextColorText" style="color:var(--text-primary); font-size:0.875rem; font-family:monospace;">${style.textColor || '#111827'}</span>
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <label style="display:block; color:var(--text-secondary); font-size:0.65rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Fonte do Site</label>
              <select id="styleFontFamily" class="select" style="text-align:center; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.5rem 1rem; border-radius:0.5rem; font-size:0.85rem; outline:none; max-width:240px;">
                ${FONTS.map(f => `<option value="${f.value}" ${style.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
              </select>
            </div>
          </div>
          <!-- Preview da paleta -->
          <div id="stylePalettePreview" style="border-radius:0.5rem; overflow:hidden; margin-bottom:1.5rem; width:100%; max-width:320px; text-align:center; border:1px solid var(--border);">
            <div style="background:${style.accentColor || '#c9a96e'}; padding:0.75rem 1rem;">
              <span style="color:#fff; font-weight:700; font-size:0.9rem;">Cor Principal</span>
            </div>
            <div style="background:${style.bgColor || '#fafafa'}; padding:0.75rem 1rem;">
              <span style="color:${style.textColor || '#111827'}; font-size:0.9rem;">Texto do site com sua paleta de cores</span>
            </div>
          </div>
          
          <button id="resetStyleBtn" class="p-action-btn" style="background:var(--bg-surface); border:1px solid var(--border); color:var(--text-secondary); padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer; font-size:0.8rem;">Restaurar Padrão do Tema</button>
        </div>
      </div>
    `;

    // Live preview da paleta e auto-save
    const accentInput = personalizarContainer.querySelector('#styleAccentColor');
    const bgInput = personalizarContainer.querySelector('#styleBgColor');
    const textInput = personalizarContainer.querySelector('#styleTextColor');

    function updatePalettePreview() {
      const preview = personalizarContainer.querySelector('#stylePalettePreview');
      if (preview) {
        preview.innerHTML = `
          <div style="background:${accentInput.value}; padding:0.75rem 1rem;">
            <span style="color:#fff; font-weight:700; font-size:0.9rem;">Cor Principal</span>
          </div>
          <div style="background:${bgInput.value}; padding:0.75rem 1rem;">
            <span style="color:${textInput.value}; font-size:0.9rem;">Texto do site com sua paleta de cores</span>
          </div>
        `;
      }
      personalizarContainer.querySelector('#styleAccentColorText').textContent = accentInput.value;
      personalizarContainer.querySelector('#styleBgColorText').textContent = bgInput.value;
      personalizarContainer.querySelector('#styleTextColorText').textContent = textInput.value;
    }

    if (accentInput) accentInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); autoSaveEstilo(); };
    if (bgInput) bgInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); autoSaveEstilo(); };
    if (textInput) textInput.oninput = () => { updatePalettePreview(); window._meuSitePostPreview?.(); autoSaveEstilo(); };
    const fontFamilyInput = personalizarContainer.querySelector('#styleFontFamily');
    if (fontFamilyInput) fontFamilyInput.onchange = () => { window._meuSitePostPreview?.(); autoSaveEstilo(); };

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

      // Função central para Auto-Salvar Contato
      const autoSaveContato = async () => {
        try {
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Salvando...';
            indicator.style.opacity = '1';
          }
          const newContato = {
            title: contatoContainer.querySelector('#contatoTitle').value,
            text: contatoContainer.querySelector('#contatoText').value,
            address: contatoContainer.querySelector('#contatoAddress').value
          };
          await apiPut('/api/site/admin/config', { siteContent: { ...configData.siteContent, contato: newContato } });
          if (!configData.siteContent) configData.siteContent = {};
          configData.siteContent.contato = newContato;
          if (indicator) {
            indicator.textContent = 'Salvo!';
            setTimeout(() => {
              if (indicator.textContent === 'Salvo!') indicator.style.opacity = '0';
            }, 1500);
          }
          liveRefresh({ siteContent: { contato: newContato } });
        } catch (err) {
          console.error('Erro no auto-save de contato:', err);
          const indicator = document.getElementById('builder-save-indicator');
          if (indicator) {
            indicator.textContent = 'Erro ao salvar!';
            indicator.style.color = 'var(--red,#f85149)';
          }
        }
      };

    contatoContainer.innerHTML = `
      <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
        <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
          <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Seção de Contato</h3>
          <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Edite as informações de contato visíveis no site.</p>
        </div>

        <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
          <div class="input-group" style="margin-bottom:0; width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Título</label>
            <input type="text" id="contatoTitle" class="input" value="${(contato.title || 'Entre em Contato').replace(/"/g, '&quot;')}" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
          </div>

          <div class="input-group" style="margin-bottom:0; width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Texto</label>
            <textarea id="contatoText" class="input" rows="3" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none; resize:vertical;">${contato.text || 'Gostou do meu trabalho? Entre em contato para agendar sua sessão!'}</textarea>
          </div>

          <div class="input-group" style="margin-bottom:0; width:100%;">
            <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Endereço (opcional)</label>
            <input type="text" id="contatoAddress" class="input" value="${(contato.address || '').replace(/"/g, '&quot;')}" placeholder="Rua Exemplo, 123 - São Paulo/SP" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
          </div>
        </div>
      </div>
    `;

    // Preview em tempo real e auto-save
    contatoContainer.querySelectorAll('input, textarea').forEach(el => {
      el.oninput = () => {
        window._meuSitePostPreview?.();
        autoSaveContato();
      };
    });
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
      <div style="display:flex; gap:0.5rem; align-items:center; width:100%;">
        <div class="input-group" style="margin-bottom:0; flex:1;">
          <input type="text" class="input" data-link-label="${idx}" value="${(link.label || '').replace(/"/g, '&quot;')}" placeholder="Texto do link" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
        </div>
        <div class="input-group" style="margin-bottom:0; flex:1;">
          <input type="text" class="input" data-link-url="${idx}" value="${(link.url || '').replace(/"/g, '&quot;')}" placeholder="URL (ex: #portfolio)" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
        </div>
        <button data-remove-link="${idx}" class="p-action-btn header-expand-btn" title="Remover Link" style="width:28px !important; min-width:28px !important; height:28px !important; border-radius:50% !important; display:inline-flex !important; align-items:center; justify-content:center; padding:0 !important; cursor:pointer; background:var(--bg-surface); border:1px solid var(--border); color:var(--red,#f85149); flex-shrink:0;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    const renderList = () => {
    rodapeContainer.innerHTML = `
      <div style="max-width:580px; margin:0 auto; display:flex; flex-direction:column; align-items:center; width:100%; box-sizing:border-box; padding-bottom:2rem;">
        
        <div style="margin-bottom:1.5rem; text-align:center; display:flex; flex-direction:column; align-items:center; width:100%;">
          <h3 style="font-size:1.125rem; font-weight:600; color:var(--text-primary); margin-bottom:0.25rem; text-align:center;">Seção de Rodapé</h3>
          <p style="color:#9ca3af; font-size:0.875rem; text-align:center; max-width:320px;">Edite o copyright, redes sociais e links do rodapé.</p>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem; width:100%;">
          <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
            <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-align:center; margin-bottom:0.25rem;">Copyright</h3>
            <div class="input-group" style="margin-bottom:0; width:100%;">
              <input type="text" id="rodapeCopyright" class="input" value="${(_rodape.copyright || '').replace(/"/g, '&quot;')}" placeholder="Ex: © 2026 Studio. Todos os direitos reservados." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
            </div>
          </div>

          <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
            <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-align:center; margin-bottom:0.25rem;">Redes Sociais</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Instagram</label>
                <input type="text" id="socialInstagram" class="input" value="${(_rodape.socialMedia.instagram || '').replace(/"/g, '&quot;')}" placeholder="https://instagram.com/..." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Facebook</label>
                <input type="text" id="socialFacebook" class="input" value="${(_rodape.socialMedia.facebook || '').replace(/"/g, '&quot;')}" placeholder="https://facebook.com/..." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">LinkedIn</label>
                <input type="text" id="socialLinkedin" class="input" value="${(_rodape.socialMedia.linkedin || '').replace(/"/g, '&quot;')}" placeholder="https://linkedin.com/..." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">TikTok</label>
                <input type="text" id="socialTiktok" class="input" value="${(_rodape.socialMedia.tiktok || '').replace(/"/g, '&quot;')}" placeholder="https://tiktok.com/..." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">YouTube</label>
                <input type="text" id="socialYoutube" class="input" value="${(_rodape.socialMedia.youtube || '').replace(/"/g, '&quot;')}" placeholder="https://youtube.com/..." style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
              <div class="input-group" style="margin-bottom:0; width:100%;">
                <label style="text-align:center; display:block; width:100%; font-size:0.65rem; color:#6b7280; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem;">Email</label>
                <input type="email" id="socialEmail" class="input" value="${(_rodape.socialMedia.email || '').replace(/"/g, '&quot;')}" placeholder="contato@exemplo.com" style="text-align:center; width:100%; box-sizing:border-box; background:var(--bg-surface); border:1px solid var(--border); color:var(--text-primary); padding:0.4rem; border-radius:0.375rem; font-size:0.8rem; outline:none;">
              </div>
            </div>
          </div>

          <div style="background:var(--bg-elevated); padding:1.25rem; border-radius:0.5rem; border:1px solid var(--border); display:flex; flex-direction:column; gap:0.75rem; width:100%; box-sizing:border-box;">
            <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:0.5rem; gap:0.5rem;">
              <h3 style="font-size:0.875rem; font-weight:600; color:var(--text-secondary); text-align:center; margin-bottom:0;">Links Úteis</h3>
              <button id="addRodapeLinkBtn" class="header-expand-btn" title="Adicionar Link">
                <span class="header-expand-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </span>
                <span class="header-expand-label" style="font-weight: 600;">Adicionar Link</span>
              </button>
            </div>
            <div id="rodapeLinksList" style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
              ${buildLinksHtml(_rodape.quickLinks) || '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center; width:100%; box-sizing:border-box; padding:1rem; border:1px dashed var(--border); border-radius:0.5rem;">Nenhum link adicionado</p>'}
            </div>
          </div>
        </div>
      </div>
    `;

    rodapeContainer.querySelectorAll('input').forEach(input => {
      input.oninput = async () => {
        lerInputs();
        await saveRodape(true); // silent
        window._meuSitePostPreview?.();
      };
    });

    rodapeContainer.querySelector('#addRodapeLinkBtn').onclick = async () => {
      lerInputs(); // preserva o que já foi digitado antes do re-render
      _rodape.quickLinks.push({ label: '', url: '' });
      renderList();
      await saveRodape(true);
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
    };

    renderList();
  };
}