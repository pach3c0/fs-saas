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
      const labels = {hero: 'Início', sobre: 'Sobre', portfolio: 'Portfólio', servicos: 'Serviços', depoimentos: 'Depoimentos', contato: 'Contato'};
      return `<a href="#section-${s}">${labels[s] || s}</a>`;
    }).join('');
  }

  // Preencher Hero
  const heroTitle = document.getElementById('heroTitle');
  if (heroTitle) heroTitle.textContent = config.heroTitle || 'Eternizando Momentos';

  const heroSubtitle = document.getElementById('heroSubtitle');
  if (heroSubtitle) heroSubtitle.textContent = config.heroSubtitle || 'Fotografia profissional';

  const heroBg = document.getElementById('heroBg');
  if (heroBg && config.heroImage) {
    heroBg.style.backgroundImage = `url('${resolvePath(config.heroImage)}')`;
  }

  // Preencher Sobre
  const sobreTitle = document.getElementById('sobreTitle');
  if (sobreTitle) sobreTitle.textContent = content.sobre?.title || 'Sobre';

  const sobreText = document.getElementById('sobreText');
  if (sobreText) sobreText.textContent = content.sobre?.text || '';

  const sobreImage = document.getElementById('sobreImage');
  if (sobreImage && content.sobre?.image) {
    sobreImage.src = resolvePath(content.sobre.image);
  }

  // Preencher Portfolio
  const portfolioGrid = document.getElementById('portfolioGrid');
  if (portfolioGrid && content.portfolio?.photos) {
    portfolioGrid.innerHTML = content.portfolio.photos.map((p, i) =>
      `<img src="${resolvePath(p.url)}" alt="Portfolio ${i+1}" onclick="openLightbox(${i})" loading="lazy">`
    ).join('');
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
  const allSections = ['hero', 'sobre', 'portfolio', 'servicos', 'depoimentos', 'contato'];
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
