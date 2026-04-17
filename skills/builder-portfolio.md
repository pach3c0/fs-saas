# Roadmap de UX: Módulo Portfólio

Este documento descreve a visão e a evolução da experiência do usuário para a galeria de portfólio, focando em velocidade, estética premium e SEO.

## Visão Geral
Transformar a gestão do portfólio em uma tarefa prazerosa e instantânea, onde o fotógrafo gasta segundos para atualizar seu site com máxima qualidade visual.

---

## 🚀 Fase 1: Fundação (Atual)
*Foco: Velocidade e Simplicidade*

- [x] **Upload Múltiplo Paralelo**: Carregamento simultâneo com `Promise.allSettled`.
- [x] **Compressão Client-side**: Economia de banda e carregamento instantâneo.
- [x] **Drag & Drop Intuitivo**: Reordenação visual direta com feedback no preview.
- [x] **Preview em Tempo Real**: Visualização imediata no site real via iframe.
- [x] **Auto-Save**: Persistência automática sem botões de "Salvar".

---

## 🛠️ Fase 2: Gestão & Contexto (Próximo Passo)
*Foco: Organização e SEO*

- [x] **Legendas e Alt-Text**: Interface para adicionar contexto a cada foto, melhorando o SEO do site.
- [x] **Seleção em Massa**: Checkbox para deletar várias fotos de uma vez.
- [ ] **Modo "Rascunho" (Visibilidade)**: Botão de olho para ocultar uma foto do site sem precisar deletá-la do banco.
- [ ] **Tags de Categorização**: Permitir filtrar fotos por "Casamento", "Ensaios", etc. (Suporte a múltiplas galerias).

---

## ✨ Fase 3: Refinamento Premium
*Foco: Micro-interações e Fluidez*

- [ ] **Animações de Drop**: Efeito visual de "encaixe" suave ao reordenar fotos.
- [ ] **Filtros de Edição Rápida**: Integração com o `photoEditor.js` para cortes rápidos (aspect ratio).
- [ ] **Silent Reordering**: Desativar toasts de sucesso durante a reordenação para não poluir a interface, mantendo apenas o feedback visual.
- [ ] **Placeholder Inteligente**: Skeleton screens durante o upload para manter o layout estável.

---

## 🧠 Fase 4: Inteligência & Performance
*Foco: Automação e Dados*

- [ ] **Smart Focus Point**: Escolha automática do centro da foto para miniaturas mobile.
- [ ] **Lazy Loading Admin**: Carregamento sob demanda para portfólios com centenas de fotos.
- [ ] **Métricas de Engajamento**: Contador de visualizações/cliques por foto no painel admin.
- [ ] **Sincronização com Álbuns**: Opção de importar fotos diretamente de Sessões já aprovadas.

---

> [!IMPORTANT]
> **Regra de Ouro**: A interface deve sempre parecer limpa. Funcionalidades avançadas (como SEO) devem estar escondidas em modais ou menus de contexto para não poluir o grid principal.