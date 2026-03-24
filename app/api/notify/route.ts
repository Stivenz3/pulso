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

async function getActiveHabit(db: admin.firestore.Firestore, uid: string) {
  const snap = await db
    .collection("users").doc(uid)
    .collection("habits")
    .where("isActive", "==", true)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
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

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token: string | undefined = userData.fcmToken;
      if (!token) continue;

      const name: string = userData.name || "amigo";
      const uid = userDoc.id;

      const habit = await getActiveHabit(db, uid);
      const streak: number = habit?.currentStreak ?? 0;
      const habitName: string = habit?.name ?? "tu hábito";

      // Verificar inactividad (+48h sin abrir la app)
      const lastLogin = userData.lastLogin?.toDate?.() as Date | undefined;
      const isInactive = lastLogin && lastLogin < twoDaysAgo;

      let title = "";
      let body = "";

      if (isInactive) {
        // Inactividad tiene prioridad — el usuario lleva días sin abrir
        title = `${name}, ¿sigues ahí? 👀`;
        body = streak > 0
          ? `Llevas ${streak} días con ${habitName}. No dejes que el tiempo trabaje en contra.`
          : "Hace tiempo que no te ves por aquí. Hoy puede ser el día 1.";
      } else if (isMorning) {
        title = `Buenos días, ${name} ☀️`;
        body = streak > 0
          ? `Día ${streak + 1} comienza ahora. Cada mañana limpia suma.`
          : "Un nuevo día, una nueva oportunidad. Hoy empieza tu racha.";
      } else {
        // Noche
        title = `Buenas noches, ${name} 🌙`;
        if (streak === 0) {
          body = `Hoy puede ser el día 1 con ${habitName}. Tú puedes.`;
        } else if (streak === 1) {
          body = `Día 1 logrado. Que duermas limpio esta noche.`;
        } else if (streak < 7) {
          body = `${streak} días con ${habitName}. La racha es real.`;
        } else if (streak < 30) {
          body = `${streak} días limpio. Estás construyendo algo poderoso.`;
        } else if (streak < 90) {
          body = `${streak} días. Eres más fuerte que lo que te detuvo antes.`;
        } else {
          body = `${streak} días. Eres un ejemplo. Sigue.`;
        }
      }

      messages.push({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: "pulso-daily",
            requireInteraction: false,
          },
          fcmOptions: { link: "/" },
        },
      });
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

    console.log(`[Notify] Colombia=${colombiaHour}h | Enviadas: ${totalSent}, Fallidas: ${totalFailed}`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed, colombiaHour });
  } catch (err) {
    console.error("[Notify] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
