/* Service Worker - المحلي أولاً (Cache First) مع تحديث صامت في الخلفية عند توفر اتصال.
   لإصدار تحديث جديد: غيّر رقم VERSION أدناه (أو عدّل أي بايت في هذا الملف). */
const VERSION = 'v2';
const CACHE = 'student-tracker-' + VERSION;

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    // موارد خارجية (قد تفشل دون إنترنت، لا نوقف التثبيت بسببها)
    await Promise.all(CDN.map(async (url) => {
      try { await cache.put(url, await fetch(new Request(url, { mode: 'no-cors' }))); } catch (e) {}
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('student-tracker-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isNav = req.mode === 'navigate';
    const cached = await cache.match(req, { ignoreSearch: true }) ||
                   (isNav ? await cache.match('./index.html') : null);

    // تحديث صامت في الخلفية (إن وُجد اتصال) دون تعطيل العرض
    const refresh = fetch(req).then(async (res) => {
      if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) {
      event.waitUntil(refresh);
      return cached;               // المحلي أولاً
    }
    const net = await refresh;     // غير موجود محلياً: جرّب الشبكة
    return net || (isNav ? cache.match('./index.html') : Response.error());
  })());
});
