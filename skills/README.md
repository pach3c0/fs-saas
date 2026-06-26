# Skills — Índice da Documentação Técnica

Documentação de referência do **CliqueZoom**. Os prefixos numéricos dos arquivos são
históricos (convivem dois esquemas antigos) — **use as categorias abaixo**, não o número.

> Convenção de novos arquivos: ver [`fluxo.md`](fluxo.md) (padrão de fluxos/diagramas) e
> [`00_manual-usuario.md`](00_manual-usuario.md) (padrão de documentação + manual do usuário).

---

## 🟢 Referências técnicas (ler ao codar)

| Arquivo | Quando ler |
|---|---|
| [`1_1_backend.md`](1_1_backend.md) | Criar rotas, middlewares, serviços, lógica de negócio (Express/Mongo/CommonJS) |
| [`1_2_frontend.md`](1_2_frontend.md) | Alterar UI/CSS/componentes do admin (Vanilla JS, tokens CSS, sem Tailwind nas tabs) |
| [`1_3_banco-de-dados.md`](1_3_banco-de-dados.md) | Modelos, queries, `.lean()`, padrões de schema |
| [`1_4_builder-componentes.md`](1_4_builder-componentes.md) | Biblioteca oficial de componentes do site builder |
| [`1_6_testes.md`](1_6_testes.md) | Padrões de QA e testes |
| [`1_7_design_system_morph_e_fontes.md`](1_7_design_system_morph_e_fontes.md) | Design system: animação morph e consistência de fontes |
| [`7_0_desenvolvimento-local.md`](7_0_desenvolvimento-local.md) | Subir o app/testes localmente (workflow seguro) |
| [`24_0_guia-criar-manual.md`](24_0_guia-criar-manual.md) | Criar um módulo do **Manual do Usuário** (seed) e publicar (beta → produção) |
| [`3_0_payment-gateway.md`](3_0_payment-gateway.md) | Pagamentos/checkout/assinatura — referência para a monetização (Mercado Pago) |

## 🔵 Documentação por módulo do Admin (série canônica)

Um arquivo por aba do painel — visão técnica + manual + roteiro de vídeo.

| Aba | Arquivo |
|---|---|
| Dashboard | [`01_dashboard.md`](01_dashboard.md) |
| Sessões | [`02_sessoes.md`](02_sessoes.md) |
| Clientes | [`03_clientes.md`](03_clientes.md) |
| Mensagens | [`04_mensagens.md`](04_mensagens.md) |
| Gestão (ERP Rhyno) | [`05_gestao.md`](05_gestao.md) |
| Meu Site (builder) | [`06_meu-site.md`](06_meu-site.md) |
| Domínio | [`07_dominio.md`](07_dominio.md) |
| Integrações | [`08_integracoes.md`](08_integracoes.md) |
| Marketing | [`09_marketing.md`](09_marketing.md) |
| Perfil | [`10_perfil.md`](10_perfil.md) |
| Plano | [`11_plano.md`](11_plano.md) |
| Ajuda | [`12_ajuda.md`](12_ajuda.md) |
| Configurações | [`13_configuracoes.md`](13_configuracoes.md) |
| Fala Conosco + SaaS Admin v2 | [`14_0_plano-suporte-e-saas-admin.md`](14_0_plano-suporte-e-saas-admin.md) |

## 🧪 Programa de testes

| Arquivo | Conteúdo |
|---|---|
| [`00_programa-testes.md`](00_programa-testes.md) | Índice/tracking vivo do programa de testes exaustivos + manuais + roteiros |
| [`00_manual-usuario.md`](00_manual-usuario.md) | Padrão de documentação e do Manual do Usuário |

## 📦 Handoffs (histórico de entregas)

| Arquivo | Tema |
|---|---|
| [`8_0_handoff-sessoes-ondas.md`](8_0_handoff-sessoes-ondas.md) | Sessões — ondas de polimento (2026-05) |
| [`8_1_handoff-programa-testes.md`](8_1_handoff-programa-testes.md) | Programa de testes (2026-06-10) |
| [`9_0_handoff-rhyno-integracao.md`](9_0_handoff-rhyno-integracao.md) | Integração CliqueZoom ↔ Rhyno (ERP/CRM) |
| [`15_0_handoff-toolkit-operacao.md`](15_0_handoff-toolkit-operacao.md) | Toolkit de operação do SaaS Admin (2026-06-12) |
| [`22_0_handoff-agente-saas-admin.md`](22_0_handoff-agente-saas-admin.md) | Agente IA de operação (chat read-only + digest + custo/uso) — LIVE 2026-06-25 |
| [`historico_entregas.md`](historico_entregas.md) | Changelog consolidado de entregas |

## 🔮 Visões V2 (futuro — NÃO implementar até o usuário pedir)

| Arquivo | Ideia |
|---|---|
| [`3_1_prova-album.md`](3_1_prova-album.md) | Prova de álbum (proofing) |
| [`5_0_visao-tether-desktop.md`](5_0_visao-tether-desktop.md) | Extensão desktop com tethering ao vivo (Capture) |
| [`5_1_visao-face-search.md`](5_1_visao-face-search.md) | Busca por rosto na galeria (face search) |

## 📝 Notas soltas

- [`ajustes.md`](ajustes.md) — rascunho de pequenos ajustes pendentes (revisar e migrar para CLAUDE.md ou issues).

---

> **Limpeza 2026-06-15:** removida a série antiga já substituída (builder `5_x`, CRM `4_x`,
> `2_0`/`3_0`/`3_2`, login/landing/domínio antigos) e material de estudo genérico (`duvidas.md`,
> `estudoarquitetura.md`). Histórico preservado no git. Pasta: 61 → 34 arquivos.
