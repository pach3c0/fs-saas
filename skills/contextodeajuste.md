 # Ajustes Pendentes - Meu Site

Este documento centraliza as correções e melhorias necessárias na interface do construtor de site e nos módulos específicos.

## 🛠️ Interface & Comportamento Geral
- **Sidebar de Ajustes:** Diminuir a largura da barra lateral para maximizar o espaço de edição das propriedades.
- **Status do Site:** Corrigir o toggle de Ativo/Desativo; as alterações não estão sendo refletidas no site final (página de "Em Breve").
- **Título do Site:** Persistir o nome do tema selecionado. Após login/logout, o título volta para "Título do Site" em vez de mostrar o tema atual salvo.
- **Header no Preview:** No modo Tablet/Mobile, o header desaparece ao clicar nos itens do menu (o comportamento deve ser o scroll suave até a seção, mantendo o header visível como no site real).

## 📂 Módulo: Sessões
- **Layout:** Corrigir overflow horizontal nos itens da lista de sessões.
- **Botão Salvar:** Renomear de "Salvar seções" para apenas "Salvar".
- **Restaurar:** Transformar em ação direta. Ao clicar em restaurar e confirmar no modal, o sistema deve salvar automaticamente a posição original e atualizar o preview sem necessidade de um segundo clique em "Salvar".

## ⚡ Módulo: Capa (Hero)
- **UX de Customização:** Adicionar informação/dica explicando que os ícones de device (Desktop/Tablet/Mobile) dentro da Capa servem para **posicionamento específico por dispositivo**, diferenciando-os dos controles de visualização do Preview.
- **Organização de Inputs:**
    - Agrupar botões de "Upload" e "Cortar".
    - Transformar propriedades de "Imagem de Fundo" (Zoom, Posição X/Y) em um menu Dropdown.
- **Gerenciamento de Camadas:**
    - Implementar Drag & Drop para reordenar camadas (mesmo padrão do módulo Sessões).
    - Permitir edição de propriedades ao clicar diretamente na camada.
    - Adicionar sinalizador visual de onde a camada será solta durante o arrasto.
- **Botão Salvar:** Renomear de "Salvar Capa" para "Salvar".
- **Restaurar:** 
    - Deve salvar automaticamente ao ser acionado.
    - Deve recarregar o preview dinamicamente para refletir o estado restaurado (atualmente mantém a imagem anterior no preview mesmo após o badge de sucesso).