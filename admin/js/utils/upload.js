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
  }
}

/**
 * Fila de Upload Concorrente com Progresso Individual, Cancelamento, e Retry
 */
export class UploadQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 3;
    this.url = options.url || '/api/admin/upload'; // Fallback genérico, deve ser setado por quem chama
    this.authToken = options.authToken || localStorage.getItem('authToken');
    
    this.queue = [];      // Lista de todos os itens
    this.active = 0;      // Uploads em andamento
    
    // Status metrics
    this.totalBytes = 0;
    this.loadedBytes = 0;
    this.startTime = null;
    this.completedItems = []; // Para sliding window ETA

    // Callbacks
    this.onItemUpdate = options.onItemUpdate || (() => {});
    this.onQueueUpdate = options.onQueueUpdate || (() => {});
    this.onQueueDone = options.onQueueDone || (() => {});
  }

  /**
   * Adiciona arquivos à fila
   * @param {File[]} files 
   * @param {string} specificUrl opcional
   */
  add(files, specificUrl = null) {
    if (!this.startTime) this.startTime = Date.now();
    
    const newItems = Array.from(files).map(file => {
      const item = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        status: 'pending', // pending, uploading, done, error, cancelled
        progress: 0,
        xhr: null,
        errorMsg: null,
        url: specificUrl || this.url,
        retries: 0
      };
      this.totalBytes += file.size;
      return item;
    });

    this.queue.push(...newItems);
    this._processNext();
    this.onQueueUpdate(this.getStats());
  }

  cancel(id) {
    const item = this.queue.find(i => i.id === id);
    if (!item) return;

    if (item.status === 'uploading' && item.xhr) {
      item.xhr.abort();
      this.active--;
    }
    
    if (item.status !== 'done') {
      item.status = 'cancelled';
      item.progress = 0;
      this.onItemUpdate(item);
      this._processNext();
      this.onQueueUpdate(this.getStats());
    }
  }

  cancelAll() {
    this.queue.forEach(item => {
      if (item.status === 'uploading' && item.xhr) {
        item.xhr.abort();
      }
      if (item.status === 'pending' || item.status === 'uploading') {
        item.status = 'cancelled';
        this.onItemUpdate(item);
      }
    });
    this.active = 0;
    this.onQueueUpdate(this.getStats());
  }

  retry(id) {
    const item = this.queue.find(i => i.id === id);
    if (!item || item.status !== 'error') return;
    
    item.status = 'pending';
    item.progress = 0;
    item.errorMsg = null;
    item.retries++;
    this.onItemUpdate(item);
    this._processNext();
    this.onQueueUpdate(this.getStats());
  }

  getStats() {
    const total = this.queue.length;
    const done = this.queue.filter(i => i.status === 'done').length;
    const error = this.queue.filter(i => i.status === 'error').length;
    const pending = this.queue.filter(i => i.status === 'pending' || i.status === 'uploading').length;
    
    // ETA calculation
    let eta = null;
    if (this.completedItems.length > 0 && pending > 0) {
      const recent = this.completedItems.slice(-5); // Últimos 5 concluídos
      const avgTime = recent.reduce((sum, time) => sum + time, 0) / recent.length;
      eta = Math.ceil((avgTime * pending) / 1000); // Em segundos
    }

    return { total, done, error, pending, eta };
  }

  _processNext() {
    if (this.active >= this.concurrency) return;

    const item = this.queue.find(i => i.status === 'pending');
    if (!item) {
      if (this.active === 0) {
        // Fila concluída
        const results = this.queue.map(i => ({ 
          file: i.file.name, 
          status: i.status, 
          error: i.errorMsg 
        }));
        this.onQueueDone(results);
      }
      return;
    }

    this._uploadItem(item);
    this._processNext(); // Tenta processar outro se a concorrência permitir
  }

  async _uploadItem(item) {
    this.active++;
    item.status = 'uploading';
    this.onItemUpdate(item);

    const startTime = Date.now();
    let loadedSoFar = 0;

    try {
      // Usar a mesma compressão da função uploadImage
      const compressed = await compressImage(item.file, 1200, 0.85);
      const formData = new FormData();
      formData.append('photos', compressed, item.file.name); // sessoes usa 'photos' não 'image'
      
      await new Promise((resolve, reject) => {
        item.xhr = new XMLHttpRequest();
        
        item.xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            item.progress = Math.round((e.loaded / e.total) * 100);
            
            // Atualizar métricas globais
            const diff = e.loaded - loadedSoFar;
            this.loadedBytes += diff;
            loadedSoFar = e.loaded;
            
            this.onItemUpdate(item);
            this.onQueueUpdate(this.getStats());
          }
        });

        item.xhr.addEventListener('load', () => {
          if (item.xhr.status >= 200 && item.xhr.status < 300) {
            resolve();
          } else {
            let msg = 'Erro no upload';
            try { msg = JSON.parse(item.xhr.responseText).error || msg; } catch(e){}
            reject(new Error(msg));
          }
        });

        item.xhr.addEventListener('error', () => reject(new Error('Erro de rede')));
        item.xhr.addEventListener('abort', () => reject(new Error('Cancelado')));

        item.xhr.open('POST', item.url);
        item.xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
        item.xhr.send(formData);
      });

      // Sucesso
      item.status = 'done';
      item.progress = 100;
      this.completedItems.push(Date.now() - startTime);

    } catch (err) {
      if (item.status === 'cancelled') {
        // Já foi cancelado via botão
      } else {
        item.status = 'error';
        item.errorMsg = err.message;
      }
    } finally {
      item.xhr = null;
      this.active--;
      this.onItemUpdate(item);
      this.onQueueUpdate(this.getStats());
      this._processNext();
    }
  }
}
