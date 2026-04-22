# Padrão de Documentação de Skills (Fluxos)

A partir de 22/04/2026, todos os arquivos de documentação técnica localizados em `skills/` que descrevam funcionalidades (features) do sistema DEVEM obrigatoriamente conter os 5 fluxos de diagramação a seguir.

Esta regra visa garantir a rastreabilidade técnica, facilidade de onboarding e compatibilidade total com visualizadores como **Obsidian**.

## Os 5 Fluxos Obrigatórios

Cada nova skill ou refatoração de skill existente deve incluir as seguintes seções com diagramas Mermaid:

### 1. Fluxograma de Execução (Flowchart)
- **Objetivo**: Mostrar a lógica de decisão e o caminho que o código percorre.
- **Sintaxe**: `flowchart TD`.
- **Requisito**: Usar aspas em labels e evitar operadores complexos para compatibilidade com Obsidian.

### 2. Diagrama de Sequência (Sequence)
- **Objetivo**: Demonstrar a interação temporal entre o Usuário, Frontend, Backend e Banco de Dados.
- **Sintaxe**: `sequenceDiagram`.
- **Requisito**: Incluir `autonumber` e destacar chamadas paralelas (`par`) quando existirem.

### 3. Modelo de Dados (ERD)
- **Objetivo**: Mapear as entidades envolvidas na feature e seus relacionamentos.
- **Sintaxe**: `erDiagram`.
- **Requisito**: Identificar PK (Primary Key), FK (Foreign Key) e tipos de relacionamento (1:1, 1:N).

### 4. Casos de Uso (Use Cases)
- **Objetivo**: Listar as funcionalidades do ponto de vista dos atores (Fotógrafo, Cliente, Admin).
- **Sintaxe**: `graph LR`.
- **Requisito**: Agrupar atores e cenários em subgrafos distintos.

### 5. Diagrama de Estados (State)
- **Objetivo**: Representar o ciclo de vida das entidades ou da sessão durante a execução da feature.
- **Sintaxe**: `stateDiagram-v2`.
- **Requisito**: Identificar estados iniciais, finais e condições de transição.

---

## Template de Seção

```markdown
## Fluxos de Documentação

### 1. Fluxograma
[Mermaid Flowchart aqui]

### 2. Diagrama de Sequência
[Mermaid Sequence aqui]

### 3. Modelo de Dados (ERD)
[Mermaid ERD aqui]

### 4. Casos de Uso
[Mermaid Graph LR aqui]

### 5. Diagrama de Estados
[Mermaid StateDiagram aqui]
```
