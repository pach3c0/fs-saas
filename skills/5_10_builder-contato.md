# 5_10 — Builder: Sub-tab Contato

> Cobre: seção de contato do site público — título, texto descritivo e endereço em `siteContent.contato`.
> Para arquitetura geral do builder (postMessage, dirty tracking, preview), ver `5_1_builder-geral-site.md`.

---

## Arquivos relevantes

| Arquivo | Função |
|---|---|
| `admin/js/tabs/meu-site.js` | UI e lógica (~linhas 1675-1727) |
| `src/routes/site.js` | `PUT /api/site/admin/config` |
| `src/models/Organization.js` | Schema `siteContent.contato` |
| `site/templates/shared-site.js` | Renderização no site público |
| `site/templates/*/index.html` | Seção `#section-contato` em cada template |

---

## Estrutura de dados

### Schema MongoDB (`Organization.siteContent.contato`)

```js
{
  title:    String,  // Padrão: "Entre em Contato"
  text:     String,  // Descrição da seção (texto livre)
  address:  String,  // Endereço — salvo no banco, mas NÃO renderizado no site
  mapEmbed: String   // Reservado no schema; sem UI no admin ainda
}
```

---

## IDs do DOM (admin)

| ID | Tipo | Descrição |
|---|---|---|
| `#config-contato` | `<div>` | Container da aba |
| `#contatoTitle` | `<input>` | Título da seção |
| `#contatoText` | `<textarea>` | Texto descritivo |
| `#contatoAddress` | `<input>` | Endereço (opcional) |
| `#saveContatoBtn` | `<button>` | Salva via API |

## IDs do DOM (site público)

| ID | Preenchido com |
|---|---|
| `#contatoTitle` | `siteContent.contato.title` |
| `#contatoText` | `siteContent.contato.text` |
| `#contatoInfo` | `siteConfig.whatsapp`, `siteConfig.email`, `siteConfig.instagramUrl` |
| `#contactForm` | Formulário stub (sem envio real) |

---

## Fluxo do usuário

```
1. Usuário abre sub-tab "Contato" no builder
   → renderContato() lê configData.siteContent.contato
   → preenche #contatoTitle, #contatoText, #contatoAddress

2. Usuário edita qualquer campo (oninput)
   → window._meuSitePostPreview?.() → iframe atualiza em tempo real
   → setupDirtyTracking marca badge "● Não salvo - Contato"

3. Usuário clica "Salvar"
   → coleta { title, text, address } dos 3 inputs
   → apiPut('/api/site/admin/config', { siteContent: { contato: { title, text, address } } })
   → backend: $set Organization.siteContent.contato
   → clearDirty() + captureOriginalValues() + showToast('Contato salvo!')
   → liveRefresh atualiza configData local + postMessage ao iframe
```

---

## Armadilhas

### 1. `address` salvo mas não renderizado
O campo `address` é coletado e salvo em `Organization.siteContent.contato.address`, mas `shared-site.js` **não o exibe** em nenhum elemento do site público. Existe apenas para uso futuro (ex: integração com mapa).

### 2. `#contatoInfo` vem de `siteConfig`, não de `siteContent.contato`
No site público, o bloco de informações de contato (WhatsApp, e-mail, Instagram) é preenchido a partir de `siteConfig.whatsapp`, `siteConfig.email` e `siteConfig.instagramUrl` — editados na aba "Geral", não aqui.

### 3. Endereço duplicado com Estúdio
`siteContent.contato.address` e `siteContent.studio.address` são campos independentes. Não há sincronização automática entre eles.

### 4. Formulário público é stub
O `#contactForm` nos templates coleta campos (nome, e-mail, assunto, mensagem) mas o `onsubmit` apenas dispara `alert()`. Não há endpoint backend para processar envios.

### 5. `mapEmbed` sem UI
O campo existe no schema Mongoose para expansão futura, mas não há input no admin para editá-lo. Não tentar ler ou exibir via builder até a UI ser implementada.

---

## Rota backend

### `PUT /api/site/admin/config`

```js
// Body
{ siteContent: { contato: { title, text, address } } }

// Backend executa
$set: { 'siteContent.contato': body.siteContent.contato }

// Resposta
{ success: true, org }
```

A rota recebe o objeto `contato` inteiro e faz `$set` no pai — nunca em campos aninhados individuais (evita conflito com campo `Mixed`).
