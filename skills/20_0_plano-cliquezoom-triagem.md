# Skill 20.0 — Plano de Execução: CliqueZoom Triagem (separação facial)

> **Status:** planejamento travado em 2026-06-21 (sessão longa de design). Nome do produto fechado em 2026-06-21: **CliqueZoom Triagem** (antes codinome "Studio" — descartado por conflitar com a regra de copy "nunca usar 'estúdio' pro fotógrafo"). **Nada implementado.** Próximo passo concreto = Fase 0 (PoC do motor).
> **Memória relacionada:** `project_cliquezoom_triagem`. **Origem da visão:** `skills/5_0_visao-tether-desktop.md`, `skills/5_1_visao-face-search.md` (re-fundados do zero — não reaproveitar "Seleta").
> **Para quem retoma:** leia este doc inteiro antes de codar. As decisões abaixo foram aprovadas pelo dono pelo tom da conversa; não re-litigar sem motivo novo.

---

## 1. O QUE É (e o que NÃO é)

**CliqueZoom Triagem** = ferramenta de **separação facial de fotos por pessoa** para eventos grandes (formatura, rodeio, show com 400-500+ pessoas).

**Fluxo em uma frase:** fotógrafo joga 5000 fotos → o app agrupa por rosto → exporta pastas nomeadas por pessoa, cada uma com as fotos onde ela aparece.

| ✅ É | ❌ NÃO é (por ora) |
|---|---|
| Separação/organização por pessoa | Curadoria de qualidade (olho fechado, rajada, repetida) |
| Ferramenta **local** do fotógrafo | Entrega ao cliente final |
| PWA que roda no Chrome | App nativo / instalador |
| Processamento 100% na máquina dele | Upload de fotos pra nuvem |

> **Propósito real:** em vez do cliente garimpar 5000 fotos soltas numa sessão, o fotógrafo entrega já pré-organizado por pessoa. As pastas **futuramente** alimentam o `multi_selection` do SaaS — mas isso é fase 2+, **fora do v1.**

> **Sobre o nome (importante):** "Triagem" foi escolhido de propósito como **guarda-chuva**, não como descrição travada de "separar por rosto". Hoje a única triagem é **por pessoa (facial)**. O dono sinalizou que pode querer adicionar outros eixos de triagem no futuro — ver §5.1. O v1 segue **só facial**; qualquer eixo novo é decisão futura, a descobrir com ele.

---

## 2. ROADMAP DE FASES (produto)

1. **AGORA — Triagem v1:** separação local → exporta pastas no disco. Sem nuvem, sem sessão, sem upload.
2. **DEPOIS — alimenta a sessão:** o mesmo manifesto (`pessoa → fotos`) sobe pro `multi_selection`; na seleção, as fotos do formando aparecem **primeiro**, e ele ainda navega o resto.
3. **FUTURO — "Multi Real Time":** mega-evento (Rock in Rio/The Town); pessoa escaneia/cadastra, recebe WhatsApp quando pronto, faz scan do rosto e vê suas fotos. **Aqui mora o peso de LGPD/biometria-em-nuvem.** Completamente separado — não influencia o v1.

> **Sacada que liga as fases:** o **manifesto** (`{foto → [pessoas]}`) é a ponte. v1 escreve em pastas no disco; v2 sobe pra sessão; v3 serve no scan. Mesmo artefato, três saídas. Por isso o manifesto deve nascer estruturado e portável desde a Fase 0.

---

## 3. ARQUITETURA TÉCNICA (travada)

### 3.1 Distribuição — PWA, não instalador
- App é uma **URL** (ex.: `https://triagem.cliquezoom.com.br` ou rota no painel), servida do servidor CliqueZoom atrás de login.
- **Roda só no Chrome/Edge** (Chromium) — requisito comunicável de ferramenta Pro. Sem problema, decidido.
- **O navegador é o runtime → um código só roda em Mac, Windows, Linux.** Zero build por SO.
- Botão no painel = **"Instalar o Triagem"** → dispara o prompt de PWA (ícone no dock, janela própria). Também funciona como aba favoritada.
- **Mata:** conta Apple Developer, certificado Windows, code-signing, installers separados, auto-update.
- **Offline:** Service Worker cacheia a casca + os modelos de IA (~100 MB) na 1ª abertura online. Depois roda offline dentro da janela de licença.
- **Atualização:** redeploy no servidor → todos pegam na próxima abertura.
- File System Access API (Chromium) lê a pasta de fotos do disco e escreve as pastas de exportação.

### 3.2 Motor de IA — client-side
- **ONNX Runtime Web** no navegador, acelerado por **WebGPU** (Apple Silicon / NVIDIA / Intel; CPU/WASM como piso).
- Modelos **InsightFace**: **SCRFD** (detecção) + **ArcFace** (embedding 512-float por rosto).
- **Clustering não-supervisionado:** HDBSCAN ou Chinese Whispers sobre **grafo kNN** (hnswlib). **NUNCA matriz NxN densa** (5000 fotos × N rostos explode).
- **Referência (imagem de pessoa) é OPCIONAL** — só melhora/semeia o clustering. Não é pré-requisito. Recurso Pro futuro.
- **QR / auto-inscrição não tem relação com a Triagem** — são features separadas do SaaS.

### 3.3 Fluxo do fotógrafo (v1)
1. **Importar** — aponta a pasta (cartão = pasta). JPEG-first; RAW logo em seguida.
2. **Separar** — detecta + agrupa → "Pessoa 1, 2, 3…" (numerado, anônimo).
3. **Revisar** — renomear pasta (etiqueta a pessoa); descartar pasta que não interessa (apresentador, ajudante); **juntar/separar** quando o clustering errar (fragmentou uma pessoa em 2 / juntou 2 pessoas).
4. **Exportar** — escolhe **destino** + **esquema de nome de arquivo** (original / pessoa / pessoa+original / original+pessoa / pessoa+nº) → cria as pastas com as fotos dentro.

### 3.4 Manifesto interno (anti-duplicação)
- Foto com João + Maria = **referência lógica** nas duas pastas; **não copia em disco antes da exportação** (senão 5000 × N estoura o HD).
- App guarda `{foto → [pessoaIds], embeddings, bbox, confiança}`. As "pastas" são visões filtradas.
- Só na **exportação** materializa: copia fisicamente a foto pra cada pasta (cópia, **não** hardlink — frágil entre drives/Windows).

### 3.5 Licenciamento / controle de acesso
- **Login pelo mesmo e-mail da plataforma** = o vínculo ao usuário. **Sem serial** (descartado: evita complexidade e a dor que o serial trazia).
- **Gated por plano:** feature flag `triagemPro` na Organization/Subscription. A opção aparece no painel mas só funciona se o plano incluir. *Quais planos* → decidir depois; trava técnica pronta agora.
- **Heartbeat diário** = ÚNICO tráfego de rede. App pergunta ao servidor "assinatura ativa?" (sem foto, sem conteúdo) → servidor devolve **token JWT assinado** com `expira_em = agora + 7 dias`.
- **Trava offline de 7 dias:** sem revalidar nesse prazo → **trava total** até nova prova de vida online. Prazo configurável no servidor.
- **Anti-rollback de relógio (substitui a "BIOS"):** navegador não lê relógio de hardware; em vez disso o app guarda a **maior hora já vista**; `hora_efetiva = max(relógio_PC, maior_já_vista)`. Atrasar o relógio não estende a janela; limpar storage força revalidação online.
- **Kill-switch:** parou de assinar → servidor para de renovar → app trava na máquina.
- **DRM "bom o suficiente"**, não inquebrável — threat model certo pra ferramenta de nicho.

---

## 4. PLANO DE EXECUÇÃO (por fases de build)

> Ordem de-risca o projeto: **provar o motor antes de construir casca/UX/licença.**

### Fase 0 — PoC do motor (o portão) ⏳ PRÓXIMO PASSO
- **Repo/pasta própria, separada do SaaS** (não misturar com `FsSaaS`).
- Página mínima no Chrome (sem UI bonita): abre uma pasta de fotos reais → roda SCRFD + ArcFace via ONNX Runtime Web → clusteriza → gera **manifesto JSON + folha de contato HTML** com os grupos.
- **Mede:** *pureza* (uma pessoa por cluster?) e *fragmentação* (quantos clusters por pessoa?) em fotos de evento real.
- **Valida de uma vez:** qualidade do clustering **E** se o navegador aguenta o volume (WebGPU).
- **Bloqueio atual:** falta o dono fornecer um **lote real de formatura** (gente repetindo em fotos diferentes).
- **Critério de sucesso:** recall razoável e poucos intrusos em luz/ângulo de evento; tempo de processamento tolerável pra ~milhares de fotos.

### Fase 1 — Motor robusto
- Auto-detect de execution provider (WebGPU → WASM fallback).
- Processamento em lotes + downscale na detecção + liberação de memória (5000 fotos numa aba).
- kNN (hnswlib) + clustering afinado. RAW (LibRaw/dcraw-wasm ou preview embutido).

### Fase 2 — Casca PWA + UX de revisão
- Manifest + Service Worker (cache de app + modelos, offline).
- Telas: Importar → Progresso → Revisão (renomear/descartar/juntar/separar) → Exportar (destino + esquema de nome).
- File System Access API para ler/escrever no disco.

### Fase 3 — Licenciamento + integração com o SaaS
- Backend CliqueZoom: feature flag `triagemPro`, endpoint de heartbeat, emissão de token JWT assinado.
- App: tela de login (e-mail da plataforma), verificação de token, trava offline + anti-rollback.
- Painel do fotógrafo: botão "Instalar o Triagem" (gated por plano).

### Fase 4 — Distribuição + polish
- Deploy do PWA no servidor (rota/subdomínio).
- Comunicar requisitos (Chrome, máquina recomendada).
- Onboarding visual.

---

## 5. DECISÕES TRAVADAS vs EM ABERTO

**Travadas (não re-litigar):** nome **CliqueZoom Triagem** · PWA no Chrome (não nativo) · processamento client-side · sem serial (login + plano) · heartbeat diário + trava offline 7d + anti-rollback · sem upload de fotos no v1 · referência opcional · cópia (não hardlink) na exportação · separação ≠ curadoria de qualidade (no v1) · repo próprio.

**Em aberto (decidir ao chegar):** HDBSCAN vs Chinese Whispers (medir na Fase 0) · suporte RAW (qual lib) · quais planos incluem o `triagemPro` · trava de 1 dispositivo por vez (opcional, adicionar depois se quiser) · URL final (subdomínio vs rota) · **eixos futuros de "triagem" (§5.1)**.

### 5.1 "Triagem" pode crescer (parking lot — descobrir com o dono)
O nome foi escolhido como guarda-chuva. Hoje o único eixo é **por pessoa (facial)**. O dono quer explorar adicionar mais "triagem" no futuro — **ainda a descobrir, NÃO é v1.** Candidatos plausíveis a investigar (sem compromisso):
- **Por qualidade:** marcar/agrupar foto desfocada, olho fechado, rajada quase-idêntica, duplicada.
- **Por enquadramento:** retrato vs grupo vs ambiente.
- **Por momento/cena:** agrupar por bloco de tempo (entrada, palco, confraternização).
- **Por evento/dia:** quando o cartão mistura coberturas.

> Decisão atual: **manter v1 só facial.** Esses eixos entram só depois que a separação por pessoa estiver validada e o dono escolher qual dor atacar em seguida. Não construir nada disso preventivamente. O motivo de já registrar: o nome aguenta crescer, então o manifesto e a UI de revisão devem ser pensados pra não travar essa porta (ex.: tag por foto além de pessoaId).

---

## 6. ANTI-ESCOPO

- **Não** virar editor (Lightroom faz isso).
- **Não** fazer culling de qualidade no v1.
- **Não** subir foto/biometria pra nuvem no v1.
- **Não** depender de QR/cadastro — separação é puramente por rosto.
- **Não** construir casca/licença antes de provar o motor (Fase 0).
- **Não** implementar os eixos extras de triagem (§5.1) antes do facial estar validado.

---

## 7. COMO RETOMAR

1. Ler `project_cliquezoom_triagem` (memória) + este doc.
2. Confirmar com o dono se há lote real de fotos disponível.
3. Criar repo/pasta própria e atacar a **Fase 0** (PoC do motor, métricas de pureza/fragmentação).
4. Só avançar pras fases seguintes se a Fase 0 mostrar qualidade aceitável.
