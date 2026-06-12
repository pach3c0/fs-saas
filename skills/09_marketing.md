# Marketing — Visão Geral + Vendas Automáticas (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 8 de 12).
> Referência frontend: `admin/js/tabs/marketing.js` (~350 linhas) + `admin/js/tabs/crm.js`
> (~180 linhas — view "Vendas Automáticas", reusada via `renderCrm(content)`)
> Referências backend: `src/routes/siteData.js` (`GET /api/marketing/overview`),
> `src/routes/sales.js` (`GET /api/sales/dashboard`, `POST /api/sales/coupons/:code/redeem`,
> `POST /api/sales/trigger-reactivation`)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `marketing`) — validado por screenshot (light+dark) em 2026-06-11.
> **Testes E2E:** `tests/local/16_marketing.spec.js` — 12 testes, 12/12 verdes em 2026-06-11.

---

## 1. Visão Geral

A aba Marketing é **somente leitura + gestão de cupons** — não tem formulário de configuração
(o robô se configura em *Configurações › Escassês & Vendas*). Um toggle interno alterna 2 views:

1. **Visão Geral** (default) — KPIs 30d com delta vs mês anterior, funil de sessões (5 etapas),
   status atual, breakdown por modo e por tipo de evento, resumo das vendas automáticas e
   estado do Google Analytics (com atalho para Integrações ou para o painel do GA).
2. **Vendas Automáticas** — antigo "CRM" (`crm.js`): pills de status do robô (lembrete de
   seleção + escassês pós-entrega), botão **Configurar** (→ aba Configurações), 6 KPIs do robô
   e a lista de cupons emitidos com **Marcar como usado / Desmarcar** (sem checkout na
   plataforma — a venda fecha no WhatsApp/Pix e o fotógrafo marca manualmente).

---

## 2. Ferramentas e Componentes

### 2.1 Endpoints
| Rota | Comportamento |
|---|---|
| `GET /api/marketing/overview` | Autenticada. Calcula tudo on-the-fly das sessões ativas (`isActive:true`): KPIs 30d/60d com `sessionsDelta`/`clientsDelta` (null quando período anterior = 0), `funnel{totalSessions,codeSent,accessed,submitted,delivered,expired}`, `statusCount` (5 status), `byEventType[]` (ordenado desc), `byMode{}`, `crm{totalTriggers,redeemedCoupons}`, `rates{accessRate,submitRate,deliveryRate}` (null quando denominador = 0), `ga{configured,measurementId}` |
| `GET /api/sales/dashboard` | Autenticada. `integrations` da org + `kpis{sessoesMonitoradas,fotosPendentes,receitaPotencial,triggersDisparados,cuponsEmitidos,cuponsConvertidos}` + `cupons[]` (desc por data). Monitoradas = selection/multi_selection com `selectionDeadline` futuro. `fotosPendentes` = Σ(fotos − selecionadas); `receitaPotencial` = pendentes × `extraPhotoPrice` |
| `POST /api/sales/coupons/:code/redeem` | Autenticada. Body `{redeemed: bool}` (default true). Seta/limpa `redeemedAt` no trigger da sessão. Cupom inexistente → 404 |
| `POST /api/sales/trigger-reactivation` | Autenticada. Disparo manual do `anniversaryAutomator` (usado pela antiga aba Clientes — sem UI no Marketing) |

### 2.2 Semântica do funil
- `submitted` no funil **inclui** `delivered` (funil acumulativo); no `statusCount` são excludentes.
- "Convertido" no cupom = `redeemedAt` manual **OU** `extraRequest.paid` da sessão.
- Cupons nascem do `postDeliveryAutomator` (escassês pós-entrega) — não há endpoint que crie
  trigger; em teste, semear direto no Mongo (`salesAutomation.sentTriggers`).

### 2.3 Frontend
- `marketing.js`: 1 fetch do overview na entrada; o toggle re-renderiza a Visão Geral do cache e
  a view Vendas faz fetch próprio (`renderCrm` → `/api/sales/dashboard`) a cada abertura.
- Falha no overview → mensagem "Erro ao carregar dados." (sem quebrar a aba).
- `crm.js` usa os tokens-alias (`--text-primary`, `--border`...) que o `index.html` mapeia para
  `--ad-*` — válidos nos 2 temas.

---

## 3. Fluxo de Dados

```
Aba Marketing → GET /api/marketing/overview (1×, cacheado na aba)
  └── Sessions + Clients (Mongo) → funil/KPIs/breakdowns calculados na hora

Toggle "Vendas Automáticas" → renderCrm → GET /api/sales/dashboard (a cada abertura)
  ├── pills ← org.integrations.{deadlineAutomation, salesAutomator.postDelivery}.enabled
  ├── KPIs  ← sessões selection/multi com prazo futuro
  └── cupons ← salesAutomation.sentTriggers (couponCode != '')
        └── "Marcar como usado" → POST /coupons/:code/redeem → redeemedAt → re-render
```

---

## 4. Padrões e Cuidados

- **Aba 100% derivada** — nenhum dado próprio; deletar sessões muda os números retroativamente.
- `rates` e deltas usam null (não 0) quando não há denominador — o front exibe "—".
- O resumo "Vendas automáticas" da Visão Geral usa o overview (cacheado); os KPIs da view
  Vendas usam o dashboard (fresh) — podem divergir por instantes após uma ação.
- ⚠️ **Pós-Rhyno:** "Clientes (30d)" conta a collection `Client` do Mongo, mas clientes novos
  agora nascem no **Rhyno** — esse KPI tende a congelar até a integração definir a fonte
  (registrado como pendência, não é bug deste módulo).

## 5. Bugs encontrados (2026-06-11)

**Nenhum bug de app.** 3 correções foram no próprio teste (anchor `^` em regex não casa com
`textContent` cru; strict-mode em `getByText('Integrações')`; `.last()` resolvia o div interno
da linha do cupom — filtrar por `has: button[data-coupon-action]`).

**Ambiente (não é bug de app):** o tenant `teste` do **Rhyno** bateu o limite de 200 clientes do
plano free (cada `criarSessao` da suíte cadastra 1 cliente no Rhyno). Fix de ambiente:
`tenant.plan` e `subscription.plan_code` → `'pro'` (ilimitado) no Postgres local
(`docker exec rhyno-pg psql -U erp_user -d erp_db`). Em produção isso será resolvido pelo
provisionamento (handoff Rhyno §7.2).

---

## 6. Roteiro de Vídeo: Lendo os Números do seu Negócio

**Duração estimada:** 75 a 90 segundos
**Objetivo:** Mostrar que a aba Marketing já mede tudo sozinha — e que o robô de vendas trabalha enquanto o fotógrafo edita.

### Cena 1: Abertura (0s - 10s)
- **Visual:** Painel admin; o mouse clica em "Marketing" no menu lateral (grupo Site).
- **Áudio (Locução):** "Quantas sessões você fechou esse mês? Quantos clientes abriram a galeria e não escolheram as fotos? O CliqueZoom já sabe."
- **Ação em Tela:** A Visão Geral abre com os 4 KPIs no topo.

### Cena 2: KPIs e Funil (10s - 35s)
- **Visual:** Zoom nos cards (delta verde "+33% vs mês anterior"); desce para o Funil de Sessões.
- **Áudio (Locução):** "Os números vêm das suas sessões reais — sem configurar nada. E o funil mostra onde o cliente trava: recebeu o código, acessou, escolheu, recebeu as fotos. Cada degrau que cai é alguém para você dar um toque."
- **Ação em Tela:** As barras do funil preenchem em cascata; destaque na queda entre "Cliente acessou" e "Seleção enviada".

### Cena 3: Toggle Vendas Automáticas (35s - 55s)
- **Visual:** Clique no botão "Vendas Automáticas" no topo; a view do robô aparece.
- **Áudio (Locução):** "Agora o melhor: o robô de vendas. Ele lembra o cliente do prazo de seleção e, depois da entrega, oferece com desconto as fotos que sobraram. Aqui você vê quantas fotos estão paradas — e quanto elas valem."
- **Ação em Tela:** Destaque nas pills Ativado/Desativado e no KPI "Receita potencial".

### Cena 4: Cupom Convertido (55s - 75s)
- **Visual:** Lista de cupons; um cupom "Em aberto"; clique em "Marcar como usado"; badge vira "Convertido" com toast verde.
- **Áudio (Locução):** "Quando o robô envia um cupom e o cliente fecha com você no WhatsApp, é só marcar como usado. Assim você sabe exatamente quanto o robô está vendendo por você."
- **Ação em Tela:** Toast "Cupom marcado como usado!".

### Cena 5: Encerramento (75s - 85s)
- **Visual:** Volta à Visão Geral; relance do card do Google Analytics conectado.
- **Áudio (Locução):** "E se quiser medir também as visitas do site, conecte o Google Analytics na aba Integrações. Marketing sem achismo — direto do seu painel."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
