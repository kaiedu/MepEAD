/* MEP EAD — service worker mínimo para instalação do portal. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
    if (event.request.method === "GET" && event.request.url.startsWith(self.location.origin)) {
        event.respondWith(fetch(event.request, { cache: "no-store" }));
    }
});
