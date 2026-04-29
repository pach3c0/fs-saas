# Skill 5.1 — Visão: Busca por Rosto na Galeria (Face Search)

> **Status:** ideia em estágio de visão. Tecnicamente acessível e barato — provavelmente entra antes do Capture (skill 5.0). Documentada para preservar a direção e o levantamento técnico.

## A ideia em uma frase

Cliente abre a galeria de uma sessão grande (rodeio, show, festa, formatura), **tira uma selfie ou faz upload de foto do rosto**, e o sistema **filtra automaticamente** mostrando primeiro as fotos onde ele aparece. Depois pode navegar nas demais normalmente.

## Caso de uso motivador

Show com 400 pessoas. Fotógrafo subiu 1500 fotos no modo `multi_instant`. Cliente abre a galeria, é forçado a rolar 1500 thumbnails para achar onde aparece — desiste. Com face search: tira selfie no celular, vê 12 fotos onde aparece, **compra**. Sem o filtro o sistema perde a venda por fricção.

## Encaixe com modos atuais

| Modo | Compatível? | Notas |
|---|---|---|
| `multi_instant` | ✅ ideal | Eventos grandes, alto volume, vários rostos por foto. |
| `multi_selection` | ✅ funciona | Cada participante já filtra o que é dele — face search torna isso automático sem distribuir links manualmente. |
| `gallery` | ✅ útil | Galeria pública grande sem seleção também ganha. |
| `selection` | ⚠️ pouco valor | Geralmente sessão pessoal (aniversário, ensaio) — cliente sabe que é tudo dele. |

## Caminhos técnicos (custo crescente)

### Opção A — face-api.js / MediaPipe **(recomendado para MVP)**

**Custo:** zero recorrente. CPU no servidor de upload.

**Como funciona:**
1. No upload de cada foto (backend), roda detecção + extração de embedding (vetor 128 floats) por rosto.
2. Persiste em `Session.photos[].faces = [{bbox, embedding, faceId}]`.
3. Cliente envia selfie → backend extrai 1 embedding → consulta in-memory: `cosineSimilarity(selfie, foto.faces.embedding) > 0.6` → retorna lista ordenada.

**Bibliotecas:**
- **face-api.js** — TensorFlow.js. Roda em Node (server) e browser. Modelo ~6MB. Boa precisão para casual.
- **@mediapipe/face_detection + face_embedder** — Google, mais rápido, precisão similar.
- **@vladmandic/face-api** — fork mais ativo do face-api.js, recomendado em 2025/2026.

**Performance estimada:**
- Detecção + embedding: ~200–500ms por foto em CPU comum.
- 1500 fotos × 400ms = ~10 minutos de processamento (assíncrono, sem bloquear upload).
- Comparação cliente: < 100ms para 1500 fotos (operação vetorial trivial).

### Opção B — AWS Rekognition / Google Vision

**Custo:** ~$1 por 1000 faces indexadas. 1500 fotos × 5 rostos = $7.50/sessão.

**Quando faz sentido:** se a precisão do face-api.js for insuficiente em iluminação ruim (eventos noturnos, palco). Pode ser feature paga ("Face Search Pro").

### Opção C — InsightFace / DeepFace self-hosted

**Custo:** servidor dedicado com GPU (~$50–100/mês para volume médio).

**Quando faz sentido:** escala muito grande (milhares de fotos/dia). Precisão estado da arte. **Não vale para MVP.**

### Opção D — QR code / código manual

**Não viável** para este caso. A câmera fotografa o rosto, não o crachá. Só funcionaria em formaturas/corporativos com crachá visível em todas as fotos — caso restrito.

## Recomendação de stack para MVP

- **Lib:** `@vladmandic/face-api` (Node + browser).
- **Detecção no upload:** server-side em job assíncrono, não bloqueia o upload.
- **Selfie:** capturada no browser (PWA já tem acesso à câmera). Embedding pode ser gerado **no browser** (mesma lib) — o servidor recebe só o vetor 128-float, não a imagem da pessoa. **Bonus de privacidade:** selfie nunca trafega.
- **Comparação:** server-side por padrão (simples). Pode mover para client-side se quiser que galerias funcionem offline-first via PWA.

## Modelo de dados

### `src/models/Session.js` — estender `photos[]`

```js
photos: [{
  // ... campos existentes
  faces: [{
    faceId: { type: String },           // uuid local, identifica face dentro da foto
    bbox: { x: Number, y: Number, w: Number, h: Number },
    embedding: { type: [Number] },      // 128 floats
    confidence: { type: Number }
  }],
  facesProcessed: { type: Boolean, default: false },
  facesProcessedAt: { type: Date }
}]
```

> Embeddings inflam o documento. Se sessão tiver 5000 fotos × 5 rostos × 128 floats × 8 bytes = ~25MB no doc — **acima do limite Mongo de 16MB**. Mover para coleção separada `FaceIndex` (sessionId, photoId, faceId, embedding) com índice em `sessionId`.

### Nova coleção `FaceIndex`

```js
{
  organizationId, sessionId, photoId, faceId,
  bbox, embedding, confidence,
  createdAt
}
```

## Pipeline de upload

1. Foto chega em `routes/sessions.js` upload handler.
2. Salva arquivo + thumb (fluxo atual).
3. **Enfileira** job de face indexing (em memória primeiro, depois Bull se virar gargalo).
4. Job:
   - Carrega imagem.
   - Detecta rostos.
   - Para cada rosto: extrai embedding, persiste em `FaceIndex`.
   - Marca `photo.facesProcessed = true`.

## Endpoint cliente

```
POST /api/sessions/:id/face-search
body: { embedding: [128 floats] }
response: { matches: [{ photoId, similarity, bbox }, ...] }
```

Comparação: `dot(a, b) / (||a|| × ||b||) > 0.6`. Ordena desc por similarity.

Quando lib é embutida no PWA o cliente só envia o vetor — privacidade ganha.

## UX cliente (PWA)

1. Botão "Encontrar minhas fotos" no topo da galeria.
2. Modal com 2 opções:
   - **Tirar selfie** (acessa câmera do device).
   - **Fazer upload de foto**.
3. Detecta rosto no preview e marca com bbox antes de enviar (feedback instantâneo).
4. Mostra contador "Procurando em 1500 fotos..." (progresso).
5. Resulta em duas seções:
   - **Fotos com você** (12 fotos)
   - **Todas as fotos** (1500 — ainda navegáveis)

## Ganchos com CRM (skill 4.1)

- Cliente que usou face search e selecionou ≥ 1 foto vira **lead quente** automaticamente.
- Cliente que usou face search e **não comprou** entra em trilha de scarcity reforçada (já mostrou intenção clara).
- Salvar embedding do cliente (com consentimento LGPD) permite sugerir "encontramos você em outra galeria do fotógrafo X" — feature poderosa para sessões corporativas recorrentes.

## Riscos e cuidados

1. **LGPD / consentimento.** Biometria facial é dado sensível (LGPD Art. 11). Precisa de:
   - Consentimento explícito antes de enviar selfie.
   - Termo de uso citando finalidade ("apenas para encontrar suas fotos nesta galeria").
   - Embedding do cliente **descartado após a busca** (não salvar a longo prazo sem consentimento extra).
   - Embeddings das fotos da galeria são "imagem da pessoa autorizando o fotógrafo" — permitido pela própria autorização do evento.
2. **Falsos positivos.** Em galerias muito grandes (10k+ fotos), 0.6 de threshold gera ruído. Prever ajuste de threshold por sessão e revisão "esta sou eu? sim/não" do cliente.
3. **Iluminação ruim / ângulos** (palco, foto de costas) reduzem recall. Comunicar limites na UX para não frustrar.
4. **Crianças.** LGPD Art. 14 — consentimento de responsável. Em formatura infantil, fluxo deve ser pelos pais.

## Caminho mínimo viável

**Fase 0 — Prova de conceito (3–4 dias)**
- Script Node carregando 50 fotos de teste, indexa com face-api.js, salva embeddings em JSON.
- Comparação manual via REPL.
- Validar precisão em fotos de evento real do fotógrafo.

**Fase 1 — Backend MVP (1 semana)**
- Modelo `FaceIndex` + job assíncrono no upload.
- Endpoint `/api/sessions/:id/face-search`.
- Reprocessar fotos antigas via comando admin.

**Fase 2 — PWA cliente (1 semana)**
- Modal selfie/upload, embedding em browser.
- Tela de resultados.
- Termo de consentimento LGPD.

**Fase 3 — Plano e gating**
- Feature do plano `pro` (ou `basic` premium).
- Limite de buscas/sessão para `free`.

## Arquivos críticos (quando implementar)

- `src/models/Session.js` — flag `facesProcessed` no photos[]
- `src/models/FaceIndex.js` — NOVO
- `src/utils/faceIndexer.js` — NOVO, job assíncrono
- `src/routes/sessions.js` — endpoint face-search
- `cliente/js/face-search.js` — NOVO, lógica PWA
- `cliente/index.html` — botão "Encontrar minhas fotos"

## Verificação end-to-end

1. Subir 100 fotos de evento real com 20 pessoas distintas.
2. Esperar `facesProcessed=true` em todas (job concluído).
3. Tirar selfie de uma pessoa que aparece em 10 fotos.
4. Esperado: face-search retorna ≥ 8 das 10 (recall ≥ 80%) e ≤ 2 falsos positivos.
5. Threshold ajustável; medir precision/recall em planilha.

## Anti-escopo

- **Não** fazer reconhecimento facial cruzando galerias diferentes sem consentimento explícito do cliente final.
- **Não** salvar embedding do cliente no perfil dele de forma persistente sem opt-in claro.
- **Não** usar para "vigilância" / detecção sem o cliente iniciar a busca.

A feature serve o cliente final encontrando *suas próprias* fotos. Qualquer outro uso é território delicado de privacidade.

## Quando começar

Critérios:
- [ ] Modo `multi_instant` validado em campo.
- [ ] Pelo menos 1 evento real do dono com >500 fotos onde a feature teria evitado fricção.
- [ ] Texto LGPD revisado.

Provavelmente entra **antes** do Capture (skill 5.0): custo menor, valor imediato, não depende de hardware.
