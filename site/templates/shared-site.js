/**
 * site.js - Compartilhado entre todos os templates
 * Carrega dados da API e preenche elementos do DOM
 */

// Detectar tenant pelo subdomínio ou ?_tenant=slug
function buildApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('_tenant');
  if (tenantParam) {
    return '/api/site/config?_tenant=' + encodeURIComponent(tenantParam);
  }
  return '/api/site/config';
}

// Carregar dados da API
async function loadAndRenderSite() {
  try {
    const res = await fetch(buildApiUrl());
    if (!res.ok) throw new Error('Erro ' + res.status);
    const data = await res.json();

    // Verificar se site está ativado
    if (!data.siteEnabled) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;font-family:sans-serif;"><h1>' + (data.name || 'Site em construção') + '</h1><p>Estamos preparando algo especial para você.</p></div>';
      return;
    }

    // Renderizar site
    renderSite(data);
  } catch (e) {
    console.error('Erro ao carregar site:', e);
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;font-family:sans-serif;"><h1>Site em construção</h1><p>Volte em breve.</p></div>';
  }
}

function applyCustomStyle(siteStyle) {
  if (!siteStyle) return;
  const root = document.documentElement;
  if (siteStyle.accentColor) root.style.setProperty('--accent', siteStyle.accentColor);
  if (siteStyle.bgColor)     root.style.setProperty('--bg', siteStyle.bgColor);
  if (siteStyle.textColor)   root.style.setProperty('--text', siteStyle.textColor);
  if (siteStyle.fontFamily) {
    root.style.setProperty('--font-body', siteStyle.fontFamily);
    document.body.style.fontFamily = siteStyle.fontFamily;
    // Injetar fonte do Google Fonts se necessário
    const fontName = siteStyle.fontFamily.replace(/'/g, '').split(',')[0].trim();
    if (fontName && !['Inter','Playfair Display'].includes(fontName)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }
}

function renderSite(data) {
  const config = data.siteConfig || {};
  const content = data.siteContent || {};
  const sections = data.siteSections || [];

  // Aplicar estilo personalizado
  applyCustomStyle(data.siteStyle);

  // Helper para escapar HTML
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Helper para resolver path de imagem
  function resolvePath(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url;
  }

  // Preencher meta tags
  if (config.title) {
    document.title = config.title;
    const title = document.getElementById('siteTitle');
    if (title) title.textContent = config.title;
  }

  if (config.description) {
    const desc = document.getElementById('siteMeta');
    if (desc) desc.setAttribute('content', config.description);
  }

  // Preencher Nav
  const navLogo = document.getElementById('navLogo');
  if (navLogo) navLogo.textContent = data.name || 'Estúdio';

  const navLinks = document.getElementById('navLinks');
  if (navLinks) {
    const labels = {hero: 'Início', sobre: 'Sobre', portfolio: 'Portfólio', albuns: 'Álbuns', estudio: 'Estúdio', servicos: 'Serviços', depoimentos: 'Depoimentos', faq: 'FAQ', newsletter: 'Newsletter', contato: 'Contato'};
    const standardLinks = sections.map(s => `<a href="#section-${s}">${labels[s] || s}</a>`);
    // Adicionar seções customizadas ao nav
    const customLinks = (content.customSections || []).map(sec =>
      `<a href="#section-custom-${sec.id}">${esc(sec.title)}</a>`
    );
    navLinks.innerHTML = [...standardLinks, ...customLinks].join('');
  }

  // Preencher Hero
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle) heroTitle.textContent = config.heroTitle || 'Eternizando Momentos';

  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) heroSubtitle.textContent = config.heroSubtitle || 'Fotografia profissional';

  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    if (config.heroImage) {
      const scale = config.heroScale || 1;
      const posX = config.heroPosX ?? 50;
      const posY = config.heroPosY ?? 50;
      heroBg.style.backgroundImage = `url('${resolvePath(config.heroImage)}')`;
      heroBg.style.backgroundPosition = `${posX}% ${posY}%`;
      heroBg.style.backgroundSize = `${scale * 100}%`;
    } else {
      // Placeholder: gradiente neutro escuro sem foto pessoal
      heroBg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  // Overlay e barras decorativas
  const heroOverlay = document.getElementById('heroOverlay');
  if (heroOverlay) {
    heroOverlay.style.background = `rgba(0,0,0,${(config.overlayOpacity ?? 30) / 100})`;
  }
  const heroTopBar = document.getElementById('heroTopBar');
  if (heroTopBar) {
    heroTopBar.style.height = `${config.topBarHeight ?? 0}%`;
  }
  const heroBottomBar = document.getElementById('heroBottomBar');
  if (heroBottomBar) {
    heroBottomBar.style.height = `${config.bottomBarHeight ?? 0}%`;
  }

  // Tamanho de fonte do título e subtítulo
  const heroTitleEl = document.getElementById('heroTitle');
  if (heroTitleEl && config.titleFontSize) {
    heroTitleEl.style.fontSize = `clamp(1rem, ${config.titleFontSize / window.innerWidth * 100}vw, ${config.titleFontSize}px)`;
  }
  const heroSubtitleEl = document.getElementById('heroSubtitle');
  if (heroSubtitleEl && config.subtitleFontSize) {
    heroSubtitleEl.style.fontSize = `clamp(0.875rem, ${config.subtitleFontSize / window.innerWidth * 100}vw, ${config.subtitleFontSize}px)`;
  }

  // Preencher Sobre
  const sobreTitle = document.getElementById('sobreTitle');
  if (sobreTitle) sobreTitle.textContent = content.sobre?.title || 'Sobre';

  const sobreText = document.getElementById('sobreText');
  if (sobreText) sobreText.textContent = content.sobre?.text || '';

  const sobreImage = document.getElementById('sobreImage');
  if (sobreImage) {
    const sobreImageUrl = content.sobre?.image || (content.sobre?.images?.[0]?.image) || '';
    if (sobreImageUrl) {
      sobreImage.src = resolvePath(sobreImageUrl);
    } else {
      sobreImage.style.background = '#1f2937';
      sobreImage.style.minHeight = '200px';
      sobreImage.alt = 'Sua foto aqui';
    }
  }

  // Preencher Portfolio
  const portfolioGrid = document.getElementById('portfolioGrid');
  if (portfolioGrid) {
    const photos = content.portfolio?.photos;
    if (photos && photos.length > 0) {
      portfolioGrid.innerHTML = photos.map((p, i) => {
        const photoUrl = resolvePath(p.url || p.image || p);
        return `<img src="${photoUrl}" alt="Portfolio ${i+1}" onclick="openLightbox(${i})" loading="lazy">`;
      }).join('');
    } else {
      // Placeholder neutro: grade de quadrados cinza com ícone de câmera
      portfolioGrid.innerHTML = Array.from({ length: 6 }, (_, i) => `
        <div style="aspect-ratio:3/4; background:#1a1a1a; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.5rem; border:2px dashed #333;">
          <span style="font-size:2rem; opacity:0.3;">📷</span>
          <span style="font-size:0.75rem; color:#555; text-align:center;">Sua foto aqui</span>
        </div>
      `).join('');
    }
  }

  // Preencher Serviços
  const servicosGrid = document.getElementById('servicosGrid');
  if (servicosGrid && content.servicos) {
    servicosGrid.innerHTML = content.servicos.map(s => `
      <div class="servico-card">
        <div class="servico-icon">${s.icon || '📸'}</div>
        <div class="servico-info">
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
        </div>
        ${s.price ? `<div class="servico-price">R$ ${esc(s.price)}</div>` : ''}
      </div>
    `).join('');
  }

  // Preencher Depoimentos
  const depoimentosTrack = document.getElementById('depoimentosTrack');
  if (depoimentosTrack && content.depoimentos) {
    depoimentosTrack.innerHTML = content.depoimentos.map(d => `
      <div class="depoimento-card">
        <div class="depoimento-stars">${'★'.repeat(Math.max(1, Math.min(5, d.rating || 5)))}</div>
        <p class="depoimento-text">"${esc(d.text)}"</p>
        <div class="depoimento-author" style="display:flex; align-items:center; gap:0.75rem; margin-top:1rem;">
          ${d.photo
            ? `<img src="${resolvePath(d.photo)}" alt="${esc(d.name)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;">👤</div>`
          }
          <div>
            <p style="font-weight:600;margin:0;">${esc(d.name)}</p>
            ${d.socialLink ? `<a href="${esc(d.socialLink)}" target="_blank" rel="noopener" style="font-size:0.75rem;opacity:0.6;">Ver perfil</a>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Preencher Álbuns
  const albumsSection = document.getElementById('section-albuns');
  const albumsGrid = document.getElementById('albumsGrid');
  window.allAlbums = content.albums || [];
  if (albumsGrid) {
    if (albumsSection && sections.includes('albuns')) albumsSection.style.display = '';
    if (content.albums && content.albums.length > 0) {
      albumsGrid.innerHTML = content.albums.map((a, i) => {
        const cover = a.cover || (a.photos && a.photos[0]) || '';
        return `
          <div class="album-card" onclick="openAlbumModal(${i})" style="cursor:pointer; border-radius:0.75rem; overflow:hidden; background:#1a1a1a;">
            <div style="aspect-ratio:3/4; overflow:hidden; position:relative;">
              ${cover
                ? `<img src="${resolvePath(cover)}" alt="${esc(a.title)}" style="width:100%; height:100%; object-fit:cover;">`
                : `<div style="width:100%; height:100%; background:#2a2a2a; display:flex; align-items:center; justify-content:center;"><span style="font-size:3rem; opacity:0.3;">📷</span></div>`
              }
              <div style="position:absolute; bottom:0; left:0; right:0; padding:1rem; background:linear-gradient(transparent,rgba(0,0,0,0.8));">
                <p style="color:white; font-weight:600; margin:0;">${esc(a.title)}</p>
                ${a.subtitle ? `<p style="color:rgba(255,255,255,0.7); font-size:0.875rem; margin:0.25rem 0 0;">${esc(a.subtitle)}</p>` : ''}
                ${a.photos ? `<p style="color:rgba(255,255,255,0.5); font-size:0.75rem; margin:0.25rem 0 0;">${a.photos.length} foto${a.photos.length !== 1 ? 's' : ''}</p>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      albumsGrid.innerHTML = '<p style="color:#666; text-align:center; padding:2rem;">Nenhum álbum cadastrado ainda.</p>';
    }
  }

  // Modal de álbum
  window.albumLightboxIndex = 0;
  window.albumLightboxPhotos = [];

  window.openAlbumModal = function(albumIdx) {
    const album = window.allAlbums[albumIdx];
    if (!album) return;
    const photos = album.photos || [];

    // Remove modal anterior se existir
    const existing = document.getElementById('albumModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'albumModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;overflow:hidden;';
    modal.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;background:rgba(0,0,0,0.8);border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">
        <div>
          <h2 style="color:white;font-size:1.25rem;font-weight:600;margin:0;">${esc(album.title)}</h2>
          ${album.subtitle ? `<p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0.25rem 0 0;">${esc(album.subtitle)}</p>` : ''}
        </div>
        <button onclick="document.getElementById('albumModal').remove()" style="background:rgba(255,255,255,0.1);border:none;color:white;width:2.5rem;height:2.5rem;border-radius:50%;cursor:pointer;font-size:1.25rem;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:1.5rem;">
        ${photos.length > 0
          ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.75rem;">
              ${photos.map((url, i) => `
                <div style="aspect-ratio:3/4;overflow:hidden;border-radius:0.5rem;cursor:pointer;" onclick="openAlbumLightbox(${albumIdx},${i})">
                  <img src="${resolvePath(url)}" alt="Foto ${i+1}" loading="lazy" style="width:100%;height:100%;object-fit:cover;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </div>
              `).join('')}
            </div>`
          : '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:4rem;">Este álbum ainda não tem fotos.</p>'
        }
      </div>
    `;
    document.body.appendChild(modal);
    document.addEventListener('keydown', closeAlbumOnEsc);
  };

  function closeAlbumOnEsc(e) {
    if (e.key === 'Escape') {
      const m = document.getElementById('albumModal');
      if (m) { m.remove(); document.removeEventListener('keydown', closeAlbumOnEsc); }
    }
  }

  window.openAlbumLightbox = function(albumIdx, photoIdx) {
    const album = window.allAlbums[albumIdx];
    if (!album) return;
    window.albumLightboxPhotos = album.photos || [];
    window.albumLightboxIndex = photoIdx;

    const existing = document.getElementById('albumLightbox');
    if (existing) existing.remove();

    const lb = document.createElement('div');
    lb.id = 'albumLightbox';
    lb.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.98);z-index:10000;display:flex;align-items:center;justify-content:center;';
    lb.innerHTML = `
      <button onclick="document.getElementById('albumLightbox').remove()" style="position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.1);border:none;color:white;width:2.5rem;height:2.5rem;border-radius:50%;cursor:pointer;font-size:1.25rem;">✕</button>
      <button onclick="prevAlbumPhoto()" style="position:absolute;left:1rem;background:rgba(255,255,255,0.1);border:none;color:white;width:3rem;height:3rem;border-radius:50%;cursor:pointer;font-size:1.5rem;">‹</button>
      <img id="albumLbImg" src="${resolvePath(window.albumLightboxPhotos[photoIdx])}" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:0.25rem;">
      <button onclick="nextAlbumPhoto()" style="position:absolute;right:1rem;background:rgba(255,255,255,0.1);border:none;color:white;width:3rem;height:3rem;border-radius:50%;cursor:pointer;font-size:1.5rem;">›</button>
    `;
    document.body.appendChild(lb);
  };

  window.prevAlbumPhoto = function() {
    if (window.albumLightboxIndex > 0) {
      window.albumLightboxIndex--;
      const img = document.getElementById('albumLbImg');
      if (img) img.src = resolvePath(window.albumLightboxPhotos[window.albumLightboxIndex]);
    }
  };
  window.nextAlbumPhoto = function() {
    if (window.albumLightboxIndex < window.albumLightboxPhotos.length - 1) {
      window.albumLightboxIndex++;
      const img = document.getElementById('albumLbImg');
      if (img) img.src = resolvePath(window.albumLightboxPhotos[window.albumLightboxIndex]);
    }
  };

  // Preencher Estúdio
  const studioSection = document.getElementById('section-estudio');
  const studioPhotosGrid = document.getElementById('studioPhotosGrid');
  const studioInfo = document.getElementById('studioInfo');
  const studioTitle = document.getElementById('studioTitle');
  const studioDesc = document.getElementById('studioDesc');
  if (studioSection && sections.includes('estudio')) studioSection.style.display = '';
  if (content.studio) {
    const studio = content.studio;
    if (studioTitle && studio.title) studioTitle.textContent = studio.title;
    if (studioDesc && studio.description) studioDesc.textContent = studio.description;
    if (studioPhotosGrid && studio.photos && studio.photos.length > 0) {
      studioPhotosGrid.innerHTML = studio.photos.map((p, i) => {
        const url = typeof p === 'string' ? p : p.image;
        const posX = p.posX ?? 50;
        const posY = p.posY ?? 50;
        return `<div style="aspect-ratio:3/4; overflow:hidden; border-radius:0.5rem;">
          <img src="${resolvePath(url)}" alt="Estúdio ${i+1}" loading="lazy"
            style="width:100%; height:100%; object-fit:cover; object-position:${posX}% ${posY}%;">
        </div>`;
      }).join('');
    }
    if (studioInfo) {
      let html = '';
      if (studio.address) html += `<div class="studio-info-item">📍 ${esc(studio.address)}</div>`;
      if (studio.hours) html += `<div class="studio-info-item">🕐 ${esc(studio.hours)}</div>`;
      if (studio.whatsapp) html += `<div class="studio-info-item">📱 <a href="https://wa.me/${studio.whatsapp.replace(/\D/g,'')}" target="_blank">${esc(studio.whatsapp)}</a></div>`;
      studioInfo.innerHTML = html;
    }
  }

  // Preencher Contato
  const contatoTitle = document.getElementById('contatoTitle');
  if (contatoTitle) contatoTitle.textContent = content.contato?.title || 'Contato';

  const contatoText = document.getElementById('contatoText');
  if (contatoText) contatoText.textContent = content.contato?.text || '';

  const contatoInfo = document.getElementById('contatoInfo');
  if (contatoInfo) {
    let html = '';
    if (config.whatsapp) html += `<div class="contact-item">📱 WhatsApp: ${esc(config.whatsapp)}</div>`;
    if (config.email) html += `<div class="contact-item">📧 Email: ${esc(config.email)}</div>`;
    if (config.instagramUrl) html += `<div class="contact-item">📷 <a href="${esc(config.instagramUrl)}" target="_blank">Instagram</a></div>`;
    contatoInfo.innerHTML = html;
  }

  // Preencher Footer
  const footerLogo = document.getElementById('footerLogo');
  if (footerLogo) footerLogo.textContent = data.name || '';

  const footerSocial = document.getElementById('footerSocial');
  if (footerSocial) {
    let html = '';
    if (config.instagramUrl) html += `<a href="${esc(config.instagramUrl)}" target="_blank">Instagram</a>`;
    if (config.facebookUrl) html += `<a href="${esc(config.facebookUrl)}" target="_blank">Facebook</a>`;
    footerSocial.innerHTML = html;
  }

  // Ocultar seções não ativadas
  const allSections = ['hero', 'sobre', 'portfolio', 'albuns', 'estudio', 'servicos', 'depoimentos', 'depoimento-form', 'faq', 'newsletter', 'contato'];
  allSections.forEach(s => {
    const el = document.getElementById('section-' + s);
    if (el) {
      if (!sections.includes(s)) {
        el.style.display = 'none';
      } else {
        // Mostrar seção que está ativa (remove inline style)
        el.style.display = '';
      }
    }
  });

  // Reordenar seções baseado na ordem do array sections
  const mainEl = document.querySelector('main');
  const siteFooter = document.getElementById('siteFooter');
  const sectionElements = sections.map(s => document.getElementById('section-' + s)).filter(el => el);

  // Remover todas as seções do DOM
  sectionElements.forEach(el => {
    if (el.parentNode) el.parentNode.removeChild(el);
  });

  // Âncora de inserção: sempre antes do #siteFooter quando possível
  function getAnchor(parent) {
    if (siteFooter && siteFooter.parentNode === parent) return siteFooter;
    return null;
  }

  // Re-inserir na ordem correta, sempre antes do footer
  if (mainEl) {
    const anchor = getAnchor(mainEl);
    sectionElements.forEach(el => {
      el.style.display = '';
      anchor ? mainEl.insertBefore(el, anchor) : mainEl.appendChild(el);
    });
  } else {
    const anchor = getAnchor(document.body);
    sectionElements.forEach(el => {
      el.style.display = '';
      anchor ? document.body.insertBefore(el, anchor) : document.body.appendChild(el);
    });
  }

  // Formulário de depoimento: inserir sempre logo após section-depoimentos e antes do footer
  const depFormEl = document.getElementById('section-depoimento-form');
  if (depFormEl) {
    if (depFormEl.parentNode) depFormEl.parentNode.removeChild(depFormEl);
    const depSection = document.getElementById('section-depoimentos');
    if (sections.includes('depoimentos') && depSection && depSection.parentNode) {
      // Insere imediatamente após a seção de depoimentos
      depSection.parentNode.insertBefore(depFormEl, depSection.nextSibling);
      depFormEl.style.display = '';
    } else {
      // Depoimentos não está ativo — oculta o formulário
      depFormEl.style.display = 'none';
      // Mantém antes do footer para não sumir do DOM
      const anchor = siteFooter || null;
      anchor ? document.body.insertBefore(depFormEl, anchor) : document.body.appendChild(depFormEl);
    }
  }

  // WhatsApp flutuante com mensagens do estúdio
  const whatsappBtn = document.getElementById('whatsappBtn');
  const whatsappNumber = content.studio?.whatsapp || config.whatsapp || '';
  if (whatsappBtn && whatsappNumber) {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    const defaultMsg = encodeURIComponent(config.whatsappMessage || 'Olá! Vi seu site e gostaria de mais informações.');
    whatsappBtn.href = `https://wa.me/${cleanNumber}?text=${defaultMsg}`;
    whatsappBtn.style.display = 'flex';

    const messages = content.studio?.whatsappMessages || [];
    if (messages.length > 0) {
      // Criar bolha de mensagens
      const bubble = document.createElement('div');
      bubble.id = 'whatsappBubble';
      bubble.style.cssText = 'position:fixed;bottom:5.5rem;right:1.5rem;z-index:9998;display:flex;flex-direction:column;gap:0.5rem;max-width:280px;';
      document.body.appendChild(bubble);

      let msgIndex = 0;
      function showNextMessage() {
        if (msgIndex >= messages.length) return;
        const msg = messages[msgIndex];
        const el = document.createElement('div');
        el.style.cssText = 'background:white;color:#1a1a1a;padding:0.75rem 1rem;border-radius:1rem 1rem 0.25rem 1rem;font-size:0.875rem;box-shadow:0 2px 12px rgba(0,0,0,0.15);animation:fadeInUp 0.3s ease;';
        el.textContent = msg.text;
        bubble.appendChild(el);
        msgIndex++;
        const delay = (messages[msgIndex]?.delay || 5) * 1000;
        if (msgIndex < messages.length) setTimeout(showNextMessage, delay);
      }
      const firstDelay = (messages[0]?.delay || 5) * 1000;
      setTimeout(showNextMessage, firstDelay);
    }
  }

  // FAQ
  const faqSection = document.getElementById('section-faq');
  const faqList = document.getElementById('faqList');
  if (faqSection && sections.includes('faq')) faqSection.style.display = '';
  if (faqList && content.faq && content.faq.length > 0) {
    faqList.innerHTML = content.faq.map((item, i) => `
      <div class="faq-item" style="border-bottom:1px solid rgba(255,255,255,0.1);padding:0.75rem 0;">
        <button class="faq-question" onclick="toggleFaq(${i})" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:1rem;font-size:1rem;font-weight:600;color:inherit;padding:0;">
          <span>${esc(item.question)}</span>
          <span id="faq-icon-${i}" style="font-size:1.25rem;transition:transform 0.2s;flex-shrink:0;">+</span>
        </button>
        <div id="faq-answer-${i}" style="display:none;padding:0.75rem 0 0;opacity:0.8;line-height:1.6;">${esc(item.answer)}</div>
      </div>
    `).join('');
  }
  window.toggleFaq = function(i) {
    const ans = document.getElementById(`faq-answer-${i}`);
    const icon = document.getElementById(`faq-icon-${i}`);
    if (!ans) return;
    const open = ans.style.display !== 'none';
    ans.style.display = open ? 'none' : 'block';
    if (icon) icon.textContent = open ? '+' : '−';
  };

  // Newsletter
  const newsletterSection = document.getElementById('section-newsletter');
  if (newsletterSection && sections.includes('newsletter')) newsletterSection.style.display = '';
  const newsletterTitle = document.getElementById('newsletterTitle');
  const newsletterDesc = document.getElementById('newsletterDesc');
  if (newsletterTitle && content.newsletter?.title) newsletterTitle.textContent = content.newsletter.title;
  if (newsletterDesc && content.newsletter?.description) newsletterDesc.textContent = content.newsletter.description;
  const newsletterSiteForm = document.getElementById('newsletterSiteForm');
  if (newsletterSiteForm) {
    newsletterSiteForm.onsubmit = async function(e) {
      e.preventDefault();
      const email = document.getElementById('newsletterSiteEmail')?.value;
      const msg = document.getElementById('newsletterSiteMsg');
      try {
        const res = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (msg) { msg.textContent = 'Inscrito com sucesso!'; msg.style.display = 'block'; msg.style.color = '#22c55e'; }
        newsletterSiteForm.reset();
      } catch(err) {
        if (msg) { msg.textContent = 'Erro ao inscrever. Tente novamente.'; msg.style.display = 'block'; msg.style.color = '#ef4444'; }
      }
    };
  }

  // Formulário de depoimento — visibilidade e posição controladas pelo bloco de reordenação acima
  const depoimentoForm = document.getElementById('depoimentoForm');
  if (depoimentoForm) {
    depoimentoForm.onsubmit = async function(e) {
      e.preventDefault();
      const msg = document.getElementById('depoimentoFormMsg');
      const btn = depoimentoForm.querySelector('button[type=submit]');
      if (btn) btn.disabled = true;
      try {
        const res = await fetch(buildApiUrl().replace('/site/config', '/site/depoimento'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: depoimentoForm.name.value,
            text: depoimentoForm.text.value,
            email: depoimentoForm.email?.value || '',
            rating: depoimentoForm.rating?.value || 5
          })
        });
        if (msg) { msg.textContent = 'Depoimento enviado! Aguardando aprovação.'; msg.style.display = 'block'; msg.style.color = '#22c55e'; }
        depoimentoForm.reset();
      } catch(err) {
        if (msg) { msg.textContent = 'Erro ao enviar. Tente novamente.'; msg.style.display = 'block'; msg.style.color = '#ef4444'; }
      }
      if (btn) btn.disabled = false;
    };
  }

  // Renderizar seções customizadas criadas pelo fotógrafo
  renderCustomSections(content.customSections || [], mainContent, sections);

  // Injetar scripts de analytics/pixel
  injectAnalyticsScripts(data.integrations);

  // Lightbox para portfolio
  window.currentLightboxIndex = 0;
  window.lightboxPhotos = content.portfolio?.photos || [];

  window.openLightbox = function(index) {
    window.currentLightboxIndex = index;
    const lb = document.getElementById('portfolioLightbox');
    const img = document.getElementById('lbImage');
    if (lb && img && window.lightboxPhotos[index]) {
      img.src = resolvePath(window.lightboxPhotos[index].url);
      lb.style.display = 'flex';
    }
  };

  window.closeLightbox = function() {
    const lb = document.getElementById('portfolioLightbox');
    if (lb) lb.style.display = 'none';
  };

  window.prevLightbox = function() {
    if (window.currentLightboxIndex > 0) {
      window.openLightbox(window.currentLightboxIndex - 1);
    }
  };

  window.nextLightbox = function() {
    if (window.currentLightboxIndex < window.lightboxPhotos.length - 1) {
      window.openLightbox(window.currentLightboxIndex + 1);
    }
  };

  // Event listeners para lightbox
  const lbClose = document.getElementById('lbClose');
  if (lbClose) lbClose.onclick = closeLightbox;

  const lbPrev = document.getElementById('lbPrev');
  if (lbPrev) lbPrev.onclick = prevLightbox;

  const lbNext = document.getElementById('lbNext');
  if (lbNext) lbNext.onclick = nextLightbox;

  // Fechar lightbox com ESC
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('portfolioLightbox');
    if (lb && lb.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevLightbox();
      if (e.key === 'ArrowRight') nextLightbox();
    }
  });

  // Formulário de contato
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.onsubmit = function(e) {
      e.preventDefault();
      alert('Formulário enviado! (Implementar envio real em breve)');
    };
  }
}

// Renderizar seções customizadas criadas pelo fotógrafo
function renderCustomSections(customSections, parent, activeSections) {
  if (!customSections || !customSections.length) return;

  // Remover seções custom antigas se existirem (re-render)
  document.querySelectorAll('.section-custom').forEach(el => el.remove());

  customSections.forEach(sec => {
    const el = document.createElement('section');
    el.id = 'section-custom-' + sec.id;
    el.className = 'section-custom section-padded';
    el.style.cssText = [
      sec.bgColor ? `background:${sec.bgColor};` : '',
      sec.textColor ? `color:${sec.textColor};` : ''
    ].join('');

    function esc(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    let innerHtml = `<div class="container">`;

    if (sec.title) {
      innerHtml += `<div class="section-header"><h2 class="section-title" ${sec.textColor ? `style="color:${sec.textColor}"` : ''}>${esc(sec.title)}</h2></div>`;
    }

    if (sec.type === 'texto') {
      innerHtml += `<p class="section-text" style="${sec.textColor ? `color:${sec.textColor}` : ''}">${esc(sec.content || '').replace(/\n/g,'<br>')}</p>`;
    } else if (sec.type === 'chamada') {
      innerHtml += `
        <div style="text-align:center; padding:2rem 0;">
          <p class="section-text" style="font-size:1.125rem; margin-bottom:1.5rem; ${sec.textColor ? `color:${sec.textColor}` : ''}">${esc(sec.content || '').replace(/\n/g,'<br>')}</p>
          <a href="#section-contato" class="btn-primary">Entrar em Contato</a>
        </div>`;
    } else if (sec.type === 'texto-imagem') {
      innerHtml += `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:center;">
          <p class="section-text" ${sec.textColor ? `style="color:${sec.textColor}"` : ''}>${esc(sec.content || '').replace(/\n/g,'<br>')}</p>
          ${sec.imageUrl ? `<img src="${sec.imageUrl}" alt="${esc(sec.title)}" style="width:100%; border-radius:0.75rem; object-fit:cover; max-height:400px;">` : ''}
        </div>`;
    } else if (sec.type === 'lista') {
      const items = sec.items && sec.items.length > 0 ? sec.items : (sec.content || '').split('\n').filter(Boolean).map(t => ({ text: t }));
      innerHtml += `
        <ul style="list-style:none; display:flex; flex-direction:column; gap:0.75rem; padding:0; margin:0;">
          ${items.map(item => `
            <li style="display:flex; align-items:flex-start; gap:0.75rem; ${sec.textColor ? `color:${sec.textColor}` : ''}">
              <span style="color:var(--accent); font-size:1.25rem; flex-shrink:0; margin-top:-0.125rem;">✦</span>
              <span>${esc(item.text || '')}</span>
            </li>
          `).join('')}
        </ul>`;
    }

    innerHtml += `</div>`;
    el.innerHTML = innerHtml;
    parent.appendChild(el);
  });
}

// Injetar scripts de analytics e pixel
function injectAnalyticsScripts(integrations) {
  if (!integrations) return;

  // Google Analytics 4
  if (integrations.googleAnalytics?.enabled && integrations.googleAnalytics.measurementId) {
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + integrations.googleAnalytics.measurementId;
    document.head.appendChild(gaScript);

    const gaConfig = document.createElement('script');
    gaConfig.innerHTML =
      'window.dataLayer = window.dataLayer || [];' +
      'function gtag(){dataLayer.push(arguments);}' +
      'gtag("js", new Date());' +
      'gtag("config", "' + integrations.googleAnalytics.measurementId + '");';
    document.head.appendChild(gaConfig);
  }

  // Meta Pixel (Facebook)
  if (integrations.metaPixel?.enabled && integrations.metaPixel.pixelId) {
    const fbScript = document.createElement('script');
    fbScript.innerHTML =
      '!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?' +
      'n.callMethod.apply(n,arguments):n.queue.push(arguments)};' +
      'if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";' +
      'n.queue=[];t=b.createElement(e);t.async=!0;' +
      't.src=v;s=b.getElementsByTagName(e)[0];' +
      's.parentNode.insertBefore(t,s)}(window, document,"script",' +
      '"https://connect.facebook.net/en_US/fbevents.js");' +
      'fbq("init", "' + integrations.metaPixel.pixelId + '");' +
      'fbq("track", "PageView");';
    document.head.appendChild(fbScript);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + integrations.metaPixel.pixelId + '&ev=PageView&noscript=1"/>';
    document.body.appendChild(noscript);
  }
}

// Navbar scroll effect + hamburger
function initNavBehavior() {
  const nav = document.getElementById('siteNav');
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');

  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Fechar ao clicar em link
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') navLinks.classList.remove('open');
    });
  }
}

// ── Preview em tempo real via postMessage ────────────────────────────────
// O admin envia { type: 'cz_preview', data: {...} } para atualizar o site
// sem recarregar a página — zero latência, sem flash.
window.addEventListener('message', (e) => {
  // Aceitar apenas mensagens da mesma origem
  if (e.origin !== window.location.origin) return;
  if (!e.data || e.data.type !== 'cz_preview') return;

  const data = e.data.data;
  if (!data) return;

  try {
    renderSite(data);
  } catch (err) {
    console.warn('[preview] Erro ao aplicar dados:', err);
  }
});

// Sinalizar ao admin que está pronto para receber mensagens
window.addEventListener('load', () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'cz_preview_ready' }, window.location.origin);
  }
});

// Iniciar quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { loadAndRenderSite(); initNavBehavior(); });
} else {
  loadAndRenderSite();
  initNavBehavior();
}
