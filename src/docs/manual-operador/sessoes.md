# Sessões e os Modos de Galeria

> **Público-alvo:** FOTÓGRAFO cria/gerencia · CLIENTE final consome · *(o superadmin observa de fora)*
> **Onde no app:** painel do FOTÓGRAFO (`admin/js/tabs/sessoes/`) + PWA do CLIENTE (`cliente/`)
> **Código-fonte:** [src/models/Session.js](src/models/Session.js), [src/routes/sessions.js](src/routes/sessions.js)
>
> A **sessão** é a unidade central do produto: uma galeria de fotos que o fotógrafo cria e entrega/vende ao cliente. Tudo é escopado por `organizationId`.

---

## O que é

Cada `Session` pertence a uma org (`organizationId`) e tem um **`accessCode`** (o que o cliente usa para entrar — sem login). Fotos ficam em `photos[]` (thumb comprimida `url` + `urlOriginal` em alta para a entrega + `urlEditada` quando o fotógrafo sobe a final). O modo da sessão define o fluxo.

---

## Os modos (`Session.mode`)

| Modo | Status | O que é |
|---|---|---|
| `gallery` | **ativo** | Galeria simples: cliente vê e baixa. Pode ter prévia/marca d'água (`galleryDeliveryMode: 'preview'`) ou entrega direta (`'direct'`). |
| `selection` | **ativo** | Seleção com pacote: cliente escolhe N fotos (`packageLimit`), pode pedir extras, há prazo (`selectionDeadline`). |
| `multi_selection` | **ativo** | Vários **participantes** numa sessão (ex.: turma/família), cada um com `accessCode`, pacote e seleção próprios. Pool de fotos compartilhado. |
| `multi_instant` | **oculto (V2)** | Aguarda face search; código preservado no back, escondido no front. |
| `multi_gallery` | enum/legado | Presente no enum; não é o foco do V1. |

---

## Como funciona (fluxo da `selection`, o mais completo)

1. **Cria a sessão** (`session_created`). Padrões vêm de `Organization.preferences.sessionDefaults` (pacote, preço extra, resolução, prazo).
2. **Sobe fotos** — `uploadFlow`: `'originals'` (sobe cruas, edita depois) ou `'edited'` (já sobe finais). Marca de tempo: `uploadsCompletedAt`.
3. **Envia o código** ao cliente (`codeSentAt`, evento `code_sent`). O passo exige cliente vinculado e fotos visíveis (paridade com o multi).
4. **Cliente acessa** (`firstAccessAt` na 1ª vez; evento `client_entered`). Seleciona até `packageLimit` (`selectedPhotos`).
5. **Cliente finaliza** (`selectionSubmittedAt`, `selectionStatus: 'submitted'`, evento `selection_submitted`).
6. **Extras** (opcional): `extraRequest` (`pending`→`accepted`/`rejected`). No multi, cada participante tem o próprio `extraRequest`.
7. **Entrega** (`deliveredAt`, `selectionStatus: 'delivered'`, evento `session_delivered`). Histórico em `deliveryHistory[]`; reabertura possível (`allowReopen`/`reopenRequested`).

**Marcos de tempo úteis para diagnóstico:** `createdAt`, `codeSentAt`, `firstAccessAt`, `selectionSubmittedAt`, `deliveredAt` + o enum `selectionStatus` (`pending`/`in_progress`/`submitted`/`delivered`/`expired`).

---

## Auto-inscrição (QR Code) e tabela de preços — multi_selection

- **Auto-inscrição:** `selfRegEnabled` abre a página pública `/inscrever/:code` ([server.js:316](src/server.js#L316)); o convidado vira `participant` (nome, WhatsApp, `relationship`). Prazo próprio em `selfRegDeadline`.
- **Tabela de preços (`pricingTable`):** faixas **cumulativas por limiar** (`[{from, price}]`) — cada foto extra é cobrada pela faixa em que cai (estilo imposto, total sempre crescente). **É só exibição:** o cliente vê o total correndo; **a plataforma NÃO cobra** — quem cobra é o fotógrafo, por fora. Tabela vazia → usa `extraPhotoPrice` fixo.

---

## O que o SUPERADMIN pode ver/fazer

- **Ver (read-only):** contagem de sessões/fotos por org (dashboard), e a jornada da org (`getOrgJourney`) com os eventos `session_created`, `client_entered`, `selection_submitted`, `session_delivered` etc.
- **Não há** hoje uma tool da IA para inspecionar **uma sessão específica** ou **listar as sessões de uma org** — isso é a **Fase 2** (tools `listSessions`/`getSession`). Por ora o superadmin abre o painel da org (com consentimento) para o detalhe.
- **Bloqueio de emergência:** `Session.clientAccessBlocked` corta o acesso do cliente sem apagar dados (admin segue gerenciando).

---

## Onde os dados moram

- `Session` (campos acima) + `Session.participants[]` (multi: `accessCode`, `selectedPhotos`, `extraRequest`, `courtesyPhotos`, `personTriagemIds` por pessoa).
- `Session.events[]` = timeline interna da própria sessão (≠ `ActivityEvent`, que é a jornada da org).
- Reconhecimento facial: `faceEnabled` + `persons[]` + `photos[].personTags` (tags da Triagem; **biometria nunca sobe**).
- Retenção de storage: `storageRetentionUntil`, `storageAutoDelete`, `archivedAt`.

---

## Gotchas

- **Cortesia difere por modo:** na `selection` individual, cortesia é DEDUZIDA ("foto em alta fora da seleção"); no `multi_selection` o pool é compartilhado, então cortesia é SEMPRE explícita (`participant.courtesyPhotos`) — nunca automática.
- **Identidade do cliente no boot:** o código da URL tem prioridade sobre o `localStorage` (corrige cliente "entrar como" outro).
- **Isolamento no multi:** `/client/photos` precisa escopar alta-res e comentários por participante — já foi corrigido um vazamento cross-participante aqui.
- **`published=false`:** durante o push da Triagem a sessão fica em rascunho e barra o cliente até concluir (sessões antigas sem o campo não são barradas).
- **Plataforma não cobra extras (V1):** qualquer "total" na galeria é informativo; não há captura de pagamento do cliente final.
