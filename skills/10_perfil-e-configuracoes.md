# Perfil & Configurações (CliqueZoom Admin)

> Dois módulos da aba Conta: **Perfil** (identidade visual, logotipo, marca d'água em camadas) e **Configurações** (mensagens, padrões de sessão, entrega, notificações, escassez & vendas).
> Programa de testes: módulos 9 e 12 de 12 — validados em 2026-06-11/12.

---

# PARTE 1 — Perfil

> Referência frontend: `admin/js/tabs/perfil.js` (~800 linhas)
> Backend: `src/routes/organization.js` (`GET/PUT /api/organization/profile`, `GET /api/organization/public`), `src/routes/upload.js` (`POST /api/admin/upload`)
> Consumo da marca: `cliente/js/gallery.js` (`getWatermarkOverlay` → `renderWatermarkLayers`), `src/routes/sessions.js` (login embute `organization.watermark` com `watermarkLayers`)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES_STATIC` (id: `perfil`) — validado em 2026-06-12.
> **Testes E2E:** `tests/local/17_perfil.spec.js` — 15 testes, 15/15 verdes.

## 1. Visão Geral

Três seções: **Dados do Negócio** (nome*, e-mail, WhatsApp, website — gravam no botão "Salvar Perfil"), **Logotipo** (upload imediato, persiste no Salvar Perfil) e o **editor de Marca D'água em camadas** — canvas 4:3 com camadas arrastáveis/redimensionáveis, painel lateral, lista de camadas e toolbar. O editor **autosalva** (debounce 800ms → `PUT {watermarkLayers}` → toast).

> **Nota (2026-06-25):** a Marca D'água ganhou aba própria no cabeçalho do admin (commit `5610e55`). A lógica de `watermarkLayers` permanece no backend; o editor foi movido para `admin/js/tabs/marca-dagua.js`.

## 2. Endpoints

| Rota | Comportamento |
|---|---|
| `GET /api/organization/profile` | Autenticada. `data` com name/slug/logo/contatos/watermark*/`watermarkLayers[]`/plan/integrations |
| `PUT /api/organization/profile` | Autenticada. **Whitelist** de campos (name, logo, contatos, watermark*, watermarkLayers) — `slug`/`plan` ignorados. `name:''` → **400**. Merge: só seta o que veio no body |
| `GET /api/organization/public` | Sem token, exige tenant — usado pela galeria (retrocompat) |
| `POST /api/admin/upload` | Autenticada. FormData campo `image` → `{success, url}` em `/uploads/<orgId>/` |

## 3. Editor de Camadas (modelo de dados)

- Camada: `{id, type:'text'|'image', x,y,w,h (%), opacity (0–1), rotation}` + texto (`text, fontSize, fontFamily, fontWeight, fontStyle, color, letterSpacing, shadow`) ou imagem (`url, filter:'none'|'grayscale'|'invert'|'white'`).
- Template padrão (`getDefaultLayers`): texto "Cópia não autorizada" rotacionado + nome do negócio em itálico (+ logo se houver). Renderizado quando `watermarkLayers` salvo está vazio — **só persiste após a 1ª edição**.
- Toolbar: + Texto, + Imagem (upload), ⧉ duplicar, ↑/↓ ordem (z-order = posição no array), 🗑 deletar, ↺ Padrão (showConfirm).
- Canvas: drag move (clamp 0–100%), handles nos 4 cantos redimensionam (mín 5%×3%), clique no fundo desseleciona. 3 fundos de teste — só visual.

## 4. Fluxo da Marca no Cliente

```
Login do cliente (sessions.js) → organization.watermark { …antigos, watermarkLayers }
gallery.js getWatermarkOverlay():
  ├── session.watermark === false → sem marca (toggle por sessão)
  ├── delivered OU galleryDeliveryMode='direct' → sem marca (entrega limpa)
  ├── watermarkLayers.length > 0 → SISTEMA NOVO (overlay absoluto por camada)
  └── senão → sistema antigo (watermarkText/Type/…; text vazio cai no nome da org)
```

## 5. Bugs Corrigidos (2026-06-11)

1. Copy "estúdio" em 4 pontos → "negócio".
2. Tema light: 3 botões ilegíveis (bg cinza + color white) → `var(--text-primary)` + borda.
3. Hexcodes `#f85149`/`#f87171` → `var(--red)`.
4. `PUT name` vazio devolvia 500 → 400.
5. Lista de camadas não sincronizava o label ao editar no painel.
6. `limparMarcaDagua` no helper de testes enviava `watermarkType:''` (enum rejeita) → fix.

**Decisão de design:** hexcodes do canvas (gradientes de fundo, `#6366f1` dos handles) são intencionais — o canvas simula uma FOTO e não segue o tema do admin.

## 6. Roteiro de Vídeo: Sua Marca em Cada Foto

**Duração:** 75–90 s

- **Cena 1 (0–10s):** Clique em "Perfil" no menu. "Antes de enviar a primeira galeria, deixe o CliqueZoom com a cara do seu negócio."
- **Cena 2 (10–30s):** Preenche dados + logo → "Salvar Perfil" → toast verde.
- **Cena 3 (30–55s):** Editor de camadas: arrasta texto, redimensiona, muda opacidade → autosave. Troca fundo escuro/claro.
- **Cena 4 (55–75s):** Corte para galeria do cliente: fotos com marca. Corte para entrega: fotos limpas em alta-res. "Automaticamente."
- **Cena 5 (75–85s):** ↺ Padrão mostrando template pronto.

---

# PARTE 2 — Configurações

> Referência frontend: `admin/js/tabs/configuracoes.js` (~655 linhas)
> Backend: `src/routes/organization.js` (`GET/PUT /api/organization/preferences` + `PUT /api/organization/integrations` para vendas)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES_STATIC` (id: `configuracoes`) — validado em 2026-06-12.
> **Testes E2E:** `tests/local/20_configuracoes.spec.js` — 10 testes, 10/10 verdes.

## 1. Visão Geral

Sub-nav com 5 seções, **autosave debounced (600ms)** e status "Salvando… → ✓ Salvo":

1. **Mensagens** — 4 templates (shareEmail/shareWhatsApp/deliverEmail/deliverWhatsApp) com chips de variáveis, "Usar exemplo", "Restaurar padrão" (= vazio → app usa mensagem otimizada) e pré-visualização interpolada.
2. **Sessões** — `sessionDefaults`: packageLimit, extraPhotoPrice, photoResolution (enum 960/1200/1400/1600), deadlineDays, toggles allowExtraPurchase/allowReopen/commentsEnabled. Pré-preenchem o modal de nova sessão.
3. **Entrega** — `galleryDeliveryDefault`: ask | preview | direct (radios).
4. **Notificações** — selectionSubmitted / extraRequested / reopenRequested.
5. **Escassez & Vendas** — persiste em `/integrations` (endpoint diferente!): `deadlineAutomation{enabled,sendEmail,daysWarning,messageTemplate}` (lembrete pré-entrega) + `salesAutomator{couponPrefix, postDelivery{enabled,discountByDay,messageTemplate}}` (pós-entrega, desconto sobre a sobra).

## 2. Backend (preferences)

- PUT com **whitelist + validação por campo** e `$set` granular (merge). Clamps: packageLimit 1–1000, extraPhotoPrice 0–10000, deadlineDays 0–365, templates `slice(0,2000)`; resolução fora do enum é ignorada; nada válido → **400**.
- Integrations (vendas): daysWarning 1–30, couponPrefix `slice(0,8)` (vazio → 'CZ'), couponDiscountPercent 0–100, `discountByDay` sanitizado (chaves numéricas >0, valores 0–100).

## 3. Caveats de Teste

- **"Mensagens"/"Sessões" colidem com o menu lateral** → escopar locators em `#tabContent`.
- O card "Sempre perguntar" cita "Entregar direto" na descrição → localizar pelo radio de descrição única.
- `sessionDefaults` da org `teste` são consumidos pelo `criarSessao` dos helpers — **restaurar sempre**.
- Falha no GET inicial → toast de erro, layout com defaults vazios.
- Sem bugs de app neste módulo (3 correções foram de teste — strict mode/locators).

## 4. Roteiro de Vídeo: O CliqueZoom do Seu Jeito

**Duração:** 60–75 s

- **Cena 1 (0–8s):** Clique em "Configurações". "Cinco minutos aqui economizam horas no seu mês."
- **Cena 2 (8–28s):** Editando template WhatsApp com chips + preview → "✓ Salvo" pisca.
- **Cena 3 (28–45s):** Sessões: pacote 30, extra R$25, resolução 1200px. Entrega: radio "Compartilhar prévia".
- **Cena 4 (45–65s):** Escassez & Vendas: liga lembrete + descontos 10/15/25 nas etapas. "Tudo automático, com o seu cupom."
- **Cena 5 (65–72s):** Visão geral. "Configure uma vez. O CliqueZoom trabalha do seu jeito para sempre."
