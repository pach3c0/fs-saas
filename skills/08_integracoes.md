# Integrações — Google Analytics 4 + Meta Pixel (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 7 de 12).
> Referência frontend: `admin/js/tabs/integracoes.js` (~90 linhas, arquivo único)
> Referências backend: `src/routes/organization.js` (`GET/PUT /api/organization/integrations`),
> `src/routes/site.js` (`GET /api/site/config` público — payload sanitizado),
> `site/templates/shared-site.js` (`injectAnalyticsScripts`)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `integracoes`) — validado por screenshot em 2026-06-11.
> **Testes E2E:** `tests/local/15_integracoes.spec.js` — 11 testes, 11/11 verdes em 2026-06-11.

---

## 1. Visão Geral

A aba Integrações liga o site público às ferramentas de medição: **Google Analytics 4** e
**Meta Pixel (Facebook/Instagram)**. O fotógrafo cola os IDs, salva, e o site público injeta as
tags automaticamente — sem mexer em código.

A tela é enxuta: 2 cards (GA4 e Meta Pixel), cada um com checkbox **Ativar** + campo de ID,
1 aviso de que o **lembrete de prazo de seleção** migrou para *Configurações › Escassês & Vendas*
(link `window.switchTab('configuracoes')`), e o botão **Salvar Configurações**.
A UI antiga de Zapier/Make/webhook saiu da tela (campos seguem no schema, sem UI).

---

## 2. Ferramentas e Componentes

### 2.1 Endpoints
| Rota | Comportamento |
|---|---|
| `GET /api/organization/integrations` | Autenticada. `{success, integrations}` completo (uso interno do admin) |
| `PUT /api/organization/integrations` | Autenticada. Aceita `googleAnalytics{enabled,measurementId}`, `metaPixel{enabled,pixelId}`, `deadlineAutomation`, `salesAutomator`. Validação **campo a campo por tipo** (ignora tipo errado); IDs com `.trim()`; nada válido no body → 400 "Nenhuma configuracao valida enviada". Update via `$set` granular — **PUT parcial não apaga o resto** |
| `GET /api/site/config` (público) | Entrega `integrations` **sanitizado**: só `googleAnalytics{enabled,measurementId}`, `metaPixel{enabled,pixelId}`, `whatsapp`, `seo`. Ver bug §5.1 |

### 2.2 Injeção no site público (`shared-site.js`)
- `injectAnalyticsScripts(data.integrations)` roda no load do site (linha ~1214).
- GA4: só injeta com `enabled && measurementId` → `<script async src="googletagmanager.com/gtag/js?id=...">`
  + inline `gtag("config", ...)`.
- Pixel: só injeta com `enabled && pixelId` → snippet `fbq("init", ...)` + `fbq("track","PageView")`
  + `<noscript>` de fallback. ⚠️ O `<noscript>` criado via JS guarda o conteúdo como **texto**
  (nunca vira `<img>` com JS ativo) — é inofensivo, mas em teste valide pelo conteúdo, não por seletor.

### 2.3 Frontend (`integracoes.js`)
- `renderIntegracoes(container)` → `GET /api/organization/profile` → `renderForm` (lê `org.integrations`).
- IDs dos controles: `#gaEnabled`, `#gaId`, `#pixelEnabled`, `#pixelId`, `#saveBtn`.
- Salvar: botão vira "Salvando..." + disabled → `PUT` → `showToast` sucesso/erro → reabilita.

---

## 3. Fluxo de Dados

```
Admin (aba Integrações) → PUT /api/organization/integrations
  └── Organization.integrations.{googleAnalytics, metaPixel} ($set granular, trim nos IDs)

Visitante abre o site público → GET /api/site/config (sanitizado)
  └── shared-site.js injectAnalyticsScripts()
        ├── GA enabled+ID  → tag gtag no <head> (visita medida no GA4)
        ├── Pixel enabled+ID → snippet fbq (PageView) + noscript
        └── desabilitado/sem ID → nada é injetado
```

---

## 4. Padrões e Cuidados

- A tag só entra no site com **Ativar marcado E ID preenchido** — as duas condições.
- PUT é merge: salvar só o Pixel não toca no GA (e vice-versa).
- Aba lê de `/api/organization/profile` (não do endpoint `GET .../integrations`) — os dois
  retornam o mesmo objeto `integrations`.
- Dialogs `showToast` ✓ · estilos inline com tokens ✓ · sem `alert/confirm` ✓.

## 5. Bugs encontrados e corrigidos (2026-06-11)

1. **SEGURANÇA — `/api/site/config` (rota pública) vazava o objeto `integrations` inteiro** —
   qualquer visitante do site via `metaPixel.accessToken` (credencial da Conversions API),
   `deadlineAutomation.messageTemplate` e todo o `salesAutomator` (prefixo de cupom, percentuais
   de desconto, agenda de disparos — inteligência comercial do fotógrafo). **Fix:** o handler em
   `src/routes/site.js` agora monta um objeto com **whitelist** do que o site realmente usa:
   `googleAnalytics{enabled,measurementId}`, `metaPixel{enabled,pixelId}` (sem accessToken),
   `whatsapp` e `seo`. Coberto por teste (asserta a ausência de cada campo interno).

---

## 6. Roteiro de Vídeo: Medindo as Visitas do seu Site

**Duração estimada:** 60 a 75 segundos
**Objetivo:** Mostrar ao fotógrafo que ligar o Google Analytics e o Pixel do Facebook é colar dois códigos — sem tocar em programação.

### Cena 1: Abertura (0s - 10s)
- **Visual:** Painel admin aberto; o mouse clica em "Integrações" no menu lateral (grupo Site).
- **Áudio (Locução):** "Quer saber quantas pessoas visitam o seu site, de onde elas vêm — e ainda turbinar seus anúncios? Isso se resolve em uma tela."
- **Ação em Tela:** A aba abre mostrando os dois cards: Google Analytics 4 e Meta Pixel.

### Cena 2: Google Analytics 4 (10s - 30s)
- **Visual:** Zoom no card do GA4; marca o "Ativar"; cola um ID `G-ABC123456` no campo.
- **Áudio (Locução):** "No Google Analytics, copie o seu Measurement ID — ele começa com G traço. Aqui, é só marcar Ativar e colar. O CliqueZoom instala a tag no seu site sozinho."
- **Ação em Tela:** Campo preenchido, checkbox marcado.

### Cena 3: Meta Pixel (30s - 45s)
- **Visual:** Zoom no card do Meta Pixel; marca "Ativar"; cola o número do Pixel.
- **Áudio (Locução):** "Anuncia no Instagram ou no Facebook? Cole também o seu Pixel. Com ele, a Meta mede as conversões e cria públicos com quem já visitou o seu site."
- **Ação em Tela:** Campo preenchido; clique em "Salvar Configurações"; toast verde "Integrações salvas com sucesso!".

### Cena 4: Funcionando (45s - 60s)
- **Visual:** Corte para o site público abrindo; depois um relance do painel do Google Analytics em tempo real registrando 1 visitante.
- **Áudio (Locução):** "Pronto. A partir de agora, cada visita ao seu site já é medida — em tempo real. E se quiser desligar, é só desmarcar e salvar."
- **Ação em Tela:** Gráfico de tempo real do GA com atividade.

### Cena 5: Encerramento (60s - 70s)
- **Visual:** Visão geral da aba salva; destaque rápido no aviso do lembrete de prazo.
- **Áudio (Locução):** "Ah — e o lembrete de prazo para o cliente escolher as fotos mudou de casa: agora ele mora em Configurações, Escassês e Vendas."
- **Ação em Tela:** Fade out suave para o logo da CliqueZoom Academy.
