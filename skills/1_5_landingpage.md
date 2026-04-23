# Skill: Vitrine e Cadastro (Landing Page)

> Leia esta skill para entender a arquitetura da Landing Page (vitrine), o fluxo de registro de novos fotógrafos e como gerenciar o conteúdo dinâmico da plataforma.

---

## ARQUITETURA

A Landing Page é uma Single Page Application (SPA) minimalista, desacoplada do core do admin para garantir performance e SEO.

- **Frontend:** Localizado em `home/`. Utiliza Vanilla JS e CSS interno.
- **Backend:** Roteador em `src/routes/landing.js` para conteúdo e `src/routes/auth.js` para registro.
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
    F --> G["Preenche Formulário de Cadastro"]
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
    F->>V: Exibe Página Renderizada

    V->>F: Digita dados de Cadastro (Slug, Email)
    F->>V: Preview da URL em tempo real
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
        U1["Visualizar Benefícios"]
        U2["Verificar Preços"]
        U3["Simular URL (Slug)"]
        U4["Realizar Cadastro"]
    end

    subgraph "Super-Admin"
        A1["Alterar Preços dos Planos"]
        A2["Editar FAQ"]
        A3["Mudar Headline da Hero"]
    end

    U1 --> V["Landing Page"]
    U2 --> V
    U3 --> V
    U4 --> B["Auth API"]
    A1 --> SA["saas-admin/landing"]
    A2 --> SA
    A3 --> SA
```

### 5. Diagrama de Estados (State)

```mermaid
stateDiagram-v2
    [*] --> Navegando: Acessa '/'
    Navegando --> Preenchendo: Clica em 'Criar Conta'
    
    state Preenchendo {
        [*] --> InputDados
        InputDados --> ValidandoSlug: onInput
        ValidandoSlug --> InputDados: Slug disponível
        ValidandoSlug --> Erro: Slug em uso
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

### 1. Padrão de Slug
- No frontend (`home/js/home.js`), o slug é limpo via Regex:
  `value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-{2,}/g, '-')`
- No backend, o slug é a **chave primária lógica** para multi-tenancy.

### 2. Conteúdo Dinâmico (`LandingData`)
- O site não é 100% estático. Ele busca o conteúdo de `GET /api/landing/config`.
- Caso o banco esteja vazio, o backend cria um documento inicial com valores `default` (conforme definido em `src/models/LandingData.js`).

### 3. Registro (Auth API)
- Local: `src/routes/auth.js` -> `POST /auth/register`.
- **Ações ao registrar:**
    1. Verifica duplicidade de E-mail e Slug.
    2. Cria `Organization` (com `isActive: true`).
    3. Cria `User` com `role: 'admin'`.
    4. Cria `Subscription` com limites do plano `free`.
    5. Dispara E-mail de Boas-vindas (`sendWelcomeEmail`).

### 4. CSS e Design
- **Estilo:** Baseado no design system da vitrine (não usa o Stitch Dark do admin).
- **Cores:** Branco (`#fafafa`), Preto (`#1a1a1a`), Verde Sucesso (`#16a34a`).
- **Responsividade:** Mobile-first com Media Queries no final do arquivo `home/index.html`.

---

## MANUTENÇÃO

Para alterar qualquer texto da landing page:
1. Acesse o painel **Super-Admin** (`/saas-admin`).
2. Vá na aba **Landing Page**.
3. Altere os campos e clique em Salvar.
4. O backend atualizará o documento `LandingData` e a mudança refletirá instantaneamente para todos os visitantes.
