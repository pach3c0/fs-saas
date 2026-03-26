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

function renderSite(data) {
  const config = data.siteConfig || {};
  const content = data.siteContent || {};
  const sections = data.siteSections || [];

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
    navLinks.innerHTML = sections.map(s => {
      const labels = {hero: 'Início', sobre: 'Sobre', portfolio: 'Portfólio', albuns: 'Álbuns', estudio: 'Estúdio', servicos: 'Serviços', depoimentos: 'Depoimentos', contato: 'Contato'};
      return `<a href="#section-${s}">${labels[s] || s}</a>`;
    }).join('');
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
    if (content.sobre?.image) {
      sobreImage.src = resolvePath(content.sobre.image);
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
      portfolioGrid.innerHTML = photos.map((p, i) =>
        `<img src="${resolvePath(p.url)}" alt="Portfolio ${i+1}" onclick="openLightbox(${i})" loading="lazy">`
      ).join('');
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
        <p>"${esc(d.text)}"</p>
        <p><strong>${esc(d.name)}</strong></p>
      </div>
    `).join('');
  }

  // Preencher Álbuns
  const albumsSection = document.getElementById('section-albuns');
  const albumsGrid = document.getElementById('albumsGrid');
  if (albumsGrid && content.albums && content.albums.length > 0) {
    if (albumsSection) albumsSection.style.display = '';
    albumsGrid.innerHTML = content.albums.map(a => {
      const cover = a.cover || (a.photos && a.photos[0]) || '';
      return `
        <div class="album-card" style="cursor:pointer; border-radius:0.75rem; overflow:hidden; background:#1a1a1a;">
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
  }

  // Preencher Estúdio
  const studioSection = document.getElementById('section-estudio');
  const studioPhotosGrid = document.getElementById('studioPhotosGrid');
  const studioInfo = document.getElementById('studioInfo');
  const studioTitle = document.getElementById('studioTitle');
  const studioDesc = document.getElementById('studioDesc');
  if (content.studio) {
    const studio = content.studio;
    if (studioSection && (studio.photos?.length > 0 || studio.address || studio.hours || studio.whatsapp)) {
      studioSection.style.display = '';
    }
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
  const allSections = ['hero', 'sobre', 'portfolio', 'albuns', 'estudio', 'servicos', 'depoimentos', 'contato'];
  allSections.forEach(s => {
    const el = document.getElementById('section-' + s);
    if (el && !sections.includes(s)) {
      el.style.display = 'none';
    }
  });

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

// Iniciar quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAndRenderSite);
} else {
  loadAndRenderSite();
}
