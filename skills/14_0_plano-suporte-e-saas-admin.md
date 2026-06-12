# Plano — Fala Conosco + Reestruturação do SaaS Admin

> Registrado em 2026-06-12 a pedido do usuário, logo após a conclusão do programa de testes
> (12/12 módulos — ver `skills/00_programa-testes.md`). **Nada aqui foi implementado.**
> São 2 frentes para estudar, decidir e executar nas próximas sessões.
> Contexto: a IA já auditou o app inteiro (todas as abas, rotas e modelos) — este plano usa
> esse conhecimento para mapear o que o painel da plataforma precisa enxergar e controlar.

---

# FRENTE 1 — Fala Conosco / Abrir Chamado (suporte do fotógrafo)

## O problema
Hoje o fotógrafo não tem canal de suporte dentro do app. O manual diz "fale com o suporte"
(ex: upgrade de plano sem Stripe), mas não existe botão. Do outro lado, o superadmin não tem
fila de atendimento — tudo cairia em e-mail/WhatsApp pessoal.

## Opções a estudar (decidir com o usuário ANTES de implementar)
| Opção | Esforço | Prós | Contras |
|---|---|---|---|
| **A. Formulário → e-mail** | Baixo | 1 endpoint + SMTP já existente (Hostinger). Sem UI nova no saas-admin | Sem histórico/status; conversa vaza pro e-mail |
| **B. Chamados no banco (recomendada p/ V1)** | Médio | Model `Ticket` (assunto, categoria, mensagens[], status aberto/em andamento/resolvido); aba "Chamados" no saas-admin; sininho avisa resposta dos 2 lados; métricas de suporte de graça | Mais código; precisa polling/notificação |
| **C. Integração externa (Tawk.to, Crisp, WhatsApp Business)** | Baixo-médio | Chat real-time pronto | Dependência externa, custo, fora do padrão do app, dados fora |

## Esqueleto da opção B (se aprovada)
- **Model `Ticket`:** `organizationId, subject, category (duvida|bug|financeiro|sugestao|outro),
  status (open|pending|resolved), messages[{from: 'photographer'|'admin', text, at, readAt}],
  createdAt/updatedAt`. TTL não — histórico permanente.
- **Fotógrafo:** entrada na aba **Ajuda** (3ª opção da sub-nav: "Fala Conosco") — formulário
  novo chamado + lista dos meus chamados com thread de mensagens. Notificação no sininho
  quando o suporte responde (tipo novo em `Notification`).
- **Superadmin:** aba **Chamados** no saas-admin — fila com filtro por status/categoria,
  badge de não-lidos, responder na thread, mudar status. E-mail opcional ao fotógrafo na resposta
  (`src/utils/email.js` já tem transporter pool).
- **Métricas:** tempo de 1ª resposta, chamados abertos/resolvidos por semana (alimenta o
  dashboard novo do saas-admin — Frente 2).
- Reusar padrões: rotas `authenticateToken`/`requireSuperadmin`, `.lean()`, `req.logger`,
  toasts, tokens CSS. Honey pot não se aplica (rota autenticada).

## Perguntas em aberto (responder antes de codar)
1. Opção A, B ou C? (B dá fundação pra métricas e mantém tudo dentro do app)
2. Fotógrafo anexa imagem no chamado? (print de erro — o upload já existe; útil p/ bugs)
3. E-mail espelhando a thread ou só notificação in-app?
4. SLA/priorização por plano (pro responde primeiro)? Provável V2.

---

# FRENTE 2 — Reestruturação exaustiva + modernização do SaaS Admin

## Estado atual do painel (`saas-admin/`)
- **7 abas:** Organizações (aprovar/desativar/plano/limites/reset site/detalhes), Lixeira,
  Landing Page (editor), Componentes (Site), Tutoriais (CRUD), Manual (criador de blocos —
  intro/callout/steps/imagem + drag&drop), Segurança (honey pot logs).
- **Métricas hoje:** só `/admin/saas/metrics` básico (contagens). Visual datado (dark fixo,
  hexcodes, sem design system), vanilla JS num arquivo só (`saas-admin/js/app.js`, ~2100 linhas).
- **Lacunas estruturais:** sem visão por módulo, sem jornada do cliente, sem suporte, sem
  feature flags por org, sem auditoria de ações do superadmin.

## 2.1 O que o SaaS admin precisa VER de cada módulo (telemetria por org e agregada)

| Módulo do app | O superadmin precisa ver |
|---|---|
| **Dashboard/Onboarding** | Funil de onboarding por org (criou sessão? subiu foto? enviou link?) — onde os novos fotógrafos travam; % que completa em 7 dias |
| **Sessões** | Nº de sessões por modo (selection/gallery/multi), por status, fotos subidas, storage, taxa de entrega, tempo médio criação→entrega; sessões "paradas" (criadas sem upload há X dias = sinal de churn) |
| **Clientes/Gestão (Rhyno)** | Volume de clientes finais por org; status da integração Rhyno (SSO ok? API respondendo?) quando for pra produção |
| **Mensagens/Site** | Contatos recebidos pelo site, depoimentos pendentes, orgs com site publicado vs rascunho, tema usado |
| **Domínio** | Domínios customizados: pending/verified, falhas de DNS, SSL |
| **Integrações** | Quem ligou GA/Pixel (adoção de feature) |
| **Marketing/Vendas** | Orgs com lembrete/escassês ativos, cupons emitidos/convertidos na plataforma toda (receita gerada pro fotógrafo = argumento de retenção) |
| **Perfil** | Marca d'água configurada? Logo subido? (proxy de engajamento) |
| **Plano/Billing** | MRR, distribuição free/basic/pro, orgs perto do limite (candidatas a upgrade!), uso de storage por org (custo) |
| **Ajuda** | Tutoriais mais vistos (precisa instrumentar), seções do manual mais abertas, chamados (Frente 1) |
| **Configurações** | Adoção de templates customizados vs padrão |

## 2.2 O que o SaaS admin precisa PERSONALIZAR por módulo (controles por org)
- **Já existe:** plano, limites custom (maxSessions/maxPhotos/storage), aprovar/desativar,
  reset do site, template padrão do site, manual global, tutoriais globais, landing.
- **Faltam (candidatos):**
  - Feature flags por org (ex: habilitar V2 multi_instant/álbuns só pra beta testers)
  - Limites de e-mail por plano (pendência antiga do CLAUDE.md)
  - Editar `preferences`/`integrations` de uma org em nome dela (suporte assistido)
  - Impersonação ("entrar como" a org pra debugar — com log de auditoria!)
  - Mensagem global/banner no admin dos fotógrafos (avisos de manutenção)
  - Templates de e-mail da plataforma (boas-vindas etc.) editáveis como o Manual

## 2.3 Jornada do cliente ("cada passo do cliente no app")
O pedido central do usuário: **saber cada passo do fotógrafo dentro do app.**
- **Fundação:** model `ActivityEvent` (`organizationId, userId, type, meta, at`) + helper
  `trackEvent()` chamado nos pontos-chave (login, criou sessão, subiu fotos, enviou link,
  cliente acessou, entregou, configurou X). Muita coisa JÁ existe espalhada
  (`Session.events[]`, `onboarding.steps`, timestamps codeSentAt/deliveredAt) — o trabalho é
  AGREGAR num lugar só, não recomeçar.
- **Visualização:** na página da org no saas-admin, uma timeline ("dia 1 cadastrou → dia 2
  criou sessão → dia 5 entregou") + métricas de saúde (último login, sessões/mês, tendência).
- **Score de saúde/churn:** verde (ativo), amarelo (sem atividade 14d), vermelho (30d+) —
  lista "orgs em risco" no topo do dashboard.
- ⚠️ Cuidado LGPD: rastrear AÇÕES no produto (ok, legítimo interesse) ≠ conteúdo das fotos.

## 2.4 Modernização visual/técnica
- Migrar pro **design system** do app (tokens `--ad-*`, dual theme, Inter/Playfair) — hoje o
  saas-admin é dark fixo com hexcodes soltos.
- Quebrar `saas-admin/js/app.js` (~2100 linhas) no padrão das tabs do admin
  (`saas-admin/js/tabs/<modulo>.js`, ES Modules).
- Dashboard inicial novo: KPIs da plataforma (orgs ativas, MRR, storage total, sessões/semana,
  chamados abertos) + lista de orgs em risco + últimos cadastros.
- Auditoria: log de toda ação do superadmin (aprovar, mudar plano, impersonar).

## 2.5 Fases propostas (ordem de execução sugerida)
1. **Estudo & decisão** (1 sessão): usuário responde as perguntas da Frente 1 + prioriza os
   itens 2.1–2.4; definir o que é V1 do painel novo.
2. **Fundação de dados**: `ActivityEvent` + `trackEvent()` nos pontos-chave + agregadores
   (sem UI ainda — os dados começam a acumular cedo).
3. **Fala Conosco** (Frente 1, opção escolhida) — entrega valor imediato ao fotógrafo real.
4. **SaaS Admin v2 — estrutura**: split em módulos + design system + dashboard novo.
5. **SaaS Admin v2 — por módulo**: páginas de org com telemetria/jornada/controles (tabela 2.1/2.2).
6. **Polimento + testes E2E** do painel novo (mesmo método do programa: exaustivo, specs em
   `tests/local/`, superadmin local `admin@cliquezoom.com.br`).

## Riscos/observações
- Produção tem a Flávia — instrumentação (`trackEvent`) deve ser fire-and-forget e nunca
  quebrar fluxo existente.
- Não confundir com a integração Rhyno (pausada, handoff `skills/9_0`) — o CRM dos CLIENTES
  FINAIS é o Rhyno; o SaaS admin cuida dos FOTÓGRAFOS (tenants).
- O Criador de Manual e o de Tutoriais já são "personalização global" funcionando — usar como
  referência de UX para os novos editores.
