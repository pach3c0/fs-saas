# Módulo: Personalização (Site Style)

Configurações estéticas globais e gerenciamento de seções customizadas.

---

## 1. Estilo Visual (Cores e Fontes)
- **Cores principais:** `#styleAccentColor`, `#styleBgColor`, `#styleTextColor`.
- **Google Fonts:** `#styleFontFamily` (Dropdown com fontes pré-selecionadas).
- **Preview:** `#stylePalettePreview` mostra uma amostra de como as cores interagem.
- **Botões:** `#saveStyleBtn` e `#resetStyleBtn` (volta ao padrão do tema).

---

## 2. Seções Extras (Custom Sections)
Permite ao usuário criar seções além das fixas do tema (Hero, Sobre, etc).
- **Adicionar:** `#addCustomSecBtn` abre um dropdown com tipos: `Texto`, `Galeria`, `CTA`.
- **Lógica:** Cada seção customizada recebe um ID único e é renderizada dinamicamente no One-Page.

---

## 3. Lógica Técnica
- As cores e fontes são injetadas no Iframe via CSS Variables (`--accent`, `--bg`, etc).
- O salvamento gera um objeto `siteStyle` no MongoDB Atlas.
