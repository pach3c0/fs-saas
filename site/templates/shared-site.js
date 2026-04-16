/**
 * site.js - Compartilhado entre todos os templates
 * Carrega dados da API e preenche elementos do DOM
 */

// Detectar tenant pelo subdomínio ou ?_tenant=slug
function buildApiUrl() {
  const params = new URLSearchParams(window.location.search);
  const tenantParam = params.get('_tenant');
  const isPreview = params.get('_preview') === '1';
  const qs = [];
  if (tenantParam) qs.push('_tenant=' + encodeURIComponent(tenantParam));
  if (isPreview) qs.push('_preview=1');
  return '/api/site/config' + (qs.length ? '?' + qs.join('&') : '');
}

// Desativar scroll restoration automático do browser
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Carregar dados da API
async function loadAndRenderSite() {
  try {
    const res = await fetch(buildApiUrl());
    if (!res.ok) throw new Error('Erro ' + res.status);
    const data = await res.json();

    // Verificar se site está ativado (pula verificação no preview do builder)
    const isPreview = new URLSearchParams(window.location.search).get('_preview') === '1';
    if (!data.siteEnabled && !isPreview) {
      document.body.style.cssText = 'margin:0;padding:0;background:#0a0a0a;';
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;font-family:'Inter',sans-serif;text-align:center;padding:2rem;">
          ${data.logo ? `<img src="${data.logo}" alt="Logo" style="width:80px;height:80px;object-fit:contain;margin-bottom:1.5rem;border-radius:50%;">` : ''}
          <h1 style="color:#f3f4f6;font-size:1.75rem;font-weight:700;margin:0 0 0.75rem;">${data.name || 'Em breve'}</h1>
          <div style="width:3rem;height:2px;background:#444;margin:0 auto 1.25rem;"></div>
          <p style="color:#9ca3af;font-size:1rem;max-width:400px;margin:0;">Estamos preparando algo especial para você. Volte em breve!</p>
        </div>`;
      return;
    }

    // Renderizar site
    renderSite(data);
    // Garantir que a página abre no topo (hero), não no meio
    // requestAnimationFrame garante que o DOM já foi atualizado antes do scroll
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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

function renderSite(data, opts = {}) {
  const config = data.siteConfig || {};
  const content = data.siteContent || {};
  const sections = (data.siteSections && data.siteSections.length)
    ? data.siteSections
    : ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];

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

  // Preencher Hero — imagem de fundo
  const heroBg = document.getElementById('heroBg');
  if (heroBg) {
    if (config.heroImage) {
      // Valores desktop (padrão)
      const bgP = config.bgPresets || {};
      const dk = bgP.desktop || {};
      const tb = bgP.tablet  || {};
      const mb = bgP.mobile  || {};

      const dkScale = dk.scale ?? config.heroScale ?? 1;
      const dkPosX  = dk.posX  ?? config.heroPosX  ?? 50;
      const dkPosY  = dk.posY  ?? config.heroPosY  ?? 50;
      const tbS = (tb.scale ?? dkScale); const tbX = (tb.posX ?? dkPosX); const tbY = (tb.posY ?? dkPosY);
      const mbS = (mb.scale ?? dkScale); const mbX = (mb.posX ?? dkPosX); const mbY = (mb.posY ?? dkPosY);

      // No preview do admin, aplicar diretamente o preset do device ativo (iframe não tem viewport real)
      const pd = opts.previewDevice;
      const apS = pd === 'mobile' ? mbS : pd === 'tablet' ? tbS : dkScale;
      const apX = pd === 'mobile' ? mbX : pd === 'tablet' ? tbX : dkPosX;
      const apY = pd === 'mobile' ? mbY : pd === 'tablet' ? tbY : dkPosY;

      heroBg.style.backgroundImage    = `url('${resolvePath(config.heroImage)}')`;
      heroBg.style.backgroundPosition = `${apX}% ${apY}%`;
      heroBg.style.backgroundSize     = apS === 1 ? 'cover' : `${apS * 100}%`;
      heroBg.style.backgroundRepeat   = 'no-repeat';

      // Injetar media queries para tablet e mobile (usadas no site real, não no preview)
      const bgCss =
        `@media(max-width:1024px){#heroBg{background-position:${tbX}% ${tbY}%!important;background-size:${tbS === 1 ? 'cover' : tbS * 100 + '%'}!important;}}` +
        `@media(max-width:480px){#heroBg{background-position:${mbX}% ${mbY}%!important;background-size:${mbS === 1 ? 'cover' : mbS * 100 + '%'}!important;}}`;
      let st = document.getElementById('heroBgResponsive');
      if (!st) { st = document.createElement('style'); st.id = 'heroBgResponsive'; document.head.appendChild(st); }
      st.textContent = bgCss;
    } else {
      heroBg.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  // Overlay e barras decorativas — com suporte a presets por device
  const ovP = config.overlayPresets || {};
  const ovDk = ovP.desktop || {};
  const ovTb = ovP.tablet  || {};
  const ovMb = ovP.mobile  || {};

  // Fallbacks: preset desktop → config direto → default
  const dkOpacity   = ovDk.opacity        ?? config.overlayOpacity  ?? 30;
  const dkTopH      = ovDk.topBarHeight   ?? config.topBarHeight    ?? 0;
  const dkTopC      = ovDk.topBarColor    ?? config.topBarColor     ?? '#000000';
  const dkBotH      = ovDk.bottomBarHeight ?? config.bottomBarHeight ?? 0;
  const dkBotC      = ovDk.bottomBarColor ?? config.bottomBarColor  ?? '#000000';

  const tbOpacity   = ovTb.opacity        ?? dkOpacity;
  const tbTopH      = ovTb.topBarHeight   ?? dkTopH;
  const tbTopC      = ovTb.topBarColor    ?? dkTopC;
  const tbBotH      = ovTb.bottomBarHeight ?? dkBotH;
  const tbBotC      = ovTb.bottomBarColor ?? dkBotC;

  const mbOpacity   = ovMb.opacity        ?? dkOpacity;
  const mbTopH      = ovMb.topBarHeight   ?? dkTopH;
  const mbTopC      = ovMb.topBarColor    ?? dkTopC;
  const mbBotH      = ovMb.bottomBarHeight ?? dkBotH;
  const mbBotC      = ovMb.bottomBarColor ?? dkBotC;

  // No preview do admin, aplicar o device ativo diretamente
  const pd = opts.previewDevice;
  const apOpacity = pd === 'mobile' ? mbOpacity : pd === 'tablet' ? tbOpacity : dkOpacity;
  const apTopH    = pd === 'mobile' ? mbTopH    : pd === 'tablet' ? tbTopH    : dkTopH;
  const apTopC    = pd === 'mobile' ? mbTopC    : pd === 'tablet' ? tbTopC    : dkTopC;
  const apBotH    = pd === 'mobile' ? mbBotH    : pd === 'tablet' ? tbBotH    : dkBotH;
  const apBotC    = pd === 'mobile' ? mbBotC    : pd === 'tablet' ? tbBotC    : dkBotC;

  const heroOverlay = document.getElementById('heroOverlay');
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${apOpacity / 100})`;

  const heroTopBar = document.getElementById('heroTopBar');
  if (heroTopBar) { heroTopBar.style.height = `${apTopH}%`; heroTopBar.style.background = apTopC; }

  const heroBottomBar = document.getElementById('heroBottomBar');
  if (heroBottomBar) { heroBottomBar.style.height = `${apBotH}%`; heroBottomBar.style.background = apBotC; }

  // Media queries para site real (responsive)
  const ovCss =
    `@media(max-width:1024px){` +
      `#heroOverlay{background:rgba(0,0,0,${tbOpacity / 100})!important;}` +
      `#heroTopBar{height:${tbTopH}%!important;background:${tbTopC}!important;}` +
      `#heroBottomBar{height:${tbBotH}%!important;background:${tbBotC}!important;}` +
    `}` +
    `@media(max-width:480px){` +
      `#heroOverlay{background:rgba(0,0,0,${mbOpacity / 100})!important;}` +
      `#heroTopBar{height:${mbTopH}%!important;background:${mbTopC}!important;}` +
      `#heroBottomBar{height:${mbBotH}%!important;background:${mbBotC}!important;}` +
    `}`;
  let ovSt = document.getElementById('heroOverlayResponsive');
  if (!ovSt) { ovSt = document.createElement('style'); ovSt.id = 'heroOverlayResponsive'; document.head.appendChild(ovSt); }
  ovSt.textContent = ovCss;

  // Renderizar heroLayers (textos livres posicionados)
  // Migração automática: se não houver layers mas existir heroTitle/heroSubtitle antigos, converte
  let heroLayers = config.heroLayers;
  if (!heroLayers || heroLayers.length === 0) {
    heroLayers = [];
    if (config.heroTitle) {
      heroLayers.push({
        id: 'migrated-title',
        text: config.heroTitle,
        x: config.titlePosX ?? 50,
        y: config.titlePosY ?? 40,
        fontSize: config.titleFontSize ?? 80,
        fontFamily: '',
        color: '#ffffff',
        fontWeight: 'bold',
        align: 'center',
        shadow: true,
      });
    }
    if (config.heroSubtitle) {
      heroLayers.push({
        id: 'migrated-subtitle',
        text: config.heroSubtitle,
        x: config.subtitlePosX ?? 50,
        y: config.subtitlePosY ?? 58,
        fontSize: config.subtitleFontSize ?? 32,
        fontFamily: '',
        color: '#e5e7eb',
        fontWeight: 'normal',
        align: 'center',
        shadow: true,
      });
    }
  }

  const heroLayersEl = document.getElementById('heroLayers');
  if (heroLayersEl) {
    // Helper: pegar valores de posição respeitando presets por device
    const getVal = (layer, field, device) => {
      if (layer.presets && layer.presets[device] && layer.presets[device][field] !== undefined) {
        return layer.presets[device][field];
      }
      return layer[field];
    };

    // Gerar CSS responsivo para cada layer
    let responsiveCss = '';

    // Sistema de posicionamento ancorado no centro da viewport.
    // x=50, y=50 = centro exato. Deslocamento em vw/vh a partir do centro.
    // Isso garante que layouts criados no desktop se mantenham proporcionais
    // em qualquer tamanho de tela, sem area preta ou layers saindo do container.
    const toVw = (x) => ((x - 50) * 1).toFixed(3);   // 1% de deslocamento = 1vw
    const toVh = (y) => ((y - 50) * 1).toFixed(3);   // 1% de deslocamento = 1vh

    heroLayersEl.innerHTML = heroLayers.map((layer, idx) => {
      const type = layer.type || 'text';
      const layerClass = `hl-${layer.id || idx}`;

      // Valores desktop (padrão)
      const dkX = getVal(layer, 'x', 'desktop') ?? layer.x ?? 50;
      const dkY = getVal(layer, 'y', 'desktop') ?? layer.y ?? 50;
      const dkRotation = getVal(layer, 'rotation', 'desktop') ?? layer.rotation ?? 0;

      // Gerar media queries se tem presets tablet/mobile
      const hasTablet = layer.presets?.tablet;
      const hasMobile = layer.presets?.mobile;

      if (type === 'image') {
        const dkW = getVal(layer, 'width', 'desktop') ?? layer.width ?? 20;
        const dkH = getVal(layer, 'height', 'desktop') ?? layer.height ?? 20;
        const flipH = layer.flipH ? 'scaleX(-1)' : '';
        const flipV = layer.flipV ? 'scaleY(-1)' : '';

        // Tamanho em vmin para escalar proporcionalmente em qualquer viewport
        const wVmin = (dkW * 0.8).toFixed(3);
        const hVmin = (dkH * 0.8).toFixed(3);

        const makeImgTransform = (rot) =>
          `translate(calc(-50% + ${toVw(dkX)}vw), calc(-50% + ${toVh(dkY)}vh)) rotate(${rot}deg) ${flipH} ${flipV}`.trim();

        if (hasTablet) {
          const tx = getVal(layer, 'x', 'tablet') ?? dkX;
          const ty = getVal(layer, 'y', 'tablet') ?? dkY;
          const tw = getVal(layer, 'width', 'tablet') ?? dkW;
          const th = getVal(layer, 'height', 'tablet') ?? dkH;
          const tr = getVal(layer, 'rotation', 'tablet') ?? dkRotation;
          const twVmin = (tw * 0.8).toFixed(3);
          const thVmin = (th * 0.8).toFixed(3);
          responsiveCss += `@media(max-width:1024px){.${layerClass}{width:${twVmin}vmin!important;height:${thVmin}vmin!important;transform:translate(calc(-50% + ${toVw(tx)}vw),calc(-50% + ${toVh(ty)}vh)) rotate(${tr}deg) ${flipH} ${flipV}!important;}}`;
        }
        if (hasMobile) {
          const mx = getVal(layer, 'x', 'mobile') ?? dkX;
          const my = getVal(layer, 'y', 'mobile') ?? dkY;
          const mw = getVal(layer, 'width', 'mobile') ?? dkW;
          const mh = getVal(layer, 'height', 'mobile') ?? dkH;
          const mr = getVal(layer, 'rotation', 'mobile') ?? dkRotation;
          const mwVmin = (mw * 0.8).toFixed(3);
          const mhVmin = (mh * 0.8).toFixed(3);
          responsiveCss += `@media(max-width:480px){.${layerClass}{width:${mwVmin}vmin!important;height:${mhVmin}vmin!important;transform:translate(calc(-50% + ${toVw(mx)}vw),calc(-50% + ${toVh(my)}vh)) rotate(${mr}deg) ${flipH} ${flipV}!important;}}`;
        }

        return `<div class="${layerClass}" style="
          position: absolute;
          left: 50%;
          top: 50%;
          width: ${wVmin}vmin;
          height: ${hVmin}vmin;
          transform: ${makeImgTransform(dkRotation)};
          opacity: ${(layer.opacity ?? 100) / 100};
          overflow: hidden;
          border-radius: ${layer.borderRadius ?? 0}px;
          pointer-events: none;
          user-select: none;
        "><img src="${resolvePath(layer.url || '')}" style="width:100%;height:100%;object-fit:cover;display:block;" alt=""></div>`;
      }

      // Texto — fontSize escala com vw ancorado em 1440px de referência
      const dkFs = Math.max(12, getVal(layer, 'fontSize', 'desktop') ?? layer.fontSize ?? 48);
      const fsvw = (dkFs / 1440 * 100).toFixed(3);
      const fsMin = Math.max(12, Math.round(dkFs * 0.35));

      const makeTextTransform = (x, y, rot) =>
        `translate(calc(-50% + ${toVw(x)}vw), calc(-50% + ${toVh(y)}vh))${rot ? ` rotate(${rot}deg)` : ''}`;

      if (hasTablet) {
        const tx = getVal(layer, 'x', 'tablet') ?? dkX;
        const ty = getVal(layer, 'y', 'tablet') ?? dkY;
        const tfs = getVal(layer, 'fontSize', 'tablet') ?? dkFs;
        const tr = getVal(layer, 'rotation', 'tablet') ?? dkRotation;
        const tfsvw = (tfs / 1440 * 100).toFixed(3);
        const tfsMin = Math.max(12, Math.round(tfs * 0.35));
        responsiveCss += `@media(max-width:1024px){.${layerClass}{font-size:clamp(${tfsMin}px,${tfsvw}vw,${tfs}px)!important;transform:${makeTextTransform(tx, ty, tr)}!important;}}`;
      }
      if (hasMobile) {
        const mx = getVal(layer, 'x', 'mobile') ?? dkX;
        const my = getVal(layer, 'y', 'mobile') ?? dkY;
        const mfs = getVal(layer, 'fontSize', 'mobile') ?? Math.round(dkFs * 0.5);
        const mr = getVal(layer, 'rotation', 'mobile') ?? dkRotation;
        const mfsvw = (mfs / 1440 * 100).toFixed(3);
        const mfsMin = Math.max(12, Math.round(mfs * 0.35));
        responsiveCss += `@media(max-width:480px){.${layerClass}{font-size:clamp(${mfsMin}px,${mfsvw}vw,${mfs}px)!important;transform:${makeTextTransform(mx, my, mr)}!important;}}`;
      }

      return `<div class="${layerClass}" style="
        position: absolute;
        left: 50%;
        top: 50%;
        transform: ${makeTextTransform(dkX, dkY, dkRotation)};
        color: ${layer.color || '#ffffff'};
        font-size: clamp(${fsMin}px, ${fsvw}vw, ${dkFs}px);
        font-family: ${layer.fontFamily || 'inherit'};
        font-weight: ${layer.fontWeight || 'bold'};
        text-align: ${layer.align || 'center'};
        text-shadow: ${layer.shadow !== false ? '2px 2px 8px rgba(0,0,0,0.8)' : 'none'};
        letter-spacing: ${layer.letterSpacing || 0}px;
        line-height: ${layer.lineHeight || 1.2};
        opacity: ${(layer.opacity ?? 100) / 100};
        white-space: pre-wrap;
        word-break: break-word;
        max-width: 90vw;
        pointer-events: none;
        user-select: none;
      ">${esc(layer.text || '')}</div>`;
    }).join('');

    // Injetar CSS responsivo dos presets
    if (responsiveCss) {
      let styleTag = document.getElementById('heroLayersResponsive');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'heroLayersResponsive';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = responsiveCss;
    }
  }

  // Preencher Sobre
  const sobreTitle = document.getElementById('sobreTitle');
  if (sobreTitle) {
    sobreTitle.textContent = content.sobre?.title || 'Sobre';
  }

  const sobreText = document.getElementById('sobreText');
  if (sobreText) {
    sobreText.textContent = content.sobre?.text || '';
  }

  const sobreImage = document.getElementById('sobreImage');
  if (sobreImage) {
    const sobreCanvasLayers = content.sobre?.canvasLayers || [];
    if (sobreCanvasLayers.length > 0) {
      // Modo canvas: substituir <img> por container com layers posicionadas
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:100%;aspect-ratio:3/4;overflow:hidden;';

      wrap.innerHTML = sobreCanvasLayers.map((layer) => {
        if (layer.type !== 'image' || !layer.url) return '';
        const x   = layer.x      ?? 50;
        const y   = layer.y      ?? 50;
        const w   = layer.width  ?? 70;
        const h   = layer.height ?? 70;
        const rot = layer.rotation ?? 0;
        const flipH = layer.flipH ? 'scaleX(-1)' : '';
        const flipV = layer.flipV ? 'scaleY(-1)' : '';
        const opacity = (layer.opacity ?? 100) / 100;
        const radius  = layer.borderRadius ?? 0;
        // Sombra no wrapper externo (sem overflow:hidden) para não clipar
        const shadow = layer.shadow
          ? `drop-shadow(0px 4px ${layer.shadowBlur || 10}px ${layer.shadowColor || 'rgba(0,0,0,0.5)'})`
          : 'none';
        return `
          <div style="
            position:absolute;left:${x}%;top:${y}%;
            width:${w}%;height:${h}%;
            transform:translate(-50%,-50%) rotate(${rot}deg) ${flipH} ${flipV};
            opacity:${opacity};
            filter:${shadow};
            pointer-events:none;user-select:none;
          ">
            <img src="${resolvePath(layer.url)}" style="
              width:100%;height:100%;object-fit:cover;display:block;
              border-radius:${radius}px;
            " alt="">
          </div>`;
      }).join('');

      sobreImage.replaceWith(wrap);
    } else {
      // Modo legado: usar <img> simples
      const sobreImageUrl = content.sobre?.image || (content.sobre?.images?.[0]?.image) || '';
      if (sobreImageUrl) {
        sobreImage.src = resolvePath(sobreImageUrl);
      } else {
        sobreImage.style.background = '#1f2937';
        sobreImage.style.minHeight = '200px';
        sobreImage.alt = 'Sua foto aqui';
      }
    }
  }

  // Preencher Portfolio
  const portfolioGrid = document.getElementById('portfolioGrid');
  if (portfolioGrid) {
    const portfolioData = content.portfolio || {};
    const canvasLayers = portfolioData.canvasLayers;
    const canvasBg = portfolioData.canvasBg || {};

    if (canvasLayers && canvasLayers.length > 0) {
      // Modo canvas: renderizar layers livres posicionadas (igual ao hero)
      // Aplicar fundo da seção portfolio
      const sectionEl = document.getElementById('section-portfolio');
      if (sectionEl && canvasBg.type) {
        if (canvasBg.type === 'image' && canvasBg.url) {
          sectionEl.style.backgroundImage = `url('${resolvePath(canvasBg.url)}')`;
          sectionEl.style.backgroundSize = 'cover';
          sectionEl.style.backgroundPosition = `${canvasBg.posX || 50}% ${canvasBg.posY || 50}%`;
          if (canvasBg.overlayOpacity) {
            const overlay = sectionEl.querySelector('.section-bg-overlay') || (() => {
              const d = document.createElement('div');
              d.className = 'section-bg-overlay';
              d.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;';
              sectionEl.style.position = 'relative';
              sectionEl.insertBefore(d, sectionEl.firstChild);
              return d;
            })();
            overlay.style.background = `rgba(0,0,0,${canvasBg.overlayOpacity / 100})`;
          }
        } else if (canvasBg.type === 'solid') {
          sectionEl.style.backgroundColor = canvasBg.color || '';
        } else if (canvasBg.type === 'gradient') {
          sectionEl.style.background = `linear-gradient(${canvasBg.gradAngle || 135}deg, ${canvasBg.gradColor1 || '#1a1a2e'} 0%, ${canvasBg.gradColor2 || '#16213e'} 100%)`;
        }
      }

      // Renderizar layers em container relativo sobre o portfolioGrid
      portfolioGrid.style.cssText = 'position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;';

      const getVal = (layer, field, device) => {
        if (layer.presets && layer.presets[device] && layer.presets[device][field] !== undefined) {
          return layer.presets[device][field];
        }
        return layer[field];
      };

      let portfolioCss = '';

      portfolioGrid.innerHTML = canvasLayers.map((layer, idx) => {
        const type = layer.type || 'text';
        const layerClass = `pl-${layer.id || idx}`;
        const dkX = getVal(layer, 'x', 'desktop') ?? layer.x ?? 50;
        const dkY = getVal(layer, 'y', 'desktop') ?? layer.y ?? 50;
        const dkRotation = getVal(layer, 'rotation', 'desktop') ?? layer.rotation ?? 0;
        const hasTablet = layer.presets?.tablet;
        const hasMobile = layer.presets?.mobile;

        if (type === 'image') {
          const dkW = getVal(layer, 'width', 'desktop') ?? layer.width ?? 25;
          const dkH = getVal(layer, 'height', 'desktop') ?? layer.height ?? 30;
          const flipH = layer.flipH ? 'scaleX(-1)' : '';
          const flipV = layer.flipV ? 'scaleY(-1)' : '';
          const baseTransform = `translate(-50%, -50%) rotate(VAR_ROT) ${flipH} ${flipV}`.trim();
          const shadow = layer.shadow ? `drop-shadow(0px 4px ${layer.shadowBlur || 10}px ${layer.shadowColor || 'rgba(0,0,0,0.5)'})` : '';

          if (hasTablet) {
            const tx = getVal(layer, 'x', 'tablet') ?? dkX;
            const ty = getVal(layer, 'y', 'tablet') ?? dkY;
            const tw = getVal(layer, 'width', 'tablet') ?? dkW;
            const th = getVal(layer, 'height', 'tablet') ?? dkH;
            const tr = getVal(layer, 'rotation', 'tablet') ?? dkRotation;
            portfolioCss += `@media(max-width:1024px){.${layerClass}{left:${tx}%!important;top:${ty}%!important;width:${tw}%!important;height:${th}%!important;transform:${baseTransform.replace('VAR_ROT', tr+'deg')}!important;}}`;
          }
          if (hasMobile) {
            const mx = getVal(layer, 'x', 'mobile') ?? dkX;
            const my = getVal(layer, 'y', 'mobile') ?? dkY;
            const mw = getVal(layer, 'width', 'mobile') ?? dkW;
            const mh = getVal(layer, 'height', 'mobile') ?? dkH;
            const mr = getVal(layer, 'rotation', 'mobile') ?? dkRotation;
            portfolioCss += `@media(max-width:480px){.${layerClass}{left:${mx}%!important;top:${my}%!important;width:${mw}%!important;height:${mh}%!important;transform:${baseTransform.replace('VAR_ROT', mr+'deg')}!important;}}`;
          }

          const transforms = `translate(-50%, -50%) rotate(${dkRotation}deg) ${flipH} ${flipV}`.trim();
          return `<div class="${layerClass}" style="
            position:absolute;left:${dkX}%;top:${dkY}%;
            width:${dkW}%;height:${dkH}%;
            transform:${transforms};
            opacity:${(layer.opacity ?? 100) / 100};
            overflow:hidden;
            border-radius:${layer.borderRadius ?? 0}px;
            filter:${shadow};
            pointer-events:none;user-select:none;
          "><img src="${resolvePath(layer.url || '')}" style="width:100%;height:100%;object-fit:cover;display:block;" alt=""></div>`;
        }

        // Texto
        const dkFs = Math.max(12, getVal(layer, 'fontSize', 'desktop') ?? layer.fontSize ?? 48);
        const transforms = `translate(-50%, -50%)${dkRotation ? ` rotate(${dkRotation}deg)` : ''}`;

        if (hasTablet) {
          const tx = getVal(layer, 'x', 'tablet') ?? dkX;
          const ty = getVal(layer, 'y', 'tablet') ?? dkY;
          const tfs = getVal(layer, 'fontSize', 'tablet') ?? dkFs;
          const tr = getVal(layer, 'rotation', 'tablet') ?? dkRotation;
          portfolioCss += `@media(max-width:1024px){.${layerClass}{left:${tx}%!important;top:${ty}%!important;font-size:${tfs}px!important;transform:translate(-50%,-50%)${tr ? ` rotate(${tr}deg)` : ''}!important;}}`;
        }
        if (hasMobile) {
          const mx = getVal(layer, 'x', 'mobile') ?? dkX;
          const my = getVal(layer, 'y', 'mobile') ?? dkY;
          const mfs = getVal(layer, 'fontSize', 'mobile') ?? Math.round(dkFs * 0.5);
          const mr = getVal(layer, 'rotation', 'mobile') ?? dkRotation;
          portfolioCss += `@media(max-width:480px){.${layerClass}{left:${mx}%!important;top:${my}%!important;font-size:${mfs}px!important;transform:translate(-50%,-50%)${mr ? ` rotate(${mr}deg)` : ''}!important;}}`;
        }

        return `<div class="${layerClass}" style="
          position:absolute;left:${dkX}%;top:${dkY}%;
          transform:${transforms};
          color:${layer.color || '#ffffff'};
          font-size:${dkFs}px;
          font-family:${layer.fontFamily || 'inherit'};
          font-weight:${layer.fontWeight || 'bold'};
          text-align:${layer.align || 'center'};
          text-shadow:${layer.shadow !== false ? '2px 2px 8px rgba(0,0,0,0.8)' : 'none'};
          opacity:${(layer.opacity ?? 100) / 100};
          white-space:pre-wrap;word-break:break-word;max-width:90%;
          pointer-events:none;user-select:none;
        ">${esc(layer.text || '')}</div>`;
      }).join('');

      if (portfolioCss) {
        let styleTag = document.getElementById('portfolioLayersResponsive');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'portfolioLayersResponsive';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = portfolioCss;
      }

    } else {
      // Modo legado: grade de fotos (photos array)
      const photos = portfolioData.photos;
      if (photos && photos.length > 0) {
        portfolioGrid.innerHTML = photos.map((p, i) => {
          const photoUrl = resolvePath(p.url || p.image || p);
          const altText = p.caption || `Portfolio ${i + 1}`;
          return `<div class="portfolio-item" onclick="openLightbox(${i})"><img src="${photoUrl}" alt="${esc(altText)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;"></div>`;
        }).join('');
      } else {
        // Sem fotos: oculta a seção inteira
        const sectionEl = document.getElementById('section-portfolio');
        if (sectionEl) sectionEl.style.display = 'none';
      }
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
  renderCustomSections(content.customSections || [], document.body, sections);

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
    // Remover listener antigo para evitar duplicatas (uso de AbortController)
    if (nav._scrollAbort) nav._scrollAbort.abort();
    nav._scrollAbort = new AbortController();
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true, signal: nav._scrollAbort.signal });
  }

  if (hamburger && navLinks) {
    // Remover listeners antigos clonando os elementos
    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHamburger, hamburger);
    const newNavLinks = navLinks.cloneNode(true);
    navLinks.parentNode.replaceChild(newNavLinks, navLinks);

    newHamburger.addEventListener('click', () => {
      newNavLinks.classList.toggle('open');
    });

    // Fechar menu e fazer scroll suave ao clicar em link
    newNavLinks.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      e.preventDefault();
      newNavLinks.classList.remove('open');
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        const navHeight = nav ? nav.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top, behavior: 'smooth' });
      }
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
    renderSite(data, { previewDevice: e.data._previewDevice });
    // Re-inicializar comportamento do nav após renderSite reescrever os links
    initNavBehavior();
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
