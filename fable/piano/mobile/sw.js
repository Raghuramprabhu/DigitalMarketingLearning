/* =====================================================================
   Piano Studio (phone) service worker: lets the Home Screen app open
   with no internet.
   - Our own files: network first (so every update reaches you as soon
     as you're online), falling back to the saved copy when offline.
   - Fonts from Google: the saved copy first, refreshed in the background.
   Bump VERSION to clear old saved copies.
   ===================================================================== */
var VERSION = 'fable-piano-mobile-v1';
var CORE = [
  './', './index.html', './mobile.css', './mobile.js', './manifest.webmanifest',
  '../engine.js', '../piano.js', '../piano.css', '../../core/fable.css', '../../core/fable.js',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('fable-piano-mobile-') === 0 && k !== VERSION; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function save(req, res) {
  if (res && (res.ok || res.type === 'opaque')) {
    var copy = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || !/^https?:$/.test(url.protocol) || req.headers.has('range')) return;

  if (url.origin === self.location.origin) {
    // network first; give up on a slow network after 4 s and use the saved copy
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () {
        caches.match(req, { ignoreSearch: true }).then(function (hit) { if (hit && !done) { done = true; resolve(hit); } });
      }, 4000);
      fetch(req).then(function (res) {
        clearTimeout(timer); save(req, res);
        if (!done) { done = true; resolve(res); }
      }).catch(function () {
        clearTimeout(timer);
        caches.match(req, { ignoreSearch: true }).then(function (hit) {
          if (done) return; done = true;
          resolve(hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
        });
      });
    }));
    return;
  }

  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      var fresh = fetch(req).then(function (res) { return save(req, res); }).catch(function () { return hit; });
      return hit || fresh;
    }));
  }
});
