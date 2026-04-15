# Skill: Design System — Stitch Dark

Este arquivo define o design system oficial do painel admin do CliqueZoom.
Nome do design: **Stitch Dark**

Quando o usuário disser "aplique o Stitch Dark", "use o novo design", ou "siga o design system",
leia este arquivo e aplique os padrões aqui definidos.

---

## Origem

Inspirado em um protótipo do Google Stitch. Aplicado pela primeira vez no builder mode
(admin/index.html + admin/js/tabs/meu-site.js) em 2026-04-14.

---

## Paleta de cores

Usar sempre as CSS variables do tema. Nunca hardcodar hex em novos componentes.

| Papel | CSS Variable | Hex |
|-------|-------------|-----|
| Fundo da página | `var(--bg-base)` | `#0d1117` |
| Cards, painéis | `var(--bg-surface)` | `#161b22` |
| Inputs, modais | `var(--bg-elevated)` | `#1c2128` |
| Hover | `var(--bg-hover)` | `#21262d` |
| Bordas | `var(--border)` | `#30363d` |
| Texto principal | `var(--text-primary)` | `#e6edf3` |
| Texto secundário | `var(--text-secondary)` | `#8b949e` |
| Texto desabilitado | `var(--text-muted)` | `#484f58` |
| Azul / ação primária | `var(--accent)` | `#2f81f7` |
| Verde / sucesso | `var(--green)` | `#3fb950` |
| Vermelho / perigo | `var(--red)` | `#f85149` |
| Amarelo / aviso | `var(--yellow)` | `#d29922` |
| Roxo / destaque | `var(--purple)` | `#bc8cff` |
| Laranja | `var(--orange)` | `#ffa657` |

---

## Ícones

Usar **Material Symbols Outlined** — já carregado no `admin/index.html`.

```html
<span class="material-symbols-outlined">nome_do_icone</span>
```

Para ícone preenchido (filled): adicionar `font-variation-settings:'FILL' 1` inline.

Nunca usar emojis como ícones funcionais. Nunca usar SVG inline quando um Material Symbol equivalente existir.

---

## Componentes padrão

### Botão primário (ação principal da página)
```html
<button class="builder-save-btn">Salvar</button>
```
CSS: gradiente azul `linear-gradient(135deg, #3b7de8 0%, #7eb3ff 100%)`, hover scale 1.02, sombra difusa.

### Botão secundário / pill
```html
<button style="padding:0.3rem 0.875rem; background:var(--bg-elevated); color:var(--text-secondary);
  border-radius:999px; border:1px solid var(--border); font-size:0.75rem; font-weight:600; cursor:pointer;">
  Ação
</button>
```

### Card com glass effect (destaque / ativo)
```html
<div class="builder-theme-card active">...</div>
```
CSS: backdrop-filter blur(16px), borda `rgba(47,129,247,0.55)`, sombra difusa.

### Card normal (inativo)
```html
<div class="builder-theme-card">...</div>
```
CSS: borda fantasma `rgba(139,144,159,0.15)`, hover eleva borda para `rgba(47,129,247,0.35)`.

### Item de nav lateral
```html
<button class="builder-nav-item active">
  <span class="material-symbols-outlined">tune</span>
  Label
</button>
```
CSS: ativo em azul `var(--accent)` + fundo `var(--bg-elevated)`, hover em `var(--bg-hover)`.

### Badge de status (pill colorido)
```html
<!-- Verde (ativo/live) -->
<span class="builder-preview-badge">Preview Ativo</span>

<!-- Genérico — inline style para outras cores -->
<span style="display:inline-flex; align-items:center; gap:0.375rem; padding:0.2rem 0.625rem;
  background:rgba(47,129,247,0.15); color:var(--accent); border-radius:999px;
  font-size:0.6875rem; font-weight:700; letter-spacing:0.05em; text-transform:uppercase;">
  Label
</span>
```

### Separador de seção
```html
<div style="height:1px; background:var(--border); margin:0.5rem 0;"></div>
```

### Input
```html
<input type="text" style="width:100%; padding:0.5rem 0.75rem; border:1px solid var(--border);
  border-radius:8px; background:var(--bg-elevated); color:var(--text-primary);
  font-size:0.875rem; outline:none; font-family:inherit;">
```
No focus: `border-color:var(--accent)`.

### Label de campo
```html
<label style="display:block; font-size:0.8125rem; font-weight:500;
  margin-bottom:0.375rem; color:var(--text-secondary);">
  Nome do campo
</label>
```

### Textarea
Mesmos estilos do input, adicionar `resize:vertical; min-height:80px`.

### Cabeçalho de seção dentro de painel
```html
<h3 style="font-size:0.875rem; font-weight:600; color:var(--text-primary); margin-bottom:1rem;">
  Título da Seção
</h3>
```

---

## Raio de borda padrão

| Contexto | Valor |
|----------|-------|
| Cards grandes | `12px` |
| Botões normais | `8px` |
| Pills / badges | `999px` |
| Inputs | `8px` |
| Itens de nav | `10px` |
| Modais | `12px` |

---

## Espaçamento

- Gap entre itens de nav: `2px`
- Padding de card: `1rem`
- Gap entre seções dentro de painel: `1.5rem`
- Padding de painel lateral: `1rem`

---

## Regras de aplicação

1. **Inline styles** em arquivos `.js` de tabs (ESM servido pelo Nginx — sem acesso ao Tailwind compilado)
2. **Classes CSS** (`.builder-*`) para componentes recorrentes — definidas no `<style>` do `admin/index.html`
3. **Nunca usar classes Tailwind** dentro dos tabs do admin — ficam invisíveis no tema escuro
4. **Nunca usar `alert()` / `confirm()`** — usar `window.showToast()` e `window.showConfirm()`
5. Ao criar uma nova skill de página/tab, referenciar este arquivo: "Aplicar design system Stitch Dark"

---

## Como usar em novas páginas

Quando o usuário pedir para criar ou refatorar uma aba/página do admin com o novo design:

1. Ler esta skill (`skills/design-system.md`)
2. Ler a skill específica da página se existir (ex: `skills/sessoes.md`)
3. Aplicar os componentes acima — nav com `.builder-nav-item`, cards com `.builder-theme-card`, botões com `.builder-save-btn`, inputs e labels conforme padrão
4. Após implementar, rodar checklist de deploy e passar comandos para a VPS
