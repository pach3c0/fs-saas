# Índice — Grupo 5: Meu Site (Builder)

> Leia este índice primeiro para saber qual skill 5_x consultar.
> Para padrões gerais de frontend, backend e banco de dados, ver skills 1_x.

---

## Quando ler este grupo

Sempre que alterar qualquer parte do módulo **Meu Site** do painel admin:
editor visual (builder), templates do site público, ou persistência de dados do site.

---

## Mapa de skills

| Skill | Arquivo | Cobre |
|---|---|---|
| **5_1** | `5_1_builder-geral-site.md` | Arquitetura geral do builder: entrada no builder mode, sub-tabs, protocolo postMessage, mapa de dados |
| **5_2** | `5_2_builder-sessoes.md` | Sub-tab Seções: ativar/desativar seções, reordenar, `siteSections[]` |
| **5_3** | `5_3_builder-hero.md` | Sub-tab Capa: canvas do hero, layers, posicionamento, `siteConfig` |
| **5_4** | `5_4_builder-sobre.md` | Sub-tab Sobre: canvas de imagem, texto, `siteContent.sobre` |
| **5_5** | `5_5_builder-portfolio.md` | Sub-tab Portfólio: grade de fotos, modal de edição avançada |
| **5_6** | `5_6_builder-servicos.md` | Sub-tab Serviços: lista de serviços com ícone/preço |
| **5_7** | `5_7_builder-depoiments.md` | Sub-tab Depoimentos: lista com foto/rating/link |
| **5_8** | `5_8_builder-albuns.md` | Sub-tab Álbuns: catálogos, edição de grade e modal de lightbox |
| **5_9** | `5_9_builder-estudio.md` | Sub-tab Estúdio: fotos, vídeo, WhatsApp |
| **5_10** | `5_10_builder-contato.md` | Sub-tab Contato: endereço, mapa embed |
| **5_11** | `5_11_builder-faq.md` | Sub-tab FAQ: perguntas/respostas |

---

## Regra de leitura

1. Leia **5_1** para entender o fluxo global (builder mode, postMessage, dados).
2. Leia a skill do módulo específico que vai alterar (5_2 a 5_11).
3. Não duplique nas skills 5_x o que já está nas skills 1_x.

---

## Padrões de Edição de Imagens no Builder

Existem **dois padrões distintos** de edição visual de fotos espalhados pelo painel admin. Caso precise implementar edição de fotos num novo módulo (ex: Estúdio), escolha um dos padrões abaixo e utilize o código já existente como base:

### Padrão 1: Editor Avançado com CSS Nativo (Portfólio / Álbuns)
Ideal para **grades responsivas** onde o cliente precisa apenas dar "zoom" e recadrar a imagem (Crop).
- **Como funciona:** Abre-se uma Modal Escura. A imagem utiliza CSS nativo `object-position: X% Y%` e `transform: scale(Z)`.
- **Propriedade:** Permite trocar a proporção on-the-fly usando botões (16:9, 9:16, 1:1) trocando o `aspect-ratio` da div pai.
- **Dado Salvo:** Salva um objeto complexo da foto: `{ url, caption, format, transform: { scale, x, y } }`.
- **Onde copiar:** O código deste Modal vive em `admin/js/tabs/portfolio.js` e `albuns.js` (`openPhotoEditor` / `openAlbumPhotoEditor`).

### Padrão 2: Editor em Canvas Layer (Sobre / Capa)
Ideal para **composições ricas** (onde o usuário adiciona bordas sólidas, sombras, opacidade, ou sobrepõe elementos gráficos).
- **Como funciona:** A imagem não é manipulada apenas via CSS. O estado da imagem e seus efeitos (radius, shadow, border) são mantidos num modelo interno de *Layers*.
- **Dado Salvo:** Salva-se o estado das camadas (`canvasLayers`) e as propriedades cosméticas atreladas.
- **Onde copiar:** A lógica está no `admin/js/tabs/sobre.js` (e legado no `hero.js`).

---

## Armadilhas Conhecidas: Sync Real-Time (Live Preview)

Sempre que a sincronização em Tempo Real falhar (ou seja, você altera no admin e precisa dar *F5/Recarregar* para ver o resultado no IFRAME), as causas costumam ser uma dessas duas:

1. **Payload Incompleto em `postPreviewData` (`meu-site.js`)**
   - O payload `snap.siteContent` enviado para o IFRAME é estritamente construído manualmente no arquivo `meu-site.js`. Se você criar um módulo novo ou reformular uma estrutura (ex: `siteContent.albums` ou `siteContent.studio`) e esquecer de incluí-lo lá dentro, o IFRAME nunca receberá a atualização, e parecerá que o Real-Time quebrou.
   - **Solução:** Checar a função `postPreviewData` e verificar se sua chave (ex: `snap.siteContent.meuNovoModulo = configData.siteContent.meuNovoModulo`) está presente.

2. **O Elemento HTML está Fora do Fluxo (Modais Dinâmicos)**
   - O IFRAME (`shared-site.js`) atualiza o visual recriando o DOM via função `renderSite()`. O problema é que `renderSite()` apaga e recria o `#section-nome`, mas **NÃO** recria Modais que foram apendadas direto no `document.body` (como os Lightboxes ou Modais de Catálogo dos Álbuns).
   - **Solução:** Se a edição real-time for refletir dentro de um modal aberto, adicione uma regra explícita no fim de `renderSite()` no `shared-site.js` para checar se o modal está no DOM (`document.getElementById(...)`) e, se estiver, force a chamada da função que o desenha (`openAlbumModal()`).