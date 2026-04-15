# Módulo: Hero / Capa

Editor visual da seção de abertura (Hero) do site.

---

## 1. Interface do Editor
- **Canvas Principal:** `#hero-canvas-container`
- **Controles de Fundo:**
    - Zoom: `#hcBgScale` (1x a 3x)
    - Posição: `#hcBgPosX` e `#hcBgPosY` (0% a 100%)
    - Upload: `#hcBgUpload` (dispara o editor de corte antes de aplicar)
- **Gestão de Camadas (Layers):**
    - Adicionar Texto: `#hcAddText`
    - Adicionar Imagem: `#hcAddImage`
    - Lista de Camadas: `.hc-layer-item` (suporta reordenação via drag-and-drop)

---

## 2. Propriedades de Camada
Ao selecionar uma camada, o painel `#hcLayerProps` é exibido com:
- **Texto:** Fonte, tamanho, cor, alinhamento.
- **Imagem:** Escala, rotação, filtros.

---

## 3. Lógica Técnica
- **Renderização:** O canvas no admin simula o layout final.
- **Persistência:** O botão `#hcSaveBtn` salva o array de layers e as configurações de fundo no campo `hero` do banco de dados.
- **Preview:** Utiliza o `postMessage` para atualizar o título e fundo no site sem recarregar.


## Restaurar Padrão
- **Botão:** `Restaurar`
- **Ação:** Restaura o Hero para o padrão do tema atual.
- **Requisito:** Exibir um alerta claro informando que a ação redefine apenas a posição das seções e que nenhum conteúdo do site será apagado.


# ajuste

Padronizar a guia Capa (Hero) para exibir o preview real do site em tempo real, eliminando o Canvas exclusivo e mantendo a consistência visual com as guias "Geral" e "Sessões".