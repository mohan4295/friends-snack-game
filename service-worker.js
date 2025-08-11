// Basic service worker that caches game shell and assets for offline use
const CACHE_NAME = 'friends-snack-cache-v1';
const ASSETS = [
  '.','/','index.html','style.css','app.js','manifest.json',
  'icons/icon-192.png','icons/icon-512.png',
  'assets/snack.png','assets/obstacle.png','assets/powerup.png','assets/boost.png','assets/bg_music.wav'
];

self.addEventListener('install', evt=>{
  evt.waitUntil(caches.open(CACHE_NAME).then(cache=> cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', evt=>{
  evt.waitUntil(clients.claim());
});

self.addEventListener('fetch', evt=>{
  evt.respondWith(caches.match(evt.request).then(r=> r || fetch(evt.request).then(resp=>{
    // update cache in background for future
    if(evt.request.method === 'GET' && resp && resp.status===200){
      caches.open(CACHE_NAME).then(cache=> cache.put(evt.request, resp.clone()));
    }
    return resp;
  })).catch(()=> caches.match('index.html')));
});
