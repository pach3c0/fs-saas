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
> [!NOTE]
> Este resumo é destinado ao time de desenvolvimento para consulta rápida durante o processo de evolução da plataforma CliqueZoom.