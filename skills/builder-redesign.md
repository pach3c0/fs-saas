# Skill: Redesign Visual do Builder (inspiração Google Stitch)

Leia este arquivo ao trabalhar no visual do painel builder — `admin/js/tabs/meu-site.js` e `admin/index.html` (seção `#builder-props`).

---

## Contexto

O fotógrafo viu um protótipo do Google Stitch com um design muito mais refinado para o painel de edição do site. A ideia é evoluir o visual do builder progressivamente sem quebrar a funcionalidade existente.

---

## Estado atual vs. Inspiração Stitch

### Nav de seções (esquerda do builder-props)
**Atual** — `admin/js/tabs/meu-site.js` ~linha 83:
- Botões de 110px de largura com emojis (🎨 🖼️ 📷)
- `background:none; border:none; color:#9ca3af`
- Estado ativo: `background:#1e3a5f; color:#93c5fd`
- Sem ícones vetoriais, sem bordas arredondadas elegantes

**Stitch** — o que queremos:
- Itens com `Material Symbols Outlined` (ícone 20px) + label
- Estado ativo: `background: surface-container-highest` + `color: primary` (azul)
- Estado hover: `background: surface-container-high`
- `border-radius: 0.75rem` (rounded-xl)
- Padding generoso: `px-4 py-2.5`

### Cards de tema (sub-aba Geral)
**Atual** — `admin/js/tabs/meu-site.js` ~linha 195 (`renderTemplateCards`):
- Cards com `background:#1f2937`, gradiente genérico de 100px como preview
- Badge "✓ Ativo" em verde absoluto, badge "Selecionado" em azul
- Botão "👁️ Visualizar" como link simples
- Sem efeito glass, sem sombra difusa

**Stitch** — o que queremos:
- Card ativo: `glass-panel` (backdrop-filter blur + borda com opacidade) + borda `primary/50` + sombra difusa
- Card inativo: `ghost-border` (borda sutil `rgba(139,144,159,0.15)`) + hover eleva borda para `primary/30`
- Paleta de cores: 3 bolinhas coloridas (w-4 h-4 rounded-full) representando as cores do tema
- Ícone `check_circle` (Material Symbol FILL) no canto superior direito do ativo
- Botão "Visualizar" como pill (`rounded-full`) com fundo `surface-container-highest`
- Botão "Salvar Tema": gradiente `linear-gradient(135deg, #498fff 0%, #acc7ff 100%)` + `hover:scale-[1.02]`

### Preview canvas (área direita do builder)
**Atual** — `admin/index.html` (seção `#builder-preview`):
- Iframe direto sem chrome visual
- Botões de dispositivo existem mas visual simples

**Stitch** — o que queremos:
- Label "Preview Ativo" como pill verde (`tertiary-container/20 + tertiary`)
- Janela de browser simulada: header com 3 bolinhas (cinza) + barra de URL fake
- `border-radius: 1rem` no container do browser com `deep-diffusion` (box-shadow dupla)

---

## Variáveis de cor a mapear (Stitch → CSS vars do admin)

| Stitch | Equivalente admin | Hex |
|--------|-------------------|-----|
| `bg-background` | `var(--bg-base)` | `#0d1117` |
| `bg-surface` | `var(--bg-surface)` | `#161b22` |
| `bg-surface-container-low` | `var(--bg-surface)` | `#161b22` |
| `bg-surface-container` | `var(--bg-elevated)` | `#1c2128` |
| `bg-surface-container-high` | `var(--bg-hover)` | `#21262d` |
| `bg-surface-container-highest` | `var(--border)` opacidade | `#30363d` |
| `text-on-surface` | `var(--text-primary)` | `#e6edf3` |
| `text-on-surface-variant` | `var(--text-secondary)` | `#8b949e` |
| `text-outline` | `var(--text-muted)` | `#484f58` |
| `text-primary / border-primary` | `var(--accent)` | `#2f81f7` |
| `text-tertiary` | `var(--green)` | `#3fb950` |
| `border-outline-variant` | `var(--border)` | `#30363d` |

---

## Ícones Material Symbols — mapa de sub-abas

O Stitch usa `Material Symbols Outlined`. Já temos a font carregada no `admin/index.html`?
Verificar: se não tiver, adicionar no `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```

Mapeamento de ícone por sub-aba:
| Sub-aba | Ícone Material Symbol |
|---------|----------------------|
| Geral | `tune` |
| Seções | `layers` |
| Hero | `view_carousel` |
| Sobre | `person` |
| Portfólio | `collections` |
| Serviços | `handyman` |
| Depoimentos | `chat` |
| Álbuns | `photo_library` |
| Estúdio | `apartment` |
| Contato | `mail` |
| FAQ | `help` |
| Personalizar | `palette` |

---

## Classes CSS auxiliares a adicionar (no `<style>` do admin/index.html)

```css
/* Glass panel — usado nos cards de tema ativos */
.builder-glass {
  background: rgba(49, 53, 60, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(172, 199, 255, 0.1);
}

/* Borda fantasma — cards inativos */
.builder-ghost-border {
  border: 1px solid rgba(139, 144, 159, 0.15);
}

/* Sombra difusa — browser preview */
.builder-deep-shadow {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(172, 199, 255, 0.05);
}

/* Gradiente do botão Salvar Tema */
.builder-save-gradient {
  background: linear-gradient(135deg, #498fff 0%, #acc7ff 100%);
}
```

---

## Ordem de implementação recomendada

1. **Nav de seções** — menor impacto, maior ganho visual imediato. Só muda o HTML dos botões em `meu-site.js` ~linha 83-95. Adicionar Material Symbols no `admin/index.html` se não tiver.

2. **Cards de tema** — refatorar `renderTemplateCards()` em `meu-site.js` ~linha 195. Aplicar glass, ghost-border, paleta de bolinhas, check_circle. Lógica de seleção/salvamento NÃO muda.

3. **Browser chrome no preview** — adicionar wrapper visual no `#builder-preview` em `admin/index.html`. O iframe em si não muda — só o container visual ao redor.

---

## Regras de implementação

- **Não quebrar funcionalidade**: lógica de `selectedTheme`, `renderTemplateCards()`, `liveRefresh()`, `builderScheduleRefresh()` — tudo permanece igual
- **Inline styles** continuam sendo usados em `meu-site.js` (é ESM servido pelo Nginx, sem acesso direto ao Tailwind compilado)
- As classes auxiliares (glass, ghost-border, etc.) vão no `<style>` do `admin/index.html`, não em arquivos externos
- Material Symbols: usar `<span class="material-symbols-outlined">nome_icone</span>` — não SVGs inline
