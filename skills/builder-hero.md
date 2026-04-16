# Módulo: Hero / Capa (Versão Básica)

Editor simplificado para a seção de abertura do site. Focado em imagem de fundo única e camadas de texto.

---

## 1. Arquivo Principal
`admin/js/tabs/meu-site.js` — função `renderHeroStudio()`

---

## 2. Interface do Editor (Simplificada)

### Sidebar de Propriedades (`#config-hero`)

**Seção: Adicionar**
- Botão: `+ Texto` (`#hcAddText`) — Adiciona uma nova camada de texto.
- *Nota: Função "+ Imagem" removida para simplificação.*

**Seção: Imagem de Fundo**
- Botão: `Upload` (`#hcBgUpload`) — Altera a imagem de fundo principal.
- *Nota: Botão "Cortar" removido.*
- **Ajustes da Imagem** (Dropdown `<details>`):
  - Zoom: `#hcBgScale` (1x a 3x)
  - Posição X: `#hcBgPosX` (0–100%)
  - Posição Y: `#hcBgPosY` (0–100%)

**Seção: Propriedades da Camada Texto** (`#hcLayerProps`)
- Conteúdo do texto: `#lpText`
- Posição X/Y (%), Tamanho da Fonte, Cor, Alinhamento.

**Seção: Camadas** (`#hcLayerList`)
- Lista de textos adicionados à capa.
- Suporta reordenação via Drag & Drop.
- Clique para selecionar e editar propriedades.
- Botão `✕` para remover a camada.

**Seção: Ações**
- Botão `Salvar` (`#hcSaveBtn`): Persiste as configurações.
- Botão `Restaurar Padrão` (`#hcRestoreBtn`): Reseta a capa para o estado inicial.

---

## 3. Estrutura de Dados (`cfg`)

```javascript
cfg = {
  heroImage: '/uploads/orgId/file.jpg',
  heroScale: 1,
  heroPosX: 50,
  heroPosY: 50,
  heroLayers: [
    { id, type: 'text', name, text, x, y, fontSize, color, align, ... }
  ]
}
```

---

## 4. O que foi removido (Simplificação)
- [x] Botões de Device (Desktop/Tablet/Mobile): Agora o posicionamento é global.
- [x] Seção de Efeitos: Overlay (escurecer), Barra Superior e Barra Inferior removidos.
- [x] Camadas de Imagem: Apenas texto é permitido sobre a capa.
- [x] Ferramenta de Corte (Crop): Foco em upload direto e ajuste de zoom/posição.