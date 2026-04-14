# Skill: Sistema de Albums de Prova

Leia este arquivo ao trabalhar em `admin/js/tabs/albuns-prova.js` ou `src/routes/albums.js`.

---

## Fluxo

```
1. Admin cria album vinculado a uma sessao/cliente
2. Admin monta paginas (layouts, fotos posicionadas)
3. Admin envia para o cliente (gera accessCode)
4. Cliente acessa /album com codigo → visualiza e aprova/solicita revisao
5. Admin ve feedback e pode ajustar
```

---

## Status do album

| Status | Descricao |
|--------|-----------|
| `draft` | Em montagem pelo admin |
| `sent` | Enviado para o cliente |
| `approved` | Cliente aprovou |
| `rejected` | Cliente rejeitou (com comentarios) |
| `revision_requested` | Cliente pediu revisao de paginas especificas |

---

## Rotas (admin + cliente)

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/albums` | JWT | Lista albums |
| POST | `/api/albums` | JWT | Cria album |
| PUT | `/api/albums/:id` | JWT | Edita album |
| DELETE | `/api/albums/:id` | JWT | Deleta album |
| POST | `/api/albums/:id/send` | JWT | Envia para cliente |
| POST | `/api/client/albums/verify` | Publico | Verifica codigo de acesso |
| GET | `/api/client/albums/:id` | Publico+code | Visualiza album |
| PUT | `/api/client/albums/:id/approve` | Publico+code | Aprova album |
| PUT | `/api/client/albums/:id/revision` | Publico+code | Solicita revisao |
| GET | `/api/client/albums/:id/download` | Publico+code | Download do album |
