# Modelo financeiro recomendado — CliqueZoom

> **Status:** RECOMENDAÇÃO em discussão (2026-06-26). Nada decidido/implementado.
> Planos serão definidos por último (depois de terminar a plataforma) — este doc é a
> base de mercado pra lapidar o modelo de cobrança antes de mexer no billing ao vivo.
> Relacionado: [roadmap-ajustes](roadmap-ajustes.md) item 7 (storage adicional) e item 11
> (preço custom por org) · [25_0](25_0_mercadopago-checkout-fotografo.md) (marketplace cliente-final, outra camada).

---

## Princípio que organiza tudo

Separar **dois tipos de cobrança** que o mercado trata com regras diferentes:

| Tipo | Exemplos | Regra |
|---|---|---|
| **Produto avulso (one-time)** | Domínio, aprendizado guiado, pacote de template, contratação pontual | **Pago à vista, por todos** |
| **Adicional recorrente** | Storage extra, usuário extra | **Linha mensal própria**, ativa na hora, cobra no próximo ciclo |

A maioria das dúvidas de "como cobro X" some quando se classifica X em um desses dois.

---

## 1) Plano Mensal × Anual

**Recomendação:** oferecer os dois. **Anual = valor cheio com desconto, cobrado de uma vez**
(padrão de mercado ~"2 meses grátis", 15–20% off), **mas com parcelamento no cartão (até 12x)**
— nativo no Mercado Pago.

**Não construir** "anual debitado todo mês por força de contrato". Motivos:
- O MP não garante os 12 meses; cartão falha/cancelamento → você perde o resto e assume risco de inadimplência 12× em vez de 1×.
- Perde o caixa adiantado (storage custa todo mês, desde o dia 1).
- Mais taxa (12 cobranças vs 1).
- **O parcelamento já entrega a experiência desejada:** o fotógrafo vê ~R$X/mês na fatura dele (sente mensal), mas comprometeu o ano e você recebe (dep. da config) quase tudo na frente. É o jeito BR de resolver "iniciante não tem R$1.000 sobrando".

**Privilégio do anual = desconto + perks inclusos** (ex.: mais storage incluso, template premium). **Nunca** "compre agora, pague depois".

---

## 2) Produtos avulsos (domínio, aprendizado, template…)

**À vista, por todos — mensal E anual.** Nada de "fiar" one-time.

O raciocínio do risco de cobrança (cartão virtual, some no mês seguinte, tira o cartão da plataforma)
está correto — e vale pra **qualquer** cliente, não só o mensal. Ninguém em SaaS pendura produto avulso
pra cobrar depois. Por isso o anual também paga na hora; o benefício dele é o desconto/perks, não o prazo.

---

## 3) Adicional recorrente (storage extra) — a regra do "começa no próximo ciclo"

Três opções consideradas pra um adicional comprado no meio do ciclo (ex.: dia 15, fatura fecha dia 1):

1. **Proporcional/retroativo** (cobra só os dias usados) — "certo" de SaaS grande (Stripe), mas: conta chata, fatura poluída, e **o MP não faz proporcional fino direito** → código frágil por centavos. ❌
2. **Mês cheio retroativo** (vira 30 dias) — beneficia o caixa, mas bagunça a fatura do fotógrafo e parece cobrança a mais → ticket de suporte + desconfiança. ❌
3. ✅ **Ativa na hora, cobra a partir do próximo ciclo. Sem proporcional.**
   *"Você adicionou 15GB — já liberados. Os R$20/mês entram na sua próxima fatura."*

**Por que a opção 3:** custa só ~uns dias de storage grátis (trivial), dá a melhor experiência
(recebe na hora, fatura limpa: "+15GB R$20"), e é a mais simples de implementar no MP.
Para um público muito iniciante, **simplicidade e fatura previsível > espremer centavo proporcional.**
Pic-Time / ShootProof / Pixieset fazem assim (tier-based, "começa no próximo ciclo").

---

## 3b) Economia da saturação (add-on de storage × pular de plano)

Decisão estratégica do usuário (ver [28_0](28_0_planilha-planos-features.md) Decisão #3): liberar **alta
resolução já no plano de entrada** (diferencial vs. Pic-Time, que capa em 1080px) torna o **storage o motor
de receita**. A precificação tem que sustentar isso:

- O add-on de storage deve ser **vantajoso no 1º momento**, mas, **a partir do 2º/3º add-on**, somar avulsos
  precisa ficar **mais caro** que pular de plano — assim o teto de cada plano empurra a evolução sozinho.
- **Cada plano superior também tem teto** → a necessidade de mais storage reaparece um degrau acima (escada contínua).
- Mecanismo **invisível** (gatilho de saturação): o fotógrafo não enxerga a engenharia; ele só **sente** que
  precisa avançar. O valor é real (entrega em alta), o gate é o **consumo real** — *"legais, mas não bobos"*.
- Driver futuro de consumo: vínculo **Sessão ↔ CRM** (manter sessões vivas p/ reengajamento de aniversário)
  aumenta o storage retido — equilibrado por um SKU de **otimização de sessão** (guardar só as ~5 melhores).

### Custo real de storage (Contabo — base de cálculo, 2026-06-26)

Produto confirmado (print da página, 2026-06-26): **Contabo Object Storage** — €2,49/250GB · €4,98/500GB ·
€9,96/1TB · €19,92/2TB · €49,80/5TB · €99,60/10TB. **€0,996 por 100 GB/mês, LINEAR** (sem desconto por volume).
- **Custo ≈ €0,00996/GB/mês ≈ R$0,06–0,07/GB/mês** (FX ~R$6,30/€ — confirmar taxa viva).
- **✅ Transferência ILIMITADA inclusa na mensalidade fixa** (a página contrasta explicitamente com AWS/Azure, que cobram egress à parte). **Resolve a ressalva do turno anterior: não há custo de download** (galeria/ZIP em alta não gera conta extra).
- **✅ Redundância tripla (3 réplicas) + DDoS + ACL por objeto já inclusos** no preço — sem multiplicador de custo escondido. ACL por objeto casa com o modelo de marca/galeria privada.
- Operações/requests: anunciam "tudo incluído / preço fixo por nível" → sem cobrança por request aparente (confirmar no checkout, mas o marketing é flat).

**Implicações (corrigem a preocupação de custo do turno anterior):**
1. **20 GB inclusos custam ~R$1,20–1,40/mês** → desprezível contra qualquer mensalidade. **Custo NÃO é o gargalo do plano de entrada.** O número de GB incluso é lever **psicológico** (timing do upgrade), não de cobrir custo. Risco real é o oposto: GB demais **mata o gatilho de saturação**.
2. **Add-on de storage = margem quase pura** → precificar por **VALOR** (3–5× o custo é normal de mercado e ainda parece barato). Ex. ilustrativo: +50GB a R$15/mês (custo ~R$3,50).
3. Escada: calibrar add-on + teto pra que **2–3 add-ons custem mais que pular de plano**. Como o custo é baixo, isso é pura **engenharia de packaging**, não recuperação de custo.
4. **⚠️ Implicação de ARQUITETURA (não de preço):** essa tabela é do **Object Storage** (elástico, S3-compatível), NÃO do disco local do VPS que a CliqueZoom usa hoje (`/uploads`, disco FIXO do plano do VPS). **Se o storage é o motor de receita, o backend tem que ser elástico** — vender +500GB num disco de VPS fixo trava num teto físico. Caminho natural: migrar `/uploads` p/ Contabo Object Storage (a API é S3; `src/services/storage.js` já abstrai o acesso). Isso revisa a regra "sem S3" do CLAUDE.md, que fazia sentido em escala pequena. Decisão de A1/A3, não imediata.

> Referência de volume (sanidade): ~10 MB/foto em alta (JPEG ~5000px) → **20GB ≈ 2.000 fotos** ≈ 3–6 casamentos OU ~40 ensaios mantidos simultaneamente.

---

## 4) Convergência negócio × técnica (resolve o "gate" do item 7)

O adicional recorrente deve ser uma **linha mensal recorrente própria**, separada do plano base
(mensal ou anual).

- Resolve o cliente anual: não dá pra encaixar R$20/mês num parcelamento anual fixo → o adicional vira sua própria cobrancinha mensal, limpa.
- **Resolve o problema técnico do item 7:** o gate travava porque a assinatura é "atrelada a plano"
  (`PreApprovalPlan`) e não aceita mudar de valor. Se o adicional é uma **preapproval separada só dele**,
  esse problema **deixa de existir** — cria/cancela a cobrança do adicional sem tocar na assinatura principal.
- O código já guarda o adicional em campos separados (`Subscription.storageAddon*`) → arquitetura pronta pra isso.

---

## Resumo em uma linha

Anual cheio com desconto + parcelamento no cartão · produto avulso sempre à vista pra todos ·
adicional recorrente como linha mensal própria que ativa na hora e cobra no próximo ciclo.

---

## Decisões em aberto (do usuário, quando for fechar os planos)

- [x] **Âncoras de mercado levantadas (2026-06-26):** R$39 = entrada validada (Alboom dá só 5GB; nós 20GB). Estrutura de tiers, Bloco 1×2 e regra de cruzamento de add-on firmadas em [28_0](28_0_planilha-planos-features.md). Refinamento: reprecificar Pro/topo **pra cima** (não dar 2–4× desconto onde o cliente já está comprometido — Alboom: 200GB R$179). Falta só cravar as mensalidades finais.
- [x] **Planos DEFINIDOS (2026-06-26):** 4 — Free 3GB · Basic R$39/20GB · Pro R$119/150GB · Studio R$249/600GB (+Sob medida). Add-ons +50/+100/+250GB = R$19/R$35/R$69.
- [ ] % de desconto do anual (referência de mercado: ~"2 meses grátis").
- [ ] Catálogo de produtos avulsos (domínio, aprendizado guiado, templates premium…) e preços.
- [ ] Pacotes de storage adicional (ex.: +15GB, +50GB, +100GB) e preço de cada.
- [ ] Quais perks o anual inclui (storage extra? template? acesso a módulo do Rhyno?).
- [ ] Pró-rata/crédito em troca de plano (já adiado no item 11 — calcular por dias restantes quando os planos existirem).
