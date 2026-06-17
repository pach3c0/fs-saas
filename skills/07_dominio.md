# Domínio — Domínio Personalizado (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 6 de 12).
> Referência frontend: `admin/js/tabs/dominio.js` (~160 linhas, arquivo único)
> Referências backend: `src/routes/domains.js` (status, adicionar, verificar, remover), `src/utils/dnsVerifier.js` (resolve A record), `src/scripts/generate-ssl.sh` (certbot na VPS)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `dominio`) — validado por screenshot em 2026-06-11.
> **Testes E2E:** `tests/local/14_dominio.spec.js` — 16 testes, 16/16 verdes em 2026-06-11.

---

## 1. Visão Geral

A aba Domínio conecta um **domínio próprio do fotógrafo** (ex: `www.seunome.com.br`) ao site
público, no lugar do endereço padrão `<slug>.cliquezoom.com.br`. O fluxo é: adicionar → configurar
registro A no provedor → verificar DNS → SSL automático (certbot na VPS).

A tela tem **dois estados** mutuamente exclusivos:
1. **Sem domínio** — formulário `#inputDomain` + botão `#btnAdd` "Adicionar".
2. **Com domínio** — card com o domínio e o status (`⏳ Aguardando verificação DNS` amarelo /
   `✓ Verificado e Ativo` verde), botões `#btnVerify` (some quando verificado) e `#btnRemove`,
   e o bloco **Instruções de Configuração DNS** (tabela A Record / nome / IP / TTL 3600 —
   some quando verificado).

---

## 2. Ferramentas e Componentes

### 2.1 Endpoints (`src/routes/domains.js` — todos autenticados, 401 sem token)
| Rota | Comportamento |
|---|---|
| `GET /api/domains/status` | `{success, customDomain (null se não há), domainStatus, serverIP}` — `serverIP` de `process.env.SERVER_IP` (default `5.189.174.18`) |
| `POST /api/domains` | Normaliza (trim+lowercase), valida formato (regex), recusa domínio de **outra** org (400 "já cadastrado em outra conta"; re-salvar o próprio é permitido), grava `domainStatus:'pending'` e retorna `instructions` (A Record, nome, IP, TTL 3600) |
| `POST /api/domains/verify` | 400 sem domínio; `dns.resolve4(domain)` precisa conter o `serverIP` → `verified` + `domainVerifiedAt` + dispara `generate-ssl.sh` (**só em produção**); senão `{success:false, "DNS ainda não propagado..."}` |
| `DELETE /api/domains` | `$unset` de `customDomain`/`domainVerifiedAt` + `domainStatus:'pending'`. Idempotente |

### 2.2 Model (`Organization`)
- `customDomain: String, unique, sparse` — **por isso o DELETE usa `$unset` e não `null`**: null
  gravado entra no índice sparse e duas orgs sem domínio colidiriam em duplicate key.
- `domainStatus: 'pending' | 'verified'` · `domainVerifiedAt: Date`
- Em produção, `resolveTenant` resolve o tenant também por `customDomain` — é o que faz o site
  público responder no domínio do fotógrafo.

### 2.3 Frontend (`dominio.js`)
- `renderDominio(container)` → `GET /api/domains/status` → `renderContent`
- Adicionar: input vazio é no-op silencioso; erro da API vira `showToast('Erro: ...')`
- Verificar: botão vira "Verificando..." + disabled durante a chamada; reabilita se não propagado
- Remover: `showConfirm` (**Promise<boolean>**, `danger:true`) → `DELETE` → re-render

---

## 3. Fluxo de Dados

```
Fotógrafo digita domínio → POST /api/domains
  └── Organization {customDomain, domainStatus:'pending'} + instructions na resposta

Fotógrafo cria A Record no provedor (Hostinger/GoDaddy/Registro.br) → propagação (min a 48h)

Fotógrafo clica "Verificar DNS" → POST /api/domains/verify
  ├── dns.resolve4 inclui serverIP → domainStatus:'verified' + domainVerifiedAt
  │     └── produção: execFile generate-ssl.sh (certbot --nginx) → https
  └── não inclui → {success:false} → continua pending

"Remover" → showConfirm → DELETE /api/domains → $unset → volta ao formulário
```

---

## 4. Padrões e Cuidados

- **`cliquezoom.com.br` como fixture de DNS propagado:** o A record real aponta para o IP default
  do servidor — os testes de "verify com sucesso" usam isso (rodam com internet).
- **SSL nunca roda fora de produção** (guard `NODE_ENV === 'production'`) — local não tem
  certbot/nginx e o script usa `sudo`.
- Dialogs `showToast`/`showConfirm` ✓ · tokens CSS inline (aliases `--bg-*`/`--text-*` do DS) ✓ ·
  logs via `req.logger` ✓ · reads com `.lean()` ✓

## 4.1 Casos especiais / Migrações ativas em produção

### Fsfotografias (Flávia — Org "Fs Fotografias")
Domínio customizado configurado em **2026-06-15**.
- **Nginx Config:** `/etc/nginx/sites-available/fsfotografias` (symlinked para `sites-enabled`)
- **SSL Certificates:** Reaproveitados os certificados válidos existentes em `/etc/letsencrypt/live/fsfotografias.com.br/` (cobre `fsfotografias.com.br` e `www.fsfotografias.com.br`).
- **Comportamento de Redirecionamento:**
  - `http://fsfotografias.com.br` -> `https://www.fsfotografias.com.br` (301 via Nginx)
  - `https://fsfotografias.com.br` -> `https://www.fsfotografias.com.br` (301 via Nginx)
  - `https://www.fsfotografias.com.br/` (raiz) -> `/site` (301 via `server.js` do CliqueZoom para carregar o template do fotógrafo)
- **Histórico de Erro & Correção:**
  - *Problema:* Acessar `https://www.fsfotografias.com.br/` renderizava a Landing Page da plataforma CliqueZoom, e não o site da fotógrafa Flávia. Isso acontecia porque a rota raiz `/` no backend (`src/server.js`) não estava preparada para tratar e redirecionar domínios customizados para `/site`.
  - *Correção:* A rota raiz `/` foi alterada no Express para consultar a existência do domínio customizado no banco de dados e redirecionar para `/site` (onde o `resolveTenant` funciona corretamente). Adicionalmente, arquivos de backup `.bak` gerados no Nginx foram retirados do diretório `sites-enabled` para evitar conflito de portas e domínios duplicados.

---

## 5. Bugs encontrados e corrigidos (2026-06-11)

1. **Remover domínio pela UI nunca funcionou** — `dominio.js` chamava
   `showConfirm(msg, {onConfirm: ...})`, mas `showConfirm` **retorna Promise\<boolean\>** e não
   aceita callback: o confirm fechava e o `onConfirm` era ignorado — o domínio nunca era removido.
   **Fix:** `const ok = await showConfirm(...); if (!ok) return;` + try/catch com toast de erro.
   Coberto por teste (cancelar mantém / confirmar remove).
2. **DELETE gravava `customDomain: null`** — com índice `unique sparse`, o null entra no índice:
   a **segunda** org que removesse o domínio tomaria duplicate key error. **Fix:** `$unset`
   (campo some do documento). Teste verifica direto no Mongo que o campo não existe.
3. **Domínio com maiúsculas/espaços era rejeitado** — a regex só aceita minúsculas e o valor ia
   cru ("WWW.Foo.COM" → 400 confuso). **Fix:** normalização `trim().toLowerCase()` antes de validar.
4. **Re-salvar o próprio domínio dava "já cadastrado em outra conta"** — a checagem de duplicado
   não excluía a própria org. **Fix:** `_id: {$ne: organizationId}` na busca.
5. **Qualidade (CLAUDE.md):** `console.error` → `req.logger.error`; `GET /status` sem `.lean()`;
   script SSL disparava também em dev (agora só produção).

---

## 6. Roteiro de Vídeo: Seu Próprio Domínio

**Duração estimada:** 60 a 80 segundos
**Objetivo:** Mostrar ao fotógrafo como apontar o domínio que ele já possui para o site do CliqueZoom, sem medo da parte técnica.

### Cena 1: Abertura (0s - 10s)
- **Visual:** Painel admin aberto; o mouse clica em "Domínio" no menu lateral (grupo Site).
- **Áudio (Locução):** "Seu site no CliqueZoom pode atender pelo SEU endereço — www, ponto, seu nome, ponto com. Vem ver como é simples."
- **Ação em Tela:** A aba abre no estado vazio, com o campo de digitação em destaque.

### Cena 2: Adicionando o domínio (10s - 25s)
- **Visual:** Digitação de `www.seunome.com.br` no campo; clique em "Adicionar".
- **Áudio (Locução):** "Digite o domínio que você já comprou e clique em Adicionar. Na hora, o CliqueZoom mostra exatamente o que configurar no seu provedor."
- **Ação em Tela:** Card do domínio aparece com o status amarelo "Aguardando verificação DNS" e a tabela de instruções abaixo.

### Cena 3: Configurando o DNS (25s - 45s)
- **Visual:** Zoom na tabela de instruções (Tipo: A Record · Nome · Valor · TTL 3600). Corte rápido para um painel de provedor genérico criando o registro.
- **Áudio (Locução):** "No painel onde você comprou o domínio — Hostinger, GoDaddy, Registro.br — crie um registro do tipo A com esse nome e esse IP. A propagação pode levar de minutos até 48 horas; é o tempo normal da internet."
- **Ação em Tela:** Registro sendo salvo no provedor; volta para o CliqueZoom.

### Cena 4: Verificando (45s - 60s)
- **Visual:** Clique no botão "Verificar DNS"; botão muda para "Verificando...".
- **Áudio (Locução):** "Propagou? Clique em Verificar DNS. O status fica verde — Verificado e Ativo — e o certificado de segurança é gerado sozinho: seu site abre com o cadeado, no seu endereço."
- **Ação em Tela:** Toast de sucesso; card muda para "✓ Verificado e Ativo"; corte para o navegador abrindo o site público em `https://www.seunome.com.br`.

### Cena 5: Encerramento (60s - 70s)
- **Visual:** Visão geral da aba com o domínio verificado.
- **Áudio (Locução):** "E se um dia quiser trocar, é só Remover e cadastrar outro. Domínio próprio, profissional, em poucos cliques."
- **Ação em Tela:** Fade out suave para o logo da CliqueZoom Academy.
