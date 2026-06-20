# Histórico de Implementações e Entregas (Até o Momento)

Este documento consolida tudo o que foi planejado, codificado e finalizado nesta rodada de desenvolvimento, para que o status do projeto fique claro antes de avançarmos para a próxima etapa.

## 1. Migração de Pagamento (Stripe → Mercado Pago)
**Status:** ✅ Concluído
**Arquivos Afetados:** `src/routes/billing.js`, `.env`
* **Remoção do Stripe:** Todo o código legado do Stripe (webhooks, checkouts) foi limpo e removido para evitar lixo no código.
* **Integração Mercado Pago (Assinaturas):** Implementamos a rota `POST /api/billing/checkout` consumindo a API de `preapproval` (Assinaturas) do Mercado Pago.
* **Dinâmica de Planos:** O sistema agora lê dinamicamente a tabela estática de planos (`src/models/plans.js`) e gera o link de assinatura (com cobrança recorrente via cartão) de acordo com o plano escolhido (Basic ou Pro).
* **Campos Mapeados:** A URL gerada (`init_point`) já recebe o e-mail do fotógrafo (`payer_email`) e a URL de retorno (`back_url`) para redirecioná-lo de volta ao painel após o pagamento.

## 2. Backend: Banco de Dados (Modelagem de Organização)
**Status:** ✅ Concluído
**Arquivos Afetados:** `src/models/Organization.js`, `src/routes/organization.js`
* **Novo Schema de Onboarding:** Adicionamos o objeto `onboarding` na coleção da Organização no MongoDB, contendo a estrutura de acompanhamento de passos (`sessionCreated`, `photosUploaded`, `clientLinked`, `linkSent`), o passo atual do guia (`guidedStep`) e um booleano de escape (`skipped`).
* **Nova API de Persistência:** Criamos a rota `POST /api/organization/onboarding` para que o painel do fotógrafo consiga salvar em tempo real o que já foi configurado, sem precisar recarregar a tela.

## 3. Painel do Fotógrafo: Vitrine de Serviços Extras (Upsell)
**Status:** ✅ Concluído
**Arquivos Afetados:** `admin/js/tabs/ajuda.js`
* **Adequação Estratégica:** Em vez de forçar um pop-up de "tour" na tela inicial, seguimos a referência de negócio do Bling ERP, transformando a "Implantação Guiada" em um **produto (serviço extra)** a ser vendido para novos fotógrafos.
* **Nova Sub-Aba:** Injetamos uma nova aba **"Serviços Extras"** no módulo de Ajuda & Tutoriais (`ajuda.js`).
* **UI/UX do Card:** Desenhamos o card de venda do serviço de **Implantação Guiada**, descrevendo que é um treinamento online exclusivo de 2h com um especialista, cobrando o valor sugerido de **R$ 300,00**.
* **Fluxo de Contratação (Lead):** O botão de contratação envia o fotógrafo direto para o **WhatsApp da sua equipe (Rhyno System)**, com uma mensagem pré-formatada. Dessa forma, vocês conseguem dar o atendimento humano e converter o serviço com mais facilidade.

---

> [!NOTE]
> Todos esses códigos já estão aplicados na pasta do seu projeto local. O painel do fotógrafo já está refletindo as mudanças estéticas na aba Ajuda e o servidor Node já está servindo as novas rotas. Se precisar deste arquivo na pasta `skills`, me avise que eu transfiro!

---

## 4. Histórico V1 — Entregas Consolidadas (migrado do CLAUDE.md em 2026-06-19)

### ✅ Auditoria de 7 dias
- **Dia 1** — Limpeza estrutural: removidos 7 arquivos de código morto
- **Dia 2** — Auditoria backend: todos os 126 endpoints auditados. Bug fix deployado (commit `93631af`)
- **Dia 3** — Auditoria frontend: Dashboard ✅, Sessões ✅ (wizard + Ondas 1–4)

### ✅ Backend completo
- 16 rotas, 126 endpoints, todos ativos
- Email: SMTP Hostinger funcionando, fix do bug de credenciais do PM2
- Segurança: honey pot, rate limiting, logs anti-bot (TTL 30d)
- CRM: automação de vendas (escassez por prazo), reativação por `nextContactDate` com e-mail + fotos do último evento

### ✅ Admin completo
- 19 tabs funcionais (1 oculta para V2 — `albuns-prova.js`)
- Site público: 5 temas, builder visual, domínio customizado

### ✅ Sessões — Wizard Guiado (2026-05-23)
Refatoração UX completa — **5 passos** (IDs 1, 2, 4, 5, 6; passo 3 fundido ao 2):

| # | Passo | Conclusão |
|---|-------|-----------|
| 1 | Upload | `uploadsCompletedAt` |
| 2 | Compartilhar | `codeSentAt` (ou ≥ 1 participante em multi) |
| 4 | Acompanhar | `selectionSubmittedAt` — pulado em gallery |
| 5 | Editadas | todas selecionadas com `urlOriginal` — pulado em gallery |
| 6 | Entregar | `deliveredAt` (embutido no 5 em `selection`/`multi`) |

- Cards sem botões — clique abre wizard fullscreen
- Novos campos Session: `uploadsCompletedAt`, `codeViewedAt`, `showDeliveryQueuePosition`
- Novos endpoints: `/complete-uploads`, `/view-code`, `send-code` com `channel`
- WhatsApp via `wa.me` com templates por `eventType` (11 tipos)
- `openOverlayModal` — evita stacking context com modais antigos
- Ver detalhes: `skills/02_sessoes.md` e `skills/8_0_handoff-sessoes-ondas.md`

### ✅ Ondas de Polimento (Sessões)
- **Onda 1 — Bugs:** PWA `isSelectionMode` pós-submit; download Lightroom `.txt` com `?token=`; foto cortesia com badge `★` no admin e cliente
- **Onda 2 — Polling adaptativo:** `30s` → `10s` → `8s`; Page Visibility API; botão atualizar manual; `stopWizardPolling()`
- **Onda 3 — Comentário com thumb:** thumb 64–84px + filename no admin e cliente
- **Onda 4 — WhatsApp entrega:** `buildWhatsAppDeliveryLink`, `WA_DELIVERY_OPENINGS`, card no passo 6, por participante em multi
- **Onda 5 — Retenção de Storage (2026-06-18):** `storageRetentionUntil`, `storageAutoDelete`, `storageBackupOnExpire`, scheduler diário, download ZIP via `window.open`, ícone 📦 no sininho

### ✅ multi_selection — Página Única (2026-06-19)
- `wizard/multi-single-page.js` (4 seções: Upload, Compartilhar, Acompanhar, Editadas)
- `SINGLE_PAGE_MODES = ['selection','gallery','multi_selection']`
- Participantes: busca no banco (`data.clients`), `+ Cadastrar` abre modal Rhyno, pacote/preço individuais por participante
- Comentários privados por participante (`comment.participantId`) — ✅ testado com 2 usuários
- Reabertura por participante (`participant.reopenRequested`) — ⏳ reteste pendente
- Fix identidade cliente: código da URL tem PRIORIDADE sobre `localStorage`

### ✅ Outras Entregas
- **Dashboard:** refatorado, sessões recentes clicáveis
- **Manual do Usuário:** sub-nav + accordion na aba Ajuda; Sessões, Dashboard, Clientes documentados
- **Criador de Manual (SaaS Admin):** model `ManualModule`, editor visual de blocos, consumido pelo `ajuda.js`
- **CRM Reativação:** `anniversaryAutomator` reescrito para `Client.nextContactDate`; e-mail com até 3 fotos do último evento; toggle por disparo
- **Dimensões reais pós-resize:** badge `WxHpx` no grid admin (Sharp metadata); `Session.photos.width/height`
- **UX da lista de sessões:** badge de tipo de evento; timeline de progresso; nome do cliente clicável; fix crítico de `photoResolution` no payload de criação
- **Notificações globais clicáveis:** roteamento por tipo em `notifications.js`
- **Venda de Domínios Concierge:** RDAP para verificar disponibilidade, `POST /api/tickets` para chamado de interesse
- **Serviços Extras (Ajuda):** catálogo orientado a dados, CTA via WhatsApp, identidade pill verde
- **Varredura de Qualidade (2026-06-18):** hexcodes → tokens CSS nas tabs do builder; `readFileSync` → `require()`; `console.log` → `logger.info`; `new:true` → `returnDocument:'after'`
- **Integração Rhyno (2026-06-15):** SSO live em produção, aba Gestão via iframe, `Session.rhynoCustomerId`, seletor de cliente buscando no Rhyno

### Pendências antes do lançamento ⚠️
- [ ] Validar Onda 4 em produção (WhatsApp entrega)
- [ ] Validar Ondas 1–4 em modo `gallery`
- [ ] Template Padrão — confirmar `PLATFORM_ADMIN_KEY` no runtime do PM2
- [ ] Completar auditoria Dias 4–7
- [ ] Sininho do cliente sem dropdown (múltiplas respostas de fotos diferentes)
- [ ] **Fotos extras por participante** (multi_selection) — próximo passo do handoff ativo
