import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import admin from "@/lib/firebase-admin";

// Vercel Cron llama a este endpoint con un Authorization header
// Schedule: cada día a las 21:00 UTC (configurable en vercel.json)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Verificar que la llamada viene de Vercel Cron o de un admin
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!admin.apps.length) {
    return NextResponse.json(
      { error: "Firebase Admin no inicializado — configura las variables de entorno" },
      { status: 503 }
    );
  }

  try {
    const db = admin.firestore();

    // Obtener todos los usuarios con notificaciones activas y FCM token
    const usersSnap = await db
      .collection("users")
      .where("settings.notificationsEnabled", "==", true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ sent: 0, message: "Sin usuarios con notificaciones activas" });
    }

    const messages: admin.messaging.Message[] = [];
    const now = new Date();
    const hour = now.getHours();

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token: string | undefined = userData.fcmToken;
      if (!token) continue;

      const name: string = userData.name || "amigo";

      // Obtener el hábito activo del usuario para personalizar el mensaje
      let streakMsg = "";
      try {
        const habitsSnap = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("habits")
          .where("isActive", "==", true)
          .limit(1)
          .get();

        if (!habitsSnap.empty) {
          const habit = habitsSnap.docs[0].data();
          const streak: number = habit.currentStreak || 0;
          const habitName: string = habit.name || "tu hábito";

          if (streak === 0) {
            streakMsg = `Hoy puede ser el día 1 con ${habitName}. Tú puedes.`;
          } else if (streak === 1) {
            streakMsg = `Día 1 logrado. Que duermas limpio esta noche con ${habitName}.`;
          } else if (streak < 7) {
            streakMsg = `${streak} días con ${habitName}. La racha es real.`;
          } else if (streak < 30) {
            streakMsg = `${streak} días limpio. Estás construyendo algo poderoso.`;
          } else if (streak < 90) {
            streakMsg = `${streak} días. Eres más fuerte que lo que te detuvo antes.`;
          } else {
            streakMsg = `${streak} días. Eres un ejemplo. Sigue.`;
          }
        }
      } catch {
        streakMsg = "Mantén tu racha esta noche.";
      }

      const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

      messages.push({
        token,
        notification: {
          title: `${greeting}, ${name} 💙`,
          body: streakMsg || "Pulso te recuerda: cada día cuenta.",
        },
        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "pulso-daily",
            requireInteraction: false,
          },
          fcmOptions: {
            link: "/",
          },
        },
      });
    }

    if (messages.length === 0) {
      return NextResponse.json({ sent: 0, message: "Sin tokens FCM registrados" });
    }

    // Enviar en lote (máximo 500 por batch de Firebase)
    const BATCH_SIZE = 500;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const response = await admin.messaging().sendEach(batch);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      // Limpiar tokens inválidos de Firestore
      for (let j = 0; j < response.responses.length; j++) {
        const res = response.responses[j];
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            const docId = usersSnap.docs[i + j]?.id;
            if (docId) {
              await db.collection("users").doc(docId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            }
          }
        }
      }
    }

    console.log(`[Notify] Enviadas: ${totalSent}, Fallidas: ${totalFailed}`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed });
  } catch (err) {
    console.error("[Notify] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
