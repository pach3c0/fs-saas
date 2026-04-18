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
import { renderEstudio } from './estudio.js';
import { renderFaq } from './faq.js';
import { photoEditorHtml, setupPhotoEditor } from '../utils/photoEditor.js';


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

      <div id="siteStatusCard" style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151; display:flex; align-items:center; justify-content:space-between; gap:1rem;">
        <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <h3 style="color:#f3f4f6; font-weight:600; margin:0;">Status do Site</h3>
              <span id="siteStatusBadge" style="display:none; font-size:0.7rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:999px; background:#7f1d1d; color:#fca5a5;">● DESATIVADO</span>
            </div>
            <p style="color:#9ca3af; font-size:0.875rem; margin:0.25rem 0 0;">Quando desativado, visitantes veem uma página de "Em breve".</p>
        </div>
        <label style="position:relative; display:inline-block; width:3.5rem; height:1.75rem; flex-shrink:0;">
            <input type="checkbox" id="siteEnabledToggle" style="opacity:0; width:0; height:0;">
            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#374151; transition:.4s; border-radius:9999px;"></span>
            <span style="position:absolute; content:''; height:1.25rem; width:1.25rem; left:0.25rem; bottom:0.25rem; background-color:white; transition:.4s; border-radius:50%;" id="toggleKnob"></span>
        </label>
        <style>
            #siteEnabledToggle:checked + span { background-color: #16a34a; }
            #siteEnabledToggle:checked + span + span { transform: translateX(1.75rem); }
        </style>
      </div>

      <!-- Layout: nav vertical + conteúdo -->
      <div style="display:flex; gap:0; flex:1; min-height:0;">

        <!-- Nav vertical -->
        <div style="width:110px; flex-shrink:0; display:flex; flex-direction:column; gap:2px; border-right:1px solid var(--border,#30363d); padding-right:0.5rem;">
          <button class="sub-tab-btn builder-nav-item active" data-target="config-geral"><span class="material-symbols-outlined">tune</span>Geral</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-secoes"><span class="material-symbols-outlined">layers</span>Seções</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-hero"><span class="material-symbols-outlined">view_carousel</span>Capa</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-sobre"><span class="material-symbols-outlined">person</span>Sobre</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-portfolio"><span class="material-symbols-outlined">collections</span>Portfólio</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-servicos"><span class="material-symbols-outlined">handyman</span>Serviços</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-depoimentos"><span class="material-symbols-outlined">chat</span>Depoimentos</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-albuns"><span class="material-symbols-outlined">photo_library</span>Álbuns</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-estudio"><span class="material-symbols-outlined">apartment</span>Estúdio</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-contato"><span class="material-symbols-outlined">mail</span>Contato</button>
          <button class="sub-tab-btn builder-nav-item" data-target="config-faq"><span class="material-symbols-outlined">help</span>FAQ</button>
          <div style="height:1px; background:var(--border,#30363d); margin:0.25rem 0.25rem;"></div>
          <button class="sub-tab-btn builder-nav-item" data-target="config-personalizar" style="color:var(--purple,#bc8cff);"><span class="material-symbols-outlined" style="color:var(--purple,#bc8cff);">palette</span>Personalizar</button>
        </div>

        <!-- Conteúdo das Abas -->
        <div id="subTabContent" style="flex:1; min-width:0; padding-left:0.75rem; overflow-y:auto;">
        <!-- Geral -->
        <div id="config-geral" class="sub-tab-content">
            <div style="display:flex; flex-direction:column; gap:2rem;">
                <div>
                    <h3 style="color:#f3f4f6; font-weight:600; font-size:1.125rem; margin-bottom:0.5rem;">Escolha o Tema do Seu Site</h3>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:1.5rem;">Use o "Visualizar" para testar. Para definir, clique no card e salve.</p>
                    <div id="templateGallery" style="display:flex; flex-direction:column; gap:0.625rem; margin-bottom:1.5rem;">
                        <!-- Templates inseridos via JS -->
                    </div>
                    <input type="hidden" id="siteTheme">
                </div>
                <div>
                    <button id="saveGeralBtn" class="builder-save-btn">Salvar Tema</button>
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
  try {
    configData = (await apiGet('/api/site/admin/config')) || {};
  } catch (e) { console.error(e); }
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

  // Renderizar galeria de templates
  const templates = [
    { id: 'elegante', name: 'Elegante', desc: 'Clássico com dourado e serif', colors: ['#c9a962', '#2c2c2c', '#f5f5f5'] },
    { id: 'minimalista', name: 'Minimalista', desc: 'Clean com muito espaço branco', colors: ['#000000', '#666666', '#ffffff'] },
    { id: 'moderno', name: 'Moderno', desc: 'Azul com gradientes e cards', colors: ['#3b82f6', '#667eea', '#f8fafc'] },
    { id: 'escuro', name: 'Escuro', desc: 'Dark mode com laranja', colors: ['#ff9500', '#0a0a0a', '#1a1a1a'] },
    { id: 'galeria', name: 'Galeria', desc: 'Masonry grid foco em fotos', colors: ['#8b7355', '#2c2c2c', '#fafafa'] }
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
        <div class="template-card builder-theme-card ${isSelected ? 'active' : ''}" data-theme="${t.id}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
            <div>
              <h4 style="color:var(--text-primary,#e6edf3); font-weight:700; font-size:0.9375rem; margin:0 0 0.2rem;">${t.name}</h4>
              <p style="color:var(--text-secondary,#8b949e); font-size:0.75rem; margin:0;">${t.desc}</p>
            </div>
            ${isActive ? `<span class="material-symbols-outlined" style="color:var(--green,#3fb950); font-size:20px; font-variation-settings:'FILL' 1;">check_circle</span>` : ''}
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; gap:0.375rem;">
              ${t.colors.map(c => `<div style="width:1rem; height:1rem; background:${c}; border-radius:50%; border:1px solid rgba(255,255,255,0.1);"></div>`).join('')}
            </div>
            <a href="${buildPreviewUrl(t.id)}" target="_blank" rel="noopener"
              onclick="event.stopPropagation()"
              style="padding:0.3rem 0.875rem; background:var(--bg-elevated,#1c2128); color:var(--text-secondary,#8b949e); border-radius:999px; font-size:0.75rem; font-weight:600; text-decoration:none; border:1px solid var(--border,#30363d); transition:color 0.15s, border-color 0.15s;"
              onmouseenter="this.style.color='var(--text-primary,#e6edf3)'; this.style.borderColor='var(--accent,#2f81f7)'"
              onmouseleave="this.style.color='var(--text-secondary,#8b949e)'; this.style.borderColor='var(--border,#30363d)'">
              Visualizar
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

  // Status Toggle
  const toggle = container.querySelector('#siteEnabledToggle');
  const statusBadge = container.querySelector('#siteStatusBadge');
  const statusCard = container.querySelector('#siteStatusCard');

  const updateStatusUI = (enabled) => {
    if (statusBadge) statusBadge.style.display = enabled ? 'none' : 'inline-block';
    if (statusCard) statusCard.style.borderColor = enabled ? '#374151' : '#7f1d1d';
  };

  toggle.checked = !!siteEnabled;
  updateStatusUI(!!siteEnabled);

  toggle.onchange = async () => {
    try {
      await apiPut('/api/site/admin/config', { siteEnabled: toggle.checked });
      configData.siteEnabled = toggle.checked;
      updateStatusUI(toggle.checked);
      window.showToast?.(toggle.checked ? 'Site ativado! Visitantes já podem acessar.' : 'Site desativado. Visitantes verão "Em breve".', toggle.checked ? 'success' : 'warning');
      liveRefresh({});
    } catch (e) {
      window.showToast?.('Erro ao salvar status do site', 'error');
      toggle.checked = !toggle.checked;
      updateStatusUI(toggle.checked);
    }
  };

  // Links (only in non-builder mode)
  const siteUrl = orgSlug
    ? `${window.location.origin}/site?_tenant=${orgSlug}`
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
    }) ?? confirm(`Você tem alterações não salvas em "${label}".\n\nDeseja salvar antes de continuar?`);

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
        customSections: configData.siteContent?.customSections || [],
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

    // Portfolio (sempre usar do appData)
    const portfolio = appState.appData?.portfolio || {};
    if (portfolio.photos) {
      snap.siteContent.portfolio = {
        ...snap.siteContent.portfolio,
        photos: portfolio.photos
      };
    }

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
      'config-faq': 'faq'
    };
    if (sectionMap[target]) scrollToSection(sectionMap[target]);

    tabs.forEach(t => {
      t.style.background = 'none';
      t.style.color = t.dataset.target === 'config-personalizar' ? '#c084fc' : '#9ca3af';
      t.style.fontWeight = t.dataset.target === 'config-personalizar' ? '600' : 'normal';
    });
    btn.style.background = '#1e3a5f';
    btn.style.color = '#93c5fd';
    btn.style.fontWeight = '600';
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
    } else if (btn.dataset.target === 'config-personalizar') {
      renderPersonalizar();
    }
  }

  tabs.forEach(btn => {
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
      // Troca de tema requer reload completo do iframe (templates diferentes)
      window.builderScheduleRefresh?.();
    });
  };

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
      liveNotify();
    };

    // ── Sliders Bind ──
    ['hcBgScale', 'hcBgPosX', 'hcBgPosY'].forEach(id => {
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
    const DEFAULT_SECTIONS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];
    const allSectionDefs = [
      { id: 'hero', label: 'Capa' },
      { id: 'portfolio', label: 'Portfólio' },
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
        <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151;">
          <div style="display:grid; gap:0.75rem;">
            <div style="display:grid; grid-template-columns:1fr auto; gap:0.5rem; align-items:start;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Título</label>
                <input type="text" id="srv-title-${idx}" value="${srv.title || ''}" data-srv-title="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
              <button onclick="deleteServico(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.25rem; padding:0.25rem;" title="Remover">🗑️</button>
            </div>
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Descrição</label>
              <textarea rows="2" id="srv-desc-${idx}" data-srv-desc="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">${srv.description || ''}</textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Ícone (emoji)</label>
                <input type="text" id="srv-icon-${idx}" value="${srv.icon || '📸'}" data-srv-icon="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="📸">
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Preço (opcional)</label>
                <input type="text" id="srv-price-${idx}" value="${srv.price || ''}" data-srv-price="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="R$ 500">
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

          ${servicos.length > 0 ? '<button id="saveServicosBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">Salvar Serviços</button>' : ''}
        </div>
      `;

      servicosContainer.querySelector('#addServicoBtn').onclick = () => {
        servicos.push({ title: 'Novo Serviço', description: '', icon: '📸', price: '' });
        renderList(); // re-render para gerar novos IDs
      };

      window.deleteServico = async (idx) => {
        const ok = await window.showConfirm?.('Remover este serviço?', { confirmText: 'Remover', danger: true }) ?? confirm('Remover este serviço?');
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
      const ok = await window.showConfirm?.('Rejeitar e apagar este depoimento?', { confirmText: 'Rejeitar', danger: true }) ?? confirm('Rejeitar e apagar este depoimento?');
      if (!ok) return;
      try {
        await apiDelete(`/api/site/admin/depoimentos-pendentes/${id}`);
        pendentes = pendentes.filter(p => p.id !== id);
        renderDepoimentos();
      } catch (e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    const renderList = () => {
      const list = depoimentos.map((dep, idx) => `
        <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151;">
          <div style="display:grid; gap:0.75rem;">

            <!-- Nome + deletar -->
            <div style="display:grid; grid-template-columns:1fr auto; gap:0.5rem; align-items:start;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Nome do Cliente</label>
                <input type="text" value="${dep.name || ''}" data-dep-name="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
              <button onclick="deleteDepoimento(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.25rem; padding:0.25rem; margin-top:1.25rem;" title="Remover">🗑️</button>
            </div>

            <!-- Texto -->
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Depoimento</label>
              <textarea rows="3" data-dep-text="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">${dep.text || ''}</textarea>
            </div>

            <!-- Foto + nota -->
            <div style="display:grid; grid-template-columns:auto 1fr auto; gap:0.75rem; align-items:end;">
              <!-- Preview da foto -->
              <div style="width:56px; height:56px; border-radius:50%; background:#374151; overflow:hidden; flex-shrink:0;">
                ${dep.photo ? `<img src="${resolveImagePath(dep.photo)}" style="width:100%; height:100%; object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:1.5rem;">👤</div>'}
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Foto do Cliente</label>
                <label style="display:inline-flex; align-items:center; gap:0.5rem; background:#2563eb; color:white; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; font-weight:600; cursor:pointer;">
                  Upload
                  <input type="file" accept="image/*" data-dep-photo-upload="${idx}" style="display:none;">
                </label>
                <input type="hidden" data-dep-photo="${idx}" value="${dep.photo || ''}">
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Nota (1-5)</label>
                <input type="number" min="1" max="5" value="${dep.rating || 5}" data-dep-rating="${idx}" style="width:70px; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
            </div>

            <!-- Link social -->
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Link Instagram ou Facebook (opcional)</label>
              <input type="text" value="${dep.socialLink || ''}" data-dep-social="${idx}" placeholder="https://instagram.com/cliente"
                style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem;">
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
        const ok = await window.showConfirm?.('Remover este depoimento?', { confirmText: 'Remover', danger: true }) ?? confirm('Remover este depoimento?');
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
    const customSections = configData.siteContent?.customSections || [];

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

    const SECTION_TYPES = [
      { value: 'texto', label: '📄 Texto Simples' },
      { value: 'texto-imagem', label: '🖼️ Texto + Imagem' },
      { value: 'galeria', label: '📷 Mini Galeria' },
      { value: 'chamada', label: '🎯 Chamada para Ação' },
      { value: 'lista', label: '📋 Lista de Itens' },
    ];

    const renderCustomList = () => {
      const list = customSections.map((sec, idx) => `
        <div style="background:#1f2937; border:1px solid #374151; border-radius:0.5rem; padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="color:#c084fc; font-size:0.75rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">${SECTION_TYPES.find(t => t.value === sec.type)?.label || '📄 Seção'}</span>
            <button onclick="deleteCustomSection(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem;" title="Remover">🗑️</button>
          </div>
          <div>
            <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Título da Seção</label>
            <input type="text" value="${sec.title || ''}" data-cs-title="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem;">
          </div>
          ${sec.type === 'texto' || sec.type === 'chamada' ? `
          <div>
            <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Conteúdo (texto)</label>
            <textarea rows="4" data-cs-content="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem; resize:vertical;">${sec.content || ''}</textarea>
          </div>` : ''}
          ${sec.type === 'texto-imagem' ? `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Conteúdo</label>
              <textarea rows="4" data-cs-content="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem; resize:vertical;">${sec.content || ''}</textarea>
            </div>
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Imagem</label>
              ${sec.imageUrl ? `<img src="${sec.imageUrl}" style="width:100%; height:80px; object-fit:cover; border-radius:0.375rem; margin-bottom:0.5rem;">` : ''}
              <label style="display:inline-flex; align-items:center; gap:0.25rem; background:#374151; color:#d1d5db; padding:0.375rem 0.75rem; border-radius:0.375rem; font-size:0.75rem; cursor:pointer;">
                Upload <input type="file" accept="image/*" data-cs-img-upload="${idx}" style="display:none;">
              </label>
              <input type="hidden" data-cs-img="${idx}" value="${sec.imageUrl || ''}">
            </div>
          </div>` : ''}
          ${sec.type === 'lista' ? `
          <div>
            <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Itens da lista (um por linha)</label>
            <textarea rows="5" data-cs-content="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem; resize:vertical;" placeholder="Item 1&#10;Item 2&#10;Item 3">${(sec.items || []).map(i => i.text).join('\n')}</textarea>
          </div>` : ''}
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Cor de fundo (opcional)</label>
              <input type="color" value="${sec.bgColor || '#1f2937'}" data-cs-bg="${idx}" style="width:100%; height:2rem; border:1px solid #374151; border-radius:0.375rem; background:none; cursor:pointer;">
            </div>
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Cor do texto (opcional)</label>
              <input type="color" value="${sec.textColor || '#f3f4f6'}" data-cs-text="${idx}" style="width:100%; height:2rem; border:1px solid #374151; border-radius:0.375rem; background:none; cursor:pointer;">
            </div>
          </div>
        </div>
      `).join('');

      personalizarContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:2rem; max-width:720px;">

          <!-- Estilo Global -->
          <div style="background:#1f2937; border:1px solid #374151; border-radius:0.75rem; padding:1.5rem;">
            <h3 style="font-size:1rem; font-weight:700; color:#c084fc; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem;">
              ✦ Estilo Visual do Site
            </h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1.25rem;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor Principal (Accent)</label>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="color" id="styleAccentColor" value="${style.accentColor || '#c9a96e'}" style="width:3rem; height:2.5rem; border:1px solid #374151; border-radius:0.5rem; background:none; cursor:pointer;">
                  <span id="styleAccentColorText" style="color:#d1d5db; font-size:0.875rem; font-family:monospace;">${style.accentColor || '#c9a96e'}</span>
                </div>
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor de Fundo</label>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="color" id="styleBgColor" value="${style.bgColor || '#fafafa'}" style="width:3rem; height:2.5rem; border:1px solid #374151; border-radius:0.5rem; background:none; cursor:pointer;">
                  <span id="styleBgColorText" style="color:#d1d5db; font-size:0.875rem; font-family:monospace;">${style.bgColor || '#fafafa'}</span>
                </div>
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Cor do Texto</label>
                <div style="display:flex; gap:0.5rem; align-items:center;">
                  <input type="color" id="styleTextColor" value="${style.textColor || '#111827'}" style="width:3rem; height:2.5rem; border:1px solid #374151; border-radius:0.5rem; background:none; cursor:pointer;">
                  <span id="styleTextColorText" style="color:#d1d5db; font-size:0.875rem; font-family:monospace;">${style.textColor || '#111827'}</span>
                </div>
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.5rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Fonte do Site</label>
                <select id="styleFontFamily" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem; font-size:0.875rem;">
                  ${FONTS.map(f => `<option value="${f.value}" ${style.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <!-- Preview da paleta -->
            <div id="stylePalettePreview" style="border-radius:0.5rem; overflow:hidden; margin-bottom:1.25rem;">
              <div style="background:${style.accentColor || '#c9a96e'}; padding:0.75rem 1rem;">
                <span style="color:white; font-weight:700; font-size:0.9rem;">Cor Principal</span>
              </div>
              <div style="background:${style.bgColor || '#fafafa'}; padding:0.75rem 1rem; border:1px solid #e5e7eb;">
                <span style="color:${style.textColor || '#111827'}; font-size:0.9rem;">Texto do site com sua paleta de cores</span>
              </div>
            </div>
            <button id="saveStyleBtn" style="background:#c084fc; color:white; padding:0.625rem 1.5rem; border:none; border-radius:0.375rem; font-weight:700; cursor:pointer;">Salvar Estilo</button>
            <button id="resetStyleBtn" style="background:none; border:1px solid #374151; color:#9ca3af; padding:0.625rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-left:0.5rem;">Resetar Padrão</button>
          </div>

          <!-- Seções Customizadas -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
              <div>
                <h3 style="font-size:1rem; font-weight:700; color:#c084fc; display:flex; align-items:center; gap:0.5rem;">
                  ✦ Seções Extras
                </h3>
                <p style="color:#6b7280; font-size:0.8rem; margin-top:0.25rem;">Crie seções adicionais para o seu site além das padrão</p>
              </div>
              <div style="position:relative;">
                <button id="addCustomSecBtn" style="background:#c084fc; color:white; padding:0.5rem 1rem; border:none; border-radius:0.375rem; font-weight:700; cursor:pointer; font-size:0.875rem;">+ Nova Seção</button>
                <div id="addCustomSecDropdown" style="display:none; position:absolute; right:0; top:110%; background:#1f2937; border:1px solid #374151; border-radius:0.5rem; padding:0.5rem; z-index:100; min-width:200px; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                  ${SECTION_TYPES.map(t => `
                    <button onclick="addCustomSection('${t.value}')" style="display:block; width:100%; text-align:left; padding:0.5rem 0.75rem; background:none; border:none; color:#d1d5db; cursor:pointer; border-radius:0.25rem; font-size:0.875rem;" onmouseenter="this.style.background='#374151'" onmouseleave="this.style.background='none'">${t.label}</button>
                  `).join('')}
                </div>
              </div>
            </div>

            <div id="customSectionsList" style="display:flex; flex-direction:column; gap:1rem;">
              ${list || `<div style="border:2px dashed #374151; border-radius:0.75rem; padding:3rem; text-align:center; color:#6b7280;">
                <p style="font-size:1.5rem; margin-bottom:0.5rem;">✦</p>
                <p style="font-weight:600; margin-bottom:0.25rem;">Nenhuma seção extra</p>
                <p style="font-size:0.875rem;">Clique em "+ Nova Seção" para adicionar</p>
              </div>`}
            </div>

            ${customSections.length > 0 ? `
              <button id="saveCustomSectionsBtn" style="background:#16a34a; color:white; padding:0.625rem 1.5rem; border:none; border-radius:0.375rem; font-weight:700; cursor:pointer; margin-top:1rem;">Salvar Seções Extras</button>
            ` : ''}
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
              <span style="color:white; font-weight:700; font-size:0.9rem;">Cor Principal</span>
            </div>
            <div style="background:${bgInput.value}; padding:0.75rem 1rem; border:1px solid #e5e7eb; border-radius:0 0 0.5rem 0.5rem;">
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
          if (!confirm('Resetar para o estilo padrão do tema?')) return;
          await apiPut('/api/site/admin/config', { siteStyle: {} });
          renderCustomList();
          liveRefresh({ siteStyle: {} });
        };
      }

      // Dropdown de novo tipo
      const addBtn = personalizarContainer.querySelector('#addCustomSecBtn');
      const dropdown = personalizarContainer.querySelector('#addCustomSecDropdown');
      if (addBtn && dropdown) {
        addBtn.onclick = (e) => {
          e.stopPropagation();
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        };
        document.addEventListener('click', () => { dropdown.style.display = 'none'; }, { once: false });
      }

      window.addCustomSection = (type) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        customSections.push({ id, type, title: 'Nova Seção', content: '', imageUrl: '', items: [], bgColor: '', textColor: '', order: customSections.length });
        renderCustomList();
      };

      window.deleteCustomSection = (idx) => {
        if (!confirm('Remover esta seção?')) return;
        customSections.splice(idx, 1);
        renderCustomList();
      };

      // Upload de imagem para seção texto-imagem
      personalizarContainer.querySelectorAll('[data-cs-img-upload]').forEach(input => {
        input.onchange = async (e) => {
          const idx = parseInt(input.dataset.csImgUpload);
          const file = e.target.files[0];
          if (!file) return;
          try {
            const result = await uploadImage(file, appState.authToken);
            customSections[idx].imageUrl = result.url;
            renderCustomList();
          } catch (err) { window.showToast?.('Erro: ' + err.message, 'error'); }
        };
      });

      // Salvar seções customizadas
      const saveCSBtn = personalizarContainer.querySelector('#saveCustomSectionsBtn');
      if (saveCSBtn) {
        saveCSBtn.onclick = async () => {
          const updated = customSections.map((sec, idx) => {
            const titleEl = personalizarContainer.querySelector(`[data-cs-title="${idx}"]`);
            const contentEl = personalizarContainer.querySelector(`[data-cs-content="${idx}"]`);
            const imgEl = personalizarContainer.querySelector(`[data-cs-img="${idx}"]`);
            const bgEl = personalizarContainer.querySelector(`[data-cs-bg="${idx}"]`);
            const textEl = personalizarContainer.querySelector(`[data-cs-text="${idx}"]`);
            const content = contentEl?.value || sec.content || '';
            const items = sec.type === 'lista' ? content.split('\n').filter(l => l.trim()).map(t => ({ text: t })) : sec.items;
            return {
              ...sec,
              title: titleEl?.value || sec.title,
              content,
              imageUrl: imgEl?.value || sec.imageUrl,
              bgColor: bgEl?.value || sec.bgColor,
              textColor: textEl?.value || sec.textColor,
              items
            };
          });
          await apiPut('/api/site/admin/config', { siteContent: { customSections: updated } });
          saveCSBtn.textContent = '✓ Salvo!';
          setTimeout(() => { saveCSBtn.textContent = 'Salvar Seções Extras'; }, 2000);
          liveRefresh({ siteContent: { customSections: updated } });
        };
      }
    };

    renderCustomList();
  };

  // --- CONTATO ---
  const renderContato = () => {
    const contatoContainer = container.querySelector('#config-contato');
    const contato = configData.siteContent?.contato || {};

    contatoContainer.innerHTML = `
      <div style="max-width:600px;">
        <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:1.5rem;">Seção de Contato</h3>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Título</label>
            <input type="text" id="contatoTitle" value="${contato.title || 'Entre em Contato'}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
          </div>

          <div>
            <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Texto</label>
            <textarea id="contatoText" rows="3" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">${contato.text || 'Gostou do meu trabalho? Entre em contato para agendar sua sessão!'}</textarea>
          </div>

          <div>
            <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Endereço (opcional)</label>
            <input type="text" id="contatoAddress" value="${contato.address || ''}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="Rua Exemplo, 123 - São Paulo/SP">
          </div>

          <button id="saveContatoBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:0.5rem;">Salvar Contato</button>
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
      await apiPut('/api/site/admin/config', { siteContent: { ...siteContent, contato: newContato } });
      clearDirty();
      // Recapturar valores originais após salvar
      captureOriginalValues('config-contato', contatoContainer);
      window.showToast?.('Contato salvo!', 'success');
      liveRefresh({ siteContent: { contato: newContato } });
    };
  };
}