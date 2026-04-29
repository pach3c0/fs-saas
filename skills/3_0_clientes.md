# Skill: Gestão de Clientes (CRM)

Este módulo é responsável pelo gerenciamento da base de clientes (CRM) do fotógrafo, permitindo o cadastro, edição, exclusão e visualização de sessões vinculadas.

## 🎯 Objetivos
- Manter o cadastro centralizado de clientes (Nome, E-mail, Telefone, CPF/CNPJ).
- Vincular sessões aos clientes para histórico de entrega.
- Implementar busca reativa e filtragem eficiente.

## 🛠️ Padrões de Implementação

### Frontend (`admin/js/tabs/clientes.js`)
- **Tecnologia:** Vanilla JS (ES Modules).
- **Estilo:** CSS Variables (`var(--ad-bg-base)`, etc.). **Proibido Tailwind** dentro do arquivo da aba.
- **Diálogos:** Use `window.showToast(msg, type)` e `window.showConfirm(msg)`. Nunca use `alert/confirm`.
- **Reatividade:** Busca com `oninput` direto no campo de texto para filtragem instantânea.
- **Modais:** Utiliza o componente compartilhado `admin/js/utils/client-modal.js`.

### Backend (`src/routes/clients.js` & `src/models/Client.js`)
- **Padrão:** CommonJS (`require`).
- **Consultas:** Use sempre `.lean()` em operações de leitura para performance.
- **Segurança:** Filtrar todas as rotas e queries por `organizationId` (Tenant Isolation).
- **I/O:** Apenas assíncrono (`fs.promises`).

## 📋 Regras de Negócio e UX
1. **Padrão Auto-Save:** Para novos campos de configuração (ex: notas rápidas), use `oninput="appData.clientes.campo = this.value; saveDados();"` conforme o padrão global.
2. **Validação de Exclusão:** Antes de deletar, verifique se o cliente possui sessões. Exiba um aviso claro se houver vínculos.
3. **Escrita Segura:** Ao atualizar objetos aninhados no MongoDB, substitua o objeto pai ou use caminhos específicos para evitar erros de "Cannot create field".
4. **Formatos:** Nomes e strings devem passar por `escapeHtml` antes de renderizar no DOM.

## 🚀 Fluxo de Desenvolvimento
1. **Interface:** Atualizar `renderClientes(container)` com o HTML semântico e variáveis de tema.
2. **Dados:** Carregar via `apiGet('/api/clients')`.
3. **Eventos:** Ligar botões de ação (Editar/Excluir) via `querySelectorAll` e listeners diretos.
4. **Integração:** Garantir que o `sessionCount` reflita a realidade das sessões ativas no banco.

---
> [!IMPORTANT]
> O banco de dados correto é `cliquezoom`. Nunca utilize `fsfotografias` em código de desenvolvimento ou testes genéricos.
