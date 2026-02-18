/**
 * Tab: Meu Site (Configuração do Site Profissional)
 */

import { appState } from '../state.js';
import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath } from '../utils/helpers.js';
import { renderPortfolio } from './portfolio.js';
import { renderAlbuns } from './albuns.js';
import { renderEstudio } from './estudio.js';
import { renderFaq } from './faq.js';
import { renderNewsletter } from './newsletter.js';

export async function renderMeuSite(container) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2 style="font-size:1.5rem; font-weight:bold; color:#f3f4f6;">Meu Site Profissional</h2>
        <div style="display:flex; gap:1rem; align-items:center;">
            <button id="copySiteLink" style="background:#374151; color:#d1d5db; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer; font-size:0.875rem;">📋 Copiar Link</button>
            <a id="viewSiteLink" href="#" target="_blank" style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; text-decoration:none; font-weight:600; font-size:0.875rem;">Ver Site</a>
        </div>
      </div>

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
      </div>

      <!-- Conteúdo das Abas -->
      <div id="subTabContent">
        <!-- Geral -->
        <div id="config-geral" class="sub-tab-content">
            <div style="display:grid; gap:1rem; max-width:600px;">
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Tema do Site</label>
                    <select id="siteTheme" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                        <option value="elegante">Elegante (Clássico/Dourado/Serif)</option>
                        <option value="minimalista">Minimalista (Clean/P&B/Espaços)</option>
                        <option value="moderno">Moderno (Azul/Gradientes/Cards)</option>
                        <option value="escuro">Escuro (Dark Mode/Laranja)</option>
                        <option value="galeria">Galeria (Masonry/Foco Fotos)</option>
                    </select>
                    <p style="color:#9ca3af; font-size:0.75rem; margin-top:0.25rem;">💡 Altere o tema e clique em "Ver Site" para testar cada estilo</p>
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Título do Site (SEO)</label>
                    <input type="text" id="siteTitle" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Descrição (Meta Description)</label>
                    <textarea id="siteDesc" rows="2" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;"></textarea>
                </div>
                <hr style="border-color:#374151; margin:1rem 0;">
                <h4 style="color:#f3f4f6; font-weight:600;">Hero (Topo)</h4>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Título Principal</label>
                    <input type="text" id="heroTitle" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Subtítulo</label>
                    <input type="text" id="heroSubtitle" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Imagem de Fundo</label>
                    <div style="display:flex; gap:1rem; align-items:center;">
                        <img id="heroPreview" src="" style="width:100px; height:60px; object-fit:cover; background:#374151; border-radius:0.25rem;">
                        <label style="background:#2563eb; color:white; padding:0.5rem 1rem; border-radius:0.375rem; cursor:pointer; font-size:0.875rem;">
                            Upload
                            <input type="file" id="heroUpload" accept="image/*" style="display:none;">
                        </label>
                    </div>
                    <input type="hidden" id="heroImage">
                </div>
                <hr style="border-color:#374151; margin:1rem 0;">
                <h4 style="color:#f3f4f6; font-weight:600;">Contato & Redes</h4>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">WhatsApp (com DDD)</label>
                    <input type="text" id="siteWhatsapp" placeholder="+55 11 99999-9999" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <div>
                    <label style="display:block; color:#d1d5db; font-size:0.875rem; margin-bottom:0.25rem;">Instagram URL</label>
                    <input type="text" id="siteInsta" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:white; border-radius:0.375rem;">
                </div>
                <button id="saveGeralBtn" style="background:#16a34a; color:white; padding:0.75rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:1rem;">Salvar Configurações</button>
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
      </div>
    </div>
  `;

  // Carregar dados
  let configData = {};
  try {
    configData = await apiGet('/api/site/admin/config');
  } catch (e) { console.error(e); }

  // Preencher campos
  const { siteEnabled, siteTheme, siteConfig = {}, siteContent = {} } = configData;

  // Status Toggle
  const toggle = container.querySelector('#siteEnabledToggle');
  toggle.checked = siteEnabled;
  toggle.onchange = async () => {
    await apiPut('/api/site/admin/config', { siteEnabled: toggle.checked });
  };

  // Links - usar _tenant do URL atual ou 'fs' como fallback
  const currentTenant = new URLSearchParams(window.location.search).get('_tenant') || 'fs';
  const siteUrl = `${window.location.origin}/site?_tenant=${currentTenant}`;
  container.querySelector('#viewSiteLink').href = siteUrl;
  container.querySelector('#copySiteLink').onclick = () => {
    navigator.clipboard.writeText(siteUrl);
    alert('Link copiado!');
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
        }
    };
  });

  // --- GERAL ---
  container.querySelector('#siteTheme').value = siteTheme || 'elegante';
  container.querySelector('#siteTitle').value = siteConfig.title || '';
  container.querySelector('#siteDesc').value = siteConfig.description || '';
  container.querySelector('#heroTitle').value = siteConfig.heroTitle || '';
  container.querySelector('#heroSubtitle').value = siteConfig.heroSubtitle || '';
  container.querySelector('#heroImage').value = siteConfig.heroImage || '';
  if(siteConfig.heroImage) container.querySelector('#heroPreview').src = resolveImagePath(siteConfig.heroImage);
  container.querySelector('#siteWhatsapp').value = siteConfig.whatsapp || '';
  container.querySelector('#siteInsta').value = siteConfig.instagramUrl || '';

  container.querySelector('#heroUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const res = await uploadImage(file, appState.authToken); // Reusing generic upload for hero
    container.querySelector('#heroImage').value = res.url;
    container.querySelector('#heroPreview').src = resolveImagePath(res.url);
  };

  container.querySelector('#saveGeralBtn').onclick = async () => {
    const payload = {
        siteTheme: container.querySelector('#siteTheme').value,
        siteConfig: {
            ...siteConfig,
            title: container.querySelector('#siteTitle').value,
            description: container.querySelector('#siteDesc').value,
            heroTitle: container.querySelector('#heroTitle').value,
            heroSubtitle: container.querySelector('#heroSubtitle').value,
            heroImage: container.querySelector('#heroImage').value,
            whatsapp: container.querySelector('#siteWhatsapp').value,
            instagramUrl: container.querySelector('#siteInsta').value
        }
    };
    await apiPut('/api/site/admin/config', payload);
    alert('Salvo!');
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
      alert('Salvo!');
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
        alert('Erro no upload: ' + error.message);
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
      alert('Hero salvo!');
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
    const siteSections = configData.siteSections || ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
    const allSections = [
      { id: 'hero', label: 'Hero / Capa' },
      { id: 'sobre', label: 'Sobre Mim' },
      { id: 'portfolio', label: 'Portfólio' },
      { id: 'servicos', label: 'Serviços' },
      { id: 'depoimentos', label: 'Depoimentos' },
      { id: 'contato', label: 'Contato' }
    ];

    secoesContainer.innerHTML = `
      <div style="max-width:600px;">
        <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6; margin-bottom:0.5rem;">Seções do Site</h3>
        <p style="color:#9ca3af; margin-bottom:1.5rem; font-size:0.875rem;">Marque as seções que deseja exibir no site público.</p>

        <div id="sectionsList" style="display:flex; flex-direction:column; gap:0.75rem;">
          ${allSections.map(sec => {
            const checked = siteSections.includes(sec.id) ? 'checked' : '';
            return `
              <label style="display:flex; align-items:center; gap:0.75rem; background:#1f2937; padding:0.75rem 1rem; border-radius:0.5rem; border:1px solid #374151; cursor:pointer; transition:all 0.2s;">
                <input type="checkbox" value="${sec.id}" ${checked} style="width:18px; height:18px; cursor:pointer;">
                <span style="color:#f3f4f6; font-weight:500;">${sec.label}</span>
              </label>
            `;
          }).join('')}
        </div>

        <button id="saveSectionsBtn" style="background:#16a34a; color:white; padding:0.75rem 1.5rem; border:none; border-radius:0.375rem; font-weight:600; cursor:pointer; margin-top:1.5rem;">Salvar Seções</button>
      </div>
    `;

    secoesContainer.querySelector('#saveSectionsBtn').onclick = async () => {
      const selected = [];
      secoesContainer.querySelectorAll('input:checked').forEach(cb => selected.push(cb.value));
      await apiPut('/api/site/admin/config', { siteSections: selected });
      alert('Seções salvas!');
      configData.siteSections = selected;
    };
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
          alert('Serviços salvos!');
          configData.siteContent.servicos = updated;
        };
      }
    };

    renderList();
  };

  // --- DEPOIMENTOS ---
  const renderDepoimentos = () => {
    const depoContainer = container.querySelector('#config-depoimentos');
    const depoimentos = configData.siteContent?.depoimentos || [];

    const renderList = () => {
      const list = depoimentos.map((dep, idx) => `
        <div style="background:#1f2937; padding:1rem; border-radius:0.5rem; border:1px solid #374151;">
          <div style="display:grid; gap:0.75rem;">
            <div style="display:grid; grid-template-columns:1fr auto; gap:0.5rem; align-items:start;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Nome do Cliente</label>
                <input type="text" value="${dep.name || ''}" data-dep-name="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
              <button onclick="deleteDepoimento(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.25rem; padding:0.25rem;" title="Remover">🗑️</button>
            </div>
            <div>
              <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Depoimento</label>
              <textarea rows="3" data-dep-text="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">${dep.text || ''}</textarea>
            </div>
            <div style="display:grid; grid-template-columns:1fr auto; gap:0.75rem;">
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Foto do Cliente (URL)</label>
                <input type="text" value="${dep.photo || ''}" data-dep-photo="${idx}" style="width:100%; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;" placeholder="URL da foto">
              </div>
              <div>
                <label style="display:block; color:#9ca3af; font-size:0.75rem; margin-bottom:0.25rem;">Nota (1-5)</label>
                <input type="number" min="1" max="5" value="${dep.rating || 5}" data-dep-rating="${idx}" style="width:80px; padding:0.5rem; background:#111827; border:1px solid #374151; color:#f3f4f6; border-radius:0.375rem;">
              </div>
            </div>
          </div>
        </div>
      `).join('');

      depoContainer.innerHTML = `
        <div style="max-width:700px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
            <div>
              <h3 style="font-size:1.125rem; font-weight:600; color:#f3f4f6;">Depoimentos</h3>
              <p style="color:#9ca3af; font-size:0.875rem;">Adicione depoimentos de clientes satisfeitos</p>
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
        depoimentos.push({ name: 'Cliente', text: '', photo: '', rating: 5 });
        renderList();
      };

      window.deleteDepoimento = (idx) => {
        if (!confirm('Remover este depoimento?')) return;
        depoimentos.splice(idx, 1);
        renderList();
      };

      const saveBtn = depoContainer.querySelector('#saveDepoimentosBtn');
      if (saveBtn) {
        saveBtn.onclick = async () => {
          const updated = [];
          depoimentos.forEach((_, idx) => {
            updated.push({
              name: depoContainer.querySelector(`[data-dep-name="${idx}"]`)?.value || '',
              text: depoContainer.querySelector(`[data-dep-text="${idx}"]`)?.value || '',
              photo: depoContainer.querySelector(`[data-dep-photo="${idx}"]`)?.value || '',
              rating: parseInt(depoContainer.querySelector(`[data-dep-rating="${idx}"]`)?.value || 5)
            });
          });
          await apiPut('/api/site/admin/config', { siteContent: { ...siteContent, depoimentos: updated } });
          alert('Depoimentos salvos!');
          configData.siteContent.depoimentos = updated;
        };
      }
    };

    renderList();
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
      alert('Contato salvo!');
      configData.siteContent.contato = newContato;
    };
  };
}