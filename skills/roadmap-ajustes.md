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

### [~] 10. Presença online + **métricas de engajamento do fotógrafo** (painel SaaS) — ⚙️ (companheiro do item 5) ✅ Camada A FEITA + DEPLOYADA PROD (2026-06-25, commit `56bc29c`) · ⏳ painel da camada B adiado · ⏳ validação E2E no navegador
Duas camadas, **um único heartbeat alimenta as duas** (não é trabalho dobrado).

**⚠️ Correção de arquitetura vs spec antigo:** o spec previa presença **in-memory** (`Map`+TTL). **NÃO serve aqui** — o PM2 roda `exec_mode:'cluster'` com `instances:2` (visto em `ecosystem.config.js`): cada worker teria seu Map → presença furada. **Decisão final: MongoDB com TTL index** (compartilhado entre workers, sem Redis). As demais "decisões a confirmar" foram resolvidas: clientes finais **incluídos** (pedido do usuário); granularidade = heartbeat com `module` + rollup diário.

**(A) Presença em tempo real ✅ FEITA:**
- `src/models/Presence.js` — doc por sessão de uso (`key` único: `user:<id>` ou `client:<sessionId>:<participantId|anon>`), TTL 150s em `lastSeen` → cai sozinho.
- `src/services/presence.js` — `touch()` (upsert Presence + `$inc` UsageDaily, fire-and-forget) · `getOnline()` · `getOnlineCount()`.
- `src/routes/presence.js` — `POST /api/presence/heartbeat` (fotógrafo, autenticado) · `POST /api/presence/heartbeat/client` (público, `heartbeatLimiter` 120/min/IP) · `GET /api/admin/saas/presence` (superadmin). Registrado em `server.js`.
- Front: `admin/js/app.js` (heartbeat 60s + ping na troca de aba, `module=currentTab`, pausa em aba oculta — raw `fetch`, sem auto-logout no 401) · `cliente/js/gallery.js` (heartbeat 60s na galeria, `module='galeria'|'selecao'`) · card **"Presença online agora"** no topo da aba Sistema do saas-admin (`sistema.js`, poll 30s só do card).
- ⏳ Validar no navegador (E2E): logar admin + abrir galeria de cliente → ver os dois no card; trocar de aba muda o módulo; fechar/esperar 150s → somem.

**(B) Engajamento persistente — DADO já coletando, PAINEL adiado:**
- `src/models/UsageDaily.js` (`{org,user,day,module} → minutes`, `$inc` por heartbeat, **só fotógrafo**) **já grava desde o deploy** → o histórico nasce sendo coletado.
- A aba **Gestão é iframe do Rhyno** → tempo nela conta como `module='gestao'` **sem** instrumentar o Rhyno por dentro.
- **Adiado de propósito:** o painel de visualização (gráfico tempo/módulo, ranking Seleções×Meu Site×Gestão, perfil ao longo do tempo) só faz sentido com dias/semanas de histórico — fazer num **2º passo**. Liga com [[project_saas_admin_v2]] e [[project_engajamento_fotografo]].
- Esforço: (A) Médio ✅ · (B painel) Grande, depois.

### [x] 2. Armazenamento fantasma (mostra MB sem sessão) — 🐛/billing ✅ FEITO (2026-06-25)
**Não era bug de cálculo:** `getDirSize` é correto e escopado por org (conta vazia = 0). A barra somava **sessões + site/logo + vídeos** ([`billing.js:30-43`](../src/routes/billing.js#L30-L43)); contas cortesia sem sessão mas com logo/site mostravam MB. Storage é **só exibição** (sem gate em [`planLimits.js`](../src/middleware/planLimits.js)).
- **Decisão do usuário:** a barra conta **só fotos das sessões** → conta sem sessão = 0.
- ✅ [`plano.js`](../admin/js/tabs/plano.js): barra usa `breakdown.sessionsMB`; detalhamento mantém Site/logo + Vídeos com aviso "não contam no limite".
- ✅ [`dashboard.js`](../admin/js/tabs/dashboard.js): card "Espaço Usado" usa `breakdown.sessionsMB`.
- Backend intocado (já devolvia o `breakdown`). Sem mudança de regra de cobrança (não há).
- ⚠️ Conecta com item 7: se for cobrar/bloquear storage, revisitar o que conta no limite.
- ⏳ Validar no navegador (Plano + Dashboard).
- Esforço: Pequeno.

### [x] 11. Preço personalizado por org (Mercado Pago) — 💰 ✅ FEITO (2026-06-25, não validado/deployado)
MP já era integrado (sandbox/test). Agora super admin pode setar preço custom por org (ex.: Pro a R$80).
- ✅ `Subscription`: `customPriceCents`, `mpPreapprovalId`, `pendingPlan`. Checkout usa o preço custom; webhook corrigido (não clobbera override de limites + mapeia plano por `pendingPlan` + salva `mpPreapprovalId`). `/billing/cancel` cancela de fato no MP. UI no painel super-admin (Cobrança) + selo "preço especial" no painel do cliente + MRR usa o preço custom.
- **Decisões:** vale só na próxima assinatura (não empurra pra assinatura viva); **pró-rata/crédito ADIADOS** (MP não prora automático; fazer quando os planos forem definidos — calcular crédito por dias restantes e aplicar como desconto/cobrança avulsa).
- ⏳ Validar no navegador + testar checkout/webhook no sandbox.

### [~] 7. Storage adicional + remover "drive do cliente" — 💰 ✅ Passo 1 FEITO + DEPLOYADO PROD + MOTOR VALIDADO no navegador (2026-06-26, commit 859c454; falta só o gate do MP no sandbox)
Storage adicional virou **adicional recorrente na mensalidade** (Mercado Pago). Decisão: cobrança recorrente; controle pelo super admin agora (Passo 1), auto-serviço do fotógrafo depois (Passo 2).
- ✅ Camada aditiva separada em [`Subscription.js`](../src/models/Subscription.js): `storageAddonGB`, `storageAddonPriceCents` (defaults 0, sobrevivem a troca de plano). Helper único [`src/services/subscriptionPricing.js`](../src/services/subscriptionPricing.js): `effectiveMonthlyCents` (base/custom + adicional) e `effectiveStorageMB` (limite base + GB).
- ✅ [`mercadopago.js`](../src/middleware/mercadopago.js): checkout usa `effectiveMonthlyCents`; novo `updatePreapprovalAmount` atualiza o valor da assinatura JÁ ATIVA no MP.
- ✅ Super admin: `PUT /admin/organizations/:id/storage-addon` ([`saasAdmin.js`](../src/routes/saasAdmin.js)) + mini-form "+GB / +R$/mês" na aba Cobrança ([`organizacoes.js`](../saas-admin/js/tabs/organizacoes.js)). Auditoria `storage_addon_change`.
- ✅ Cliente: [`billing.js`](../src/routes/billing.js) GET devolve `maxStorageMB` efetivo + `storageAddon`; [`plano.js`](../admin/js/tabs/plano.js) usa o teto efetivo + nota "inclui +X GB". Dashboard sem mudança (card só mostra usado).
- ✅ "Drive do cliente" (BYO/OAuth) **descartado** em doc — nunca teve código. `Session.externalStorageUrl` (backup pós-arquivamento) **fica**.
- ✅ Motor validado no navegador (2026-06-26): super admin adiciona +GB/+R$ → painel do fotógrafo reflete o teto novo + nota; zera → volta ao base. (Org de teste, sem assinatura MP — não dispara o `updatePreapprovalAmount`.)
- ⚠️ **Gate ainda aberto (leitura do código confirma o risco):** nosso checkout cria a assinatura via `PreApprovalPlan` → ela é **atrelada a plano**, e no MP o valor é governado pelo PLANO, não pela preapproval individual → `PreApproval.update({transaction_amount})` provavelmente é ignorado em assinatura viva. **Fix limpo:** migrar checkout p/ `PreApproval` avulsa por org (aceita update de valor nativo; ajuda tb o item 11). Mexe na cobrança ao vivo → exige sandbox antes. Alternativa zero-risco: adicional vale só "na próxima assinatura".
- ⏳ Passo 2 (depois): auto-serviço do fotógrafo (endpoint autenticado + UI "comprar espaço" + tratar free sem assinatura).
- Depende de: 2 (storage correto) e 4 (limites por org). Esforço: Médio.

---

## 🟡 P2 — Crescimento / Limpeza

### [x] 8. Captura de WhatsApp pós-cadastro (gatilho suave) — 📈 ✅ FEITO (2026-06-25)
WhatsApp opcional no cadastro; depois de N ações (ex.: 2 sessões criadas) pedir o número de forma não intrusiva. Base para 2FA futuro (e-mail garantido, WhatsApp quando viável).
- ✅ **Cadastro (opcional):** campo WhatsApp no form da landing ([`home/index.html`](../home/index.html)) marcado "(opcional)" + hint; [`home/js/home.js`](../home/js/home.js) envia no POST; [`auth.js`](../src/routes/auth.js) aceita `whatsapp` e grava em `org.whatsapp` no cadastro (vazio se não vier). Sem validação obrigatória → não atrapalha quem quer "conhecer primeiro".
- ✅ **Gatilho suave (admin):** [`app.js`](../admin/js/app.js) — orquestrador `showOnboardingNudges()` faz **uma** leitura de `/api/sessions` e escolhe NO MÁXIMO um banner: 0 sessões → boas-vindas (já existia); `≥ WHATSAPP_NUDGE_THRESHOLD` (=2) sessões **e** `org.whatsapp` vazio → `showWhatsappNudge()`. `appState.orgData.whatsapp` já vem do boot (`loadOrgSlug`).
- ✅ **Não intrusivo:** banner canto inferior com input + "Salvar"; "Agora não"/× **adiam 7 dias** (`localStorage cz_whatsapp_nudge_snooze`) — nunca insiste no mesmo dia, mas volta depois (não some de vez sem o número). Salvar → `PUT /api/organization/profile { whatsapp }` (campo já no `allowedFields`), atualiza `appState.orgData` e some. Validação leve: ≥10 dígitos (DDD).
- ⏳ Validar no navegador: cadastrar com/sem WhatsApp; no admin de uma org sem WhatsApp com ≥2 sessões → ver o banner, testar salvar/soneca; confirmar que não aparece pra quem já tem WhatsApp.
- Refator de baixo risco: `showWelcomeBanner` deixou de fazer o próprio fetch (o orquestrador gateia). Tokens CSS inline (sem Tailwind).
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
Feitos: `3` `9` `6` `2` `5` `4` `8` · `10(A)` ✅ (camada B já coletando, painel adiado). Próximos: `7` (só limpeza no V1; venda depende de pagamentos) → `1` · depois o **painel do 10(B)** quando houver histórico

## Dependências
- Bloco financeiro: **3 → 4 → 2 → 7** (acertar métrica → cortesia/override → storage correto → vender storage).
- **9** e **6** são independentes.
- **10** (presença online) é companheiro do **5** (manutenção) — fazer logo depois do 4, a pedido do usuário.
