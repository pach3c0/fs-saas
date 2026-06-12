# Perfil — Identidade Visual + Marca D'água em Camadas (CliqueZoom Admin)

> Documentação gerada em 2026-06-11/12 (programa de testes — módulo 9 de 12).
> Referência frontend: `admin/js/tabs/perfil.js` (~800 linhas)
> Referências backend: `src/routes/organization.js` (`GET/PUT /api/organization/profile`,
> `GET /api/organization/public`), `src/routes/upload.js` (`POST /api/admin/upload`)
> Consumo da marca: `cliente/js/gallery.js` (`getWatermarkOverlay` → `renderWatermarkLayers`),
> `src/routes/sessions.js` (login do cliente embute `organization.watermark` com `watermarkLayers`)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES_STATIC` (id: `perfil`) — validado por screenshot (light+dark) em 2026-06-12.
> **Testes E2E:** `tests/local/17_perfil.spec.js` — 15 testes, 15/15 verdes em 2026-06-11.

---

## 1. Visão Geral

Três seções: **Dados do Negócio** (nome*, e-mail, WhatsApp, website — só gravam no botão
"Salvar Perfil"), **Logotipo** (upload imediato, mas só persiste no Salvar Perfil) e o
**editor de Marca D'água em camadas** — canvas 4:3 com camadas de texto/imagem arrastáveis e
redimensionáveis, painel lateral de edição, lista de camadas e toolbar. O editor **autosava**
(debounce 800ms → `PUT {watermarkLayers}` → toast "Marca d'água salva!").

## 2. Endpoints
| Rota | Comportamento |
|---|---|
| `GET /api/organization/profile` | Autenticada. `data` com name/slug/logo/contatos/watermark*/`watermarkLayers[]`/plan/integrations |
| `PUT /api/organization/profile` | Autenticada. **Whitelist** de campos (name, logo, contatos, watermark*, watermarkLayers) — `slug`/`plan` são ignorados. `name:''` → **400** (ValidationError tratado como erro de cliente — fix deste módulo). Merge: só seta o que veio no body |
| `GET /api/organization/public` | Sem token, exige tenant — usado pela galeria (retrocompat; o login do cliente já embute o watermark) |
| `POST /api/admin/upload` | Autenticada. FormData campo `image` → `{success, url}` em `/uploads/<orgId>/` |

## 3. Editor de camadas (modelo de dados)
- Camada: `{id, type:'text'|'image', x,y,w,h (%), opacity (0–1), rotation}` + texto
  (`text, fontSize, fontFamily, fontWeight, fontStyle, color, letterSpacing, shadow`) ou imagem
  (`url, filter:'none'|'grayscale'|'invert'|'white'`).
- Template padrão (`getDefaultLayers`): texto "Cópia não autorizada" rotacionado + nome do
  negócio em itálico (+ logo como camada de imagem se houver). Renderizado quando
  `watermarkLayers` salvo está vazio — **só persiste após a 1ª edição**.
- Toolbar: + Texto, + Imagem (upload), ⧉ duplicar, ↑/↓ ordem (z-order = posição no array),
  🗑 deletar, ↺ Padrão (showConfirm). Sem seleção, 🗑/⧉ mostram toast "Selecione uma camada".
- Canvas: drag move (clamp 0–100%), handles nos 4 cantos redimensionam (mín 5%×3%),
  clique no fundo desseleciona. 3 fundos de teste (escuro/claro/colorido) — só visual.

## 4. Fluxo da marca no cliente
```
Login do cliente (sessions.js) → organization.watermark { …antigos, watermarkLayers }
gallery.js getWatermarkOverlay():
  ├── session.watermark === false → sem marca (toggle por sessão)
  ├── delivered OU galleryDeliveryMode='direct' → sem marca (entrega limpa)
  ├── watermarkLayers.length > 0 → SISTEMA NOVO (overlay absoluto por camada)
  └── senão → sistema antigo (watermarkText/Type/…; text vazio cai no nome da org)
```

## 5. Bugs encontrados e corrigidos (2026-06-11)
1. **Copy "estúdio"** em 4 pontos (`Dados do Estúdio`, `Nome do Estúdio`, toast obrigatório,
   placeholder `'Seu Estúdio'`) → "negócio" (feedback registrado do usuário).
2. **Tema light: 3 botões ilegíveis** — "Enviar Logo", "Trocar Imagem" e "+ Imagem" usavam
   `background:var(--bg-hover)` (cinza claro no light) com `color:white` → `var(--text-primary)` + borda.
3. **Hexcodes** `#f85149`/`#f87171` → `var(--red)`.
4. **PUT name vazio devolvia 500** → 400 (ValidationError/CastError tratados em `organization.js`).
5. **Lista de camadas não sincronizava** o label ao editar o texto no painel (`update` não
   chamava `renderLayerList`).
6. **Helper crítico (`tests/local/helpers.js`):** `limparMarcaDagua` enviava `watermarkType:''`
   (enum `['text','logo','both']` rejeita) — falhava **silencioso desde sempre** e a marca de
   teste nunca era limpa (lixo "CliqueZoom PROVA" acumulado no org dev; limpo manualmente).

**Decisão de design documentada:** os hexcodes do canvas (gradientes de fundo, `#6366f1` da
seleção/handles) são intencionais — o canvas simula uma FOTO e não segue o tema do admin.

## 6. Caveats de teste
- Org `teste` é compartilhada — todo teste restaura o que tocou (snapshot via GET no início).
- O canvas fica **abaixo da dobra** — `scrollIntoViewIfNeeded` antes de drag com `page.mouse`.
- "Salvar Perfil" envia também `watermarkLayers` (estado atual do editor) — restaurar com
  `limparMarcaDagua` após testes que salvam o perfil.
- Autosave: esperar o `PUT /api/organization/profile` (helper `esperarAutosave` no spec).

---

## 7. Roteiro de Vídeo: Sua Marca em Cada Foto

**Duração estimada:** 75 a 90 segundos
**Objetivo:** Mostrar que a identidade e a proteção das fotos se configuram uma vez — e trabalham sozinhas.

### Cena 1: Abertura (0s - 10s)
- **Visual:** Painel admin; clique em "Perfil" no menu (grupo Conta).
- **Áudio (Locução):** "Antes de enviar a primeira galeria, deixe o CliqueZoom com a cara do seu negócio. É tudo numa tela só."
- **Ação em Tela:** A aba abre nas três seções.

### Cena 2: Dados e Logo (10s - 30s)
- **Visual:** Preenche nome, WhatsApp e site; clica em Enviar Logo; preview do logo aparece; clique em "Salvar Perfil" com toast verde.
- **Áudio (Locução):** "Nome, WhatsApp e site — são esses dados que o seu cliente vê nos e-mails e no seu site. Suba o logotipo e salve. Pronto, identidade no ar."
- **Ação em Tela:** Toast "Perfil salvo!".

### Cena 3: Marca D'água em Camadas (30s - 55s)
- **Visual:** Zoom no editor; arrasta a camada "Cópia não autorizada" pelo canvas; redimensiona pelo canto; muda a opacidade no painel; toast de autosave aparece.
- **Áudio (Locução):** "E a proteção? O editor de marca d'água funciona como camadas: arraste, redimensione, gire. Texto, seu logo, o que quiser — e cada ajuste salva sozinho."
- **Ação em Tela:** Toast "Marca d'água salva!". Troca o fundo do canvas (escuro → claro) para conferir a visibilidade.

### Cena 4: O Cliente Vê — e Depois Não Vê (55s - 75s)
- **Visual:** Corte para a galeria do cliente: fotos da prévia com a marca sobre cada uma. Depois, tela de entrega: fotos limpas.
- **Áudio (Locução):** "Enquanto o cliente escolhe, todas as fotos ficam protegidas com a sua marca. Na entrega, elas saem limpas, em alta resolução — automaticamente."
- **Ação em Tela:** Comparação prévia com marca × entrega limpa.

### Cena 5: Encerramento (75s - 85s)
- **Visual:** Volta ao editor; clique rápido no ↺ Padrão mostrando o template pronto.
- **Áudio (Locução):** "Sem tempo? O template padrão já vem pronto — é só ajustar a opacidade e seguir fotografando."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
