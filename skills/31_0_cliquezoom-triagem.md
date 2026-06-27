# CliqueZoom Triagem — Guia do módulo

> Ferramenta **separada** do SaaS (repo próprio), que separa as fotos de um evento **por pessoa** (rosto), 100% na máquina do fotógrafo. Este guia reflete o **código atual** (2026-06-27). Histórico de evolução na memória `project_cliquezoom_triagem`; plano original arquivado em `skills/archive/20_0_plano-cliquezoom-triagem.md`.

---

## 1. O que é / propósito

- **Separação facial de fotos por pessoa** para eventos grandes (formatura, rodeio, pelotão do Exército fotografado todo mês). O fotógrafo joga milhares de fotos → o app agrupa por rosto → exporta uma pasta por pessoa.
- **Curadoria de organização** (não de qualidade): NÃO descarta olho fechado/repetida/desfocada. NÃO é entrega ao cliente final (por ora).
- **"Triagem" é guarda-chuva proposital:** hoje só separa por rosto; o dono quer espaço pra outros eixos no futuro (qualidade, enquadramento, momento) — **NÃO é v1**.
- **Local-first / privacidade:** detecção + reconhecimento rodam no navegador; as **fotos nunca sobem pra nuvem**. Badge na UI: "Tudo no seu computador".

## 2. Repositório, stack, distribuição

- **Repo:** `~/Documents/ProjetoEstudio/cliquezoom-triagem` — **separado do FsSaaS**. Git init, **sem commits, sem remote** (decisão pendente: local-only vs GitHub privado).
- **Stack:** HTML/JS estático **vanilla ESM**, **sem build**, CSS puro com tokens light/dark. PT-BR no código e comentários.
- **Distribuição:** **PWA** servido estaticamente (não é instalador). Roda **só em Chrome/Edge** (depende da **File System Access API**). `index.html` detecta a ausência e mostra "Navegador incompatível".
- **Dev local:** `npm run dev` (servidor sem deps, `dev-server.mjs`). Em prod é servido pela **rota estática `/triagem`** do app CliqueZoom (`https://app.cliquezoom.com.br/triagem/`).
- **Modelos de IA:** `models/det.onnx` (SCRFD) + `models/rec.onnx` (ArcFace, ~166 MB) — **gitignored** (`models/*.onnx`); baixados/colocados localmente e na VPS.

## 3. Mapa do código (`src/`)

| Arquivo | Responsabilidade |
|---|---|
| `main.js` | Orquestra a UI: login → home → ferramenta (abrir fotos → separar → revisar → exportar). Estado central, auto-save, reconexão de pastas. |
| `fs.js` | File System Access API: escolher pastas (fotos/parent/projeto), criar a pasta do projeto, listar imagens, carregar bitmap. |
| `persistencia.js` | **Backend de dados:** IndexedDB (projetos + handles) + arquivo-cérebro `projeto.czproj.json` + .czproj portável. Matching incremental (`enriquecerProjeto`). |
| `matching.js` | Lógica PURA do incremental: `identidadesDeProjeto`, `casarLeva` (k-NN k=1, maior cosseno), `montarGruposDaLeva`. |
| `review.js` | Modelo de grupos editáveis (`{id,nome,rostos[]}`, `LIXO_ID`) + render da revisão + métricas/manifesto a partir dos grupos. |
| `export.js` | Exporta uma pasta por pessoa, copia as fotos, esquemas de nome. |
| `engine/ort.js` | Cria sessão ONNX (força **WASM** — ver gotcha §6). |
| `engine/pipeline.js` | `separar()`: por foto → detecta → embute → thumb; devolve `rostos[]` + `erros[]`. |
| `engine/detector.js` / `embedder.js` / `cluster.js` | SCRFD (+ frontalidade) / ArcFace (+ alinhamento por olhos) / union-find por cosseno. |
| `report.js` | Render de métricas + download de JSON. |
| `license.js` | Esqueleto de licença (stub DEV) — heartbeat/JWT/anti-rollback. |
| `ui-tema.js` | Toggle de tema (light default, persiste em `localStorage`). |
| `sw.js` + `manifest.webmanifest` + `icon.svg` | Casca PWA (offline + instalável). |

## 4. Modelo de persistência ATUAL — "Projeto = uma pasta" (cérebro leve, fotos referenciadas)

> Rearquitetado em 2026-06-27 (antes o cérebro era gravado **dentro da pasta de fotos**, poluindo-a). Decisão do dono: **a pasta do projeto é diferente da pasta de fotos**; copiar a pasta do projeto p/ outro PC = abrir e continuar.

**Os 3 lugares e a regra que amarra tudo:**
1. **Cache (IndexedDB `cz-triagem`)** — gravado **SEMPRE** em todo save. Garante **0-clique** pra ver os grupos ao reabrir; nada se perde.
   - Store `projetos` (keyPath `id`): o cérebro completo (identidades + embeddings + thumbs). **Não guarda as fotos.**
   - Store `pastas` (chave = id do projeto): `{ projetoDir, fotosDir }` — os 2 `FileSystemDirectoryHandle` (structured-cloneable; NUNCA vão no JSON do projeto). Migração suave: handle solto do build antigo é lido como `{ fotosDir }`.
2. **Arquivo-cérebro `projeto.czproj.json`** na **pasta DEDICADA do projeto** — o **espelho portável** (fonte da verdade ao "Abrir pasta de projeto"). Gravado quando há permissão na pasta; senão, 1 clique "Sincronizar à pasta". `createWritable` comita só no `close()` → atomicidade prática.
3. **Fotos REFERENCIADAS** (não copiadas) — ficam na biblioteca do fotógrafo. Religadas por **nome de arquivo** sob demanda (1 clique "Reconectar fotos") pra ver em alta e exportar.

> **Modelos ONNX NÃO entram na pasta do projeto** — são asset do app (cache do Service Worker). Não viajam com o projeto e não precisam.

**Campo-ponte:** `projeto.pastaFotosNome` = nome da pasta de fotos (a FS Access API só expõe `.name`, não o caminho) — rotula o botão "Reconectar «X»".

**O "pulo do gato" sem re-scan — `remapearImagemIdx()` (`main.js`):** religa cada rosto à sua foto comparando `usado.nome` com `imagens[i].nome`. (1) casa pelo **caminho relativo completo**; (2) **fallback por basename** quando o nome bate só pelo arquivo (robusto a re-apontar a pasta num nível diferente), usado só quando o basename é único. Devolve quantos casaram ("X de Y"); sem match → `imagemIdx = null` (degrada pra thumbnail).

## 5. Fluxo do usuário (jornadas)

**Criar (PC principal):** Home → "Novo projeto" → **escolhe ONDE salvar** (pasta-mãe; consome o gesto do clique ANTES do prompt de nome) → nomeia → o app **cria a subpasta dedicada** (`criarPastaProjeto`; colisão → sufixo `(2)`) e grava o cérebro inicial. → "Abrir pasta de fotos" → "Separar por pessoa" → revisa (renomear/juntar/mover/descartar) → **tudo salva sozinho** (sem botão) no cache + arquivo. → "Exportar para pasta".

**Reabrir (mesma sessão):** Home (lista os recentes do cache) → "Abrir" → grupos na hora; arquivo e fotos religam silenciosos.

**Reabrir após reiniciar o navegador (sem PWA instalado):** 0-clique pra ver; 1 clique "Sincronizar à pasta do projeto" (grava o arquivo); 1 clique "Reconectar fotos" (alta-res + exportar). **PWA instalado → permissão persistente → silencioso.**

**Outro PC (portabilidade):** copia a pasta do projeto → Home → **"Abrir pasta de projeto"** → lê o `projeto.czproj.json` → grupos+thumbs instantâneos (cérebro viajou) → "Abrir pasta de fotos" religa as fotos por nome (re-apontadas 1×).

**Revisão (2 painéis):** esquerda = grupos/rostos (caixinha de seleção, renomear, "Juntar com ▾", descartar); direita = foto inteira navegável por hover/setas ←/→ com o rosto marcado. Descartados vão pra lixeira (`LIXO_ID`, fora do export, resgatáveis).

## 6. Motor de IA

- **ONNX Runtime Web** no navegador. Modelos InsightFace: **SCRFD** (detecção) + **ArcFace** (embedding 512-float por rosto).
- **Frontalidade:** métrica por 5 landmarks; descarta perfis ANTES do clustering (perfis sujam grupos). Slider "Frontalidade mínima".
- **Clustering (1ª leva):** union-find por cosseno (`cluster.js`). Slider "Similaridade (limiar)".
- **Defaults travados no código:** **limiar 0.60 · frontalidade 0.40** (melhor resultado validado: 31 fotos → 16 pessoas). Sliders + botão "Reagrupar" re-clusterizam **sem reprocessar** (embeddings ficam em `estado.rostos`).
- **Matching incremental (o diferencial):** projeto com identidades salvas → `montarGruposDaLeva`/`casarLeva` casa cada rosto novo contra as identidades conhecidas (k-NN k=1 = **maior cosseno** entre o rosto e qualquer amostra guardada da pessoa — robusto a mudança de aparência ao longo dos meses); quem não casa vira pessoa nova. Salvar usa **`enriquecerProjeto`** (anexa amostras com cap `maxEmb=40`/`ancoras=6`, **preserva quem faltou no mês**), **NUNCA `montarProjeto`** (este reconstrói do zero → apagaria gente).
  - **Guarda crítica:** o id provisório `novo_N` reinicia a cada leva → ao materializar pessoa nova, gera UUID permanente e **muta `grupo.id` in-place**; por isso o auto-save é **serializado** (cadeia `_salvando`) e tem **dedup `chaveRosto`** (arquivo+bbox) pra não inflar amostras ao re-salvar a mesma leva.
- ⚠️ **Gotcha WebGPU:** o EP WebGPU do ORT **não suporta `AveragePool` com `ceil_mode`** (usado por SCRFD/ArcFace) → **forçado WASM (CPU)** na Fase 0 (`engine/ort.js`). ~0,5s/rosto; ok p/ PoC, lento p/ 5000 fotos (Fase 1: WebGPU com ops compatíveis / batching / kNN no lugar do union-find O(n²)).

## 7. Exportação (`export.js`)

- Cria **uma pasta por pessoa** (grupos ativos; lixeira excluída) via `showDirectoryPicker({mode:'readwrite'})` e **copia** as fotos (foto multi-pessoa = copiada em cada pasta; não hardlink).
- **4 esquemas de nome** (`ESQUEMAS`): Original · Pessoa + nº · Pessoa + original · Original + pessoa. `nomeUnico` evita colisão (` (2)`, ` (3)`…).
- **Robustez (fix 2026-06-27):** o nome de saída usa só o **basename** (foto em subpasta como `past1/_MG_4430.jpg` viraria nome com `/` → `getFileHandle` recusa "Name is not allowed"). **Não cria pasta vazia**; conta `semFoto` (rostos sem foto conectada); **loga o erro real** no console. Retorna `{total, feitas, erros, semFoto, pastas}`.
- Pré-requisito: fotos **conectadas** (`imagemIdx` válido). Se 0 conectadas → mensagem clara mandando "Abrir pasta de fotos".

## 8. Licenciamento (`license.js`) — esqueleto stub DEV

- **Login pelo mesmo e-mail/senha da plataforma** (`POST {SAAS_URL}/api/login` → JWT). Sem serial.
- **Gated por plano** no SaaS (feature flag `triagemPro`).
- **Heartbeat diário** (único tráfego de rede): valida assinatura → token JWT (`expira_em = hoje + 7 dias`). **Trava offline de 7 dias.**
- **Anti-rollback de relógio:** `hora_efetiva = max(relógio_PC, maior_já_vista)`.
- ⚠️ **FRONTEIRA:** o heartbeat REAL + gating no backend de PRODUÇÃO do FsSaaS (Flávia ao vivo) é passo **separado e explícito**, ainda em stub DEV.

## 9. Service Worker / PWA (`sw.js`)

- `CACHE = 'cz-triagem-v2'`.
- **App shell (HTML/JS/CSS same-origin) = NETWORK-FIRST** → edições/JS novo aparecem no **reload** (cai pro cache offline se sem rede).
- **`.onnx`/`.wasm` + ORT (cdn.jsdelivr) = CACHE-FIRST** (imutáveis, pesados).
- Heartbeat de licença (outra origem) **não é interceptado**.
- Ao trocar JS, o network-first já entrega o novo; bump `v2`→`v3` é **opcional** (força re-instalação do SW + limpa cache antigo).

## 10. Deploy

- Servido via **rsync** p/ a VPS `root@5.189.174.18:/var/www/cliquezoom-triagem`, exposto pela rota estática **`/triagem`** do app CliqueZoom.
- **NÃO** reenviar `models/*.onnx` (166 MB, já na VPS) nem `node_modules/` → `rsync --exclude models --exclude node_modules --exclude .git`.
- Handoff de commit+deploy mais recente: `cliquezoom-triagem/docs/handoff-projeto-pasta-2026-06-27.md`.

## 11. Gaps conhecidos / gotchas

- **Até 2 gestos de permissão por sessão fria** (sincronizar arquivo + reconectar fotos). Ver é sempre 0-clique (cache). PWA instalado → silencioso.
- **Religação por nome de arquivo**: fotos renomeadas/reorganizadas no outro PC degradam pra thumbnail (conta "X de Y"). **1 pasta-fonte de fotos por projeto** no v1.
- **Biometria em texto** no `projeto.czproj.json` / `.czproj` (disco do fotógrafo). `.gitignore` cobre `*.czproj*` — **nunca versionar**.
- **Cache × arquivo = last-write-wins** (sem merge entre 2 PCs).
- **Sidecars órfãos**: arquivos `.cliquezoom-triagem.czproj.json` deixados em pastas de FOTOS pelo build antigo são inertes (ignorados; gitignored). Limpeza opcional.
- **WebGPU forçado pra WASM** (perf — ver §6). union-find O(n²) não escala p/ 5000 fotos.
- **Scan só das fotos novas** (incremental sobre pasta já conhecida): seam preparado (`enriquecerProjeto` existe), mas a UI de "Adicionar leva" e o diff de novas é **follow-on**.

## 12. Lanes de trabalho

- **Claude = backend/motor** (persistência, matching, licença, export, engine).
- **Gemini = front-end/UX** (Home, disposição das imagens, identidade visual CliqueZoom). Contrato em `cliquezoom-triagem/docs/front-gemini.md`.
- Regra: não reimplementar persistência/engine/license/export no front.

## 13. Status atual (2026-06-27)

- **Fase 0 validada** (motor separa gente real). **Persistência rearquitetada** (projeto=pasta) + **bug do export resolvido e validado pelo dono** (72 fotos em 16 pastas). `node --check` ✅.
- **Pronto p/ a outra IA commitar+deployar** (1º commit; `git add -A` seguro — gitignore confere).
- **Pendências:** decisão local-only vs GitHub · heartbeat de licença real no backend FsSaaS · perf (Fase 1) · UI "Adicionar leva" incremental.
