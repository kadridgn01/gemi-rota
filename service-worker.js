const CACHE_NAME = 'rota-cache-v1';
const FILES_TO_CACHE = [
  'index.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
  // NOT: CDN dosyalarını buraya koymadık (CORS/cache sorunları olmasın diye)
];

self.addEventListener('install', evt=>{
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt=>{
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : Promise.resolve())
    ))
  );
  self.clients.claim();
});

// Basit strateji: önce ağ (taze), ağ yoksa cache
self.addEventListener('fetch', evt=>{
  const req = evt.request;
  // CDN/third-party ise network-only
  const url = new URL(req.url);
  if(url.origin !== location.origin){
    evt.respondWith(fetch(req).catch(()=>caches.match(req)));
    return;
  }

  // same-origin: network-first
  evt.respondWith(
    fetch(req).then(res=>{
      // update cache (isteğe bağlı)
      const resClone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, resClone)).catch(()=>{});
      return res;
    }).catch(()=>{
      return caches.match(req).then(cached => cached || caches.match('index.html'));
    })
  );
});
