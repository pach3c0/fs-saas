# Melhorias de mensagem

A aprovação de depoimentos pendentes foi integrada na **tab Mensagens** (`admin/js/tabs/mensagens.js`), junto com os contatos recebidos pelo formulário. O fotógrafo acessa um único lugar para ver tudo que chegou do site público.

- Seção "⭐ N depoimentos aguardando aprovação" aparece no topo da tab Mensagens quando há pendentes
- Botões **Aprovar** (verde, `var(--green)`) e **Rejeitar** (vermelho, `var(--red)`) com confirmação antes de rejeitar
- Ao aprovar: `POST /api/site/admin/depoimentos-pendentes/:id/aprovar` → move para `Organization.siteContent.depoimentos`
- O painel de pendentes no builder (sub-tab Depoimentos em Meu Site) continua funcionando normalmente em paralelo

---

# Módulo: Depoimentos

Gerenciamento de depoimentos de clientes no site público. Inclui aprovação de depoimentos enviados por visitantes e criação manual de depoimentos com foto, nota e link social.

---

## 1. Elementos DOM

### Painel Principal (`#config-depoimentos`)
| ID / Seletor | Tipo | Propósito |
|---|---|---|
| `#addDepoimentoBtn` | `<button>` | Adiciona novo depoimento vazio à lista |
| `#saveDepoimentosBtn` | `<button>` | Persiste todas as alterações no banco |
| `.depo-item` | `<div>` | Card individual de depoimento |

### Campos por Depoimento (`idx`)
| Seletor | Tipo | Propósito |
|---|---|---|
| `[data-dep-name="${idx}"]` | `<input type="text">` | Nome do cliente |
| `[data-dep-text="${idx}"]` | `<textarea>` | Conteúdo do depoimento |
| `[data-dep-photo="${idx}"]` | `<input type="hidden">` | URL da foto (após upload) |
| `[data-dep-photo-upload="${idx}"]` | `<input type="file">` | Gatilho de upload de foto |
| `[data-dep-rating="${idx}"]` | `<input type="number">` | Nota (1 a 5 estrelas) |
| `[data-dep-social="${idx}"]` | `<input type="text">` | Link do Instagram/Facebook |
| `onclick="deleteDepoimento(${idx})"` | `<button>` | Remove o depoimento da lista local |

### Depoimentos Pendentes (Aprovação)
| Função | Rota Backend | Propósito |
|---|---|---|
| `aprovarDepoimento(id)` | `POST /api/site/admin/depoimentos-pendentes/:id/aprovar` | Move o depoimento para a lista de publicados |
| `rejeitarDepoimento(id)` | `DELETE /api/site/admin/depoimentos-pendentes/:id` | Apaga o depoimento permanentemente |

---

## 2. Estado Local

Diferente de outros módulos, o estado é gerenciado localmente pela função `renderDepoimentos` em `meu-site.js` através de duas variáveis locais:

```javascript
const depoimentos = configData.siteContent?.depoimentos || [];
let pendentes = []; // carregado via GET /api/site/admin/depoimentos-pendentes
```

Os depoimentos pendentes são buscados a cada vez que a aba é ativada.

---

## 3. Fluxo do Usuário

### 3a. Criação Manual
1. Usuário clica em **"+ Adicionar"**.
2. Novo objeto `{ name: 'Cliente', text: '', photo: '', rating: 5, socialLink: '' }` é adicionado ao array.
3. `renderList()` reconstrói o formulário.
4. Usuário preenche os campos (ativa o `dirty tracking`).

### 3b. Upload de Foto
1. Usuário clica em **"Upload"** em um depoimento específico.
2. `uploadImage(file)` é chamado.
3. A URL retornada é salva no campo `photo` do objeto no índice correspondente.
4. `renderList()` atualiza a miniatura (preview redondo).

### 3c. Aprovação de Pendentes
1. Quando o visitante envia o formulário público, o backend dispara automaticamente um email para o endereço da organização (`Organization.email`) via `sendPendingDepoimentoEmail` em `src/utils/email.js`.
2. Se houver depoimentos enviados via formulário público, um banner verde aparece no topo.
2. Ao clicar em **"✓ Aprovar"**, o sistema chama a rota de aprovação, recarrega o `configData` e re-renderiza a aba.

### 3d. Salvamento (Persistência)
1. Usuário clica em **"Salvar Depoimentos"**.
2. O script mapeia todos os inputs para um novo array `updated`.
3. `apiPut('/api/site/admin/config', { siteContent: { depoimentos: updated } })`.
4. `liveRefresh()` envia os novos dados para o iframe de preview.
5. `clearDirty()` e `captureOriginalValues()` resetam o estado de edição.

---

## 4. Estrutura de Dados Persistida

Armazenado em `Organization.siteContent.depoimentos` (Array):

```javascript
[
  {
    "name": "Maria Silva",
    "text": "Trabalho impecável! As fotos ficaram maravilhosas.",
    "photo": "/uploads/orgId/site/resized-maria.jpg",
    "rating": 5,
    "socialLink": "https://instagram.com/mariasilva"
  }
]
```

---

## 5. Renderização no Site Público (`shared-site.js`)

O site público itera sobre `data.siteContent.depoimentos` e gera o HTML:

- Exibe estrelas baseadas no `rating`.
- Se `photo` existir, exibe a imagem redonda; caso contrário, um avatar padrão.
- Se `socialLink` existir, exibe o ícone da rede social linkado.
- Layout geralmente em grid ou slider (dependendo do template).

---

## 6. Bug Conhecido — Formulário Público Nunca Testado em Produção

- O formulário de depoimento do site público **não foi testado fora do preview do builder**.
- Testes feitos com `?_preview=1` no iframe do builder não são válidos para validar o fluxo real do visitante.
- **Pendência:** testar acessando `slug.cliquezoom.com.br` numa aba separada (sem `_preview`), preencher e enviar, e verificar se o depoimento aparece em `pendingDepoimentos` no banco.
- Também verificar se o formulário deve ser **ocultado no modo preview** (`_preview=1`), pois o fotógrafo não deveria conseguir enviar depoimento para si mesmo enquanto edita o site.

---

## 7. Regras e Validações
- **Nota:** Deve ser entre 1 e 5.
- **Auto-save:** Atualmente este módulo **não** usa auto-save completo (depende do botão Salvar), mas o `dirty tracking` impede que o usuário saia sem salvar.
- **Imagens:** Devem ser comprimidas via `uploadImage` (padrão 1200px/85%).


 