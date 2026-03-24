"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Si ya estaba registrado en /sw.js, no hacer nada más
          console.log("[SW] Registrado:", registration.scope);
        })
        .catch(console.error);
    } else {
      // En desarrollo: desregistrar cualquier SW antiguo para no bloquear fetches
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
    }
  }, []);

  return null;
}
