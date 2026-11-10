/* Service Worker – cache-first (offline-first) */
const VERSION = '5d547e8309';
const CACHE = 'math3-' + VERSION;
const PRECACHE = [
 "./",
 "./assets/fonts/tajawal-arabic-400-normal.woff2",
 "./assets/fonts/tajawal-arabic-500-normal.woff2",
 "./assets/fonts/tajawal-arabic-700-normal.woff2",
 "./assets/fonts/tajawal-latin-400-normal.woff2",
 "./assets/fonts/tajawal-latin-700-normal.woff2",
 "./assets/icons/icon-180.png",
 "./assets/icons/icon-192.png",
 "./assets/icons/icon-32.png",
 "./assets/icons/icon-512.png",
 "./assets/icons/maskable-192.png",
 "./assets/icons/maskable-512.png",
 "./exam-all.html",
 "./exam-u1-u2.html",
 "./exam-u3-u4.html",
 "./index.html",
 "./manifest.webmanifest",
 "./review-all.html",
 "./review-u1-u2.html",
 "./review-u3-u4.html",
 "./unit1.html",
 "./unit2.html",
 "./unit3.html",
 "./unit4.html",
 "./unit5.html"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.map(u => new Request(u, {cache: 'reload'})))));
});

self.addEventListener('message', event => { if (event.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('math3-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // 1) cache first (ignore ?query so links like page.html?x still hit the cache)
    const hit = await cache.match(req, {ignoreSearch: true});
    if (hit) return hit;
    // 2) network, then store a copy for next time
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      // 3) offline fallback for page navigations
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
