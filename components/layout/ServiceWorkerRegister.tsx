"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Desregistrar cualquier SW anterior que esté interceptando peticiones
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((r) => r.unregister());
    });

    // Registrar el nuevo SW limpio solo en producción
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return null;
}
