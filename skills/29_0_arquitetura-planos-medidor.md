# 29.0 — Arquitetura: Planos, Medidor de Storage e Gating de Feature

> Plano profundo (passo a passo, onde cada coisa entra) para implementar os 4 tiers
> fechados em [[project_modelo_financeiro]] / [[project_storage_motor_saturacao]].
> **Antes de tocar em código.** Épico que encosta em cobrança e em conta de produção (Flávia).

---

## 0. Decisões já fechadas (entrada deste plano)

**Tiers** (storage = único medidor; sessões/álbuns/fotos = ILIMITADOS):

| Plano   | Preço/mês | Storage | Selo galeria | Seats | Domínio       | Gestão                                   |
|---------|-----------|---------|--------------|-------|---------------|------------------------------------------|
| Free    | R$0       | 3 GB    | **Selo CZ**  | 1     | subdomínio    | CRM "gostinho" + Ordem de serviço        |
| Basic   | R$39      | 20 GB   | limpo        | 1     | subdomínio    | + Widget aniversário                     |
| Pro     | R$119     | 150 GB  | limpo        | 2     | **próprio**   | + Tarefas/Metas/Finanças da empresa      |
| Studio  | R$249     | 600 GB  | limpo        | 3     | próprio       | + Botão de gestão "misto"                |

- **Add-ons de storage** (recorrente): +50 GB = R$19 · +100 GB = R$35 · +250 GB = R$69.
  - Camada aditiva já existe (`Subscription.storageAddon*` + `subscriptionPricing.js`). ⚠️ gate
    de cobrança ao vivo ainda aberto — ver [[project_storage_addon]] (PreApproval avulsa).
- **Entrega em alta** liberada pra TODOS (Free se diferencia pelo **selo**, não por marca d'água).
- **Triagem** em todos os planos.
- Em MB: free `3072` · basic `20480` · pro `153600` · studio `614400`.
- Em centavos: basic `3900` · pro `11900` · studio `24900`.

---

## 1. Inventário do código atual (verificado 2026-06-26)

### Onde "a verdade do plano" está hoje (5 duplicatas, todas free/basic/pro, números velhos)
1. `src/models/plans.js` — catálogo (name, price¢, features[], limits{}). **Vira a fonte única.**
2. `config/planLimits.json` — limites *efetivos*, lido por `saasAdmin` set-plan + revert de override.
3. `src/routes/saasAdmin.js:31-33` — mapa inline hardcoded.
4. `src/services/agentActions.js:35-37` — mapa inline hardcoded.
5. `src/routes/auth.js:181` — `maxStorage:500` inline no signup.
- `Subscription.js:9` — `enum: ['free','basic','pro']` → **falta `studio`**.

### Medição de storage = inexistente (o coração do novo design)
- `Subscription.usage.storage` (MB) é **campo morto**: nunca é lido nem escrito.
- Só `usage.sessions` e `usage.photos` recebem `$inc` (em `sessions.js`). `usage.albums` também morto.
- **MAS** `services/storage.js` já tem `getDirSize(path)` (soma recursiva de bytes) e uploads
  são por-org em `/uploads/{orgId}/` (`multerConfig.js:17`). → `getDirSize(orgId)` = bytes exatos da org.
- `subscriptionPricing.effectiveStorageMB(sub)` já calcula o limite (base + add-on).
- `billing.js` já devolve `maxStorageMB` + `storageAddon` ao cliente.

### Gates atuais (por CONTAGEM — modelo errado, e estão LIVE em produção)
- `middleware/planLimits.js`: `checkSessionLimit` / `checkPhotoLimit` / `checkAlbumLimit` (403 por contagem).
- Wired em: `POST /sessions` (sessions.js:955), `POST /sessions/:id/photos` (1302), `POST /albums` (albums.js:35).
- ⚠️ Ativos na conta da Flávia. Remover um gate só AFROUXA (seguro). Só o gate de storage (Fase 2)
  pode bloquear ela de novo → por isso medimos antes de gatear.

---

## 2. Arquitetura-alvo

### 2a. Fonte única dos planos
`plans.js` passa a declarar, por tier: `name`, `price¢`, `limits{ maxStorage, customDomain }`,
`seats`, e um bloco **`capabilities`** (booleans/valores). Helpers: `getPlan(id)`, `getLimits(id)`,
`getCapabilities(id)`. Todas as outras 4 duplicatas **importam daqui** (ou são geradas a partir
daqui). `config/planLimits.json` → gerado de `plans.js` OU deletado (saasAdmin lê `plans.js`).

```js
capabilities por tier (exemplo):
free:   { crm:'taste', ordemServico:true, aniversario:false, tarefasMetas:false,
          financasEmpresa:false, gestaoMista:false, dominioProprio:false, selo:true,  seats:1 }
basic:  { ...free,  aniversario:true,  selo:false, seats:1 }
pro:    { ...basic, tarefasMetas:true, financasEmpresa:true, dominioProprio:true, seats:2 }
studio: { ...pro,   gestaoMista:true,  seats:3 }
```

### 2b. Medidor de storage (híbrido — contador rápido + reconciliador que cura o drift)
- **Contador vivo:** novo `Subscription.usage.storageBytes` (BYTES, não MB — precisão; fotos são MB-escala).
  `$inc +file.size` em todo upload, `$inc -size` em todo delete. Hook inicial = os mesmos pontos
  onde hoje há `$inc usage.photos` em `sessions.js`. Auditar TODOS os sites de escrita em `/uploads/{orgId}/`.
- **Reconciliador (scheduler diário, off-peak):** `getDirSize(orgId)` → sobrescreve `usage.storageBytes`
  com a verdade do disco. Auto-cura contra drift (órfãos, delete que falhou, o bug do `cleanupStorage`).
  Usa o harness de schedulers já existente (`utils/`).
- **Backfill:** rodar o reconciliador 1× em todas as orgs → semeia números reais (= descobre o uso
  real da Flávia ANTES de gatear).
- `usage.storage` (MB, morto) fica deprecado; remove na Fase 4.

### 2c. Gate de storage (macio, nunca um muro no meio do upload)
- Novo `middleware/storageLimit.js` → `checkStorage`. Pré-checa por `Content-Length` ANTES do multer
  gravar (rejeita cedo, não escreve lixo). `projetado = usage.storageBytes + incoming` vs
  `effectiveStorageMB(sub)*1024*1024`.
- 403 **específico e gracioso**: `{ code:'STORAGE_FULL', usedMB, limitMB, upgrade:true }`.
- Front: medidor sempre visível ("2,7 de 3 GB"), avisos suaves em 80/95%, ao estourar →
  "libere espaço ou suba de plano" (NUNCA "indisponível" seco; NUNCA parece perda de fotos).

### 2d. Gating de feature (mostrar-bloqueado, não esconder)
- Backend: `GET /billing/subscription` já existe → adicionar `capabilities`. Helper `can(sub, cap)`.
  **Enforçar no backend** nos endpoints sensíveis (não confiar no front).
- Front: **duas texturas** (ver [[project_modelo_financeiro]] refinamentos A/B):
  - *Aspiracional* (tarefas/metas/finanças, domínio próprio, assento extra): card visível com
    cadeado discreto + "no Pro" + 1 linha de valor + botão → abre **mini-vitrine de upgrade**
    (valor + CTA). **Nunca botão morto / toast seco.**
  - *Consumo* (storage): medidor + aviso gracioso (item 2c), não muro.
- **Selo CliqueZoom** na galeria pública quando `capabilities.selo` (≠ marca d'água).

---

## 3. Ordem de construção (de-riscada pra produção)

> Regra-mestra: cada fase é deployável sozinha. Nada que possa NOVAMENTE bloquear a Flávia
> entra antes de medirmos o uso real dela.

**Fase 0 — Fonte única (zero mudança de comportamento)**
- Reescrever `plans.js`: 4 tiers + `limits` + `capabilities` + `seats`. (Números novos podem entrar
  já aqui, mas o *gate* numérico só vira na Fase 2.) Remover legado Stripe (`priceId`).
- Gerar/derivar `config/planLimits.json` de `plans.js`; matar mapas inline em `saasAdmin.js`,
  `agentActions.js`, `auth.js` → todos importam de `plans.js`.
- Add `'studio'` ao enum de `Subscription.js`.
- **Verificar:** webhook de billing + checkout (`billing.js`) também devem ler os limites da fonte única
  (o webhook reseta `limits` a partir do plano na troca). Confirmar antes de mexer nos números.
- Risco: **BAIXO** (refactor puro).

**Fase 1 — Medidor (SÓ MEDE, sem gate)**
- `usage.storageBytes` no model + `$inc` nos sites de upload/delete (começa pelos hooks de `sessions.js`).
- Reconciliador diário (`getDirSize`) + backfill 1× em todas as orgs.
- Expor used/limit em `GET /billing/subscription` e no super-admin.
- Front `admin/js/tabs/plano.js`: barra de medidor informativa.
- Risco: **BAIXO** (nada bloqueia; só mede). É como descobrimos se os novos limites são seguros pra Flávia.

**Fase 2 — Trocar enforcement contagem → storage**
- `checkStorage` (pré-check Content-Length + 403 macio).
- Tirar `checkSessionLimit`/`checkAlbumLimit` das rotas; trocar `checkPhotoLimit` por `checkStorage`.
- Ligar os NÚMEROS novos (3/20/150/600) — atrás de verificação de que o uso medido da Flávia < limite novo.
- UX suave no front (80/95/100%).
- Risco: **MÉDIO** (gate ao vivo; mitigado por Fase 1 + verificação + UX macia).

**Fase 3 — Gating de feature + UI**
- `capabilities` + `can()` enforçado nos endpoints sensíveis.
- Front: cards bloqueado-mas-visível + mini-vitrine (sem botão morto).
- Selo CliqueZoom no Free. Widget aniversário = Basic+ (amarra com o GATE de lançamento do widget,
  ver [[project_master_roadmap_lancamento]]).
- Risco: **MÉDIO** (muitas superfícies; incremental, feature por feature).

**Fase 4 — Limpeza**
- Remover `usage.storage` (MB) morto, `usage.albums` se morto, caps de contagem do model/UI,
  `priceId` Stripe.

---

## 4. Riscos de produção (Flávia) — checklist

- [ ] Flávia tem `overrideEnabled`? Se sim, mudar pro=50→150GB NÃO aplica nela (pinada). Se não,
      ela migra pro limite novo no próximo set-plan/webhook. **Verificar no DB de prod antes da Fase 2.**
- [ ] Medir `getDirSize(orgFlávia)` (Fase 1) e confirmar `< limite novo do plano dela` antes de gatear.
- [ ] Remoção de count-gate só afrouxa → seguro em qualquer ordem.
- [ ] Webhook reseta `limits` do plano na troca → a fonte única precisa estar no caminho do webhook (Fase 0).
- [ ] Add-on de storage recorrente tem gate de cobrança ABERTO ([[project_storage_addon]]) — independente
      deste épico, mas o medidor já contabiliza o limite efetivo (base+addon) corretamente.

---

## 5. Fluxo de teste sem pagamento (validação por super admin)
Super admin troca o plano de um usuário de teste → Free → valida 3 GB (medidor + gate macio) →
valida selo na galeria → valida CRM "gostinho" + Ordem de serviço visíveis e tarefas/metas
**bloqueadas-mas-visíveis**. A troca de plano por super admin já existe (`saasAdmin.js` set-plan).
