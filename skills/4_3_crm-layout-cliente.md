# Skill 4.3 — Fundação do CRM: Layout e Dados do Cliente

Este documento define as diretrizes de implementação da **Fase 1** da Automação de CRM: a preparação visual e estrutural do Módulo de Clientes. O objetivo é garantir que a base de dados e a interface estejam prontas para receber o motor de e-mails automáticos no futuro.

---

## 🎯 Objetivo da Fase
Transformar a lista básica de clientes em um verdadeiro CRM, adicionando inteligência de dados (LTV, Datas de Aniversário, Histórico) antes de implementar os gatilhos de envio de e-mails automáticos.

---

## 🏗️ 1. Alterações no Banco de Dados

### Modelo: `src/models/Client.js`
Campos a serem adicionados ao Schema para dar suporte à inteligência de negócios:
```javascript
birthDate: { type: Date, default: null },
lastEventType: { type: String, default: '' },
lastEventDate: { type: Date, default: null },
lifetimeValue: { type: Number, default: 0 } // Total gasto ou total de fotos extras compradas
```

---

## 🖥️ 2. Alterações na Interface (Frontend - Admin)

### A. Modal de Cadastro/Edição (`admin/js/utils/client-modal.js`)
- **Novo Campo:** `Data de Nascimento` (Input type="date").
- **Novo Campo Opcional:** `Tipo de Último Evento` (Select com opções como: Casamento, Aniversário, Ensaio, etc.).
- *Regra:* Estes dados devem ser trafegados via `apiPost` e `apiPut` nas rotas do cliente.

### B. Lista de Clientes (`admin/js/tabs/clientes.js`)
- **Filtros Avançados:** Adicionar botões rápidos ou selects acima da barra de busca:
  - "Aniversariantes do Mês"
  - "Filtrar por Tipo de Evento"
- **Novo Layout do Card de Cliente:**
  - Exibir a **Data de Nascimento** (se existir).
  - Exibir **Badge Inteligente** (Ex: se o aniversário for em < 30 dias, mostrar badge `badge-warning` "Aniversário Próximo").
  - Exibir a coluna de **LTV** (Ex: `LTV: 25 fotos extras`).
  - Trocar o clique simples de "Ver Sessões" para um novo botão **"Ver Timeline"**.

---

## 📜 3. A Nova Tela: "Timeline do Cliente"

Ao clicar no botão "Ver Timeline", o modal atual de sessões deve ser substituído/expandido por uma verdadeira Linha do Tempo.

### Estrutura Visual Esperada (Mockup Textual):
```text
[ Título: Histórico de João Silva ]

• 10/Jan/2023 - 👤 Cliente Cadastrado
• 15/Jan/2023 - 📸 Sessão 'Ensaio Família' Criada
• 20/Jan/2023 - 📧 Robô enviou 'Lembrete de Prazo' (Escassez)
• 23/Jan/2023 - 🎟️ Cliente usou Cupom 'CZ-PROMO10'
• 24/Jan/2023 - ✅ Sessão Entregue (Compradas 15 fotos extras)
```

### Lógica de Dados para a Timeline
- O endpoint da API `GET /api/clients/:id/timeline` precisará cruzar dados de:
  1. A data de `createdAt` do Cliente.
  2. As Sessões vinculadas a ele (`Session.find({ clientId: id })`).
  3. O array `sentTriggers` de cada sessão (para listar os e-mails enviados pelo Robô).
  4. Histórico de compras extras (`extraRequest.paid`).

---

## 🚀 Próximos Passos (Fluxo de Execução)

Qualquer Inteligência Artificial que assumir este projeto a partir daqui deve seguir exatamente esta ordem de execução para a Fase 1:

1. **Backend:** Atualizar o `Client.js` e ajustar as rotas (`src/routes/clients.js`) para aceitar/salvar os novos campos.
2. **Backend:** Criar a nova rota `/api/clients/:id/timeline` que consolida o histórico.
3. **Frontend:** Atualizar os inputs do `client-modal.js`.
4. **Frontend:** Atualizar a renderização do card em `tabs/clientes.js` adicionando Badges, Filtros e LTV.
5. **Frontend:** Construir o novo visual do modal de "Timeline do Cliente".
