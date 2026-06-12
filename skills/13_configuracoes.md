# Configurações — Personalização do App (CliqueZoom Admin)

> Documentação gerada em 2026-06-12 (programa de testes — módulo 12 de 12 — ÚLTIMO).
> Referência frontend: `admin/js/tabs/configuracoes.js` (~655 linhas)
> Referências backend: `src/routes/organization.js` (`GET/PUT /api/organization/preferences` +
> `PUT /api/organization/integrations` para a seção de vendas)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES_STATIC` (id: `configuracoes`) — validado por screenshot (light+dark) em 2026-06-12.
> **Testes E2E:** `tests/local/20_configuracoes.spec.js` — 10 testes, 10/10 verdes em 2026-06-12.

---

## 1. Visão Geral
Sub-nav com 5 seções, todas com **autosave debounced (600ms)** e status "Salvando… → ✓ Salvo":
1. **Mensagens** — 4 templates (shareEmail/shareWhatsApp/deliverEmail/deliverWhatsApp) com chips
   de variáveis, "Usar exemplo", "Restaurar padrão" (= vazio → app usa a mensagem otimizada por
   tipo de evento) e pré-visualização interpolada (Marina/casamento/AB12CD).
2. **Sessões** — `sessionDefaults`: packageLimit, extraPhotoPrice, photoResolution (enum
   960/1200/1400/1600), deadlineDays, toggles allowExtraPurchase/allowReopen/commentsEnabled.
   Pré-preenchem o modal de nova sessão (afetam os helpers E2E! ver caveat).
3. **Entrega** — `galleryDeliveryDefault`: ask | preview | direct (radios).
4. **Notificações** — selectionSubmitted / extraRequested / reopenRequested.
5. **Escassês & Vendas** — persiste em **/integrations** (endpoint diferente!):
   `deadlineAutomation{enabled,sendEmail,daysWarning,messageTemplate}` (lembrete pré-entrega,
   sem desconto) + `salesAutomator{couponPrefix, postDelivery{enabled,discountByDay,messageTemplate}}`
   (pós-entrega, desconto sobre a sobra). Painel explicativo dos 3 prazos.

## 2. Backend (preferences)
- PUT com **whitelist + validação por campo** e `$set` granular (merge — um campo não apaga o
  resto). Clamps: packageLimit 1–1000, extraPhotoPrice 0–10000, deadlineDays 0–365, templates
  `slice(0,2000)`; resolução fora do enum é ignorada; nada válido → **400**.
- Integrations (vendas): daysWarning 1–30, couponPrefix `slice(0,8)` (vazio → 'CZ'),
  couponDiscountPercent 0–100, `discountByDay` sanitizado (chaves numéricas >0, valores 0–100).
- Nota: `findByIdAndUpdate` aqui ainda usa `{new:true}` (deprecation warning, não-crítico).

## 3. Caveats de teste
- **"Mensagens"/"Sessões" colidem com o menu lateral** → escopar locators em `#tabContent`.
- O card "Sempre perguntar" cita "Entregar direto" na descrição → localizar o radio pela
  descrição única ("Pula a etapa Compartilhar").
- O wrap do `numberField` é o div mais interno com o label → `.filter({hasText}).last()`.
- `sessionDefaults` da org `teste` são consumidos pelo `criarSessao` dos helpers — restaurar
  SEMPRE (o `setConfigCheck` dos helpers já tolera o estado pré-preenchido).
- Falha no GET inicial → toast de erro e o layout monta com defaults vazios.

**Sem bugs de app neste módulo** (3 correções foram de teste — strict mode/locators).

---

## 4. Roteiro de Vídeo: O CliqueZoom do Seu Jeito

**Duração estimada:** 60 a 75 segundos
**Objetivo:** Mostrar que 5 minutos de configuração economizam horas no dia a dia.

### Cena 1: Abertura (0s - 8s)
- **Visual:** Painel admin; clique em "Configurações" (grupo Conta).
- **Áudio (Locução):** "Cinco minutos aqui economizam horas no seu mês. Vem ver."
- **Ação em Tela:** Sub-nav com as 5 seções.

### Cena 2: Mensagens (8s - 28s)
- **Visual:** Editando o template do WhatsApp; clique nos chips {nome} e {link}; a pré-visualização atualiza; "✓ Salvo" pisca.
- **Áudio (Locução):** "Escreva uma vez a sua mensagem de envio e de entrega — com o nome do cliente, o link, o código. A pré-visualização mostra como chega. E repare: salvou sozinho."
- **Ação em Tela:** Preview com "Olá Marina!...".

### Cena 3: Padrões de Sessão e Entrega (28s - 45s)
- **Visual:** Seção Sessões: pacote 30, extra R$ 25, resolução 1200px; corte para Entrega com os 3 radios.
- **Áudio (Locução):** "Defina o pacote, o preço da foto extra e a resolução padrão — toda sessão nova já nasce pronta. E escolha como suas galerias entregam: com prévia ou direto pro download."
- **Ação em Tela:** Radio "Compartilhar prévia" selecionado.

### Cena 4: Escassês & Vendas (45s - 65s)
- **Visual:** Seção de vendas: painel dos 3 prazos; liga o lembrete; descontos 10/15/25 nas etapas 15/7/1.
- **Áudio (Locução):** "E o robô de vendas: ele lembra o cliente do prazo de seleção e, depois da entrega, oferece as fotos que sobraram com desconto crescente — tudo automático, com o seu cupom."
- **Ação em Tela:** Toggle "Ativar escassês de vendas" ligado.

### Cena 5: Encerramento (65s - 72s)
- **Visual:** Visão geral da aba.
- **Áudio (Locução):** "Configure uma vez. O CliqueZoom trabalha do seu jeito para sempre."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
