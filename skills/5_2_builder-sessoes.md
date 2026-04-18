# Skill 5_2 — Sub-tab Seções (Builder do Site)

Leia este arquivo ao trabalhar na sub-tab **Seções** do builder do site público.
Arquivos principais: `admin/js/tabs/meu-site.js` (linhas 958–1105), `src/routes/site.js`, `site/templates/shared-site.js`.

---

## O que esta sub-tab faz

Permite ao fotógrafo definir **quais seções aparecem** no site público e em **qual ordem**, sem apagar conteúdo.

---

## Seções disponíveis

```javascript
// allSectionDefs (meu-site.js ~linha 962)
const allSectionDefs = [
  { id: 'hero',        label: 'Capa' },
  { id: 'portfolio',   label: 'Portfólio' },
  { id: 'albuns',      label: 'Álbuns' },
  { id: 'servicos',    label: 'Serviços' },
  { id: 'estudio',     label: 'Estúdio' },
  { id: 'depoimentos', label: 'Depoimentos' },
  { id: 'contato',     label: 'Contato' },
  { id: 'sobre',       label: 'Sobre Mim' },
  { id: 'faq',         label: 'FAQ' },
];

const DEFAULT_SECTIONS = ['hero', 'portfolio', 'albuns', 'servicos', 'estudio', 'depoimentos', 'contato', 'sobre', 'faq'];
```

---

## Dado persistido

```
Organization.siteSections: string[]
```

Array ordenado de IDs de seções **ativas**. Seções ausentes do array não aparecem no site.
Salvo via `PUT /api/site/admin/config` com payload `{ siteSections: [...] }`.

---

## Fluxo do usuário

```
1. Sub-tab carrega → configData.siteSections popula ordered[] e activeSet
2. Usuário reordena via drag & drop (borda azul indica drop target) ou botões ▲▼
3. Usuário ativa/desativa seção via checkbox → atualiza activeSet (sem requisição)
4. Clica ícone Salvar (tooltip "Salvar Ordem")
   → apiPut('/api/site/admin/config', { siteSections: ordered.filter(s => activeSet.has(s.id)).map(s => s.id) })
5. Backend: $set { siteSections: [...] } em Organization + limpa cache
6. liveRefresh({ siteSections }) → postPreviewData() → PostMessage → iframe reordena/oculta seções
```

---

## Interações da UI

### Ativar / desativar
Checkbox por seção. Atualiza `activeSet` localmente; sem chamada à API até clicar Salvar.

### Reordenar — Drag & drop
- Handle `⠿` com `cursor: grab`
- **Arrastado:** `opacity: 0.4`, `transform: scale(0.98)`
- **Alvo:** `borderTop: 2px solid var(--accent)` (azul)
- **Drop:** `ordered.splice(dragIdx, 1)[0]` → `ordered.splice(targetIdx, 0, moved)` → re-renderiza

### Reordenar — Botões ▲▼
Troca de posição via `[ordered[idx], ordered[newIdx]] = [ordered[newIdx], ordered[idx]]`.
Extremidades desativadas com `opacity: 0.2`.

### Botão Salvar (ícone)
- Tooltip: `"Salvar Ordem"`
- Cor: verde (#16a34a)
- Spinner via `withBtnLoading` durante requisição
- Toast de sucesso: `"Seções salvas!"`

### Botão Restaurar (ícone)
- Tooltip: `"Restaurar Padrão"`
- Cor: cinza transparente com borda
- Abre `window.showConfirm()` com aviso: "Redefinirá apenas ordem e visibilidade. Nenhum conteúdo será apagado."
- Se confirmado: reseta `ordered` e `activeSet` para `DEFAULT_SECTIONS` → salva via PUT → toast `"Padrão restaurado!"`

---

## Como o preview atualiza (shared-site.js ~linhas 854–864)

O iframe recebe os novos `siteSections` via PostMessage e:
1. Oculta seções ausentes: `el.style.display = 'none'`
2. Reinsere as ativas na ordem correta via `mainEl.insertBefore(el, anchor)`

---

## Armadilhas

| Sintoma | Causa | Solução |
|---|---|---|
| Seção salva mas não aparece no site | `siteSections` não inclui o ID (seção estava desmarcada) | Conferir `activeSet` antes de enviar |
| Ordem no site diferente do admin | `ordered[]` não reflete a posição após drag | Verificar que `renderList()` é chamado após cada mutação do array |
| Preview não atualiza | `liveRefresh` não chamado após save | Sempre chamar `liveRefresh({ siteSections })` após PUT bem-sucedido |
