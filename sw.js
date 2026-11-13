/* KELMTEIN Service Worker — يخزّن الملفات الثابتة العامة فقط.
   لا يلمس أي طلب لخدمة Apps Script ولا أي طلب غير GET، ولا يخزّن بيانات العملاء أو الطلبات أو الجلسات.
   الشبكة أولاً (حتى لا تُعرض نسخة قديمة كأنها حية)، والذاكرة المؤقتة للعمل دون اتصال فقط. */
const V = 'kl-static-v3';
const SHELL = ['./', 'index.html', 'admin.html', 'store.js', 'admin.js', 'cups-data.js', 'config.js', 'manifest.webmanifest', 'admin.webmanifest', 'assets/logo.jpg', 'assets/favicon.jpg', 'icons/icon-192.png', 'icons/icon-512.png'];
const OK = /\/(index\.html|admin\.html|store\.js|admin\.js|cups-data\.js|config\.js|[a-z]+\.webmanifest|assets\/[^/]+|icons\/[^/]+)$/;
const norm = u => { const x = new URL(u); x.search = ''; x.hash = ''; return x.href; };
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;           // لا نتدخل في Apps Script ولا أي نطاق خارجي
  const nav = r.mode === 'navigate', key = nav || OK.test(u.pathname) || u.pathname.endsWith('/');
  if (!key) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic' && (OK.test(u.pathname) || u.pathname.endsWith('/'))) { const c = await caches.open(V); c.put(norm(r.url), res.clone()); }
      return res;
    } catch (_) {
      const c = await caches.open(V);
      return (await c.match(norm(r.url))) || (nav ? (await c.match(u.pathname.endsWith('admin.html') ? 'admin.html' : 'index.html')) : undefined) || Response.error();
    }
  })());
});
