# Sessões — Módulo de Gestão de Trabalhos (CliqueZoom Admin)

> Documentação atualizada em 2026-06-25. A arquitetura de "Passos" (Stepper) foi substituída por **Páginas Únicas (Single Page)** com um **Grid Unificado** inteligente, eliminando a navegação horizontal em abas para os modos principais.
> Pasta: `admin/js/tabs/sessoes/`
> Backend: `src/routes/sessions.js`, `src/models/Session.js`, `src/utils/email.js`

---

## 1. Visão Geral

O módulo Sessões gerencia o ciclo completo de um trabalho fotográfico. Em junho de 2026, a interface do Wizard fullscreen foi refatorada novamente: a navegação guiada de 5 passos foi substituída por uma arquitetura de **Página Única (Single Page)** baseada em seções verticais e no poderoso `unified-photo-grid.js`.

**Entry points:**
- `renderSessoes(container)` em `admin/js/tabs/sessoes/index.js` — monta a lista. Os cards da lista não possuem botões de ação na superfície (apenas cliques que abrem o modal).
- `window.openSessionWizard(sessionId)` em `wizard/index.js` — abre o modal fullscreen sobre a página e injeta o Single Page View correspondente ao modo da sessão.

---

## 2. Estrutura de Pasta Atualizada

```
admin/js/tabs/sessoes/
  index.js                 — Container principal e montagem da lista
  list.js                  — Renderização dos cards da lista
  wizard/                  — Lógica do Modal Fullscreen
    index.js               — Entry point do Wizard, define qual layout de Single Page carregar
    state.js               — Estado global do Wizard
    unified-photo-grid.js  — NOVO (Jun 2026): Grid unificado inteligente que gerencia uploads, estados, polling e ações
    selection-single-page.js
    gallery-single-page.js
    multi-single-page.js
    multi-gallery-single-page.js
    config-panel.js        — Painel lateral direito sempre visível, com auto-save
    history-panel.js       — Painel de histórico da sessão
    notifications-bell.js  — Sininho de notificações embutido no modal
    steps/                 — Antigos componentes de passo, agora reutilizados como seções menores ou layouts de fallback
```

---

## 3. A Nova Arquitetura: Single Page

Os modos principais agora carregam layouts verticais (Single Pages) em vez de um stepper horizontal, centralizando todas as informações e o Grid de forma orgânica.

- **Seleção (`selection`)**: 1 única seção principal baseada no Grid Unificado. O painel "Compartilhar com o cliente" (link, WhatsApp) fica embutido logo abaixo do grid como uma aba colapsável.
- **Galeria (`gallery`)**: 2 seções verticais empilhadas: Upload (brutas) e Compartilhar/Entregar.
- **Seleção em Grupo (`multi_selection`)**: 1 única seção principal (Grid Unificado). Toda a parte de participantes, envio de código e acompanhamento é absorvida pela barra do grid ou pelo painel de status embutido.
- **Galeria em Grupo (`multi_gallery`)**: 2 seções verticais empilhadas: Upload e Compartilhar com os Convidados (sem seleção).

---

## 4. O Grid Unificado (`unified-photo-grid.js`)

A maior mudança do redesign de Junho de 2026 foi consolidar os uploads (brutas e editadas) e as visualizações de progresso no **Grid Unificado**.

**Toolbar Inteligente:**
- **Botões de Upload:** "Subir fotos" (originais) e "Subir editadas" (ou "Subir mais fotos" no fluxo 100% editadas).
- **Filtros e Chips:** Filtros rápidos ("Todas", "Selecionadas", "Editadas", "Ocultas") e chips por participante (no modo Multi).
- **Bulk Actions:** Checkbox mestre com seleção em massa para Ocultar, Mostrar e Deletar fotos.
- **Ações de Entrega e Cortesia:** Botões contextuais "Dar cortesia" e "Entregar fotos" (aparecem apenas quando apropriados com base no status das fotos e da seleção).

**Estados Visuais dos Cards (Hover / Bordas):**
O grid reflete o estado semântico de cada foto através das cores das bordas e badges contextuais:
1. **Editada (Verde):** A foto foi selecionada pelo cliente e já possui o arquivo final de alta resolução (`urlOriginal`).
2. **Selecionada (Amarelo):** O cliente a incluiu na seleção final (pendente de edição/entrega).
3. **Cortesia (Roxo):** A foto não faz parte da seleção formal, mas o fotógrafo a marcou e subiu como um presente/bônus.
4. **Oculta / Normal (Cinza):** Foto normal ou explicitamente oculta pelo fotógrafo (exibida com opacidade reduzida).

O card também inclui overlays práticos (ao passar o mouse) para reverter/apagar edições específicas sem remover a foto da seleção do cliente, bem como atalhos diretos para os comentários do cliente e para definir a foto de capa.

---

## 5. Painel de Configurações Lateral (`config-panel.js`)

À direita do Wizard existe um painel recolhível onde ficam **todas as configurações** estruturais da sessão.
- **Autosave Instantâneo:** As alterações persistem imediatamente ao interagir, sem a necessidade de um botão "Salvar".
- **Grupos:** Geral (nome, capa, prazo), Seleção (pacotes, limite, preço foto extra), Mensagens, Vendas e Armazenamento/Backup ZIP.
- **Bloqueio Automático (Locks 🔒):** Campos críticos como "Modo da Sessão" e "Resolução" são travados automaticamente após o cliente iniciar a escolha ou assim que os uploads se iniciam, prevenindo descompassos e quebras de estado operacionais.

---

## 6. Polling Adaptativo

Durante a fase em que o cliente está interagindo (modo de Seleção), o Grid Unificado utiliza um **polling adaptativo** (embutido no `unified-photo-grid.js`) para atualizar o frontend em tempo real com as escolhas recentes do cliente:
- `POLL_DEFAULT_MS`: A cada 30 segundos em períodos ociosos.
- `POLL_FAST_MS`: A cada 10 segundos em "janelas quentes" de atividade (logo após detectar mudanças).
- Performance inteligente: Se abaixar o navegador (`document.visibilityState === 'hidden'`), o polling pausa automaticamente para economizar recursos e retoma no exato momento que a aba recupera o foco.

---

## 7. Integração com Modais Legados (`openOverlayModal`)

Apesar de ser um modal fullscreen, o Wizard ainda precisa abrir funcionalidades de nicho que existem como modais legados (ex.: Modal de Chat e Histórico de Chat). Para evitar conflitos de *z-index* ou de *stacking context* com a interface mãe, usa-se a estratégia robusta de `openOverlayModal`:
1. O Wizard se oculta inteiramente (`display: none`).
2. O sistema mostra o modal legado focado.
3. Fica-se num polling monitorando o modal legado; ao ser encerrado pelo fotógrafo, o modal Wizard reaparece na tela assumindo o estado onde parou.

---

## 8. Backend / API / Integrações Chave

- **Upload de Editadas Inteligente:** Em vez de depender apenas do ID, o match para envio de fotos editadas baseia-se no nome de arquivo original, preservando de forma implícita o link entre a escolha do cliente (versão reduzida) e a entrega final do fotógrafo (alta).
- **Exportar Lightroom:** Essa rota `/api/sessions/:id/export` envia o token JWT via query string. Por rodar num `window.open` que não anexa cabeçalhos Authorization, foi desenvolvido este contorno arquitetural validado.

---

## 9. Manutenção e Débito Técnico

Como a interface perdeu o conceito de Stepper/Passos 1 a 5:
1. Scripts de Automação (ex.: testes E2E com Playwright) precisarão ser atualizados para interagir diretamente com o "Grid Unificado" em vez dos botões "Próximo" ou "Passo Anterior".
2. Guias do Administrador e Textos de HelpDesk que indicavam "clique em Enviar no Passo 2" devem ser reescritos nos canais oficiais para mencionar os toolbars ou a seção inferior das Páginas Únicas.
