// Firebase Messaging Service Worker — Pulso
// Requerido por Firebase Cloud Messaging para recibir notificaciones en segundo plano.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAdmD-zenjAW4-lExU-t63MhwsWm9YZGy0",
  authDomain: "pulso-59ce2.firebaseapp.com",
  projectId: "pulso-59ce2",
  storageBucket: "pulso-59ce2.firebasestorage.app",
  messagingSenderId: "353250810813",
  appId: "1:353250810813:web:d10ac705fc7bae84a910d4",
});

const messaging = firebase.messaging();

// Maneja mensajes en segundo plano (app cerrada / en background)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Pulso";
  const body = payload.notification?.body || "Mantén tu racha.";

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "pulso-reminder",
    data: payload.data || {},
    actions: [
      { action: "open", title: "Ver mi racha" },
    ],
  });
});

// Abre la app al tocar la notificación
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});
