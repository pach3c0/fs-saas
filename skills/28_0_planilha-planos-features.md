# Planilha de Planos × Features — worksheet de design dos planos

> **Status:** worksheet em construção (2026-06-26). É a "planilha" que o usuário quer: mapear
> CADA ferramenta da plataforma e marcar quem cada plano libera. Nada fechado — células com `?`
> são decisões a tomar. Insumo central do deep-plan do **A1** ([27_0](27_0_master-roadmap-lancamento.md));
> regras de cobrança em [26_0](26_0_modelo-financeiro-recomendado.md).

**Legenda:** ✓ incluído · — não tem · ➕ add-on pago · `nº` quantidade · `?` a decidir.

**Planos (colunas — DEFINIDOS 2026-06-26):** Free · Basic · Pro · Studio · Sob medida.

---

## DECISÃO ESTRATÉGICA #1 — Pagamento por sessão & comissão (ortogonal aos planos)

A ferramenta principal é **seleção**. A CliqueZoom pode ganhar **comissão** quando o fotógrafo
opta por receber **via plataforma** (split Mercado Pago — ver [25_0](25_0_mercadopago-checkout-fotografo.md)).

**Regra de design (não é gate de plano — é escolha por sessão):**
- **Padrão = "por fora"** (como hoje): o fotógrafo negocia o pagamento direto com o cliente, **sem comissão**. Mantém-se pra ele **nunca sentir que está preso** ("já pago mensal, por que pagar comissão?").
- **Opção = "via plataforma"** (CliqueZoom ganha comissão): escolha **opt-in, com vantagens**:
  - Entrega **instantânea** se as fotos já estiverem editadas.
  - Sub-escolha de **quando cobrar**: (a) **após a seleção** (cliente confirma+paga antes → fotógrafo só edita o que foi escolhido e pago) ou (b) **após a entrega**.
- Cada fotógrafo trabalha diferente → as opções existem pra respeitar o fluxo dele.
- **Consequência de plano:** por isso **todas as ferramentas de seleção ficam em TODOS os planos** — quanto mais gente usando, maior a superfície de comissão. Seleção **não** é alavanca de diferenciação entre planos.
- 🔮 Alavanca futura possível: comissão menor em planos mais altos (incentivo a subir). A decidir.

**Trava da escolha (decisão do usuário):** o método é escolhido **na criação da sessão e travado**, pra impedir o "drible" — escolher via plataforma, deixar o cliente selecionar tudo, e trocar pra "por fora" no fim só pra fugir da comissão. As vantagens (automação, entrega instantânea, cobrar após seleção/entrega) **só funcionam de ponta a ponta se o método for "via plataforma" desde o início** — não existe meio-a-meio (só gera retrabalho, não beneficia ninguém). Lógica: "legais, mas não bobos" — a plataforma precisa faturar; o fotógrafo pode cobrar por fora sem pressão, mas decide ANTES se abre mão da comissão.

**Refinamentos (recomendação minha):**
- **Default = "por fora"** → a escolha não adiciona fricção pra maioria e mantém a promessa de "sem pressão"; só quem quer a vantagem escolhe ativamente "via plataforma".
- **Trava assimétrica (opcional):** permitir mudar PARA "via plataforma" antes do cliente pagar (upgrade que gera comissão), mas bloquear o caminho inverso (a fuga). Mesma proteção, mais flexível. Alternativa: trava dura nos dois sentidos (mais simples) — escolha do usuário.

**⚠️ Dependência de implementação:** "via plataforma" = o **checkout marketplace descentralizado** (fotógrafo conecta a conta MP dele via OAuth; CliqueZoom retém `application_fee`) — especificado em [25_0](25_0_mercadopago-checkout-fotografo.md), **ainda NÃO construído**. Logo, a escolha de pagamento por sessão é um **sub-projeto considerável dentro do A1**, não um toggle.

---

## DECISÃO ESTRATÉGICA #2 — Usuário extra (assentos)

- **Não** é o diferencial de aquisição (esse é o tudo-num-lugar-só); é **receita de expansão**.
- **Iniciante fica solo (1 usuário)** — solo não usa 2º assento, e cada assento custa dobrado pra você (vale também na Gestão/Rhyno).
- **Assentos escalam por tier**; assento adicional é **add-on recorrente** (linha própria, ver 26_0) **a partir do Pro**.
- Cada assento = também um assento na **Gestão/Rhyno** (cross-system) → precificar cobrindo os dois.
- **✅ DEFINIDO (2026-06-26):** Free **1** · Basic **1** · Pro **2** · Studio **3** assentos inclusos. Assento adicional = add-on recorrente do **Pro pra cima** (~R$29–39/assento, cobrindo o espelho no Rhyno).

---

## DECISÃO ESTRATÉGICA #3 — Alta resolução LIBERADA + storage como motor (gatilho de saturação)

> Insight do usuário (2026-06-26). É a tese central que faz o **storage virar o meter de receita**.

**Contraste com o concorrente (Pic-Time):** o plano de entrada dele **limita a resolução a 1080px**
com ~20GB. Resultado: a foto é pequena, o storage **nunca satura** → o fotógrafo fica preso/confortável
naquele plano e não evolui. Isso é segurar o cliente **capando o valor entregue**.

**Decisão CliqueZoom — o oposto, de propósito:** **liberar alta resolução já no plano de entrada.**
- É **diferencial de aquisição**: "que fotógrafo iniciante não quer entregar em alta?" Exemplo real: a Flávia entrega em ~5000px desde sempre.
- Compressão posterior (WhatsApp/Drive quando o cliente final repassa) **não é problema nosso** — o que entregamos é a alta.
- **Consequência intencional:** alta resolução **consome muito mais o storage incluso** → o storage passa a ser o **motor de receita** (o meter principal dos planos), não a resolução.

**Gatilho de saturação (mecanismo INVISÍVEL de upgrade):** quando o storage enche, o fotógrafo escolhe entre
(a) **comprar add-on de storage** ou (b) **pular de plano**. O usuário **não quer que ele perceba o mecanismo** — quer que ele **sinta a necessidade de avançar**. O valor entregue (alta) é genuíno; o gate é o **consumo real**, não uma trava artificial. Princípio: *"legais, mas não bobos"*.

**Economia desenhada pra empurrar a evolução (precificação — detalhe em [26_0](26_0_modelo-financeiro-recomendado.md)):**
- O add-on é **vantajoso no 1º momento**, mas o teto de cada plano + o preço do add-on devem fazer com que, **a partir do 2º/3º add-on**, pular de plano fique **mais barato** que continuar somando avulsos.
- **Cada plano superior também tem teto** → a necessidade reaparece um degrau acima (escada de evolução contínua).

**Extensão futura (próximo ano) — vínculo Sessão ↔ CRM como driver de storage + reengajamento:**
- Manter sessões antigas **vivas (não deletadas)** = fotos seguem consumindo storage (mais receita) **E** viram base pro reengajamento.
- Estratégia de aniversário: *"há 1 ano você fez esse ensaio — vamos relembrar?"* dispara reativação do cliente. Anedota real do usuário: clientes da Flávia (até de 2 anos atrás) **voltaram a fechar** via CRM; a foto enviada serve de prova de identidade ("não é golpe"). Já existe scheduler `anniversary` no back — gancho pronto.
- A maioria dos fotógrafos **não tem essa ideia** → vender isso é educá-los a usar o CRM (gostinho do tudo-num-lugar-só).
- **Contraponto do próprio usuário** ("vale segurar 3GB um ano só pra usar depois?") → produto/opção de **otimização de sessão**: guardar só as ~5 melhores fotos pro CRM (reduz storage do cauteloso, **mantém o gancho de reengajamento**). Vira um SKU/feature, não obrigação.

> Implicação na planilha: **entrega em alta limpa (sem marca na foto) é ✓ em TODOS os planos, incluindo o Free**
> (decisão 2026-06-26 — carimbar a foto capava qualidade e ia contra a tese). A diferenciação do Free é o **selo
> "powered by CliqueZoom" na galeria** (some ao assinar). O degrau de plano em Sessões é **storage/volume**, não resolução.

---

## ÂNCORAS DE MERCADO + estrutura de tiers (straw-man firmado, 2026-06-26)

Pesquisa do usuário (concorrentes BR/intl). Liga com [21_0](21_0_comparativo-alboom.md) / memória `project_comparativo_alboom`.

**Dois blocos de concorrentes:**
- **Bloco 1 — entrega/seleção privada (assinatura por storage):** Pixieset, Pic-Time, **Alboom Proof** (gigante nacional, hoje cobra PURO por GB — mesmo modelo que desenhamos), Selpics (créditos por nº de fotos, pagamento único — confuso pra prever custo fixo). **É onde a CliqueZoom compete de frente.**
- **Bloco 2 — venda pública de fotos (zero mensalidade + comissão 9–15%):** Banlek, Fotto, **Fotop**. Esporte/corrida/balada, galeria pública, reconhecimento facial/numérico, cliente final compra foto avulsa. O fotógrafo de casamento/família **odeia** esse modelo (já cobrou o pacote, não quer comissão por cima).

**🎯 Insight de posicionamento:** o **Bloco 2 É o modelo da Decisão #1 "via plataforma" (comissão)** — e é o lar natural do **B2 (Seleção em Grupo Real Time / selfie-match)**. A comissão não é bolt-on especulativo: é o modelo DOMINANTE e provado do nicho evento/público. A CliqueZoom pode cobrir **os dois blocos numa só plataforma** (assinatura pro contratado/privado + comissão opt-in pro público/evento) — coisa que nem Alboom/Pixieset (só Bloco 1) nem Fotop (só Bloco 2) fazem. **Valida Decisão #1 E B2 de uma vez.**

**Âncoras de preço (mercado, ~câmbio R$5,5/US$):**
| Concorrente | Entrada | Meio | Topo |
|---|---|---|---|
| Alboom Proof | **5GB R$39** | 20GB R$79 · 70GB R$119 · 200GB R$179 | 500GB R$299 · 1TB R$599 |
| Pixieset/Pic-Time | ~10GB ~R$45–55 | 100GB ~R$90–140 | 1TB/ilimitado ~R$220–280 |
| **CliqueZoom (DEFINIDO)** | **20GB R$39** | **150GB R$119** | **600GB R$249** |

**Leituras:**
- **R$39 = âncora de entrada validada** (Alboom). 20GB por R$39 = **4× o Alboom**, custa ~R$1,40 de Contabo → plano de entrada humilha o concorrente. Generosidade no entry = **arma de aquisição** (estamos ENTRANDO, precisamos puxar usuário do Alboom).
- **⚠️ Refinamento (corrige o straw-man):** generoso no ENTRY, mas **NÃO** 2–4× mais barato no Pro/topo. Alboom cobra R$179/200GB; 150GB por R$89 deixa ARPU na mesa. No topo, **igualar-e-bater de leve** já dá liderança de valor e **colhe** o comprometido. **Entry = wedge; topo = colheita.** (Reprecificar Pro/Studio pra cima.)
- **Tradeoff:** 20GB satura mais devagar que os 5GB do Alboom → gatilho de saturação dispara mais tarde. Bom na aquisição; dá pra apertar depois ou manter como wedge.

**Regra de cruzamento dos add-ons (firmada):** preço de **2–3 add-ons ≈ preço do próximo plano**, e o próximo plano entrega **muito mais GB incluso + features**. Calibrar o cruzamento no 2º/3º pacote.

---

## ✅ TIERS DEFINIDOS (decisão do usuário, 2026-06-26)

4 planos: **Free · Basic · Pro · Studio** (+ "Sob medida" sob consulta).

| Plano | Mensal | Storage | Custo Contabo | vs Alboom |
|---|---|---|---|---|
| Free | R$0 | 3 GB (entrega limpa + selo CliqueZoom) | ~R$0,20 | — |
| Basic | **R$39** | **20 GB** | ~R$1,40 | Alboom: 5GB → **4× mais** |
| Pro | **R$119** | **150 GB** | ~R$10 | Alboom: 70GB → **2× mais** |
| Studio | **R$249** | **600 GB** | ~R$42 | Alboom: 500GB/R$299 → **+GB, −R$60** |

**Add-ons de storage (aprovados):** +50GB **R$19** · +100GB **R$35** · +250GB **R$69** — linha recorrente própria (ver [26_0](26_0_modelo-financeiro-recomendado.md)).

**Notas:**
- CliqueZoom é **líder de GB-por-real** em todos os tiers vs Alboom → arma de aquisição.
- **Free NÃO carimba a foto** (decisão 2026-06-26): entrega limpa em alta também; a diferenciação é o **selo "powered by CliqueZoom" na galeria**, que **some ao assinar o Basic**. Carimbar a foto capava qualidade (o que criticamos no Pic-Time) e empurraria o iniciante pro Pixieset no teste; o selo mantém o cara dentro + divulga + ele gera **comissão** quando cobra via plataforma. O 3GB (~1 sessão em alta) já é o gate duro Free→Basic.
- A puxada Basic→Pro→Studio vem de **features + headroom + fatura simples**; o add-on (margem ~80%) é receita paralela bem-vinda, não rival do upgrade.
- ✅ **Definidos:** medidor único (storage, sessões ∞), seats, escopo de Gestão/Meu Site e Triagem (ver tabelas abaixo).

---

## 🚀 PRIORIDADES DE LANÇAMENTO (veredito do usuário, 2026-06-26)

O usuário concluiu que está **perto do lançamento** e CORTOU escopo pra não enrolar (2026-06-26). Os **2 gates** que sobram:
1. **💳 Pagamento / o gate** — validar o Mercado Pago ponta a ponta + credencial de **produção** + endurecimento do billing (PreApproval avulsa). É o portão técnico do lançamento (A1).
2. **🎂 Widget de reengajamento de aniversário** — fazer **de fato**. É onde o fotógrafo segura sessões vivas e gasta mais storage (alimenta o motor) — e a melhor história de venda. Scheduler `anniversary` já existe no back.

**❌ Saiu do caminho crítico (decisão 2026-06-26):** **criar templates premium**. O usuário decidiu **lançar com os templates que já existem, liberados pra TODOS os planos**, e **documentar** a criação de templates premium como trabalho **futuro** ("vamos usar o que já tem, não vamos perder tempo agora"). Premium deixa de ser gate de lançamento.

Tudo o mais (Triagem 100% completa, Real-Time, chatbot, seats avançados, templates premium) é **pós-lançamento**.

---

## MÓDULO: SESSÕES (ferramentas de seleção/entrega)

| Feature | Free | Basic | Pro | Studio | Sob medida |
|---|---|---|---|---|---|
| Galeria (`gallery`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Galeria em grupo (`multi_gallery`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seleção (`selection`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seleção em grupo (`multi_selection`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seleção em Grupo Real Time (B2) | — | — | pós-lançamento | pós-lançamento | pós-lançamento |
| Auto-inscrição por QR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Entrega em alta resolução (sem marca na foto) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Selo "powered by CliqueZoom" na galeria (some ao assinar) | sim | — | — | — | — |
| Pagamento via plataforma (comissão) | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Nº de sessões/clientes ativos** | **∞** | **∞** | **∞** | **∞** | **∞** |

> ✅ Decisão (2026-06-26): **storage é o ÚNICO limitador — sessões ILIMITADAS em todos os tiers.** Um só medidor
> mantém o sinal de saturação limpo, é justo (paga o que usa) e a própria atividade alimenta o motor (mais
> sessões → mais fotos → mais storage → upgrade). Todas as ferramentas de seleção em todos os planos (maximiza
> superfície de comissão, Decisão #1). E os dois caminhos te favorecem: se o cliente paga **via plataforma** você
> ganha comissão; se paga **por fora** o fotógrafo segue na plataforma — Real Time (B2) entra pós-lançamento (Pro+).

## MÓDULO: GESTÃO (Rhyno — CRM/ERP)

| Feature | Free | Basic | Pro | Studio | Sob medida |
|---|---|---|---|---|---|
| CRM (clientes, comunicação, ocorrências) | gostinho | ✓ | ✓ | ✓ | ✓ |
| **Ordem de serviço (com campo de contrato)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| ⭐ Reengajamento de aniversário (hero) | — | ✓ | ✓ | ✓ | ✓ |
| Tarefas | — | — | ✓ | ✓ | ✓ |
| Metas | — | — | ✓ | ✓ | ✓ |
| Finanças da empresa | — | — | ✓ | ✓ | ✓ |
| Finanças pessoal + botão "misto" | — | — | — | ✓ | ✓ |

> ✅ Decisão (2026-06-26): cada tier ganha uma **identidade clara**.
> **Free** = gostinho de CRM + **Ordem de serviço com campo de contrato** — esse é o gancho de profissionalismo
> ("você manda o contrato pro cliente e controla por serviço" faz a fotógrafa pequena se sentir profissional →
> divulga). A **Ordem de serviço desce pra TODOS** (decisão 2026-06-26): é o gostinho que prende. **Basic** = CRM
> completo + **reengajamento de aniversário** — o gancho que alimenta o storage-motor (mantém sessões vivas pra
> relembrar → storage enche → upgrade). **Pro** = vira gestão de negócio (tarefas, metas, finanças da empresa).
> **Studio** = negócio **COMPLETO**, com finanças pessoal + **botão "misto"** (junta pessoa física e empresa).
> Quando a fotógrafa quiser tarefas/metas/finanças, ela sobe pro Pro. O degrau é **profundidade de gestão**, não
> "ilimitado" — botão misto / metas / tarefas são features do Rhyno que sobem por tier.

## MÓDULO: MEU SITE (portfólio público)

| Feature | Free | Basic | Pro | Studio | Sob medida |
|---|---|---|---|---|---|
| Templates existentes (os que já temos) | ✓ todos | ✓ todos | ✓ todos | ✓ todos | ✓ todos |
| Templates premium (a CRIAR) | 🔮 futuro | 🔮 futuro | 🔮 futuro | 🔮 futuro | 🔮 futuro |
| Endereço | subdomínio | subdomínio | **domínio próprio** | domínio próprio | domínio próprio |
| Seção Estúdio (localização, álbuns, portfólio) | ✓ | ✓ | ✓ | ✓ | ✓ |

> ✅ Decisão (2026-06-26 — escopo CORTADO pra lançar): **os templates que já existem ficam liberados pra TODOS
> os planos.** O degrau de Meu Site no lançamento é só o **endereço**: Free/Basic = subdomínio · Pro/Studio =
> **domínio próprio**.
> 🔮 **Documentado pra futuro (NÃO fazer agora):** criar um catálogo de **templates premium** bonitos/minimalistas
> e definir a quais tiers eles pertencem (provável Studio-only). Os atuais (gerados por IA) não são premium, mas
> servem pro lançamento. "Vamos usar o que já tem, não vamos perder tempo." Premium **saiu** dos gates de lançamento.

## RECURSOS DE CONTA / EXPANSÃO

| Feature | Free | Basic | Pro | Studio | Sob medida |
|---|---|---|---|---|---|
| Storage (GB) — **meter principal** | 3 | 20 | 150 | 600 | combinável |
| Usuários inclusos (seats) | 1 | 1 | 2 | 3 | combinável |
| Assento adicional (add-on recorrente) | — | — | ➕ | ➕ | ➕ |
| **Triagem (separação facial)** | ✓ | ✓ | ✓ | ✓ | ✓ |
| Domínio próprio | — | — | ✓ | ✓ | ✓ |

## PRODUTOS AVULSOS (à vista, pra todos — ver 26_0)
Domínio (registro), Story, Aprendizado guiado, templates premium avulsos… — **não** são gate de plano;
são compra pontual à vista por qualquer plano. (Alguns podem vir **inclusos** em tiers altos como perk.)

---

## MÓDULO: TRIAGEM (separação facial) — incluída em TODOS os planos
✅ Decisão (2026-06-26): a Triagem entra **em todos os tiers** (Free↑), como ferramenta de **auxílio ao fotógrafo**.
Não precisa estar 100% completa pro lançamento — o motor já está praticamente pronto ([[project_cliquezoom_triagem]]).
Dois usos: (a) o fotógrafo separa as fotos por pessoa; (b) **o cliente pode separar na própria máquina** se quiser.
A versão **Real-Time** (selfie-match em sessão ao vivo, B2) fica **pra depois** — não é pré-requisito de lançamento.

## ⚠️ Custo de BACKUP (lembrete do usuário)
Backup é um **multiplicador do custo de storage** — não esquecer nas contas. Decisão a tomar:
- **Opção A — backup de tudo** (2ª cópia de todas as galerias): ~dobra o custo/GB → **~R$0,12–0,14/GB/mês**. Ainda trivial (Basic 20GB ≈ R$2,40 · Studio 600GB ≈ R$84/mês). Dá segurança e confiança.
- **Opção B — "storage de entrega, guarde seus masters"** (sem backup garantido; o fotógrafo mantém os originais): mais barato e menos passivo, mas **atrita com o loop de aniversário** (que pressupõe reter sessões a longo prazo).
- **Recomendação minha:** Opção A — custo é baixo, confiança é alta. Orçar **2× o custo de storage** nas contas; reavaliar se um Studio muito pesado distorcer.

## Pendências do worksheet (pós-lançamento ou quando der)
- Preço final do **add-on de assento** (~R$29–39, cobrindo o espelho no Rhyno).
- Catálogo final de **produtos avulsos** e quais vêm inclusos como perk em tiers altos (26_0).
- **% de desconto do anual** (~2 meses grátis) + empurrão pro anual no checkout (caixa adiantado).
- 🔮 **Futuro:** criar catálogo de **templates premium** e definir a quais tiers pertencem (fora do lançamento). 