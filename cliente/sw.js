const CACHE_NAME = 'galeria-v1';

const STATIC_ASSETS = [
  '/cliente/',
  '/cliente/js/gallery.js',
];

// Install: pré-cachear recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silencioso se algum asset falhar
      });
    })
  );
  self.skipWaiting();
});

// Activate: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estratégia por tipo de recurso
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: nunca cachear, deixar passar direto
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Fotos (/uploads/): Cache First — cacheadas após primeiro carregamento
  if (url.pathname.startsWith('/uploads/')) {
    // Só cachear thumbs (não originais grandes)
    if (url.pathname.includes('/sessions/thumb-') || !url.pathname.includes('/sessions/')) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async cache => {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          try {
            const response = await fetch(event.request);
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          } catch (e) {
            return new Response('', { status: 503 });
          }
        })
      );
    }
    return;
  }

  // HTML, JS, CSS, Fontes: Cache First com fallback Network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Offline e sem cache: retornar página offline genérica se for navegação
        if (event.request.mode === 'navigate') {
          return caches.match('/cliente/');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// --- Background Sync e IndexedDB ---

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fs-sync-queue', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'gallery-sync') {
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return;

  let successCount = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      if (response.ok) {
        await clearItem(item.id);
        successCount++;
      }
    } catch (e) {
      console.error('Falha ao sincronizar item', item);
      // Mantém na fila se falhar por rede (não deleta do IndexedDB)
    }
  }

  if (successCount > 0) {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_DONE', count: successCount });
    }
  }
}
