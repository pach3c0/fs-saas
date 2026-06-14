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
