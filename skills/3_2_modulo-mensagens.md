# Skill: Módulo Mensagens — CliqueZoom

## O que é o módulo Mensagens

A tab **Mensagens** (`admin/js/tabs/mensagens.js`) é um arquivo único de 244 linhas. Ela agrupa dois fluxos distintos de comunicação em um único painel:

1. **Depoimentos Pendentes** — aprovação/rejeição de depoimentos enviados pelo site
2. **Contatos Recebidos** — mensagens de visitantes que preencheram o formulário de contato

> O CliqueZoom **não possui chat direto**. "Mensagens" = notificações tipo `contact` + depoimentos pendentes do site.

---

## Fluxo de dados

```
Site Público
  └─ Visitante preenche formulário de contato
       └─ Backend cria Notification { type: 'contact', message: "📩 Nome (email) — Assunto: Texto..." }
  └─ Cliente envia depoimento
       └─ Backend enfileira em depoimentos-pendentes

Admin → Tab Mensagens
  ├─ GET /api/notifications         → filtra type === 'contact'
  └─ GET /api/site/admin/depoimentos-pendentes
```

---

## Endpoints utilizados

### Contatos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notifications` | Lista todas as notificações (filtra `type === 'contact'`) |
| PUT | `/api/notifications/:id/read` | Marca como lida (auto ao expandir) |
| DELETE | `/api/notifications/:id` | Deleta mensagem |

### Depoimentos Pendentes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/site/admin/depoimentos-pendentes` | Lista pendentes |
| POST | `/api/site/admin/depoimentos-pendentes/:id/aprovar` | Aprova e publica |
| DELETE | `/api/site/admin/depoimentos-pendentes/:id` | Rejeita e remove |

---

## Estrutura do objeto Notification (contatos)

```js
{
  _id: string,
  type: 'contact',
  message: "📩 Nome (email) — Assunto: Texto da mensagem aqui",
  read: boolean,
  createdAt: ISO8601
}
```

O campo `message` é uma string formatada. O helper `parseMessage()` extrai:
```js
function parseMessage(msg) → { nome, email, assunto, mensagem }
// Parse por regex: "📩 Nome (email) — Assunto: Mensagem"
```

---

## Estrutura do objeto Depoimento Pendente

```js
{
  id: string,
  nome: string,
  texto: string,
  avaliacao: number,  // 1-5 estrelas
  email: string       // opcional
}
```

---

## Estado interno do módulo

```js
let _mensagens = null;   // Array de notificações type='contact'
let _pendentes = [];     // Array de depoimentos pendentes
```

Estado mantido apenas em memória enquanto a aba está aberta. Sem persistência local.

---

## Eventos/Ações globais (window.*)

| Função global | Trigger | O que faz |
|---|---|---|
| `window._depAprovar(id)` | Botão "Aprovar" | POST aprovar → remove do array → re-renderiza |
| `window._depRejeitar(id)` | Botão "Rejeitar" | showConfirm → DELETE → remove do array |
| `window._msgToggle(id)` | Clique no card de contato | Toggle expand + se não lida → PUT read + remove indicador visual |
| `window._msgDelete(id)` | Botão 🗑️ | showConfirm → DELETE → remove do DOM |

---

## Modelo Notification (MongoDB)

**Arquivo:** `src/models/Notification.js`

```js
{
  type: String,           // 'contact', 'comment_added', 'selection_submitted', etc.
  sessionId: String,
  sessionName: String,
  photoId: String,
  message: String,
  read: { type: Boolean, default: false },
  organizationId: ObjectId → Organization,
  timestamps: true        // createdAt, updatedAt
}
```

As notificações de contato (`type: 'contact'`) são criadas pelo backend quando o formulário do site público é submetido.

---

## Integração com o sistema de notificações

A tab Mensagens é navegável pelo dropdown de notificações:
- Arquivo: `admin/js/utils/notifications.js`
- Quando `onNotifClick()` recebe tipo `contact` ou `depoimento_pendente` → chama `switchTab('mensagens')`

---

## Como adicionar um novo tipo de mensagem na tab

1. **Backend:** Criar `Notification.create({ type: 'novo_tipo', message: '...', organizationId })`
2. **Frontend (`mensagens.js`):** Adicionar filtro no `loadMensagens()` ou criar nova seção análoga à de contatos
3. **Notificações (`notifications.js`):** Mapear `onNotifClick` para `switchTab('mensagens')` se necessário

---

## Padrões obrigatórios ao editar

- Inline styles com variáveis CSS (`var(--ad-bg-surface)`, `var(--ad-text)`, etc.)
- `window.showToast(msg, 'success'|'error')` para feedback
- `window.showConfirm(msg, { confirmText, danger })` para confirmações destrutivas
- `escHtml(str)` em todo conteúdo interpolado no HTML (XSS prevention)
- Nunca usar `alert/confirm`
- Código e comentários em PT-BR

---

## Arquivos críticos

| Arquivo | Papel |
|---|---|
| `admin/js/tabs/mensagens.js` | Tab completa (244 linhas, arquivo único) |
| `src/routes/notifications.js` | CRUD de notificações |
| `src/models/Notification.js` | Schema Mongoose |
| `admin/js/utils/notifications.js` | Dropdown de notificações + navegação para tab |
| `src/routes/site.js` | Endpoints de depoimentos pendentes + formulário de contato |
