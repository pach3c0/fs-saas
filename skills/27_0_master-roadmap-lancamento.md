# Master Roadmap — CliqueZoom rumo à divulgação (lançamento)

> **Status:** estrutura APROVADA pelo usuário (2026-06-26). É o roadmap estratégico de alto nível
> do que falta para lançar. Cada tópico será **deep-planejado separadamente** (usuário com créditos
> limitados — não detalhar tudo de uma vez). Próximo deep-plan recomendado: **A1**.
> Tático/curto prazo já tratado em [roadmap-ajustes](roadmap-ajustes.md); modelo de cobrança em [26_0](26_0_modelo-financeiro-recomendado.md).

## Posicionamento (norteia prioridades)
CliqueZoom é foco-fotógrafo, mas "tudo num lugar só": produtos de seleção/galeria + Meu Site (portfólio)
+ Gestão (Rhyno CRM/ERP, finanças empresa+pessoal com botão "misto") + reconhecimento facial (Triagem)
como diferencial. Argumento de venda: o iniciante que mistura conta pessoal e profissional acha tudo integrado.

---

## Ground truth da varredura de código (2026-06-26)

**Pronto / quase pronto (lançável):**
- Produtos de sessão: `gallery`, `selection`, `multi_selection`, `multi_gallery`.
- Auto-inscrição por QR (`/inscrever/:code`).
- Meu Site (builder/portfólio) e Gestão (Rhyno via iframe+SSO, **live em prod**).
- **Pagamentos JÁ wired:** checkout de assinatura (MP PreApproval) + webhook + pagamento de fotos extras + cancelamento + preço custom por org + adicional de storage. Falta credencial **de produção** (hoje sandbox).
- Domínio próprio (DNS + SSL).
- Manual + Tutoriais (~95%): autoria no saas-admin + leitor do fotógrafo OK; falta polir upload de imagem.
- Presença online, e-mail util + schedulers.

**Triagem** (repo separado `~/Documents/ProjetoEstudio/cliquezoom-triagem`): PWA ONNX in-browser
(`det.onnx`/`rec.onnx`), pipeline completo detectar→embedar→clusterizar→casar→revisar→exportar (~1950 linhas),
Fase 0 validada. **Sem nenhuma conexão com a CliqueZoom** (heartbeat/licença é `TODO`; não sobe sessão).

**Greenfield:** planos/tiers + prateleira de produtos (usuário extra, Story, domínio-como-produto,
aprendizado guiado), multi-usuário/convite, sessão "Seleção em Grupo Real Time", chatbot, monitoração de concorrentes.

**Hardening pré-lançamento:** credencial MP de produção; SMTP; **enforcement de limites de plano**
(hoje só exibição, sem 403); UI do sino de notificações; finalizar conteúdo do manual.

---

## Tópicos (epics)

### HORIZONTE A — Caminho crítico para abrir o funil (lançar pago)

| # | Tópico | Complex. | Depende de | Prioridade |
|---|--------|----------|------------|-----------|
| **A1** | **Planos + Prateleira de produtos + Endurecimento do billing** | ALTA | Modelo financeiro (26_0, pronto); "usuário extra" depende de A2 | **#1 — gargalo nomeado pelo usuário** |
| **A2** | **Usuário extra (multi-seat) cross-system** (convite/papel na CliqueZoom **e** provisionar o mesmo usuário na Gestão/Rhyno) | ALTA | Rhyno SSO/provisionamento | #2 se for SKU de lançamento; senão pós-lançamento |
| **A3** | **Hardening pré-lançamento** (MP prod, SMTP, gates de limite, sino, finalizar manual) | MÉDIA (vários pequenos) | gates dependem dos planos de A1 | #3 — paraleliza |

**A1 detalhe-chave:** o endurecimento do billing inclui migrar o checkout de `PreApprovalPlan` (atrelado a plano)
para **`PreApproval` avulsa por org** — resolve de uma vez o gate do storage adicional (roadmap-ajustes item 7)
**e** o preço custom por org (item 11). Mexe na cobrança ao vivo da Flávia → sandbox antes. Regras já decididas em 26_0.

### HORIZONTE B — Produtos diferenciais (pós-core)

| # | Tópico | Complex. | Depende de | Prioridade |
|---|--------|----------|------------|-----------|
| **B1** | **Triagem standalone** — finalizar + conectar (login+plano+heartbeat, hoje TODO) p/ gatear por assinatura | MÉDIA | A1 (gate por plano) + endpoint heartbeat | Alta; paraleliza após A1 |
| **B2** | **Sessão "Seleção em Grupo Real Time"** (Triagem reconhece na base → sobe sessão → cliente acha o próprio rosto). Hook latente = `multi_instant` | MUITO ALTA | B1 + **design spike** "achar meu rosto" | Flagship pós-lançamento |

### HORIZONTE C — Crescimento & operação (a qualquer momento / por último)

| # | Tópico | Prioridade |
|---|--------|-----------|
| **C1** | Chatbot de suporte (RAG sobre o manual) | Pós-lançamento, **só depois do manual completo** |
| **C2** | Monitoração de concorrentes / pesquisa de demanda | Não-bloqueante; **terceirizar** |
| **C3** | Outras ferramentas sugeridas (abaixo) | Avaliar por ROI |

---

## Recomendações nos pontos que o usuário pediu para raciocinar

- **Chatbot (C1):** vale, mas **depois** e com **escopo fechado** (RAG só do manual + modelo barato + cache + fallback "não sei → Fala Conosco"). Plumbing já existe (agente IA do saas-admin; agente Pydantic do Rhyno). Não construir antes do manual completo.
- **Monitoração de concorrentes (C2): NÃO construir no painel.** É trabalho de ferramenta terceira (Search Console, Trends, Ahrefs/Ubersuggest, Meta Ads Library). First-party que vale: **analytics de funil próprio** (origem→ativação→churn), "como nos conheceu?" no cadastro, **SEO** no site/portfólios.
- **Facial — "achar meu rosto" (B2):** **selfie-match no navegador** — cliente tira selfie, o mesmo `rec.onnx` gera o embedding **no device** (ONNX Web), casa contra os embeddings da sessão. Barato (sem GPU servidor) e privado. Pré-requisito: a API de upload da Triagem sobe os **embeddings por foto**.
- **Usuário extra (A2):** modelo já permite N usuários/org, mas falta convite/papel/limite **e** provisionar na Gestão/Rhyno → épico cross-system, não um campo.
- **Outras ferramentas sugeridas:** (1) Contratos + assinatura eletrônica; (2) Agendamento/booking com sinal; (3) Onboarding/ativação guiada (ataca o funil); (4) Indicação/afiliados.

---

## Sequência + dependências

**Quem depende de quem:** A1 ⟸ 26_0 (pronto). A1.usuário-extra ⟸ A2. B1 ⟸ A1 + heartbeat. B2 ⟸ B1 + spike. C1 ⟸ manual completo. Gates de limite (A3) ⟸ planos de A1. **Independentes/a qualquer momento:** A3 (SMTP, sino), B1 (polish do motor), C2/C3.

**Ordem proposta:** **A1** (+ A3 em paralelo) → **A2** (se "usuário extra" for SKU de lançamento) → **B1** → **B2** (após spike) → C pós-lançamento.

**Duas decisões estratégicas do usuário (recomendação em negrito):**
- Escopo do lançamento: **core + planos + pagamento ao vivo, adiando facial/chatbot/seats** — salvo se "usuário extra" tiver de ser SKU já no lançamento (aí A2 sobe ao caminho crítico).
- Timing da Triagem: **conectar/subir a Triagem standalone (B1) logo após A1**, separada do Real-Time (B2).

---

## Próximo passo
Quando o usuário retomar (créditos): **deep-plan do Tópico A1** (Planos + Prateleira + endurecimento de billing), ancorado em 26_0.
