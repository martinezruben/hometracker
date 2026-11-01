// Service worker de HomeTracker (Fase 0): caché del app shell + base para push.
const VERSION = "v4";
const FILES_CACHE = `files-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;

function offlinePage() {
  return new Response(
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><body style="font-family:system-ui;padding:2rem"><h1>Sin conexión</h1><p>Abre la app con internet al menos una vez. Tus cambios pendientes se enviarán al reconectar.</p></body></html>',
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE, FILES_CACHE].includes(k)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Fotos: su id es inmutable, se guardan en el dispositivo para verlas sin conexión.
  if (url.pathname.startsWith("/api/files/")) {
    event.respondWith(
      caches.open(FILES_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Assets inmutables: cache-first (abre rápido).
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navegaciones: red primero; sin conexión, o si la red tarda más de 3 s y hay copia, se muestra la copia
  // (la red sigue y deja la página nueva en caché; la app se actualiza sola al abrirse).
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        try {
          if (!cached) return await network;
          const slow = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
          return (await Promise.race([network, slow])) ?? cached;
        } catch {
          return cached ?? (await cache.match("/")) ?? offlinePage();
        }
      })(),
    );
  }
});

// Push (iOS exige mostrar siempre una notificación).
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "HomeTracker", {
      body: data.body ?? "",
      icon: "/icon-192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
