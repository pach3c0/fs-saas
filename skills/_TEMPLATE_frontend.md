# Frontend — Padrões e Referências

> Leia esta skill quando for alterar UI, CSS, componentes ou fluxo do usuário.

---

## STACK

- **Framework:** [React / Vue / Vanilla JS / etc]
- **CSS:** [Tailwind / CSS Modules / CSS Variables puro]
- **Build:** [Vite / Webpack / nenhum]
- **Módulos:** [ES Modules / CommonJS]

---

## ESTRUTURA DE ARQUIVOS

```
frontend/
  index.html        # Shell principal
  js/
    app.js          # Orquestrador, inicialização
    tabs/           # 1 arquivo por aba/página
    utils/          # helpers, api, upload, toast
  css/
    style.css       # Estilos globais
```

---

## DESIGN SYSTEM

### CSS Variables
```css
/* Cole aqui as variáveis do projeto */
--bg-base: ;
--bg-surface: ;
--text-primary: ;
--accent: ;
--border: ;
```

### Regra de uso
- Sempre CSS variables para cores — nunca valores hardcoded
- [Ex: "Nunca classes Tailwind em tema dark — ficam invisíveis"]

### Componentes padrão
| Componente | Como usar |
|---|---|
| Toast/notificação | `window.showToast(msg, type)` |
| Confirm dialog | `await window.showConfirm(msg, opts)` |
| Upload de imagem | `import { uploadImage } from '../utils/upload.js'` |

---

## CSS ESTRUTURAL COMPARTILHADO

[Se houver um arquivo shared.css ou equivalente, descreva aqui o que fica nele vs nos arquivos individuais.]

- **Estrutural (shared):** layout, grid, aspect-ratio, breakpoints base
- **Visual (individual):** cores, bordas, sombras, animações específicas

---

## PADRÕES DE COMPONENTE

### Novo tab/página
```js
// admin/js/tabs/X.js
export function renderX(container) {
  container.innerHTML = `...`;
  // setup events
}
```

### Chamadas de API
```js
import { apiGet, apiPut, apiPost, apiDelete } from '../utils/api.js';

const data = await apiGet('/api/rota');
await apiPut('/api/rota', { campo: valor });
```

---

## RESPONSIVO

| Breakpoint | Comportamento |
|---|---|
| < 640px | [mobile] |
| < 1024px | [tablet] |
| > 1024px | [desktop] |

---

## ERROS COMUNS

| Sintoma | Causa | Evitar |
|---|---|---|
| Estilo invisível no tema dark | Classes Tailwind não compiladas | Usar CSS variables |
| Layout quebrado no mobile | Regra estrutural duplicada e divergente | Centralizar em shared.css |
