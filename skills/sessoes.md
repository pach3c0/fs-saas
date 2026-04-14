# Skill: Sistema de Sessoes e Selecao de Fotos

Leia este arquivo ao trabalhar em `admin/js/tabs/sessoes.js`, `src/routes/sessions.js`, ou `cliente/js/gallery.js`.

---

## Modos de sessao

- `selection` — cliente seleciona fotos (padrao)
- `gallery` — cliente so visualiza/baixa
- `multi_selection` — multiplos clientes selecionam (ex: casamento, cada um tem sua lista)

---

## Fluxo completo (modo selection)

```
1. Admin cria sessao (nome, tipo, data, codigo de acesso, modo, limite, preco extra)
2. Admin faz upload de fotos
3. Cliente acessa /cliente com codigo → ve galeria
4. Cliente seleciona fotos (coracao) → optimistic UI + salva no servidor
5. Cliente clica "Finalizar Selecao" → status muda para 'submitted'
6. Admin ve notificacao, revisa, pode reabrir ou marcar como entregue
7. Se entregue: cliente ve fotos para download (sem watermark)
```

---

## Status da selecao (selectionStatus)

| Status | Descricao |
|--------|-----------|
| `pending` | Sessao criada, cliente ainda nao selecionou |
| `in_progress` | Cliente comecou a selecionar (ou admin reabriu) |
| `submitted` | Cliente finalizou selecao |
| `delivered` | Admin marcou como entregue (cliente pode baixar) |
| `expired` | Prazo expirado |

---

## Modelo Session (campos principais)

```javascript
{
  name, type, date, accessCode,
  photos: [{ id, filename, url, urlOriginal, uploadedAt, comments }],
  mode: 'selection' | 'gallery' | 'multi_selection',
  packageLimit,           // default 30
  extraPhotoPrice,        // default R$25
  selectionStatus,        // pending → in_progress → submitted → delivered | expired
  selectedPhotos: [String],
  selectionDeadline, deliveredAt,
  participants: [...],    // para multi_selection
  coverPhoto, highResDelivery, watermark, canShare, isActive
}
```

---

## Rotas do cliente (sem autenticacao)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/client/verify-code` | Verifica codigo de acesso |
| GET | `/api/client/photos/:id?code=X` | Carrega fotos da sessao |
| PUT | `/api/client/select/:id` | Seleciona/deseleciona uma foto |
| POST | `/api/client/submit-selection/:id` | Finaliza a selecao |
| POST | `/api/client/request-reopen/:id` | Pede reabertura da selecao |
| POST | `/api/client/comments/:sessionId` | Adiciona comentario em foto |
| GET | `/api/client/download/:sessionId/:photoId?code=X` | Download individual |
| GET | `/api/client/download-all/:sessionId?code=X` | Download ZIP de todas as fotos entregues |

---

## Rotas do admin (com autenticacao JWT)

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/sessions` | Lista todas as sessoes |
| POST | `/api/sessions` | Cria nova sessao |
| PUT | `/api/sessions/:id` | Edita sessao |
| DELETE | `/api/sessions/:id` | Deleta sessao |
| POST | `/api/sessions/:id/photos` | Upload de fotos (salva original + thumb) |
| DELETE | `/api/sessions/:id/photos/:photoId` | Deleta uma foto |
| PUT | `/api/sessions/:id/reopen` | Reabre selecao |
| PUT | `/api/sessions/:id/deliver` | Marca como entregue |
| POST | `/api/sessions/:id/photos/:photoId/comments` | Admin adiciona comentario |
| GET | `/api/sessions/:sessionId/export` | Exporta lista de fotos selecionadas (Lightroom TXT) |

---

## Galeria do cliente (cliente/js/gallery.js)

- Grid de fotos: 2 colunas mobile, 3 tablet, 4 desktop
- Watermark: overlay sobre cada foto (removido quando entregue)
- Selecao: coracao no canto de cada foto, contador no topo e barra inferior fixa
- Lightbox: tela cheia com navegacao por setas e swipe touch
- Polling 15s: detecta automaticamente reabertura ou entrega
- Anti-copia: `oncontextmenu`, `user-select:none`, `pointer-events:none` nas imagens

---

## Sistema de notificacoes de sessao

Tipos de notificacao gerados por sessoes:
| Tipo | Quando |
|------|--------|
| `session_accessed` | Cliente acessa a galeria |
| `selection_started` | Cliente comeca a selecionar |
| `selection_submitted` | Cliente finaliza a selecao |
| `reopen_requested` | Cliente pede reabertura |

Backend helper:
```javascript
const { notify } = require('../utils/notifications');
await notify('selection_submitted', session._id, session.name, `${session.name} finalizou a selecao`);
```

Polling no admin a cada 30 segundos (`admin/js/utils/notifications.js`).
