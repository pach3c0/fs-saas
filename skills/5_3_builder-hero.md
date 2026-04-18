# Skill 5_3 — Sub-tab Capa / Hero (Builder do Site)

Leia este arquivo ao trabalhar na sub-tab **Capa** do builder do site público.
Arquivo principal: `admin/js/tabs/meu-site.js` — funções `initHeroStudio()` (linha 661) e `syncHeroStudioUI()` (linha 632).

---

## O que esta sub-tab faz

Permite ao fotógrafo configurar a **seção de abertura** do site público: imagem de fundo com zoom/posição, sobreposição escura (overlay), barras superior/inferior e camadas de texto posicionadas livremente.

---

## Dado persistido

```
Organization.siteConfig  ← NÃO é siteContent
```

Salvo via `PUT /api/site/admin/config` com payload `{ siteConfig: cfg }`.
O backend faz **merge por sub-chave** (não sobrescreve o objeto inteiro), então outros campos de `siteConfig` não são perdidos.

### Campos de `siteConfig` usados pelo hero

```javascript
{
  heroImage:       '/uploads/orgId/file.jpg',  // imagem de fundo
  heroScale:       1,          // zoom: 1–3
  heroPosX:        50,         // posição X: 0–100%
  heroPosY:        50,         // posição Y: 0–100%
  overlayOpacity:  30,         // escurecimento: 0–100
  topBarHeight:    0,          // barra superior (px)
  bottomBarHeight: 0,          // barra inferior (px)
  heroLayers: [
    {
      id:       'uuid',
      type:     'text',
      name:     'Título',
      text:     'Texto aqui',
      x:        50,            // % horizontal
      y:        40,            // % vertical
      fontSize: 48,
      color:    '#ffffff',
      align:    'center',
      // outros campos de estilo opcionais
    }
  ]
}
```

---

## Fluxo do usuário

```
1. Sub-tab abre → initHeroStudio() → cfg = configData.siteConfig || {}
2. syncHeroStudioUI() popula sliders (#hcBgScale, #hcBgPosX, #hcBgPosY) e lista de camadas
3. Usuário edita:
   - Upload de imagem → POST /api/admin/upload → atualiza cfg.heroImage
   - Move slider → atualiza cfg.heroScale / heroPosX / heroPosY
   - Adiciona camada de texto (#hcAddText) → push em cfg.heroLayers
   - Seleciona camada → #hcLayerProps aparece com campos editáveis
4. Clica Salvar (#hcSaveBtn)
   → apiPut('/api/site/admin/config', { siteConfig: cfg })
5. Backend: $set por sub-chave em Organization.siteConfig (preserva outros campos)
6. liveRefresh({ siteConfig: cfg }) → postPreviewData() → PostMessage → iframe atualiza capa em tempo real
```

---

## Interações da UI

### Botões principais

| ID | Ação |
|---|---|
| `#hcAddText` | Adiciona nova camada de texto a `cfg.heroLayers` |
| `#hcBgUpload` | Upload da imagem de fundo; atualiza `cfg.heroImage` |
| `#hcBgScale` | Slider zoom (1–3); atualiza `cfg.heroScale` |
| `#hcBgPosX` | Slider posição X (0–100%); atualiza `cfg.heroPosX` |
| `#hcBgPosY` | Slider posição Y (0–100%); atualiza `cfg.heroPosY` |
| `#hcLayerList` | Lista de camadas; clique seleciona, `✕` remove |
| `#hcLayerProps` | Painel de propriedades (oculto até selecionar camada) |
| `#hcSaveBtn` | Salva via PUT; spinner com `withBtnLoading`; toast "Capa salva!" |
| `#hcRestoreBtn` | `showConfirm` → reseta cfg para defaults → PUT → toast |

### Variáveis locais críticas

| Variável | Linha | Uso |
|---|---|---|
| `_heroImageUrlForPreview` | 408 | URL temporária antes de salvar |
| `_heroSelectedLayerId` | 630 | Camada selecionada no momento |
| `heroRenderLayerList` | 658 | Re-renderiza `#hcLayerList` |
| `heroRenderPropsForLayer` | 659 | Popula `#hcLayerProps` para a camada ativa |

### Drag & drop nas camadas
- Handle `⠿` em cada item da lista
- Reordena `cfg.heroLayers` pelo mesmo padrão de `splice` usado em Seções (5_2)

---

## Como o preview atualiza

`liveRefresh({ siteConfig: cfg })` → chama `postPreviewData()` → `window._meuSitePostPreview?.()` → PostMessage ao iframe → `shared-site.js` aplica novos valores de hero sem recarregar a página.

---

## Armadilhas

| Sintoma | Causa | Solução |
|---|---|---|
| Save do hero apaga campos de outros módulos | Payload `{ siteConfig: cfg }` sobrescrevendo sub-chaves alheias | Backend já faz merge por sub-chave; não mandar `siteConfig` inteiro do frontend sem motivo |
| Hero salvo mas site não atualiza | `liveRefresh` ausente após PUT | Sempre chamar `liveRefresh({ siteConfig: cfg })` no `.then()` do PUT |
| `siteContent.hero` vs `siteConfig` | Confusão comum: hero usa `siteConfig`, os demais módulos usam `siteContent` | Confirmar no `shared-site.js` qual chave cada seção lê |
| `HeroCanvasEditor` / `heroCanvas.js` | Removido; sistema atual usa preview real via iframe | Não reimportar; comentário na linha 15 do arquivo documenta a remoção |
