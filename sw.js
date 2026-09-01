/* MedVault service worker — offline shell + safe updates.
   Bump CACHE when you change any precached file.                    */
const CACHE = 'medvault-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vendor/pdf.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // addAll fails the whole install if one file 404s, so add individually
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(SHELL.map(u => c.add(u).catch(() => null)))
  ));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // never touch Microsoft Graph or the sign-in endpoints
  if (url.origin !== self.location.origin) return;

  // navigations: network first so a new version is picked up, cache as fallback
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(CACHE);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // everything else: cache first, refresh in the background
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) {
      fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r)); }).catch(() => {});
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r.ok && url.origin === self.location.origin) {
        const c = await caches.open(CACHE); c.put(req, r.clone());
      }
      return r;
    } catch (_) { return Response.error(); }
  })());
});
