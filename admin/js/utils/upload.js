/**
 * Utilitários de upload e compressão de imagens
 */

/**
 * Comprime imagem antes de enviar
 * @param {File} file - Arquivo de imagem
 * @param {number} maxWidth - Largura máxima em pixels
 * @param {number} quality - Qualidade de compressão (0-1)
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de imagem para o servidor
 * @param {File} file - Arquivo para upload
 * @param {string} authToken - Token JWT
 * @param {Function} onProgress - Callback de progresso (0-100)
 * @returns {Promise<{url: string, filename: string}>}
 */
export async function uploadImage(file, authToken, onProgress = null) {
  // Comprime a imagem antes de enviar
  const compressed = await compressImage(file, 1200, 0.85);
  
  const formData = new FormData();
  formData.append('image', compressed, file.name);
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Rastreia progresso do upload
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success || response.ok) {
            resolve({
              url: response.url,
              filename: response.filename
            });
          } else {
            reject(new Error(response.error || 'Upload falhou'));
          }
        } catch (e) {
          reject(new Error('Resposta inválida do servidor'));
        }
      } else {
        reject(new Error(`Erro ${xhr.status}: ${xhr.statusText}`));
      }
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Erro de conexão'));
    });
    
    xhr.open('POST', '/api/admin/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}

/**
 * Faz upload de video para o servidor (sem compressao)
 * @param {File} file - Arquivo de video
 * @param {string} authToken - Token JWT
 * @param {Function} onProgress - Callback de progresso (0-100)
 * @returns {Promise<{url: string, filename: string}>}
 */
export async function uploadVideo(file, authToken, onProgress = null) {
  const formData = new FormData();
  formData.append('video', file, file.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.ok || response.success) {
            resolve({ url: response.url, filename: response.filename });
          } else {
            reject(new Error(response.error || 'Upload falhou'));
          }
        } catch (e) {
          reject(new Error('Resposta invalida do servidor'));
        }
      } else {
        reject(new Error(`Erro ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Erro de conexao'));
    });

    xhr.open('POST', '/api/admin/upload-video');
    xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
    xhr.send(formData);
  });
}

/**
 * Mostra barra de progresso visual
 * @param {string} containerId - ID do container
 * @param {number} percent - Porcentagem (0-100)
 */
export function showUploadProgress(containerId, percent) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (percent === 0) {
    container.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem;">
        <div style="flex:1; height:0.5rem; background:#374151; border-radius:9999px; overflow:hidden;">
          <div id="progress-bar" style="height:100%; background:#3b82f6; transition:width 0.3s; width:0%"></div>
        </div>
        <span id="progress-text" style="font-size:0.875rem; color:#9ca3af;">0%</span>
      </div>
    `;
  } else if (percent === 100) {
    const bar = container.querySelector('#progress-bar');
    const text = container.querySelector('#progress-text');
    if (bar) bar.style.width = '100%';
    if (text) text.textContent = '100%';
    setTimeout(() => {
      container.innerHTML = '';
    }, 1500);
  } else {
    const bar = container.querySelector('#progress-bar');
    const text = container.querySelector('#progress-text');
    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `${percent}%`;
  }
}
