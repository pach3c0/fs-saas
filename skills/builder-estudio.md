# Módulo: Estúdio & Mídia

Gerencia as informações institucionais, vídeos e fotos do estúdio.

---

## 1. Informações Básicas
- **Campos:** `#studioTitle`, `#studioDesc`, `#studioAddress`, `#studioWhatsapp`, `#studioHours`.
- **Botão de Salvamento:** `#saveStudioBtn`.

---

## 2. Mensagens do WhatsApp (Chat Bubble)
Permite configurar uma sequência de mensagens automáticas que aparecem na bolha de chat do site.
- **Lista:** `#whatsappList`
- **Componentes:**
    - `data-whatsapp-text`: O conteúdo da mensagem.
    - `data-whatsapp-delay`: Tempo de espera (em segundos) antes de exibir a próxima mensagem.
- **Ação:** `#addWhatsappMsgBtn`.

---

## 3. Gerenciamento de Vídeo
- **Input:** `#studioVideoInput` (Aceita `.mp4`, `.mov`, `.webm`).
- **Limites:** Máximo de 300MB.
- **Ações:** 
    - `#removeVideoBtn`: Exclui o vídeo atual do servidor.
    - Progresso visual no container `#studioVideoProgress`.

---

## 4. Galeria do Estúdio
- **Upload Múltiplo:** `#studioUploadInput`.
- **Editor Integrado:** `#studioEditorModal`.
- **Grid:** `#studioPhotosGrid`.
- **Fluxo:** Upload -> Compressor Canvas -> Envio XHR -> Adição ao Snapshot.
