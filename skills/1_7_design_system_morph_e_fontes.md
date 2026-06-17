# Design System Unificado CliqueZoom + Rhyno System — Morph, Tipografia, Centralização e Elementos Arredondados

> Documentação gerada em 2026-06-14 e reorganizada em 2026-06-16. Este é o **design system unificado** adotado nos **dois produtos ao mesmo tempo** — **CliqueZoom** e **Rhyno System** (o ERP, tanto avulso quanto embarcado na aba Gestão). A refatoração de design dos dois está acontecendo em paralelo, então estas regras valem igualmente para ambos: animação morph (botões expansíveis), consistência tipográfica (fonte única), centralização, identidade arredondada e ausência total de fundos brancos.

## Índice
- [0. Regras Globais Obrigatórias (resumo)](#0-regras-globais-obrigatórias-resumo)
- [1. Padrão "Morph/Reveal" (Botões Expansíveis)](#1-padrão-morphreveal-botões-expansíveis)
- [2. Consistência Tipográfica: Fonte Única (Inter)](#2-consistência-tipográfica-fonte-única-inter)
- [3. Controles e Chips de Status (Sem Cores)](#3-controles-e-chips-de-status-sem-cores)
- [4. Alinhamento Centralizado nos Módulos](#4-alinhamento-centralizado-nos-módulos)
- [5. Contraste de Ações Primárias no Tema Escuro](#5-contraste-de-ações-primárias-no-tema-escuro)
- [6. Aplicação no Rhyno System (React + Tailwind)](#6-aplicação-no-rhyno-system-react--tailwind)

---

## 0. Regras Globais Obrigatórias (resumo)

Estas regras valem para **toda a interface dos dois produtos** — o painel admin do **CliqueZoom** e o **Rhyno System** (ERP avulso e embarcado na aba Gestão) — e prevalecem sobre exceções pontuais descritas nas seções seguintes. A refatoração de design dos dois está sendo feita em paralelo: o mesmo conjunto de regras se aplica em ambos, respeitando apenas a tecnologia de cada um (CliqueZoom = CSS com tokens inline; Rhyno = React + Tailwind, ver Seção 6).

1. **Texto sempre centralizado** — todo texto deve estar centralizado dentro de suas respectivas limitações (divs, containers, cards, células de tabela). Use `text-align: center` e, em layouts flex, `justify-content: center; align-items: center`.
2. **Título da página centralizado** — o título/cabeçalho de cada página ou tela (ex.: `Identidade & Classificação`, `Editar: Cliente`) deve ficar **centralizado horizontalmente**, nunca alinhado à esquerda colado em um ícone.
3. **Todo botão com efeito Morph** — **todos** os botões da página devem ter o efeito morph (formato pílula com micro-animação suave no hover). Isso inclui explicitamente: botão **Voltar** (`←`), botões de **salvar**, botões de ícone do header e **switches/toggles** (que também devem ter transição morph/arredondada). Botões de ação primária dentro do conteúdo mantêm a label **sempre visível** no formato pílula + animação de hover (não colapsam em círculo); botões utilitários/secundários podem colapsar em círculo e revelar a label no hover.
4. **NADA pode ter fundo branco** — nenhum elemento pode usar branco fixo (`#fff` / `white`) como fundo: nem ícones, nem container de ícone, nem botão de salvar, nem checkbox, nem cards, nem inputs, nem modais. Sempre usar as cores/tokens padrão do tema (`var(--accent-on)`, `var(--text-primary)`, `var(--bg-elevated)`, `var(--bg-hover)`, etc.), respeitando a inversão automática light/dark.
5. **Checkbox sem branco e sem azul nativo** — checkboxes (fundo, estado marcado e borda) **não podem** ter cor branca nem o azul padrão do HTML. Usar tokens neutros do tema (ex.: fundo transparente/`var(--bg-hover)`, marcação/borda em `var(--text-primary)` ou cinza).
6. **Cor de ícones e botões = cor padrão do tema** — ícones e botões herdam a cor do tema (`currentColor` / tokens), nunca cores fixas chamativas fora da paleta.
7. **Caixas de texto bem arredondadas** — inputs, textareas e selects devem ter **bordas o mais arredondadas possível** (raio generoso, ex.: `border-radius: 12px`+ / `rounded-2xl`), nunca cantos retos/quadrados.
8. **Identidade arredondada** — a identidade visual adotada é de **elementos arredondados**: cards, painéis, inputs, botões, chips e containers devem ter cantos suaves e generosos. Evite qualquer canto reto agressivo.
9. **Sem emojis** — é **proibido** usar emojis na interface. Toda iconografia deve ser feita com ícones SVG.
10. **Ícones modernos, sem fundo branco** — ícones devem ser **modernos** (estilo linha, padrão **Lucide**) e **nunca** ter fundo branco. O ícone herda a cor do texto via `currentColor` e o container, quando houver, usa fundo do tema ou transparente — jamais branco.

---

## 1. Padrão "Morph/Reveal" (Botões Expansíveis)

Para melhorar a estética do painel admin e oferecer micro-animações elegantes baseadas no botão de upload, os botões utilitários do header e do dashboard utilizam um padrão de **círculo que se expande para pílula no hover**.

### 1.1 Regras de CSS Estruturais do Botão
O botão expansível deve ser desenhado para anular conflitos com layouts flexbox e classes utilitárias de largura (como `.nav-item`):

1. **Formato Inicial**: Círculo perfeito configurado via `height` e `min-width` idênticos (ex: `36px` ou `40px`), `padding: 0 !important` e `border-radius: 9999px !important`.
2. **Prevenção de Compressão/Estiramento**: Deve conter as propriedades `width: auto !important` e `flex-shrink: 0 !important` para que cresça sob demanda acompanhando a label e nunca seja esmagado pelo flexbox pai.
3. **Estilo Ativo (`.active`)**: A aba ativa deve ter realce discreto utilizando as cores escuras do tema (`background: var(--bg-hover)`, `border-color: var(--accent)` e `color: var(--text-primary)`). **Nunca mude o fundo para branco** ou azul gritante no estado ativo, mantendo o conforto visual escuro.

### 1.2 Aplicação do Morph (todos os botões) e variação por contexto
Conforme a **Regra Global 3**, **todos** os botões da interface têm o efeito morph. O que muda é apenas se a label colapsa ou permanece visível:

- **Botões utilitários/secundários** (header superior, botão Voltar, menu lateral/sidebar compacta, toolbars com espaço restrito): iniciam como **círculo** e revelam a label no hover (morph completo, conforme 1.3).
- **Botões de ação primária** dentro de seções de conteúdo (ex: "Adicionar Foto", "Novo Álbum", "Criar FAQ"): mantêm o **texto sempre visível** no formato pílula (`border-radius: 9999px`) e preservam a **micro-animação de hover** (realce suave de fundo/borda) — **não** colapsam em círculo, para manter a usabilidade óbvia. Ex.: `<button class="btn" style="border-radius:9999px; ..."><svg>...</svg> Novo</button>`.

### 1.4 Morphing Selects, Dropdowns e Sidebars
Além de botões simples, elementos complexos como caixas de seleção (`<select>`) e botões de ação secundária dentro de sidebars de ferramentas (ex: "Ações" na listagem de OS) também devem receber o efeito Morph para manter a identidade unificada.
Para `<select>`, a lógica de hover deve ser complementada pelo pseudo-estado de foco (`focus-within`), garantindo que o morph não colapse no meio da interação quando o usuário clica para abrir a lista.
**Exemplo em Tailwind para Selects Morph**:
O container raiz deve conter `group` e gerenciar as classes de hover e focus:
`group relative box-border inline-flex items-center h-[42px] min-w-[42px] rounded-full overflow-hidden focus-within:ring-2 ...`
A label expansível deve reagir aos dois estados:
`group-hover:max-w-[12rem] group-hover:opacity-100 group-focus-within:max-w-[12rem] group-focus-within:opacity-100 transition-[max-width,opacity] ...`

### 1.5 Regras da Animação do Morph (Rótulo)
A animação consiste em ocultar a label (texto) por padrão e revelá-la no hover alterando seu `max-width` de forma acelerada e suave:

```css
/* Botão utilitário */
.header-expand-btn {
    box-sizing: border-box;
    display: inline-flex !important;
    align-items: center;
    gap: 0 !important;
    height: 36px !important;
    width: auto !important;
    min-width: 36px !important;
    flex-shrink: 0 !important;
    padding: 0 !important;
    border: 1px solid var(--border);
    border-radius: 9999px !important;
    cursor: pointer;
    overflow: hidden;
    white-space: nowrap;
    background: var(--bg-elevated);
    color: var(--text-secondary);
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

/* Ícone */
.header-expand-btn .header-expand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
}

/* Label (texto oculto por padrão) */
.header-expand-btn .header-expand-label {
    max-width: 0;
    opacity: 0;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
    vertical-align: middle;
    transition: max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Revelação no Hover */
.header-expand-btn:hover .header-expand-label {
    max-width: 12rem; /* Permite expansão fluida até 12rem/14rem */
    opacity: 1;
    padding-right: 1rem; /* Margem sutil no final da pílula */
}
```

### 1.4 Ancoragem de Badges/Notificações
* Quando um botão expansível possui um indicador visual (como o `#notifBadge` do sino de notificações), ele deve ser inserido **dentro do container do ícone** (`.header-expand-icon`) configurado como `position: relative`.
* O badge deve usar `position: absolute; top: -2px; right: -2px;`.
* Isso impede que o badge flutue ou se desloque para o final da pílula quando a label expandir no hover.

---

## 2. Consistência Tipográfica: Fonte Única (Inter)

Para manter a consistência e modernidade visual de todo o painel admin do CliqueZoom, adotamos exclusivamente a fonte **Inter** do Google Fonts como padrão tipográfico universal.

### 2.1 Variável Universal de Fonte
No CliqueZoom, a fonte é definida de forma global no arquivo principal de layout (`admin/index.html`) diretamente nas tags `html` e `body`:

```css
html, body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
```

### 2.2 Padrão de Utilização nos Módulos e Componentes
1. **Font-Family Herdada**: Qualquer componente ou módulo injetado dinamicamente no admin (ex: dashboard, sessões, clientes) deve herdar a fonte padrão. Sempre que um componente necessitar definir estilo inline ou classes de fonte, utilize:
   `font-family: inherit;`
2. **Exclusões Permitidas**:
   * A fonte **Playfair Display** (ou Georgia/Serif) deve ser utilizada exclusivamente em exibições de design do site do cliente (templates do site, cabeçalho do site público do fotógrafo, etc.) ou na estilização de logotipos/marcas d'água personalizadas.
   * Elementos técnicos como logs, hashes, tokens de domínio ou código-fonte de integração devem utilizar a fonte monoespaçada padrão do sistema (`font-family: monospace;`).
3. **Substituição Gradual**: Caso identifique qualquer elemento de interface do admin (como modais ou abas) utilizando fontes serifadas ou fontes alternativas fora da regra tipográfica, a definição de `font-family` deve ser removida ou forçada para `inherit`.

### 2.3 Isolamento Admin vs Site Público
Como o arquivo [shared.css](file:///Users/macbook/Documents/ProjetoEstudio/FsSaaS/assets/css/shared.css) é compartilhado entre o painel administrativo e as páginas públicas (site do cliente, álbuns, portfólio), as diretivas globais para cabeçalhos (`h1, h2, h3`) podem puxar a fonte com serifa (`var(--font-serif)`) injetada pelo Tailwind ou temas de design.

Para garantir que os cabeçalhos do painel administrativo nunca utilizem fontes com serifa (mantendo o padrão Inter universal), a seguinte regra de isolamento é obrigatória:
* No arquivo principal do painel administrativo ([admin/index.html](file:///Users/macbook/Documents/ProjetoEstudio/FsSaaS/admin/index.html)), as variáveis de fonte **devem** ser explicitamente redefinidas no bloco `:root` local do documento:
  ```css
  :root {
      /* Redefine as variáveis herdadas para forçar Inter no escopo administrativo */
      --font-sans: 'Inter', -apple-system, sans-serif;
      --font-serif: 'Inter', -apple-system, sans-serif;
  }
  ```
* Isso assegura que o painel admin permaneça 100% fiel à consistência tipográfica moderna sem interferir na liberdade visual e estilos com serifa legítimos do site público do fotógrafo.

---

## 3. Controles e Chips de Status (Sem Cores)

Para manter a sobriedade do tema escuro do painel administrativo, evitamos o uso de cores chamativas e funcionais (amarelos, verdes, azuis, vermelhos) nos controles interativos secundários, como chips de filtro ou status.

### 3.1 Estilo Selecionado/Ativo
* **Neutralidade**: Os chips e botões de filtro secundários ativados/selecionados devem utilizar uma paleta monocromática.
* **Borda Clara (token, nunca branco fixo)**: Quando selecionados, em vez de alterar a cor de fundo para uma cor brilhante, deve ser aplicada uma borda clara via token (`border-color: var(--text-primary)`), o texto deve passar a ser totalmente brilhante (`color: var(--text-primary)`) e o fundo levemente destacado (`background: var(--bg-hover)`). Use sempre o token (que inverte light/dark), nunca `#fff`/`white`.
* **CSS Padrão para Chips de Filtro Ativos**:
  ```css
  .status-chip.checked {
      background: var(--bg-hover);
      border-color: var(--text-primary);
      color: var(--text-primary);
      font-weight: 600;
  }
  ```

---

## 4. Alinhamento Centralizado nos Módulos

Para criar uma experiência de usuário focada, simétrica e minimalista no painel de administração, as abas principais devem priorizar a centralização horizontal dos elementos de maior importância.

### 4.1 Cabeçalhos de Módulo
* **Empilhamento e Centralização**: O título do módulo (ex: `Sessões`) e o botão de ação principal (ex: `Nova Sessão`) devem ser dispostos verticalmente (layout em coluna) e centralizados no topo da tela.
* **Proporções de Destaque**: O botão de ação principal morph no cabeçalho deve possuir dimensões mais imponentes (ex: `44px` de altura/largura e ícone proporcionalmente maior) para guiar o olhar do usuário.

### 4.2 Cards de Listagem
* **Empilhamento de Informações**: A foto de capa ou ícone do card deve ser circular (`border-radius: 50%`) e posicionada no topo do bloco de forma centralizada.
* **Simetria de Textos e Badges**: O título do card, as tags (badges) e as legendas de dados devem vir logo abaixo da foto e estar inteiramente alinhados no centro (`text-align: center`, `justify-content: center`).
* **Barra de Ações do Card**: Os botões de ação do card (bloqueio, histórico, deleção, etc.) devem ser centralizados na horizontal no rodapé do container, usando o padrão Morph para expansão discreta e neutra de label no hover.

### 4.3 Listagens e Tabelas de Controle Internas
* **Centralização de Metadados**: Em tabelas ou painéis de controle secundários (como exportações de Lightroom e tabelas de entregas por participante), o título do painel, legendas de descrição e dados de cada linha (nomes, status, contadores) devem ser centralizados horizontalmente (`text-align: center`, `flex-direction: column`, `align-items: center`).
* **Disposição de Ações em Bloco Centralizado**: Os botões de ações dessas linhas (como Entregar, WhatsApp, Copiar Link) devem ser mantidos lado a lado horizontalmente dentro de um container flex centralizado (`display: flex; gap: 0.5rem; justify-content: center;`), posicionado logo abaixo das informações textuais para um visual limpo e simétrico.

### 4.4 Painéis de Configuração e Editores Laterais (Sidebar / Builder)
* **Cabeçalhos de Grupo e Títulos**: Os títulos dos grupos de propriedades, cabeçalhos de seção de controle (`.hc-section-head`) e sanfonas de ajuste (`summary`) devem ter o texto e os ícones de setas inteiramente centralizados horizontalmente (`justify-content: center`, `text-align: center`).
* **Rótulos de Parâmetros e Inputs**: Os rótulos ou labels dos sliders e campos de entrada (`.hc-label` como ZOOM, Posição, etc.) devem ser exibidos de forma empilhada e centralizada (`text-align: center; display: block; width: 100%;`).
* **Sliders, Controles e Botões**: Os controles de ajuste deslizante (sliders/ranges) devem ser centralizados em conjunto com seus displays de valores em linhas flex simétricas (`display: flex; justify-content: center;`). Botões de ação e uploads da barra lateral devem seguir o mesmo alinhamento de forma a manter o visual limpo, coerente e com foco no centro.

---

## 5. Contraste de Ações Primárias no Tema Escuro

Para garantir a total legibilidade e evitar textos invisíveis no modo escuro do painel CliqueZoom, adotamos o seguinte padrão de contraste:

### 5.1 Regras de Cores de Ação Principal
* **Cor de Tinta Dinâmica (`var(--accent-on)`)**: Como a variável de destaque do tema dark (`--accent`) é um cinza muito claro/quase branco (`#f2f2f2`), qualquer botão ou componente que utilize `--accent` como cor de fundo **deve obrigatoriamente** usar `var(--accent-on)` (e nunca `#fff` ou `white` fixos) para o texto e os ícones.
* Isso garante que, no tema escuro, o botão apresente um texto escuro legível sobre o fundo claro, enquanto no tema claro a cor do texto seja automaticamente convertida para branca sobre o fundo escuro (`#1a1a1a`), respeitando a inversão cromática nativa do sistema de tokens.

---

## 6. Aplicação no Rhyno System (React + Tailwind)

O **Rhyno System** é um app React que usa **Tailwind** (não os tokens CSS do admin do CliqueZoom). As mesmas regras da Seção 0 valem aqui — esta seção apenas as traduz para classes Tailwind. Há dois contextos:

- **Rhyno avulso (standalone):** aplicar as regras diretamente no design dos componentes/telas, como parte da refatoração de design em curso (lembrando do rollout progressivo de tema escuro por rota — ver memória `project_rhyno_dark_rollout`, não flipar dark global).
- **Rhyno embarcado (embed na aba Gestão do CliqueZoom):** os ajustes de identidade do iframe devem ser feitos **centralmente** em [embed-theme.css](file:///Users/macbook/Documents/ERP1/frontend/src/embed-theme.css) e [embedMode.ts](file:///Users/macbook/Documents/ERP1/frontend/src/utils/embedMode.ts) — **nunca** mexendo nos componentes individuais do ERP só para o embed.

### 6.1 Zero Fundos Brancos
Não é permitido o uso de fundos brancos absolutos (`bg-white`, ou classes que fiquem brancas no dark mode como `dark:bg-slate-100`) em nenhuma parte da página — incluindo cards, inputs, modais e botões de ação (ex.: salvar).
* Em vez disso, utilize fundos neutros e suaves (ex: `bg-slate-50` / `bg-slate-100` no modo claro, e `dark:bg-[#323234]` no modo escuro).

### 6.2 Ícones e Contêineres Transparentes ("A Cor Padrão")
Ícones que acompanham títulos de seções (como o de *Identidade & Classificação*) e botões de ação inativos não devem ter cores sólidas de fundo (como `bg-indigo-50` ou `bg-slate-200`).
* Use **`bg-transparent`** nos contêineres dos ícones para que eles se fundam naturalmente ao fundo do card. A cor do ícone segue a cor padrão do tema.

### 6.3 Todos os Botões de Ação com Efeito Morph (incl. Voltar)
Qualquer botão de ação em cabeçalhos (incluindo o botão de "Voltar" / seta `←` e o de salvar) deve adotar o efeito **Morph**.
* Ele deve iniciar como um ícone circular (`w-[44px] h-[44px]`) e expandir suavemente no `hover`, revelando sua `label` de texto (ex: `hover:w-[110px]`).
* Switches/toggles também devem usar transição arredondada/morph.

### 6.4 Checkboxes Neutros (Sem Azul Nativo e Sem Branco)
Caixas de seleção (checkboxes) não podem usar o azul padrão nativo do HTML e nem ter fundos brancos.
* **Desmarcado:** fundo transparente (`bg-transparent`) com bordas neutras (`border-slate-300 dark:border-slate-600`).
* **Marcado:** o ícone de check e o preenchimento devem ser em tons cinza/slate escuros (ex: `text-slate-600 dark:text-slate-500`), nunca azul forte.

### 6.5 Legibilidade de Textos (Cores Suaves)
Não utilize branco absoluto (`text-white`) nos textos descritivos e labels para não "estourar" os olhos.
* Mantenha os textos sempre legíveis usando paletas suaves de contraste: `text-slate-700` / `text-slate-600` no modo claro, e `dark:text-slate-300` / `dark:text-slate-400` no modo escuro.

### 6.6 Caixas de Texto Ultra-Arredondadas
Todos os campos de digitação (Inputs, Selects e Textareas) devem obrigatoriamente possuir as bordas o mais arredondadas possível para uma estética fluida.
* Substitua `rounded-lg` por **`rounded-2xl`** em todos os campos de formulário.

### 6.7 Títulos Centralizados
Os títulos de seção e de tela (ex.: `Identidade & Classificação`, `Editar: Cliente`) devem ficar centralizados horizontalmente, não alinhados à esquerda colados ao ícone.
