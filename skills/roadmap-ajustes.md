# Roadmap de Ajustes — CliqueZoom

> Estruturação dos pontos soltos anotados em [`ajustes.md`](ajustes.md).
> Classificados por prioridade, risco e esforço. Nada nesta lista estava concluído na auditoria de **2026-06-25**.

## Como ler
- 🔒 Segurança · 💰 Receita · 🐛 Bug · ⚙️ Operação · 📈 Crescimento · 🧹 Dívida técnica · 🚀 Infra
- Status: `[ ]` a fazer · `[~]` em andamento · `[x]` feito

---

## 🔴 P0 — Perigoso / Bloqueante

### [x] 9. Travar e-mail/campos do perfil — 🔒 ✅ FEITO (2026-06-25)
**Correção de diagnóstico na auditoria:** existem DOIS e-mails. O de **login** (`User.email`, credencial + reset de senha) **já não era editável** na interface → risco de takeover não existia. O editável era o de **contato** (`org.email`) → risco real = perder contato (findability), não sequestro. Então o item era menos perigoso do que parecia.
- ✅ `org.email` travado (somente leitura) + botão **"Solicitar troca de e-mail"** → abre chamado no Fala Conosco (categoria `outro`) com e-mail atual + novo desejado; super admin confirma identidade e troca manualmente.
- ✅ Trava server-side: `email`/`website` removidos do `allowedFields` em [`organization.js`](../src/routes/organization.js) (frontend readonly não basta).
- ✅ Endereço do site (slug/domínio) exibido somente leitura (GET agora devolve `siteUrl` via `BASE_DOMAIN` + `customDomain`).
- ✅ Telefone/WhatsApp continua editável (fica pro item 8). CPF: não coletado. Logo: aviso "é do site, não marca d'água".
- ⏳ Validar no navegador (abrir aba Perfil, testar solicitação de troca e confirmar que e-mail/site não salvam).
- Decisão registrada: e-mail de **login** fica como está (sem fluxo de troca por ora).

### [x] 4. Planos personalizados por org + cortesia — 💰 ✅ FEITO (2026-06-25)
O plano da landing page é a regra base; super admin pode **sobrescrever** (aumentar storage, reduzir sessões etc.) ou marcar **cortesia**. Desligar o override → volta ao plano base.
- ✅ Schema ([`Subscription.js`](../src/models/Subscription.js)): `isCourtesy`, `courtesyNote`, `overrideEnabled`. Defaults seguros (orgs antigas → `false` mesmo via `.lean()` por `!!`).
- ✅ Backend ([`saasAdmin.js`](../src/routes/saasAdmin.js)): `/plan` não reseta mais os limites quando `overrideEnabled` (preserva custom ao trocar plano); `/limits` agora liga/desliga override (`overrideEnabled:false` → reverte ao `planLimits[plan]`); nova `/courtesy`; `details` devolve os 3 flags; listagem de orgs anexa `isCourtesy` (1 query extra).
- ✅ `billing/subscription` já devolve o `sub` inteiro → `isCourtesy` chega no cliente sem mudança no backend.
- ✅ Super admin ([`organizacoes.js`](../saas-admin/js/tabs/organizacoes.js), painel lateral `renderPanelOverview` — a superfície ATIVA; o modal `showDetails`/Limites Customizados estava órfão): seção **Cobrança** (toggle cortesia + nota) + seção **Override de limites** (toggle + form storage/sessões/fotos/álbuns, off reverte). Selo "🎁 cortesia" na tabela. Label de auditoria `courtesy_change`.
- ✅ Painel do cliente ([`plano.js`](../admin/js/tabs/plano.js)): selo **🎁 Cortesia** + esconde "Ver planos", grade de planos e bloco de cancelamento; mostra card amigável "conta cortesia, sem cobrança".
- ⚠️ **Cortesia é só rótulo** (selo + some CTAs); os limites continuam vindo do plano/override. Pra dar limites generosos a uma cortesia: setar plano `pro` OU ligar override.
- ⏳ **Não** flipei orgs de produção por script (Flávia live) — marcar esposa/David/admin/reino-pro é clicar o toggle no painel.
- ⏳ Validar no navegador: marcar cortesia numa org de teste → ver selo na tabela + no painel do cliente (CTAs somem); ligar override, mudar limites, trocar plano (limites devem persistir), desligar override (volta ao base).
- Esforço: Grande.

### [x] 3. Divergência métricas do agente × dashboard — 🐛 (ganho rápido) — ✅ FEITO (2026-06-25)
**Raiz:** havia **duas fontes de verdade** para o plano.
- Dashboard conta `Organization.plan` → [`saasAdmin.js:78`](../src/routes/saasAdmin.js#L78).
- Agente contava `Subscription.plan` → [`agentTools.js`](../src/services/agentTools.js) (`getBusinessMetrics`).
- O agregado do agente ainda incluía **assinaturas órfãs** (orgs apagadas antes do cleanup) e **orgs na lixeira** (`deletedAt`).
- **Correção aplicada:** `getBusinessMetrics` agora junta `Subscription → Organization` (`$lookup`+`$unwind` derruba órfãs, `$match deletedAt:null` derruba lixeira) e conta por `Organization.plan` (mesmo campo do dashboard). `byStatus`/MRR também passam a ignorar órfãs/lixeira.
- Culpado mais provável dos números atuais: **assinatura órfã** (org apagada definitivamente antes do cleanup existir) — descartada pelo `$unwind`.
- ⏳ Validar contra dados reais de prod e/ou alinhar o dashboard para filtrar `deletedAt` também (evita divergência futura se uma org paga for pra lixeira).
- Esforço: Pequeno.

---

## 🟠 P1 — Operação / Confiabilidade

### [x] 5. Modo "plataforma em manutenção" (super admin) — ⚙️ ✅ FEITO (2026-06-25)
Botão no SaaS Admin que coloca a plataforma fora do ar com aviso amigável e previsão de retorno (global, diferente do `SiteData.maintenance` por site).
- ✅ Estado: `PlatformConfig.maintenance { enabled, message, etaText, updatedAt }` ([`PlatformConfig.js`](../src/models/PlatformConfig.js)).
- ✅ Backend: reusa o `PATCH /api/admin/saas/platform-config` (aceita `maintenance`) + GET já devolve a config. Sem endpoint novo. Invalida o cache da cortina ao salvar.
- ✅ **Cortina** ([`server.js`](../src/server.js), antes dos static mounts): cache 10s **fail-open** (erro de DB nunca derruba); se `enabled` → API ≠ bypass → 503 JSON `{maintenance,message,etaText}`, HTML → página amigável self-contained (503 + Retry-After).
- ✅ **Bypass do super admin (2 camadas):** path (`/saas-admin`, `/api/login`, `/api/auth/`, `/api/health`) **+** JWT `role==='superadmin'` em qualquer rota. Auditado: todas as chamadas do painel saas-admin caem nos bypasses → sem risco de auto-trancamento.
- ✅ UI: card "Modo manutenção da plataforma" no topo da aba **Sistema** ([`sistema.js`](../saas-admin/js/tabs/sistema.js)) — toggle com confirmação + mensagem + previsão.
- ⏳ Validar no navegador: ligar pela aba Sistema, abrir `/site` ou `/admin` numa aba anônima (deve ver a cortina), confirmar que `/saas-admin` continua acessível, desligar.
- Esforço: Médio.

### [ ] 10. Presença online + **métricas de engajamento do fotógrafo** (painel SaaS) — ⚙️ (companheiro do item 5)
Duas camadas que andam juntas:

**(A) Presença em tempo real** — ver quem está usando a plataforma AGORA, **antes** de entrar em manutenção (fotógrafos no admin + clientes finais em galerias/seleção — o caso crítico). Spec em [`ajustes.md`](ajustes.md) (linhas ~69-324).
- **Arquitetura decidida:** heartbeat via HTTP polling (o projeto **não** usa WebSocket; evitar `socket.io`/`ws`). Serviço **in-memory** (`Map` + TTL), sem MongoDB (heartbeat a cada 60s = write amplification).
- Heartbeat 60s (admin + PWA cliente) · TTL 2min · painel SaaS faz poll 30s.
- Novos: `src/services/presence.js` (registerHeartbeat/getOnlineUsers/cleanup) + `src/routes/presence.js` (`POST /api/presence/heartbeat` público + `GET /api/admin/saas/presence` superadmin). Front: heartbeat no boot do admin e no `verify-code` do cliente; card "Presença Online" + bolinha na tabela de orgs no saas-admin.

**(B) Métricas de engajamento por fotógrafo (PERSISTENTE — pedido do usuário 2026-06-25)** — não é só "quem está online agora", é histórico/média ao longo do tempo:
- **Tempo de uso** por fotógrafo (quanto tempo fica na plataforma — soma de sessões de uso).
- **Onde ele mais usa**: qual parte da plataforma concentra o tempo/ações (ex.: Sessões/Seleções = onde gera dinheiro pra ele → faz sentido ser o calor de movimento; vs Meu Site, vs Gestão/Rhyno ERP).
- **Uso do Rhyno ERP** entra na conta (o fotógrafo "usa bastante meta"/Gestão) — cruzar com a integração Rhyno.
- **Perfil ao longo do tempo:** 1ªs semanas = calor no Meu Site (curva de conhecer a plataforma); maduro = média mostrando "esse fotógrafo usa mais Seleções/Sessão" etc. Objetivo: parâmetro de engajamento por fotógrafo pra decisões de produto/retenção/precificação.
- Diferente da presença (in-memory, efêmera): isso **precisa persistir** (agregação por módulo/tempo). Liga com [[project_saas_admin_v2]] (telemetria por módulo + jornada do cliente) e com `ActivityEvent` já existente. Provável base: eventos de uso por módulo → rollup periódico (scheduler) → métricas por org.

**⚠️ Decisões a confirmar antes de codar:** (1) PM2 = **1 worker** (presença in-memory só funciona com 1; cluster exigiria Redis); (2) incluir clientes finais já na V1 da presença ou só fotógrafos; (3) avisar "X clientes serão desconectados" ao confirmar manutenção (liga no item 5); (4) granularidade da telemetria de engajamento (por aba/módulo? amostragem de tempo via heartbeat com `module`? rollup diário?).
- Depende de: nada técnico bloqueante. (A) fecha o ciclo do item 5; (B) é o maior e cruza com Rhyno + saas_admin_v2.
- Esforço: (A) Médio · (B) Grande.

### [x] 2. Armazenamento fantasma (mostra MB sem sessão) — 🐛/billing ✅ FEITO (2026-06-25)
**Não era bug de cálculo:** `getDirSize` é correto e escopado por org (conta vazia = 0). A barra somava **sessões + site/logo + vídeos** ([`billing.js:30-43`](../src/routes/billing.js#L30-L43)); contas cortesia sem sessão mas com logo/site mostravam MB. Storage é **só exibição** (sem gate em [`planLimits.js`](../src/middleware/planLimits.js)).
- **Decisão do usuário:** a barra conta **só fotos das sessões** → conta sem sessão = 0.
- ✅ [`plano.js`](../admin/js/tabs/plano.js): barra usa `breakdown.sessionsMB`; detalhamento mantém Site/logo + Vídeos com aviso "não contam no limite".
- ✅ [`dashboard.js`](../admin/js/tabs/dashboard.js): card "Espaço Usado" usa `breakdown.sessionsMB`.
- Backend intocado (já devolvia o `breakdown`). Sem mudança de regra de cobrança (não há).
- ⚠️ Conecta com item 7: se for cobrar/bloquear storage, revisitar o que conta no limite.
- ⏳ Validar no navegador (Plano + Dashboard).
- Esforço: Pequeno.

### [ ] 7. Storage adicional + remover "drive do cliente" — 💰
Implementar venda de storage adicional. Remover a ideia antiga de deixar o cliente usar o próprio drive.
- Depende de: 2 (storage correto) e 4 (limites por org).
- Esforço: Médio.

---

## 🟡 P2 — Crescimento / Limpeza

### [ ] 8. Captura de WhatsApp pós-cadastro (gatilho suave) — 📈
WhatsApp opcional no cadastro; depois de N ações (ex.: 2 sessões criadas) pedir o número de forma não intrusiva. Base para 2FA futuro (e-mail garantido, WhatsApp quando viável).
- Esforço: Médio.

### [x] 6. Limpeza da config "Padrão de entrega da galeria" — 🧹 ✅ FEITO (parte obrigatória, 2026-06-25)
Modo Galeria virou página única ([`wizard/index.js:25`](../admin/js/tabs/sessoes/wizard/index.js#L25)) e não usa mais o stepper → a config `renderEntrega` (que só alimentava o stepper) não tinha efeito no fluxo novo.
- ✅ Removidos de [`configuracoes.js`](../admin/js/tabs/configuracoes.js): a aba "Entrega" do `SECTIONS`, o dispatch, e as funções `renderEntrega` + `renderLayoutAfterRadio` (só usadas por ela).
- ⚠️ **Limpeza profunda NÃO feita de propósito:** `galleryDeliveryMode` (por sessão) **não é morto** — o cliente ([`gallery.js:325`](../cliente/js/gallery.js#L325)) ainda lê `=== 'direct'` como gatilho secundário de "sem marca d'água" (principal é `selectionStatus === 'delivered'`); branches em `stepper.js`/`6-deliver.js` ainda servem o `multi_instant` (V2 oculto). Sessões antigas em prod podem ter o campo setado.
- Pendência (refatct cuidadoso, não quick win): checar dados em prod + remover de forma coordenada backend+cliente+admin se quiser zerar o legado.
- ⏳ Validar no navegador (aba Configurações sem "Entrega"; demais seções OK).
- Esforço: Pequeno (feito) / Médio (limpeza profunda, adiada).

### [ ] 1. CDN para a plataforma — 🚀
Configurar CDN (assets/uploads). Infra; pode esperar.
- Esforço: Grande / externo.

---

## Ordem sugerida de execução
Feitos: `3` `9` `6` `2` `5` `4`. Próximos: `10` → `7` → `8` → `1`

## Dependências
- Bloco financeiro: **3 → 4 → 2 → 7** (acertar métrica → cortesia/override → storage correto → vender storage).
- **9** e **6** são independentes.
- **10** (presença online) é companheiro do **5** (manutenção) — fazer logo depois do 4, a pedido do usuário.
