# Mensagens — Contatos do Site + Depoimentos Pendentes (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 3 de 12).
> Referência frontend: `admin/js/tabs/mensagens.js` (~270 linhas, arquivo único)
> Referências backend: `src/routes/site.js` (contato, depoimento e moderação), `src/routes/notifications.js` (lista/lida/excluir)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `mensagens`) — validado por screenshot em 2026-06-11.
> **Testes E2E:** `tests/local/11_mensagens.spec.js` — 14 testes, 14/14 verdes em 2026-06-11.

---

## 1. Visão Geral

A aba Mensagens centraliza tudo que chega pelo **site público** do fotógrafo:
1. **Depoimentos pendentes** — visitantes enviam depoimentos que ficam aguardando curadoria; o fotógrafo aprova (publica no site) ou rejeita (apaga).
2. **Contatos recebidos** — mensagens do formulário de contato, com indicador de não lidas, expansão para leitura (marca como lida) e exclusão.

É renderizada por `renderMensagens(container)`, que dispara `loadPendentes()` e `loadMensagens()` em paralelo.

---

## 2. Ferramentas e Componentes

### 2.1 Depoimentos pendentes (`#pendentesSection`)
- Fonte: `GET /api/site/admin/depoimentos-pendentes` → `Organization.siteContent.pendingDepoimentos`
- A caixa (borda verde) **só aparece quando há pendentes**; cabeçalho com contagem singular/plural ("1 depoimento" / "2 depoimentos aguardando aprovação")
- Cada card: nome, texto, estrelas + nota (`⭐⭐⭐⭐ 4/5`, clamp 1–5 via `clampNota`), e-mail (se houver)
- **✓ Aprovar** → `POST /api/site/admin/depoimentos-pendentes/:id/aprovar` — move para `siteContent.depoimentos` (publica na seção de depoimentos do site) com `photo`/`socialLink` vazios
- **✕ Rejeitar** → `showConfirm` → `DELETE /api/site/admin/depoimentos-pendentes/:id` — apaga em definitivo

### 2.2 Contatos recebidos (`#msgLista`)
- Fonte: `GET /api/notifications` **filtrado por `type === 'contact'`** (depoimentos geram notificação `depoimento_pendente`, que NÃO entra nesta lista — aparece só no sininho)
- Badge `#msgUnreadBadge`: "N não lida(s)", oculto quando zero
- Card recolhido: bolinha + borda lateral de destaque quando não lida; título `nome — assunto` (assunto opcional); data `toLocaleString('pt-BR')`
- Clique no card → expande corpo (E-mail com link `mailto:`, Assunto, mensagem com `white-space:pre-wrap`) e **marca como lida** (`PUT /api/notifications/:id/read`), atualizando badge/bolinha sem re-render
- Lixeira → `showConfirm` → `DELETE /api/notifications/:id`; última excluída → empty state "Nenhuma mensagem recebida ainda"

### 2.3 Parse da mensagem (`parseMessage`)
O backend grava o contato **achatado** numa string: `📩 nome (email)? — assunto?: mensagem`.
O parser corta o cabeçalho no **primeiro `:`** e extrai nome/email/assunto só do cabeçalho —
pontuação dentro da mensagem ("—", ":") não vira assunto falso (bug corrigido em 2026-06-11).

### 2.4 Endpoints públicos (origem dos dados)
| Rota | Campos | Proteção |
|---|---|---|
| `POST /api/site/contact` | `nome`*, `email`, `assunto`, `mensagem`* (PT-BR) | honeypot `_hp_trap` + 400 sem obrigatórios |
| `POST /api/site/depoimento` | `name`*, `text`*, `email`, `rating` (EN) | honeypot + 400 + **clamp rating 1–5** |

Ambas resolvem tenant por subdomínio em produção (`?_tenant=` só em localhost). O depoimento também dispara notificação `depoimento_pendente` + e-mail `sendPendingDepoimentoEmail` ao fotógrafo (fire-and-forget).

> Inconsistência conhecida (CLAUDE.md, não crítica): contato usa campos PT-BR, depoimento usa EN.

---

## 3. Fluxo de Dados

```
Visitante no site público
  ├── POST /api/site/contact     → Notification {type:'contact', message:"📩 nome (email) — assunto: msg"}
  └── POST /api/site/depoimento  → Organization.siteContent.pendingDepoimentos[]
                                   + Notification {type:'depoimento_pendente'} + e-mail ao fotógrafo

renderMensagens(container)
  ├── loadPendentes()  → GET /api/site/admin/depoimentos-pendentes → renderPendentes()
  │     ├── Aprovar  → POST .../:id/aprovar  → siteContent.depoimentos (site público)
  │     └── Rejeitar → DELETE .../:id
  └── loadMensagens() → GET /api/notifications (filtra type==='contact')
        ├── _msgToggle → expande + PUT /api/notifications/:id/read
        └── _msgDelete → DELETE /api/notifications/:id
```

---

## 4. Padrões e Cuidados

- **XSS:** todo conteúdo vindo do visitante passa por `escHtml` (nome, texto, e-mail, assunto, mensagem) — coberto por teste E2E com payload de injeção
- **Rating clamp em 2 camadas:** backend clampa 1–5 ao gravar; front (`clampNota`) re-clampa na exibição para proteger contra dados antigos fora da faixa já persistidos
- **Globals expostos:** `window._depAprovar`, `window._depRejeitar`, `window._msgToggle`, `window._msgDelete`
- **Dialogs:** `showToast`/`showConfirm` (sem `alert`/`confirm`) ✓ · tokens CSS inline ✓

## 5. Bugs encontrados e corrigidos (2026-06-11)

1. **Rating sem clamp derrubava a aba inteira** — `POST /site/depoimento` aceitava qualquer inteiro
   (`rating: -3` era gravado cru). No admin, `'⭐'.repeat(-3)` lançava `RangeError` dentro do
   `renderPendentes` → a exceção subia pelo `Promise.all` do `renderMensagens` e **a aba não
   renderizava nada**. Rating 7 exibia "7/5". **Fix:** clamp 1–5 no backend (`site.js`) +
   `clampNota()` defensivo no front (`mensagens.js`).
2. **`parseMessage` inventava assunto** — mensagem de contato contendo "—" e ":" (ex.: "Olá —
   gostaria de saber: vocês atendem?") fazia o trecho virar assunto falso no título e cortava a
   mensagem. **Fix:** o parser agora corta o cabeçalho no primeiro ":" e só extrai nome/email/assunto
   dessa parte.

---

## 6. Roteiro de Vídeo: Mensagens do seu Site

**Duração estimada:** 60 a 90 segundos
**Objetivo:** Mostrar ao fotógrafo onde chegam os contatos e depoimentos do site público e como fazer a curadoria dos depoimentos antes de irem ao ar.

### Cena 1: Abertura (0s - 12s)
- **Visual:** Painel admin aberto; o mouse clica em "Mensagens" no menu lateral.
- **Áudio (Locução):** "Tudo o que seus clientes enviam pelo seu site — contatos e depoimentos — chega direto na aba Mensagens."
- **Ação em Tela:** A aba abre mostrando a caixa verde de depoimentos pendentes no topo e a lista de contatos abaixo.

### Cena 2: Aprovando um depoimento (12s - 35s)
- **Visual:** Foco na caixa "depoimento aguardando aprovação".
- **Áudio (Locução):** "Quando um cliente deixa um depoimento, ele não vai direto pro ar: fica aqui, aguardando a sua aprovação. Você lê, vê a nota em estrelas, e decide. Clicou em Aprovar? Ele é publicado na hora na seção de depoimentos do seu site. Se for spam, é só rejeitar."
- **Ação em Tela:** Mouse passa sobre o card do depoimento, clica em "✓ Aprovar", toast de sucesso aparece. Corte rápido mostrando o depoimento publicado no site público.

### Cena 3: Lendo um contato (35s - 60s)
- **Visual:** Foco na lista "Contatos recebidos"; um card com bolinha de não lida.
- **Áudio (Locução):** "Os contatos do formulário do site aparecem aqui, com destaque para os que você ainda não leu. Clique para abrir: você vê o e-mail, o assunto e a mensagem completa — e ela já fica marcada como lida. Quer responder? Um clique no e-mail abre direto o seu aplicativo de e-mail."
- **Ação em Tela:** Mouse clica no card não lido; corpo expande; destaque no contador de não lidas zerando; hover no link de e-mail.

### Cena 4: Organizando a caixa (60s - 75s)
- **Visual:** Mouse vai ao ícone de lixeira de um contato antigo.
- **Áudio (Locução):** "Terminou de tratar uma mensagem? Use a lixeira para manter sua caixa organizada — com confirmação, pra você não excluir nada sem querer."
- **Ação em Tela:** Clique na lixeira, modal de confirmação aparece, confirma, card some.

### Cena 5: Encerramento (75s - 85s)
- **Visual:** Visão geral da aba Mensagens limpa e organizada.
- **Áudio (Locução):** "Mensagens: o seu balcão de atendimento dentro do CliqueZoom. No próximo vídeo, vamos configurar o seu site para receber ainda mais contatos."
- **Ação em Tela:** Fade out suave para o logo da CliqueZoom Academy.
