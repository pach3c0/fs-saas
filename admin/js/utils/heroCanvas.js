/**
 * HeroCanvasEditor — Editor visual de Hero estilo Canva/Figma
 *
 * Canvas interativo com layers de texto e imagem.
 * Suporta drag, resize, rotate, flip, edição inline de texto.
 * Renderiza em DOM (não HTML5 Canvas) para fidelidade de fontes/CSS.
 */

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;
const MIN_LAYER_SIZE = 20; // px mínimo

/**
 * @param {HTMLElement} canvasContainer - onde o canvas será renderizado
 * @param {Object} opts
 * @param {Function} opts.onSelect - (layer|null) selecionou um layer
 * @param {Function} opts.onChange - () qualquer mudança (para dirty/preview)
 * @param {Function} opts.resolveImagePath - (url) => absolute url
 */
export class HeroCanvasEditor {
  constructor(canvasContainer, opts = {}) {
    this.container = canvasContainer;
    this.onSelect = opts.onSelect || (() => {});
    this.onChange = opts.onChange || (() => {});
    this.resolveImage = opts.resolveImagePath || (u => u);

    this.layers = [];
    this.selectedId = null;
    this.bg = { url: '', scale: 1, posX: 50, posY: 50 };
    this.overlay = { opacity: 30, topBarHeight: 0, bottomBarHeight: 0 };

    // Estado de interação
    this._drag = null;
    this._resize = null;
    this._rotate = null;
    this._editing = false;

    this._build();
    this._bindEvents();
  }

  // ── Build DOM ────────────────────────────────────────────

  _build() {
    this.container.innerHTML = '';
    this.container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0a0b10;overflow:hidden;position:relative;';

    // Wrapper que mantém aspect ratio 16:9 e escala
    this.root = document.createElement('div');
    this.root.id = 'hc-root';
    this.root.style.cssText = 'position:relative;width:1440px;height:810px;overflow:hidden;transform-origin:top center;background:#111;flex-shrink:0;';
    this.container.appendChild(this.root);

    // Background
    this.bgEl = document.createElement('div');
    this.bgEl.id = 'hc-bg';
    this.bgEl.style.cssText = 'position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;z-index:0;';
    this.root.appendChild(this.bgEl);

    // Overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'hc-overlay';
    this.overlayEl.style.cssText = 'position:absolute;inset:0;z-index:1;pointer-events:none;';
    this.root.appendChild(this.overlayEl);

    // Top bar
    this.topBarEl = document.createElement('div');
    this.topBarEl.style.cssText = 'position:absolute;top:0;left:0;right:0;height:0;background:#000;z-index:2;pointer-events:none;';
    this.root.appendChild(this.topBarEl);

    // Bottom bar
    this.bottomBarEl = document.createElement('div');
    this.bottomBarEl.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:0;background:#000;z-index:2;pointer-events:none;';
    this.root.appendChild(this.bottomBarEl);

    // Layers container
    this.layersEl = document.createElement('div');
    this.layersEl.id = 'hc-layers';
    this.layersEl.style.cssText = 'position:absolute;inset:0;z-index:3;';
    this.root.appendChild(this.layersEl);

    // Selection handles overlay
    this.handlesEl = document.createElement('div');
    this.handlesEl.id = 'hc-handles';
    this.handlesEl.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;';
    this.root.appendChild(this.handlesEl);

    this._fitToContainer();
  }

  _fitToContainer() {
    const cw = this.container.clientWidth;
    const ch = this.container.clientHeight;
    if (!cw || !ch) return;

    const scaleX = cw / 1440;
    const scaleY = ch / 810;
    const scale = Math.min(scaleX, scaleY, 1);

    this.root.style.transform = `scale(${scale})`;
    this.root.style.marginTop = ch > 810 * scale ? `${(ch - 810 * scale) / 2 / scale}px` : '0';
    this._scale = scale;
  }

  // ── Eventos ──────────────────────────────────────────────

  _bindEvents() {
    // Resize observer para refit
    this._ro = new ResizeObserver(() => this._fitToContainer());
    this._ro.observe(this.container);

    // Pointer events no root
    this.root.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this._moveHandler = this._onPointerMove.bind(this);
    this._upHandler = this._onPointerUp.bind(this);
    document.addEventListener('pointermove', this._moveHandler);
    document.addEventListener('pointerup', this._upHandler);

    // Double click para edição de texto
    this.root.addEventListener('dblclick', this._onDblClick.bind(this));

    // Teclado
    this._keyHandler = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._keyHandler);
  }

  _onPointerDown(e) {
    if (this._editing) return;
    const el = e.target.closest('[data-hc-layer]');
    const handle = e.target.closest('[data-hc-handle]');
    const rotHandle = e.target.closest('[data-hc-rotate]');

    // Clicar no handle de rotação
    if (rotHandle && this.selectedId) {
      e.preventDefault();
      e.stopPropagation();
      const layer = this._getLayer(this.selectedId);
      if (!layer) return;
      const rect = this._getLayerRect(layer);
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      this._rotate = { layerId: this.selectedId, cx, cy, startAngle: layer.rotation || 0, startPointerAngle: this._pointerAngle(e, cx, cy) };
      this.root.setPointerCapture(e.pointerId);
      return;
    }

    // Clicar no handle de resize
    if (handle && this.selectedId) {
      e.preventDefault();
      e.stopPropagation();
      const layer = this._getLayer(this.selectedId);
      if (!layer) return;
      const dir = handle.dataset.hcHandle;
      const rect = this._getLayerRect(layer);
      this._resize = {
        layerId: this.selectedId, dir,
        startX: this._toCanvasX(e), startY: this._toCanvasY(e),
        origRect: { ...rect },
        origFontSize: layer.fontSize || 48,
        origWidth: layer.width,
        origHeight: layer.height,
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }

    // Clicar em um layer
    if (el) {
      e.preventDefault();
      const layerId = el.dataset.hcLayer;
      this.selectLayer(layerId);

      const layer = this._getLayer(layerId);
      if (!layer) return;

      this._drag = {
        layerId,
        startX: this._toCanvasX(e),
        startY: this._toCanvasY(e),
        origX: layer.x ?? 50,
        origY: layer.y ?? 50,
      };
      this.root.setPointerCapture(e.pointerId);
      return;
    }

    // Clicar no vazio
    this.selectLayer(null);
  }

  _onPointerMove(e) {
    if (this._drag) {
      const dx = this._toCanvasX(e) - this._drag.startX;
      const dy = this._toCanvasY(e) - this._drag.startY;
      const pctX = (dx / 1440) * 100;
      const pctY = (dy / 810) * 100;
      const layer = this._getLayer(this._drag.layerId);
      if (!layer) return;
      layer.x = Math.max(0, Math.min(100, this._drag.origX + pctX));
      layer.y = Math.max(0, Math.min(100, this._drag.origY + pctY));
      this._renderLayer(layer);
      this._renderHandles();
      this.onChange();
    }

    if (this._resize) {
      this._doResize(e);
    }

    if (this._rotate) {
      this._doRotate(e);
    }
  }

  _onPointerUp(e) {
    this._drag = null;
    this._resize = null;
    this._rotate = null;
  }

  _onDblClick(e) {
    const el = e.target.closest('[data-hc-layer]');
    if (!el) return;
    const layerId = el.dataset.hcLayer;
    const layer = this._getLayer(layerId);
    if (!layer || (layer.type || 'text') !== 'text') return;

    this._editing = true;
    this.selectLayer(layerId);

    const textEl = el.querySelector('.hc-text-content');
    if (!textEl) return;
    textEl.contentEditable = 'true';
    textEl.style.pointerEvents = 'auto';
    textEl.style.outline = '2px solid #3b82f6';
    textEl.style.borderRadius = '2px';
    textEl.style.cursor = 'text';
    textEl.focus();

    // Selecionar todo o texto
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const finish = () => {
      textEl.contentEditable = 'false';
      textEl.style.pointerEvents = '';
      textEl.style.outline = '';
      textEl.style.cursor = '';
      layer.text = textEl.textContent;
      this._editing = false;
      this.onChange();
      this.onSelect(layer);
      textEl.removeEventListener('blur', finish);
    };
    textEl.addEventListener('blur', finish);
    textEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); textEl.blur(); }
      // Enter sem Shift = finalizar
      if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); textEl.blur(); }
    });
  }

  _onKeyDown(e) {
    if (this._editing) return;
    if (!this.selectedId) return;

    // Ignorar se foco está em input/textarea/select
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const layer = this._getLayer(this.selectedId);
    if (!layer) return;

    const step = e.shiftKey ? 0.1 : 1;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.removeLayer(this.selectedId);
        break;
      case 'ArrowUp':
        e.preventDefault();
        layer.y = Math.max(0, (layer.y ?? 50) - step);
        this._renderLayer(layer);
        this._renderHandles();
        this.onChange();
        break;
      case 'ArrowDown':
        e.preventDefault();
        layer.y = Math.min(100, (layer.y ?? 50) + step);
        this._renderLayer(layer);
        this._renderHandles();
        this.onChange();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        layer.x = Math.max(0, (layer.x ?? 50) - step);
        this._renderLayer(layer);
        this._renderHandles();
        this.onChange();
        break;
      case 'ArrowRight':
        e.preventDefault();
        layer.x = Math.min(100, (layer.x ?? 50) + step);
        this._renderLayer(layer);
        this._renderHandles();
        this.onChange();
        break;
    }
  }

  // ── Resize Logic ─────────────────────────────────────────

  _doResize(e) {
    const r = this._resize;
    if (!r) return;
    const layer = this._getLayer(r.layerId);
    if (!layer) return;

    const dx = this._toCanvasX(e) - r.startX;
    const dy = this._toCanvasY(e) - r.startY;

    const type = layer.type || 'text';

    if (type === 'text') {
      // Para texto, resize muda fontSize proporcionalmente
      const dir = r.dir;
      let scaleFactor = 1;
      if (dir.includes('s')) scaleFactor = 1 + dy / 200;
      else if (dir.includes('n')) scaleFactor = 1 - dy / 200;
      else if (dir.includes('e')) scaleFactor = 1 + dx / 200;
      else if (dir.includes('w')) scaleFactor = 1 - dx / 200;

      scaleFactor = Math.max(0.2, Math.min(5, scaleFactor));
      layer.fontSize = Math.max(8, Math.min(400, Math.round(r.origFontSize * scaleFactor)));
      this._renderLayer(layer);
      this._renderHandles();
      this.onChange();
    } else if (type === 'image') {
      // Para imagem, resize muda width/height em %
      const dir = r.dir;
      const dpctX = (dx / 1440) * 100;
      const dpctY = (dy / 810) * 100;

      let w = r.origWidth ?? 20;
      let h = r.origHeight ?? 20;

      if (dir.includes('e')) w = Math.max(2, (r.origWidth ?? 20) + dpctX * 2);
      if (dir.includes('w')) w = Math.max(2, (r.origWidth ?? 20) - dpctX * 2);
      if (dir.includes('s')) h = Math.max(2, (r.origHeight ?? 20) + dpctY * 2);
      if (dir.includes('n')) h = Math.max(2, (r.origHeight ?? 20) - dpctY * 2);

      // Shift = manter proporção
      if (e.shiftKey) {
        const ratio = (r.origWidth ?? 20) / (r.origHeight ?? 20);
        if (dir === 'se' || dir === 'nw') h = w / ratio;
        else if (dir === 'sw' || dir === 'ne') h = w / ratio;
        else if (dir === 'e' || dir === 'w') h = w / ratio;
        else h = w / ratio;
      }

      layer.width = Math.round(w * 10) / 10;
      layer.height = Math.round(h * 10) / 10;
      this._renderLayer(layer);
      this._renderHandles();
      this.onChange();
    }
  }

  // ── Rotate Logic ─────────────────────────────────────────

  _doRotate(e) {
    const r = this._rotate;
    if (!r) return;
    const layer = this._getLayer(r.layerId);
    if (!layer) return;

    const currentAngle = this._pointerAngle(e, r.cx, r.cy);
    let delta = currentAngle - r.startPointerAngle;
    let newAngle = r.startAngle + delta;

    // Snap a 15° com Shift
    if (e.shiftKey) {
      newAngle = Math.round(newAngle / 15) * 15;
    }

    layer.rotation = Math.round(newAngle);
    this._renderLayer(layer);
    this._renderHandles();
    this.onChange();
  }

  _pointerAngle(e, cx, cy) {
    const rect = this.root.getBoundingClientRect();
    const scale = this._scale || 1;
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    return Math.atan2(py - cy, px - cx) * (180 / Math.PI);
  }

  // ── Coordenadas ──────────────────────────────────────────

  _toCanvasX(e) {
    const rect = this.root.getBoundingClientRect();
    return (e.clientX - rect.left) / (this._scale || 1);
  }

  _toCanvasY(e) {
    const rect = this.root.getBoundingClientRect();
    return (e.clientY - rect.top) / (this._scale || 1);
  }

  // ── API Pública ──────────────────────────────────────────

  setBackground(bg) {
    this.bg = { ...this.bg, ...bg };
    if (this.bg.url) {
      this.bgEl.style.backgroundImage = `url('${this.resolveImage(this.bg.url)}')`;
      this.bgEl.style.backgroundPosition = `${this.bg.posX}% ${this.bg.posY}%`;
      this.bgEl.style.backgroundSize = this.bg.scale === 1 ? 'cover' : `${this.bg.scale * 100}%`;
    } else {
      this.bgEl.style.backgroundImage = '';
      this.bgEl.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    }
  }

  setOverlay(ov) {
    this.overlay = { ...this.overlay, ...ov };
    this.overlayEl.style.background = `rgba(0,0,0,${(this.overlay.opacity ?? 30) / 100})`;
    this.topBarEl.style.height = `${this.overlay.topBarHeight ?? 0}%`;
    this.bottomBarEl.style.height = `${this.overlay.bottomBarHeight ?? 0}%`;
  }

  setLayers(layers) {
    this.layers = layers.map(l => ({ ...l }));
    this._renderAllLayers();
    // Manter seleção se o layer ainda existe
    if (this.selectedId && !this._getLayer(this.selectedId)) {
      this.selectedId = null;
      this.onSelect(null);
    }
    this._renderHandles();
  }

  getLayers() {
    return this.layers.map(l => ({ ...l }));
  }

  selectLayer(id) {
    if (this._editing) return;
    this.selectedId = id;
    this._renderHandles();
    this._updateLayerSelection();
    this.onSelect(id ? this._getLayer(id) : null);
  }

  addLayer(layerData) {
    this.layers.push({ ...layerData });
    this._renderAllLayers();
    this.selectLayer(layerData.id);
    this.onChange();
  }

  removeLayer(id) {
    this.layers = this.layers.filter(l => l.id !== id);
    const el = this.layersEl.querySelector(`[data-hc-layer="${id}"]`);
    if (el) el.remove();
    if (this.selectedId === id) {
      this.selectedId = null;
      this._renderHandles();
      this.onSelect(null);
    }
    this.onChange();
  }

  updateLayer(id, props) {
    const layer = this._getLayer(id);
    if (!layer) return;
    Object.assign(layer, props);
    this._renderLayer(layer);
    this._renderHandles();
    this.onChange();
  }

  reorderLayers(orderedIds) {
    const map = {};
    this.layers.forEach(l => map[l.id] = l);
    this.layers = orderedIds.map(id => map[id]).filter(Boolean);
    this._renderAllLayers();
    this._renderHandles();
    this.onChange();
  }

  getState() {
    return {
      heroImage: this.bg.url,
      heroScale: this.bg.scale,
      heroPosX: this.bg.posX,
      heroPosY: this.bg.posY,
      overlayOpacity: this.overlay.opacity,
      topBarHeight: this.overlay.topBarHeight,
      bottomBarHeight: this.overlay.bottomBarHeight,
      heroLayers: this.getLayers(),
    };
  }

  destroy() {
    this._ro?.disconnect();
    document.removeEventListener('pointermove', this._moveHandler);
    document.removeEventListener('pointerup', this._upHandler);
    document.removeEventListener('keydown', this._keyHandler);
    this.container.innerHTML = '';
  }

  // ── Render Interno ───────────────────────────────────────

  _getLayer(id) {
    return this.layers.find(l => l.id === id);
  }

  _getLayerRect(layer) {
    // Retorna posição e tamanho em pixels no canvas (1440x810)
    const type = layer.type || 'text';
    const cx = (layer.x ?? 50) / 100 * 1440;
    const cy = (layer.y ?? 50) / 100 * 810;

    if (type === 'image') {
      const w = (layer.width ?? 20) / 100 * 1440;
      const h = (layer.height ?? 20) / 100 * 810;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }

    // Texto: medir o elemento real
    const el = this.layersEl.querySelector(`[data-hc-layer="${layer.id}"]`);
    if (el) {
      // Usar o tamanho real do elemento (sem rotação)
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    }
    return { x: cx - 50, y: cy - 20, w: 100, h: 40 };
  }

  _renderAllLayers() {
    this.layersEl.innerHTML = '';
    this.layers.forEach(layer => {
      const el = this._createLayerEl(layer);
      this.layersEl.appendChild(el);
    });
  }

  _createLayerEl(layer) {
    const type = layer.type || 'text';
    const el = document.createElement('div');
    el.dataset.hcLayer = layer.id;
    el.style.cssText = 'position:absolute;cursor:move;touch-action:none;';
    this._applyLayerStyle(el, layer);

    if (type === 'text') {
      const textEl = document.createElement('span');
      textEl.className = 'hc-text-content';
      textEl.style.cssText = 'display:block;white-space:pre-wrap;word-break:break-word;pointer-events:none;user-select:none;';
      textEl.textContent = layer.text || '';
      el.appendChild(textEl);
    } else if (type === 'image') {
      const img = document.createElement('img');
      img.src = this.resolveImage(layer.url || '');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;pointer-events:none;user-select:none;display:block;';
      img.draggable = false;
      if (layer.borderRadius) img.style.borderRadius = `${layer.borderRadius}px`;
      el.appendChild(img);
    }

    return el;
  }

  _applyLayerStyle(el, layer) {
    const type = layer.type || 'text';
    const x = layer.x ?? 50;
    const y = layer.y ?? 50;
    const rotation = layer.rotation || 0;
    const opacity = (layer.opacity ?? 100) / 100;

    if (type === 'text') {
      const fs = Math.max(8, layer.fontSize || 48);
      const transforms = [`translate(-50%, -50%)`, `rotate(${rotation}deg)`];

      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.transform = transforms.join(' ');
      el.style.color = layer.color || '#ffffff';
      el.style.fontSize = `${fs}px`;
      el.style.fontFamily = layer.fontFamily || 'inherit';
      el.style.fontWeight = layer.fontWeight || 'bold';
      el.style.textAlign = layer.align || 'center';
      el.style.textShadow = layer.shadow !== false ? '2px 2px 8px rgba(0,0,0,0.8)' : 'none';
      el.style.lineHeight = `${layer.lineHeight || 1.2}`;
      el.style.letterSpacing = `${layer.letterSpacing || 0}px`;
      el.style.opacity = opacity;
      el.style.maxWidth = '90%';

      // Atualizar texto se já existir
      const textEl = el.querySelector('.hc-text-content');
      if (textEl && !textEl.isContentEditable) {
        textEl.textContent = layer.text || '';
      }
    } else if (type === 'image') {
      const w = layer.width ?? 20;
      const h = layer.height ?? 20;
      const flipH = layer.flipH ? 'scaleX(-1)' : '';
      const flipV = layer.flipV ? 'scaleY(-1)' : '';
      const transforms = [`translate(-50%, -50%)`, `rotate(${rotation}deg)`, flipH, flipV].filter(Boolean);

      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.width = `${w}%`;
      el.style.height = `${h}%`;
      el.style.transform = transforms.join(' ');
      el.style.opacity = opacity;
      el.style.overflow = 'hidden';

      const img = el.querySelector('img');
      if (img) {
        if (img.src !== this.resolveImage(layer.url || '')) {
          img.src = this.resolveImage(layer.url || '');
        }
        img.style.borderRadius = `${layer.borderRadius || 0}px`;
      }
    }
  }

  _renderLayer(layer) {
    const el = this.layersEl.querySelector(`[data-hc-layer="${layer.id}"]`);
    if (el) {
      this._applyLayerStyle(el, layer);
    }
  }

  _updateLayerSelection() {
    this.layersEl.querySelectorAll('[data-hc-layer]').forEach(el => {
      if (el.dataset.hcLayer === this.selectedId) {
        el.style.outline = '2px solid #3b82f6';
        el.style.outlineOffset = '2px';
      } else {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }
    });
  }

  _renderHandles() {
    this.handlesEl.innerHTML = '';
    if (!this.selectedId) return;

    const layer = this._getLayer(this.selectedId);
    if (!layer) return;

    const rect = this._getLayerRect(layer);
    const rotation = layer.rotation || 0;

    // Container dos handles
    const hg = document.createElement('div');
    hg.style.cssText = `position:absolute;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;transform:rotate(${rotation}deg);transform-origin:center center;pointer-events:none;`;

    // Borda tracejada
    const border = document.createElement('div');
    border.style.cssText = 'position:absolute;inset:-2px;border:1.5px dashed #3b82f6;pointer-events:none;';
    hg.appendChild(border);

    // 8 handles de resize
    const dirs = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const cursors = { nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize', se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize' };
    const positions = {
      nw: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
      n:  { left: '50%', top: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 },
      ne: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
      e:  { right: -HANDLE_SIZE / 2, top: '50%', marginTop: -HANDLE_SIZE / 2 },
      se: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
      s:  { left: '50%', bottom: -HANDLE_SIZE / 2, marginLeft: -HANDLE_SIZE / 2 },
      sw: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
      w:  { left: -HANDLE_SIZE / 2, top: '50%', marginTop: -HANDLE_SIZE / 2 },
    };

    dirs.forEach(dir => {
      const h = document.createElement('div');
      h.dataset.hcHandle = dir;
      h.style.cssText = `position:absolute;width:${HANDLE_SIZE}px;height:${HANDLE_SIZE}px;background:#fff;border:1.5px solid #3b82f6;border-radius:1px;cursor:${cursors[dir]};pointer-events:auto;box-sizing:border-box;`;

      const pos = positions[dir];
      Object.entries(pos).forEach(([k, v]) => {
        h.style[k] = typeof v === 'number' ? `${v}px` : v;
      });
      hg.appendChild(h);
    });

    // Handle de rotação (circle acima)
    const rotLine = document.createElement('div');
    rotLine.style.cssText = `position:absolute;left:50%;top:${-ROTATION_HANDLE_OFFSET}px;width:1px;height:${ROTATION_HANDLE_OFFSET - HANDLE_SIZE / 2}px;background:#3b82f6;margin-left:-0.5px;pointer-events:none;`;
    hg.appendChild(rotLine);

    const rotHandle = document.createElement('div');
    rotHandle.dataset.hcRotate = '1';
    rotHandle.style.cssText = `position:absolute;left:50%;top:${-ROTATION_HANDLE_OFFSET - 6}px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#3b82f6;border:2px solid #fff;cursor:grab;pointer-events:auto;box-sizing:border-box;`;
    hg.appendChild(rotHandle);

    this.handlesEl.appendChild(hg);
  }
}
