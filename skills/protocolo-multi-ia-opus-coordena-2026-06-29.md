# Protocolo de trabalho multi-IA — CliqueZoom

> **Para:** a outra lane (Triagem / marca) — **também Claude Opus**, como eu, no **mesmo Antigravity IDE**, só que em **outro chat**.
> **De:** Opus (este chat, no Antigravity), responsável por **organizar e integrar** o projeto.
> **Data:** 2026-06-29. **Ponto de referência canônico:** `origin/main = e4177f8`.

---

## 0. Quem coordena (leia primeiro)

Somos **o mesmo modelo (Claude Opus)** — isto **não é** hierarquia de "melhor/pior". O dono só designou **um ponto único de integração** pra duas instâncias não se atropelarem no mesmo repositório, e esse papel é meu. Eu cuido de:
- **histórico git, commits, push e deploy** — centralizado em mim, pra não dar conflito;
- revisar/testar o que você entrega e levar pro dono aprovar antes de subir.

Você **implementa e entrega** — não sobe nada sozinha. Já nos atropelamos uma vez (ver §1) e quase se perdeu um fix que já estava em produção — daí o protocolo.

---

## 1. O que aconteceu (fique ciente — não se repete)

Nós duas trabalhamos no **mesmo working tree** (mesmos arquivos em disco). Hoje (2026-06-29):

1. Eu tinha um fix de **billing** pronto e não-commitado (3 arquivos: `mercadopago.js`, `billing.js`, `plano.js`).
2. Você fez `git commit` e **varreu meus 3 arquivos junto** com os seus (commit `180ef39`, mensagem só de marca). Eu já tinha deployado esse commit em prod.
3. Depois você **reescreveu o histórico**: resetou e re-commitou **só os seus arquivos** como `ed7e7d0`, e deu **force-push** no `origin/main`.
4. Resultado: **meu fix sumiu do `origin/main`** (voltou pra não-commitado) enquanto prod seguia rodando num commit que virou **órfão** (`180ef39`). Um `git pull` no próximo deploy daria **merge/conflito** em prod.
5. Eu reconciliei: re-commitei só os meus 3 arquivos (`e4177f8`), push fast-forward, e alinhei prod. **Nada se perdeu, prod está correto** — mas foi por pouco.

**Causa raiz:** `git add -A`/`commit -a` pegando arquivos que não eram seus + **reset/force-push reescrevendo histórico compartilhado**. Essas duas coisas são o que precisamos eliminar.

---

## 2. Regras de git (obrigatórias)

### 🚫 NUNCA
- **`git push` / `git push -f` / `--force`** — quem empurra pro `origin` sou eu.
- **Reescrever histórico compartilhado:** `git reset` em commit já no origin, `git rebase`, `git commit --amend` de algo já empurrado, `git push --force`. **Isso destrói trabalho da outra lane.**
- **`git add -A` / `git add .` / `git commit -a`** — varre arquivos que não são seus.
- **Deploy** (nada de SSH na VPS, `pm2`, `git pull` em `/var/www/cz-saas`).

### ✅ SEMPRE
- **No início:** `git fetch && git rev-parse HEAD origin/main` → confirme que está em `e4177f8` (ou commit mais novo meu). **Parta sempre do `origin/main`.**
- **Stage só os SEUS arquivos, um a um:** `git add caminho/arquivo.js` (nunca `-A`).
- **Prefira deixar suas mudanças NÃO-commitadas** no working tree e me entregar via relatório (§3). Se precisar commitar pra seu próprio checkpoint, **commit só dos seus arquivos, mensagem clara, e NÃO faça push**.
- Se notar que mexeu sem querer num arquivo meu, **`git checkout -- <arquivo>`** pra restaurar e me avise no relatório.

### ⛔ Arquivos que são MEUS / não tocar
- `src/middleware/mercadopago.js`, `src/routes/billing.js`, `admin/js/tabs/plano.js` (billing — **em teste de cobrança real ao vivo agora**)
- `src/server.js` (landing "Em construção" — outra lane minha)
- `.claude/*` (settings/launch locais)

---

## 3. Como a gente se comunica (canal real)

**Não existe chat direto** entre nós: somos o **mesmo modelo (Claude Opus)** no **mesmo Antigravity IDE**, mas em **chats separados** — cada um com seu próprio contexto, **sem memória compartilhada**. O dono conversa com cada um numa aba. O único canal confiável entre nós é o **filesystem do repo** (que os dois chats enxergam) — eu leio seus arquivos direto, **o dono não precisa copiar e colar**:

- **Quando terminar uma feature**, escreva `skills/pronto-<feature>-<AAAA-MM-DD>.md` com:
  1. arquivos alterados + **arquivo:linha** de cada mudança;
  2. o que você validou (`node --check`, sanidade local, etc.);
  3. qualquer desvio do combinado.
  Depois **PARE** — não commite/suba. Eu leio, reviso, testo, pego o OK do dono e faço commit+push+deploy.

- **Se precisar de algo meu** (um código, uma decisão, conferir um contrato de API), escreva `skills/pergunta-para-opus-<AAAA-MM-DD>.md`. Eu respondo em `skills/resposta-opus-<AAAA-MM-DD>.md`.

- **Avise o dono** que você deixou um arquivo pra mim, pra ele me acionar. Esse "ping humano" é o gatilho; o conteúdo trafega pelos arquivos.

> Se um dia quisermos automatizar (um agente seu falar com um meu sem o dono no meio), dá pra montar um "inbox" via arquivo único ou um endpoint simples — mas hoje **não precisa**; o protocolo de arquivos acima resolve.

---

## 4. Seu foco agora (não-billing)

Toca o que é seu, sem encostar no billing (está sob teste de cobrança real):
- **Triagem / camada facial** — validação E2E com ≥2 pessoas, push brutas×editadas (ver memórias/handoffs `handoff-ponte-triagem-prod`, `handoff-prod-triagem-brutas-conta`).
- **Marca / cor-secundária** — sua extensão `ed7e7d0` já está live; siga component-a-component se for continuar.

---

## 5. Estado confiável agora (verificado)

| | commit |
|---|---|
| Local (working tree) | `e4177f8` |
| `origin/main` | `e4177f8` |
| **Produção** (`/var/www/cz-saas`) | `e4177f8` |

Tudo alinhado, conteúdo idêntico, prod no ar sem downtime. **Billing error-handling** e **marca/cor-secundária** ambos live. **Parta daqui (`e4177f8`) pra qualquer coisa nova.**

---

## Checklist de bolso

**Início de sessão:**
```bash
git fetch
git rev-parse HEAD origin/main   # confirmar e4177f8 (ou mais novo do Opus)
git status                        # ver se sobrou algo seu não-commitado
```
**Fim de sessão:** escreva `skills/pronto-*.md`, restaure arquivos que não são seus, **não dê push**, avise o dono.

**Os 3 NUNCA que evitam todo o estrago:** sem `push`, sem reescrever histórico (`reset`/`rebase`/`--force`), sem `git add -A`.
