const C = 'snes-offline-v3';
const SHELL = ['./', './index.html'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || r.headers.has('range')) return;
  const cdn = u.hostname === 'cdn.emulatorjs.net';
  if (u.origin !== location.origin && !cdn) return;
  e.respondWith((async () => {
    const c = await caches.open(C);
    const hit = await c.match(r.url);
    if (hit) return hit;
    try {
      // sempre busca em modo CORS para a resposta guardada servir tanto a <script> quanto a fetch()
      // tenta CORS (permite guardar para o modo offline); se falhar, deixa a requisição passar normalmente
      let res = cdn ? await fetch(r.url, {mode: 'cors'}).catch(() => null) : null;
      if (!res) res = await fetch(r);
      if (res.ok && res.type !== 'opaque') c.put(r.url, res.clone());
      return res;
    } catch (err) {
      if (r.mode === 'navigate') return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      throw err;
    }
  })());
});
