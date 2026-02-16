# FASE 7 - Seleção Múltipla (Formaturas e Shows)

## Objetivo
Permitir que vários clientes selecionem fotos na mesma galeria com códigos de acesso individuais. Ideal para formaturas, shows e eventos com múltiplos participantes.

## Contexto do Projeto

- **Stack**: Node.js + Express (CommonJS no backend), Vanilla JS puro no frontend
- **Backend**: CommonJS — SEMPRE `require()` e `module.exports`. NUNCA `import/export`.
- **Frontend admin** (`admin/js/`): ES Modules — SEMPRE `import/export`. NUNCA `require()`. Inline styles dark mode obrigatório.
- **Frontend cliente** (`cliente/js/gallery.js`): Vanilla JS puro — tag `<script>` normal, sem `type="module"`.
- **Multi-tenancy**: TODA query MongoDB DEVE filtrar por `organizationId`.
- **Após implementar**: atualizar `ROADMAP.md` (marcar fase 7 concluída) e `CLAUDE.md` (novos arquivos/rotas).

---

## O que existe hoje (não alterar)

### Modos de sessão atuais (Session.mode):
- `'selection'` — um cliente seleciona fotos com um único `accessCode`
- `'gallery'` — um cliente só visualiza/baixa fotos

### Fluxo atual do cliente:
1. Acessa `/cliente/`, digita código → POST `/api/client/verify-code`
2. Backend busca sessão por `{ accessCode, isActive: true, organizationId }`
3. Retorna `sessionId` → cliente carrega fotos via GET `/api/client/photos/:id?code=X`

---

## O que implementar

### PARTE 1 — Backend

#### 1.1 Atualizar `src/models/Session.js`

Adicionar campo `participants` no schema (manter todos os campos existentes):

```javascript
// Participantes (modo multi_selection)
participants: [{
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  accessCode: { type: String, required: true },      // Código único por participante
  selectedPhotos: [String],                           // IDs das fotos selecionadas
  selectionStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'submitted', 'delivered'],
    default: 'pending'
  },
  packageLimit: { type: Number, default: 30 },
  submittedAt: Date
}]
```

Também adicionar `'multi_selection'` no enum do campo `mode`:
```javascript
mode: { type: String, enum: ['selection', 'gallery', 'multi_selection'], default: 'selection' }
```

#### 1.2 Atualizar `src/routes/sessions.js`

**1.2.1 — Rota verify-code**: atualizar para suportar multi_selection

A rota `POST /api/client/verify-code` deve buscar também em `session.participants`:

```javascript
// Lógica atual: busca por session.accessCode
// Nova lógica: busca primeiro por session.accessCode (modo normal),
//              depois por participant.accessCode (modo multi_selection)

// Se encontrou por participant.accessCode:
//   - retornar sessionId + participantId (para identificar o participante)
//   - retornar isParticipant: true
```

**1.2.2 — Rota GET /api/client/photos/:sessionId**: atualizar para multi_selection

Se `session.mode === 'multi_selection'`:
- Retornar todas as fotos normalmente
- Retornar `selectedPhotos` e `selectionStatus` do participante específico (usando `participantId` do query param ou do accessCode)
- Retornar `packageLimit` do participante

Query param adicional: `?code=X&participantId=Y` (participantId opcional, pode ser derivado do code)

**1.2.3 — Rota PUT /api/client/select/:sessionId**: atualizar para multi_selection

Se `session.mode === 'multi_selection'`:
- Salvar seleção em `participants[idx].selectedPhotos` (não em `session.selectedPhotos`)
- Identificar participante pelo `accessCode` enviado no body

**1.2.4 — Rota POST /api/client/submit-selection/:sessionId**: atualizar para multi_selection

Se `session.mode === 'multi_selection'`:
- Atualizar `participants[idx].selectionStatus = 'submitted'`
- Atualizar `participants[idx].submittedAt = new Date()`
- Criar notificação informando qual participante finalizou

**1.2.5 — Novas rotas admin para participantes**:

```
POST   /api/sessions/:id/participants          — Adicionar participante
PUT    /api/sessions/:id/participants/:pid     — Editar participante
DELETE /api/sessions/:id/participants/:pid     — Remover participante
PUT    /api/sessions/:id/participants/:pid/deliver — Marcar participante como entregue
```

Payload para criar/editar participante:
```json
{
  "name": "Nome do Aluno",
  "email": "email@exemplo.com",
  "phone": "(11) 99999-9999",
  "packageLimit": 30
}
```

O `accessCode` é gerado automaticamente pelo backend: `crypto.randomBytes(4).toString('hex').toUpperCase()`

**1.2.6 — Rota GET /api/sessions/:id/participants/export**: exportar seleções

Retorna texto/CSV com: Nome do participante, fotos selecionadas (filenames), status.

---

### PARTE 2 — Admin (`admin/js/tabs/sessoes.js`)

#### 2.1 Modal "Nova Sessão" — adicionar opção multi_selection

No `<select id="sessionMode">`, adicionar:
```html
<option value="multi_selection">Multi-Seleção (formaturas, shows)</option>
```

Quando `mode === 'multi_selection'`:
- Mostrar aviso: "Participantes serão adicionados após criar a sessão"
- Ocultar campo "Fotos do pacote" e "Preço foto extra" (cada participante tem o seu)

#### 2.2 Na listagem de sessões — card de multi_selection

Quando `session.mode === 'multi_selection'`, mostrar:
- Badge "Multi-Seleção" (cor diferente, ex: roxo `#7c3aed`)
- Contador: "X de Y participantes enviaram"
- Botão "Ver Participantes" (abre modal de participantes)

#### 2.3 Modal de Participantes

Aberto ao clicar "Ver Participantes" em uma sessão multi_selection. Contém:

**Lista de participantes:**
```
Nome         | Código    | Selecionadas | Status     | Ações
Maria Silva  | A1B2C3D4  | 28/30        | Enviada    | [Ver] [Entregar] [Editar] [X]
João Souza   | E5F6G7H8  | 0/30         | Pendente   | [Ver] [Entregar] [Editar] [X]
```

- Botão **"+ Adicionar Participante"** → sub-formulário inline com: Nome*, Email, Telefone, Limite de fotos
- Botão **"Ver"** → abre modal com as fotos selecionadas por aquele participante
- Botão **"Entregar"** → marca participante como `delivered` (libera download)
- Botão **"Editar"** → edita dados do participante
- Botão **"X"** → remove participante (com confirmação)
- Botão **"Copiar Código"** → copia código de acesso
- Botão **"Exportar Seleções"** → baixa TXT com lista de fotos de todos participantes

#### 2.4 Modal "Ver Seleção do Participante"

Mostra grid com as fotos selecionadas pelo participante específico. Igual ao modal de fotos atual, mas filtrado pelas fotos do array `participant.selectedPhotos`.

---

### PARTE 3 — Galeria do Cliente (`cliente/js/gallery.js`)

A galeria do cliente **não muda visualmente**. O que muda é a lógica interna:

#### 3.1 Após verify-code

Se a resposta incluir `isParticipant: true`, salvar no `state`:
```javascript
state.participantId = result.participantId;  // novo campo no state
state.isParticipant = true;                  // novo campo
```

#### 3.2 loadSessionData

Passar `participantId` no query param quando for participante:
```javascript
const url = state.isParticipant
  ? `/api/client/photos/${state.sessionId}?code=${state.accessCode}&participantId=${state.participantId}`
  : `/api/client/photos/${state.sessionId}?code=${state.accessCode}`;
```

#### 3.3 Seleção e envio

Nas chamadas de `PUT /api/client/select/:id` e `POST /api/client/submit-selection/:id`, incluir `participantId` no body quando `state.isParticipant === true`.

#### 3.4 Tela de login — mensagem personalizada

Se a sessão for `multi_selection`, o backend pode retornar `sessionType: 'multi_selection'` no verify-code. Neste caso, mostrar o nome do participante em vez do nome da sessão no header da galeria.

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/models/Session.js` | Adicionar `participants[]` e `'multi_selection'` no enum mode |
| `src/routes/sessions.js` | Atualizar rotas cliente (verify-code, photos, select, submit) + novas rotas admin de participantes |
| `admin/js/tabs/sessoes.js` | Opção multi_selection no modal, card diferente, modal de participantes |
| `cliente/js/gallery.js` | Suporte a `participantId` no state e nas chamadas de API |

---

## Ordem de Implementação

1. `src/models/Session.js` — adicionar `participants[]` e enum `multi_selection`
2. `src/routes/sessions.js` — novas rotas admin de participantes (POST/PUT/DELETE/deliver/export)
3. `src/routes/sessions.js` — atualizar rotas cliente (verify-code, photos, select, submit)
4. `admin/js/tabs/sessoes.js` — opção multi_selection no modal de criar
5. `admin/js/tabs/sessoes.js` — card diferente + modal de participantes
6. `cliente/js/gallery.js` — suporte a participantId

---

## Paleta de Cores do Admin (inline styles obrigatório)

| Elemento | Cor |
|----------|-----|
| Fundo da página | `#111827` |
| Fundo cards/containers | `#1f2937` |
| Fundo inputs | `#111827` |
| Borda | `#374151` |
| Texto principal | `#f3f4f6` |
| Texto secundário | `#d1d5db` |
| Botão salvar | `background:#2563eb` |
| Botão adicionar | `background:#16a34a` |
| Botão deletar | `color:#ef4444` |
| Badge multi-seleção | `background:#7c3aed; color:white` |
| Texto sucesso | `color:#34d399` |
| Texto erro | `color:#f87171` |

---

## Detalhes Técnicos Importantes

### Identificar participante pelo accessCode

No backend, ao receber `accessCode` num request do cliente, verificar dois casos:

```javascript
// Caso 1: é o código da sessão (modos 'selection' e 'gallery')
let session = await Session.findOne({ accessCode, isActive: true, organizationId });

if (!session) {
  // Caso 2: é código de participante (modo 'multi_selection')
  session = await Session.findOne({
    'participants.accessCode': accessCode,
    isActive: true,
    organizationId
  });
  if (session) {
    const participant = session.participants.find(p => p.accessCode === accessCode);
    // retornar participantId: participant._id
  }
}
```

### Salvar seleção do participante (PUT /api/client/select/:sessionId)

```javascript
// Se multi_selection: atualizar apenas o participante correto
const session = await Session.findById(sessionId);
const participant = session.participants.id(participantId);
// ou: session.participants.find(p => p.accessCode === code)

if (selected) {
  if (!participant.selectedPhotos.includes(photoId)) {
    participant.selectedPhotos.push(photoId);
    participant.selectionStatus = 'in_progress';
  }
} else {
  participant.selectedPhotos = participant.selectedPhotos.filter(id => id !== photoId);
}
await session.save();
```

### Exportar seleções — formato TXT

```
SESSÃO: Nome da Sessão
DATA: 16/02/2026
TOTAL DE PARTICIPANTES: 30

---
PARTICIPANTE: Maria Silva
STATUS: Enviada
FOTOS SELECIONADAS (28):
  IMG_0001.jpg
  IMG_0003.jpg
  ...

---
PARTICIPANTE: João Souza
STATUS: Pendente
FOTOS SELECIONADAS (0):
  (nenhuma)
```

---

## Como Testar

1. `npm run dev`
2. Criar sessão com modo "Multi-Seleção" no admin
3. Adicionar 3 participantes com limites diferentes
4. Copiar código de cada participante
5. Abrir 3 abas do browser → `/cliente/` → cada um com seu código
6. Verificar que cada um vê todas as fotos mas seleciona independentemente
7. Um participante finaliza seleção → admin recebe notificação com o nome do participante
8. Admin clica "Entregar" só para aquele participante → apenas ele vê download
9. Exportar seleções → TXT com fotos de cada participante separadas
