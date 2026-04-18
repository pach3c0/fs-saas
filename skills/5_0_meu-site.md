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
| **5_1** | `5_1_builder-geral-site.md` | Arquitetura geral do builder: entrada no builder mode, sub-tabs, protocolo postMessage, mapa de dados (o que vai para siteConfig vs siteContent), armadilhas globais |
| **5_2** | `5_2_builder-sessoes.md` | Sub-tab Seções: ativar/desativar seções, reordenar, `siteSections[]` |
| **5_3** | `5_3_builder-hero.md` | Sub-tab Capa: canvas do hero, layers, posicionamento, `siteConfig` |
| **5_4** | `5_4_builder-sobre.md` | Sub-tab Sobre: canvas de imagem, texto, `siteContent.sobre` |
| **5_5** | `5_5_builder-portfolio.md` | Sub-tab Portfólio: grade de fotos, `siteContent.portfolio` |
| **5_6** | `5_6_builder-servicos.md` | Sub-tab Serviços: lista de serviços com ícone/preço, `siteContent.servicos` |
| **5_7** | `5_7_builder-depoiments.md` | Sub-tab Depoimentos: lista com foto/rating/link, `siteContent.depoimentos` |
| **5_8** | `5_8_builder-albuns.md` | Sub-tab Álbuns: álbuns públicos no site, `siteContent.albums` |
| **5_9** | `5_9_builder-estudio.md` | Sub-tab Estúdio: fotos, vídeo, WhatsApp, `siteContent.studio` |
| **5_10** | `5_10_builder-contato.md` | Sub-tab Contato: endereço, mapa embed, `siteContent.contato` |
| **5_11** | `5_11_builder-faq.md` | Sub-tab FAQ: perguntas/respostas, `siteContent.faq` |

---

## Regra de leitura

1. Leia **5_1** para entender o fluxo global (builder mode, postMessage, dados).
2. Leia a skill do módulo específico que vai alterar (5_2 a 5_11).
3. Não duplique nas skills 5_x o que já está nas skills 1_x.

---

## Regra obrigatória ao escrever/reescrever skills 5_2 a 5_11

Toda skill de módulo **deve conter uma seção "Fluxo do usuário"** descrevendo o passo a passo desde o clique do usuário até a persistência no banco. Exemplo:

```
## Fluxo do usuário
1. Usuário edita o campo X → valor atualizado no DOM
2. Clica "Salvar" → apiPut('/api/site/admin/config', { siteContent: { X: valor } })
3. Backend faz $set em Organization.siteContent.X
4. window._meuSitePostPreview?.() → iframe atualiza em tempo real
```

Sem esse fluxo documentado, bugs de integração são difíceis de rastrear.


# Melhorias na Selecao de modulos

quando selecionado o modulo na side bar o preview vai ate a seccao selecionada, comportamento parecido com o que temos hoje no menu do site publico, cada modulo selecionado ele ativa o seu submenu na barra lateral direita e desativa os outros submenus, mais o modulo sobre ele nao se comporta como os outros, ele tem a edicao de conteudo em uma janela canvas, pergunta é possivel o modulo sobre ter o comportamento dos outros modulos a aparecer no preview enquanto é ajustado mais sem perder suas funcoes de edicao que é muito mao, layer, opacidade, borda, sombra ouseja manter todas as propriedade porem ele ser renderizado enquanto ajustado no preview igual aos outros modulos