# Meu Site — Construtor do Site Público (CliqueZoom Admin)

> Documentação gerada em 2026-06-11 (programa de testes — módulo 5 de 12).
> Referência frontend: `admin/js/tabs/meu-site.js` (~2090) + builders: `sobre.js`, `portfolio.js`, `albuns.js`, `estudio.js`, `faq.js`, `cliente.js`
> Referência backend: `src/routes/site.js` (`GET/PUT /api/site/admin/config` — merge por sub-chave)
> **Manual do usuário:** `admin/js/tabs/ajuda.js` → `MANUAL_MODULES` (id: `meu-site`) — criado e validado por screenshot em 2026-06-11.
> **Testes E2E:** `tests/local/13_meusite-1..5.spec.js` — 21 testes em 5 blocos, todos verdes em 2026-06-11.

---

## 1. Visão Geral

A aba abre em **modo builder**: o workspace some (`#adminPanel.builder-mode`), o painel de props
(`#builder-props`, nav vertical com 14 sub-abas) fica à esquerda e o preview ao vivo
(`#builder-preview` com `#builder-iframe` carregando `/site?_preview=1&_tenant=`) à direita.
Trocar de tab do admin chama `exitBuilderMode()` e restaura o workspace. A 15ª sub-aba ("Padrão")
só aparece para superadmin (`#adminTemplateNavItem`).

## 2. Sub-abas e mecânicas testadas

| Sub-aba | Mecânica | Persistência |
|---|---|---|
| Geral | Galeria de 5 temas (selecionar ≠ salvar; "Visualizar" = `_preview_theme` sem tocar o banco), Status do site (toggle → cortina "Em breve" client-side), Aplicar Exemplo (confirm) | `siteTheme`, `siteEnabled` |
| Seções | 10 blocos: checkbox liga/desliga, ▲▼/drag reordena, Salvar, Restaurar padrão (confirm) | `siteSections` |
| Capa (Hero Studio) | Camadas de texto (add/selecionar/editar props/excluir/drag), imagem de fundo (upload + sliders zoom/posX/posY/overlay), Restaurar Padrão | `siteConfig.heroLayers`, `heroImage`, `heroScale`... |
| Sobre | Título/texto via RTE, fotos como camadas (máx. 4) | `siteContent.sobre` (+ `canvasLayers`) |
| Portfólio | Upload múltiplo, grid Padrão/Misto, seleção em massa + excluir, limpar tudo, modal por foto (zoom/posição/caption) | `siteContent.portfolio` |
| Serviços | CRUD inline com Salvar | `siteContent.servicos` |
| Depoimentos | Pendentes (aprovar/rejeitar — mesmo fluxo da aba Mensagens) + CRUD dos publicados | `siteContent.depoimentos` |
| Álbuns | Criar/titular (salva no blur E no botão), upload por álbum, modal por foto | `siteContent.albums` |
| Estúdio | Campos + RTEs, toggle mapa, fotos em camadas, vídeo, "Salvar Tudo" | `siteContent.studio` |
| Contato | Título/texto/endereço | `siteContent.contato` |
| FAQ | Cards com RTEs (pergunta inline + resposta rica); sem FAQ salvo, semeia 6 padrões | `siteContent.faq` |
| Rodapé | Copyright, 6 redes sociais, links úteis (remover salva sozinho) | `siteContent.footer` |
| Área do Cliente | **Autosave por digitação** (sem botão) + toggle de exibição | `siteContent.areaCliente` |
| Personalizar | Paleta (3 cores) + fonte, preview da paleta, Resetar Padrão (confirm) | `siteStyle` |

**Dirty-tracking:** trocar de sub-aba com alterações não salvas (comparação de INPUTS vs snapshot)
abre confirm "Salvar / Descartar".

## 3. Bugs encontrados e corrigidos (2026-06-11)

1. **Serviços — remover o último não podia ser salvo**: o botão "Salvar Serviços" só renderizava
   com lista não-vazia; excluir o último item fazia o botão sumir e a remoção nunca persistia.
   Fix: botão sempre visível (`meu-site.js`).
2. **Rodapé — "+ Adicionar link" descartava o estado**: o handler re-chamava `renderRodape()`, que
   re-inicializava do salvo — com rodapé nunca salvo, o link novo era descartado e copyright/redes
   digitados eram apagados. Fix: cópia local + `lerInputs()` antes de cada re-render + `renderList()`
   interno (`meu-site.js`).
3. **FAQ — "+ Adicionar"/remover descartavam edições não salvas** (mesmo padrão): re-render sem
   capturar os RTEs; o remover ainda persistia valores velhos. Fix: `lerEditores()` antes de
   qualquer re-render (`faq.js`).

## 4. Caveats de teste (p/ próximas suítes)

- Cortina "Em breve" e seções são **client-side** (`shared-site.js`) — validar com página real,
  nunca via curl. Seções viram `<section id="section-X">`; desativadas ficam `display:none`/ausentes.
- Toggles estilizados têm `input` invisível (`opacity:0`) — clicar no `label:has(#id)`.
- RTEs: pergunta/título inline viram `#<idInput>_rte` (contenteditable); editor rico = `.cz-rte-body`
  dentro do wrap.
- Upload do builder: POST `/api/admin/upload` (não `/api/upload`).
- Grid do portfólio: itens reais = `.p-item` (estado vazio injeta `.p-empty` no grid).
- Todos os testes fazem snapshot do config e **restauram no fim** (PUT merge por sub-chave).

## 5. Superfície NÃO coberta por E2E (validação manual recomendada)

Transforms finos dos modais de foto (zoom/posição/caption em Portfólio/Álbuns), drag&drop real de
reordenação (testado via botões ▲▼), upload de vídeo do Estúdio, mensagens de WhatsApp do Estúdio,
seleção em massa do Portfólio, e a aba Padrão (exige superadmin). Pendência conhecida do CLAUDE.md:
hexcodes hardcoded (dark-only) em partes do builder — anti-padrão registrado, não é regressão.

## 6. Roteiro de Vídeo: Construindo seu site

**Duração estimada:** 90 a 120 segundos
**Objetivo:** Mostrar o fluxo completo: tema → seções → capa → conteúdo → estilo → publicar.

### Cena 1: Abertura (0s - 12s)
- **Visual:** Clique em "Meu Site" no menu; o builder abre em tela cheia com o preview à direita.
- **Áudio (Locução):** "Seu site profissional, sem programar nada. No Meu Site, você edita à esquerda e vê o resultado ao vivo, na hora, à direita."

### Cena 2: Tema e Seções (12s - 35s)
- **Visual:** Galeria de temas; clique em "Visualizar" num tema, depois seleciona e salva. Corta para Seções: desativa um bloco e arrasta outro de posição — o preview reage.
- **Áudio (Locução):** "Escolha entre cinco temas — dá pra visualizar antes de decidir. Depois, monte a estrutura: ligue, desligue e reordene as seções do jeito que fizer sentido pro seu negócio."

### Cena 3: A Capa (35s - 60s)
- **Visual:** Aba Capa: sobe imagem de fundo, ajusta zoom, adiciona um texto e arrasta o tamanho/cor.
- **Áudio (Locução):** "A capa é a primeira impressão: suba sua melhor foto, ajuste o enquadramento e escreva por cima — cada texto é uma camada com posição, tamanho e cor próprios."

### Cena 4: Conteúdo (60s - 85s)
- **Visual:** Passada rápida: Portfólio (upload múltiplo preenchendo o grid), Serviços (card com preço), Depoimentos, FAQ.
- **Áudio (Locução):** "Preencha o resto em minutos: arraste suas fotos pro portfólio, liste serviços com preços, aprove depoimentos de clientes e responda as dúvidas mais comuns no FAQ."

### Cena 5: Estilo + Publicar (85s - 110s)
- **Visual:** Personalizar: muda a cor principal e a fonte (preview reage). Volta em Geral e liga o interruptor do site; abre o site publicado em nova aba.
- **Áudio (Locução):** "Pra fechar, deixe tudo com a sua cara: paleta de cores e fonte do site inteiro. Pronto? É só ativar — e o seu site está no ar, no seu próprio endereço."
- **Ação em Tela:** Fade out para o logo da CliqueZoom Academy.
