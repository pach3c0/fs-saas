import { apiRequest, saasToast, saasConfirm, esc, getToken } from '../core.js';

let _dtHeroImageUrl = '';
let _themeBgUrls = {
  elegante: '',
  minimalista: '',
  moderno: '',
  escuro: '',
  galeria: ''
};

async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || file.size === 0 || !file.type.match(/image\/(jpeg|png|webp|gif)/i)) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      resolve(file);
    }
  });
}

const SECTION_OPTIONS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];

async function loadTemplatesEditor() {
  const el = document.getElementById('tabTemplates');
  if (!el) return;
  el.innerHTML = '<div class="loading">Carregando editor de template padrão...</div>';

  try {
    const res = await apiRequest('GET', '/api/site/default-template');
    const tmpl = res.template || {};
    renderTemplatesEditor(el, tmpl);
  } catch (err) {
    el.innerHTML = `<div class="loading" style="color:#f87171">Erro ao carregar: ${err.message}</div>`;
  }
}

function renderTemplatesEditor(container, tmpl) {
  const cfg = tmpl.siteConfig || {};
  const cnt = tmpl.siteContent || {};
  const servicos = cnt.servicos || [];
  const faq = cnt.faq || [];
  const sections = tmpl.siteSections || [];
  _dtHeroImageUrl = cfg.heroImage || '';

  const cfgThemeBgs = tmpl.siteStyle?.themeBackgrounds || {};
  _themeBgUrls = {
    elegante: cfgThemeBgs.elegante || '',
    minimalista: cfgThemeBgs.minimalista || '',
    moderno: cfgThemeBgs.moderno || '',
    escuro: cfgThemeBgs.escuro || '',
    galeria: cfgThemeBgs.galeria || ''
  };

  const _svcItem = (s, i) => `
    <div class="dt-svc-item" data-idx="${i}" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-svc-icon" value="${esc(s.icon || '📸')}" style="width:2.5rem; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem; font-size:1rem; text-align:center;">
        <input class="dt-svc-title" placeholder="Título do Serviço" value="${esc(s.title || '')}" style="flex:1; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button type="button" class="dt-svc-remove" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <input class="dt-svc-desc" placeholder="Descrição curta" value="${esc(s.description || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
      <input class="dt-svc-price" placeholder="Preço (ex: A partir de R$ 350)" value="${esc(s.price || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
    </div>`;

  const _faqItem = (f, i) => `
    <div class="dt-faq-item" data-idx="${i}" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-faq-q" placeholder="Pergunta" value="${esc(f.question || '')}" style="flex:1; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button type="button" class="dt-faq-remove" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <textarea class="dt-faq-a" placeholder="Resposta" rows="2" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem; resize:vertical;">${esc(f.answer || '')}</textarea>
    </div>`;

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.5rem; padding-bottom:3rem; max-width:850px; margin:0 auto;">
      <div>
        <h2 style="font-size:1.2rem; font-weight:700; color:var(--text-primary); margin:0;">Template Padrão da Plataforma</h2>
        <p style="font-size:0.78rem; color:var(--text-secondary); margin:0.25rem 0 1rem;">
          Configure o conteúdo inicial padrão que é aplicado automaticamente em novos fotógrafos cadastrados e que pode ser restaurado por eles.
        </p>
      </div>

      <!-- Seção: Hero -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Capa / Hero Inicial</h3>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título do Hero</label>
          <input id="dt-heroTitle" value="${esc(cfg.heroTitle || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none;">
        </div>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Subtítulo do Hero</label>
          <input id="dt-heroSubtitle" value="${esc(cfg.heroSubtitle || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none;">
        </div>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Imagem de Fundo do Hero</label>
          <div id="dt-heroImgPreview" style="width:100%; height:10rem; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; margin-bottom:0.5rem; overflow:hidden; display:flex; align-items:center; justify-content:center; position:relative;">
            ${cfg.heroImage
              ? `<img src="${cfg.heroImage}" style="width:100%; height:100%; object-fit:cover;">`
              : `<span style="color:var(--text-muted); font-size:0.8rem;">Sem imagem configurada</span>`}
          </div>
          <div id="dt-heroBgStatus" style="font-size:0.72rem; color:var(--text-secondary); margin-bottom:0.5rem;"></div>
          <div style="display:flex; gap:0.5rem;">
            <label class="btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;">
              Enviar Imagem
              <input type="file" id="dt-heroBgFile" accept="image/*" style="display:none;" onchange="window.uploadDtHeroImage(this)">
            </label>
            <button type="button" class="btn" onclick="window.removeDtHeroImage()" style="color:var(--red); border-color:transparent; background:rgba(248,81,73,0.12);">Remover</button>
          </div>
        </div>
      </div>

      <!-- Seção: Sobre -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Seção Sobre</h3>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título — Sobre</label>
          <input id="dt-sobreTitle" value="${esc(cnt.sobre?.title || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none;">
        </div>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Texto — Sobre</label>
          <textarea id="dt-sobreText" rows="3" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; resize:vertical; outline:none;">${esc(cnt.sobre?.text || '')}</textarea>
        </div>
      </div>

      <!-- Seção: Contato -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Seção Contato</h3>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Título — Contato</label>
          <input id="dt-contatoTitle" value="${esc(cnt.contato?.title || '')}" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none;">
        </div>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Texto — Contato</label>
          <textarea id="dt-contatoText" rows="2" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; resize:vertical; outline:none;">${esc(cnt.contato?.text || '')}</textarea>
        </div>
      </div>

      <!-- Seção: Serviços de Exemplo -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">
          <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0;">Serviços de Exemplo</h3>
          <button type="button" class="btn btn-approve" onclick="window.addDtSvc()">+ Adicionar Serviço</button>
        </div>
        <div id="dt-svcList">${servicos.map(_svcItem).join('')}</div>
      </div>

      <!-- Seção: FAQ de Exemplo -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">
          <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0;">Perguntas Frequentes (FAQ) de Exemplo</h3>
          <button type="button" class="btn btn-approve" onclick="window.addDtFaq()">+ Adicionar Pergunta</button>
        </div>
        <div id="dt-faqList">${faq.map(_faqItem).join('')}</div>
      </div>

      <!-- Seção: Seções default -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Seções Ativas por Padrão</h3>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          ${SECTION_OPTIONS.map(s => `
            <label style="display:flex; align-items:center; gap:0.375rem; cursor:pointer; background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; padding:0.4rem 0.75rem;">
              <input type="checkbox" class="dt-section-chk" value="${s}" ${sections.includes(s) ? 'checked' : ''} style="cursor:pointer;">
              <span style="color:var(--text-primary); font-size:0.8rem; font-weight:500;">${esc(s)}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Imagens de Fundo dos Temas -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Imagens de Fundo dos Temas (Galeria de Meu Site)</h3>
        <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">
          Envie as imagens de fundo que aparecerão nos cards de seleção de tema para os fotógrafos no painel deles.
        </p>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1.25rem; margin-top:0.5rem;">
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
              <div style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.5rem; padding:0.75rem; display:flex; flex-direction:column; gap:0.65rem; text-align:center; align-items:center; justify-content:center; box-sizing:border-box;">
                
                <!-- Preview Card (Prioridade para Imagem no topo - altura 150px) -->
                <div id="dt-themeBgPreview-${themeId}" class="template-card builder-theme-card" 
                     style="width: 100%; height: 150px; border-radius: var(--radius-lg, 0.5rem); background-size: cover; background-position: center; border: 1px solid var(--border); position: relative; overflow: hidden; ${currentImg ? `background-image: url('${currentImg}');` : 'background: rgba(49, 53, 60, 0.3);'}">
                </div>

                <!-- Letreiros e Cores fora do card (Centralizados e abaixo da imagem) -->
                <div style="display:flex; flex-direction:column; gap:0.35rem; text-align:center; align-items:center; justify-content:center; width:100%;">
                  <strong style="color:var(--text-primary); font-size:0.9rem; display:block; text-align:center; margin:0;">${themeName}</strong>
                  
                  <!-- Cores do Tema (Centralizadas) -->
                  <div style="display:flex; gap:0.25rem; justify-content:center; align-items:center;">
                    ${themeColors.map(c => `<div style="width:0.65rem; height:0.65rem; background:${c}; border-radius:50%; border:1px solid rgba(255,255,255,0.15); box-shadow: 0 1px 2px rgba(0,0,0,0.20);"></div>`).join('')}
                  </div>
                </div>

                <div id="dt-themeBgStatus-${themeId}" style="font-size:0.72rem; color:var(--text-secondary); text-align:center;"></div>

                <!-- Ações (Centralizadas) -->
                <div style="display:flex; gap:0.5rem; align-items:center; justify-content:center; flex-wrap:wrap; margin-top:0.15rem; width:100%;" class="dt-theme-actions">
                  <label class="btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem; padding:0.35rem 0.75rem;">
                    <span>${hasImage ? 'Trocar' : 'Upload'}</span>
                    <input type="file" class="dt-themeBgFile" data-theme="${themeId}" accept="image/*" style="display:none;" onchange="window.uploadDtThemeBg(this, '${themeId}')">
                  </label>
                  ${hasImage ? `
                    <button type="button" class="btn" onclick="window.removeDtThemeBg('${themeId}')" style="color:var(--red); border-color:transparent; background:rgba(248,81,73,0.12); padding:0.35rem 0.75rem;">
                      Remover
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Configurações Secreta de Administração -->
      <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:0.5rem; padding:1.25rem; display:flex; flex-direction:column; gap:1rem;">
        <h3 style="font-size:0.95rem; font-weight:600; color:var(--text-primary); margin:0; border-bottom:1px solid var(--border); padding-bottom:0.5rem;">Confirmação de Acesso</h3>
        <div>
          <label style="color:var(--text-secondary); font-size:0.8rem; display:block; margin-bottom:0.375rem;">Chave de Administrador *</label>
          <input id="dt-adminKey" type="password" placeholder="Chave secreta PLATFORM_ADMIN_KEY do servidor" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.375rem; padding:0.5rem 0.75rem; font-size:0.875rem; outline:none;">
        </div>
      </div>

      <button type="button" onclick="window.saveDefaultTemplate()" style="background:var(--accent); color:var(--accent-on); font-weight:700; border:none; padding:0.75rem 1.5rem; border-radius:0.375rem; cursor:pointer; font-size:0.9rem; align-self:flex-start; transition:filter 0.15s;" onmouseenter="this.style.filter='brightness(0.92)'" onmouseleave="this.style.filter='none'">Salvar como Padrão</button>
    </div>`;

  // Bind removals initially
  _bindRemove(container.querySelector('#dt-svcList'), '.dt-svc-remove', '.dt-svc-item');
  _bindRemove(container.querySelector('#dt-faqList'), '.dt-faq-remove', '.dt-faq-item');
}

function _bindRemove(list, btnSel, itemSel) {
  list.querySelectorAll(btnSel).forEach(btn => {
    btn.onclick = () => btn.closest(itemSel).remove();
  });
}

// Global window functions to support HTML inline events
window.addDtSvc = () => {
  const list = document.getElementById('dt-svcList');
  if (!list) return;
  const idx = list.querySelectorAll('.dt-svc-item').length;
  const itemHtml = `
    <div class="dt-svc-item" data-idx="${idx}" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-svc-icon" value="📸" style="width:2.5rem; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem; font-size:1rem; text-align:center;">
        <input class="dt-svc-title" placeholder="Título do Serviço" value="" style="flex:1; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button type="button" class="dt-svc-remove" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <input class="dt-svc-desc" placeholder="Descrição curta" value="" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
      <input class="dt-svc-price" placeholder="Preço (ex: A partir de R$ 350)" value="" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem;">
    </div>`;
  list.insertAdjacentHTML('beforeend', itemHtml);
  _bindRemove(list, '.dt-svc-remove', '.dt-svc-item');
};

window.addDtFaq = () => {
  const list = document.getElementById('dt-faqList');
  if (!list) return;
  const idx = list.querySelectorAll('.dt-faq-item').length;
  const itemHtml = `
    <div class="dt-faq-item" data-idx="${idx}" style="background:var(--bg-elevated); border:1px solid var(--border); border-radius:0.375rem; padding:0.625rem; display:flex; flex-direction:column; gap:0.375rem; margin-bottom:0.5rem;">
      <div style="display:flex; gap:0.5rem;">
        <input class="dt-faq-q" placeholder="Pergunta" value="" style="flex:1; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.85rem;">
        <button type="button" class="dt-faq-remove" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1rem; padding:0 0.25rem;">✕</button>
      </div>
      <textarea class="dt-faq-a" placeholder="Resposta" rows="2" style="width:100%; box-sizing:border-box; background:var(--input-bg); border:1px solid var(--border); color:var(--text-primary); border-radius:0.25rem; padding:0.25rem 0.5rem; font-size:0.8rem; resize:vertical; outline:none;"></textarea>
    </div>`;
  list.insertAdjacentHTML('beforeend', itemHtml);
  _bindRemove(list, '.dt-faq-remove', '.dt-faq-item');
};

// Upload hero image via /api/admin/upload (SaaS Admin router)
window.uploadDtHeroImage = async (input) => {
  const file = input.files && input.files[0];
  if (!file) return;

  if (!file.type.match(/image\/(jpeg|png|webp|gif)/i)) {
    saasToast('Apenas imagens JPEG, PNG, WebP ou GIF são permitidas', 'error');
    input.value = '';
    return;
  }

  const statusEl = document.getElementById('dt-heroBgStatus');
  if (statusEl) statusEl.textContent = 'Comprimindo imagem...';

  try {
    const compressed = await compressImage(file, 1600, 0.85);
    if (statusEl) statusEl.textContent = 'Enviando imagem...';

    const fd = new FormData();
    fd.append('image', compressed, file.name);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: fd
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

    _dtHeroImageUrl = json.url;
    const previewEl = document.getElementById('dt-heroImgPreview');
    if (previewEl) {
      previewEl.innerHTML = `<img src="${json.url}" style="width:100%; height:100%; object-fit:cover;">`;
    }
    saasToast('Imagem de capa enviada com sucesso!', 'success');
  } catch (err) {
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    if (statusEl) statusEl.textContent = '';
    input.value = '';
  }
};

window.removeDtHeroImage = () => {
  _dtHeroImageUrl = '';
  const previewEl = document.getElementById('dt-heroImgPreview');
  if (previewEl) {
    previewEl.innerHTML = `<span style="color:var(--text-muted); font-size:0.8rem;">Sem imagem configurada</span>`;
  }
};

// Upload theme bg images
window.uploadDtThemeBg = async (input, themeId) => {
  const file = input.files && input.files[0];
  if (!file) return;

  if (!file.type.match(/image\/(jpeg|png|webp|gif)/i)) {
    saasToast('Apenas imagens JPEG, PNG, WebP ou GIF são permitidas', 'error');
    input.value = '';
    return;
  }

  const statusEl = document.getElementById(`dt-themeBgStatus-${themeId}`);
  if (statusEl) statusEl.textContent = 'Comprimindo...';

  try {
    const compressed = await compressImage(file, 1200, 0.85);
    if (statusEl) statusEl.textContent = 'Enviando...';

    const fd = new FormData();
    fd.append('image', compressed, file.name);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: fd
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);

    _themeBgUrls[themeId] = json.url;

    // Atualiza preview real do card
    const previewEl = document.getElementById(`dt-themeBgPreview-${themeId}`);
    if (previewEl) {
      previewEl.style.backgroundImage = `url('${json.url}')`;
    }

    // Re-renderiza botões de ação para ter o botão Remover
    const actionsContainer = input.closest('.dt-theme-actions');
    if (actionsContainer) {
      actionsContainer.innerHTML = `
        <label class="btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;">
          <span>Trocar</span>
          <input type="file" class="dt-themeBgFile" data-theme="${themeId}" accept="image/*" style="display:none;" onchange="window.uploadDtThemeBg(this, '${themeId}')">
        </label>
        <button type="button" class="btn" onclick="window.removeDtThemeBg('${themeId}')" style="color:var(--red); border-color:transparent; background:rgba(248,81,73,0.12);">
          Remover
        </button>
      `;
    }
    saasToast(`Fundo do tema ${themeId} enviado!`, 'success');
  } catch (err) {
    saasToast('Erro no upload: ' + err.message, 'error');
  } finally {
    if (statusEl) statusEl.textContent = '';
  }
};

window.removeDtThemeBg = (themeId) => {
  _themeBgUrls[themeId] = '';

  const previewEl = document.getElementById(`dt-themeBgPreview-${themeId}`);
  if (previewEl) {
    previewEl.style.backgroundImage = '';
    previewEl.style.background = 'rgba(49, 53, 60, 0.3)';
  }

  const actionsContainer = previewEl ? previewEl.parentElement.querySelector('.dt-theme-actions') : null;
  if (actionsContainer) {
    actionsContainer.innerHTML = `
      <label class="btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;">
        <span>Upload</span>
        <input type="file" class="dt-themeBgFile" data-theme="${themeId}" accept="image/*" style="display:none;" onchange="window.uploadDtThemeBg(this, '${themeId}')">
      </label>
    `;
  }
  saasToast(`Fundo do tema ${themeId} removido.`, 'success');
};

// Salvar como padrão via PUT /api/site/default-template
window.saveDefaultTemplate = async () => {
  const container = document.getElementById('tabTemplates');
  if (!container) return;

  const svcItems = [...container.querySelectorAll('.dt-svc-item')].map(item => ({
    icon: item.querySelector('.dt-svc-icon').value,
    title: item.querySelector('.dt-svc-title').value,
    description: item.querySelector('.dt-svc-desc').value,
    price: item.querySelector('.dt-svc-price').value
  }));

  const faqItems = [...container.querySelectorAll('.dt-faq-item')].map((item, i) => ({
    id: `faq-${i + 1}`,
    question: item.querySelector('.dt-faq-q').value,
    answer: item.querySelector('.dt-faq-a').value
  }));

  const checkedSections = [...container.querySelectorAll('.dt-section-chk:checked')].map(c => c.value);
  const adminKey = container.querySelector('#dt-adminKey').value.trim();
  
  if (!adminKey) {
    saasToast('Insira a Chave de Administrador.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/site/default-template', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        'X-Admin-Key': adminKey
      },
      body: JSON.stringify({
        siteConfig: {
          heroTitle: container.querySelector('#dt-heroTitle').value,
          heroSubtitle: container.querySelector('#dt-heroSubtitle').value,
          heroImage: _dtHeroImageUrl
        },
        siteContent: {
          sobre: { title: container.querySelector('#dt-sobreTitle').value, text: container.querySelector('#dt-sobreText').value },
          contato: { title: container.querySelector('#dt-contatoTitle').value, text: container.querySelector('#dt-contatoText').value },
          servicos: svcItems,
          faq: faqItems
        },
        siteStyle: {
          themeBackgrounds: _themeBgUrls
        },
        siteSections: checkedSections
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao salvar template padrão');
    saasToast('Template padrão da plataforma salvo com sucesso!', 'success');
  } catch (err) {
    saasToast('Erro: ' + err.message, 'error');
  }
};

export { loadTemplatesEditor };
