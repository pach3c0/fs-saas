# Dashboard — Painel Principal (CliqueZoom Admin)

> Documentação gerada em 2026-05-19. Atualizada em 2026-05-19 (refatoração + manual do usuário).
> Referência frontend: `admin/js/tabs/dashboard.js`
> Referências backend: `src/routes/sessions.js` (`GET /api/sessions`), `src/routes/billing.js` (`GET /api/billing/subscription`), `src/routes/organization.js` (`GET /api/onboarding`, `POST /api/onboarding/dismiss`)
> **Manual do usuário:** conteúdo documentado em `admin/js/tabs/ajuda.js` → `MANUAL_MODULES[0]` (id: `dashboard`). Ver padrão em `skills/00_manual-usuario.md`.

---

## 1. Visão Geral

O Dashboard é a tela inicial do painel admin. Exibe um resumo operacional do estúdio e atalhos para as ações mais comuns. É renderizado pela função exportada `renderDashboard(container)`.

**Arquivo:** `admin/js/tabs/dashboard.js` — arquivo único (~249 linhas, abaixo do limiar de 600 para modularização).

---

## 2. Ferramentas e Componentes

### 2.1 Saudação + Timestamp
- Exibe "Olá, [nome]!" usando `appState.user?.name`
- Timestamp "Atualizado às HH:MM:SS" atualizado após cada carga de dados

### 2.2 Onboarding Checklist
Aparece somente enquanto `onboarding.completed === false` (retornado por `GET /api/onboarding`).

| Passo | Campo em `onboarding.steps` | Marcado quando |
|---|---|---|
| Criar primeira sessão | `sessionCreated` | `POST /api/sessions` |
| Subir primeiras fotos | `photosUploaded` | upload de fotos na sessão |
| Vincular cliente | `clientLinked` | sessão associada a um cliente |
| Enviar link de acesso | `linkSent` | código enviado ao cliente |

- Barra de progresso proporcional ao número de passos concluídos
- Botão "Ocultar guia" chama `POST /api/onboarding/dismiss` → seta `onboarding.completed: true`
- Links "Ver Tutorial" chamam `window.openTutorialHelp(category, query)` → navega para a tab `ajuda`

### 2.3 KPI Cards (4 cards)

| Card | Valor | Token de cor |
|---|---|---|
| Total de Sessões | `sessions.length` | `var(--accent)` |
| Fotos Upadas | soma de `photos.length` de todas as sessões | `var(--orange)` |
| Espaço Usado | `billingData.usage.storageMB` | `var(--orange)` |
| Entregues | sessões com `selectionStatus === 'delivered'` | `var(--green)` |

> Skeleton de carregamento (4 divs `.skeleton`) exibido enquanto os dados chegam.

### 2.4 Sessões Recentes
- Lista as **últimas 5 sessões** retornadas por `GET /api/sessions`
- Cada item exibe: thumbnail (ou ícone fallback), nome, data formatada, tipo e badge de status
- **Clicável:** `onclick="switchTab('sessoes').then(() => window.viewSessionPhotos(id))"` — navega para a sessão específica
- Hover: fundo muda para `var(--bg-elevated)`

Status e cores:

| `selectionStatus` | Label | Cor |
|---|---|---|
| `pending` | Pendente | `var(--yellow)` |
| `submitted` | Revisar | `var(--accent)` |
| `delivered` | Entregue | `var(--green)` |
| `in_progress` | Em Seleção | `var(--purple)` (shim → cinza) |

### 2.5 Ações Rápidas

| Botão | Ação |
|---|---|
| Nova Sessão | `switchTab('sessoes').then(() => newSessionModal.style.display='flex')` |
| Ver meu Site | `openMySite()` (global definida em `admin/js/app.js`) |

---

## 3. Fluxo de Dados

```
renderDashboard(container)
  ├── Renderiza HTML base com skeletons
  ├── loadDashboardData(container)
  │     ├── Promise.all([GET /api/sessions, GET /api/billing/subscription])
  │     ├── Preenche KPI cards e lista de sessões recentes
  │     └── GET /api/onboarding → renderOnboardingChecklist() (se não completo)
  └── Define window.dismissOnboarding (chama POST /api/onboarding/dismiss)
```

---

## 4. Globals Usados / Expostos

| Identificador | Tipo | Origem | Uso |
|---|---|---|---|
| `switchTab(name)` | função global | `admin/js/app.js` | Navegar entre tabs; retorna Promise |
| `window.viewSessionPhotos(id)` | função global | `admin/js/tabs/sessoes/modal-detail.js` | Abrir modal de uma sessão específica |
| `openMySite()` | função global | `admin/js/app.js` | Abrir site público do fotógrafo |
| `window.openTutorialHelp(cat, query)` | função global | `dashboard.js` (linha ~230) | Navegar para ajuda com filtro |
| `window.dismissOnboarding()` | função global | `dashboard.js` (dentro de renderDashboard) | Dispensar o checklist de onboarding |

---

## 5. Padrões e Cuidados

- **Sem `console.error`** — erros exibidos via `window.showToast?.('mensagem', 'error')`
- **`apiPost` importado de `api.js`** — não usar fetch direto neste arquivo
- **Skeletons apenas nos KPI cards** — a lista de sessões usa texto "Carregando..." (melhoria futura: adicionar skeleton na lista também)
- **`var(--purple)` é um shim** (mapeado para `--ad-text-muted`, cinza) — evitar usar para indicar cor de destaque; preferir `--accent`, `--orange` ou `--green`
