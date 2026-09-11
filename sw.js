const CACHE = 'vcl-v4';
const SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only handle same-origin requests. Routing cross-origin requests (CDN
  // scripts, Firebase/Google auth endpoints) through cache.match/put here
  // produces opaque (no-cors) responses that some of those services choke
  // on — this is what caused auth/internal-error (apis.google.com/js/api.js
  // returned garbled/503-like responses only when proxied through this SW).
  // Let the browser handle every cross-origin request directly.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  // Cache-first for app shell, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var networkFetch = fetch(e.request).then(function(res){
        var clone = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return res;
      });
      return cached || networkFetch;
    })
  );
});
