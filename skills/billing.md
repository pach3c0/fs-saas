# Skill: Sistema de Planos e Assinatura

Leia este arquivo ao trabalhar em `src/routes/billing.js`, `src/models/plans.js`, `src/middleware/planLimits.js`, ou `admin/js/tabs/plano.js`.

---

## Planos (src/models/plans.js)

| Plano | Sessoes | Fotos | Albums | Storage | Dominio Custom |
|-------|---------|-------|--------|---------|----------------|
| free | 3 | 100 | 1 | 500MB | nao |
| basic | 20 | 1000 | 10 | 5GB | nao |
| pro | ilimitado | ilimitado | ilimitado | 50GB | sim |

---

## Middleware planLimits.js

Valida limites antes de criar sessoes, fotos, albums. Retorna 403 se limite atingido.

---

## Rotas de billing

| Metodo | Rota | Auth | Descricao |
|--------|------|------|-----------|
| GET | `/api/billing/plans` | Publico | Lista planos disponiveis |
| GET | `/api/billing/subscription` | JWT | Assinatura atual |
| POST | `/api/billing/checkout` | JWT | Cria checkout Stripe |
| POST | `/api/billing/webhook` | Stripe | Webhook de eventos |
| POST | `/api/billing/cancel` | JWT | Cancela assinatura |
