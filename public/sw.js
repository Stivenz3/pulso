// Service Worker — Pulso
// Solo activo en producción. En desarrollo el SW anterior se desregistra automáticamente.

const CACHE_NAME = "pulso-v3";

// Lista exhaustiva de dominios que NUNCA se interceptan
const BYPASS_HOSTS = [
  "firestore.googleapis.com",
  "firebase.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "googleapis.com",
  "firebaseapp.com",
  "gstatic.com",
  "groq.com",
  "openai.com",
];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Dejar pasar SIN interceptar todo lo que no sea de nuestra propia app
  if (BYPASS_HOSTS.some((host) => url.hostname.includes(host))) return;
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  // Solo cachear assets estáticos (_next/static, imágenes, fonts)
  const isAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf|css|js)$/);

  if (!isAsset) return;

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
    )
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Pulso", {
      body: data.body || "Mantén tu racha.",
      icon: "/pulso.png",
      tag: "pulso-reminder",
    })
  );
});
