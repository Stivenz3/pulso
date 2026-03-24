# Pulso

**Pulso** es una Progressive Web App (PWA) pensada para móvil: seguimiento de **hábitos**, **sobriedad** o rutinas personalizadas, con interfaz oscura y minimalista, navegación inferior tipo app nativa y datos en la nube.

## Qué hace la app

- **Varios hábitos** con selector en la barra superior; cada pantalla respeta el hábito activo (racha, triggers, ánimo, progreso, IA).
- **Racha en tiempo real** y lógica de día calendario (medianoche).
- **Modo de riesgo**, registro de **triggers** (con notas y etiquetas), **estados de ánimo** (intervalo entre registros) y **recaídas** con comentarios.
- **Gráficos y métricas** (Recharts) filtradas por el hábito seleccionado.
- **Logros** en página dedicada con scroll horizontal, adaptados al tipo de hábito (dejar vs. construir).
- **IA (Groq, lado servidor)** para insights y sugerencias contextualizadas; respuestas cacheadas en el cliente cuando no cambian las métricas relevantes.
- **Notificaciones push (FCM)**: recordatorios programados por hábito (hora personalizada), más eventos puntuales; programación vía llamadas periódicas al API (por ejemplo GitHub Actions) y envío con Firebase Admin en el servidor.
- **Onboarding** mostrado una vez por cuenta (Firestore).
- **Autenticación** correo/contraseña (Firebase Auth) y persistencia en **Firestore** (usuarios y subcolecciones por UID).

## Stack técnico

| Área        | Tecnología |
|------------|------------|
| Framework  | Next.js (App Router), React, TypeScript |
| Estilos    | Tailwind CSS |
| Animación  | Framer Motion |
| Gráficos   | Recharts |
| Estado UI  | Zustand |
| Backend BaaS | Firebase (Auth, Firestore, Cloud Messaging) |
| Push servidor | Firebase Admin SDK (rutas API Next.js) |
| IA         | Groq API (clave solo en servidor) |

## Requisitos

- Node.js 20+ recomendado
- Cuenta de Firebase (proyecto con Auth email/contraseña, Firestore, FCM web)
- (Opcional) Cuenta Groq y clave de API
- (Producción) Variables de entorno para Admin SDK y cron (ver abajo)

## Instalación y desarrollo

```bash
npm install
cp .env.example .env.local
# Completa .env.local con tus claves (ver sección Variables de entorno)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # comprobar build de producción
npm run lint    # ESLint
```

## Variables de entorno

Copia [.env.example](.env.example) a `.env.local` y rellena:

- **Cliente Firebase** (`NEXT_PUBLIC_FIREBASE_*`): configuración del proyecto en la consola de Firebase.
- **`NEXT_PUBLIC_FIREBASE_VAPID_KEY`**: Cloud Messaging → certificados web push.
- **`GROQ_API_KEY`**: solo servidor; nunca exponer al cliente.
- **Firebase Admin** (`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`): envío de push desde las rutas API.
- **`CRON_SECRET`**: string compartido para proteger `GET /api/notify` (u otros endpoints que diseñes con el mismo patrón).

El fichero `.env.local` no debe subirse al repositorio.

## Firebase y Firestore

- Reglas e índices: `firestore.rules`, `firestore.indexes.json`; despliegue con [Firebase CLI](https://firebase.google.com/docs/cli):

  ```bash
  firebase deploy --only firestore
  ```

- Estructura orientada a un documento `users/{uid}` con subcolecciones (`habits`, `triggers`, `moodLogs`, etc.). Los detalles exactos están en el código (`lib/firestore.ts` y tipos en `types/index.ts`).

## PWA

- Manifiesto e iconos en `public/` (por ejemplo `public/manifest.json`, `public/icons/`).
- Service worker principal (`public/sw.js`) y worker dedicado a FCM (`public/firebase-messaging-sw.js`).

## Despliegue (ej. Vercel)

1. Conecta el repo y define las mismas variables que en `.env.local` (incluidas las de Admin y `CRON_SECRET`).
2. En planes donde Vercel Cron es limitado, puedes usar **GitHub Actions** para invocar periódicamente tu URL pública, por ejemplo:

   `GET https://tu-dominio.vercel.app/api/notify`

   con el header o query que uses para validar `CRON_SECRET` (según tu implementación en `app/api/notify/route.ts`).

   En este repositorio hay un ejemplo en `.github/workflows/notify-cron.yml` (ajusta secretos `APP_URL` y `CRON_SECRET` en los secrets del repo).

## Estructura útil del código

- `app/` — rutas App Router, páginas autenticadas bajo `app/(app)/`, APIs en `app/api/`.
- `components/` — UI reutilizable (navbar, home, triggers, IA, etc.).
- `lib/` — Firebase cliente/admin, Firestore, auth, utilidades.
- `hooks/` — por ejemplo `useNotifications`.
- `public/` — assets estáticos, SW, manifiesto.

## Licencia y contribuciones

Este proyecto es de uso privado del autor salvo que se indique lo contrario. Para contribuciones o issues, usar el repositorio en GitHub del proyecto.

---

*Pulso — un pulso a la vez.*
