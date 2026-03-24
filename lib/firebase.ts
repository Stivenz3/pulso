import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: muestra config en consola (sin exponer la apiKey completa)
if (typeof window !== "undefined") {
  console.log("[Firebase Config]", {
    apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 8) + "..." : "MISSING",
    authDomain: firebaseConfig.authDomain || "MISSING",
    projectId: firebaseConfig.projectId || "MISSING",
    appId: firebaseConfig.appId ? "OK" : "MISSING",
  });
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging — solo en cliente y solo si el navegador lo soporta
let _messaging: Messaging | null = null;
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    if (!_messaging) _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
};

export const requestFcmToken = async (): Promise<string | null> => {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY no configurada");
    return null;
  }
  const messaging = await getFirebaseMessaging();
  if (!messaging) return null;
  try {
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (err) {
    console.error("[FCM] Error obteniendo token:", err);
    return null;
  }
};

export default app;
