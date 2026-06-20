# Skill 17.0 — Refatoração UX do Wizard de Sessões

## Contexto

Em 2026-06-18 o wizard de sessões passou por uma refatoração visual e de interação. As mudanças foram aplicadas primeiro no modo `selection` e devem ser replicadas nos demais modos (`gallery`, `multi_selection`) conforme necessário. Este skill documenta os padrões adotados para garantir consistência.

---

## 1. Botões: de Morph → Pílula Sempre Expandida

### O que mudou

O padrão antigo usava "morph buttons": botões circulares que revelavam o label apenas no hover (via `max-width: 0 → 14rem` + transição). Esse padrão foi abandonado porque o usuário perdia tempo passando o mouse para descobrir o que o botão faz.

**Novo padrão:** botão em pílula sempre expandida, com efeito visual profissional no hover.

### Sistemas de botões no wizard

Existem **3 sistemas** independentes de botões dentro do wizard — cada um com sua própria classe/injeção de CSS:

#### A. `.header-expand-btn` — botões genéricos de ação (header + steps)

Injetado em `wizard/index.js` via `injectHeaderButtonStyles()` (chamada no `openSessionWizard`). Aplica a **todos** os `.header-expand-btn` na página (não apenas no header).

```css
/* CSS injetado — id: cz-header-btn-expanded-styles */
.header-expand-btn {
  padding: 0 1.25rem !important;
  min-width: auto !important;
  gap: 0.75rem !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
  display: inline-flex !important;
  align-items: center !important;
  height: 44px !important;
}
.header-expand-btn .header-expand-label {
  max-width: 12rem !important;
  opacity: 1 !important;
  padding-right: 0 !important;
  overflow: visible !important;
  white-space: nowrap !important;
}
.header-expand-btn:not([disabled]):hover {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface)) !important;
  color: var(--accent) !important;
  border-color: var(--accent) !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent) !important;
}
```

**Estrutura HTML:**
```html
<button class="header-expand-btn" ...>
  <span>${icon('iconName', 18)}</span>
  <span class="header-expand-label">Label do Botão</span>
</button>
```

Helper em uso (ex: `1-upload.js`):
```js
function makeExpandBtn(iconName, label, { bg, color, title } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'header-expand-btn';
  btn.title = title || label;
  btn.setAttribute('aria-label', label);
  if (bg) btn.style.background = bg;
  if (color) btn.style.color = color;
  btn.innerHTML = `<span>${icon(iconName, 18)}</span><span class="header-expand-label">${label}</span>`;
  return btn;
}
```

#### B. `.cz-xbtn` — botões do passo 5 (Editadas: Upload / Export / Entregar)

Injetado em `wizard/steps/5-edited.js` via `ensureXBtnStyles()`.

```css
/* CSS injetado — id: cz-xbtn-styles */
.cz-xbtn {
  box-sizing: border-box;
  display: inline-flex; align-items: center;
  height: 44px; padding: 0 1.25rem; gap: 0.75rem;
  border: 1px solid var(--border); border-radius: var(--r-field);
  cursor: pointer; white-space: nowrap;
  font-family: inherit; font-weight: 500; font-size: 0.875rem;
  background: inherit; color: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.cz-xbtn .cz-xic {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cz-xbtn .cz-xlabel { opacity: 1; overflow: visible; white-space: nowrap; }
.cz-xbtn:not([disabled]):hover {
  background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
  color: var(--accent);
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent);
}
.cz-xbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

Helper `makeXBtn`:
```js
function makeXBtn(iconName, label, { bg, color } = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cz-xbtn';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  if (bg) btn.style.background = bg;
  if (color) btn.style.color = color;
  btn.innerHTML = `<span class="cz-xic">${icon(iconName, 18)}</span><span class="cz-xlabel">${label}</span>`;
  return btn;
}
```

#### C. Botões inline (steps 2, 6, notifications-bell)

Botões que não usam as classes acima mas seguem o mesmo visual. Estilo direto no element:

```js
btn.style.cssText = `
  display: inline-flex; align-items: center; justify-content: center;
  gap: 0.5rem; height: 44px; padding: 0 1.25rem;
  border: 1px solid var(--border); border-radius: var(--r-field);
  background: transparent; color: inherit;
  cursor: pointer; font-size: 0.875rem; font-weight: 500;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
`;
```

### Efeito hover (padrão universal)

Todos os botões do wizard usam os mesmos valores de hover:

| Propriedade    | Valor                                                                  |
|----------------|------------------------------------------------------------------------|
| `background`   | `color-mix(in srgb, var(--accent) 12%, var(--bg-surface))`            |
| `color`        | `var(--accent)`                                                        |
| `border-color` | `var(--accent)`                                                        |
| `transform`    | `translateY(-2px)`                                                     |
| `box-shadow`   | `0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent)`       |

**Exceção:** botões com `bg` e `color` fixos (ex: "Subir fotos" verde, "Entregar" vermelho) mantêm o fundo colorido — apenas o `transform` e `box-shadow` se aplicam.

### O que remover ao refatorar um botão morph legado

Ao encontrar um botão com padrão antigo, remover:
- `max-width: 0; opacity: 0;` no span do label
- `transition` em `max-width`, `width`, `height`, `border-radius` separadamente
- `mouseenter`/`mouseleave` que alteravam `btn.style.width`, `btn.style.height`
- `width: 34px !important; height: 34px !important` hardcoded
- `position: absolute; right: 0; top: 50%; transform: translateY(-50%)` em containers de botão

---

## 2. Grid de Fotos: de Circular → Retangular Fixo

### O que mudou

As células do grid de fotos eram círculos de 120×120px que cresciam ao hover. Isso causava layout shift (as fotos do lado se moviam). O novo padrão usa retângulos fixos.

### Padrão novo

**Célula:**
```js
cell.style.cssText = `
  position: relative; overflow: hidden; cursor: pointer;
  border-radius: var(--r-card);
  width: 200px; height: 150px;   /* ou ajuste por contexto */
  flex-shrink: 0;
  border: 2px solid transparent;
  transition: border-color 0.2s;
`;
```

**Imagem dentro da célula:**
```js
img.style.cssText = `
  width: 100%; height: 100%; object-fit: cover;
  display: block;
`;
```

**Hover:** apenas muda `border-color` e mostra overlay — **nunca altera width, height ou border-radius** da célula.

### O que remover ao refatorar um grid legado

- `border-radius: 50%` na célula
- `transition: width ..., height ..., border-radius ...` (as de resize)
- Listeners de `mouseenter`/`mouseleave` que fazem `cell.style.width = hoverWidth + 'px'`, `cell.style.height = ...`, `cell.style.borderRadius = '50%'`

---

## 3. Modo Seleção — Layout de Página Única

### Motivação

O modo `selection` tinha 4 passos separados no stepper (1→2→4→5). Isso criava fricção de navegação desnecessária. A solução foi empilhar todas as seções em uma única página rolável dentro do wizard.

### Arquivo criado

`admin/js/tabs/sessoes/wizard/selection-single-page.js`

Exporta `renderSelectionSinglePage(session, refresh)` — retorna um `<div>` com 4 `<section>`, uma por etapa, sem stepper.

### Como é ativado

Em `wizard/index.js`, `refreshWizard()` detecta o modo antes de renderizar:

```js
if (session.mode === 'selection') {
  content.appendChild(renderSelectionSinglePage(session, refreshWizardFromServer));
  return;
}
// fallback normal com steps para gallery e multi_selection
```

E ao abrir a sessão, `codeViewedAt` é marcado automaticamente (antes era feito ao entrar no step 2):

```js
if (session.mode === 'selection' && !session.codeViewedAt) {
  apiPut(`/api/sessions/${session._id}/view-code`, {}).catch(() => {});
}
```

### Estrutura da página única

```
Seção 1: "1. Upload de Fotos"          → renderStepUpload({ ..., inSinglePage: true })
Seção 2: "2. Compartilhar"             → renderStepShare({ ..., switchStep: null, inSinglePage: true })
Seção 3: "3. Acompanhar Seleção"       → renderStepTracking({ ..., inSinglePage: true })
Seção 4: "4. Upload de Fotos Editadas" → renderStepEdited({ ..., inSinglePage: true })
                                          (lock card se !session.selectionSubmittedAt)
```

**Header de seção (padrão):**
```js
const sectionTitle = document.createElement('h3');
sectionTitle.style.cssText = `
  font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:var(--text-muted);
  text-transform:uppercase; margin:0 0 0.5rem; padding-bottom:0.75rem;
  border-bottom:1px solid var(--border);
`;
sectionTitle.textContent = '1. Upload de Fotos'; // ou '2. Compartilhar', etc.
```

**Container geral:**
```js
const wrap = document.createElement('div');
wrap.style.cssText = 'display:flex; flex-direction:column; gap:2rem; max-width:900px; margin:0 auto; width:100%;';
```

### Prop `inSinglePage` nos steps

Cada step aceita `inSinglePage = false` como parâmetro. Quando `true`:
- **Step 1 (upload):** remove hint de mínimo (`showMinimumHint = false`) — sem trava de "Concluí upload"
- **Step 2 (share):** `switchStep: null` (sem botão "Próximo passo")
- **Step 4 (tracking):** sem botão de avanço para próximo passo
- **Step 5 (edited):** sem botão "Entregar" que navegava para step 6 (entrega embutida aqui)

### Lock card para Editadas (quando cliente ainda não selecionou)

```js
if (!session.selectionSubmittedAt) {
  // mostra card laranja "Aguardando seleção do cliente" em vez do grid de editadas
  lockedCard.style.cssText = `
    background: color-mix(in srgb, var(--orange) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--orange) 25%, transparent);
    border-radius: var(--r-card); padding: 2rem 1.5rem; text-align: center;
  `;
}
```

---

## 4. Botão de Delete em Fotos Editadas e Cortesia

### Onde aplicar

Passo 5 (`5-edited.js`) — grid que exibe `kind === 'delivered'` e `kind === 'courtesy'`.

### Padrão

Botão de delete aparece no hover do cell, sobreposto ao canto superior direito:

```js
if (kind === 'delivered' || kind === 'courtesy') {
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.title = 'Remover foto editada';
  delBtn.style.cssText = `
    position:absolute; top:6px; right:6px; z-index:10;
    width:28px; height:28px; border-radius:50%;
    background:var(--red); border:none; cursor:pointer;
    display:none; align-items:center; justify-content:center;
    transition:transform 0.15s, box-shadow 0.15s;
  `;
  delBtn.innerHTML = icon('x', 14);
  delBtn.style.color = 'white';
  cell.appendChild(delBtn);

  // Mostrar no hover do cell
  cell.addEventListener('mouseenter', () => { delBtn.style.display = 'flex'; });
  cell.addEventListener('mouseleave', () => { delBtn.style.display = 'none'; });

  // Efeito hover no próprio botão
  delBtn.addEventListener('mouseenter', () => {
    delBtn.style.transform = 'translateY(-2px)';
    delBtn.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--red) 40%, transparent)';
  });
  delBtn.addEventListener('mouseleave', () => {
    delBtn.style.transform = '';
    delBtn.style.boxShadow = '';
  });

  delBtn.onclick = async (e) => {
    e.stopPropagation();
    const confirmed = await window.showConfirm?.('Remover esta foto editada?', {
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await apiDelete(`/api/sessions/${session._id}/photos/${photo.id}`);
      window.showToast?.('Foto removida.', 'success');
      await refresh();
    } catch {
      window.showToast?.('Erro ao remover foto.', 'error');
    }
  };
}
```

---

## 5. ⚠️ Colisão de `id` na injeção de CSS (a armadilha do morph "fantasma")

### O bug (resolvido em 2026-06-18)

Os dois botões do passo 5 (Editadas: "Subir fotos editadas" e "Exportar para Lightroom") **continuavam com o efeito morph** mesmo depois de a classe `.cz-xbtn` ter sido reescrita para a pílula sempre-expandida. O HTML estava correto (`class="cz-xbtn"`, label dentro de `.cz-xlabel`), mas o estilo aplicado ainda era o antigo.

### Causa raiz

Vários steps injetam um `<style>` **uma única vez** usando o padrão guard:

```js
function ensureXBtnStyles() {
  if (document.getElementById('cz-xbtn-styles')) return; // ← early-return se já existe
  const style = document.createElement('style');
  style.id = 'cz-xbtn-styles';
  ...
}
```

O problema: **`1-upload.js` tinha código morto** (`ensureExpandBtnStyles()`) que injetava a versão **morph antiga** de `.cz-xbtn` sob o **mesmo `id="cz-xbtn-styles"`**. Como na página única o passo 1 renderiza **antes** do passo 5:

1. Passo 1 chama `ensureExpandBtnStyles()` → injeta `#cz-xbtn-styles` com o CSS morph (`.cz-xlabel { max-width: 0 }`).
2. Passo 5 chama `ensureXBtnStyles()` → vê que `#cz-xbtn-styles` já existe → **early-return**. A versão pílula nova nunca entra no DOM.
3. Os botões do passo 5 herdam o morph do passo 1.

O `1-upload.js` nem usava mais a classe `.cz-xbtn` (migrou para `makeExpandBtn` → `.cz-upload-pill`), então era puro código morto **que mesmo assim sabotava outro step**.

### A regra

- **Cada `id` de `<style>` injetado deve ter UMA dona única e viva.** Se dois arquivos injetam sob o mesmo `id`, o primeiro a renderizar vence e o segundo é silenciosamente ignorado.
- **Antes de refatorar a classe de um botão, faça grep do `id` do `<style>` em todo o wizard.** Se houver mais de uma definição, elas estão competindo:
  ```bash
  grep -rn "id = 'cz-xbtn-styles'\|getElementById('cz-xbtn-styles')" admin/js/tabs/sessoes/wizard/
  ```
- **Código morto de morph é perigoso, não inofensivo.** Ao migrar um step para um novo helper de botão (`.cz-upload-pill`, `.header-expand-btn`), **remova a função antiga de injeção E sua chamada** — não deixe a função órfã, porque ela continua roubando o `id`.
- **Sintoma de diagnóstico:** se o HTML do botão está certo mas o estilo aplicado está errado, o problema é **qual `<style>` ganhou o `id`**, não o HTML. Inspecione `document.getElementById('<id>').textContent` no console para ver qual versão venceu.

### Inventário de ids de `<style>` no wizard (mantenha único)

| `id` | Dona viva | Padrão |
|------|-----------|--------|
| `cz-xbtn-styles` | **só** `5-edited.js` | pílula sempre expandida |
| `cz-upload-pill-styles` | `1-upload.js` (`makeExpandBtn`) | pílula `.cz-upload-pill` |
| `cz-header-btn-expanded-styles` | `index.js` (`injectHeaderButtonStyles`) | `.header-expand-btn` global |

> Ao criar `<modo>-single-page.js`, **não** reaproveite um `id` já em uso por outro step com CSS diferente. Ou compartilhe o mesmo CSS (uma dona só), ou use um `id` novo.

---

## 6. Checklist para aplicar a outro modo (ex: gallery, multi_selection)

Se um modo ainda usa o layout legado por steps, siga esta ordem:

1. **Criar `<modo>-single-page.js`** em `wizard/` (ou adicionar lógica direta em `index.js`)
2. **Adicionar detecção em `refreshWizard()`** para chamar o layout de página única
3. **Auditar botões em cada step** — buscar por `max-width: 0`, `opacity: 0`, `width: 34px`, listeners de resize → substituir pelo padrão `.header-expand-btn` / `.cz-xbtn`
4. **Auditar grids de foto** — buscar `border-radius: 50%`, listeners que alteram `cell.style.width/height` → remover resize, fixar em 200×150px com `object-fit: cover`
5. **Verificar `inSinglePage` nos steps** — adicionar o parâmetro e condicionar botões de navegação
6. **Verificar colisão de `id` de `<style>`** (seção 5) — grep do `id` injetado; remover código morto de injeção que sobrou de morph antigo
7. **Remover atribuições inline redundantes** — `btn.style.border = '...'` em botão que já tem `border` pela classe `.cz-xbtn` (a inline ganha da classe e pode reintroduzir inconsistência)

---

## 7. Anti-padrões a evitar

| Evitar | Usar em vez |
|--------|-------------|
| `max-width: 0; opacity: 0` no label do botão | `opacity: 1; overflow: visible` |
| `mouseenter` alterando `cell.style.width/height` | Hover apenas no overlay, nunca no tamanho da célula |
| `width: 34px; height: 34px` circulares | `height: 44px; padding: 0 1.25rem` pílula |
| `border-radius: 50%` nas fotos | `border-radius: var(--r-card)` |
| `transition: width ..., height ..., border-radius ...` | `transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1)` |
| Ícones emoji (🔔, ⚙️, 🗑️) nos botões | `icon('bell', 18)` via `icons.js` |
| `alert()` / `confirm()` nativo | `window.showToast()` / `window.showConfirm()` |
| Duas funções injetando `<style>` sob o **mesmo `id`** com CSS diferente | Um `id` = uma dona viva (ver seção 5) |
| Função de injeção de CSS morph **órfã** (step migrou de classe mas a função ficou) | Remover a função **e** sua chamada |
| `btn.style.border = '...'` inline num botão que já tem `border` pela classe | Deixar a classe (`.cz-xbtn`) controlar o border |

---

## 8. Pendências conhecidas (morph ainda vivo fora do passo 5)

- **`2-share.js` (modo `gallery`):** o botão "Entregar e notificar cliente" / "Re-entregar" do passo Compartilhar **ainda usa morph** (`labelDiv` com `max-width: 0` → expande no hover, ~linha 560). Só aparece no modo `gallery` (`if (isGallery)`), por isso não afetou a refatoração focada em `selection`. Aplicar o padrão pílula quando o modo `gallery` for refatorado.

---

## Arquivos modificados nesta refatoração

| Arquivo | O que mudou |
|---------|-------------|
| `wizard/index.js` | `injectHeaderButtonStyles()` global; detecção modo selection em `refreshWizard()`; marca `codeViewedAt` ao abrir |
| `wizard/selection-single-page.js` | **Arquivo novo** — layout de página única para `selection` |
| `wizard/steps/1-upload.js` | Grid 200×150px; sem resize no hover; `inSinglePage` sem trava mínimo. **Removido `ensureExpandBtnStyles()` morto** (injetava morph antigo sob `#cz-xbtn-styles`, sabotando o passo 5 — ver seção 5) |
| `wizard/steps/2-share.js` | Botões inline refatorados; `inSinglePage` remove avanço de step |
| `wizard/steps/4-tracking.js` | Grid 200×150px; sem resize; botões de header refatorados |
| `wizard/steps/5-edited.js` | `.cz-xbtn` sempre expandido; grid 200×150px; delete em editadas/cortesia. **Dona única do `#cz-xbtn-styles`**; removidas atribuições `btn.style.border` inline redundantes |
| `wizard/steps/6-deliver.js` | Botões da tabela multi refatorados (sem width fixo circular) |
| `wizard/notifications-bell.js` | Botão sininho refatorado para pílula |
