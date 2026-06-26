# Checklist de validação — Roadmap de Ajustes (commit `273a6d0`)

> Tudo abaixo já está no ar (deploy main). Marque conforme testar.
> Legenda de onde: **[SA]** painel super admin (`/saas-admin`) · **[ADM]** painel do fotógrafo (`/admin`) · **[BD]** banco/back.

---

## Item 5 — Modo manutenção da plataforma 🛠️

- [ ] **[SA]** Aba **Sistema** → existe o card **"Modo manutenção da plataforma"** no topo.
- [ ] **[SA]** Preencher mensagem + previsão de retorno e ligar o toggle → pede confirmação antes de ligar.
- [ ] Numa **aba anônima** (deslogado), abrir o **site público** (`/site`) ou o **/admin** → deve aparecer a **página amigável de manutenção** (não a tela normal).
- [ ] **[SA]** Com manutenção ligada, confirmar que **o próprio `/saas-admin` continua acessível** (você não se tranca pra fora).
- [ ] **[SA]** Editar a mensagem com manutenção já ligada e salvar → o texto novo aparece na página de manutenção (pode levar ~10s pelo cache).
- [ ] **[SA]** Desligar o toggle → site/admin voltam ao normal.
- [ ] (Borda) Chamada de API durante manutenção responde 503 com JSON `{maintenance, message, etaText}` (não quebra feio).

---

## Item 4 — Planos personalizados por org + cortesia 🎁💰

### No super admin
- [ ] **[SA]** Aba **Organizações** → clicar **"Painel"** de uma org de teste → aparecem as seções novas **"Cobrança"** e **"Override de limites"**.
- [ ] **[SA] Cortesia:** marcar o toggle **🎁 Conta cortesia** (+ nota opcional, ex. "Esposa") → Salvar → toast de sucesso.
- [ ] **[SA]** Na **tabela de orgs**, a org marcada mostra o selo **"🎁 cortesia"** ao lado do nome.
- [ ] **[SA] Override:** ligar **"Limites customizados"**, mudar Storage/Sessões/Fotos/Álbuns → Salvar → toast.
- [ ] **[SA] Persistência do override:** com override ligado, **trocar o plano** da org (free→basic etc.) → os limites customizados **devem permanecer** (não voltam ao padrão do plano).
- [ ] **[SA] Reverter:** desligar o toggle de override → Salvar → os limites **voltam ao plano base** (e o form recarrega mostrando os valores do plano).

### No painel do fotógrafo (org marcada como cortesia)
- [ ] **[ADM]** Aba **Plano** → aparece o selo **🎁 Cortesia** ao lado do nome do plano.
- [ ] **[ADM]** Texto mostra **"Conta cortesia · sem cobrança"** (sem preço/renovação).
- [ ] **[ADM]** **Some** o botão "Ver planos", a grade de **Planos Disponíveis** e o bloco de **Cancelar assinatura**.
- [ ] **[ADM]** Aparece o card amigável **"🎁 Conta cortesia — acesso liberado sem cobrança"**.
- [ ] **[ADM]** Numa org **normal** (sem cortesia) → tudo continua igual de antes (planos, upgrade, cancelar).

> ℹ️ Lembrete: cortesia é **só rótulo** (selo + esconde CTA). Os limites continuam vindo do plano/override. Pra dar limites generosos numa cortesia, setar plano `pro` ou ligar override.

---

## Item 3 — Métricas do agente × dashboard 📊

- [ ] **[SA]** Comparar o **número de orgs por plano no Dashboard** com o que o **agente** responde (ex.: "quantos clientes no plano X") → devem **bater**.
- [ ] Conferir que **assinaturas órfãs** (org apagada) e **orgs na lixeira** **não** entram mais na contagem do agente.

---

## Item 9 — Trava de e-mail/site no perfil ✉️🔒

- [ ] **[ADM]** Aba **Perfil** → campo de **e-mail de contato** aparece **somente leitura** (não dá pra editar).
- [ ] **[ADM]** Existe o botão **"Solicitar troca de e-mail"** → abre um chamado no Fala Conosco com e-mail atual + novo desejado.
- [ ] **[ADM]** **Endereço do site** (slug/domínio) aparece **somente leitura**.
- [ ] **[ADM]** **Telefone/WhatsApp** continua **editável** normalmente.
- [ ] (Back) Tentar salvar e-mail/website via request direto **não** persiste (trava server-side).

---

## Item 2 — Armazenamento fantasma 📦

- [ ] **[ADM]** Aba **Plano** → a barra de **armazenamento** conta **só as fotos das sessões** (conta sem sessão = **0 MB**, mesmo tendo logo/site).
- [ ] **[ADM]** O detalhamento ainda lista **Site/logo** e **Vídeos** com o aviso **"não contam no limite"**.
- [ ] **[ADM]** Aba **Dashboard** → card **"Espaço Usado"** também reflete só as fotos das sessões.

---

## Item 6 — Limpeza "Padrão de entrega da galeria" 🧹

- [ ] **[ADM]** Aba **Configurações** → a aba/seção **"Entrega"** **não existe mais**.
- [ ] **[ADM]** As **demais seções** de Configurações continuam funcionando normalmente.
- [ ] **[ADM]** Criar/abrir uma sessão modo **Galeria** → fluxo de entregar continua funcionando (a config removida não afetava esse fluxo novo).

---

## Item 10 — Presença online (camada A) 🟢👀

- [ ] **[SA]** Aba **Sistema** → existe o card **"Presença online agora"** (logo abaixo do card de manutenção).
- [ ] **[ADM]** Logar no `/admin` → em ~60s aparece **1 fotógrafo** no card, com o **módulo = aba atual**.
- [ ] **[ADM]** Trocar de aba no admin (ex.: ir pra **Sessões**, depois **Gestão**) → o módulo no card muda em até ~30s (a aba **Gestão** aparece como "Gestão (Rhyno)").
- [ ] Abrir uma **galeria de cliente** com código real (outra aba/anônima) → aparece na coluna **"Clientes em galeria"** com o nome da sessão + "Galeria"/"Seleção".
- [ ] Fechar as abas (ou deixar minimizado) e esperar **~150s** → some da presença sozinho.
- [ ] **[SA]** O card **atualiza sozinho a cada 30s** (sem clicar em nada).
- [ ] (Borda) Galeria e admin funcionam **igual** com o heartbeat ligado (nada trava; offline não quebra).
- [ ] (Camada B, invisível) No Mongo: `db.usagedailies.find()` mostra `minutes` acumulando por `{org,user,day,module}` — é o dado de engajamento começando a nascer (o **painel** disso vem depois).

---

## Item 8 — Captura de WhatsApp pós-cadastro 💬

### No cadastro (landing)
- [ ] Abrir a página de cadastro → existe o campo **WhatsApp** marcado **"(opcional)"** (não bloqueia o envio se ficar vazio).
- [ ] Cadastrar **com** WhatsApp → conferir que o número ficou salvo na org (aba Perfil mostra preenchido).
- [ ] Cadastrar **sem** WhatsApp → cadastro conclui normal (campo fica vazio).

### Gatilho suave (painel do fotógrafo)
- [ ] **[ADM]** Org **sem** WhatsApp e com **≥ 2 sessões** → ao logar aparece o banner **"💬 Qual é o seu WhatsApp?"** no canto inferior.
- [ ] **[ADM]** Org **com** WhatsApp preenchido → o banner **não** aparece.
- [ ] **[ADM]** Org com **0 ou 1 sessão** → o banner de WhatsApp **não** aparece (com 0 sessões aparece o de boas-vindas, como antes).
- [ ] **[ADM] Salvar:** digitar um número válido + **Salvar** → toast de sucesso, banner some, e o número aparece na aba Perfil.
- [ ] **[ADM] Validação:** número curto/sem DDD → toast de aviso, não salva.
- [ ] **[ADM] Soneca:** "Agora não" ou × → banner some; **recarregar a página no mesmo dia não traz de volta** (volta só após ~7 dias).

---

## Sanidade geral pós-deploy ✅
- [ ] Site público abre normal.
- [ ] Login do fotógrafo OK.
- [ ] `/saas-admin` abre normal.
- [ ] `pm2 logs cliquezoom-saas --lines 30` sem erro novo.
