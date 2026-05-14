# Estratégia: Motor de Vendas Passivas e Automação de CRM

Esta skill documenta a visão estratégica e técnica para transformar o CliqueZoom em uma ferramenta de vendas automáticas para fotógrafos.

## 🎯 Conceito "Venda enquanto Dorme"
O objetivo é converter fotos não selecionadas em receita extra através de gatilhos de urgência e escassez, sem intervenção manual do fotógrafo.

## 🚀 1. Motor de Automação (Urgência Lucrativa)
Utilização de sequências de e-mails/notificações baseadas no comportamento do cliente e prazos de expiração.

### Gatilhos de Disparo (Cron Job)
O backend (`src/utils/salesAutomator.js`) deve monitorar diariamente:
- **Público:** Sessões de seleção/venda (não galeria).
- **Condição:** Existência de fotos pendentes (`photos.selected: false`).
- **Prazos Expiração:** Gatilhos em 15 dias, 7 dias e 48 horas antes do vencimento.
- **Re-engajamento Anual (CRM):** Disparo automático 11 meses após a data de eventos anuais (ex: festa infantil) para oferecer novo ensaio/cobertura.

### Copywriting e Psicologia de Venda
- **Foco (Expiração):** Perda e Escassez ("Não deixe suas memórias expirarem").
- **Foco (CRM 11 Meses):** Antecipação e Recordação ("Seu evento completa 1 ano mês que vem, vamos registrar o próximo?").
- **CTA:** Link direto para o checkout de fotos extras ou contato para novo agendamento.

## 🛠️ 2. Arquitetura Técnica

### Backend (`src/routes/sales.js`)
- Rota para cálculo de "Potencial de Venda" (sessões expirando com fotos sobrando).
- Integração com o serviço de e-mail/notificação.

### Admin Dashboard (`admin/js/tabs/crm.js`)
- Card de **"Vendas Automáticas"**: Mostrar quanto o "robô" recuperou em R$ no mês.
- Status de Engajamento: Ver se o cliente abriu o e-mail de alerta.

## 💰 3. Diferencial: Desconto Progressivo (O Fechamento)
- **Gatilho de 48h:** Geração automática de um cupom de desconto (ex: 10%) exclusivo para as fotos restantes.
- **Objetivo:** Converter o cliente indeciso pelo senso de oportunidade imediata.

---
> [!TIP]
> Esta estratégia deve ser implementada de forma modular, permitindo que o fotógrafo ative/desative a automação e configure as porcentagens de desconto.
