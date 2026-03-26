/**
 * Tab: Meu Site (Configuração do Site Profissional)
 */

import { appState } from '../state.js';
import { apiGet, apiPut, apiPost, apiDelete } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';
import { renderPortfolio } from './portfolio.js';
import { renderAlbuns } from './albuns.js';
import { renderEstudio } from './estudio.js';
import { renderFaq } from './faq.js';
import { renderNewsletter } from './newsletter.js';

export async function renderMeuSite(container) {
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

      <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151; display:flex; align-items:center; justify-content:space-between;">
        <div>
            <h3 style="color:#f3f4f6; font-weight:600;">Status do Site</h3>
            <p style="color:#9ca3af; font-size:0.875rem;">Quando desativado, exibe uma página de "Em breve".</p>
        </div>
        <label style="position:relative; display:inline-block; width:3.5rem; height:1.75rem;">
            <input type="checkbox" id="siteEnabledToggle" style="opacity:0; width:0; height:0;">
            <span style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#374151; transition:.4s; border-radius:9999px;"></span>
            <span style="position:absolute; content:''; height:1.25rem; width:1.25rem; left:0.25rem; bottom:0.25rem; background-color:white; transition:.4s; border-radius:50%;" id="toggleKnob"></span>
        </label>
        <style>
            #siteEnabledToggle:checked + span { background-color: #16a34a; }
            #siteEnabledToggle:checked + span + span { transform: translateX(1.75rem); }
        </style>
      </div>

      <!-- Tabs de Navegação Interna -->
      <div style="display:flex; gap:0.5rem; border-bottom:1px solid #374151; padding-bottom:0.5rem; overflow-x:auto;">
        <button class="sub-tab-btn active" data-target="config-geral" style="background:none; border:none; color:#f3f4f6; padding:0.5rem 1rem; cursor:pointer; border-bottom:2px solid #2563eb;">Geral</button>
        <button class="sub-tab-btn" data-target="config-secoes" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Seções</button>
        <button class="sub-tab-btn" data-target="config-hero" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Hero</button>
        <button class="sub-tab-btn" data-target="config-sobre" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Sobre</button>
        <button class="sub-tab-btn" data-target="config-portfolio" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Portfólio</button>
        <button class="sub-tab-btn" data-target="config-servicos" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Serviços</button>
        <button class="sub-tab-btn" data-target="config-depoimentos" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Depoimentos</button>
        <button class="sub-tab-btn" data-target="config-albuns" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Álbuns</button>
        <button class="sub-tab-btn" data-target="config-estudio" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Estúdio</button>
        <button class="sub-tab-btn" data-target="config-contato" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Contato</button>
        <button class="sub-tab-btn" data-target="config-faq" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">FAQ</button>
        <button class="sub-tab-btn" data-target="config-newsletter" style="background:none; border:none; color:#9ca3af; padding:0.5rem 1rem; cursor:pointer;">Newsletter</button>
        <button class="sub-tab-btn" data-target="config-personalizar" style="background:none; border:none; color:#c084fc; padding:0.5rem 1rem; cursor:pointer; font-weight:600;">✦ Personalizar</button>
      </div>

      <!-- Conteúdo das Abas -->
      <div id="subTabContent">
        <!-- Geral -->
        <div id="config-geral" class="sub-tab-content">
            <div style="display:flex; flex-direction:column; gap:2rem;">
                <div>
                    <h3 style="color:#f3f4f6; font-weight:600; font-size:1.125rem; margin-bottom:0.5rem;">Escolha o Tema do Seu Site</h3>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:1.5rem;">Clique em <strong style="color:#d1d5db;">👁️ Visualizar</strong> para ver como seu site ficará com cada tema. Quando decidir, clique no card e salve.</p>
                    <div id="templateGallery" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:1rem; margin-bottom:2rem;">
                        <!-- Templates inseridos via JS -->
                    </div>
                    <input type="hidden" id="siteTheme">
                </div>
                <div style="max-width:300px;">
                    <button id="saveGeralBtn" style="width:100%; background:#16a34a; color:white; padding:0.75rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">Salvar Tema</button>
                </div>
            </div>
        </div>

        <!-- Seções (Ativar/Desativar) -->
        <div id="config-secoes" class="sub-tab-content" style="display:none;"></div>

        <!-- Hero -->
        <div id="config-hero" class="sub-tab-content" style="display:none;"></div>

        <!-- Sobre (mantém versão simplificada para site.js) -->
        <div id="config-sobre" class="sub-tab-content" style="display:none;">
            <div style="display:grid; gap:1rem; max-width:600px;">
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Título</label>
                    <input type="text" id="sobreTitle" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Texto</label>
                    <textarea id="sobreText" rows="6" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;"></textarea>
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Foto</label>
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <img id="sobrePreview" src="" style="width:80px; height:80px; object-fit:cover; background:#374151; border-radius:50%;">
                        <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem;">
                            Upload
                            <input type="file" id="sobreUpload" accept="image/*" style="display:none;">
                        </label>
                    </div>
                    <input type="hidden" id="sobreImage">
                </div>
                <button id="saveSobreBtn" style="background:#16a34a; color:white; padding:0.75rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:1rem;">Salvar Sobre</button>
            </div>
        </div>

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

        <!-- Newsletter (renderizado pelo newsletter.js) -->
        <div id="config-newsletter" class="sub-tab-content" style="display:none;"></div>

        <!-- Personalizar -->
        <div id="config-personalizar" class="sub-tab-content" style="display:none;"></div>
      </div>
    </div>
  `;

  // Carregar dados
  let configData = {};
  try {
    configData = await apiGet('/api/site/admin/config');
  } catch (e) { console.error(e); }

  // Buscar slug da organização para montar URLs de preview
  let orgSlug = new URLSearchParams(window.location.search).get('_tenant') || '';
  if (!orgSlug) {
    try {
      const profile = await apiGet('/api/organization/profile');
      orgSlug = profile.slug || '';
    } catch (e) { /* usa fallback vazio */ }
  }

  // Preencher campos
  const { siteEnabled, siteTheme, siteConfig = {}, siteContent = {} } = configData;

  // Tema selecionado no momento (pode mudar sem salvar)
  let selectedTheme = siteTheme || 'elegante';

  // Renderizar galeria de templates
  const templates = [
    { id: 'elegante',    name: 'Elegante',    desc: 'Clássico com dourado e serif',    colors: ['#c9a962', '#2c2c2c', '#f5f5f5'] },
    { id: 'minimalista', name: 'Minimalista', desc: 'Clean com muito espaço branco',   colors: ['#000000', '#666666', '#ffffff'] },
    { id: 'moderno',     name: 'Moderno',     desc: 'Azul com gradientes e cards',     colors: ['#3b82f6', '#667eea', '#f8fafc'] },
    { id: 'escuro',      name: 'Escuro',      desc: 'Dark mode com laranja',           colors: ['#ff9500', '#0a0a0a', '#1a1a1a'] },
    { id: 'galeria',     name: 'Galeria',     desc: 'Masonry grid foco em fotos',      colors: ['#8b7355', '#2c2c2c', '#fafafa'] }
  ];

  function buildPreviewUrl(themeId) {
    const base = `${window.location.origin}/site?_preview_theme=${themeId}`;
    return orgSlug ? `${base}&_tenant=${orgSlug}` : base;
  }

  function renderTemplateCards() {
    const templateGallery = container.querySelector('#templateGallery');
    templateGallery.innerHTML = templates.map(t => {
      const isActive = siteTheme === t.id;
      const isSelected = selectedTheme === t.id;
      const borderColor = isSelected ? '#2563eb' : '#374151';
      return `
        <div class="template-card" data-theme="${t.id}" style="
          background:#1f2937;
          border:2px solid ${borderColor};
          border-radius:0.5rem;
          padding:1rem;
          cursor:pointer;
          transition:all 0.2s;
          position:relative;
          display:flex;
          flex-direction:column;
          gap:0.5rem;
        ">
          ${isActive ? '<div style="position:absolute; top:0.5rem; right:0.5rem; background:#16a34a; color:white; padding:0.2rem 0.5rem; border-radius:0.25rem; font-size:0.7rem; font-weight:700;">✓ Ativo</div>' : ''}
          ${isSelected && !isActive ? '<div style="position:absolute; top:0.5rem; right:0.5rem; background:#2563eb; color:white; padding:0.2rem 0.5rem; border-radius:0.25rem; font-size:0.7rem; font-weight:700;">Selecionado</div>' : ''}

          <div style="height:100px; background:linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%); border-radius:0.375rem; display:flex; align-items:center; justify-content:center; color:${t.colors[2]}; font-size:1.75rem; font-weight:bold; opacity:0.85;">
            ${t.name[0]}
          </div>

          <div style="display:flex; gap:0.25rem;">
            ${t.colors.map(c => `<div style="width:0.875rem; height:0.875rem; background:${c}; border-radius:50%; border:1px solid #374151;"></div>`).join('')}
          </div>

          <h4 style="color:#f3f4f6; font-weight:600; font-size:0.9rem; margin:0;">${t.name}</h4>
          <p style="color:#9ca3af; font-size:0.75rem; margin:0;">${t.desc}</p>

          <a href="${buildPreviewUrl(t.id)}" target="_blank" rel="noopener"
            onclick="event.stopPropagation()"
            style="display:block; text-align:center; margin-top:0.25rem; padding:0.375rem; background:#374151; color:#d1d5db; border-radius:0.375rem; font-size:0.75rem; font-weight:600; text-decoration:none; transition:background 0.15s;"
            onmouseenter="this.style.background='#4b5563'"
            onmouseleave="this.style.background='#374151'">
            👁️ Visualizar
          </a>
        </div>
      `;
    }).join('');

    // Click nos cards — seleciona sem salvar
    container.querySelectorAll('.template-card').forEach(card => {
      card.onclick = () => {
        selectedTheme = card.dataset.theme;
        container.querySelector('#siteTheme').value = selectedTheme;
        renderTemplateCards(); // re-renderiza com novo estado visual
      };

      card.onmouseenter = () => {
        if (card.dataset.theme !== selectedTheme) {
          card.style.borderColor = '#60a5fa';
          card.style.transform = 'translateY(-2px)';
        }
      };
      card.onmouseleave = () => {
        if (card.dataset.theme !== selectedTheme) {
          card.style.borderColor = '#374151';
          card.style.transform = 'translateY(0)';
        }
      };
    });
  }

  renderTemplateCards();
  container.querySelector('#siteTheme').value = selectedTheme;

  // Status Toggle
  const toggle = container.querySelector('#siteEnabledToggle');
  toggle.checked = siteEnabled;
  toggle.onchange = async () => {
    await apiPut('/api/site/admin/config', { siteEnabled: toggle.checked });
    window.builderScheduleRefresh?.();
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

  // Navegação de Abas
  const tabs = container.querySelectorAll('.sub-tab-btn');
  const contents = container.querySelectorAll('.sub-tab-content');
  tabs.forEach(btn => {
    btn.onclick = () => {
        tabs.forEach(t => { t.style.borderBottom = 'none'; t.style.color = '#9ca3af'; });
        btn.style.borderBottom = '2px solid #2563eb';
        btn.style.color = '#f3f4f6';
        contents.forEach(c => c.style.display = 'none');
        const targetContainer = container.querySelector(`#${btn.dataset.target}`);
        targetContainer.style.display = 'block';

        // Renderizar conteúdo específico de cada tab
        if (btn.dataset.target === 'config-secoes') {
          renderSecoes();
        } else if (btn.dataset.target === 'config-hero') {
          renderHeroStudio();
        } else if (btn.dataset.target === 'config-portfolio') {
          renderPortfolio(targetContainer);
        } else if (btn.dataset.target === 'config-servicos') {
          renderServicos();
        } else if (btn.dataset.target === 'config-depoimentos') {
          renderDepoimentos();
        } else if (btn.dataset.target === 'config-albuns') {
          renderAlbuns(targetContainer);
        } else if (btn.dataset.target === 'config-estudio') {
          renderEstudio(targetContainer);
        } else if (btn.dataset.target === 'config-contato') {
          renderContato();
        } else if (btn.dataset.target === 'config-faq') {
          renderFaq(targetContainer);
        } else if (btn.dataset.target === 'config-newsletter') {
          renderNewsletter(targetContainer);
        } else if (btn.dataset.target === 'config-personalizar') {
          renderPersonalizar();
        }
    };
  });

  // Builder mode: mirror sub-tab nav into #builder-props-tabs
  if (isBuilder && builderTabsEl) {
    // Hide the inline nav row (it stays in the DOM but is not needed visually)
    const inlineNav = container.querySelector('div[style*="border-bottom:1px solid #374151"][style*="overflow-x:auto"]');
    if (inlineNav) inlineNav.style.display = 'none';

    // Build compact tab buttons in the builder panel header
    builderTabsEl.innerHTML = '';
    container.querySelectorAll('.sub-tab-btn').forEach(btn => {
      const label = btn.textContent.trim();
      const target = btn.dataset.target;
      const bBtn = document.createElement('button');
      bBtn.className = 'builder-tab-btn' + (btn.classList.contains('active') ? ' active' : '');
      bBtn.textContent = label;
      bBtn.dataset.target = target;
      bBtn.onclick = () => {
        // Delegate click to the hidden sub-tab button
        const original = container.querySelector(`.sub-tab-btn[data-target="${target}"]`);
        if (original) original.click();
        // Update active state on builder tabs
        builderTabsEl.querySelectorAll('.builder-tab-btn').forEach(b => b.classList.remove('active'));
        bBtn.classList.add('active');
      };
      builderTabsEl.appendChild(bBtn);
    });
  }

  // --- GERAL ---
  container.querySelector('#saveGeralBtn').onclick = async () => {
    const newTheme = container.querySelector('#siteTheme').value;
    await apiPut('/api/site/admin/config', { siteTheme: newTheme });
    configData.siteTheme = newTheme;
    selectedTheme = newTheme;
    renderTemplateCards();
    window.showToast?.('Tema salvo!', 'success');
    window.builderScheduleRefresh?.();
  };

  // --- SOBRE ---
  const sobre = siteContent.sobre || {};
  container.querySelector('#sobreTitle').value = sobre.title || '';
  container.querySelector('#sobreText').value = sobre.text || '';
  container.querySelector('#sobreImage').value = sobre.image || '';
  if(sobre.image) container.querySelector('#sobrePreview').src = resolveImagePath(sobre.image);
  
  container.querySelector('#sobreUpload').onchange = async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const res = await uploadImage(file, appState.authToken);
      container.querySelector('#sobreImage').value = res.url;
      container.querySelector('#sobrePreview').src = resolveImagePath(res.url);
  };

  container.querySelector('#saveSobreBtn').onclick = async () => {
      const newSobre = {
          title: container.querySelector('#sobreTitle').value,
          text: container.querySelector('#sobreText').value,
          image: container.querySelector('#sobreImage').value
      };
      await apiPut('/api/site/admin/config', { siteContent: { ...siteContent, sobre: newSobre } });
      window.showToast?.('Salvo!', 'success');
      window.builderScheduleRefresh?.();
  };

  // --- HERO ---
  // Renderizar Hero Studio completo
  const renderHeroStudio = () => {
    const heroContainer = container.querySelector('#config-hero');
    const cfg = siteConfig || {};

    // Estilos CSS injetados
    const styles = `
      <style>
        #config-hero .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        #config-hero .custom-scrollbar::-webkit-scrollbar-track { background: #111827; }
        #config-hero .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
        #config-hero .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
        #config-hero details > summary { list-style: none; outline: none; }
        #config-hero details > summary::-webkit-details-marker { display: none; }
        #config-hero details[open] > summary { border-bottom: 1px solid #374151; }
        #config-hero .range-group { display: flex; align-items: center; gap: 0.5rem; }
        #config-hero .range-label { font-size: 0.75rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; margin-bottom: 0.25rem; }
        #config-hero .range-val { font-size: 0.75rem; font-family: monospace; color: #f3f4f6; min-width: 3rem; text-align: right; }
      </style>
    `;

    heroContainer.innerHTML = `
      ${styles}
      <div style="display:flex; height:calc(100vh - 200px); margin:-1rem; overflow:hidden; background:#020617; border-radius:0.5rem; border:1px solid #374151;">

        <!-- SIDEBAR -->
        <div class="custom-scrollbar" style="width:350px; background:#111827; border-right:1px solid #374151; display:flex; flex-direction:column; flex-shrink:0; overflow-y:auto;">

          <div style="padding:1.5rem; border-bottom:1px solid #374151; position:sticky; top:0; background:#111827; z-index:10;">
            <h2 style="font-size:1.25rem; font-weight:bold; color:#f3f4f6;">Hero Studio</h2>
            <p style="font-size:0.75rem; color:#9ca3af;">Personalize a capa do site</p>
          </div>

          <div style="padding:1.5rem; display:flex; flex-direction:column; gap:1rem;">

            <!-- 1. TEXTOS -->
            <details open style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
              <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
                Textos
                <span style="font-size:0.75rem;">▼</span>
              </summary>
              <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
                <div>
                  <label class="range-label">Titulo Principal</label>
                  <input type="text" id="heroStudioTitle" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" value="${cfg.heroTitle || ''}">
                </div>
                <div>
                  <label class="range-label">Subtitulo</label>
                  <input type="text" id="heroStudioSubtitle" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;" value="${cfg.heroSubtitle || ''}">
                </div>
              </div>
            </details>

            <!-- 2. IMAGEM -->
            <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
              <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
                Imagem
                <span style="font-size:0.75rem;">▼</span>
              </summary>
              <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
                <label style="background:#2563eb; color:white; padding:0.75rem; border-radius:0.375rem; font-size:0.875rem; font-weight:600; cursor:pointer; text-align:center; display:block;">
                  Substituir Imagem
                  <input type="file" id="heroStudioImage" accept="image/*" style="display:none;">
                </label>
                <div id="heroStudioUploadProgress"></div>

                <div>
                  <div class="range-group"><label class="range-label" style="flex:1">Zoom</label><span id="heroStudioScaleValue" class="range-val"></span></div>
                  <input type="range" id="heroStudioScale" min="0.5" max="2" step="0.05" value="${cfg.heroScale ?? 1}" style="width:100%;">
                </div>
                <input type="hidden" id="heroStudioPosX" value="${cfg.heroPosX ?? 50}">
                <input type="hidden" id="heroStudioPosY" value="${cfg.heroPosY ?? 50}">
              </div>
            </details>

            <!-- 3. POSICAO TITULO -->
            <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
              <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
                Título
                <span style="font-size:0.75rem;">▼</span>
              </summary>
              <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
                <input type="hidden" id="heroStudioTitlePosX" value="${cfg.titlePosX ?? 50}">
                <input type="hidden" id="heroStudioTitlePosY" value="${cfg.titlePosY ?? 40}">
                <div>
                  <label class="range-label">Tamanho (px)</label>
                  <input type="number" id="heroStudioTitleFontSize" min="10" max="200" step="1" value="${cfg.titleFontSize ?? 80}" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
                </div>
              </div>
            </details>

            <!-- 4. POSICAO SUBTITULO -->
            <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
              <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
                Subtítulo
                <span style="font-size:0.75rem;">▼</span>
              </summary>
              <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
                <input type="hidden" id="heroStudioSubtitlePosX" value="${cfg.subtitlePosX ?? 50}">
                <input type="hidden" id="heroStudioSubtitlePosY" value="${cfg.subtitlePosY ?? 55}">
                <div>
                  <label class="range-label">Tamanho (px)</label>
                  <input type="number" id="heroStudioSubtitleFontSize" min="10" max="100" step="1" value="${cfg.subtitleFontSize ?? 40}" style="width:100%; padding:0.5rem; border:1px solid #374151; border-radius:0.375rem; background:#111827; color:#f3f4f6;">
                </div>
              </div>
            </details>

            <!-- 5. EFEITOS -->
            <details style="border:1px solid #374151; border-radius:0.5rem; background:#1f2937; overflow:hidden;">
              <summary style="padding:1rem; cursor:pointer; font-weight:600; color:#d1d5db; display:flex; justify-content:space-between; align-items:center; background:#2d3748;">
                Efeitos
                <span style="font-size:0.75rem;">▼</span>
              </summary>
              <div style="padding:1rem; display:flex; flex-direction:column; gap:1rem;">
                <div>
                  <div class="range-group"><label class="range-label" style="flex:1">Overlay</label><span id="heroStudioOverlayVal" class="range-val"></span></div>
                  <input type="range" id="heroStudioOverlayOpacity" min="0" max="80" step="5" value="${cfg.overlayOpacity ?? 30}" style="width:100%;">
                </div>
                <div>
                  <div class="range-group"><label class="range-label" style="flex:1">Barra Sup.</label><span id="heroStudioTopBarVal" class="range-val"></span></div>
                  <input type="range" id="heroStudioTopBarHeight" min="0" max="20" step="1" value="${cfg.topBarHeight ?? 0}" style="width:100%;">
                </div>
                <div>
                  <div class="range-group"><label class="range-label" style="flex:1">Barra Inf.</label><span id="heroStudioBottomBarVal" class="range-val"></span></div>
                  <input type="range" id="heroStudioBottomBarHeight" min="0" max="20" step="1" value="${cfg.bottomBarHeight ?? 0}" style="width:100%;">
                </div>
              </div>
            </details>

          </div>

          <div style="padding:1.5rem; border-top:1px solid #374151; background:#111827; margin-top:auto;">
            <button id="saveHeroStudioBtn" style="width:100%; background:#2563eb; color:white; padding:1rem; border-radius:0.5rem; border:none; font-weight:bold; cursor:pointer; text-transform:uppercase; letter-spacing:0.05em; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
              Salvar Design
            </button>
          </div>
        </div>

        <!-- PREVIEW AREA -->
        <div style="flex:1; background:#020617; display:flex; flex-direction:column; position:relative;">

          <!-- Toolbar -->
          <div style="padding:1rem; display:flex; justify-content:center; gap:0.5rem; position:absolute; top:0; left:0; right:0; z-index:20; pointer-events:none;">
            <div style="background:rgba(17,24,39,0.8); backdrop-filter:blur(4px); padding:0.25rem; border-radius:0.5rem; border:1px solid #374151; pointer-events:auto; display:flex; gap:0.25rem;">
              <button id="heroPreviewDesktop" style="background:#374151; color:white; border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Desktop</button>
              <button id="heroPreviewMobile" style="background:transparent; color:#9ca3af; border:none; padding:0.375rem 0.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:500;">Mobile</button>
            </div>
          </div>

          <!-- Canvas Wrapper -->
          <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:2rem; overflow:hidden;">
            <div id="heroStudioPreview" style="border:1px solid #374151; border-radius:0.75rem; width:100%; background:#000; overflow:hidden; position:relative; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); container-type: inline-size; transition: all 0.3s ease; box-sizing: border-box;">
              <p style="text-align:center; color:#9ca3af; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">Carregando Preview...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Refs
    const previewContainer = heroContainer.querySelector('#heroStudioPreview');
    const btnDesktop = heroContainer.querySelector('#heroPreviewDesktop');
    const btnMobile = heroContainer.querySelector('#heroPreviewMobile');
    let previewMode = 'desktop';
    let heroImageUrl = cfg.heroImage || '';

    btnDesktop.onclick = () => {
      previewMode = 'desktop';
      btnDesktop.style.background = '#374151';
      btnDesktop.style.color = 'white';
      btnMobile.style.background = 'transparent';
      btnMobile.style.color = '#9ca3af';
      handleHeroResize();
    };

    btnMobile.onclick = () => {
      previewMode = 'mobile';
      btnMobile.style.background = '#374151';
      btnMobile.style.color = 'white';
      btnDesktop.style.background = 'transparent';
      btnDesktop.style.color = '#9ca3af';
      handleHeroResize();
    };

    const titleInput = heroContainer.querySelector('#heroStudioTitle');
    const subtitleInput = heroContainer.querySelector('#heroStudioSubtitle');
    const imageInput = heroContainer.querySelector('#heroStudioImage');
    const scaleInput = heroContainer.querySelector('#heroStudioScale');
    const posXInput = heroContainer.querySelector('#heroStudioPosX');
    const posYInput = heroContainer.querySelector('#heroStudioPosY');
    const titlePosXInput = heroContainer.querySelector('#heroStudioTitlePosX');
    const titlePosYInput = heroContainer.querySelector('#heroStudioTitlePosY');
    const titleFSInput = heroContainer.querySelector('#heroStudioTitleFontSize');
    const subtitlePosXInput = heroContainer.querySelector('#heroStudioSubtitlePosX');
    const subtitlePosYInput = heroContainer.querySelector('#heroStudioSubtitlePosY');
    const subtitleFSInput = heroContainer.querySelector('#heroStudioSubtitleFontSize');
    const overlayInput = heroContainer.querySelector('#heroStudioOverlayOpacity');
    const topBarInput = heroContainer.querySelector('#heroStudioTopBarHeight');
    const bottomBarInput = heroContainer.querySelector('#heroStudioBottomBarHeight');

    // Bind sliders to display values
    const sliderBindings = [
      [scaleInput, heroContainer.querySelector('#heroStudioScaleValue'), v => parseFloat(v).toFixed(2) + 'x'],
      [overlayInput, heroContainer.querySelector('#heroStudioOverlayVal'), v => v + '%'],
      [topBarInput, heroContainer.querySelector('#heroStudioTopBarVal'), v => v + '%'],
      [bottomBarInput, heroContainer.querySelector('#heroStudioBottomBarVal'), v => v + '%'],
    ];

    sliderBindings.forEach(([input, display, format]) => {
      input.oninput = () => {
        display.textContent = format(input.value);
        updateHeroPreview();
      };
      // Inicializar display
      display.textContent = format(input.value);
    });

    // Listeners para inputs ocultos (atualizados via drag and drop)
    [posXInput, posYInput, titlePosXInput, titlePosYInput, subtitlePosXInput, subtitlePosYInput].forEach(input => {
      input.oninput = updateHeroPreview;
    });

    titleInput.oninput = updateHeroPreview;
    subtitleInput.oninput = updateHeroPreview;
    titleFSInput.oninput = updateHeroPreview;
    subtitleFSInput.oninput = updateHeroPreview;

    // Upload
    imageInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const result = await uploadImage(file, appState.authToken, (percent) => {
          showUploadProgress('heroStudioUploadProgress', percent);
        });
        heroImageUrl = result.url;
        updateHeroPreview();
        e.target.value = '';
      } catch (error) {
        window.showToast?.('Erro: ' + error.message, 'error');
      }
    };

    // Salvar
    heroContainer.querySelector('#saveHeroStudioBtn').onclick = async () => {
      const newHeroConfig = {
        ...siteConfig,
        heroTitle: titleInput.value,
        heroSubtitle: subtitleInput.value,
        heroImage: heroImageUrl,
        heroScale: parseFloat(scaleInput.value),
        heroPosX: parseInt(posXInput.value),
        heroPosY: parseInt(posYInput.value),
        titlePosX: parseInt(titlePosXInput.value),
        titlePosY: parseInt(titlePosYInput.value),
        titleFontSize: parseInt(titleFSInput.value),
        subtitlePosX: parseInt(subtitlePosXInput.value),
        subtitlePosY: parseInt(subtitlePosYInput.value),
        subtitleFontSize: parseInt(subtitleFSInput.value),
        overlayOpacity: parseInt(overlayInput.value),
        topBarHeight: parseInt(topBarInput.value),
        bottomBarHeight: parseInt(bottomBarInput.value)
      };
      await apiPut('/api/site/admin/config', { siteConfig: newHeroConfig });
      window.showToast?.('Hero salvo!', 'success');
      window.builderScheduleRefresh?.();
    };

    function updateHeroPreview() {
      const preview = heroContainer.querySelector('#heroStudioPreview');
      const image = heroImageUrl;
      const scale = parseFloat(scaleInput.value);
      const px = parseInt(posXInput.value);
      const py = parseInt(posYInput.value);
      const tpx = parseInt(titlePosXInput.value);
      const tpy = parseInt(titlePosYInput.value);
      const tfs = parseInt(titleFSInput.value);
      const spx = parseInt(subtitlePosXInput.value);
      const spy = parseInt(subtitlePosYInput.value);
      const sfs = parseInt(subtitleFSInput.value);
      const overlay = parseInt(overlayInput.value);
      const topBar = parseInt(topBarInput.value);
      const bottomBar = parseInt(bottomBarInput.value);

      const windowW = window.innerWidth;
      const titleMaxW = (800 / windowW) * 100;
      const subMaxW = (600 / windowW) * 100;
      const titleFontSizeCqw = (tfs / windowW) * 100;
      const subFontSizeCqw = (sfs / windowW) * 100;
      const titleMinCqw = (28 / windowW) * 100;
      const subMinCqw = (14 / windowW) * 100;

      const imgHtml = image ? `<img src="${resolveImagePath(image)}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:${px}% ${py}%; transform:scale(${scale}); transform-origin:${px}% ${py}%; pointer-events:none; user-select:none;">` : '';

      preview.innerHTML = `
        ${imgHtml}
        <div data-type="bg" style="position:absolute; inset:0; background:rgba(0,0,0,${overlay/100}); cursor:move;"></div>
        <div style="position:absolute; top:0; left:0; right:0; height:${topBar}%; background:#000; z-index:2; pointer-events:none;"></div>
        <div style="position:absolute; bottom:0; left:0; right:0; height:${bottomBar}%; background:#000; z-index:2; pointer-events:none;"></div>
        <h1 data-type="title" style="position:absolute; left:${tpx}%; top:${tpy}%; transform:translate(-50%,-50%); color:white; font-family:'Playfair Display',serif; font-size:clamp(${titleMinCqw}cqw, 6cqw, ${titleFontSizeCqw}cqw); font-weight:bold; text-align:center; text-shadow:2px 2px 4px rgba(0,0,0,0.7); z-index:3; line-height:1.15; width:100%; max-width:min(90cqw, ${titleMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${titleInput.value || ''}</h1>
        <p data-type="subtitle" style="position:absolute; left:${spx}%; top:${spy}%; transform:translate(-50%,-50%); color:#e5e7eb; font-size:clamp(${subMinCqw}cqw, 3.5cqw, ${subFontSizeCqw}cqw); text-align:center; text-shadow:1px 1px 2px rgba(0,0,0,0.7); z-index:3; line-height:1.6; width:100%; max-width:min(90cqw, ${subMaxW}cqw); white-space:normal; cursor:move; user-select:none; border:1px dashed rgba(255,255,255,0.3); padding:0.5rem;">${subtitleInput.value || ''}</p>
      `;
    }

    const handleHeroResize = () => {
      if (!document.body.contains(previewContainer)) {
        window.removeEventListener('resize', handleHeroResize);
        return;
      }
      if (previewMode === 'mobile') {
        previewContainer.style.aspectRatio = '9/16';
        previewContainer.style.width = '300px';
        previewContainer.style.margin = '0 auto';
      } else {
        previewContainer.style.aspectRatio = '16/9';
        previewContainer.style.width = '100%';
        previewContainer.style.margin = '0';
      }
      updateHeroPreview();
    };
    window.addEventListener('resize', handleHeroResize);
    handleHeroResize();

    // Drag and Drop Logic
    let isDragging = false;
    let dragType = null;
    let startX = 0;
    let startY = 0;
    let initialVals = {};

    previewContainer.addEventListener('mousedown', (e) => {
      const target = e.target;
      const type = target.getAttribute('data-type');

      if (type) {
        isDragging = true;
        dragType = type;
        startX = e.clientX;
        startY = e.clientY;

        if (type === 'title') {
          initialVals = { x: parseInt(titlePosXInput.value), y: parseInt(titlePosYInput.value) };
        } else if (type === 'subtitle') {
          initialVals = { x: parseInt(subtitlePosXInput.value), y: parseInt(subtitlePosYInput.value) };
        } else if (type === 'bg') {
          initialVals = { x: parseInt(posXInput.value), y: parseInt(posYInput.value) };
        }

        e.preventDefault();
      }
    });

    const heroMouseMove = (e) => {
      if (!isDragging) return;

      const rect = previewContainer.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const deltaPctX = (deltaX / rect.width) * 100;
      const deltaPctY = (deltaY / rect.height) * 100;

      let newX = initialVals.x + deltaPctX;
      let newY = initialVals.y + deltaPctY;

      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      if (dragType === 'title') {
        titlePosXInput.value = Math.round(newX);
        titlePosYInput.value = Math.round(newY);
      } else if (dragType === 'subtitle') {
        subtitlePosXInput.value = Math.round(newX);
        subtitlePosYInput.value = Math.round(newY);
      } else if (dragType === 'bg') {
        posXInput.value = Math.round(newX);
        posYInput.value = Math.round(newY);
      }

      titlePosXInput.dispatchEvent(new Event('input'));
    };

    const heroMouseUp = () => {
      isDragging = false;
      dragType = null;
    };

    window.addEventListener('mousemove', heroMouseMove);
    window.addEventListener('mouseup', heroMouseUp);

    // Renderizar preview inicial
    updateHeroPreview();
  };

  // --- SEÇÕES (Ativar/Desativar) ---
  const renderSecoes = () => {
    const secoesContainer = container.querySelector('#config-secoes');
    const allSectionDefs = [
      { id: 'hero', label: 'Hero / Capa' },
      { id: 'sobre', label: 'Sobre Mim' },
      { id: 'portfolio', label: 'Portfólio' },
      { id: 'albuns', label: 'Álbuns' },
      { id: 'estudio', label: 'Estúdio' },
      { id: 'servicos', label: 'Serviços' },
      { id: 'depoimentos', label: 'Depoimentos' },
      { id: 'faq', label: 'FAQ' },
      { id: 'newsletter', label: 'Newsletter' },
      { id: 'contato', label: 'Contato' }
    ];

    // Ordem atual: ativas primeiro (na ordem salva), depois inativas
    const saved = configData.siteSections || ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
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
                  style="display:flex; align-items:center; gap:0.75rem; background:${active ? '#1f2937' : '#161e2a'}; padding:0.75rem 1rem; border-radius:0.5rem; border:1px solid ${active ? '#374151' : '#1f2937'}; transition:all 0.15s; user-select:none;">
                  <span style="cursor:grab; color:#6b7280; font-size:1.1rem; flex-shrink:0;">⠿</span>
                  <input type="checkbox" data-sec-check="${sec.id}" ${active ? 'checked' : ''} style="width:16px; height:16px; cursor:pointer; flex-shrink:0;" onchange="toggleSection('${sec.id}')">
                  <span style="flex:1; color:${active ? '#f3f4f6' : '#6b7280'}; font-weight:500; font-size:0.875rem;">${sec.label}</span>
                  <div style="display:flex; gap:0.25rem;">
                    <button onclick="moveSection(${idx}, -1)" style="background:#374151; border:none; color:#9ca3af; width:1.75rem; height:1.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.875rem;" ${idx === 0 ? 'disabled style="opacity:0.3;background:#374151;border:none;color:#9ca3af;width:1.75rem;height:1.75rem;border-radius:0.25rem;cursor:not-allowed;font-size:0.875rem;"' : ''}>▲</button>
                    <button onclick="moveSection(${idx}, 1)" style="background:#374151; border:none; color:#9ca3af; width:1.75rem; height:1.75rem; border-radius:0.25rem; cursor:pointer; font-size:0.875rem;" ${idx === ordered.length - 1 ? 'disabled style="opacity:0.3;background:#374151;border:none;color:#9ca3af;width:1.75rem;height:1.75rem;border-radius:0.25rem;cursor:not-allowed;font-size:0.875rem;"' : ''}>▼</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <button id="saveSectionsBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:1.25rem;">Salvar Seções</button>
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

      // Drag & drop
      let dragIdx = null;
      secoesContainer.querySelectorAll('.sec-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          dragIdx = parseInt(item.dataset.secIdx);
          item.style.opacity = '0.5';
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; });
        item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetIdx = parseInt(item.dataset.secIdx);
          if (dragIdx === null || dragIdx === targetIdx) return;
          const moved = ordered.splice(dragIdx, 1)[0];
          ordered.splice(targetIdx, 0, moved);
          dragIdx = null;
          renderList();
        });
      });

      // Salvar
      secoesContainer.querySelector('#saveSectionsBtn').onclick = async () => {
        const selected = ordered.filter(s => activeSet.has(s.id)).map(s => s.id);
        await apiPut('/api/site/admin/config', { siteSections: selected });
        window.showToast?.('Seções salvas!', 'success');
        configData.siteSections = selected;
        window.builderScheduleRefresh?.();
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
                <input type="text" value="${srv.title || ''}" data-srv-title="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
              <button onclick="deleteServico(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.25rem; padding:0.25rem;" title="Remover">🗑️</button>
            </div>
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Descrição</label>
              <textarea rows="2" data-srv-desc="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">${srv.description || ''}</textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Ícone (emoji)</label>
                <input type="text" value="${srv.icon || '📸'}" data-srv-icon="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="📸">
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Preço (opcional)</label>
                <input type="text" value="${srv.price || ''}" data-srv-price="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="R$ 500">
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
        renderList();
      };

      window.deleteServico = (idx) => {
        if (!confirm('Remover este serviço?')) return;
        servicos.splice(idx, 1);
        renderList();
      };

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
          window.showToast?.('Serviços salvos!', 'success');
          configData.siteContent.servicos = updated;
          window.builderScheduleRefresh?.();
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
    } catch(e) {}

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
      } catch(e) { window.showToast?.('Erro: ' + e.message, 'error'); }
    };

    window.rejeitarDepoimento = async (id) => {
      if (!confirm('Rejeitar e apagar este depoimento?')) return;
      try {
        await apiDelete(`/api/site/admin/depoimentos-pendentes/${id}`);
        pendentes = pendentes.filter(p => p.id !== id);
        renderDepoimentos();
      } catch(e) { window.showToast?.('Erro: ' + e.message, 'error'); }
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

          ${depoimentos.length > 0 ? '<button id="saveDepoimentosBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer;">Salvar Depoimentos</button>' : ''}
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

      window.deleteDepoimento = (idx) => {
        if (!confirm('Remover este depoimento?')) return;
        depoimentos.splice(idx, 1);
        renderList();
      };

      const saveBtn = depoContainer.querySelector('#saveDepoimentosBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
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
          window.showToast?.('Depoimentos salvos!', 'success');
          configData.siteContent.depoimentos = updated;
          window.builderScheduleRefresh?.();
        };
      }
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

      if (accentInput) accentInput.oninput = updatePalettePreview;
      if (bgInput) bgInput.oninput = updatePalettePreview;
      if (textInput) textInput.oninput = updatePalettePreview;

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
          configData.siteStyle = newStyle;
          saveStyleBtn.textContent = '✓ Salvo!';
          setTimeout(() => { saveStyleBtn.textContent = 'Salvar Estilo'; }, 2000);
          window.builderScheduleRefresh?.();
        };
      }

      // Resetar estilo
      const resetStyleBtn = personalizarContainer.querySelector('#resetStyleBtn');
      if (resetStyleBtn) {
        resetStyleBtn.onclick = async () => {
          if (!confirm('Resetar para o estilo padrão do tema?')) return;
          await apiPut('/api/site/admin/config', { siteStyle: {} });
          configData.siteStyle = {};
          renderCustomList();
          window.builderScheduleRefresh?.();
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
          configData.siteContent = configData.siteContent || {};
          configData.siteContent.customSections = updated;
          saveCSBtn.textContent = '✓ Salvo!';
          setTimeout(() => { saveCSBtn.textContent = 'Salvar Seções Extras'; }, 2000);
          window.builderScheduleRefresh?.();
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

    contatoContainer.querySelector('#saveContatoBtn').onclick = async () => {
      const newContato = {
        title: contatoContainer.querySelector('#contatoTitle').value,
        text: contatoContainer.querySelector('#contatoText').value,
        address: contatoContainer.querySelector('#contatoAddress').value
      };
      await apiPut('/api/site/admin/config', { siteContent: { ...siteContent, contato: newContato } });
      window.showToast?.('Contato salvo!', 'success');
      configData.siteContent.contato = newContato;
      window.builderScheduleRefresh?.();
    };
  };
}