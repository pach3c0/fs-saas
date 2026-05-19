# Handoff — Auditoria Dia 3: Sessões ✅ → Próximo: Clientes & Mensagens

> Atualizado em 2026-05-19. Para o próximo agente continuar exatamente de onde paramos.

---

## Contexto do projeto

**CliqueZoom** — SaaS para fotógrafos. Painel admin em Vanilla JS (ES Modules, dual-theme light/dark).
Estamos no **Dia 3 de uma auditoria de 7 dias**. Módulo Sessões totalmente auditado e documentado.
O próximo passo é **Clientes** (`admin/js/tabs/clientes.js`) e **Mensagens** (`admin/js/tabs/mensagens.js`).

---

## O que já foi feito — Módulo Sessões (não refazer)

### Auditoria CSS (7 fixes — sessão anterior)
- `actions.js` — hexcodes substituídos por tokens CSS nos modais de histórico
- `modal-participantes.js` — prefixo `--ad-*` removido de todos os tokens
- `list.js` — RGBA hardcoded substituído por `color-mix()` nos badges de status
- `upload.js` — RGBA no modal de validação corrigidos
- `modal-detail.js` — RGBA nos badges de status corrigidos
- `actions.js` (linhas 241, 246, 247, 336) — RGBA + tokens inválidos `--text` / `--text-dim` corrigidos

### Documentação do formulário (2026-05-19 — commit `0a72be8`)
- `admin/js/tabs/ajuda.js` — seção "CRIANDO UMA NOVA SESSÃO — MODO SELEÇÃO" inserida no manual com 9 blocos documentados e mini-previews visuais
- `admin/js/tabs/sessoes/modal-form.js` — **fix de validação de datas**: removida a regra que bloqueava `data do evento < data de criação`. Única regra mantida: prazo de seleção ≥ data do evento

### Documentação de referência criada
- `skills/02_sessoes.md` — skill completo do módulo
- `skills/00_manual-usuario.md` — sessoes marcado como `✅ Documentado`

---

## Regras obrigatórias antes de tocar em qualquer código

### 1. Leia primeiro
- `CLAUDE.md` — regras gerais do projeto (tokens CSS, idioma, módulos, deploy)
- `skills/00_manual-usuario.md` — padrão de documentação do manual (obrigatório ao documentar novo módulo)
- `skills/01_dasboard.md` — modelo de como ficou o Dashboard (referência de qualidade)

### 2. Regras de código (admin/)
- **Estilos:** SEMPRE inline com tokens CSS. **Nunca hexcodes**, **nunca RGBA hardcoded**
- Tokens válidos: `var(--accent)`, `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--border)`, `var(--green)`, `var(--red)`, `var(--yellow)`, `var(--orange)`, `var(--purple)`
- Para background semitransparente: `color-mix(in srgb, var(--green) 15%, transparent)` — nunca RGBA hardcoded
- **Sem `console.log`** — usar `window.showToast?.('msg', 'error')`
- **Sem `alert/confirm`** — usar `window.showToast` e `window.showConfirm`
- **Prefixo `--ad-*` é inválido** — tokens não têm prefixo. Use `var(--text-primary)` não `var(--ad-text-primary)`

### 3. Regra de linguagem (CRÍTICO)
- **Nunca usar "estúdio"** em copy voltado ao fotógrafo → substituir por "negócio", "trabalho", "conta"
- Exceção: a seção "Estúdio" do site público (configurável pelo fotógrafo)

---

## Próxima tarefa — Dia 3 continuação: Clientes & Mensagens

### Passo 1 — Auditar `admin/js/tabs/clientes.js`

**O que fazer:**
1. Ler o arquivo completo
2. Verificar: hexcodes hardcoded, RGBA hardcoded, tokens com prefixo `--ad-*`, tokens inexistentes como `--text` ou `--text-dim`, uso de `console.log`, uso de `alert/confirm`
3. Aplicar todos os fixes encontrados
4. Documentar o módulo no Manual do Usuário (`admin/js/tabs/ajuda.js` → `MANUAL_MODULES`, id: `clientes`)

**Mini-previews obrigatórios para o manual de Clientes:**
- Lista de clientes (cards ou tabela) com dados de exemplo
- Modal de criação/edição de cliente
- Campo de busca/filtro

### Passo 2 — Auditar `admin/js/tabs/mensagens.js`

**O que fazer:**
1. Ler o arquivo completo
2. Mesma checklist de fixes do passo anterior
3. Documentar no Manual do Usuário (id: `mensagens`)

**Mini-previews obrigatórios para o manual de Mensagens:**
- Lista de contatos do site
- Lista de depoimentos pendentes de aprovação
- Ações de aprovar/recusar depoimento

### Passo 3 — Criar skills e atualizar índices

Para cada módulo documentado:
- Criar `skills/03_clientes.md` e `skills/04_mensagens.md` (seguir formato de `skills/02_sessoes.md`)
- Atualizar `skills/00_manual-usuario.md` — mudar status de `🔲 Placeholder` para `✅ Documentado`
- Atualizar `CLAUDE.md` — marcar os módulos na seção "Em andamento"

### Passo 4 — Commit & push

Incluir no commit:
- `admin/js/tabs/clientes.js` (se houver fixes)
- `admin/js/tabs/mensagens.js` (se houver fixes)
- `admin/js/tabs/ajuda.js`
- `skills/03_clientes.md`
- `skills/04_mensagens.md`
- `skills/00_manual-usuario.md`
- `CLAUDE.md`

Mensagem sugerida:
```
feat(manual): auditar e documentar módulos Clientes e Mensagens
```

**Não fazer deploy** — aguardar pedido explícito do usuário.

---

## Estado atual da auditoria de 7 dias

| Dia | Tarefa | Status |
|---|---|---|
| Dia 1 | Limpeza estrutural | ✅ Concluído |
| Dia 2 | Auditoria backend (126 endpoints) | ✅ Concluído |
| Dia 3 | Auditoria frontend | 🔄 Em andamento — Dashboard ✅, Sessões ✅, **Clientes/Mensagens pendente** |
| Dia 4 | Auditoria site builder | ⏳ |
| Dia 5 | CRM, marketing, integrações, plano | ⏳ |
| Dia 6 | Domínio, segurança, testes Playwright | ⏳ |
| Dia 7 | Correções, polimento, deploy final | ⏳ |

---

## Arquivos de referência

| Arquivo | Propósito |
|---|---|
| `CLAUDE.md` | Regras gerais do projeto |
| `skills/00_manual-usuario.md` | Padrão de documentação do manual |
| `skills/01_dasboard.md` | Modelo de skill file — Dashboard |
| `skills/02_sessoes.md` | Modelo de skill file — Sessões |
| `admin/js/tabs/ajuda.js` | Manual do Usuário (array `MANUAL_MODULES`) |
| `admin/js/tabs/clientes.js` | Próximo arquivo a auditar |
| `admin/js/tabs/mensagens.js` | Próximo arquivo a auditar |
