// site/js/site.js — Site profissional do fotógrafo
// Vanilla JS puro, sem ES Modules

const state = {
  data: null,
  portfolioPhotos: [],
  lightboxIndex: 0
};

function escapeHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Detectar tenant pelo subdomínio ou ?_tenant=slug
function buildApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('_tenant');
  if (tenantParam) {
    return '/api/site/config?_tenant=' + encodeURIComponent(tenantParam);
  }
  return '/api/site/config';
}

async function loadSiteData() {
  try {
    const res = await fetch(buildApiUrl());
    if (!res.ok) throw new Error('Erro ' + res.status);
    const data = await res.json();
    state.data = data;

    // Injetar scripts ANTES de renderizar
    if (data.integrations) {
      injectAnalyticsScripts(data.integrations);
      updateMetaTags(data.siteConfig, data.integrations);
    }

    renderSite(data);
  } catch (e) {
    document.body.innerHTML = '<div class="site-building"><h1>Site em construção</h1><p>Volte em breve.</p></div>';
  }
}

function renderSite(data) {
  if (!data.siteEnabled) {
    const name = data.name || 'Em breve';
    document.body.innerHTML = '<div class="site-building"><h1>' + escapeHtml(name) + '</h1><p>Estamos preparando algo especial para você.</p></div>';
    return;
  }

  const config = data.siteConfig || {};
  const content = data.siteContent || {};
  const theme = data.siteTheme || 'elegante';

  // Aplicar tema
  document.body.className = 'theme-' + theme;

  // Cor primária customizada
  if (data.primaryColor) {
    document.documentElement.style.setProperty('--primary', data.primaryColor);
  }

  // Meta tags
  document.getElementById('siteTitle').textContent = config.title || data.name || 'Fotógrafo';
  document.getElementById('siteMeta').setAttribute('content', config.description || '');
  document.getElementById('ogTitle').setAttribute('content', config.title || data.name || '');
  document.getElementById('ogDesc').setAttribute('content', config.description || '');
  if (config.heroImage) {
    document.getElementById('ogImage').setAttribute('content', config.heroImage);
  }

  // NAV logo
  var navLogo = document.getElementById('navLogo');
  if (data.logo) {
    navLogo.innerHTML = '<img src="' + escapeHtml(data.logo) + '" alt="' + escapeHtml(data.name || '') + '" style="height:2rem; object-fit:contain; max-width:120px;">';
  } else {
    navLogo.textContent = data.name || 'Estúdio';
  }

  // Nav links
  var sections = data.siteSections || ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
  var sectionLabels = { sobre: 'Sobre', portfolio: 'Portfólio', servicos: 'Serviços', depoimentos: 'Depoimentos', contato: 'Contato' };
  var navLinks = document.getElementById('navLinks');
  navLinks.innerHTML = sections
    .filter(function(s) { return s !== 'hero' && sectionLabels[s]; })
    .map(function(s) { return '<a href="#section-' + s + '">' + sectionLabels[s] + '</a>'; })
    .join('');

  // CTA nav
  if (config.whatsapp) {
    var msg = encodeURIComponent(config.whatsappMessage || '');
    document.getElementById('navCta').onclick = function() {
      window.open('https://wa.me/' + config.whatsapp.replace(/\D/g, '') + '?text=' + msg, '_blank');
    };
  }

  // Menu mobile
  document.getElementById('navHamburger').onclick = function() {
    var links = document.getElementById('navLinks');
    links.classList.toggle('open');
  };

  // Fechar menu ao clicar em link
  navLinks.querySelectorAll('a').forEach(function(a) {
    a.onclick = function() {
      document.getElementById('navLinks').classList.remove('open');
    };
  });

  // HERO
  if (config.heroImage) {
    document.getElementById('heroBg').style.backgroundImage = 'url(' + config.heroImage + ')';
  }
  document.getElementById('heroTitle').textContent = config.heroTitle || data.name || 'Fotografia Profissional';
  document.getElementById('heroSubtitle').textContent = config.heroSubtitle || '';
  document.getElementById('heroEyebrow').textContent = data.name || '';

  // SOBRE
  var sobre = content.sobre || {};
  document.getElementById('sobreTitle').textContent = sobre.title || 'Sobre Mim';
  document.getElementById('sobreText').textContent = sobre.text || '';
  var sobreImg = document.getElementById('sobreImage');
  if (sobre.image) {
    sobreImg.src = sobre.image;
  } else if (data.logo) {
    sobreImg.src = data.logo;
  } else {
    sobreImg.style.display = 'none';
  }

  // PORTFOLIO
  var portfolio = content.portfolio || {};
  document.getElementById('portfolioTitle').textContent = portfolio.title || 'Portfólio';
  document.getElementById('portfolioSubtitle').textContent = portfolio.subtitle || '';
  var photos = portfolio.photos || [];
  state.portfolioPhotos = photos.map(function(p) { return p.url || p; });
  var grid = document.getElementById('portfolioGrid');
  if (photos.length) {
    grid.innerHTML = photos.map(function(p, i) {
      var url = p.url || p;
      return '<div class="portfolio-item" data-idx="' + i + '"><img src="' + escapeHtml(url) + '" alt="" loading="lazy"></div>';
    }).join('');
    grid.querySelectorAll('.portfolio-item').forEach(function(item) {
      item.onclick = function() { openLightbox(parseInt(item.getAttribute('data-idx'))); };
    });
  } else {
    grid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column:1/-1;">Portfólio em breve.</p>';
  }

  // SERVIÇOS
  var servicos = content.servicos || [];
  var servicosGrid = document.getElementById('servicosGrid');
  if (servicos.length) {
    servicosGrid.innerHTML = servicos.map(function(s) {
      return '<div class="servico-card">' +
        '<div class="servico-icon">' + escapeHtml(s.icon || '📷') + '</div>' +
        '<h3 class="servico-title">' + escapeHtml(s.title || '') + '</h3>' +
        '<p class="servico-desc">' + escapeHtml(s.description || '') + '</p>' +
        (s.price ? '<p class="servico-price">' + escapeHtml(s.price) + '</p>' : '') +
        '</div>';
    }).join('');
  } else {
    servicosGrid.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column:1/-1;">Em breve.</p>';
  }

  // DEPOIMENTOS
  var deps = content.depoimentos || [];
  var track = document.getElementById('depoimentosTrack');
  if (deps.length) {
    track.innerHTML = deps.map(function(d) {
      var stars = '★'.repeat(d.rating || 5) + '☆'.repeat(5 - (d.rating || 5));
      var photoEl = d.photo
        ? '<img class="depoimento-photo" src="' + escapeHtml(d.photo) + '" alt="' + escapeHtml(d.name || '') + '">'
        : '<div class="depoimento-photo" style="display:flex;align-items:center;justify-content:center;font-size:1rem;color:#9ca3af;">👤</div>';
      return '<div class="depoimento-card">' +
        '<div class="depoimento-stars">' + stars + '</div>' +
        '<p class="depoimento-text">"' + escapeHtml(d.text || '') + '"</p>' +
        '<div class="depoimento-author">' + photoEl + '<span class="depoimento-name">' + escapeHtml(d.name || '') + '</span></div>' +
        '</div>';
    }).join('');
  } else {
    track.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Sem depoimentos ainda.</p>';
  }

  // CONTATO
  var contato = content.contato || {};
  document.getElementById('contatoTitle').textContent = contato.title || 'Entre em Contato';
  document.getElementById('contatoText').textContent = contato.text || '';
  var infoEl = document.getElementById('contatoInfo');
  var items = [];
  if (config.whatsapp) items.push('<div class="contato-item"><span>📱</span><span>' + escapeHtml(config.whatsapp) + '</span></div>');
  if (config.email) items.push('<div class="contato-item"><span>✉️</span><span>' + escapeHtml(config.email) + '</span></div>');
  if (contato.address) items.push('<div class="contato-item"><span>📍</span><span>' + escapeHtml(contato.address) + '</span></div>');
  infoEl.innerHTML = items.join('');

  // FOOTER
  var footerLogo = document.getElementById('footerLogo');
  if (data.logo) {
    footerLogo.innerHTML = '<img src="' + escapeHtml(data.logo) + '" alt="' + escapeHtml(data.name || '') + '" style="height:1.75rem; object-fit:contain; filter:brightness(10);">';
  } else {
    footerLogo.textContent = data.name || '';
  }
  document.getElementById('footerCopy').textContent = config.copyright || '© ' + new Date().getFullYear() + ' ' + (data.name || '');

  var social = document.getElementById('footerSocial');
  var socialLinks = [];
  if (config.instagramUrl) socialLinks.push('<a href="' + escapeHtml(config.instagramUrl) + '" target="_blank" rel="noopener" aria-label="Instagram">📸</a>');
  if (config.facebookUrl) socialLinks.push('<a href="' + escapeHtml(config.facebookUrl) + '" target="_blank" rel="noopener" aria-label="Facebook">👥</a>');
  social.innerHTML = socialLinks.join('');

  // WhatsApp widget configurável
  var whatsappConfig = data.integrations && data.integrations.whatsapp ? data.integrations.whatsapp : {};
  if (whatsappConfig.enabled !== false) {
    var number = whatsappConfig.number || config.whatsapp || '';
    var message = whatsappConfig.message || 'Olá! Vi seu site e gostaria de mais informações.';
    var position = whatsappConfig.position || 'bottom-right';
    var showOnMobile = whatsappConfig.showOnMobile !== false;

    if (number) {
      var isMobile = window.innerWidth <= 768;
      if (!isMobile || showOnMobile) {
        var existingBtn = document.getElementById('whatsappBtn');
        if (existingBtn) existingBtn.remove();

        var widget = document.createElement('a');
        widget.href = 'https://wa.me/' + number.replace(/\D/g, '') + '?text=' + encodeURIComponent(message);
        widget.target = '_blank';
        widget.rel = 'noopener noreferrer';
        widget.id = 'whatsappBtn';
        widget.className = 'whatsapp-widget';
        widget.style.cssText =
          'position:fixed;' +
          (position === 'bottom-right' ? 'right:20px;' : 'left:20px;') +
          'bottom:20px;' +
          'background:#25d366;' +
          'width:60px;' +
          'height:60px;' +
          'border-radius:50%;' +
          'display:flex;' +
          'align-items:center;' +
          'justify-content:center;' +
          'box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
          'z-index:1000;' +
          'transition:transform 0.3s;';
        widget.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
        widget.onmouseenter = function() { widget.style.transform = 'scale(1.1)'; };
        widget.onmouseleave = function() { widget.style.transform = 'scale(1)'; };
        document.body.appendChild(widget);
      }
    }
  }

  // Formulário de contato → WhatsApp ou mailto
  var form = document.getElementById('contactForm');
  form.onsubmit = function(e) {
    e.preventDefault();
    var nome = form.nome.value;
    var email = form.email.value;
    var assunto = form.assunto.value;
    var mensagem = form.mensagem.value;
    if (config.whatsapp) {
      var m = 'Olá! Me chamo ' + nome + ' (' + email + ').\n\n*' + assunto + '*\n\n' + mensagem;
      window.open('https://wa.me/' + config.whatsapp.replace(/\D/g, '') + '?text=' + encodeURIComponent(m), '_blank');
    } else if (config.email) {
      window.location.href = 'mailto:' + config.email + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(mensagem);
    }
    form.reset();
  };

  // Ocultar seções desativadas
  var allSections = ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
  allSections.forEach(function(s) {
    var el = document.getElementById('section-' + s);
    if (el && !sections.includes(s)) el.style.display = 'none';
  });
}

// ============================================
// LIGHTBOX
// ============================================
function openLightbox(idx) {
  state.lightboxIndex = idx;
  var lb = document.getElementById('portfolioLightbox');
  lb.style.display = 'flex';
  document.getElementById('lbImage').src = state.portfolioPhotos[idx] || '';
}

document.getElementById('lbClose').onclick = function() {
  document.getElementById('portfolioLightbox').style.display = 'none';
};

document.getElementById('lbPrev').onclick = function() {
  var len = state.portfolioPhotos.length;
  if (!len) return;
  state.lightboxIndex = (state.lightboxIndex - 1 + len) % len;
  document.getElementById('lbImage').src = state.portfolioPhotos[state.lightboxIndex];
};

document.getElementById('lbNext').onclick = function() {
  var len = state.portfolioPhotos.length;
  if (!len) return;
  state.lightboxIndex = (state.lightboxIndex + 1) % len;
  document.getElementById('lbImage').src = state.portfolioPhotos[state.lightboxIndex];
};

document.getElementById('portfolioLightbox').onclick = function(e) {
  if (e.target === this) this.style.display = 'none';
};

// Swipe no lightbox (mobile)
var lbTouchStartX = 0;
document.getElementById('portfolioLightbox').addEventListener('touchstart', function(e) {
  lbTouchStartX = e.touches[0].clientX;
});
document.getElementById('portfolioLightbox').addEventListener('touchend', function(e) {
  var diff = lbTouchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) {
    diff > 0 ? document.getElementById('lbNext').click() : document.getElementById('lbPrev').click();
  }
});

// Teclado
document.addEventListener('keydown', function(e) {
  if (document.getElementById('portfolioLightbox').style.display !== 'none') {
    if (e.key === 'Escape') document.getElementById('portfolioLightbox').style.display = 'none';
    if (e.key === 'ArrowLeft') document.getElementById('lbPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('lbNext').click();
  }
});

// ============================================
// INTEGRACOES E ANALYTICS
// ============================================
function injectAnalyticsScripts(integrations) {
  // Google Analytics
  if (integrations.googleAnalytics && integrations.googleAnalytics.enabled && integrations.googleAnalytics.measurementId) {
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + integrations.googleAnalytics.measurementId;
    document.head.appendChild(gaScript);

    var gaConfig = document.createElement('script');
    gaConfig.innerHTML =
      'window.dataLayer = window.dataLayer || [];' +
      'function gtag(){dataLayer.push(arguments);}' +
      'gtag("js", new Date());' +
      'gtag("config", "' + integrations.googleAnalytics.measurementId + '");';
    document.head.appendChild(gaConfig);
  }

  // Meta Pixel
  if (integrations.metaPixel && integrations.metaPixel.enabled && integrations.metaPixel.pixelId) {
    var fbScript = document.createElement('script');
    fbScript.innerHTML =
      '!function(f,b,e,v,n,t,s)' +
      '{if(f.fbq)return;n=f.fbq=function(){n.callMethod?' +
      'n.callMethod.apply(n,arguments):n.queue.push(arguments)};' +
      'if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";' +
      'n.queue=[];t=b.createElement(e);t.async=!0;' +
      't.src=v;s=b.getElementsByTagName(e)[0];' +
      's.parentNode.insertBefore(t,s)}(window, document,"script",' +
      '"https://connect.facebook.net/en_US/fbevents.js");' +
      'fbq("init", "' + integrations.metaPixel.pixelId + '");' +
      'fbq("track", "PageView");';
    document.head.appendChild(fbScript);

    var noscript = document.createElement('noscript');
    noscript.innerHTML = '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' + integrations.metaPixel.pixelId + '&ev=PageView&noscript=1"/>';
    document.body.appendChild(noscript);
  }
}

function updateMetaTags(siteConfig, integrations) {
  var title = siteConfig.title || 'Fotografia Profissional';
  document.title = title;

  setMetaTag('description', siteConfig.description);
  setMetaTag('robots', integrations && integrations.seo && integrations.seo.robots ? integrations.seo.robots : 'index, follow');
  setMetaTag('og:title', title, true);
  setMetaTag('og:description', siteConfig.description, true);
  setMetaTag('og:image', siteConfig.heroImage, true);
  setMetaTag('og:type', 'website', true);

  // Verificação Google
  if (integrations && integrations.seo && integrations.seo.googleSiteVerification) {
    setMetaTag('google-site-verification', integrations.seo.googleSiteVerification);
  }
}

function setMetaTag(name, content, isProperty) {
  if (!content) return;
  var attr = isProperty ? 'property' : 'name';
  var meta = document.querySelector('meta[' + attr + '="' + name + '"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

// Iniciar
document.addEventListener('DOMContentLoaded', loadSiteData);
