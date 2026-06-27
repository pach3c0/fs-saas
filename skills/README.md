# Skills — Índice da Documentação Técnica

Documentação de referência do **CliqueZoom**. Organizada por tema; prefixos numéricos são históricos.

> Última faxina: 2026-06-26 — root reorganizado (51 → 38 arquivos), 10 históricos em `archive/`.

---

## 🟢 Padrões & Referência (ler ao codar)

| Arquivo | Quando ler |
|---|---|
| [`1_1_backend.md`](1_1_backend.md) | Criar rotas, middlewares, serviços, lógica de negócio (Express/Mongo/CommonJS) |
| [`1_2_frontend.md`](1_2_frontend.md) | Alterar UI/CSS/componentes do admin (Vanilla JS, tokens CSS, sem Tailwind nas tabs) |
| [`1_3_banco-de-dados.md`](1_3_banco-de-dados.md) | Modelos, queries, `.lean()`, padrões de schema |
| [`1_4_builder-componentes.md`](1_4_builder-componentes.md) | Biblioteca oficial de componentes do site builder |
| [`1_6_testes.md`](1_6_testes.md) | Padrões de QA e testes (Playwright) |
| [`1_7_design_system_morph_e_fontes.md`](1_7_design_system_morph_e_fontes.md) | Design system: morph/dark/tipografia (admin + Rhyno) |
| [`3_0_payment-gateway.md`](3_0_payment-gateway.md) | Pagamentos/checkout/assinatura — Mercado Pago (Stripe descontinuado) |
| [`7_0_desenvolvimento-local.md`](7_0_desenvolvimento-local.md) | Subir o app/testes localmente (workflow seguro) |
| [`17_0_refatoracao-wizard-ux.md`](17_0_refatoracao-wizard-ux.md) | Padrão de botão pílula sempre expandida (wizard de sessões) |
| [`18_0_ux_cards_alinhamento.md`](18_0_ux_cards_alinhamento.md) | Cards left-aligned + botões glow-pill (padrão atual do admin) |

---

## 🔵 Módulos do Admin (série canônica)

Um arquivo por aba do painel — visão técnica + E2E + roteiro de vídeo.

| Aba | Arquivo | E2E |
|---|---|---|
| Dashboard | [`01_dashboard.md`](01_dashboard.md) | ✅ |
| Sessões | [`02_sessoes.md`](02_sessoes.md) | ✅ |
| Clientes *(CRM migrou pro Rhyno — ver Gestão)* | [`03_clientes.md`](03_clientes.md) | ✅ |
| Mensagens | [`04_mensagens.md`](04_mensagens.md) | ✅ 14 testes |
| Gestão (ERP Rhyno via iframe+SSO) | [`05_gestao.md`](05_gestao.md) | ✅ 7 testes |
| Meu Site (builder) | [`06_meu-site.md`](06_meu-site.md) | ✅ 21 testes |
| Domínio | [`07_dominio.md`](07_dominio.md) | ✅ |
| Integrações | [`08_integracoes.md`](08_integracoes.md) | ✅ |
| Marketing | [`09_marketing.md`](09_marketing.md) | ✅ |
| Perfil & Configurações | [`10_perfil-e-configuracoes.md`](10_perfil-e-configuracoes.md) | ✅ 15+10 testes |
| Plano | [`11_plano.md`](11_plano.md) | ✅ |
| Ajuda | [`12_ajuda.md`](12_ajuda.md) | ✅ |
| Fala Conosco + SaaS Admin | [`14_0_plano-suporte-e-saas-admin.md`](14_0_plano-suporte-e-saas-admin.md) | — |

---

## 🏗️ Rhyno ERP

| Arquivo | Conteúdo |
|---|---|
| [`16_0_refatoracao-crm-gestao.md`](16_0_refatoracao-crm-gestao.md) | Guia de refatoração do módulo CRM (`ERP1/`) para o DS unificado |

---

## 🔮 Backlog & Visões V2 (não implementar sem pedido explícito)

| Arquivo | Ideia |
|---|---|
| [`3_1_prova-album.md`](3_1_prova-album.md) | Prova de álbum (proofing) |
| [`5_0_visao-tether-desktop.md`](5_0_visao-tether-desktop.md) | Extensão desktop com tethering ao vivo (Capture) |
| [`5_1_visao-face-search.md`](5_1_visao-face-search.md) | Busca por rosto na galeria (face search / Triagem) |

---

## 🚀 Lançamento & Go-to-Market (crítico — não arquivar)

| Arquivo | Conteúdo | Status |
|---|---|---|
| [`27_0_master-roadmap-lancamento.md`](27_0_master-roadmap-lancamento.md) | Épicos A/B/C — caminho crítico do lançamento | ✅ Aprovado |
| [`28_0_planilha-planos-features.md`](28_0_planilha-planos-features.md) | Matriz Plano × Feature (Free/Basic/Pro/Studio) | ✅ Fechado |
| [`26_0_modelo-financeiro-recomendado.md`](26_0_modelo-financeiro-recomendado.md) | Cobrança: anual, add-ons, PreApproval avulsa | ✅ Recomendado |
| [`29_0_arquitetura-planos-medidor.md`](29_0_arquitetura-planos-medidor.md) | Schema e motor de medição de storage por plano | ⚙️ Em implementação |
| [`30_0_handoff-planos-fase3.md`](30_0_handoff-planos-fase3.md) | Instruções executivas da Fase 3 dos planos | 🔴 Ativo |
| [`25_0_mercadopago-checkout-fotografo.md`](25_0_mercadopago-checkout-fotografo.md) | Marketplace descentralizado OAuth (fotógrafo cobra cliente) | 📋 Design — pós-A1 |
| [`roadmap-ajustes.md`](roadmap-ajustes.md) | Plano detalhado dos 11 itens bloqueadores de lançamento | 🔴 Ativo |
| [`checklist-validacao-ajustes.md`](checklist-validacao-ajustes.md) | Checklist E2E do roadmap-ajustes | 🔴 Ativo |

---

## 🛠️ Ferramentas de Projeto

| Arquivo | Conteúdo |
|---|---|
| [`8_1_handoff-programa-testes.md`](8_1_handoff-programa-testes.md) | Rastreamento do programa de testes E2E (12 módulos) |
| [`24_0_guia-criar-manual.md`](24_0_guia-criar-manual.md) | Padrão para criar módulos do Manual do Usuário e publicar |

---

## 📦 Arquivo Histórico (`archive/`)

Handoffs de features já entregues e pesquisas do passado. Consultar só para contexto histórico.

| Arquivo | Tema |
|---|---|
| `historico_entregas.md` | Changelog consolidado (Mai–Jun 2026) |
| `9_0_handoff-rhyno-integracao.md` | POC da integração Rhyno (Jun/10 → live Jun/15) |
| `10_1_handoff-varredura-qualidade.md` | Varredura hexcodes→tokens / console→logger (Jun/18) |
| `15_0_handoff-toolkit-operacao.md` | Toolkit SaaS Admin (Jun/12) |
| `19_0_handoff-auto-inscricao-qr-precos.md` | Auto-inscrição QR + tabela de preços (Jun/20) |
| `20_0_plano-cliquezoom-triagem.md` | Plano v0 da Triagem facial (repo próprio) |
| `21_0_comparativo-alboom-proof.md` | Análise concorrente Alboom (Jun/25) |
| `22_0_handoff-agente-saas-admin.md` | Agente IA SaaS Admin — v1 (substituído por live em prod) |
| `23_0_handoff-ajustes-gerais.md` | Aba dedicada Marca D'água (commit 5610e55) |
| `8_0_handoff-sessoes-ondas.md` | Sessões: ondas 1–4 de polimento (Mai/2026) |
