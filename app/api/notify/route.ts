import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import admin from "@/lib/firebase-admin";

// Crons configurados en vercel.json:
//   /api/notify?type=morning  → 0 8  * * *  (8 AM UTC)
//   /api/notify?type=evening  → 0 21 * * *  (9 PM UTC)
//   /api/notify?type=inactive → 0 12 * * *  (12 PM UTC — verifica inactividad)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CronType = "morning" | "evening" | "inactive";

async function getActiveHabit(db: admin.firestore.Firestore, uid: string) {
  const snap = await db
    .collection("users").doc(uid)
    .collection("habits")
    .where("isActive", "==", true)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].data();
}

function streakMessage(streak: number, name: string, habitName: string): string {
  if (streak === 0) return `Hoy puede ser el día 1 con ${habitName}. Tú puedes.`;
  if (streak === 1) return `Día 1 logrado, ${name}. Que duermas limpio esta noche.`;
  if (streak < 7) return `${streak} días con ${habitName}. La racha es real.`;
  if (streak < 30) return `${streak} días limpio. Estás construyendo algo poderoso.`;
  if (streak < 90) return `${streak} días. Eres más fuerte que lo que te detuvo antes.`;
  return `${streak} días. Eres un ejemplo. Sigue.`;
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

  const cronType = (req.nextUrl.searchParams.get("type") ?? "evening") as CronType;

  try {
    const db = admin.firestore();
    const usersSnap = await db
      .collection("users")
      .where("settings.notificationsEnabled", "==", true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ sent: 0, message: "Sin usuarios activos" });
    }

    const messages: admin.messaging.Message[] = [];
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token: string | undefined = userData.fcmToken;
      if (!token) continue;

      const name: string = userData.name || "amigo";
      const uid = userDoc.id;

      // ── Inactividad: saltar usuarios que sí abrieron la app ──────────────
      if (cronType === "inactive") {
        const lastLogin = userData.lastLogin?.toDate?.() as Date | undefined;
        if (!lastLogin || lastLogin > twoDaysAgo) continue; // activo reciente → skip
      }

      let title = "";
      let body = "";

      const habit = await getActiveHabit(db, uid);
      const streak: number = habit?.currentStreak ?? 0;
      const habitName: string = habit?.name ?? "tu hábito";

      switch (cronType) {
        case "morning":
          title = `Buenos días, ${name} ☀️`;
          body = streak > 0
            ? `Día ${streak + 1} comienza ahora. Cada mañana limpia suma.`
            : `Un nuevo día, una nueva oportunidad. Hoy empieza tu racha.`;
          break;

        case "evening":
          title = `Buenas noches, ${name} 🌙`;
          body = streakMessage(streak, name, habitName);
          break;

        case "inactive": {
          const daysSinceSeen = Math.floor(
            (now.getTime() - (userData.lastLogin?.toDate?.()?.getTime() ?? 0)) / 86_400_000
          );
          title = `${name}, ¿sigues ahí? 👀`;
          body = streak > 0
            ? `Llevas ${streak} días con ${habitName}. No dejes que el tiempo trabaje en contra.`
            : `Hace ${daysSinceSeen} días que no abres Pulso. Hoy puede ser el día 1.`;
          break;
        }
      }

      if (!title) continue;

      messages.push({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: `pulso-cron-${cronType}`,
            requireInteraction: false,
          },
          fcmOptions: { link: "/" },
        },
      });
    }

    if (messages.length === 0) {
      return NextResponse.json({ sent: 0, message: "Sin mensajes para enviar" });
    }

    // Enviar en lotes de 500 (límite Firebase)
    const BATCH = 500;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const response = await admin.messaging().sendEach(batch);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      // Limpiar tokens caducados
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

    console.log(`[Notify:${cronType}] Enviadas: ${totalSent}, Fallidas: ${totalFailed}`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed, type: cronType });
  } catch (err) {
    console.error("[Notify] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
