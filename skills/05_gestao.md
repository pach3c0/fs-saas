# Gestão — ERP Rhyno embutido (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 4 de 12).
> Referência frontend: `admin/js/tabs/gestao.js` (~110 linhas) + ERP Rhyno (`/Users/macbook/Documents/ERP1`, React/Vite :5173)
> Referência backend: `src/routes/gestao.js` (SSO + proxy de customers) + FastAPI Rhyno (:8000)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `gestao`) — criado e validado por screenshot em 2026-06-11.
> **Testes E2E:** `tests/local/12_gestao.spec.js` — 7 testes, 7/7 verdes em 2026-06-11.
> ⚠️ **Integração local/uncommitada (POC)** — nada deployado. Handoff: `skills/9_0_handoff-rhyno-integracao.md`.

---

## 1. Visão Geral

A aba Gestão embute o **ERP Rhyno** num iframe com **SSO (login único)**: o CliqueZoom gera uma
asserção assinada (`SSO_SHARED_SECRET`), o iframe abre `/sso?assertion=...&embed=1&redirect=...`,
o Rhyno troca a asserção por um token próprio e cai direto na tela pedida — sem tela de login.
O modo `?embed=1` (persistido em `sessionStorage`) esconde a sidebar/topbar próprias do Rhyno,
fazendo o ERP parecer um módulo nativo do CliqueZoom.

## 2. Componentes

### 2.1 Sub-menu agrupado (`#gestaoSubnav`, 11 seções)
| Grupo | Seções (rota do React Router) |
|---|---|
| Operação | Dashboard `/dashboard` · Clientes `/customers` · Ordens de Serviço `/service-orders` |
| Cadastros | Produtos / Serviços `/catalog` · Categorias `/categories` |
| Financeiro | Contas a Receber · Contas a Pagar · Contas Financeiras · Categorias DRE · Formas de Pagamento |
| Relacionamento | CRM `/crm` |

Clicar troca `frame.src = RHYNO_BASE + path + '?embed=1'` — após o SSO inicial a sessão vive no
`localStorage` do iframe, então a navegação NÃO refaz o login. Não existe link "Abrir em nova aba".

### 2.2 Rotas backend CliqueZoom (`src/routes/gestao.js`)
- `GET /api/gestao/sso-url?redirect=` — monta a URL de SSO (asserção HS256, 120s). 503 sem `SSO_SHARED_SECRET`.
- `GET /api/gestao/customers?search=` — proxy p/ `GET :8000/customers/` (server-to-server via SSO).
  Retorna no formato do seletor de sessão; ids prefixados **`rhyno:`** (distingue de ObjectId Mongo).
- `POST /api/gestao/customers` — cria customer no Rhyno. Valida: nome obrigatório, CPF/CNPJ
  obrigatório; Rhyno rejeita documento inválido/duplicado → 400 com mensagem acionável.

### 2.3 Integração com Sessões
O seletor de cliente da criação de sessão (`modal-form.js`) busca em `/api/gestao/customers`; o
"+ Novo cliente" grava no Rhyno (CPF válido obrigatório — helper `gerarCPF()` nos testes).
`Session.rhynoCustomerId` + snapshot `clientName`/`clientPhone`.

### 2.4 Regra de negócio testada: OS só aceita item do catálogo
- **Backend Rhyno** (`service_order_service._validate_catalog_items`): item `part` exige `product_id`
  válido do tenant; item `service` exige `service_id`. Texto livre → **400** ("precisa ser selecionado
  do catálogo"); id inexistente/de outro tenant/excluído → 400 ("não está cadastrado no catálogo").
  Vale no **POST e no PUT**.
- **Frontend Rhyno** (`ServiceOrderForm.tsx`): digitar à mão zera `product_id`/`service_id` → badge
  `⚠ Selecione um item do catálogo`; submit bloqueado com toast. Selecionar da busca (3+ chars) →
  badge `✓ Vinculado ao catálogo` → salva.

## 3. Ambiente de teste (caveats)
- Exige o **stack Rhyno UP**: `docker start rhyno-pg rhyno-api` → `docker exec -d rhyno-api sh -c
  "uvicorn main:app --host 0.0.0.0 --port 8000 > /tmp/uvicorn.log 2>&1"` → Vite no host
  (`cd ERP1/frontend && npm run dev`, :5173).
- Login Rhyno (API direta nos testes): `teste@cliquezoom.local` / `teste123` (tenant 2),
  `POST /auth/login` **form-encoded** (OAuth2PasswordRequestForm).
- O catálogo do tenant de teste começa vazio — a suíte **semeia idempotente** (`TEST-E2E SERVICO
  GESTAO` + `TEST-E2E PRODUTO GESTAO`); nomes em MAIÚSCULAS porque o input de item força uppercase.
- Playwright entra no iframe com `page.frameLocator('#gestaoFrame')` (cross-origin :5173 funciona
  no Chromium). Selects estáveis: h1 "Dashboard" / "Clientes e Fornecedores" / "Ordens de Serviço";
  embed assertado por `aside` count 0; SSO por ausência de `input[type=password]`.

## 4. Cobertura E2E (7 testes)
1. API sso-url: formato (`/sso?assertion=`, `embed=1`) + redirect customizado.
2. API customers GET: formato `rhyno:N` + search filtra.
3. API customers POST: sem nome 400 · sem doc 400 · CPF inválido 400 · válido cria · duplicado 400.
4. UI: 4 grupos / 11 botões / Dashboard ativo · SSO sem tela de login · embed sem sidebar · sem "Abrir em nova aba".
5. UI: sub-nav navega (Clientes → OS → Catálogo) com `?embed=1` e sessão mantida.
6. API Rhyno OS: texto livre 400 · part sem product_id 400 · id fantasma 400 · catálogo salva e relê vinculado · PUT idem.
7. **Cross-app via iframe**: item à mão → ⚠ + submit bloqueado; item do catálogo → ✓ + OS criada de verdade (e apagada na limpeza).

**Bugs encontrados:** nenhum no app (1 correção de seletor no próprio teste — `#tabContent`).

## 5. Roteiro de Vídeo: Gestão — seu negócio inteiro num só lugar

**Duração estimada:** 75 a 100 segundos
**Objetivo:** Apresentar o módulo de gestão (ERP) embutido: login único, clientes integrados às sessões, catálogo e ordens de serviço com preço consistente, financeiro.

### Cena 1: Abertura (0s - 12s)
- **Visual:** Painel admin; o mouse clica em "Gestão" no menu lateral. A tela do ERP carrega já logada.
- **Áudio (Locução):** "Fotografia também é gestão. Na aba Gestão, o CliqueZoom traz um ERP completo para dentro do seu painel — e você entra automaticamente, sem outra senha."

### Cena 2: Sub-menu e Dashboard (12s - 30s)
- **Visual:** Mouse percorre os grupos do topo (Operação, Cadastros, Financeiro, Relacionamento); dashboard do ERP visível.
- **Áudio (Locução):** "Tudo organizado em quatro grupos: a Operação do dia a dia, os seus Cadastros, o Financeiro e o Relacionamento com clientes. O dashboard resume orçamentos, clientes e metas do período."

### Cena 3: Clientes integrados (30s - 48s)
- **Visual:** Clique em "Clientes"; lista aparece. Corte rápido para a criação de uma sessão no CliqueZoom mostrando o mesmo cliente no seletor.
- **Áudio (Locução):** "Os clientes daqui são os mesmos das suas sessões: cadastrou um cliente ao criar uma sessão? Ele já está na sua base de gestão, pronto para orçamentos e ordens de serviço."

### Cena 4: Catálogo + Ordem de Serviço (48s - 75s)
- **Visual:** Clique em "Produtos / Serviços" mostrando o catálogo; depois "Ordens de Serviço" → Novo Orçamento. Digita um item à mão → aviso ⚠ aparece; seleciona do catálogo → ✓ verde; salva.
- **Áudio (Locução):** "Cadastre no catálogo o que você vende — ensaios, pacotes, álbuns. Na hora de criar uma ordem de serviço, todo item vem do catálogo: se digitar à mão, o sistema avisa e não deixa salvar. Preço consistente, relatórios confiáveis."

### Cena 5: Financeiro + Encerramento (75s - 90s)
- **Visual:** Passada rápida por "Contas a Receber". Volta à visão geral da aba.
- **Áudio (Locução):** "E o financeiro acompanha tudo: parcelas, contas a pagar e formas de pagamento. Seu negócio inteiro, num só lugar. No próximo vídeo: o construtor do seu site."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
