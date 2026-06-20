# Skill 18: UX e Alinhamento de Cards & Botões (Pílulas Glow)

## Contexto e Exceção ao Design System
A regra original do projeto (`comunicao.md`) determinava que **toda a interface deveria ser rigorosamente centralizada** (textos, botões, ícones, layouts de cards). 

No entanto, após testes de usabilidade, **aprovamos uma exceção focada em escaneabilidade e clareza visual** para elementos de listagem, especialmente os cards de Sessões. Além disso, evoluímos a interação dos botões do tipo "Morph" (que antes abriam apenas no hover) para se tornarem "Pílulas Abertas" permanentemente, ganhando um efeito de elevação e brilho ("Glow").

Ao atuar no layout de cards e botões secundários/ações, qualquer IA deve seguir estritamente o padrão abaixo.

---

## 1. Alinhamento de Cards (Left-Aligned)
Para cards que exibem dados resumidos em listagens (ex: Cards de Sessões em `/admin/js/tabs/sessoes/list.js`), o conteúdo agora deve ser **alinhado à esquerda**, abandonando o antigo `align-items: center` e `text-align: center`.

**Padrão Flexbox para o Card:**
```css
/* Container principal do conteúdo do card */
display: flex;
flex-direction: column;
align-items: flex-start; /* Alinha blocos à esquerda */
text-align: left;        /* Garante que o texto em si fique à esquerda */
```
*A foto de capa/avatar, o título, as badges e os textos de detalhes (datas, fotos) devem todos iniciar a partir de um eixo vertical consistente na esquerda.*

---

## 2. Botões de Ação: "Pílulas Abertas" (Sem colapso)
Os botões de ação e expansão (classes como `.header-expand-btn` e `.card-action-btn`) antes escondiam o texto (`max-width: 0`, `opacity: 0`) e revelavam no hover. **Isso não é mais usado.**
Agora, todos os botões de ação se comportam como "Pílulas sempre abertas".

**Regras CSS para Pílulas Abertas:**
- **Gap & Padding:** Deve existir um `gap` fixo entre o ícone e o label (ex: `gap: 0.25rem` ou `0.375rem`), e o botão deve ter `padding` normal (ex: `padding: 0 0.875rem 0 0.25rem`).
- **Label:** O `.card-action-label` (ou `.header-expand-label`) fica sempre visível:
  ```css
  .card-action-btn .card-action-label {
      display: inline-block;
      vertical-align: middle;
      font-size: 0.75rem;
      /* NENHUM max-width: 0 ou opacity: 0 aqui! */
  }
  ```
- **Alinhamento do container de botões:** O próprio container (ex: `.card-actions-container`) também deve seguir o eixo da esquerda: `justify-content: flex-start;` em vez de `center`.

---

## 3. Efeito Interativo "Glow" & Lift
Para manter um apelo visual *Premium*, as pílulas (quando não desativadas) recebem um efeito de elevação ("Lift") e uma sombra colorida brilhante ("Glow") ao passarem o mouse. Esse efeito foi inspirado pelo botão de Upload (`.cz-upload-pill`).

**Implementação Padrão do Hover (Glow):**
```css
.card-action-btn {
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover padrão (usa cor Accent) */
.card-action-btn:not(.danger):not(.blocked):hover {
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
    color: var(--accent);
    border-color: var(--accent);
    transform: translateY(-2px); /* Efeito Lift */
    box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 20%, transparent); /* Efeito Glow */
}
```

**Variações Semânticas (Danger / Blocked):**
As ações destrutivas (ex: Lixeira) ou de bloqueio (ex: Cadeado) devem manter o mesmo comportamento físico (Lift e Glow), porém utilizando o token de alerta correspondente (geralmente `--red`):
```css
.card-action-btn.danger:hover {
    background: var(--red);
    color: #fff;
    border-color: var(--red);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--red) 30%, transparent);
}
```
