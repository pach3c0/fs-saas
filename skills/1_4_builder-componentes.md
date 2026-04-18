# Componentes do Site Builder (Biblioteca Oficial)

> **Uso:** Esta skill deve ser lida antes de criar ou refatorar qualquer módulo do Site Builder (Capa, Sobre, Portfolio, Álbuns, Estúdio, FAQ). Ela define os padrões oficiais de UI, Auto-save e Upload.

---

## 1. Padrão de Auto-Save (Inputs e Sliders)

**Regra Absoluta:** NÃO use debounce para salvar ou atualizar o preview. As atualizações devem ser imediatas via `oninput` (para texto/range) ou `onchange` (para checkboxes). O salvamento é feito diretamente após a alteração do state local.

### Estrutura de Dados Esperada
Mantenha um objeto local `_dadosDoModulo` que reflete exatamente o formato salvo no banco (`siteContent` ou `siteConfig`).

### Input de Texto Padrão
```html
<input 
  type="text" 
  value="${esc(valorAtual)}" 
  oninput="_dadosDoModulo.campo = this.value; saveDados();"
  class="builder-input"
/>
```

### Textarea
```html
<textarea 
  oninput="_dadosDoModulo.campo = this.value; saveDados();"
  class="builder-textarea"
>${esc(valorAtual)}</textarea>
```

### Checkbox / Toggle
```html
<input 
  type="checkbox" 
  onchange="_dadosDoModulo.ativo = this.checked; saveDados();"
  ${valorAtual ? 'checked' : ''}
/>
```

### Slider de Range (Transformações e Ajustes)
Deve atualizar o preview imediatamente (antes de salvar) caso haja uma visualização local no módulo (ex: editor de fotos), OU simplesmente salvar e deixar o `window._meuSitePostPreview?.()` atualizar o iframe principal.
```html
<input 
  type="range" min="-180" max="180" value="${valorAtual}"
  oninput="_dadosDoModulo.transform.rotateX = parseInt(this.value); updatePreviewLocal(); saveDados();"
/>
```

---

## 2. Padrão de Fluxo de Salvamento

O `saveDados` deve sempre:
1. Usar a API correta (ex: `PUT /api/site/admin/config` para dados do `siteContent`).
2. Sincronizar com o iframe do builder chamando `window._meuSitePostPreview?.()`.
3. Disparar notificação apenas se não for um save silencioso (ou evitar toasts para digitação rápida). No caso de inputs com `oninput`, o ideal é um salvamento "silencioso", sem exibir o Toast a cada letra, ou exibir um toast temporário pequeno.

```javascript
async function saveDados() {
  try {
    const response = await apiPut('/api/site/admin/config', { 
      siteContent: { nomeDoModulo: _dadosDoModulo } 
    });
    
    // Atualizar iframe do site
    window._meuSitePostPreview?.();
    
    // Feedback visual leve (opcional para oninput contínuo)
    window.showToast?.('Salvo automaticamente', 'success'); 
  } catch (error) {
    console.error('Erro ao salvar:', error);
    window.showToast?.('Erro ao salvar', 'error');
  }
}
```

---

## 3. Padrão de Upload de Imagens

**Nunca** confie no upload sem validar ou comprimir a imagem no frontend. Siga exatamente a função e fluxo abaixo.

### Função Base de Upload (Localizada geralmente em `utils/upload.js`)
```javascript
// Exemplo do fluxo correto
async function uploadImage(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Apenas JPG, PNG ou WEBP' };
  }

  // Compressão (exemplo usando canvas)
  const compressedFile = await compressImage(file);
  const formData = new FormData();
  formData.append('image', compressedFile);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      const percent = (e.loaded / e.total) * 100;
      showUploadProgress(percent, 'Enviando...');
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        // O SERVIDOR DEVE RETORNAR: { ok: true, success: true, filename, url }
        if (data.url) {
          resolve({ ok: true, data });
        } else {
          reject({ ok: false, error: 'Resposta inválida do servidor' });
        }
      } else {
        const data = JSON.parse(xhr.responseText);
        reject({ ok: false, error: data.error || 'Falha no upload' });
      }
    });

    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}
```

### Handler do Evento (Try-Catch)
```javascript
async function handleModuleUpload(e) {
  const files = Array.from(e.target.files);
  const errors = [];

  try {
    for (const file of files) {
      try {
        const result = await uploadImage(file);
        if (result.ok) {
          _dadosDoModulo.photos.push({
            id: Date.now() + Math.random(),
            url: result.data.url,
            position: _dadosDoModulo.photos.length
          });
        }
      } catch (err) {
        errors.push(`${file.name}: ${err.error}`);
      }
    }

    if (errors.length > 0) {
      window.showConfirm?.(`Erros no upload:\n${errors.join('\n')}`, { title: 'Aviso', confirmText: 'OK' });
    }

    // Salvar após todos os uploads e re-renderizar
    await saveDados();
    renderModuleUI();
  } catch (error) {
    console.error('Erro crítico no upload:', error);
  }
}
```

---

## 4. Padrões Visuais (HTML/CSS Variables)

Sempre use as variáveis de CSS definidas em `admin/index.html` para os componentes do Builder.
**Não use Tailwind nas tabs do Admin do fotógrafo.**

* Fundo: `var(--bg-base)` ou `var(--bg-surface)`
* Textos: `var(--text-primary)` ou `var(--text-secondary)`
* Bordas: `var(--border)`
* Destaques: `var(--accent)` e `var(--accent-hover)`

---

## 6. Padrão de Editor Visual de Camadas (Canvas/Layers CSS)

O módulo **Sobre** (e potencialmente outros) utiliza um sistema de edição de imagens baseada em camadas manipuladas via CSS Transform diretamente no preview (sem usar `<canvas>` real do HTML).

### Estrutura de Propriedades de Camada Padrão
Toda camada (imagem) gerenciada deve seguir este formato no array de dados:

```javascript
{
  id: "id_unico_timestamp",
  type: "image",
  url: "https://...",
  name: "Nome da Foto",
  x: 50, y: 50,          // posição central em % (0 a 100)
  width: 70, height: 70, // tamanho em % em relação ao container (5 a 150)
  rotation: 0,           // rotação em graus (-180 a 180)
  opacity: 100,          // % (0 a 100)
  borderRadius: 0,       // px (0 a 200)
  shadow: false,         // boolean
  shadowBlur: 10,        // intensidade
  shadowColor: "rgba(0,0,0,0.5)",
  flipH: false,          // espelhamento horizontal
  flipV: false           // espelhamento vertical
}
```

### Regras de Ouro para o Editor de Camadas
1. **Highlight Visual:** Clicar em uma camada na lista (Sidebar) deve destacar o item no preview com uma borda azul ou piscar, usando o padrão `cz_highlight_layer`.
2. **SortableJS:** A lista de camadas no painel deve permitir Drag & Drop para alterar o z-index (a ordem no array dita a ordem no eixo Z).
3. **Renderização no Site (`shared-site.js`):** A renderização ocorre posicionando as divs com `position: absolute`, e o ajuste fino (x/y) usa `transform: translate(-50%, -50%)` para centralizar a imagem no ponto âncora antes de aplicar as outras transformações (rotate, scale, flip).
4. **Limite de Arquivos:** Módulos que compõem imagens (como Sobre) geralmente têm um limite hardcoded (ex: 4 fotos) para evitar degradação de performance e sobreposição excessiva.

*(Para visualização interativa destes componentes, abra a aba "Componentes (Site)" no painel saas-admin).*
