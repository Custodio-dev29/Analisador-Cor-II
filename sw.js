const CACHE_NAME = 'color-analyzer-v2'; // Incremente a versão para forçar a atualização
const urlsToCache = [
    'index.html',
    'login.html',
    'history.html',
    'styles.css',
    'app.js',
    'history.js',
    'login.js',
    'shared.js',
    'manifest.json',
    'icons/icon-192x192.png',
    'icons/icon-512x512.png',
    'https://unpkg.com/xlsx/dist/xlsx.full.min.js'
];

// Instala o Service Worker e armazena os arquivos do app shell em cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Intercepta requisições e serve do cache enquanto atualiza em segundo plano (Stale-While-Revalidate)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                // Retorna do cache imediatamente, se disponível
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // Se a busca na rede for bem-sucedida, atualiza o cache
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(err => {
                    // A busca na rede falhou (offline), mas não é um problema se já tínhamos uma resposta do cache
                    console.warn(`Fetch failed for: ${event.request.url}`, err);
                });

                // Retorna a resposta do cache (se houver) ou espera a resposta da rede
                return response || fetchPromise;
            });
        })
    );
});

// Limpa caches antigos quando uma nova versão do Service Worker é ativada
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});