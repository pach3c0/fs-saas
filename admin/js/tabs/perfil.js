/**
 * Tab: Perfil e Identidade Visual
 * Gerencia os dados da organização, incluindo logotipo e configurações de marca d'água.
 */

import { apiGet, apiPut } from '../utils/api.js';
import { uploadImage, showUploadProgress } from '../utils/upload.js';
import { resolveImagePath, escapeHtml } from '../utils/helpers.js';
import { appState } from '../state.js';

let organizationData = {};

const positionOptions = [
  { value: 'center', label: 'Centro' },
  { value: 'tiled', label: 'Ladrilho' },
  { value: 'top-left', label: 'Sup. Esquerdo' },
  { value: 'top-right', label: 'Sup. Direito' },
  { value: 'bottom-left', label: 'Inf. Esquerdo' },
  { value: 'bottom-right', label: 'Inf. Direito' },
];

const fontOptions = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Dancing Script', label: 'Dancing Script' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Roboto Slab', label: 'Roboto Slab' },
];

const imageFilterOptions = [
  { value: 'none', label: 'Original', icon: '🎨' },
  { value: 'grayscale', label: 'Preto & Branco', icon: '⬛' },
  { value: 'invert', label: 'Invertido', icon: '🔄' },
  { value: 'white', label: 'Branco Puro', icon: '⬜' },
];

// Placeholders em Base64 para evitar erros 404 e dependências externas
const PLACEHOLDER_LOGO = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzNzQxNTEiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiNmZmYiPkxvZ288L3RleHQ+PC9zdmc+';

// Preview backgrounds para simular fotos claras/escuras
const PREVIEW_BG_DARK = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
const PREVIEW_BG_LIGHT = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
const PREVIEW_BG_PHOTO = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

// ===== FUNÇÕES DE PREVIEW =====

function getImageFilterCSS(filter) {
  switch (filter) {
    case 'grayscale': return 'grayscale(1)';
    case 'invert': return 'invert(1)';
    case 'white': return 'brightness(0) invert(1)';
    default: return 'none';
  }
}

function updateWatermarkPreview(container) {
  if (!container) return;
  const preview = container.querySelector('#watermarkPreview');
  if (!preview) return;

  // Ler todos os valores
  const typeInput = container.querySelector('input[name="watermarkType"]:checked');
  const type = typeInput ? typeInput.value : 'text';

  const textInput = container.querySelector('#watermarkText');
  const text = textInput ? textInput.value : '';

  const opacityInput = container.querySelector('#watermarkOpacity');
  const opacity = opacityInput ? parseFloat(opacityInput.value) : 15;

  const positionInput = container.querySelector('input[name="watermarkPosition"]:checked');
  if (!positionInput) return;
  const position = positionInput.value;

  // Novos campos avançados
  const fontColorInput = container.querySelector('#watermarkFontColor');
  const fontColor = fontColorInput ? fontColorInput.value : '#ffffff';

  const fontFamilyInput = container.querySelector('#watermarkFontFamily');
  const fontFamily = fontFamilyInput ? fontFamilyInput.value : 'Arial';

  const fontWeightInput = container.querySelector('input[name="watermarkFontWeight"]:checked');
  const fontWeight = fontWeightInput ? fontWeightInput.value : 'bold';

  const fontStyleInput = container.querySelector('#watermarkFontStyle');
  const fontStyle = fontStyleInput ? (fontStyleInput.checked ? 'italic' : 'normal') : 'normal';

  const letterSpacingInput = container.querySelector('#watermarkLetterSpacing');
  const letterSpacing = letterSpacingInput ? parseFloat(letterSpacingInput.value) : 0;

  const rotationInput = container.querySelector('#watermarkRotation');
  const rotation = rotationInput ? parseFloat(rotationInput.value) : -30;

  const customSizeInput = container.querySelector('#watermarkCustomSize');
  const customSize = customSizeInput ? parseFloat(customSizeInput.value) : 24;

  const shadowInput = container.querySelector('#watermarkShadow');
  const shadow = shadowInput ? shadowInput.checked : true;

  const imageFilterInput = container.querySelector('input[name="watermarkImageFilter"]:checked');
  const imageFilter = imageFilterInput ? imageFilterInput.value : 'none';

  const imageOpacityInput = container.querySelector('#watermarkImageOpacity');
  const imageOpacity = imageOpacityInput ? parseFloat(imageOpacityInput.value) : 80;

  // Atualizar labels dinâmicos
  const opacityLabel = container.querySelector('#opacityLabel');
  if (opacityLabel) opacityLabel.textContent = `${opacity}%`;

  const letterSpacingLabel = container.querySelector('#letterSpacingLabel');
  if (letterSpacingLabel) letterSpacingLabel.textContent = `${letterSpacing}px`;

  const rotationLabel = container.querySelector('#rotationLabel');
  if (rotationLabel) rotationLabel.textContent = `${rotation}°`;

  const customSizeLabel = container.querySelector('#customSizeLabel');
  if (customSizeLabel) customSizeLabel.textContent = `${customSize}px`;

  const imageOpacityLabel = container.querySelector('#imageOpacityLabel');
  if (imageOpacityLabel) imageOpacityLabel.textContent = `${imageOpacity}%`;

  // Atualizar preview do swatch de cor
  const colorSwatch = container.querySelector('#fontColorSwatch');
  if (colorSwatch) colorSwatch.style.background = fontColor;

  // Construir CSS de texto
  const textShadowCSS = shadow
    ? (isLightColor(fontColor)
      ? '0 0 4px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)'
      : '0 0 4px rgba(255,255,255,0.8), 0 0 2px rgba(255,255,255,0.6), 0 1px 3px rgba(255,255,255,0.3)')
    : 'none';

  const fontWeightCSS = fontWeight === 'light' ? '300' : fontWeight === 'bold' ? '700' : '400';

  const watermarkEl = preview.querySelector('.watermark-overlay');
  if (!watermarkEl) return;

  // Reset
  watermarkEl.style = '';
  watermarkEl.innerHTML = '';

  // Common styles
  watermarkEl.style.opacity = opacity / 100;
  watermarkEl.style.position = 'absolute';
  watermarkEl.style.inset = '0';
  watermarkEl.style.pointerEvents = 'none';

  const displayText = text || organizationData.name || 'Seu Estúdio';
  const isTiled = position === 'tiled';
  const imgFilterCSS = getImageFilterCSS(imageFilter);

  if (isTiled) {
    watermarkEl.style.backgroundRepeat = 'repeat';
    watermarkEl.style.backgroundPosition = 'center';

    if (type === 'logo' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const sizeValue = `${Math.max(60, customSize * 4)}px`;
      watermarkEl.style.backgroundImage = `url(${logoUrl})`;
      watermarkEl.style.backgroundSize = sizeValue;
      // Aplicar filtro via pseudo-elemento não é possível direto, mas podemos usar mix-blend-mode
      if (imageFilter !== 'none') {
        watermarkEl.style.filter = imgFilterCSS;
      }
      watermarkEl.style.opacity = (imageOpacity / 100) * (opacity / 100);
    } else if (type === 'both' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const logoSize = `${Math.max(40, customSize * 3)}px`;
      const svg = buildTiledSvg(displayText, fontColor, fontFamily, fontWeightCSS, fontStyle, customSize, letterSpacing, rotation, textShadowCSS);
      watermarkEl.style.backgroundImage = `url("data:image/svg+xml;base64,${btoa(svg)}"), url(${logoUrl})`;
      watermarkEl.style.backgroundSize = `300px 250px, ${logoSize}`;
      watermarkEl.style.backgroundRepeat = 'repeat, no-repeat';
      watermarkEl.style.backgroundPosition = 'center, bottom 1rem right 1rem';
    } else {
      const svg = buildTiledSvg(displayText, fontColor, fontFamily, fontWeightCSS, fontStyle, customSize, letterSpacing, rotation, textShadowCSS);
      watermarkEl.style.backgroundImage = `url("data:image/svg+xml;base64,${btoa(svg)}")`;
    }
  } else {
    watermarkEl.style.display = 'flex';
    watermarkEl.style.justifyContent = position.includes('right') ? 'flex-end' : position.includes('left') ? 'flex-start' : 'center';
    watermarkEl.style.alignItems = position.includes('top') ? 'flex-start' : position.includes('bottom') ? 'flex-end' : 'center';
    watermarkEl.style.padding = '1rem';

    if (type === 'logo' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const imgW = `${Math.max(40, customSize * 3)}px`;
      watermarkEl.innerHTML = `<img src="${logoUrl}" style="width:${imgW}; height:auto; max-width:80%; max-height:80%; filter:${imgFilterCSS}; opacity:${imageOpacity / 100};">`;
    } else if (type === 'both' && organizationData.logo) {
      const logoUrl = resolveImagePath(organizationData.logo);
      const imgW = `${Math.max(40, customSize * 3)}px`;
      watermarkEl.innerHTML = `
        <div style="display:inline-flex; flex-direction:column; align-items:center; gap:0.25rem;">
          <img src="${logoUrl}" style="width:${imgW}; height:auto; max-width:80%; max-height:60%; filter:${imgFilterCSS}; opacity:${imageOpacity / 100};">
          <span style="font-family:'${fontFamily}',sans-serif; font-weight:${fontWeightCSS}; font-style:${fontStyle}; color:${fontColor}; font-size:${customSize}px; letter-spacing:${letterSpacing}px; text-shadow:${textShadowCSS}; transform:rotate(${rotation}deg); white-space:nowrap;">${escapeHtml(displayText)}</span>
        </div>`;
    } else {
      watermarkEl.innerHTML = `<span style="font-family:'${fontFamily}',sans-serif; font-weight:${fontWeightCSS}; font-style:${fontStyle}; color:${fontColor}; font-size:${customSize}px; letter-spacing:${letterSpacing}px; text-shadow:${textShadowCSS}; transform:rotate(${rotation}deg); display:inline-block; white-space:nowrap;">${escapeHtml(displayText)}</span>`;
    }
  }
}

function buildTiledSvg(text, color, fontFamily, fontWeight, fontStyle, fontSize, letterSpacing, rotation, shadowCSS) {
  const safeText = escapeHtml(text);
  // Usar família genérica como fallback dentro do SVG
  const safeFontFamily = fontFamily.includes(' ') ? `'${fontFamily}', sans-serif` : `${fontFamily}, sans-serif`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="250">
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="${safeFontFamily}" font-weight="${fontWeight}" font-style="${fontStyle}" font-size="${fontSize}"
      fill="${color}" letter-spacing="${letterSpacing}" transform="rotate(${rotation} 150 125)"
      opacity="0.7">${safeText}</text>
  </svg>`;
}

function isLightColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substr(0, 2), 16);
  const g = parseInt(c.substr(2, 2), 16);
  const b = parseInt(c.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// Aplicar preset e atualizar todos os inputs
function applyPreset(container, preset) {
  const presets = {
    'light-bg': {
      watermarkFontColor: '#1a1a1a',
      watermarkShadow: true,
      watermarkFontFamily: 'Arial',
      watermarkFontWeight: 'bold',
      watermarkFontStyle: 'normal',
      watermarkLetterSpacing: 2,
      watermarkRotation: -30,
    },
    'dark-bg': {
      watermarkFontColor: '#ffffff',
      watermarkShadow: true,
      watermarkFontFamily: 'Arial',
      watermarkFontWeight: 'bold',
      watermarkFontStyle: 'normal',
      watermarkLetterSpacing: 2,
      watermarkRotation: -30,
    },
    'professional': {
      watermarkFontColor: '#ffffff',
      watermarkShadow: false,
      watermarkFontFamily: 'Playfair Display',
      watermarkFontWeight: 'normal',
      watermarkFontStyle: 'italic',
      watermarkLetterSpacing: 5,
      watermarkRotation: 0,
    },
    'minimalist': {
      watermarkFontColor: '#cccccc',
      watermarkShadow: false,
      watermarkFontFamily: 'Inter',
      watermarkFontWeight: 'light',
      watermarkFontStyle: 'normal',
      watermarkLetterSpacing: 8,
      watermarkRotation: 0,
    },
  };

  const p = presets[preset];
  if (!p) return;

  // Aplicar valores nos inputs
  const colorInput = container.querySelector('#watermarkFontColor');
  if (colorInput) colorInput.value = p.watermarkFontColor;

  const familyInput = container.querySelector('#watermarkFontFamily');
  if (familyInput) familyInput.value = p.watermarkFontFamily;

  const weightInputs = container.querySelectorAll('input[name="watermarkFontWeight"]');
  weightInputs.forEach(i => { i.checked = i.value === p.watermarkFontWeight; });

  const styleInput = container.querySelector('#watermarkFontStyle');
  if (styleInput) styleInput.checked = p.watermarkFontStyle === 'italic';

  const letterInput = container.querySelector('#watermarkLetterSpacing');
  if (letterInput) letterInput.value = p.watermarkLetterSpacing;

  const rotInput = container.querySelector('#watermarkRotation');
  if (rotInput) rotInput.value = p.watermarkRotation;

  const shadowInput = container.querySelector('#watermarkShadow');
  if (shadowInput) shadowInput.checked = p.watermarkShadow;

  updateWatermarkPreview(container);
}

// Resetar formatação da watermark (mantém texto e tipo/logo)
function resetWatermark(container) {
  const defaults = {
    watermarkFontColor: '#ffffff',
    watermarkFontFamily: 'Arial',
    watermarkFontWeight: 'bold',
    watermarkFontStyle: 'normal',
    watermarkLetterSpacing: 0,
    watermarkRotation: -30,
    watermarkCustomSize: 24,
    watermarkShadow: true,
    watermarkImageFilter: 'none',
    watermarkImageOpacity: 80,
    watermarkOpacity: 15,
    watermarkPosition: 'center',
  };

  // Cor
  const colorInput = container.querySelector('#watermarkFontColor');
  if (colorInput) colorInput.value = defaults.watermarkFontColor;

  // Fonte
  const familyInput = container.querySelector('#watermarkFontFamily');
  if (familyInput) familyInput.value = defaults.watermarkFontFamily;

  // Peso
  container.querySelectorAll('input[name="watermarkFontWeight"]').forEach(r => {
    r.checked = r.value === defaults.watermarkFontWeight;
    const label = r.closest('label');
    if (label) {
      if (r.checked) { label.style.background = 'var(--accent)'; label.style.color = 'white'; label.style.borderColor = 'var(--accent)'; }
      else { label.style.background = ''; label.style.color = 'var(--text-primary)'; label.style.borderColor = 'var(--border)'; }
    }
  });

  // Itálico
  const styleInput = container.querySelector('#watermarkFontStyle');
  if (styleInput) {
    styleInput.checked = false;
    const label = styleInput.closest('label');
    if (label) { label.style.background = ''; label.style.color = 'var(--text-primary)'; label.style.borderColor = 'var(--border)'; }
  }

  // Sliders
  const sliders = {
    '#watermarkCustomSize': defaults.watermarkCustomSize,
    '#watermarkLetterSpacing': defaults.watermarkLetterSpacing,
    '#watermarkRotation': defaults.watermarkRotation,
    '#watermarkOpacity': defaults.watermarkOpacity,
    '#watermarkImageOpacity': defaults.watermarkImageOpacity,
  };
  for (const [sel, val] of Object.entries(sliders)) {
    const el = container.querySelector(sel);
    if (el) el.value = val;
  }

  // Sombra
  const shadowInput = container.querySelector('#watermarkShadow');
  if (shadowInput) shadowInput.checked = defaults.watermarkShadow;

  // Posição
  container.querySelectorAll('input[name="watermarkPosition"]').forEach(r => {
    r.checked = r.value === defaults.watermarkPosition;
    const label = r.closest('label');
    if (label) {
      if (r.checked) { label.style.background = 'var(--accent)'; label.style.color = 'white'; label.style.borderColor = 'var(--accent)'; }
      else { label.style.background = ''; label.style.color = 'var(--text-primary)'; label.style.borderColor = 'var(--border)'; }
    }
  });

  // Filtro de imagem
  container.querySelectorAll('input[name="watermarkImageFilter"]').forEach(r => {
    r.checked = r.value === defaults.watermarkImageFilter;
    const label = r.closest('label');
    if (label) {
      if (r.checked) { label.style.background = 'var(--accent)'; label.style.color = 'white'; label.style.borderColor = 'var(--accent)'; }
      else { label.style.background = ''; label.style.color = 'var(--text-primary)'; label.style.borderColor = 'var(--border)'; }
    }
  });

  updateWatermarkPreview(container);
  window.showToast?.('Formatação resetada para o padrão', 'info');
}

// ===== RENDER PRINCIPAL =====

export async function renderPerfil(container) {
  try {
    const response = await apiGet('/api/organization/profile');
    organizationData = response.data || response;
  } catch (error) {
    container.innerHTML = `<p style="color:#f87171;">Erro ao carregar dados do perfil.</p>`;
    return;
  }

  const data = organizationData;

  // Valores com fallback para os novos campos
  const wm = {
    type: data.watermarkType || 'text',
    text: data.watermarkText || '',
    opacity: data.watermarkOpacity ?? 15,
    position: data.watermarkPosition || 'center',
    size: data.watermarkSize || 'medium',
    fontColor: data.watermarkFontColor || '#ffffff',
    fontFamily: data.watermarkFontFamily || 'Arial',
    fontWeight: data.watermarkFontWeight || 'bold',
    fontStyle: data.watermarkFontStyle || 'normal',
    letterSpacing: data.watermarkLetterSpacing ?? 0,
    rotation: data.watermarkRotation ?? -30,
    customSize: data.watermarkCustomSize ?? 24,
    shadow: data.watermarkShadow !== false,
    imageFilter: data.watermarkImageFilter || 'none',
    imageOpacity: data.watermarkImageOpacity ?? 80,
  };

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:2.5rem;">
      <h2 style="font-size:1.5rem; font-weight:bold; color:var(--text-primary);">Perfil e Identidade Visual</h2>

      <!-- DADOS DO ESTÚDIO -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">Dados do Estúdio</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:1rem;">
          <div class="input-group" style="margin-bottom:0;">
            <label>Nome do Estúdio</label>
            <input type="text" id="orgName" class="input" value="${escapeHtml(data.name || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Email de Contato</label>
            <input type="email" id="orgEmail" class="input" value="${escapeHtml(data.email || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Telefone / WhatsApp</label>
            <input type="text" id="orgWhatsapp" class="input" value="${escapeHtml(data.whatsapp || '')}">
          </div>
          <div class="input-group" style="margin-bottom:0;">
            <label>Website</label>
            <input type="text" id="orgWebsite" class="input" value="${escapeHtml(data.website || '')}">
          </div>
        </div>
      </div>

      <!-- LOGOTIPO -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">Logotipo</h3>
        <div style="display:flex; align-items:center; gap:1.5rem;">
            <img id="logoPreview" src="${data.logo ? resolveImagePath(data.logo) : PLACEHOLDER_LOGO}" onerror="this.src='${PLACEHOLDER_LOGO}'" style="height:50px; max-width:150px; background:white; padding:5px; border-radius:4px; object-fit: contain;">
            <div>
                <label style="background:var(--bg-hover); color:white; padding:0.5rem 1rem; border-radius:0.375rem; font-weight:600; cursor:pointer;">
                    Enviar Logo
                    <input type="file" id="logoUpload" accept=".jpg,.jpeg,.png,.svg,.webp" style="display:none;">
                </label>
                <div id="logoUploadProgress" style="margin-top:0.5rem;"></div>
            </div>
        </div>
      </div>

      <!-- WATERMARK AVANÇADO -->
      <div style="background:var(--bg-surface); padding:1.5rem; border-radius:0.5rem; border:1px solid var(--border);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem;">
          <h3 style="font-size:1.25rem; font-weight:600; color:var(--text-primary); margin:0;">Marca D'água</h3>
          <div style="display:flex; gap:0.375rem;">
            <button class="preset-btn" data-preset="light-bg" style="background:var(--bg-hover); color:var(--text-primary); border:1px solid var(--border); padding:0.25rem 0.625rem; border-radius:0.25rem; font-size:0.6875rem; cursor:pointer; transition:all 0.15s;" title="Otimizado para fotos com fundo claro">☀️ Fundo Claro</button>
            <button class="preset-btn" data-preset="dark-bg" style="background:var(--bg-hover); color:var(--text-primary); border:1px solid var(--border); padding:0.25rem 0.625rem; border-radius:0.25rem; font-size:0.6875rem; cursor:pointer; transition:all 0.15s;" title="Otimizado para fotos com fundo escuro">🌙 Fundo Escuro</button>
            <button class="preset-btn" data-preset="professional" style="background:var(--bg-hover); color:var(--text-primary); border:1px solid var(--border); padding:0.25rem 0.625rem; border-radius:0.25rem; font-size:0.6875rem; cursor:pointer; transition:all 0.15s;" title="Estilo elegante e profissional">✨ Profissional</button>
            <button class="preset-btn" data-preset="minimalist" style="background:var(--bg-hover); color:var(--text-primary); border:1px solid var(--border); padding:0.25rem 0.625rem; border-radius:0.25rem; font-size:0.6875rem; cursor:pointer; transition:all 0.15s;" title="Estilo minimalista e discreto">🔲 Minimalista</button>
            <span style="width:1px; height:16px; background:var(--border); margin:0 0.125rem;"></span>
            <button id="resetWatermarkBtn" style="background:transparent; color:var(--ad-red, #f85149); border:1px solid var(--ad-red, #f85149); padding:0.25rem 0.625rem; border-radius:0.25rem; font-size:0.6875rem; cursor:pointer; transition:all 0.15s;" title="Voltar todas as configurações para o padrão">🔄 Resetar</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- COLUNA DE CONFIGURAÇÕES -->
            <div style="display:flex; flex-direction:column; gap:1.25rem;">

                <!-- Tipo -->
                <div>
                    <label style="display:block; font-size:0.8125rem; font-weight:600; margin-bottom:0.5rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Tipo</label>
                    <div style="display:flex; gap:0.5rem;">
                        ${['text', 'logo', 'both'].map(t => `
                          <label style="flex:1; display:flex; align-items:center; justify-content:center; gap:0.375rem; padding:0.5rem; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer; font-size:0.8125rem; color:var(--text-primary); transition:all 0.15s; ${wm.type === t ? 'background:var(--accent); color:white; border-color:var(--accent);' : ''}">
                            <input type="radio" name="watermarkType" value="${t}" ${wm.type === t ? 'checked' : ''} style="display:none;">
                            ${t === 'text' ? '📝 Texto' : t === 'logo' ? '🖼️ Logo' : '📝+🖼️ Ambos'}
                          </label>
                        `).join('')}
                    </div>
                </div>

                <!-- Texto -->
                <div class="input-group" style="margin-bottom:0;">
                    <label style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Texto da Marca</label>
                    <input type="text" id="watermarkText" class="input" value="${escapeHtml(wm.text)}" placeholder="Padrão: Nome do Estúdio">
                </div>

                <!-- Tipografia -->
                <div style="background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border);">
                  <label style="display:block; font-size:0.8125rem; font-weight:600; margin-bottom:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Tipografia</label>

                  <!-- Fonte -->
                  <div style="display:grid; grid-template-columns:1fr auto; gap:0.75rem; align-items:end; margin-bottom:0.75rem;">
                    <div>
                      <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Fonte</label>
                      <select id="watermarkFontFamily" class="input" style="font-size:0.875rem;">
                        ${fontOptions.map(f => `<option value="${f.value}" style="font-family:'${f.value}',sans-serif;" ${wm.fontFamily === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
                      </select>
                    </div>
                    <div>
                      <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Cor</label>
                      <div style="display:flex; align-items:center; gap:0.375rem;">
                        <div id="fontColorSwatch" style="width:28px; height:28px; border-radius:0.25rem; border:2px solid var(--border); background:${wm.fontColor}; cursor:pointer; position:relative; overflow:hidden;">
                          <input type="color" id="watermarkFontColor" value="${wm.fontColor}" style="position:absolute; inset:-4px; width:calc(100% + 8px); height:calc(100% + 8px); cursor:pointer; border:none; opacity:0;">
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-secondary); font-family:monospace;">${wm.fontColor}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Peso + Itálico -->
                  <div style="display:flex; gap:0.75rem; align-items:end; margin-bottom:0.75rem;">
                    <div style="flex:1;">
                      <label style="display:block; font-size:0.75rem; color:var(--text-secondary); margin-bottom:0.25rem;">Peso</label>
                      <div style="display:flex; gap:0.25rem;">
                        ${['light', 'normal', 'bold'].map(w => `
                          <label style="flex:1; display:flex; align-items:center; justify-content:center; padding:0.375rem 0; border:1px solid var(--border); border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-weight:${w === 'light' ? '300' : w === 'bold' ? '700' : '400'}; color:var(--text-primary); transition:all 0.15s; ${wm.fontWeight === w ? 'background:var(--accent); color:white; border-color:var(--accent);' : ''}">
                            <input type="radio" name="watermarkFontWeight" value="${w}" ${wm.fontWeight === w ? 'checked' : ''} style="display:none;">
                            ${w === 'light' ? 'Light' : w === 'bold' ? 'Bold' : 'Normal'}
                          </label>
                        `).join('')}
                      </div>
                    </div>
                    <div>
                      <label style="display:flex; align-items:center; gap:0.375rem; padding:0.375rem 0.75rem; border:1px solid var(--border); border-radius:0.25rem; cursor:pointer; font-size:0.75rem; font-style:italic; color:var(--text-primary); transition:all 0.15s; ${wm.fontStyle === 'italic' ? 'background:var(--accent); color:white; border-color:var(--accent);' : ''}">
                        <input type="checkbox" id="watermarkFontStyle" ${wm.fontStyle === 'italic' ? 'checked' : ''} style="display:none;">
                        <em>Itálico</em>
                      </label>
                    </div>
                  </div>

                  <!-- Tamanho -->
                  <div style="margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <label style="font-size:0.75rem; color:var(--text-secondary);">Tamanho</label>
                      <span id="customSizeLabel" style="font-size:0.75rem; color:var(--text-primary); font-weight:500;">${wm.customSize}px</span>
                    </div>
                    <input type="range" id="watermarkCustomSize" min="8" max="120" value="${wm.customSize}" style="width:100%; accent-color:var(--accent);">
                  </div>

                  <!-- Espaçamento -->
                  <div style="margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <label style="font-size:0.75rem; color:var(--text-secondary);">Espaçamento</label>
                      <span id="letterSpacingLabel" style="font-size:0.75rem; color:var(--text-primary); font-weight:500;">${wm.letterSpacing}px</span>
                    </div>
                    <input type="range" id="watermarkLetterSpacing" min="0" max="20" value="${wm.letterSpacing}" style="width:100%; accent-color:var(--accent);">
                  </div>

                  <!-- Rotação -->
                  <div style="margin-bottom:0.75rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <label style="font-size:0.75rem; color:var(--text-secondary);">Rotação</label>
                      <span id="rotationLabel" style="font-size:0.75rem; color:var(--text-primary); font-weight:500;">${wm.rotation}°</span>
                    </div>
                    <input type="range" id="watermarkRotation" min="-180" max="180" value="${wm.rotation}" style="width:100%; accent-color:var(--accent);">
                  </div>

                  <!-- Sombra -->
                  <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.8125rem; color:var(--text-primary);">
                    <input type="checkbox" id="watermarkShadow" ${wm.shadow ? 'checked' : ''} style="accent-color:var(--accent);">
                    Sombra adaptativa no texto
                    <span style="font-size:0.6875rem; color:var(--text-secondary);">(ajuda na legibilidade)</span>
                  </label>
                </div>

                <!-- Filtro de Imagem (apenas logo/both) -->
                <div id="imageFilterSection" style="background:var(--bg-base); padding:1rem; border-radius:0.5rem; border:1px solid var(--border); ${wm.type === 'text' ? 'display:none;' : ''}">
                  <label style="display:block; font-size:0.8125rem; font-weight:600; margin-bottom:0.75rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Filtro do Logo</label>
                  <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.375rem; margin-bottom:0.75rem;">
                    ${imageFilterOptions.map(f => `
                      <label style="display:flex; flex-direction:column; align-items:center; gap:0.25rem; padding:0.5rem 0.25rem; border:1px solid var(--border); border-radius:0.375rem; cursor:pointer; font-size:0.6875rem; color:var(--text-primary); transition:all 0.15s; ${wm.imageFilter === f.value ? 'background:var(--accent); color:white; border-color:var(--accent);' : ''}">
                        <input type="radio" name="watermarkImageFilter" value="${f.value}" ${wm.imageFilter === f.value ? 'checked' : ''} style="display:none;">
                        <span style="font-size:1rem;">${f.icon}</span>
                        ${f.label}
                      </label>
                    `).join('')}
                  </div>
                  <div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <label style="font-size:0.75rem; color:var(--text-secondary);">Opacidade do Logo</label>
                      <span id="imageOpacityLabel" style="font-size:0.75rem; color:var(--text-primary); font-weight:500;">${wm.imageOpacity}%</span>
                    </div>
                    <input type="range" id="watermarkImageOpacity" min="5" max="100" value="${wm.imageOpacity}" style="width:100%; accent-color:var(--accent);">
                  </div>
                </div>

                <!-- Opacidade geral -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Opacidade Geral</label>
                    <span id="opacityLabel" style="font-size:0.75rem; color:var(--text-primary); font-weight:500;">${wm.opacity}%</span>
                  </div>
                  <input type="range" id="watermarkOpacity" min="5" max="50" value="${wm.opacity}" style="width:100%; accent-color:var(--accent);">
                </div>

                <!-- Posição -->
                <div>
                    <label style="display:block; font-size:0.8125rem; font-weight:600; margin-bottom:0.5rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Posição</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.375rem;">
                        ${positionOptions.map(opt => `
                            <label style="display:flex; align-items:center; gap:0.375rem; padding:0.375rem 0.5rem; border:1px solid var(--border); border-radius:0.25rem; cursor:pointer; font-size:0.8125rem; color:var(--text-primary); transition:all 0.15s; ${wm.position === opt.value ? 'background:var(--accent); color:white; border-color:var(--accent);' : ''}">
                              <input type="radio" name="watermarkPosition" value="${opt.value}" ${wm.position === opt.value ? 'checked' : ''} style="display:none;">
                              ${opt.label}
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- COLUNA DE PREVIEW -->
            <div style="position:sticky; top:1rem; align-self:start;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <label style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em;">Preview</label>
                  <div style="display:flex; gap:0.25rem;">
                    <button class="preview-bg-btn" data-bg="dark" style="width:24px; height:24px; border-radius:0.25rem; border:2px solid var(--accent); cursor:pointer; background:#1a1a2e;" title="Fundo Escuro"></button>
                    <button class="preview-bg-btn" data-bg="light" style="width:24px; height:24px; border-radius:0.25rem; border:2px solid transparent; cursor:pointer; background:#f5f7fa;" title="Fundo Claro"></button>
                    <button class="preview-bg-btn" data-bg="photo" style="width:24px; height:24px; border-radius:0.25rem; border:2px solid transparent; cursor:pointer; background:linear-gradient(135deg, #667eea, #764ba2);" title="Fundo Colorido"></button>
                  </div>
                </div>
                <div id="watermarkPreview" style="position:relative; width:100%; aspect-ratio: 4/3; background:${PREVIEW_BG_DARK}; border-radius:0.5rem; overflow:hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                    <div class="watermark-overlay"></div>
                </div>
                <p style="font-size:0.6875rem; color:var(--text-secondary); margin-top:0.5rem; text-align:center;">Troque o fundo para simular diferentes tipos de foto</p>
            </div>
        </div>
      </div>

      <!-- BOTAO SALVAR -->
      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button id="saveProfileBtn" style="background:var(--accent); color:white; padding:0.75rem 2rem; border-radius:0.375rem; border:none; font-weight:600; cursor:pointer;">
            Salvar Alterações
        </button>
      </div>
    </div>
  `;

  // --- EVENT LISTENERS ---

  // Upload logo
  container.querySelector('#logoUpload').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await uploadImage(file, appState.authToken, (percent) => {
        showUploadProgress('logoUploadProgress', percent);
      });
      organizationData.logo = result.url;
      container.querySelector('#logoPreview').src = resolveImagePath(result.url);
      updateWatermarkPreview(container);
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      e.target.value = '';
      showUploadProgress('logoUploadProgress', 0);
    }
  };

  // Preview background switcher
  container.querySelectorAll('.preview-bg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bg = btn.dataset.bg;
      const preview = container.querySelector('#watermarkPreview');
      if (!preview) return;

      const bgs = { dark: PREVIEW_BG_DARK, light: PREVIEW_BG_LIGHT, photo: PREVIEW_BG_PHOTO };
      preview.style.background = bgs[bg] || PREVIEW_BG_DARK;

      // Atualizar borda ativa
      container.querySelectorAll('.preview-bg-btn').forEach(b => {
        b.style.borderColor = b === btn ? 'var(--accent)' : 'transparent';
      });
    });
  });

  // Presets
  container.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyPreset(container, btn.dataset.preset);
    });
  });

  // Reset
  const resetBtn = container.querySelector('#resetWatermarkBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => resetWatermark(container));
  }

  // Mostrar/ocultar seção de filtro de imagem baseado no tipo
  container.querySelectorAll('input[name="watermarkType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const filterSection = container.querySelector('#imageFilterSection');
      if (filterSection) {
        filterSection.style.display = radio.value === 'text' ? 'none' : '';
      }
      // Atualizar visual dos botões tipo
      container.querySelectorAll('input[name="watermarkType"]').forEach(r => {
        const label = r.closest('label');
        if (label) {
          if (r.checked) {
            label.style.background = 'var(--accent)';
            label.style.color = 'white';
            label.style.borderColor = 'var(--accent)';
          } else {
            label.style.background = '';
            label.style.color = 'var(--text-primary)';
            label.style.borderColor = 'var(--border)';
          }
        }
      });
      updateWatermarkPreview(container);
    });
  });

  // Styled radio/checkbox toggles
  function setupStyledToggles(name) {
    container.querySelectorAll(`input[name="${name}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        container.querySelectorAll(`input[name="${name}"]`).forEach(r => {
          const label = r.closest('label');
          if (label) {
            if (r.checked) {
              label.style.background = 'var(--accent)';
              label.style.color = 'white';
              label.style.borderColor = 'var(--accent)';
            } else {
              label.style.background = '';
              label.style.color = 'var(--text-primary)';
              label.style.borderColor = 'var(--border)';
            }
          }
        });
        updateWatermarkPreview(container);
      });
    });
  }

  setupStyledToggles('watermarkFontWeight');
  setupStyledToggles('watermarkPosition');
  setupStyledToggles('watermarkImageFilter');

  // Itálico toggle
  const italicInput = container.querySelector('#watermarkFontStyle');
  if (italicInput) {
    italicInput.addEventListener('change', () => {
      const label = italicInput.closest('label');
      if (label) {
        if (italicInput.checked) {
          label.style.background = 'var(--accent)';
          label.style.color = 'white';
          label.style.borderColor = 'var(--accent)';
        } else {
          label.style.background = '';
          label.style.color = 'var(--text-primary)';
          label.style.borderColor = 'var(--border)';
        }
      }
      updateWatermarkPreview(container);
    });
  }

  // Todos os inputs que devem atualizar o preview
  const previewInputs = [
    '#watermarkText', '#watermarkOpacity', '#watermarkFontColor', '#watermarkFontFamily',
    '#watermarkLetterSpacing', '#watermarkRotation', '#watermarkCustomSize',
    '#watermarkShadow', '#watermarkImageOpacity'
  ];

  previewInputs.forEach(selector => {
    const el = container.querySelector(selector);
    if (el) {
      el.addEventListener('input', () => updateWatermarkPreview(container));
      el.addEventListener('change', () => updateWatermarkPreview(container));
    }
  });

  // Salvar perfil
  container.querySelector('#saveProfileBtn').onclick = async (e) => {
    const btn = e.target;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    const watermarkTypeInput = container.querySelector('input[name="watermarkType"]:checked');
    const watermarkPositionInput = container.querySelector('input[name="watermarkPosition"]:checked');
    const watermarkFontWeightInput = container.querySelector('input[name="watermarkFontWeight"]:checked');
    const watermarkImageFilterInput = container.querySelector('input[name="watermarkImageFilter"]:checked');

    const name = container.querySelector('#orgName').value.trim();
    if (!name) {
      window.showToast?.('O nome do estúdio é obrigatório.', 'warning');
      btn.textContent = 'Salvar Alterações';
      btn.disabled = false;
      return;
    }

    const payload = {
      name: name,
      email: container.querySelector('#orgEmail').value,
      whatsapp: container.querySelector('#orgWhatsapp').value,
      website: container.querySelector('#orgWebsite').value,
      logo: organizationData.logo,
      // Watermark base
      watermarkType: watermarkTypeInput ? watermarkTypeInput.value : 'text',
      watermarkText: container.querySelector('#watermarkText').value,
      watermarkOpacity: parseFloat(container.querySelector('#watermarkOpacity').value),
      watermarkPosition: watermarkPositionInput ? watermarkPositionInput.value : 'center',
      watermarkSize: 'medium', // Mantém campo legado
      // Watermark avançado — tipografia
      watermarkFontColor: container.querySelector('#watermarkFontColor').value,
      watermarkFontFamily: container.querySelector('#watermarkFontFamily').value,
      watermarkFontWeight: watermarkFontWeightInput ? watermarkFontWeightInput.value : 'bold',
      watermarkFontStyle: container.querySelector('#watermarkFontStyle')?.checked ? 'italic' : 'normal',
      watermarkLetterSpacing: parseFloat(container.querySelector('#watermarkLetterSpacing').value),
      watermarkRotation: parseFloat(container.querySelector('#watermarkRotation').value),
      watermarkCustomSize: parseFloat(container.querySelector('#watermarkCustomSize').value),
      watermarkShadow: container.querySelector('#watermarkShadow')?.checked ?? true,
      // Watermark avançado — imagem
      watermarkImageFilter: watermarkImageFilterInput ? watermarkImageFilterInput.value : 'none',
      watermarkImageOpacity: parseFloat(container.querySelector('#watermarkImageOpacity').value),
    };

    try {
      await apiPut('/api/organization/profile', payload);
      // Atualiza o cache local para o próximo render
      Object.assign(organizationData, payload);
      window.showToast?.('Perfil salvo com sucesso!', 'success');
    } catch (error) {
      window.showToast?.('Erro: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Salvar Alterações';
    }
  };

  // Initial render of the preview
  updateWatermarkPreview(container);
}
