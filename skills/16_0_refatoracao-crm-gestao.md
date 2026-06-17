# Refatoração do Módulo CRM (Gestão / Rhyno)

> Documentação gerada para guiar a refatoração do módulo CRM no Rhyno System (embarcado como Gestão no CliqueZoom).
> **Alvo:** Componentes em `/Users/macbook/Documents/ERP1/frontend/src/components/`
> (`CRMCentral.tsx`, `CRMProfile.tsx`, `CRMMapSection.tsx`, `CrmEventTypeManager.tsx`, `LeadsSection.tsx`).

---

## 1. Objetivo e Diretrizes Principais
Aplicar o **Design System Unificado (CliqueZoom + Rhyno)** no módulo CRM, removendo componentes com design legado (quadrados, cores conflitantes, fundos brancos absolutos) e padronizando com:
- Efeito **Morph** em todos os botões
- Identidade visual **Arredondada** (`rounded-2xl` para inputs/cards/modais).
- **Sem fundos brancos** absoluto (`bg-white`) e suporte robusto automático a light/dark mode.
- Alinhamento **Centralizado** de todos elementos.
- Tipografia única herdada (`Inter`).

---

## 2. Elementos a Serem Refatorados

### 2.1 Botões de Ação e Header (Padrão Morph)
Todo botão deve adotar o comportamento morph expansível ou pílula elegante:
- Container flex com cantos generosos (`rounded-full`).
- Transição limpa de `hover` para expansão ou destaque e label animado (`group-hover:max-w-xs`, `transition-all`).
- Sem fundos brancos fixos. Use a constante `buttonPrimary` ou construa com tokens neutros como `bg-slate-800` / `dark:bg-slate-100`.

### 2.2 Inputs, Selects e Textareas (Arredondamento Máximo)
- Substituir todas as classes de inputs antigos de modais (como `rounded`, `rounded-sm`, `rounded-md`) por **`rounded-2xl`**.
- O fundo dos campos de formulário e select não pode ser branco fixo. Reutilize o `inputClasses` atualizado (que já deve possuir arredondamento, bordas e fundos adaptativos) e certifique-se que as telas de cadastro do CRM os utilizam adequadamente.

### 2.3 Cards e Modais (Zero Fundo Branco)
- Substituir backgrounds `bg-white` literais em diálogos e modais (ex: Modal de "Registrar contato" ou "Tipos de evento") por tons flexíveis e compatíveis do tema, tipicamente definidos nas variáveis CSS globais de cards ou com utilitários como `bg-slate-50 dark:bg-[#323234]`.
- Garantir que elementos nas listas de interações e contatos (ex: hover em `FilteredBirthdays`) que utilizavam `hover:bg-slate-50` ganhem sua respectiva transição `dark:hover:bg-slate-800/50`.

### 2.4 Funil de Vendas e KPIs (Cores Neutras e Centralização)
- Os cards do KPI (Eventos Próximos, Follow-ups, etc.) devem ser limpos: centralizar valores com o label (`flex-col`, `items-center`, `justify-center`, `text-center`), removendo poluição visual à esquerda.
- Os botões do funil de prospecção (pipelines) não devem usar `border-[#0055A4]` (cor do tema fixa) ou hardcodes como `bg-blue-50`. Usar tokens padrão (ex: `var(--accent)`, `var(--text-primary)`, `dark:bg-[#323234]`).
- Os badges (etiquetas) podem ser mantidos se sinalizam rigorosamente *status reais* (como alerta de prazo vencido ou hoje), mas se for só por estética, usar chip neutro ou fundo discreto.

### 2.5 Componentes-Chave
- **`CRMCentral.tsx`**: Ajustar o grid de KPIs e Funil. Centralizar as opções. O título do cabeçalho da página (H1 - Central de CRM) deve estar alinhado de maneira central. Remover botões quadrados nos menus laterais ("three-dots", more-vertical) e adotar os padrões de cantos suaves.
- **`CRMProfile.tsx`**: Tela que lista o histórico do lead/cliente. Transformar botões de voltar e salvar no estilo morph. Os painéis de resumo não devem possuir white background, e as tabs devem ter estilo pílula centralizada e arredondada, sem fundos brancos ativos (adote `var(--bg-hover)`).
- **`LeadsSection.tsx`**: Tabela/grid de leads. Ajustar os cabeçalhos para o centro, com células perfeitamente centralizadas. O mesmo vale para a tipografia de "Dias para evento" no `CRMCentral`.

---

## 3. Checklist de Verificação da Refatoração
- [ ] Nenhum `bg-white` ou código de cor branca (`#fff`, `white`) está sendo usado diretamente.
- [ ] Textos de rótulo / placeholder / labels não utilizam branco puro (usar `dark:text-slate-300/400`).
- [ ] Ícones utilitários e botões adotam o Morphing / expansão (`rounded-full`, pill format).
- [ ] Inputs e campos utilizam `rounded-2xl` com contorno e texto adaptável.
- [ ] Todos os Modais (dialog) foram checados, aplicando cantos extremamente arredondados (`rounded-3xl` ou `2xl`), e backgrounds com tom apropriado.
- [ ] Os Títulos, dados do KPI, colunas do funnel e os dados de tabela estão perfeitamente centralizados.

> IMPORTANTE: Em caso de conflito, siga o arquivo fonte da verdade: `skills/1_7_design_system_morph_e_fontes.md`.
