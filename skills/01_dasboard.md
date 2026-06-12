# Dashboard — Painel Principal (CliqueZoom Admin)

> Documentação gerada em 2026-05-19. **Revalidada no restart pós-Rhyno (2026-06-10):** onboarding 4→3 passos (Vincular cliente saiu), KPI "Espaço Usado" agora em GB (`formatStorage`), sessão recente abre `openSessionWizard`, copy "estúdio"→"negócio". Manual (`MANUAL_MODULES[0]`) refeito p/ a UI atual e validado por screenshot.
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

O checklist exibe **3 passos** (o backend ainda rastreia `clientLinked`, mas ele **não é mais exibido** — o módulo Clientes migrou para o Rhyno, então o passo "Vincular cliente" saiu da lista):

| Passo exibido | Campo em `onboarding.steps` | Marcado quando |
|---|---|---|
| Criar sua primeira sessão | `sessionCreated` | `POST /api/sessions` |
| Subir as primeiras fotos | `photosUploaded` | upload de fotos na sessão |
| Enviar link de acesso | `linkSent` | código enviado ao cliente |

- Barra de progresso = passos concluídos ÷ 3 (ex.: 2 de 3 = 66%)
- Botão "Ocultar guia" chama `POST /api/onboarding/dismiss` → seta `onboarding.completed: true`
- Links "Ver Tutorial" chamam `window.openTutorialHelp(category, query)` → navega para a tab `ajuda`

### 2.3 KPI Cards (4 cards)

| Card | Valor | Token de cor |
|---|---|---|
| Total de Sessões | `sessions.length` | `var(--accent)` |
| Fotos Upadas | soma de `photos.length` de todas as sessões | `var(--orange)` |
| Espaço Usado | `billingData.usage.storageMB` formatado por `formatStorage()` — **GB a partir de 1 GB** (ex.: 1240 MB → "1.2 GB"), MB abaixo disso | `var(--orange)` |
| Entregues | sessões com `selectionStatus === 'delivered'` | `var(--green)` |

> Skeleton de carregamento (4 divs `.skeleton`) exibido enquanto os dados chegam.

### 2.4 Sessões Recentes
- Lista as **últimas 5 sessões** retornadas por `GET /api/sessions`
- Cada item exibe: thumbnail (ou ícone fallback), nome, data formatada, tipo e badge de status
- **Clicável:** `onclick="switchTab('sessoes').then(() => window.openSessionWizard?.(id))"` — abre o wizard da sessão específica (era `viewSessionPhotos`, removido no redesign)
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
| `window.openSessionWizard(id)` | função global | `admin/js/tabs/sessoes/wizard/index.js` | Abrir o wizard de uma sessão específica (substituiu `viewSessionPhotos`) |
| `openMySite()` | função global | `admin/js/app.js` | Abrir site público do fotógrafo |
| `window.openTutorialHelp(cat, query)` | função global | `dashboard.js` (linha ~230) | Navegar para ajuda com filtro |
| `window.dismissOnboarding()` | função global | `dashboard.js` (dentro de renderDashboard) | Dispensar o checklist de onboarding |

---

## 5. Padrões e Cuidados

- **Sem `console.error`** — erros exibidos via `window.showToast?.('mensagem', 'error')`
- **`apiPost` importado de `api.js`** — não usar fetch direto neste arquivo
- **Skeletons apenas nos KPI cards** — a lista de sessões usa texto "Carregando..." (melhoria futura: adicionar skeleton na lista também)
- **`var(--purple)` é um shim** (mapeado para `--ad-text-muted`, cinza) — evitar usar para indicar cor de destaque; preferir `--accent`, `--orange` ou `--green`

## 6. Roteiro de Vídeo: Visão Geral do Dashboard

**Duração estimada:** 60 a 90 segundos
**Objetivo:** Mostrar ao fotógrafo as informações imediatas que ele encontra assim que faz login e como navegar rapidamente para as ações principais.

### Cena 1: Abertura (0s - 15s)
- **Visual:** Tela cheia mostrando a aba do Dashboard logo após o login. O mouse faz um movimento suave pela tela.
- **Áudio (Locução):** "Assim que você entra no CliqueZoom, o Dashboard te dá um raio-x completo do seu negócio."
- **Ação em Tela:** Destacar sutilmente a linha superior com a saudação "Olá, Fotógrafo!" e a hora da última atualização no canto direito.

### Cena 2: Indicadores de Performance (15s - 35s)
- **Visual:** Focar a atenção nos 4 cartões de KPIs.
- **Áudio (Locução):** "Nesta linha de Indicadores, você acompanha de perto sua produtividade: quantas sessões totais você já criou, a quantidade de fotos que já subiu na plataforma, o seu uso de armazenamento e, mais importante, quantas sessões já foram entregues com sucesso aos clientes."
- **Ação em Tela:** O mouse passa por cima de cada cartão em sequência (Total de Sessões, Fotos Upadas, Espaço Usado, Entregues).

### Cena 3: Sessões Recentes (35s - 55s)
- **Visual:** Descer a tela um pouco para focar no quadro "Sessões Recentes" no lado esquerdo.
- **Áudio (Locução):** "Na lista de Sessões Recentes, você encontra os seus últimos 5 trabalhos em andamento. É só clicar em qualquer um deles para abrir o Wizard e continuar de onde parou."
- **Ação em Tela:** O mouse passa por cima de 2 itens da lista (efeito hover). Em seguida, o mouse clica em "Ver todas", mudando para a aba de Sessões.
- **Edição:** Corte seco de volta para a tela inicial do Dashboard.

### Cena 4: Ações Rápidas (55s - 75s)
- **Visual:** Focar no quadro "Ações Rápidas" no canto direito.
- **Áudio (Locução):** "Para não perder tempo, os atalhos rápidos permitem que você inicie uma Nova Sessão ou visualize a vitrine do seu Site Público com apenas um clique."
- **Ação em Tela:** O mouse clica no botão "Nova Sessão". O modal de criação de sessão se abre sobre a tela. 
- **Edição:** Fechar o modal.

### Cena 5: Encerramento (75s - 85s)
- **Visual:** Retornar para a visualização geral da tela do Dashboard. Zoom suave no Checklist de Início.
- **Áudio (Locução):** "Tudo pensado para deixar a sua rotina de entregas mais ágil e sob controle. Nos próximos vídeos, vamos aprofundar na criação da sua primeira sessão."
- **Ação em Tela:** Fade out suave para o logo da CliqueZoom Academy.
