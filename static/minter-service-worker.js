// service-worker.js

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('v1').then(cache => {
            return cache.addAll([
                '/',
                '/templates/minter_index.html',
                '/static/index.js',
                '/static/minter_styles.css',
                // Add other static files as needed
            ]).catch(error => {
                console.error('Failed to cache:', error);
            });
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

