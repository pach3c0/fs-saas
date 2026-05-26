# Sessões — Modo Seleção

O cliente visualiza todas as fotos com marca d'água e escolhe as favoritas dentro do limite do pacote contratado. O fotógrafo edita e entrega somente o que foi escolhido.

---

## Criando uma Sessão

### Modo
Escolha **Seleção** para ativar o fluxo de escolha de fotos pelo cliente. Os campos específicos do modo aparecem após a seleção.

### Cliente
Campo de busca com autocomplete. Se o cliente não estiver cadastrado, aparece a opção "+ Cadastrar como novo cliente" — ao clicar, abre o modal de cadastro e, ao concluir, retorna automaticamente para a criação da sessão com o cliente já vinculado.

### Nome da Sessão
Preenchido automaticamente com o nome do cliente. Pode ser renomeado livremente, mas não pode ficar em branco — é o identificador da sessão no painel.

### Datas

| Campo | Regra |
|-------|-------|
| Data de Criação | Data de abertura da sessão (hoje por padrão). Não entra nas regras de validação — o fotógrafo pode criar antes ou depois do evento. |
| Data do Evento | Quando o ensaio/evento aconteceu. |
| Prazo de Seleção | Limite para o cliente escolher as fotos. **Obrigatório ser posterior à Data do Evento.** |

### Foto de Capa
Upload de imagem `.jpg` ou `.png`. Aparece no card da sessão na listagem. Após upload, exibe badge com as dimensões reais da imagem.

### Resolução das Fotos de Seleção
Define a largura máxima em pixels das fotos exibidas para o cliente durante a seleção. Valores comuns: 1200px, 1600px, 2048px. Impacta o tamanho dos arquivos servidos e a qualidade percebida pelo cliente.

### Fotos do Pacote e Preço de Extra
- **Fotos do pacote:** quantidade mínima que o cliente pode selecionar (e que o fotógrafo deve obrigatoriamente fazer upload antes de avançar).
- **Preço foto extra (R$/foto):** valor cobrado por foto adicional caso o cliente queira mais do que o pacote. Exige "Habilitar venda de fotos extras" marcado.

### Toggles

| Toggle | Default | O que faz |
|--------|---------|-----------|
| Habilitar venda de fotos extras | Desligado | Permite ao cliente solicitar fotos além do pacote, ao preço configurado. |
| Permitir pedido de reabertura | Desligado | Permite ao cliente pedir reabertura da seleção após finalizar. O fotógrafo aprova ou recusa. |
| Habilitar mensagens por foto | Desligado | Ativa o chat por foto — o cliente pode comentar em cada imagem durante a seleção, e o fotógrafo responde direto no painel. |

### CRM e Vendas

**Tipo de Evento:** Casamento, Aniversário, Formatura, Corporativo, Show, Ensaio, Gestante, Newborn, Debutante, Batizado, Outro. Usado para personalizar os templates de WhatsApp, os e-mails de reativação anual e os relatórios de marketing.

**Automação de Vendas:** quando ativada, o sistema envia e-mails de urgência ao cliente conforme o prazo de seleção se aproxima (15d, 7d, 3d, 1d). Requer ativar a automação nas configurações da organização.

---

## Fluxo Completo — Wizard de 5 Passos

Após criar a sessão, o fotógrafo clica no card para abrir o wizard guiado. Cada passo só libera quando o anterior está concluído.

### Passo 1 — Upload (FOTÓGRAFO)
Sobe as fotos originais do ensaio (JPG/PNG, até 10 MB cada). O sistema redimensiona para a resolução configurada e aplica marca d'água automaticamente. O botão **"Concluí o upload"** só ativa quando `fotos enviadas ≥ fotos do pacote`.

### Passo 2 — Compartilhar (FOTÓGRAFO)
Exibe o código de acesso e o link da galeria. Opções de envio:
- **E-mail** — envia automaticamente pelo sistema.
- **WhatsApp** — abre `wa.me` com mensagem pré-pronta personalizada pelo tipo de evento (11 templates).
- **Copiar link** — para colar onde quiser.

### Passo 4 — Acompanhar (FOTÓGRAFO + CLIENTE em paralelo)
O fotógrafo vê o grid de fotos com uma película escura sobre cada uma — sinal de que agora é o momento do cliente. Conforme o cliente seleciona, as películas das fotos escolhidas são removidas. Se "Habilitar mensagens por foto" estiver ativo, fotos com comentário exibem borda pulsante verde — ao clicar, abre o chat daquela foto. O painel atualiza automaticamente (30s padrão → 10s por 2 min após mudança → 8s com chat aberto) e tem botão de atualização manual.

**Ações do cliente nesta etapa:**
- Navega pela galeria com marca d'água.
- Seleciona até o limite do pacote (pode solicitar extras se habilitado).
- Comenta em fotos específicas (se habilitado).
- Confirma e envia a seleção — o status muda para "Seleção enviada".

### Passo 5 — Editadas (FOTÓGRAFO)
Após a seleção do cliente, o fotógrafo edita as fotos escolhidas e faz upload das versões finais. O sistema verifica automaticamente se os arquivos correspondem à seleção. Botão **"Exportar Lightroom"** gera `.txt` com os nomes dos arquivos selecionados para importar como coleção no Lightroom.

Tipos de foto no grid:
- **Editada** — selecionada pelo cliente + editada enviada (borda verde ✓).
- **Pendente** — selecionada, editada ainda não enviada (borda amarela).
- **Cortesia** — não selecionada pelo cliente, mas o fotógrafo enviou uma editada como agrado (badge roxa ★ Cortesia). O cliente vê na entrega com a mesma badge, sem pagar.

### Passo 6 — Entregar (FOTÓGRAFO)
Botão **"Entregar e notificar cliente"** — remove a marca d'água, envia e-mail de entrega e libera download em alta resolução. Também disponível: card **"Compartilhar entrega"** com WhatsApp (mensagem de "fotos editadas prontas para download", 11 templates por evento) e link para copiar — útil para reforçar a notificação.

**Ações do cliente após entrega:**
- Acessa a galeria com o mesmo código.
- Vê as fotos sem marca d'água, incluindo as de cortesia.
- Baixa individualmente ou todas de uma vez.

---

## Pendências

- [ ] **Retenção de storage** — campo "Guardar fotos no storage até DD/MM/AAAA" na criação/edição da sessão. Quando chegar a data, fotógrafo recebe notificação no sininho (nunca exclusão automática). Opções opt-in: `☐ Deletar automaticamente` e `☐ Exportar metadados + baixar imagens para backup`. Modo backup: manter só a capa no servidor + campo de link externo (Drive/Dropbox).
- [ ] **Cortesia como diferencial de marketing** — mencionar na landing em "Por que CliqueZoom" (a badge ★ Cortesia como recurso exclusivo).
- [ ] **Ícone robô** — substituir 🤖 na seção Automação do modal de criação por ícone Lucide.
