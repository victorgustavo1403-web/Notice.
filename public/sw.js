/* Service worker do Notice.
 * - Guarda a "casca" do app (HTML + arquivos com hash do Vite) para abrir rápido e funcionar sem rede.
 * - NUNCA mexe na API nem nas imagens enviadas (/uploads): são de outra origem (porta 3001) e
 *   precisam estar sempre atualizadas. Só requisições GET da mesma origem passam por aqui.
 * Para forçar atualização de todos os aparelhos, troque o número da VERSAO. */
const VERSAO = "notice-v1";
const CASCA = `${VERSAO}-casca`;
const ARQUIVOS = `${VERSAO}-arquivos`;
const PRE_CACHE = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icone-192.png", "/icons/icone-512.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CASCA).then((cache) => cache.addAll(PRE_CACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // API e uploads: direto na rede

  // Navegação (abrir/recarregar uma página): rede primeiro; sem rede, usa o app guardado
  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CASCA).then((c) => c.put("/", copia));
          return resp;
        })
        .catch(async () => (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  // Arquivos com hash (/assets/...): nunca mudam de conteúdo, então cache primeiro
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    evento.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(ARQUIVOS).then((c) => c.put(req, copia));
            }
            return resp;
          }),
      ),
    );
  }
});
