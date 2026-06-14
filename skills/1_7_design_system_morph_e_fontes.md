# Regras de UI/UX: Animação Morph (Bolinhas) e Consistência de Fontes

> Documentação gerada em 2026-06-14 para formalizar os padrões de design de abas, utilitários expansíveis (morph) e consistência tipográfica (fonte única) no painel admin do CliqueZoom.

---

## 1. Padrão "Morph/Reveal" (Bolinhas Expansíveis)

Para melhorar a estética do painel admin e oferecer micro-animações elegantes baseadas no botão de upload, os botões utilitários do header e do dashboard utilizam um padrão de **círculo que se expande para pílula no hover**.

### 1.1 Regras de CSS Estruturais do Botão
O botão expansível deve ser desenhado para anular conflitos com layouts flexbox e classes utilitárias de largura (como `.nav-item`):

1. **Formato Inicial**: Círculo perfeito configurado via `height` e `min-width` idênticos (ex: `36px` ou `40px`), `padding: 0 !important` e `border-radius: 9999px !important`.
2. **Prevenção de Compressão/Estiramento**: Deve conter as propriedades `width: auto !important` e `flex-shrink: 0 !important` para que cresça sob demanda acompanhando a label e nunca seja esmagado pelo flexbox pai.
3. **Estilo Ativo (`.active`)**: A aba ativa deve ter realce discreto utilizando as cores escuras do tema (`background: var(--bg-hover)`, `border-color: var(--accent)` e `color: var(--text-primary)`). **Nunca mude o fundo para branco** ou azul gritante no estado ativo, mantendo o conforto visual escuro.

### 1.2 Regras da Animação do Morph (Rótulo)
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

### 1.3 Ancoragem de Badges/Notificações
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

## 3. Padrão de Controles e Chips de Status (Sem Cores)

Para manter a sobriedade do tema escuro do painel administrativo, evitamos o uso de cores chamativas e funcionais (amarelos, verdes, azuis, vermelhos) nos controles interativos secundários, como chips de filtro ou status.

### 3.1 Estilo Selecionado/Ativo
* **Neutralidade**: Os chips e botões de filtro secundários ativados/selecionados devem utilizar uma paleta monocromática.
* **Efeito Borda Branca**: Quando selecionados, em vez de alterar a cor de fundo para uma cor brilhante, deve ser aplicada uma borda clara/branca (`border-color: var(--text-primary)`), o texto deve passar a ser totalmente brilhante (`color: var(--text-primary)`) e o fundo levemente destacado (`background: var(--bg-hover)`).
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

## 4. Padrão de Alinhamento Centralizado nos Módulos

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

---

## 5. Contraste de Ações Primárias no Tema Escuro

Para garantir a total legibilidade e evitar textos invisíveis no modo escuro do painel CliqueZoom, adotamos o seguinte padrão de contraste:

### 5.1 Regras de Cores de Ação Principal
* **Cor de Tinta Dinâmica (`var(--accent-on)`)**: Como a variável de destaque do tema dark (`--accent`) é um cinza muito claro/quase branco (`#f2f2f2`), qualquer botão ou componente que utilize `--accent` como cor de fundo **deve obrigatoriamente** usar `var(--accent-on)` (e nunca `#fff` ou `white` fixos) para o texto e os ícones.
* Isso garante que, no tema escuro, o botão apresente um texto escuro legível sobre o fundo claro, enquanto no tema claro a cor do texto seja automaticamente convertida para branca sobre o fundo escuro (`#1a1a1a`), respeitando a inversão cromática nativa do sistema de tokens.

