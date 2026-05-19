# Sessões — Módulo de Gestão de Trabalhos (CliqueZoom Admin)

> Documentação gerada em 2026-05-19.
> Pasta: `admin/js/tabs/sessoes/`
> Backend: `src/routes/sessions.js`
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES[1]` (id: `sessoes`). Ver padrão em `skills/00_manual-usuario.md`.

---

## 1. Visão Geral

O módulo Sessões gerencia o ciclo completo de um trabalho fotográfico: criação, upload de fotos, envio do código de acesso ao cliente, seleção pelo cliente, upload das editadas e entrega final. É o módulo com maior volume de código da aplicação admin.

**Entry point:** `admin/js/tabs/sessoes/index.js` — função `renderSessoes(container)`.

**Estrutura de pasta** (> 600 linhas — segue padrão modular):
```
admin/js/tabs/sessoes/
  index.js             — entry point, HTML do container, orquestra todos os módulos
  state.js             — estado global do módulo (sessionsData, currentSessionId, etc.)
  list.js              — carregamento, filtros e renderização da lista de sessões
  modal-form.js        — formulário de criação e edição de sessão
  modal-detail.js      — modal de fotos (galeria geral + aba de entrega final)
  actions.js           — ações globais (entregar, reabrir, enviar código, histórico, etc.)
  upload.js            — lógica de upload (fotos originais e editadas) + modal de validação
  comments.js          — modal de comentários por foto
  modal-participantes.js — gestão de participantes (modo multi_selection)
```

---

## 2. Arquivos e Responsabilidades

### index.js
- Renderiza o HTML completo (filtros, lista, todos os modais em um único container)
- Chama `loadSessions()`, `setupListFilters()`, `setupModalForm()`, `setupModalDetail()`, `setupComments()`, `setupParticipantes()`, `setupUpload()`, `setupActions()` em sequência
- Exporta apenas `renderSessoes(container)` — sem estado próprio (usa `state.js`)

### state.js
Estado compartilhado entre todos os arquivos do módulo:
- `sessionsData` — array de sessões carregadas da API
- `currentSessionId` — ID da sessão aberta no modal de fotos
- `currentParticipantsSessionId` — ID da sessão aberta no modal de participantes
- `currentCommentSessionId` / `currentCommentPhotoId` — contexto do modal de comentários

### list.js
- `loadSessions(container, state)` — `GET /api/sessions`, popula `state.sessionsData`, chama `filterAndRender()`
- `filterAndRender(container, state)` — aplica filtros (busca, modo, status, data) e chama `renderList()`
- `renderList(container, items)` — renderiza os cartões de sessão com badges de status, botões de ação e barra de código
- `setupListFilters(container, state)` — registra listeners nos inputs de filtro
- **Cores dos cartões por modo:** `color-mix(in srgb, var(--green) 4%, transparent)` (seleção), `--orange` (multi), `--purple` (galeria)

### modal-form.js
- `setupModalForm(container, state, renderSessoes)` — lógica do modal Nova Sessão e Editar Sessão
- Habilita/desabilita campos dinamicamente conforme o modo escolhido
- **Validação de datas:** única regra — prazo de seleção deve ser posterior à data do evento. "Criado em" é só registro, sem validação (fotógrafo pode criar sessão retroativa ou futura sem bloqueio). Fix aplicado em 2026-05-19 (commit `0a72be8`).
- Busca de cliente com autocomplete (`GET /api/clients/search?q=`) + criação de novo cliente inline via `abrirModalClienteNovo()`
- Criação: `POST /api/sessions` · Edição: `PUT /api/sessions/:id`

### modal-detail.js
- `setupModalDetail(container, state)` — define `window.viewSessionPhotos(sessionId)`
- Renderiza grid de fotos com: checkbox bulk-delete, badge "Selecionada", badge "CAPA", badge 💬 (comentários), overlay hover com ações (ocultar, comentar, definir capa)
- Aba "Entrega Final" mostra fotos com `urlOriginal` e botão "Exportar Lightroom"
- `window.switchPhotoTab(tab)` — alterna entre aba Geral e Entrega Final
- Deletes em massa: `DELETE /api/sessions/:id/photos/bulk`

### actions.js
- `setupActions(container, state, renderSessoes)` — define funções globais de ação
- `window.copySessionCode(code, btn)` — copia para clipboard com feedback visual
- `window.sendSessionCode(sessionId, accessCode)` — `POST /api/sessions/:id/send-code`
- `window.reopenSelection(sessionId)` — `PUT /api/sessions/:id/reopen`
- `window.deliverSession(sessionId)` — `PUT /api/sessions/:id/deliver` (lógica diferente por modo: gallery vs selection)
- `window.acceptExtraRequest(sessionId)` — `PUT /api/sessions/:id/extra-request/accept`
- `window.rejectExtraRequest(sessionId)` — `PUT /api/sessions/:id/extra-request/reject` (modal customizado com campo de motivo)
- `window.deleteSession(sessionId)` — `DELETE /api/sessions/:id`
- `window.setSessionCover(sessionId, photoUrl)` — `PUT /api/sessions/:id` com `{coverPhoto}`
- `window.togglePhotoHidden(sessionId, photoId)` — `PUT /api/sessions/:id/photos/:photoId/toggle-hidden`
- `window.viewSessionHistory(sessionId)` — `GET /api/sessions/:id`, renderiza timeline de eventos

### upload.js
- `showUploadValidationModal(container, report, onConfirm)` — modal de validação antes do upload de editadas (4 caixas coloridas: não encontradas/vermelho, não selecionadas/amarelo, extras/accent, tudo certo/verde)
- `setupUpload(container, state, renderSessoes)` — lógica de upload via `UploadQueue` (concorrência 3)
  - `#sessionUploadInput` → `POST /api/sessions/:id/photos` (fotos originais)
  - `#sessionEditedInput` → `POST /api/sessions/:id/photos/upload-edited` (fotos editadas, com validação prévia)
- `window.globalUploadPanel` / `window.globalUploadQueue` — singletons reutilizados entre uploads

### comments.js
- `setupComments(container, state)` — define `window.openComments(sessionId, photoId)`
- Renderiza chat bidirecional: mensagens do cliente (esquerda, fundo `var(--bg-elevated)`) e do admin (direita, fundo `color-mix(in srgb, var(--accent) 20%, transparent)`)
- Envio: `POST /api/sessions/:id/photos/:photoId/comments`

### modal-participantes.js
- `setupParticipantes(container, state, renderSessoes)` — define `window.viewParticipants(sessionId)`
- Autocomplete de clientes na busca de participantes (`GET /api/clients/search?q=`)
- Adicionar participante: `POST /api/sessions/:id/participants`
- Remover: `DELETE /api/sessions/:id/participants/:pid`
- Entregar individual: `PUT /api/sessions/:id/participants/:pid/deliver`
- Exportar seleções: `GET /api/sessions/:id/participants/export?token=`

---

## 3. Ferramentas e Componentes Visíveis ao Usuário

| Elemento | Localização | Função |
|---|---|---|
| Filtros (busca, modo, status, data) | topo da lista | Filtrar sessões em tempo real |
| Cartão de sessão | list.js | Visão geral de cada trabalho |
| Badge de status | list.js | Cor indica fase do trabalho |
| Barra de código + Copiar | list.js | Compartilhar acesso com cliente |
| Botão Fotos | list.js | Abre modal de galeria |
| Botão Config | list.js | Abre modal de edição |
| Botão Participantes | list.js (multi_selection) | Gerencia participantes |
| Botão 📧 Enviar | list.js | Envia código por e-mail |
| Botão Entregar / Re-entregar | list.js | Libera download ao cliente |
| Botão Reabrir | list.js | Reabre seleção do cliente |
| Botão Histórico | list.js | Timeline de eventos da sessão |
| Modal de fotos (grid) | modal-detail.js | Upload, visualização, bulk delete |
| Aba Entrega Final | modal-detail.js | Fotos editadas prontas p/ entrega |
| Banner modo re-entrega | modal-detail.js | Alerta visual quando ativo |
| Modal de participantes | modal-participantes.js | Gestão de multi-seleção |
| Modal de validação de upload | upload.js | Verificação antes de subir editadas |
| Painel de upload global | upload-panel.js | Progresso de uploads em andamento |
| Modal de comentários | comments.js | Chat admin↔cliente por foto |
| Modal de histórico | actions.js | Timeline de eventos da sessão |
| Modal de recusa de extras | actions.js | Motivo de recusa com campo de texto |

---

## 4. Fluxo de Dados

```
renderSessoes(container)
  ├── Renderiza HTML estático (filtros + lista vazia + todos os modais)
  ├── loadSessions() → GET /api/sessions → state.sessionsData → renderList()
  ├── setupListFilters() → listeners nos inputs de filtro
  ├── setupModalForm() → define editSession(), newSessionModal handlers
  ├── setupModalDetail() → define window.viewSessionPhotos()
  ├── setupComments() → define window.openComments()
  ├── setupParticipantes() → define window.viewParticipants()
  ├── setupUpload() → define handlers nos inputs de arquivo
  └── setupActions() → define window.deliverSession(), sendSessionCode(), etc.

Ações do usuário:
  Criar sessão: POST /api/sessions → renderSessoes()
  Editar sessão: PUT /api/sessions/:id → renderSessoes()
  Deletar sessão: DELETE /api/sessions/:id → renderSessoes()
  Upload originais: POST /api/sessions/:id/photos → renderSessoes() + viewSessionPhotos()
  Upload editadas: POST /api/sessions/:id/photos/upload-edited → renderSessoes() + viewSessionPhotos()
  Entregar: PUT /api/sessions/:id/deliver → renderSessoes()
  Enviar código: POST /api/sessions/:id/send-code (sem re-render)
  Comentar: POST /api/sessions/:id/photos/:photoId/comments (atualiza state local)
```

---

## 5. Globals Usados / Expostos

| Identificador | Tipo | Origem | Uso |
|---|---|---|---|
| `window.viewSessionPhotos(id)` | função | modal-detail.js | Abre modal de fotos — usado em dashboard e outros módulos |
| `window.deliverSession(id)` | função | actions.js | Entregar sessão |
| `window.sendSessionCode(id, code)` | função | actions.js | Enviar código por e-mail |
| `window.copySessionCode(code, btn)` | função | actions.js | Copiar código com feedback visual |
| `window.reopenSelection(id)` | função | actions.js | Reabrir seleção |
| `window.deleteSession(id)` | função | actions.js | Deletar sessão |
| `window.setSessionCover(id, url)` | função | actions.js | Definir foto de capa |
| `window.togglePhotoHidden(id, photoId)` | função | actions.js | Ocultar/mostrar foto |
| `window.viewSessionHistory(id)` | função | actions.js | Abrir timeline |
| `window.acceptExtraRequest(id)` | função | actions.js | Aceitar fotos extras |
| `window.rejectExtraRequest(id)` | função | actions.js | Recusar extras com motivo |
| `window.viewParticipants(id)` | função | modal-participantes.js | Abrir modal de participantes |
| `window.openComments(id, photoId)` | função | comments.js | Abrir comentários de uma foto |
| `window.switchPhotoTab(tab)` | função | modal-detail.js | Alternar aba no modal de fotos |
| `window.globalUploadPanel` | objeto | upload.js | Singleton do painel de upload |
| `window.globalUploadQueue` | objeto | upload.js | Singleton da fila de upload |
| `window.loadSidebarStorage?.()` | função | app.js | Atualizar barra de armazenamento após uploads/deletes |

---

## 6. Padrões e Cuidados

- **Cores de modo (cartão):** sempre via `color-mix(in srgb, var(--TOKEN) N%, transparent)` — não usar RGBA hardcoded
- **Cores de status (badges):** usar `var(--green)`, `var(--yellow)`, `var(--accent)`, `var(--red)`, `var(--text-muted)` — mapeados em `STATUS_LABELS` em list.js e modal-participantes.js
- **Tokens válidos:** sem prefixo `--ad-`. Usar `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--border)`, `var(--accent)`, etc.
- **`window.globalUploadPanel` / `window.globalUploadQueue`:** singletons — criados uma vez em upload.js. Resetar `window.globalUploadQueue = null` se precisar reinicializar.
- **`renderSessoes(container)` recarrega tudo** — não há atualização parcial. Após qualquer ação destrutiva (entregar, deletar, etc.), a função é re-chamada para recarregar o estado do servidor.
- **Modo gallery oculta aba "Entrega Final"** e o fluxo de seleção — não exibir `#tabEntrega` nem `#secondaryUploadBtn` para esse modo.
- **Extras (fotos além do pacote):** lógica de aceitação/rejeição com modal customizado. O campo de motivo é obrigatório na recusa.
- **Comentários:** lógica de scroll automático para o final (`scrollTop = scrollHeight`) após enviar.
