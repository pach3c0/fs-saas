# Skill: Admin — Builder Mode e Meu Site

Leia este arquivo ao trabalhar em `admin/js/tabs/meu-site.js`, `admin/js/app.js` (builder), ou qualquer sub-aba do Meu Site.

---

## Builder Mode — Como funciona

Quando o usuario clica em "Meu Site", `app.js` entra em builder mode:
- `#sidebar`, `#topbar`, `#workspace` ficam `display: none`
- `#builder-props` (360px) fica `display: flex` — painel de propriedades com nav vertical
- `#builder-preview` (flex:1) fica `display: flex` — iframe com o site

Dispositivos suportados: Desktop (1280x900), Tablet (768x1024 escalado), Mobile (390x844 escalado).

---

## Preview em tempo real (postMessage)

- Ao salvar, `liveRefresh(patch)` atualiza `configData` local e envia via postMessage — sem recarregar o iframe
- Excecao: troca de tema (`siteTheme`) usa `builderScheduleRefresh` pois o HTML do template muda
- `app.js` expoe `window.builderPostPreview(data)` → envia `{ type: 'cz_preview', data }` ao iframe
- `site/templates/shared-site.js` escuta e chama `renderSite(data)` diretamente
- Quando o iframe termina de carregar, envia `{ type: 'cz_preview_ready' }` de volta
- `meu-site.js` expoe `window._meuSitePostPreview()` que coleta todos os campos do form

**Preview usa `_preview=1` na URL:**
- Ignora `isActive` da org (mostra site mesmo desativado)
- Permite passar `_tenant=slug` em producao (normalmente bloqueado)

---

## Deteccao de alteracoes nao salvas

- `markDirty(sectionId, label)` e `clearDirty()` em `meu-site.js`
- Ao trocar de sub-aba, `checkDirtyBeforeSwitch()` pergunta se quer salvar
- Secoes com dirty tracking: Hero, Sobre, Contato, Personalizar, Servicos, Depoimentos

---

## Sub-abas do Meu Site (nav vertical, 360px)

| Sub-aba | O que configura |
|---------|----------------|
| Geral | Tema (template), status site (ativo/inativo), link do site |
| Secoes | Quais secoes aparecem e em que ordem (drag para reordenar) |
| Hero | Imagem de fundo, titulo, subtitulo, posicao, overlay, barras |
| Sobre | Texto e imagem da secao "Sobre" |
| Portfolio | Fotos do portfolio |
| Servicos | Lista de servicos (titulo, descricao, icone, preco) |
| Depoimentos | Depoimentos (inclui aprovacao de pendentes publicos) |
| Albums | Albums de fotos |
| Estudio | Info do estudio, video, fotos |
| Contato | Titulo, texto e endereco do contato |
| FAQ | Perguntas frequentes |
| Personalizar | Cores (accent, fundo, texto), fonte, secoes customizadas |

---

## Variaveis globais do builder (app.js)

- `window.builderPostPreview(data)` — envia dados ao iframe via postMessage
- `window.enterBuilderMode()` — entra no modo builder
- `window.exitBuilderMode(skipNav?)` — sai do modo (Escape ou botao "Sair")
- `window.builderRefreshPreview()` — recarga o iframe
- `window.builderSetDevice(device)` — muda entre desktop/tablet/mobile
- `window.builderScheduleRefresh()` — debounce reload do iframe (so troca de tema)
- `window._meuSitePostPreview()` — coleta e envia dados atuais do form

---

## Salvar dados do site (aba "Meu Site")

```
Tab chama apiPut('/api/site/admin/config', { siteTheme, siteConfig, siteContent, siteStyle, siteSections })
  → Backend: Organization.findOneAndUpdate({ organizationId }, payload)
  → liveRefresh(patch) atualiza configData local e envia postMessage ao iframe
```
