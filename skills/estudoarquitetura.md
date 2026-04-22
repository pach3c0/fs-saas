# Estudo de Arquitetura de Software: Fundamentos, Padrões e Resiliência

Este documento é um guia consolidado sobre arquitetura de software, focado em escalabilidade, resiliência e estratégias de modernização de sistemas.

---

## Índice
1. [Fundamentos de Arquitetura](#1-fundamentos-de-arquitetura)
2. [Escalabilidade e Disponibilidade](#2-escalabilidade-e-disponibilidade)
3. [Princípios de Sucesso e SRE (Reliability)](#3-princípios-de-sucesso-e-sre-reliability)
4. [Métricas de Recuperação (RTO e RPO)](#4-métricas-de-recuperação-rto-e-rpo)
5. [Padrões de Design para Evolução e Modernização](#5-padrões-de-design-para-evolução-e-modernização)
6. [Estratégias de Deployment](#6-estratégias-de-deployment)

---

## 1. Fundamentos de Arquitetura

### Arquitetura vs. Design
*   **Arquitetura:** Decisões de alto nível, difíceis de mudar, que impactam a estrutura global (ex: Monolito vs. Microsserviços).
*   **Design:** Decisões de baixo nível, focadas na organização do código e componentes internos (ex: Design Patterns, SOLID).

### Arquitetura 3-Tier (Camadas)
A estrutura clássica para garantir separação de responsabilidades:
1.  **Apresentação (Front-end):** Interface com o usuário.
2.  **Aplicação (Back-end/Regras de Negócio):** Processamento lógico.
3.  **Dados (Banco de Dados):** Persistência das informações.

### Stateless vs. Stateful
| Conceito | Descrição | Impacto na Escalabilidade |
| :--- | :--- | :--- |
| **Stateless** | A aplicação não guarda estado local (sessão, arquivos). Toda requisição é independente. | **Alta:** Fácil de escalar horizontalmente (qualquer servidor responde). |
| **Stateful** | A aplicação depende de estado local (ex: arquivo em `/uploads` ou sessão em memória). | **Baixa:** Requer "Sticky Sessions" e dificulta o balanceamento de carga. |

---

## 2. Escalabilidade e Disponibilidade

### Tipos de Escalabilidade
*   **Vertical (Scale Up):** Aumentar recursos (CPU/RAM) de um único servidor.
    *   *Prós:* Simples de implementar.
    *   *Contras:* Tem limite físico, custo exponencial e gera downtime no upgrade.
*   **Horizontal (Scale Out):** Adicionar mais servidores ao cluster.
    *   *Prós:* Praticamente ilimitada, maior resiliência, custo linear.
    *   *Contras:* Requer arquitetura Stateless e balanceadores de carga.

### Disponibilidade e Tolerância a Falhas
*   **Alta Disponibilidade (HA):** O sistema continua operando através de redundância (Failover), mas pode haver uma pequena interrupção durante a troca.
*   **Tolerância a Falhas (Fault Tolerance):** O sistema tolera a falha de um componente sem qualquer interrupção visível para o usuário (Custo muito superior).

---

## 3. Princípios de Sucesso e SRE (Reliability)

Uma arquitetura de sucesso baseia-se nos pilares do SRE (*Site Reliability Engineering*):

1.  **Planejamento de Capacidade:** Prever e garantir recursos para suportar a carga.
2.  **Observabilidade:** Monitorar logs, métricas e traces para entender a jornada do usuário.
3.  **Otimização de Custo:** Equilibrar performance e gastos (evitar o desperdício do "over-provisioning").
4.  **Engenharia de Release:** Processos seguros de entrega de código.
5.  **Confiabilidade (Reliability):** Garantir consistência, durabilidade e disponibilidade.

### Acordos de Nível de Serviço (SLA/SLO/SLI)
*   **SLI (Indicator):** A métrica real (ex: "Tempo de resposta de 200ms").
*   **SLO (Objective):** A meta interna (ex: "99.9% das requisições devem ter sucesso").
*   **SLA (Agreement):** O contrato com o cliente, prevendo multas se o SLO não for atingido.

---

## 4. Métricas de Recuperação (RTO e RPO)

Essenciais para planos de desastre (DR):

*   **RTO (Recovery Time Objective):** Tempo máximo que o sistema pode ficar fora do ar até ser recuperado. (Ex: "Precisamos voltar em 1 hora").
*   **RPO (Recovery Point Objective):** Quantidade máxima de dados que se aceita perder (ponto de backup). (Ex: "Backup de 15 em 15 min" = RPO de 15 min).

---

## 5. Padrões de Design para Evolução e Modernização

### BFF (Back-end For Front-end)
Criação de uma camada intermediária específica para cada tipo de cliente (Mobile, Web, IoT).
*   **Vantagem:** Otimiza o payload (evita over-fetching), melhora a performance em redes móveis e simplifica o front-end.

### Strangler Fig (Padrão Figueira)
Estratégia para migrar monolitos para microsserviços gradualmente.
*   **Como funciona:** Cria-se novas funcionalidades em microsserviços e usa-se um Proxy Reverso (como Nginx) para desviar o tráfego do monolito para o novo serviço aos poucos, até que o monolito possa ser "estrangulado" e removido.

### Feature Flag (Feature Toggle)
Capacidade de ativar ou desativar funcionalidades em tempo real via configuração, sem novo deploy.
*   **Vantagem:** Permite "dark launches", testes em produção e rollbacks instantâneos.

### ACL (Anti-Corruption Layer)
Camada de isolamento usada quando um sistema novo precisa falar com um legado (ou externo) que possui uma linguagem/formato de dados "sujo" ou incompatível.
*   **Vantagem:** Evita que a complexidade e os vícios do sistema antigo "corrompam" o design do sistema novo. Implementa os padrões *Facade* e *Adapter*.

---

## 6. Estratégias de Deployment

### In-Place vs. Immutable
*   **In-Place:** Atualiza o código no servidor existente.
    *   *Risco:* "Config Drift" (servidores ficam diferentes entre si após sucessivas atualizações manuais).
*   **Immutable:** Cria uma infraestrutura nova (novo servidor/container) com a versão nova e descarta a antiga.
    *   *Vantagem:* Garantia de que o ambiente é idêntico ao testado.

### Modelos de Rollout

| Estratégia | Descrição | Risco |
| :--- | :--- | :--- |
| **Big Bang (One Shot)** | Atualiza 100% das instâncias de uma vez. | **Alto:** Qualquer erro afeta 100% dos usuários. |
| **Rolling (Gradual)** | Atualiza em lotes (ex: 25% por vez). | **Médio:** Convivem duas versões ao mesmo tempo. |
| **Blue-Green** | Mantém dois ambientes idênticos. Vira o tráfego 100% de um para o outro. | **Baixo:** Rollback instantâneo (basta virar a chave). |
| **Canary** | Libera a nova versão para uma pequena amostragem de usuários (ex: 5%) antes do rollout total. | **Mínimo:** Detecta bugs com impacto reduzido. |
| **Shadow (Dark Launch)** | Duplica o tráfego de produção para a versão nova, mas o usuário só recebe a resposta da versão estável. | **Zero (no usuário):** Valida performance e lógica com dados reais sem risco. |

---

## 7. Arquitetura SaaS Multi-Tenant

### 7.1 Single Tenant vs Multi-Tenant

| Conceito | Descrição | Impacto |
| :--- | :--- | :--- |
| **Single Tenant** | Infraestrutura dedicada por cliente. Isolamento total de recursos, IP, disco e BD. | Custo alto, manutenção por tenant, máxima segurança |
| **Multi-Tenant** | Infraestrutura compartilhada entre clientes (tenants). Isolamento lógico via código. | Custo baixo, eficiência de recursos, complexidade maior |
| **Híbrido** | Algumas camadas compartilhadas, outras isoladas. Comum em arquiteturas maduras. | Equilíbrio entre custo e segurança por serviço |

**Tenant** = inquilino = um cliente/organização dentro do SaaS.

### 7.2 Modelos de Isolamento de Dados (AWS SaaS Factory)

| Modelo | Isolamento | Custo | Complexidade | Quando usar |
| :--- | :--- | :--- | :--- | :--- |
| **Silo** | BD físico separado por tenant | Alto | Baixa | Dados sensíveis (pagamentos, compliance, enterprise) |
| **Bridge** | Mesmo BD físico, schemas lógicos separados | Médio | Média | Isolamento lógico com custo controlado |
| **Pool** | Mesmo BD, mesma tabela, coluna `tenantId` | Baixo | Alta (toda query precisa de filtro de tenant) | Fase inicial, dados não-sensíveis |

**Mistura de modelos é normal e esperada** — cada microserviço/componente pode ter seu próprio modelo conforme necessidade de segurança e custo.

### 7.3 CliqueZoom hoje — diagnóstico por componente

| Componente | Modelo atual | Correto? | Observação |
| :--- | :--- | :--- | :--- |
| Sessions, Albums, Clients | Pool (`organizationId`) | ✅ | Dados não-sensíveis, custo baixo |
| Fotos (`/uploads/orgId/`) | Pool por diretório | ✅ | Isolamento físico de arquivos por pasta |
| Organization, SiteData | Pool (`organizationId`) | ✅ | Configurações do fotógrafo |
| Notificações, Subscription | Pool (`organizationId`) | ✅ | Operacional |
| **Pagamentos (futuro)** | Ainda não existe | ⚠️ | Ao implementar: avaliar Silo por compliance |
| **Filas de jobs/ffmpeg (futuro)** | Ainda não existe | ⚠️ | Ao implementar: filas dedicadas por tenant permitem priorização por plano |

### 7.4 Perguntas para decidir Single vs Multi-Tenant (checklist)

Usar ao projetar qualquer novo componente ou ao revisar a arquitetura:

1. **Nível de isolamento por segurança/conformidade** — o dado é financeiro, médico, jurídico? Exige norma específica?
2. **Tipo de cliente** — Enterprise que exige datacenter próprio? SMB que aceita compartilhado?
3. **Custo do produto** — o cliente pode pagar por infraestrutura dedicada? Qual plano justifica isso?
4. **Modelo de planos** — diferença entre planos é por cota (GB, transações/dia) ou por isolamento?
5. **Nível de customização** — customização por tenant exige código diferente (→ silo) ou só configuração diferente (→ pool)?
6. **Tamanho da equipe** — uma pessoa não consegue operar 50 silos manualmente; automação é obrigatória
7. **Expectativa de volume** — assíncrono ou síncrono? Sazonal (Dia das Bruxas)? Previsibilidade de pico?

---

## 8. Desafios Técnicos SaaS

### 8.1 Observabilidade Tenant-Aware

Logs, métricas e traces precisam identificar **qual tenant** gerou cada evento. Sem isso não é possível:
- Saber qual plano um tenant está consumindo
- Fazer throttling por tenant
- Detectar Neighbor Noise
- Cobrar por uso

**Padrão:** todo log/métrica deve incluir `organizationId`. Ferramentas (DataDog, CloudWatch, etc.) não sabem disso automaticamente — é necessário instrumentar o código.

**No CliqueZoom hoje:** `organizationId` está nos modelos, mas logs do Express não incluem o tenant. Isso é aceitável na fase atual.

**Quando implementar:** ao adicionar planos com limites de uso (ex: "máximo 500 fotos por sessão no plano Free").

### 8.2 Throttling, Cotas e Limites

Dois tipos que coexistem — não são excludentes:

| Tipo | Exemplo | Onde aplicar |
| :--- | :--- | :--- |
| **Cota de negócio** | Máx 10 sessões ativas no plano Free | `planLimits` middleware já implementado |
| **Throttling técnico** | Máx 100 req/s por tenant na API | Rate limiting por `organizationId` (futuro) |

**No CliqueZoom hoje:** `src/middleware/planLimits.js` já implementa cotas de negócio por plano. Throttling técnico (rate limit) ainda não existe.

### 8.3 Neighbor Noise

Quando um tenant consome recursos excessivos e afeta outros tenants no mesmo pool.

**Sintomas:** lentidão para outros fotógrafos durante upload massivo de um único cliente.

**Soluções (em ordem de complexidade):**
1. Cotas de upload por sessão (já tem limite no multer)
2. Rate limiting por `organizationId` na API
3. Filas de jobs separadas por tenant (para processamento pesado como ffmpeg)
4. Migrar tenant problemático para shard/cluster separado (avançado)

### 8.4 Onboarding e Offboarding Automático

**Onboarding** deve ser: simples, rápido, transparente e automático.
- ✅ CliqueZoom: `/api/auth/register` cria `Organization` + `User` em uma única chamada

**Offboarding** (cancelamento/inadimplência) deve limpar recursos automaticamente:
- ⚠️ Hoje: não existe processo de offboard. Tenants inativos ficam no banco indefinidamente.
- **Quando implementar:** criar job que, após N dias de inadimplência, desativa `isActive=false` e agenda deleção de uploads após 30 dias de aviso.

### 8.5 Deployment com Raio de Impacto Baixo

Em multi-tenant, um deploy afeta todos os tenants simultaneamente. Estratégias:

| Estratégia | Como | Status CliqueZoom |
| :--- | :--- | :--- |
| Rolling deploy | `pm2 reload` reinicia instâncias gradualmente | ✅ Já funciona |
| Feature Flag | `Organization.siteEnabled`, `?_preview=1` | ✅ Já existe |
| Canary por tenant | Ativar feature só para tenants de teste primeiro | ⚠️ Não implementado |

---

## 9. Control Plane vs Data Plane

### Definições

| Plano | O que é | Exemplos |
| :--- | :--- | :--- |
| **Control Plane** | Gerencia e provisiona recursos. Faz CRUD do Data Plane. | Onboarding, offboarding, migração de tenant, monitoração, backup |
| **Data Plane** | O produto em si que o cliente usa. Criado pelo Control Plane. | API de sessões, galeria do cliente, site público do fotógrafo |

### Dois níveis de Control Plane

1. **Interno (invisível ao cliente):** operado pela equipe do CliqueZoom — migrações, monitoração de Neighbor Noise, patches de BD
2. **Externo (visível ao cliente):** operado pelo fotógrafo — cadastro, configuração do site, upload de fotos, gestão de clientes

### Regra crítica: Data Plane não deve depender do Control Plane em tempo real

❌ Errado: Data Plane faz polling constante no Control Plane para buscar configurações → escala mal, aumenta acoplamento  
✅ Certo: Control Plane publica configurações em storage escalável (ex: S3/R2); Data Plane lê de lá de forma independente

**Analogia CliqueZoom:** `Organization.integrations` (configurações do fotógrafo) é lido pelo Data Plane a cada requisição — correto. Não há polling de control plane.

### CliqueZoom — mapeamento atual

| Componente | Plano |
| :--- | :--- |
| `POST /api/auth/register` | Control Plane externo (onboarding) |
| `src/utils/deadlineChecker.js` (scheduler 6h) | Control Plane interno (automação) |
| `scripts/backup.sh` (cron diário) | Control Plane interno (operações) |
| `GET /api/sessions`, `GET /site/:slug` | Data Plane |
| `saas-admin/` | Control Plane interno (super-admin) |
| `admin/` | Control Plane externo (painel do fotógrafo) |

---

## 10. Framework de Decisão — Novo Componente SaaS

Antes de implementar qualquer nova feature significativa, percorrer estes passos:

### Passo 1 — Clareza nos entregáveis
- Quem usa? (fotógrafo, cliente final, super-admin)
- É síncrono ou assíncrono?
- Tem pico sazonal previsível?
- Qual SLO mínimo aceitável?

### Passo 2 — Identificar componentes e customização
- Listar todos os componentes envolvidos (frontend, backend, BD, fila, storage)
- Para cada um: a customização por tenant altera o **código** ou apenas a **configuração**?
  - Altera código → candidato a Silo
  - Altera configuração → Pool serve

### Passo 3 — Decidir modelo por componente
- Pool onde possível (custo)
- Bridge quando isolamento lógico é necessário mas BD físico único é aceitável
- Silo apenas onde segurança/compliance exige ou onde isolamento de performance é crítico

### Passo 4 — Avaliar isolamento e segurança
- Precisa de criptografia no BD?
- Como isolar tenant barulhento (Neighbor Noise)?
- Quantos tenants por shard/cluster?

### Passo 5 — Definir operações
- Como será o onboarding desse recurso?
- Como será o offboarding (limpeza)?
- Qual Control Plane (interno ou externo) gerencia isso?
- Quais métricas de observabilidade são necessárias?

### Passo 6 — Throttling e limites
- Limite de negócio: cotas por plano → `planLimits` middleware
- Limite técnico: rate limiting por `organizationId`
- Limite de infraestrutura: tamanho de payload, conexões simultâneas

---

## 11. Boas Práticas SaaS — Resumo Executivo

| Prática | Descrição | Status CliqueZoom |
| :--- | :--- | :--- |
| **Sem one-size-fits-all** | Cada componente decide seu modelo (Silo/Bridge/Pool) individualmente | ✅ Aplicar no framework acima |
| **Decomposição por carga** | Separar serviços com base em carga e necessidade de isolamento | ✅ Monolito saudável, decomposição quando necessário |
| **Isolamento entre tenants** | Um tenant nunca acessa dado de outro. Segurança = resiliência. | ✅ `organizationId` em todos os modelos |
| **Tenant-aware em tudo** | Logs, métricas, queries, filas — tudo deve saber qual tenant está operando | ⚠️ Queries: ✅. Logs/métricas: não ainda |
| **Onboarding simples e automático** | Formulário único, provisionamento automático, sem intervenção manual | ✅ Register cria org+user |
| **Offboarding limpo** | Limpeza automática de recursos após cancelamento | ⚠️ Não implementado |
| **Abstrair complexidade do cliente** | O fotógrafo não deve ver CPU, memória ou detalhes de infraestrutura | ✅ Planos por funcionalidade, não por recurso |
| **Control Plane separado do Data Plane** | Operações de gestão não interferem com o produto em uso | ✅ `saas-admin` separado do `admin` |
| **Nem tudo precisa ser isolado** | Pool onde faz sentido; Silo apenas quando necessário | ✅ Validar sempre com o checklist da seção 7.4 |
| **Nem tudo precisa ser síncrono** | Processos pesados (ffmpeg, e-mail em massa) → fila assíncrona | ⚠️ Scheduler hoje é síncrono no event loop |

---
> [!NOTE]
> Este resumo é destinado ao time de desenvolvimento para consulta rápida durante o processo de evolução da plataforma CliqueZoom.