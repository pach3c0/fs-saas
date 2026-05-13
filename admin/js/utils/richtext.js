/**
 * richtext.js — Mini Rich Text Editor reutilizável para o Admin
 *
 * Exporta:
 *   createRichEditor(wrapperEl, initialHtml, onChange, opts)
 *     → Substitui um wrapper vazio por um editor contenteditable com toolbar completa.
 *       Usado para textareas (campos longos).
 *
 *   addInlineToolbar(inputEl, onChange, opts)
 *     → Adiciona uma barra flutuante de formatação acima de um <input type="text">.
 *       O valor salvo é HTML simples (ex: <strong>texto</strong>).
 *       Ao carregar, renderiza o HTML como innerText colorido.
 *
 * Dados salvos: HTML simples — <strong>, <em>, <u>, <br>, <ul><li>, <a href>
 * O site público deve usar innerHTML ao renderizar esses campos.
 */

// ─── Estilos compartilhados injetados uma vez ──────────────────────────────
let _stylesInjected = false;

function _injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    /* ── Rich Editor Wrapper ── */
    .cz-rich-wrap {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--ad-input-bg);
      transition: border-color 120ms, box-shadow 120ms;
      overflow: hidden;
    }
    .cz-rich-wrap:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--ad-accent-soft);
    }

    /* ── Toolbar ── */
    .cz-rte-toolbar {
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 4px 6px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .cz-rte-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: var(--text-secondary);
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 100ms, color 100ms;
      line-height: 1;
      padding: 0;
      flex-shrink: 0;
    }
    .cz-rte-btn:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .cz-rte-btn.active {
      background: var(--ad-accent-soft);
      color: var(--accent);
    }
    .cz-rte-btn svg {
      width: 13px;
      height: 13px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .cz-rte-divider {
      width: 1px;
      height: 16px;
      background: var(--border);
      margin: 0 3px;
      flex-shrink: 0;
    }

    /* ── Contenteditable Area ── */
    .cz-rte-body {
      padding: 7px 10px;
      min-height: 80px;
      outline: none;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--text-primary);
      line-height: 1.6;
      background: transparent;
      resize: none;
      white-space: pre-wrap;
      overflow-y: auto;
    }
    .cz-rte-body:empty::before {
      content: attr(data-placeholder);
      color: var(--text-muted);
      pointer-events: none;
    }
    .cz-rte-body ul {
      margin: 0.25rem 0 0.25rem 1.25rem;
      padding: 0;
    }
    .cz-rte-body a {
      color: var(--accent);
      text-decoration: underline;
    }

    /* ── Inline Toolbar (para inputs) ── */
    .cz-inline-wrap {
      position: relative;
    }
    .cz-inline-toolbar {
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 3px 5px;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 999;
      white-space: nowrap;
    }

    /* ── Emoji Picker ── */
    .cz-emoji-picker {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      padding: 6px;
      display: grid;
      grid-template-columns: repeat(8, 28px);
      gap: 2px;
      z-index: 1000;
    }
    .cz-emoji-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      transition: background 80ms;
    }
    .cz-emoji-btn:hover {
      background: var(--bg-hover);
    }

    /* ── Link Modal ── */
    .cz-link-modal {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      padding: 8px;
      z-index: 1001;
      display: flex;
      gap: 6px;
      align-items: center;
      min-width: 240px;
    }
    .cz-link-input {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--ad-input-bg);
      color: var(--text-primary);
      font-size: 12px;
      font-family: inherit;
      outline: none;
    }
    .cz-link-input:focus {
      border-color: var(--accent);
    }
    .cz-link-ok {
      padding: 4px 10px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
  `;
  document.head.appendChild(style);
}

// ─── Emojis frequentes para fotógrafo ──────────────────────────────────────
const EMOJIS = [
  '📷','📸','🎨','✨','💫','🌟','⭐','🏆',
  '❤️','🤍','🖤','💎','🌹','🌸','🌿','🍃',
  '👁️','🎭','🎪','🎯','💡','🔮','🪄','🌙',
  '☀️','🌅','🌄','🎑','🏞️','🗺️','📍','✈️',
];

// ─── SVG Icons ─────────────────────────────────────────────────────────────
const ICONS = {
  bold: `<svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
  list: `<svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
  link: `<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  emoji: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  br: `<svg viewBox="0 0 24 24"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>`,
  clear: `<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function _saveSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0).cloneRange();
}

function _restoreSelection(range) {
  if (!range) return;
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function _execCmd(cmd, value = null) {
  document.execCommand(cmd, false, value);
}

function _makeBtn(icon, title, cls = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cz-rte-btn' + (cls ? ' ' + cls : '');
  btn.title = title;
  btn.innerHTML = icon;
  return btn;
}

function _makeDivider() {
  const d = document.createElement('span');
  d.className = 'cz-rte-divider';
  return d;
}

// ─── createRichEditor ──────────────────────────────────────────────────────
/**
 * Transforma um elemento wrapper em um rich text editor completo.
 *
 * @param {HTMLElement} wrapperEl   — elemento que receberá o editor (será esvaziado)
 * @param {string}      initialHtml — conteúdo inicial (pode ser HTML ou texto puro)
 * @param {Function}    onChange    — callback(html: string) chamado a cada mudança
 * @param {Object}      opts        — { placeholder, minHeight, features }
 *   opts.features: array com subset de ['bold','italic','underline','br','list','link','emoji','clear']
 *   Default (sem opts.features): todos os recursos
 */
export function createRichEditor(wrapperEl, initialHtml = '', onChange = null, opts = {}) {
  _injectStyles();

  const {
    placeholder = 'Digite aqui...',
    minHeight = 90,
    features = ['bold', 'italic', 'underline', 'br', 'list', 'link', 'emoji', 'clear'],
  } = opts;

  wrapperEl.className = 'cz-rich-wrap';
  wrapperEl.innerHTML = '';

  // ── Toolbar ──
  const toolbar = document.createElement('div');
  toolbar.className = 'cz-rte-toolbar';

  // ── Editor body ──
  const body = document.createElement('div');
  body.className = 'cz-rte-body';
  body.contentEditable = 'true';
  body.setAttribute('data-placeholder', placeholder);
  body.style.minHeight = minHeight + 'px';

  // Renderiza o conteúdo inicial — aceita HTML ou texto puro
  if (initialHtml) {
    // Se parece com HTML, usa innerHTML; senão escapa e usa textContent
    body.innerHTML = initialHtml;
  }

  // ── Picker overlay references ──
  let emojiPicker = null;
  let linkModal = null;
  let savedRange = null;

  function closePickers() {
    emojiPicker?.remove(); emojiPicker = null;
    linkModal?.remove();   linkModal = null;
  }

  function _notify() {
    onChange?.(body.innerHTML);
  }

  // ── Botões ──
  function addBtn(icon, title, action, featureKey) {
    if (!features.includes(featureKey)) return;
    const btn = _makeBtn(icon, title);
    btn.onmousedown = (e) => {
      e.preventDefault();
      action(btn);
    };
    toolbar.appendChild(btn);
  }

  // Bold
  addBtn(ICONS.bold, 'Negrito (Ctrl+B)', () => { _execCmd('bold'); body.focus(); _notify(); }, 'bold');

  // Italic
  addBtn(ICONS.italic, 'Itálico (Ctrl+I)', () => { _execCmd('italic'); body.focus(); _notify(); }, 'italic');

  // Underline
  addBtn(ICONS.underline, 'Sublinhado (Ctrl+U)', () => { _execCmd('underline'); body.focus(); _notify(); }, 'underline');

  if (features.some(f => ['bold','italic','underline'].includes(f)) &&
      features.some(f => ['br','list','link','emoji','clear'].includes(f))) {
    toolbar.appendChild(_makeDivider());
  }

  // Quebra de linha forçada
  addBtn(ICONS.br, 'Quebra de linha', () => {
    body.focus();
    _execCmd('insertHTML', '<br><br>');
    _notify();
  }, 'br');

  // Lista
  addBtn(ICONS.list, 'Lista', () => {
    body.focus();
    _execCmd('insertUnorderedList');
    _notify();
  }, 'list');

  // Link
  if (features.includes('link')) {
    const linkBtn = _makeBtn(ICONS.link, 'Inserir link');
    linkBtn.onmousedown = (e) => {
      e.preventDefault();
      closePickers();
      savedRange = _saveSelection();
      // Cria modal de link
      linkModal = document.createElement('div');
      linkModal.className = 'cz-link-modal';
      const inp = document.createElement('input');
      inp.className = 'cz-link-input';
      inp.type = 'url';
      inp.placeholder = 'https://...';
      const ok = document.createElement('button');
      ok.className = 'cz-link-ok';
      ok.textContent = 'OK';
      ok.type = 'button';
      ok.onclick = () => {
        const url = inp.value.trim();
        if (url) {
          _restoreSelection(savedRange);
          _execCmd('createLink', url);
        }
        linkModal.remove(); linkModal = null;
        body.focus();
        _notify();
      };
      inp.onkeydown = (e) => { if (e.key === 'Enter') ok.click(); if (e.key === 'Escape') { linkModal.remove(); linkModal = null; } };
      linkModal.appendChild(inp);
      linkModal.appendChild(ok);
      wrapperEl.style.position = 'relative';
      wrapperEl.appendChild(linkModal);
      setTimeout(() => inp.focus(), 50);
    };
    toolbar.appendChild(linkBtn);
  }

  // Emoji
  if (features.includes('emoji')) {
    const emojiBtn = _makeBtn(ICONS.emoji, 'Inserir emoji');
    emojiBtn.onmousedown = (e) => {
      e.preventDefault();
      if (emojiPicker) { closePickers(); return; }
      closePickers();
      savedRange = _saveSelection();
      emojiPicker = document.createElement('div');
      emojiPicker.className = 'cz-emoji-picker';
      EMOJIS.forEach(em => {
        const eb = document.createElement('button');
        eb.type = 'button';
        eb.className = 'cz-emoji-btn';
        eb.textContent = em;
        eb.onclick = () => {
          _restoreSelection(savedRange);
          _execCmd('insertText', em);
          closePickers();
          body.focus();
          _notify();
        };
        emojiPicker.appendChild(eb);
      });
      wrapperEl.style.position = 'relative';
      wrapperEl.appendChild(emojiPicker);
    };
    toolbar.appendChild(emojiBtn);
  }

  if (features.includes('clear')) {
    toolbar.appendChild(_makeDivider());
    const clearBtn = _makeBtn(ICONS.clear, 'Remover formatação');
    clearBtn.onmousedown = (e) => {
      e.preventDefault();
      body.focus();
      _execCmd('removeFormat');
      _notify();
    };
    toolbar.appendChild(clearBtn);
  }

  // ── Atualiza estado ativo dos botões ao selecionar ──
  document.addEventListener('selectionchange', () => {
    if (!wrapperEl.contains(document.activeElement)) return;
    toolbar.querySelectorAll('.cz-rte-btn[data-cmd]').forEach(btn => {
      btn.classList.toggle('active', document.queryCommandState(btn.dataset.cmd));
    });
  });
  ['bold','italic','underline'].forEach(cmd => {
    const btn = toolbar.querySelector(`[title="${cmd === 'bold' ? 'Negrito (Ctrl+B)' : cmd === 'italic' ? 'Itálico (Ctrl+I)' : 'Sublinhado (Ctrl+U)'}"]`);
    if (btn) btn.dataset.cmd = cmd;
  });

  // ── Fechar pickers ao clicar fora ──
  document.addEventListener('mousedown', (e) => {
    if (!wrapperEl.contains(e.target)) closePickers();
  });

  // ── onChange ao digitar ──
  body.addEventListener('input', _notify);
  body.addEventListener('paste', (e) => {
    // Cola apenas texto puro
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    _execCmd('insertText', text);
    _notify();
  });

  // ── Monta ──
  wrapperEl.appendChild(toolbar);
  wrapperEl.appendChild(body);

  return {
    getValue: () => body.innerHTML,
    setValue: (html) => { body.innerHTML = html || ''; },
    focus: () => body.focus(),
  };
}

// ─── addInlineToolbar ──────────────────────────────────────────────────────
/**
 * Adiciona uma barra de formatação inline abaixo de um <input type="text">.
 *
 * Como <input> não aceita HTML, usamos uma abordagem diferente:
 *  - O input armazena HTML como texto bruto (ex: <strong>Foto</strong>)
 *  - A toolbar manipula o valor string diretamente com seleção do input
 *  - O usuário vê os marcadores HTML no campo (transparente para ele)
 *
 * Alternativamente (modo contenteditable inline):
 *  - Substitui o input por um span contenteditable estilizado como input
 *  - Mais amigável visualmente
 *
 * Esta implementação usa a segunda abordagem (contenteditable como input).
 *
 * @param {HTMLElement} inputEl   — o <input type="text"> a ser aprimorado
 * @param {Function}    onChange  — callback(html: string) chamado a cada mudança
 * @param {Object}      opts      — { features, placeholder }
 *   opts.features: array — default ['bold', 'italic', 'emoji']
 */
export function addInlineToolbar(inputEl, onChange = null, opts = {}) {
  _injectStyles();

  const {
    placeholder = inputEl.placeholder || '',
    features = ['bold', 'italic', 'emoji'],
  } = opts;

  const initialValue = inputEl.value || '';
  const inputId = inputEl.id;

  // Cria o wrapper
  const wrap = document.createElement('div');
  wrap.className = 'cz-inline-wrap';

  // Cria toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'cz-inline-toolbar';
  toolbar.style.display = 'none';

  // Cria o contenteditable que substitui o input
  const editor = document.createElement('div');
  editor.className = 'cz-rte-body';
  editor.contentEditable = 'true';
  editor.setAttribute('data-placeholder', placeholder);
  editor.style.minHeight = '30px';
  editor.style.padding = '6px 10px';
  editor.style.border = '1px solid var(--border)';
  editor.style.borderRadius = 'var(--radius-sm)';
  editor.style.background = 'var(--ad-input-bg)';
  editor.style.transition = 'border-color 120ms, box-shadow 120ms';
  editor.style.cursor = 'text';
  if (inputId) editor.id = inputId + '_rte';

  // Carrega valor inicial
  if (initialValue) {
    editor.innerHTML = initialValue;
  }

  // Picker refs
  let emojiPicker = null;
  let savedRange = null;

  function closePickers() {
    emojiPicker?.remove(); emojiPicker = null;
  }

  function _notify() {
    onChange?.(editor.innerHTML);
  }

  // ── Focus / blur ──
  editor.addEventListener('focus', () => {
    toolbar.style.display = 'flex';
    editor.style.borderColor = 'var(--accent)';
    editor.style.boxShadow = '0 0 0 3px var(--ad-accent-soft)';
  });
  editor.addEventListener('blur', (e) => {
    // Não oculta se clicou na toolbar
    setTimeout(() => {
      if (!wrap.contains(document.activeElement)) {
        toolbar.style.display = 'none';
        editor.style.borderColor = 'var(--border)';
        editor.style.boxShadow = 'none';
        closePickers();
      }
    }, 150);
  });

  // ── Botões ──
  function addBtn(icon, title, action) {
    const btn = _makeBtn(icon, title);
    btn.onmousedown = (e) => { e.preventDefault(); action(btn); };
    toolbar.appendChild(btn);
  }

  if (features.includes('bold')) {
    addBtn(ICONS.bold, 'Negrito', () => { _execCmd('bold'); editor.focus(); _notify(); });
  }
  if (features.includes('italic')) {
    addBtn(ICONS.italic, 'Itálico', () => { _execCmd('italic'); editor.focus(); _notify(); });
  }
  if (features.includes('bold') || features.includes('italic')) {
    if (features.includes('emoji')) toolbar.appendChild(_makeDivider());
  }
  if (features.includes('emoji')) {
    const emojiBtn = _makeBtn(ICONS.emoji, 'Emoji');
    emojiBtn.onmousedown = (e) => {
      e.preventDefault();
      if (emojiPicker) { closePickers(); return; }
      closePickers();
      savedRange = _saveSelection();
      emojiPicker = document.createElement('div');
      emojiPicker.className = 'cz-emoji-picker';
      emojiPicker.style.top = 'calc(100% + 4px)';
      EMOJIS.forEach(em => {
        const eb = document.createElement('button');
        eb.type = 'button';
        eb.className = 'cz-emoji-btn';
        eb.textContent = em;
        eb.onclick = () => {
          _restoreSelection(savedRange);
          _execCmd('insertText', em);
          closePickers();
          editor.focus();
          _notify();
        };
        emojiPicker.appendChild(eb);
      });
      wrap.appendChild(emojiPicker);
    };
    toolbar.appendChild(emojiBtn);
  }

  document.addEventListener('mousedown', (e) => {
    if (!wrap.contains(e.target)) closePickers();
  });

  editor.addEventListener('input', _notify);
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') || '';
    _execCmd('insertText', text);
    _notify();
  });

  // ── Substitui o input original ──
  inputEl.parentNode.insertBefore(wrap, inputEl);
  wrap.appendChild(toolbar);
  wrap.appendChild(editor);
  inputEl.style.display = 'none'; // Mantém no DOM para compatibilidade

  return {
    getValue: () => editor.innerHTML,
    setValue: (html) => { editor.innerHTML = html || ''; },
    focus: () => editor.focus(),
  };
}
