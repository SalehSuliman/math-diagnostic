/* ============================================================
   Service Worker — جدول التشخيص الرياضيات
   ============================================================ */

const CACHE_NAME = 'math-diagnostic-v1';

// الملفات الأساسية للتطبيق (نسبية، لأن التطبيق قد يكون في مجلد فرعي)
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ============ التثبيت: تخزين الملفات الأساسية ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('خطأ في تخزين الملفات الأساسية:', err))
  );
});

// ============ التنشيط: حذف الإصدارات القديمة ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ============ الجلب: من الذاكرة أولاً، ثم الشبكة ============
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // تجاهل الطلبات غير GET (مثل POST)
  if (req.method !== 'GET') return;

  // تجاهل الطلبات من مصادر خارجية (مثل googleapis, cdnjs) — نتركها للشبكة
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(response => {
        // تخزين نسخة من الاستجابة إذا كانت صالحة
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => {
        // عند انقطاع الشبكة، أرجع الصفحة الرئيسية لأي طلب تنقل
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});