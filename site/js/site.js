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

  // WhatsApp botão flutuante
  if (config.whatsapp) {
    var btn = document.getElementById('whatsappBtn');
    var wMsg = encodeURIComponent(config.whatsappMessage || '');
    btn.href = 'https://wa.me/' + config.whatsapp.replace(/\D/g, '') + '?text=' + wMsg;
    btn.style.display = 'flex';
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

// Iniciar
document.addEventListener('DOMContentLoaded', loadSiteData);
