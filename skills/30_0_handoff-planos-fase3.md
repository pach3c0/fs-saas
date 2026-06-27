# Handoff — Planos Fase 3 + Card Clientes Online (2026-06-26)

> Doc de passagem para a próxima sessão. Tudo aqui foi **verificado por git/SSH ao vivo** no fim de 2026-06-26.
> Memórias relacionadas: `project_arquitetura_planos_medidor`, `project_engajamento_fotografo`,
> `project_staging_canary_2026-06-19`. Roadmap mestre: [skills/27_0](27_0_master-roadmap-lancamento.md).

---

## 1. Estado de git/deploy (ground truth confirmado)

| Ref | SHA | Onde roda |
|-----|-----|-----------|
| **origin/main (PROD)** | `859c454` | `/var/www/cz-saas`, PM2 `cliquezoom-saas`, :3051 — **INTOCADA** |
| **origin/beta** | `2c3cd4c` | `/var/www/cz-saas-beta`, PM2 `cliquezoom-beta`, :3052 |
| **main LOCAL** | `2c3cd4c` | sincronizada com beta — **6 commits À FRENTE de prod** |

**Os 6 commits locais ainda NÃO em prod** (`origin/main..main`, do mais novo ao mais antigo):
1. `2c3cd4c` feat(dashboard): card "Clientes online agora" + indicador no header
2. `bd0f16c` feat(planos): Fase 3 — gating de feature (selo Free + can() + gate de domínio)
3. `9e2cfe1` fix(planos): limites efetivos derivam de plans.js (corrige Free mostrando 500MB/5/100)
4. `6b2d1b1` docs(planos): planejamento dos planos/medidor (skills 26-29) + roadmap-ajustes
5. `9e77dcb` chore(manual): seeder completo do manual do usuario
6. `94ee7fd` feat(planos): fonte única + medidor de storage + gate (Fase 0/1/2)

**Working tree quase limpo:** só `.claude/settings.local.json` (M) + `.claude/launch.json`, `scratch.py` (untracked).
Nenhum fonte modificado pendente. **2 stashes da outra IA:** `other-wip`, `manual-seeds-wip` — NÃO descartar.

---

## 2. O que está DEPLOYADO no beta (e só no beta)

**Fase 3 — fatia 1 (gating de feature, commit `bd0f16c`):**
- `subscriptionPricing.js` ganhou `can(sub, capability)` — deriva PURO de `sub.plan` via `plans.js`
  (override só afeta limites/preço, **não** capabilities; sem sub → Free). Testado 16/16.
- **Selo CliqueZoom** só em org Free: `computeSelo()` em [src/routes/sessions.js:32](../src/routes/sessions.js#L32)
  injeta `{selo, seloUrl}` em `/client/verify-code` e `/client/photos`; rodapé "Galeria criada com
  CliqueZoom" em [cliente/js/gallery.js:541](../cliente/js/gallery.js#L541) (`renderSelo`). SW bumpado p/ `galeria-v3`.
  ✅ **Validado no navegador** numa galeria Free no beta (org `cliquezoom-admin`).
- **Gate de domínio próprio:** `POST /domains` retorna 403 `PLAN_REQUIRED` se `!can(sub,'dominioProprio')`
  ([src/routes/domains.js:44](../src/routes/domains.js#L44)) — só Pro/Studio passam, fail-open em erro de DB.

**Card "Clientes online agora" (commit `2c3cd4c`, feito pela outra IA, eu auditei+commitei):**
- `getClientsOnline(orgId)` em `services/presence.js` + `GET /presence/clients` (autenticado, escopo-org).
- Front: card no dashboard (`admin/js/tabs/dashboard.js`, poll 30s) + indicador "Ao vivo" no header
  (`admin/index.html` + `admin/js/app.js`). ⏳ falta validação no navegador.

**Gestão (Rhyno) no beta — RE-LIGADA:** as 4 vars Rhyno/SSO foram repopuladas no `.env` do beta copiando
de prod. ⚠️ Consequência: **a Gestão do beta opera no Rhyno de PRODUÇÃO** (CRM real). Backup em
`/var/www/cz-saas-beta/.env.bak.20260626_200636`. Reverter = restaurar o backup + `pm2 reload`.

---

## 3. Setup de TESTE armado no beta (REVERTER quando o usuário pedir)

- `.env` do beta tem **`STORAGE_GATE_ENFORCE=true`** → gate de storage **bloqueia** uploads (403 `STORAGE_FULL`)
  acima do limite — **só no beta**. Em prod a flag está ausente = modo medir (loga "BLOQUEARIA", deixa passar).
- Org de teste = slug **`rhynoproject`** (o próprio usuário, no banco de prod): `plan=pro`,
  `overrideEnabled=true`, `limits.maxStorage=15` (MB), `storageQuotaBytes≈14,4MB` (cota cheia, armada).

**Reverter (quando pedir "reverter"):**
1. `rhynoproject` → `limits.maxStorage=50000`, `overrideEnabled=false`, zerar `storageQuotaBytes` do teste.
2. `STORAGE_GATE_ENFORCE=false` no `.env` do beta + `pm2 reload cliquezoom-beta --update-env`.

---

## 4. Pendências (priorizadas)

### Fase 3 — restante (ALTA)
- **Gating das capabilities de Gestão (cross-system Rhyno):** `plans.js` define `tarefasMetas`,
  `financasEmpresa`, `financasPessoal`, `gestaoMista`, `ordemServico`, `crm`('taste'|'full') por tier, mas
  **só `selo` e `dominioProprio` estão aplicados**. Hoje qualquer plano (até Free) vê tudo da Gestão.
  Acionável: passar `can(sub,...)` no payload do SSO em `gestao.js` e consumir no embed do Rhyno. (Épico A2.)
- **Widget de aniversário não gated (Basic+):** `anniversaryAutomator.js` roda p/ TODAS as orgs (sem
  filtro de plano); UI admin libera aniversariantes pra todos. É um dos **2 GATES de lançamento**. Acionável:
  filtrar por `can(sub,'aniversario')` no automator + esconder/bloquear o widget no admin Free. *(O widget
  "de fato/hero" ainda não existe — ver roadmap.)*
- **UI "bloqueado-mas-visível" / mini-vitrine:** ✅ **FEITO em código (não commitado)** em
  `admin/js/tabs/plano.js`. Bloco "Desbloqueie mais ao subir de plano": deriva as capabilities que o plano
  ATUAL não entrega (`selo`/`crm`/`aniversario`/`dominioProprio`/`tarefasMetas`/`financasEmpresa`/
  `financasPessoal`/`gestaoMista` + `seats`) a partir do `plans` que já chega de `/billing/plans`, e mostra
  chip 🔒 com o tier que libera (badge). Só p/ contas **pagas** (cortesia some) e só quando há algo travado
  (Studio → bloco oculto). Botão "Ver planos ↓" rola pra grade. Parse ESM OK. **Falta:** ver no navegador +
  commit/deploy. (Isto é a vitrine no painel do fotógrafo; o cadeado DENTRO de cada feature paga, ex. Gestão,
  continua sendo o gating cross-system acima.)

### Fase 4 — limpeza (MÉDIA/BAIXA)
- ✅ **FEITO em código (não commitado):** `saas-admin/js/tabs/dashboard.js` virou read-only (sem botão Salvar
  → não chama mais o `PUT` removido; 4 tiers `['free','basic','pro','studio']`, storage em GB). MRR agora vem
  do backend: `saasAdmin.js` soma `effectiveMonthlyCents` das assinaturas ativas (respeita preço custom +
  add-on de storage) e devolve `mrrCents`; o dashboard usa esse valor (fallback p/ estimativa por catálogo
  39/119/249). `saas-admin/index.html` perdeu o botão Salvar e ganhou nota "somente leitura". **Falta:** ver no
  navegador + commit/deploy.
- `src/middleware/stripe.js` morto (não importado) + pacote `stripe` em package.json + `priceId:null` em
  `plans.js` → remover juntos.
- `planLimits.js`: `checkSessionLimit/Photo/Album` são no-op (tudo -1) → remover ou manter como guarda.
- Campo `usage.storage` (MB) morto no `Subscription` + reset no signup (`auth.js`) → o vivo é
  `usage.storageBytes`/`storageQuotaBytes`.

### Validação E2E no beta (ALTA — código pronto, falta navegador)
- ✅ Selo em galeria Free (confirmado) / confirmar que NÃO aparece em plano pago.
- Gate de domínio 403 em Free/Basic e "pending" em Pro (UI trata o 403 com mensagem amigável?).
- Card/header "Clientes online agora" aparecendo ao abrir galeria como cliente.
- Card "Presença online agora" na aba Sistema do saas-admin.

### Pré-requisito de lançamento (MÉDIA)
- **Antes de ligar `STORAGE_GATE_ENFORCE=true` em PROD:** medir uso real de Flávia (`fsfotografias`) e Davi
  (`daviconecta`) contra o `effectiveStorageMB` do plano + checar `overrideEnabled`. `maxStorage=-1` nunca barra.

---

## 5. Riscos / landmines (não causar dano)

1. **PROD é LIVE.** Orgs reais: `fsfotografias` (Flávia) e `daviconecta` (Davi). Nunca "corrigir" essas orgs
   por iniciativa própria; nunca tocá-las em scripts de manutenção.
2. **Não push/deploy às cegas.** main local está 6 commits à frente de prod — `git push origin main` jogaria
   todo o trabalho de planos pra produção sem validação. Só com pedido explícito.
3. **Beta = MESMO banco MongoDB de prod.** Escrever no beta (orgs/sessões/subscriptions/seeders) afeta os
   dados que Flávia/Davi veem. Uploads do beta vão pro disco de prod via symlink. Trate escrita no beta como prod.
4. **Beta aponta pro Rhyno de PROD** (ver §2). Ações de CRM/Gestão no beta são reais.
5. **Gate de storage ARMADO no beta** (ver §3). Nunca ligar `STORAGE_GATE_ENFORCE=true` em prod sem medir antes.
6. **Outra IA compartilha o working tree** + 2 stashes. `git stash list` ao iniciar; nunca `git add -A`/
   `git stash` às cegas (em 06-12 a outra IA quebrou o app stashando o tree inteiro).
7. **Testar só em `*.beta.cliquezoom.com.br`.** Sem `.beta` = produção real (galeria/seleção de cliente real).
8. **Service worker da galeria cacheia.** Ao mexer em `gallery.js`/`sw.js`, **bumpar `CACHE_NAME`** e
   fechar/reabrir as abas da galeria (só F5 pode não bastar).
9. **SSH ao VPS:** `ssh -i ~/.ssh/cz_vps root@5.189.174.18`, **UMA conexão por vez** (paralelo → throttling/255).
10. **Nunca commit/push/deploy sem pedido explícito.** `npm run build:css` antes de commitar se mudou Tailwind.
11. **Gate do storage-addon (MP) ainda aberto:** checkout cria `PreApprovalPlan` → `update` de valor em
    assinatura viva provavelmente é ignorado. Fix limpo (PreApproval avulsa por org) mexe na cobrança ao vivo
    → exige sandbox. Não alterar billing real sem decisão do usuário.
12. **Beta: schedulers + e-mails DESLIGADOS** (`APP_ENV=beta`). Inclui o reconciliador de storage. Não conclua
    que automação "não funciona" testando só no beta.
13. **Cert `*.beta` é `--manual`, NÃO auto-renova — expira 2026-09-18.** Renovar repetindo o certbot (2 TXT na Hostinger).
14. **ERP1: não commitar o working tree inteiro** (mudanças inacabadas em models.py/crm.py). Deploy ERP precisa
    `npm run build` no servidor.
15. **`cleanupStorage.js` apaga arquivos legítimos** (sem dry-run) — NÃO rodar/agendar sem corrigir.

---

## 6. Próximo passo sugerido (caminho crítico A1)

Pelo roadmap mestre (skills/27_0), o gargalo de lançamento é **A1 (Planos + endurecimento de billing)**.
Com a Fase 3 fatia 1 no beta, o próximo bloco natural é:
- **Validar E2E no beta** os 4 itens de §4 (rápido, destrava confiança).
- **Fechar a Fase 3** — restam **2 itens** (mini-vitrine ✅ feita em código): gating de Gestão via SSO +
  widget de aniversário gated (este é um dos 2 GATES de lançamento e mexe no scheduler de prod/Flávia → exige
  decisão de produto: gatear a automação existente ou só o widget "hero" futuro?).
- **Promover pra prod** os 6 commits — *só com autorização e usuários offline*, e depois de medir o uso de
  Flávia/Davi antes de qualquer enforce de storage.
- Em paralelo: **endurecer o billing** (migrar p/ PreApproval avulsa por org no sandbox MP — resolve gate de
  storage-addon + preço custom de uma vez) e **credencial MP de produção** (o outro GATE de lançamento).
