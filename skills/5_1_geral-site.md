# Meu Site — Módulo Builder

> Leia quando alterar `meu-site.js`, sub-tabs do builder, fluxo de preview ou persistência de dados do site público.
> Padrões gerais (CSS variables, apiGet/apiPut, estado isolado): ver `1_2_frontend.md`.

---

## 1. Entrada no Builder Mode

```js
// admin/js/tabs/meu-site.js
export async function renderMeuSite(container) {
  window._cleanupBuilderCanvases = function () { ... };

  if (typeof window.enterBuilderMode === 'function') {
    window.enterBuilderMode();
    const propsContent = document.getElementById('builder-props-content');
    const propsTabs   = document.getElementById('builder-props-tabs');
    if (propsContent && propsTabs) {
      container.innerHTML = '...'; // placeholder "Editor aberto ao lado →"
      await renderBuilderContent(propsContent, propsTabs);
      return;
    }
  }
  // Fallback: render normal (sem builder disponível)
  await renderSiteContent(container, null);
}
```

- `#builder-props-content` — painel lateral esquerdo (360px) onde as propriedades são renderizadas
- `#builder-props-tabs` — nav vertical de sub-tabs dentro do painel
- `#builder-preview` — iframe de preview à direita

---

## 2. Sub-tabs e responsáveis

| Sub-tab | `data-target` | Renderizado por |
|---|---|---|
| Geral | `config-geral` | `meu-site.js` (inline) |
| Seções | `config-secoes` | `meu-site.js` (inline) |
| Capa | `config-hero` | `hero.js` |
| Sobre | `config-sobre` | `sobre.js` |
| Portfólio | `config-portfolio` | `portfolio.js` |
| Serviços | `config-servicos` | `meu-site.js` (inline) |
| Depoimentos | `config-depoimentos` | `meu-site.js` (inline) |
| Álbuns | `config-albuns` | `albuns.js` |
| Estúdio | `config-estudio` | `estudio.js` |
| Contato | `config-contato` | `meu-site.js` (inline) |
| FAQ | `config-faq` | `faq.js` |
| Personalizar | `config-personalizar` | `meu-site.js` (inline) |

Módulos externos (`hero.js`, `sobre.js`, etc.) recebem o container `#config-X` e se auto-renderizam. São importados no topo de `meu-site.js`.

---

## 3. Protocolo postMessage (preview ao vivo)

```js
// Envia snapshot para o iframe — chamado após qualquer mudança de dados
window.builderPostPreview(data);
// → postMessage({ type: 'cz_preview', data }) para #site-preview-frame

// iframe (shared-site.js) escuta:
window.addEventListener('message', (e) => {
  if (e.data?.type === 'cz_preview') applyPreviewData(e.data.data);
});
```

**`window._meuSitePostPreview`** — função registrada por `meu-site.js` que busca os dados atuais da org e dispara `builderPostPreview`. Módulos filhos a chamam após salvar:

```js
window._meuSitePostPreview?.(); // após apiPut em hero.js, sobre.js, faq.js etc.
```

---

## 4. Cleanup de canvas

```js
window._cleanupBuilderCanvases = function () {
  destroySobreCanvas();
  const heroEl = document.getElementById('hero-canvas-container');
  if (heroEl) heroEl.remove();
};
```

Registrado em `renderMeuSite` para garantir que `portfolio.js` já foi carregado. Chamado automaticamente ao sair do builder mode (em `app.js`).

---

## 5. Dados: o que vai onde

| Campo | Modelo / campo | Rota |
|---|---|---|
| `siteTheme` | `Organization.siteTheme` | `PUT /api/site/admin/config` |
| `siteEnabled` | `Organization.siteEnabled` | `PUT /api/site/admin/config` |
| `siteSections` | `Organization.siteSections` | `PUT /api/site/admin/config` |
| Hero (layers, posição, overlay) | `Organization.siteConfig` | `PUT /api/site/admin/config` |
| Sobre, Serviços, Depoimentos, Contato | `Organization.siteContent.X` | `PUT /api/site/admin/config` |
| Portfolio, FAQ, Álbuns, Estúdio | Módulo próprio — ver skill `5_x` correspondente | — |

O site público lê tudo via `GET /api/site/config` → `Organization`. Nunca salvar dados do site em `SiteData` (legado) — o site público não lê de lá (exceto `hero` canvas layers, que ainda usa `SiteData`).

---

## 6. Armadilhas conhecidas

| Sintoma | Causa | Fix |
|---|---|---|
| Preview branco ao abrir builder | Race condition de slug | `await loadOrgSlug()` antes de `builderLoadPreview()` |
| Preview mostra "Site em construção" | `siteEnabled=false` na org | Sempre incluir `?_preview=1` na URL do iframe |
| Seções renderizadas fora de ordem | `appendChild` em vez de inserir antes do footer | `insertBefore(el, siteFooter)`, nunca `appendChild` |
| Sub-tab não abre após mudança | Dirty tracking bloqueando | `checkDirtyBeforeSwitch()` retorna `false` — salvar ou descartar antes de trocar |

---

## 7. Regra obrigatória para skills 5_x

Toda skill de módulo (5_2 a 5_11) **deve conter uma seção "Fluxo do usuário"** descrevendo o passo a passo desde o clique do usuário até a persistência no banco. Exemplo:

```
## Fluxo do usuário
1. Usuário edita o campo X → valor atualizado no DOM
2. Clica "Salvar" → apiPut('/api/site/admin/config', { siteContent: { X: valor } })
3. Backend faz $set em Organization.siteContent.X
4. window._meuSitePostPreview?.() → iframe atualiza em tempo real
```

Sem esse fluxo documentado, bugs de integração são difíceis de rastrear.
| `slug.cliquezoom.com.br` sempre mostra "Site em construção" | Subdomínio público nunca configurado — `_tenant` sem `_preview` é ignorado em produção; tenant middleware resolve pelo host | **Pendente:** configurar DNS de subdomínio e validar fluxo completo. Ver `src/middleware/tenant.js:65`. |
