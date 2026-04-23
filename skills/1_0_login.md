# Skill: Login e Autenticação

Este documento descreve o padrão oficial para o sistema de login e autenticação no CliqueZoom, abrangendo as camadas de Banco de Dados, Backend e Frontend.

## 1. Banco de Dados (Mongoose)

O modelo `User` é central para a autenticação e está vinculado a uma `Organization`.

### Modelo `User` (`src/models/User.js`)
- **Campos Chave**:
  - `name`: Nome do usuário, obrigatório.
  - `email`: Único, em minúsculas e sem espaços.
  - `passwordHash`: Senha criptografada com `bcryptjs`.
  - `organizationId`: Referência obrigatória para a organização (Multi-tenancy).
  - `role`: `admin` ou `superadmin`.
  - `approved`: Flag booleana para controle de acesso manual.
- **Indexação**: Indexado por `organizationId` para consultas rápidas em ambiente multi-tenant.

---

## 2. Backend (Node.js/Express)

A autenticação utiliza **JWT (JSON Web Tokens)** com validade de 7 dias.

### Padrões de Rota (`src/routes/auth.js`)
- **Login (`POST /api/login`)**:
  - Exige `email` e `password` — ambos obrigatórios.
  - Busca usuário com `User.findOne({ email })`.
  - Verifica senha com `bcrypt.compare`, depois `approved === true`, depois busca `Organization.findById()` e verifica `isActive`.
  - Retorna `{ success: true, token, organizationId, role }`.
  - Erros: `"E-mail não cadastrado"` (401), `"Senha incorreta"` (401), `"Conta desativada"` (403).
- **Registro (`POST /api/auth/register`)**:
  - Cria `Organization` com `isActive: true` e `User` com `approved: true` — acesso imediato, sem aprovação manual.
  - Cria `Subscription` no plano free.
  - Atualiza `org.ownerId` após criar o User.
  - Envia e-mail de boas-vindas com link direto para o painel via `sendWelcomeEmail()` (async, não bloqueia).
- **Recuperar senha (`POST /api/auth/forgot-password`)**:
  - Recebe `email`, gera JWT com `purpose: 'reset'` e validade de 1h.
  - Envia link `BASE_URL/admin/?reset=<token>` por e-mail.
  - Sempre retorna 200 — não revela se o e-mail existe.
- **Redefinir senha (`POST /api/auth/reset-password`)**:
  - Recebe `token` e `password` (mín. 6 chars).
  - Valida JWT e `payload.purpose === 'reset'`, atualiza `passwordHash`.

### Regras Críticas de Backend
1. **Require no Topo**: Todos os `require()` devem estar no início do arquivo.
2. **I/O Assíncrono**: Uso obrigatório de `fs.promises` (nunca `*Sync`).
3. **Middleware de Proteção**: Rotas privadas usam `authenticateToken` que injeta `req.user`.
4. **Performance**: Consultas de leitura devem usar `.lean()`.

---

## 3. Frontend (Vanilla JS)

O login é gerenciado no orquestrador principal do admin (`admin/js/app.js`).

### UI de Login (`admin/index.html`)
- Localizado em `#loginForm`, visível apenas quando não há `authToken`.
- **Aesthetics**: Segue o design system com variáveis CSS (`--bg-surface`, `--accent`).
- **Feedback**: Usa `showToast(msg, type)` importado de `./utils/toast.js` (ES Module — não `window.showToast`).
- **Telas**: `loginView`, `forgotView`, `resetView` — controladas por `showView(id)` dentro de `showLoginForm()`.

### Fluxo de Login (`admin/js/app.js`)
O formulário de login tem **3 telas** gerenciadas pela função `showLoginForm()`:
- **loginView**: campos email + senha, link "Esqueci minha senha"
- **forgotView**: campo email para solicitar reset
- **resetView**: campos nova senha + confirmação (ativada via `?reset=<token>` na URL)

1. **Captura**: `doLogin()` valida que email e senha estão preenchidos (ambos obrigatórios).
2. **Requisição**: Envia `{ email, password }` para `POST /api/login`.
3. **Erro de senha**: mensagem inclui dica "Esqueci minha senha".
4. **Persistência**: Armazena `authToken` e `organizationId` no `localStorage`.
5. **Setup Pós-Login**: Executa em paralelo `loadAppData()` (SiteData legado) e `postLoginSetup()`.
   - Dentro de `postLoginSetup()`: paralela `loadOrgSlug()` e `loadSidebarStorage()`, inicia polling de notificações com delay de 5s e abre `switchTab('dashboard')`.
   - NUNCA use `await` em série para chamadas de API independentes.

```javascript
// Padrão real de pós-login em app.js
await Promise.all([
  loadAppData(),       // SiteData legado
  postLoginSetup()     // oculta loginForm, carrega slug+storage, abre dashboard
]);

async function postLoginSetup() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';

  await Promise.all([
    loadOrgSlug(),
    loadSidebarStorage()
  ]);

  setTimeout(startNotificationPolling, 5000);
  await switchTab('dashboard');
  showWelcomeBanner();
}
```

---

## 4. Fluxograma de Autenticação

```mermaid
flowchart TD
    A["Usuário insere E-mail + Senha"] --> B{"doLogin()"}
    B -- "email vazio" --> V["showToast: Digite seu e-mail"]
    B -- "senha vazia" --> W["showToast: Digite a senha"]
    B -- "ambos preenchidos" --> C["POST /api/login {email, password}"]

    subgraph Backend ["Camada Backend"]
        C --> D["User.findOne({email})"]
        D -- "Não encontrado" --> E["Erro: E-mail não cadastrado"]
        D -- "Encontrado" --> F{"bcrypt.compare(password, hash)"}
        F -- "Não" --> G["Erro: Senha incorreta"]
        F -- "Sim" --> H{"user.approved?"}
        H -- "false" --> I["Erro: Conta desativada"]
        H -- "true" --> J["Organization.findById(user.organizationId)"]
        J -- "Não existe ou inativa" --> K["Erro: Conta desativada"]
        J -- "Ativa" --> L["Gera JWT 7 dias"]
    end

    E --> T["showToast(erro)"]
    G --> TG["showToast(erro + dica: Esqueci minha senha)"]
    I --> T
    K --> T

    L --> M["Salva token + organizationId no localStorage"]
    M --> N["Promise.all: loadAppData + postLoginSetup"]

    subgraph PosLogin ["Pós-Login Paralelo"]
        N --> NA["loadAppData — SiteData legado"]
        N --> NB["postLoginSetup"]
        NB --> NB1["Promise.all: loadOrgSlug + loadSidebarStorage"]
        NB1 --> NB2["setTimeout: startNotificationPolling 5s"]
        NB2 --> NB3["switchTab('dashboard')"]
        NB3 --> NB4["showWelcomeBanner()"]
    end

    NB4 --> Z["Admin pronto"]
```

---

## 5. Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant F as Admin (Frontend)
    participant B as API (Backend)
    participant D as Database (MongoDB)

    U->>F: Insere E-mail/Senha e clica em Entrar
    F->>B: POST /api/login {email, password}
    B->>D: User.findOne({email})
    D-->>B: Retorna User + passwordHash

    B->>B: bcrypt.compare(password, passwordHash)

    alt Credenciais Inválidas
        B-->>F: 401 Unauthorized {error}
        F-->>U: showToast("Erro", error)
    else Credenciais Válidas
        B->>D: Organization.findById(user.organizationId)
        D-->>B: Retorna Organization

        alt Org inativa ou não encontrada
            B-->>F: 403 Forbidden {error}
            F-->>U: showToast("Organização inativa", error)
        else Tudo OK
            B->>B: jwt.sign({userId, organizationId, role}, secret, 7d)
            B-->>F: 200 OK {token, organizationId, role}

            F->>F: localStorage.setItem authToken + organizationId

            par Pós-login paralelo
                F->>B: GET /api/site-data (loadAppData)
                B-->>F: Retorna SiteData legado
            and
                F->>B: GET /api/organization/profile (loadOrgSlug)
                B-->>F: Retorna orgSlug
                F->>B: GET /api/site/admin/storage (loadSidebarStorage)
                B-->>F: Retorna storageMB
            end

            F->>F: setTimeout startNotificationPolling 5000ms
            F->>F: switchTab('dashboard')
            F-->>U: Exibe Dashboard do Admin
        end
    end
```

---

## 6. Modelo de Dados (ERD)

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "possui"
    ORGANIZATION ||--|| SUBSCRIPTION : "tem"

    ORGANIZATION {
        ObjectId _id PK
        string name
        string slug UK
        string plan
        boolean isActive
        date deletedAt
        ObjectId ownerId FK
    }

    USER {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "admin | superadmin"
        ObjectId organizationId FK
        boolean approved
    }

    SUBSCRIPTION {
        ObjectId _id PK
        ObjectId organizationId FK
        string plan
        string status "active | past_due | canceled | trialing"
        string stripeCustomerId
        string stripeSubscriptionId
        date currentPeriodEnd
        boolean cancelAtPeriodEnd
        object limits "maxSessions, maxPhotos, maxAlbums, maxStorage, customDomain"
        object usage "sessions, photos, albums, storage"
    }
```

---

## 7. Casos de Uso

```mermaid
graph LR
    subgraph Atores
        F["Fotógrafo (Admin)"]
        S["Superadmin"]
        Sys["Sistema"]
    end

    subgraph Cenários ["Cenários de Acesso"]
        UC1["Fazer Login"]
        UC2["Registrar Conta"]
        UC3["Recuperar Senha"]
        UC4["Verificar Org Ativa"]
        UC5["Desativar Organização"]
        UC6["Gerenciar Organizações"]
    end

    F --> UC1
    F --> UC2
    F --> UC3

    UC1 --> UC4
    Sys --> UC4

    S --> UC5
    S --> UC6
    UC5 -.-> UC4
```

### Detalhamento dos Casos
1. **Fazer Login**: O fotógrafo autentica com email + senha obrigatórios. Conta é criada já ativa — sem aprovação manual.
2. **Registrar Conta**: Novo usuário cria organização e conta. Acesso imediato — `approved: true` e `isActive: true` desde o cadastro.
3. **Recuperar Senha**: Fotógrafo clica "Esqueci minha senha" → recebe link por e-mail → redefine no próprio formulário de login (token JWT de 1h).
4. **Verificar Org Ativa**: O backend verifica `user.approved` e `org.isActive` a cada login. Bloqueia apenas se o Superadmin desativou manualmente.
5. **Desativar Organização**: Superadmin pode mover org para lixeira (`deletedAt`) ou desativar (`isActive=false`), bloqueando acesso do fotógrafo.
6. **Gerenciar Organizações**: Superadmin monitora métricas, altera planos, restaura orgs da lixeira e gerencia usuários.

---

## 8. Diagrama de Estados

```mermaid
stateDiagram-v2
    [*] --> Deslogado

    Deslogado --> Autenticando : doLogin()

    state Autenticando {
        [*] --> VerificandoCredenciais
        VerificandoCredenciais --> BuscandoOrg : bcrypt OK + approved=true
        BuscandoOrg --> GerandoToken : org.isActive=true
    }

    Autenticando --> Deslogado : Erro / Falha

    GerandoToken --> CarregandoAdmin : localStorage salvo

    state CarregandoAdmin {
        [*] --> ParalelizandoSetup
        ParalelizandoSetup --> SlugStorage : Promise.all loadOrgSlug + loadSidebarStorage
        ParalelizandoSetup --> AppData : loadAppData
        SlugStorage --> AbrindoDashboard
        AppData --> AbrindoDashboard
        AbrindoDashboard --> InicializandoPolling : setTimeout 5s
    }

    CarregandoAdmin --> Ativo : switchTab dashboard concluído

    Ativo --> Suspenso : Superadmin desativa org
    Ativo --> Deslogado : logout() ou Token Expirado

    Suspenso --> Ativo : Superadmin reativa org
    Suspenso --> [*]
    Ativo --> [*]

    Deslogado --> RecuperandoSenha : clica Esqueci minha senha

    state RecuperandoSenha {
        [*] --> AguardandoEmail
        AguardandoEmail --> LinkEnviado : POST /auth/forgot-password
        LinkEnviado --> RedefinindoSenha : clica link do e-mail (token 1h)
        RedefinindoSenha --> SenhaSalva : POST /auth/reset-password
    }

    RecuperandoSenha --> Deslogado : senha redefinida ou cancelado
```

---

## 9. Segurança e Multi-tenancy

- **Isolamento**: Toda consulta ao banco deve incluir `{ organizationId: req.user.organizationId }`.
- **Senhas**: Nunca trafegadas ou armazenadas em texto limpo. Salt rounds = 10.
- **Tokens**: Armazenados no `localStorage` e enviados no header `Authorization: Bearer <token>`.
- **Reset de senha**: Token JWT com `purpose: 'reset'` e validade de 1h. Link enviado por e-mail com `BASE_URL/admin/?reset=<token>`. Token validado no backend antes de atualizar o `passwordHash`.

---

## 10. Checklist de Implementação

- [x] Senha criptografada com salt rounds de 10.
- [x] JWT expira em 7 dias.
- [x] Pós-login paralelo: `Promise.all([loadAppData(), postLoginSetup()])`.
- [x] Dentro de postLoginSetup: `Promise.all([loadOrgSlug(), loadSidebarStorage()])`.
- [x] Polling de notificações com delay de 5s.
- [x] Email obrigatório no login — fluxo legado (senha sem email) removido.
- [x] Cadastro com acesso imediato — `approved: true` e `isActive: true` desde o registro.
- [x] Recuperação de senha via e-mail com token JWT de 1h.
- [x] Formulário de login com 3 telas: login / esqueci senha / redefinir senha.
- [x] Verificação de `approved` e `org.isActive` no backend (bloqueia apenas se Superadmin desativou).
- [x] Uso de variáveis CSS no formulário de login.
- [x] Tratamento de erros com `showToast` (ES Module import, não window.showToast).



# regras de que eu preciso ter ou testar

1. **Higiene do Banco de Dados (Login e Cadastro):**
   - **Tabela `users`:**
     - **Campos Ativos:** `email`, `passwordHash`, `name`, `role`, `organizationId`, `approved`.
     - **Análise:** Tabela **LIMPA**. Segue rigorosamente o padrão de autenticação JWT do sistema.
   - **Tabela `organizations` (Tenant):**
     - **Campos Críticos:** `name`, `slug`, `isActive`, `ownerId`, `plan`.
     - **Campos Redundantes (Legado vs Ativo):** 
        * `whatsapp` (Raiz) vs `siteConfig.whatsapp` (Site)
        * `email` (Raiz) vs `siteConfig.email` (Site)
        * `address` (Raiz) vs `siteContent.contato.address` (Site)
     - **Análise de Risco:** O sistema utiliza os campos de "Site" para a vitrine pública e os campos de "Raiz" para o perfil administrativo do fotógrafo. Manter ambos por enquanto para evitar quebra no painel admin.
     - **Dependência:** Essencial para resolver qual fotógrafo está logado e qual site exibir.

2. **Coleções Suspeitas (Legado):**
   - **`sitedatas`:** Esta coleção ainda é referenciada em `src/routes/siteData.js` e `src/routes/saasAdmin.js`. Ela serve como uma "ponte" para configurações globais. **NÃO DELETAR**.
