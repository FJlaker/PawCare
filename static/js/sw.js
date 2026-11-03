const CACHE_NAME = 'pawcare-shell-v2';
const OFFLINE_URL = '/offline';
const APP_SHELL = [
    '/',
    '/directory',
    '/visits',
    '/reports',
    OFFLINE_URL,
    '/static/css/styles.css',
    '/static/css/bootstrap-5.3.8-dist/css/bootstrap.min.css',
    '/static/css/bootstrap-5.3.8-dist/js/bootstrap.min.js',
    '/static/js/api.js',
    '/static/js/cookies.js',
    '/static/js/common.js',
    '/static/js/validation.js',
    '/static/js/patient-form.js',
    '/static/js/visit-form.js',
    '/static/js/reports.js',
    '/static/video/pawcare-tutorial.mp4',
    '/static/video/pawcare-tutorial.webm',
    '/static/video/pawcare-tutorial.vtt'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
            ))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    const cached = await caches.match(request);
                    return cached || caches.match(OFFLINE_URL);
                }),
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response.ok && url.origin === self.location.origin) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return response;
            });
        }),
    );
});
