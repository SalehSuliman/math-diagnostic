/* =====================================================================
   Service Worker — المهام الأدائية
   الاستراتيجية:
   - ملفات التطبيق (HTML/JSON/PNG) تُخزَّن كاملة عند أول تشغيل.
   - صفحة HTML: الشبكة أولًا ثم الكاش (لتصل التحديثات)، وعند انقطاع
     الإنترنت تُعرض النسخة المخزّنة فورًا.
   - بقية الملفات: الكاش أولًا (أسرع، ويعمل بدون إنترنت).
   ملاحظة: عند تعديل أي ملف ارفع رقم CACHE لتُحدَّث النسخة عند المستخدمين.
   ===================================================================== */
const CACHE = 'perf-tasks-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/favicon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

/* التثبيت: تخزين ملفات التطبيق */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll تفشل كلها إذا فشل ملف واحد، لذلك نخزّن كل ملف على حدة
    await Promise.all(ASSETS.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('تعذّر تخزين', url, e); }
    }));
    self.skipWaiting();
  })());
});

/* التفعيل: حذف النسخ القديمة من الكاش */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

/* الجلب */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // لا نتدخل في الطلبات الخارجية

  // صفحات التنقل: الشبكة أولًا ثم الكاش
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) { putInCache(req, preload.clone()); return preload; }
        const fresh = await fetch(req);
        putInCache(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) ||
               (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('التطبيق غير متاح حاليًا', {
                 status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
               });
      }
    })());
    return;
  }

  // بقية الملفات: الكاش أولًا مع تحديث صامت في الخلفية
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) {
      fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return hit;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      return new Response('', { status: 504 });
    }
  })());
});

async function putInCache(req, res) {
  if (!res || !res.ok) return;
  const cache = await caches.open(CACHE);
  try { await cache.put(req, res); } catch (e) {}
}

/* تحديث فوري عند الطلب من الصفحة */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
