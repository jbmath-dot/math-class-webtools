const CACHE="math-class-webtools-20260925-jbmath-v1";
const CORE=["./","./index.html","./offline.html","./manifest.webmanifest","./assets/site.css","./assets/app.js","./assets/thumbnail-candidates.js","./assets/tool-thumbnails.js","./assets/app-icon.svg","./classroom/","./classroom/index.html","./classroom/style.css","./classroom/app.js","./classroom/vendor/qrcode.min.js","./classroom-response/","./classroom-response/index.html","./classroom-response/style.css","./classroom-response/model.js","./classroom-response/app.js","./curriculum-labs/","./curriculum-labs/index.html","./curriculum-labs/style.css","./curriculum-labs/model.js","./curriculum-labs/app.js","./math-project/fermi-estimation/","./math-project/fermi-estimation/index.html"];
// Match the versioned catalog requests so the first installed shell works offline.
const CATALOG_ASSETS=["./assets/site.css?v=20260903-6","./assets/thumbnail-candidates.js?v=20260903-6","./assets/tool-thumbnails.js?v=20260903-6","./assets/app.js?v=20260925-jbmath-1","./assets/click-stats-config.js?v=20260925-jbmath-1"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([...CORE,...CATALOG_ASSETS])).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("math-class-webtools-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==location.origin)return;
  if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(async()=>await caches.match(request)||await caches.match("./offline.html")));return}
  if(/\.(?:exe|zip)$/i.test(url.pathname))return;
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response})));
});
