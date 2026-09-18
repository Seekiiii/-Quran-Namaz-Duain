const SHELL_CACHE = 'deen-aasan-shell-v14';
const DATA_CACHE = 'deen-aasan-data-v14';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: pre-cache the app shell so the app opens instantly, even offline
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - App shell files: cache-first (fast, always available offline)
// - Quran text / translation / prayer-time API calls: network-first,
//   falling back to cache so a surah/duas you've already opened once
//   still works next time you're offline. Audio streams are left
//   untouched (not cached — too large for typical offline storage).
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isAudio = url.includes('cdn.islamic.network');

  if (isAudio || event.request.method !== 'GET') {
    return; // let these pass straight through to the network
  }

  const isDataRequest =
    url.includes('api.alquran.cloud') ||
    url.includes('cdn.jsdelivr.net') ||
    url.includes('api.aladhan.com');

  if (isDataRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell / same-origin files
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
