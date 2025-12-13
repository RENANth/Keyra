const CACHE_NAME = 'keyra-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/src/main.jsx', // Note: in dev, Vite handles this. In prod build, filenames change. 
    // For a simple dev-mode PWA, we cache basic roots. 
    // In production, we'd iterate over build assets.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
