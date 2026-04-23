# Skill: Vitrine e Cadastro (Landing Page)

> Leia esta skill para entender a arquitetura da Landing Page (vitrine), o fluxo de registro de novos fotógrafos e como gerenciar o conteúdo dinâmico da plataforma.

---

## ARQUITETURA

A Landing Page é uma Single Page Application (SPA) dinâmica, desacoplada do core do admin para garantir performance e SEO.

- **Frontend:** Localizado em `home/`. Utiliza Vanilla JS e CSS interno. Renderização dinâmica via API.
- **Backend:** Roteador em `src/routes/landing.js` (conteúdo) e `src/routes/auth.js` (registro e validação).
- **Banco de Dados:** Modelo `LandingData` (configurações globais) e `Organization`/`User` (dados do novo assinante).

---

## FLUXOS DE DOCUMENTAÇÃO

### 1. Fluxograma de Execução (Flowchart)

```mermaid
flowchart TD
    A["Visitante acessa '/'"] --> B{"Tem Cache?"}
    B -- "Sim" --> C["Renderiza da Memória"]
    B -- "Não" --> D["GET /api/landing/config"]
    D --> E["Renderiza Seções (Hero, Planos, FAQ)"]
    E --> F["Interação: Sanitização de Slug"]
    F --> FS{"Validação em Tempo Real"}
    FS --> |"GET /auth/check-slug"| FSC{"Slug Disponível?"}
    FSC -- "Não" --> FSE["Exibe ✗ (Vermelho)"]
    FSC -- "Sim" --> FSS["Exibe ✓ (Verde)"]
    
    FSS --> G["Preenche Formulário de Cadastro"]
    G --> H{"Validação Frontend"}
    H -- "Falha" --> I["Exibe Erro (Toast/Label)"]
    H -- "Sucesso" --> J["POST /api/auth/register"]
    J --> K{"Validação Backend"}
    K -- "Erro (Email/Slug duplicado)" --> L["Retorna Erro 409/400"]
    K -- "Sucesso" --> M["Cria Org + User + Subscription"]
    M --> N["Exibe Sucesso + Link /admin"]
```

### 2. Diagrama de Sequência (Sequence)

```mermaid
sequenceDiagram
    autonumber
    participant V as Visitante
    participant F as Frontend (home/js)
    participant B as Backend (Express)
    participant DB as MongoDB (cliquezoom)

    V->>F: Acessa Landing Page
    F->>B: GET /api/landing/config
    B->>DB: LandingData.findOne()
    DB-->>B: Configurações (JSON)
    B-->>F: 200 OK (Content)
    F->>V: Renderiza Headline, Planos e FAQ dinamicamente

    V->>F: Digita Slug (URL)
    Note over F,B: Debounce de 500ms
    F->>B: GET /api/auth/check-slug/:slug
    B->>DB: Organization.findOne({slug})
    DB-->>B: Resultado
    B-->>F: { available: true/false }
    F->>V: Feedback visual (Verde/Vermelho)

    V->>F: Clica em 'Criar Conta'
    F->>B: POST /api/auth/register (Payload)
    
    par Paralelo: Criação do Tenant
        B->>DB: Organization.create(slug, plan: 'free')
        B->>DB: User.create(email, passwordHash, role: 'admin')
        B->>DB: Subscription.create(limits: free_defaults)
    end

    DB-->>B: Confirmação de escrita
    B-->>F: 201 Created (orgSlug)
    F->>V: Exibe Sucesso e link para /admin
```

### 3. Modelo de Dados (ERD)

```mermaid
erDiagram
    LandingData {
        Object hero "Headline, Subheadline, CTA"
        Array features "Icon, Title, Description"
        Array plans "Name, Price, Limits"
        Array faq "Question, Answer"
        Object footer "Copyright, Links"
    }

    Organization {
        String name
        String slug PK "Subdomínio"
        ObjectId ownerId FK
        String plan "free/basic/pro"
        Boolean isActive
    }

    User {
        String email PK
        String passwordHash
        ObjectId organizationId FK
        String role "admin/superadmin"
    }

    Subscription {
        ObjectId organizationId FK
        String status
        Object limits "maxSessions, maxPhotos"
    }

    Organization ||--|| User : "owned by"
    Organization ||--|| Subscription : "has"
```

### 4. Casos de Uso (Use Cases)

```mermaid
graph LR
    subgraph "Visitante"
        U1["Visualizar Conteúdo Dinâmico"]
        U2["Verificar Disponibilidade de URL"]
        U3["Realizar Cadastro Self-Service"]
    end

    subgraph "Super-Admin"
        A1["Editar Textos e Preços"]
        A2["Gerenciar FAQ"]
        A3["Monitorar Conversões"]
    end

    U1 --> V["Landing Page"]
    U2 --> V
    U3 --> B["Auth API"]
    A1 --> SA["saas-admin/landing"]
    A2 --> SA
    A3 --> SA
```

### 5. Diagrama de Estados (State)

```mermaid
stateDiagram-v2
    [*] --> Carregando: Acessa '/'
    Carregando --> Navegando: Dados da API carregados
    Navegando --> Preenchendo: Clica em 'Criar Conta'
    
    state Preenchendo {
        [*] --> InputDados
        InputDados --> ValidandoSlug: Debounce 500ms
        ValidandoSlug --> Disponivel: Verde (Disponível)
        ValidandoSlug --> Ocupado: Vermelho (Ocupado)
        Disponivel --> InputDados
        Ocupado --> InputDados
    }
    
    Preenchendo --> Processando: onSubmit
    Processando --> Sucesso: 201 Created
    Processando --> ErroRegistro: 400/409 Error
    
    ErroRegistro --> Preenchendo: Tentar novamente
    Sucesso --> Ativo: Redireciona para /admin
    Ativo --> [*]
```

---

## ESPECIFICAÇÕES TÉCNICAS

### 1. Renderização Dinâmica
- O frontend (`home/js/home.js`) utiliza a função `loadLandingConfig()` para buscar os dados de `GET /api/landing/config`.
- Os elementos são preenchidos via `innerHTML` e `textContent` usando seletores de ID específicos (ex: `#heroHeadline`).

### 2. Validação em Tempo Real (Real-time Slug Check)
- **Endpoint:** `GET /api/auth/check-slug/:slug`.
- **Mecânica:** Implementado com **Debounce** de 500ms para evitar sobrecarga no servidor enquanto o usuário digita.
- **Feedback:** Altera a cor e o texto do `#slugPreview` para indicar disponibilidade (✓ Verde / ✗ Vermelho).

### 3. Registro (Auth API)
- Local: `src/routes/auth.js` -> `POST /auth/register`.
- **Ações ao registrar:**
    1. Validação final de E-mail e Slug.
    2. Criação da `Organization` e `User` (Admin).
    3. Inicialização de `Subscription` (Plano Free).
    4. Disparo de E-mail de Boas-vindas.

### 4. Manutenção de Conteúdo
- Todo o conteúdo é gerenciado pela aba **Landing Page** no painel Super-Admin (`/saas-admin`).
- Alterações salvas refletem instantaneamente para todos os visitantes via `LandingData.findOne()`.


# regras de que eu preciso ter ou testar

1. **Higiene do Banco de Dados (Landing Page):**
   - **Tabela:** `landingdatas` (Coleção ativa no MongoDB `cliquezoom`).
   - **Mapeamento Atual:** `hero`, `howItWorks`, `features`, `plans`, `testimonials`, `faq`, `cta`, `footer`.
   - **Análise:** Esta tabela foi criada recentemente e está **100% LIMPA**. Não possui colunas legadas ou dados órfãos.
   - **Dependência:** Essencial para o funcionamento de `GET /api/landing/config`. **NUNCA DELETAR**.

2. **Verificação de Consistência:**
   - Garantir que cada nova seção adicionada ao editor no Super-Admin tenha seu campo correspondente no esquema `LandingData.js` para evitar erros de "Mixed Type".