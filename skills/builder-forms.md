# Módulo: Formulários de Conteúdo

Documenta os módulos de preenchimento simples (Serviços, Depoimentos, FAQ e Contato).

---

## 1. Serviços (`#config-servicos`)
- **Ação:** `#addServicoBtn`.
- **Campos:** Título, Descrição, Ícone (Material Symbol) e Preço (opcional).

---

## 2. Depoimentos (`#config-depoimentos`)
- **Ação:** `#addDepoimentoBtn`.
- **Lógica:** Permite adicionar manualmente ou aprovar depoimentos enviados por clientes através do site (campo `aprovado` no banco).
- **Salvar:** `#saveDepoimentosBtn`.

---

## 3. FAQ (`#config-faq`)
- **Lista:** `#faqList`.
- **Inputs:** `data-faq-question` e `data-faq-answer`.
- **Botão:** `#saveFaqBtn`.

---

## 4. Contato (`#config-contato`)
- **Campos:** `#contatoTitle`, `#contatoText`, `#contatoAddress`.
- **Finalidade:** Atualiza os dados do formulário de contato e rodapé.
