# Manual do Usuário — Sistema e Padrão de Documentação

> Criado em 2026-05-19.
> Referência principal: `admin/js/tabs/ajuda.js`
> Leia este skill antes de adicionar ou editar qualquer módulo no Manual do Usuário.

---

## 1. O que é

O Manual do Usuário é uma seção estática dentro da tab **Ajuda & Tutoriais** (`/admin` → menu lateral). Acessível via sub-navegação interna: botão **"Manual do Usuário"** ao lado de "Tutoriais em Vídeo".

Objetivo: referência rápida para o fotógrafo entender o que cada seção do painel faz, sem precisar assistir a um vídeo.

---

## 2. Arquitetura

**Arquivo único:** `admin/js/tabs/ajuda.js`

**Estado relevante (topo do arquivo):**
```js
let ajudaView = 'tutorials'; // 'tutorials' | 'manual'
let openSections = { dashboard: true }; // módulo aberto por padrão
```

**Array de módulos:**
```js
const MANUAL_MODULES = [ ... ]; // cada item é um módulo do painel
```

**Funções:**
- `renderManualHTML()` — gera o HTML do accordion completo
- `window._setAjudaView(view)` — alterna entre tutoriais e manual

**Padrão de accordion:**
- Cada módulo: header clicável com ícone + label + seta
- Toggle via `data-manual-toggle="${id}"` + listener em `renderLayout()`
- Aberto/fechado controlado por `openSections[id]`

---

## 3. Regra: como documentar um módulo

**Quando auditar ou refatorar um módulo do painel, seguir esta sequência:**

### Passo 1 — Analisar o código
- Ler o arquivo da tab (`admin/js/tabs/X.js` ou `admin/js/tabs/X/index.js`)
- Listar todas as ferramentas visíveis ao usuário
- Identificar as chamadas de API usadas

### Passo 2 — Escrever o conteúdo do manual
Adicionar (ou atualizar) o item correspondente em `MANUAL_MODULES` em `ajuda.js`.

**Estrutura obrigatória por módulo:**
```
1. Parágrafo de visão geral (1-2 linhas)
2. Para cada ferramenta/seção relevante:
   a. Label em caixa-alta (estilo seção)
   b. Mini-preview visual HTML do elemento real
   c. Descrição textual do que faz
```

**Mini-preview:** HTML/CSS usando os mesmos tokens do design system (`var(--accent)`, `var(--bg-surface)`, etc.), com `pointer-events:none`. Deve representar o elemento visualmente, com dados de exemplo.

### Passo 3 — Atualizar o skill do módulo
Adicionar referência ao manual no skill correspondente (ex: `skills/01_dashboard.md`).

### Passo 4 — Atualizar CLAUDE.md
Marcar o módulo como documentado na lista de estado do projeto.

---

## 4. Regras de linguagem (obrigatório)

- **Nunca usar "estúdio"** em copy do manual. Usar "negócio", "trabalho", "conta".
  - ❌ "resumo do seu estúdio"
  - ✅ "resumo do seu negócio"
- Linguagem direta, segunda pessoa ("você", "seu", "sua")
- Focar no **o que faz**, não em como foi implementado

---

## 5. Estado atual dos módulos

| Módulo | id | Status | Skill |
|---|---|---|---|
| Dashboard | `dashboard` | ✅ Documentado | `skills/01_dashboard.md` |
| Sessões | `sessoes` | ⚠️ **Desatualizado** — manual descreve o fluxo de botões antigos. Após a refatoração para Wizard Guiado (2026-05-23), precisa ser reescrito para refletir os 6 passos. | `skills/02_sessoes.md` |
| Clientes | `clientes` | ✅ Documentado | `skills/03_clientes.md` |
| Mensagens | `mensagens` | 🔲 Placeholder | — |
| Meu Site | `meu-site` | 🔲 Placeholder | — |

> Adicionar novas linhas conforme os módulos forem documentados.

---

## 6. Como adicionar um novo módulo

Em `ajuda.js`, no array `MANUAL_MODULES`, substituir o placeholder pelo objeto completo:

```js
{
  id: 'sessoes',
  label: 'Sessões',
  icon: '<path SVG aqui/>',
  content: `
    <div style="display:flex; flex-direction:column; gap:1.75rem; padding-top:1.25rem;">
      <!-- visão geral -->
      <!-- seção 1 com preview + descrição -->
      <!-- seção 2 com preview + descrição -->
      ...
    </div>
  `
}
```

O módulo abre/fecha automaticamente pelo sistema de accordion existente. Nenhuma outra mudança é necessária.

---

## 7. Verificação após cada módulo

1. Abrir `/admin` → Ajuda & Tutoriais → Manual do Usuário
2. Confirmar que o módulo aparece na lista
3. Clicar no header → conteúdo expande/colapsa
4. Verificar que mini-previews renderizam corretamente em modo claro e escuro
5. Confirmar que não há hexcodes hardcoded (usar apenas tokens CSS)
