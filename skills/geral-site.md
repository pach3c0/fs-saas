# Guia Mestre: Arquitetura do Site Builder

Este arquivo é a fonte de verdade para o funcionamento global do editor de sites ("Meu Site").

---

## 1. Arquitetura e Modo Builder
O painel opera no **Builder Mode** (controlado pela classe `.builder-mode` no `#adminPanel`).
- **Navegação:** `#sidebar` e `#topbar` são ocultados para focar no editor.
- **Divisão:** `#builder-props` (Painel Lateral de 360px) e `#builder-preview` (Iframe Interativo).
- **Dispositivos:** Suporta Desktop, Tablet e Mobile através de transformações de escala no iframe.

---

## 2. Protocolos de Comunicação (Snapshots & Iframe)
O editor não reinicia o site a cada mudança (exceto na troca de tema).
1. **Snapshots Locais (`appData`):** Uma variável JS que espelha o estado atual de todos os inputs.
2. **PostMessage (`window.builderPostPreview(data)`):** Envia o snapshot para o iframe.
3. **Iframe Listener:** Escuta mensagens do tipo `cz_preview` e atualiza o DOM em tempo real via `shared-site.js`.

---

## 3. Padrões de Persistência e Segurança
### 3.1 Padrão Auto-Save
Priorize o salvamento instantâneo via `oninput` no HTML:
```javascript
oninput="appData.secao.campo = this.value; updatePreview(); saveDados();"
```
- **updatePreview():** Dispara o `postMessage` imediatamente.
- **saveDados():** Requisição assíncrona para `/api/admin/updateSiteData` (MongoDB).

### 3.2 Dirty Tracking (Mudanças Não Salvas)
- Impeça a troca de sub-abas se houver mudanças pendentes usando `checkDirtyBeforeSwitch()`.
- Use `markDirty(sectionId, label)` para sinalizar campos modificados.

---

## 4. Design Aesthetics (Stitch Inspiration)
O design deve seguir a estética refinada do **Google Stitch**:

### 4.1 UI Tokens (Stitch → Admin CSS)
- **Background Base:** `#0d1117` (`var(--bg-base)`)
- **Surface Panels:** `#161b22` (`var(--bg-surface)`)
- **Accent/Visual:** `#2f81f7` (`var(--accent)`)
- **Ícones:** Use exclusivamente `Material Symbols Outlined`.

### 4.2 Componentes Visuais
- **Nav Vertical:** Itens com `border-radius: 0.75rem` e ícone vetorial 20px.
- **Cards de Tema:** Efeito glass (`builder-glass`), bordas sutis e paleta de cores circular para preview.
- **Browser Chrome:** O preview deve ser encapsulado em uma janela de navegador simulada com `#builder-browser-chrome`.

---

## 5. Módulos do Sistema
Para detalhes técnicos de cada módulo, consulte seu respectivo arquivo:
- **Temas:** `builder-templates.md`
- **Seções:** `builder-sessoes.md`
- **Hero:** `builder-hero.md`
- **Sobre:** `builder-sobre.md`
- **Estúdio & Mídia:** `builder-estudio.md`
- **Formulários (Serviços/FAQ/etc):** `builder-forms.md`
- **Personalização:** `builder-personalizar.md`

---

## 6. Padrão de Upload
- **Fotos:** Sempre passar pelo `compressImage` (Canvas) para garantir performance.
- **Vídeos:** Limite de 300MB, mostrar progresso via `XMLHttpRequest`.

---

## Ajustes Globais Pendentes
- **Header Preview:** Ao navegar via links do header dentro do iframe, o header desaparece. Precisa permanecer fixo (sticky) nos 3 modos de visualização em todos os templates.