import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import admin from "@/lib/firebase-admin";

// Este endpoint se llama desde 2 crons (ver vercel.json):
//   0 13 * * *  → 8 AM Colombia  → saludo matutino
//   0  2 * * *  → 9 PM Colombia  → saludo nocturno
// El endpoint detecta la hora Colombia automáticamente (UTC-5).
// Además, si el usuario lleva +48h sin abrir la app, recibe recordatorio de inactividad.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getActiveHabits(db: admin.firestore.Firestore, uid: string) {
  const snap = await db
    .collection("users").doc(uid)
    .collection("habits")
    .where("isActive", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
    id: string;
    name?: string;
    currentStreak?: number;
    reminderHour?: number | null;
  }>;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!admin.apps.length) {
    return NextResponse.json(
      { error: "Firebase Admin no inicializado" },
      { status: 503 }
    );
  }

  try {
    const db = admin.firestore();

    // Hora local Colombia (UTC-5)
    const nowUtc = new Date();
    const colombiaHour = ((nowUtc.getUTCHours() - 5) + 24) % 24;
    const isMorning = colombiaHour >= 6 && colombiaHour < 12;

    const twoDaysAgo = new Date(nowUtc.getTime() - 48 * 60 * 60 * 1000);

    const usersSnap = await db
      .collection("users")
      .where("settings.notificationsEnabled", "==", true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ sent: 0, message: "Sin usuarios activos" });
    }

    const messages: admin.messaging.Message[] = [];
    const messageUserIds: string[] = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token: string | undefined = userData.fcmToken;
      if (!token) continue;

      const name: string = userData.name || "amigo";
      const uid = userDoc.id;

      // Verificar inactividad (+48h sin abrir la app)
      const lastLogin = userData.lastLogin?.toDate?.() as Date | undefined;
      const isInactive = lastLogin && lastLogin < twoDaysAgo;
      const habits = await getActiveHabits(db, uid);
      for (const habit of habits) {
        const streak: number = Number(habit.currentStreak ?? 0);
        const habitName: string = String(habit.name ?? "tu hábito");
        const customHour: number | null =
          typeof habit.reminderHour === "number" ? habit.reminderHour : null;
        if (customHour !== null && customHour !== colombiaHour) continue;

        let title = "";
        let body = "";

        if (isInactive) {
          title = `${name}, ¿sigues ahí? 👀`;
          body = streak > 0
            ? `Llevas ${streak} días con ${habitName}. No dejes que el tiempo trabaje en contra.`
            : `Hace tiempo que no practicas ${habitName}. Hoy puede ser el día 1.`;
        } else if (isMorning) {
          title = `Buenos días, ${name} ☀️`;
          body = streak > 0
            ? `Día ${streak + 1} de ${habitName} comienza ahora.`
            : `Un nuevo día para empezar con ${habitName}.`;
        } else {
          title = `Buenas noches, ${name} 🌙`;
          if (streak === 0) body = `Hoy puede ser el día 1 con ${habitName}. Tú puedes.`;
          else if (streak === 1) body = `Día 1 de ${habitName} logrado.`;
          else if (streak < 7) body = `${streak} días con ${habitName}. La racha es real.`;
          else if (streak < 30) body = `${streak} días con ${habitName}. Estás construyendo algo poderoso.`;
          else if (streak < 90) body = `${streak} días con ${habitName}. Vas muy fuerte.`;
          else body = `${streak} días con ${habitName}. Eres un ejemplo.`;
        }

        messages.push({
          token,
          notification: { title, body },
          webpush: {
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: `pulso-daily-${habit.id}`,
              requireInteraction: false,
            },
            fcmOptions: { link: "/" },
          },
        });
        messageUserIds.push(uid);
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ sent: 0, message: "Sin mensajes para enviar" });
    }

    const BATCH = 500;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const response = await admin.messaging().sendEach(batch);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      // Limpiar tokens caducados de Firestore
      for (let j = 0; j < response.responses.length; j++) {
        const res = response.responses[j];
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            const docId = messageUserIds[i + j];
            if (docId) {
              await db.collection("users").doc(docId).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            }
          }
        }
      }
    }

    console.log(`[Notify] Colombia=${colombiaHour}h | Enviadas: ${totalSent}, Fallidas: ${totalFailed}`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed, colombiaHour });
  } catch (err) {
    console.error("[Notify] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
