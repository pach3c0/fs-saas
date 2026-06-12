# Ajuda & Tutoriais — Academy + Manual do Usuário (CliqueZoom Admin)

> Documentação gerada em 2026-06-12 (programa de testes — módulo 11 de 12).
> Referência frontend: `admin/js/tabs/ajuda.js` (~2100 linhas)
> Referências backend: `src/routes/tutorials.js` (lista + CRUD superadmin),
> `src/routes/manual.js` (`GET /api/manual` público), `src/routes/saasAdmin.js`
> (CRUD `/api/admin/manual*` superadmin), `src/models/Tutorial.js`, `src/models/ManualModule.js`
> **Manual do usuário:** n/a — a aba É o manual.
> **Testes E2E:** `tests/local/19_ajuda.spec.js` — 8 testes, 8/8 verdes em 2026-06-12.

---

## 1. Visão Geral
Sub-navegação com 2 views (estado `ajudaView` persiste por sessão da página):
1. **Tutoriais em Vídeo (CliqueZoom Academy)** — player destaque (YouTube embed do 1º tutorial),
   busca por título/descrição, pills de categoria (5 + Todos), grid de cards; clicar num card
   troca o destaque. Sem tutoriais: estado vazio no player e no grid.
2. **Manual do Usuário** — accordion por módulo. Conteúdo vem do **banco** (`GET /api/manual`,
   só `isPublished:true`, ordenado por `order`) e, se o banco estiver vazio, do **fallback
   estático** `MANUAL_MODULES_STATIC` (onde o programa de testes escreve). O banco substitui
   o estático **por inteiro** (tudo-ou-nada). Blocos dinâmicos: `intro`, `callout` (4 cores),
   `steps` (passo a passo) e `image` (captura + legenda).

## 2. Endpoints
| Rota | Comportamento |
|---|---|
| `GET /api/tutorials` | Autenticada (fotógrafo). Só `active:true`, ordenado por order/createdAt |
| `GET/POST/PUT/DELETE /api/admin/tutorials*` | **Superadmin** (403 p/ role admin). POST valida título+URL e extrai `youtubeId` (URL inválida → 400) |
| `GET /api/manual` | **Pública.** Só publicados, ordenados |
| `GET/POST/PUT/DELETE /api/admin/manual*` | **Superadmin.** POST exige id+label; id duplicado → 409. `PUT /api/admin/manual-reorder` reordena |

## 3. Bug encontrado e corrigido (2026-06-12)
**Player destaque nunca renderizava no load da aba** — `updatePlayer()` era chamado antes de
`container.appendChild(root)`; o `document.getElementById('cz-academy-player-section')` voltava
null e a função retornava em silêncio. Nem o vídeo nem o estado vazio apareciam — só após
clicar num card (que chama `updatePlayer` com o DOM montado). **Fix:** chamada movida para
depois do append, junto do `filterAndRenderGrid()`.

## 4. Caveats de teste
- `ajudaView` é estado de módulo: reabrir a aba na mesma page volta na última view. Esperar a
  sub-nav ("Tutoriais em Vídeo") e clicar na view desejada.
- Bloquear `youtube.com|ytimg.com` por route abort — valida a INJEÇÃO do iframe, não o vídeo.
- Seeds com prefixo `E2E `/`_e2e-` e limpeza via CRUD superadmin
  (login `admin@cliquezoom.com.br`/`055360` no dev).
- Banco dev: 1 módulo `dashboard` do usuário **despublicado** (de propósito — o estático é a
  fonte ativa enquanto o programa roda). Não publicar nem deletar.

---

## 5. Roteiro de Vídeo: Aprenda Sem Sair do Painel

**Duração estimada:** 45 a 60 segundos
**Objetivo:** Apresentar a central de aprendizado — vídeos + manual ilustrado.

### Cena 1: Abertura (0s - 8s)
- **Visual:** Painel admin; clique em "Ajuda & Tutoriais" (grupo Conta).
- **Áudio (Locução):** "Ficou com dúvida? Você não precisa sair do CliqueZoom para aprender."
- **Ação em Tela:** A CliqueZoom Academy abre com o player em destaque.

### Cena 2: Academy (8s - 28s)
- **Visual:** Vídeo em destaque tocando; scroll pelo grid; clique numa pill de categoria; busca por "sessões".
- **Áudio (Locução):** "Na Academy, tutoriais em vídeo curtos e práticos, organizados por área — sessões, site, clientes. Busque pelo assunto e aperte o play."
- **Ação em Tela:** Card clicado vira o vídeo em destaque.

### Cena 3: Manual do Usuário (28s - 45s)
- **Visual:** Clique em "Manual do Usuário"; accordion abre na seção Sessões com os previews visuais e o passo a passo numerado.
- **Áudio (Locução):** "Prefere ler? O Manual do Usuário mostra cada tela do sistema com ilustrações e o passo a passo de quem faz o quê — você, o cliente ou o próprio CliqueZoom."
- **Ação em Tela:** Scroll por uma seção com mini-preview + passos numerados.

### Cena 4: Encerramento (45s - 55s)
- **Visual:** Visão geral da aba.
- **Áudio (Locução):** "Vídeo ou texto: a resposta está sempre a um clique, dentro do seu painel."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
