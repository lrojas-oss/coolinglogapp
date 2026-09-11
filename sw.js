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
  var url = e.request.url;
  // Don't intercept Firebase SDK/CDN requests: let the browser handle them
  // directly. Routing cross-origin dynamic import()s through respondWith()
  // here caused "Failed to fetch dynamically imported module" on mobile
  // even with a working connection, since nothing populates the cache
  // fallback and SW-mediated module fetches are flaky on some browsers.
  if (url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic')) {
    return;
  }
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
