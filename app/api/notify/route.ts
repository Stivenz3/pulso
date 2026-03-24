import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import admin from "@/lib/firebase-admin";

// Endpoint de cron para notificaciones automáticas.
// Está pensado para ejecutarse cada 15 minutos (GitHub Actions scheduler).
// Usa hora local Colombia (UTC-5) y recordatorios por hábito.
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
    reminderMinute?: number | null;
    lastReminderKey?: string | null;
  }>;
}

function colLocalDateKey(nowUtc: Date): string {
  // UTC-5 fijo para Colombia
  const shifted = new Date(nowUtc.getTime() - 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
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
    const forceNow = req.nextUrl.searchParams.get("forceNow") === "1";

    // Hora local Colombia (UTC-5)
    const nowUtc = new Date();
    const colombiaHour = ((nowUtc.getUTCHours() - 5) + 24) % 24;
    const colombiaMinute = nowUtc.getUTCMinutes();
    const isMorning = colombiaHour >= 6 && colombiaHour < 12;
    const dateKey = colLocalDateKey(nowUtc);

    const twoDaysAgo = new Date(nowUtc.getTime() - 48 * 60 * 60 * 1000);

    const usersSnap = await db
      .collection("users")
      .where("settings.notificationsEnabled", "==", true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ sent: 0, message: "Sin usuarios activos" });
    }

    const messages: admin.messaging.Message[] = [];
    const messageMeta: Array<{ uid: string; habitId: string; reminderKey: string }> = [];
    const debug = {
      usersChecked: 0,
      habitsChecked: 0,
      skippedNoToken: 0,
      skippedByHour: 0,
      skippedByMinuteWindow: 0,
      skippedByDuplicateKey: 0,
      forceNow,
    };

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const token: string | undefined = userData.fcmToken;
      debug.usersChecked += 1;
      if (!token) {
        debug.skippedNoToken += 1;
        continue;
      }

      const name: string = userData.name || "amigo";
      const uid = userDoc.id;

      // Verificar inactividad (+48h sin abrir la app)
      const lastLogin = userData.lastLogin?.toDate?.() as Date | undefined;
      const isInactive = lastLogin && lastLogin < twoDaysAgo;
      const habits = await getActiveHabits(db, uid);
      for (const habit of habits) {
        debug.habitsChecked += 1;
        const streak: number = Number(habit.currentStreak ?? 0);
        const habitName: string = String(habit.name ?? "tu hábito");
        const customHour: number | null =
          typeof habit.reminderHour === "number" ? habit.reminderHour : null;
        const customMinute: number | null =
          typeof habit.reminderMinute === "number" ? habit.reminderMinute : null;

        // Si no hay hora personalizada, usar horarios por defecto 8AM y 9PM
        const shouldRunDefault = customHour === null && (colombiaHour === 8 || colombiaHour === 21);
        const shouldRunCustomHour = customHour !== null && customHour === colombiaHour;
        if (!forceNow && !shouldRunDefault && !shouldRunCustomHour) {
          debug.skippedByHour += 1;
          continue;
        }

        // Para minutos personalizados, permitir ventana +-12 min.
        // GitHub Actions no es exacto al minuto, así evitamos falsos negativos.
        if (!forceNow && shouldRunCustomHour && customMinute !== null) {
          const delta = Math.abs(colombiaMinute - customMinute);
          const wrappedDelta = Math.min(delta, 60 - delta);
          if (wrappedDelta > 12) {
            debug.skippedByMinuteWindow += 1;
            continue;
          }
        }

        const reminderKey = `${dateKey}-${colombiaHour}-${habit.id}`;
        if (!forceNow && habit.lastReminderKey === reminderKey) {
          debug.skippedByDuplicateKey += 1;
          continue; // evita duplicados
        }

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
          data: {
            reminderKey,
            habitId: habit.id,
            customTitle: title,
            customBody: body,
            source: "scheduled",
          },
          android: {
            ttl: 15 * 60 * 1000, // 15 min: evita entregas viejas
            priority: "high",
          },
          webpush: {
            headers: {
              TTL: "900", // 15 min en segundos
              Urgency: "high",
            },
            fcmOptions: { link: "/" },
          },
        });
        messageMeta.push({ uid, habitId: habit.id, reminderKey });
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({
        sent: 0,
        message: "Sin mensajes para enviar",
        colombiaHour,
        colombiaMinute,
        debug,
      });
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
            const meta = messageMeta[i + j];
            if (meta) {
              await db.collection("users").doc(meta.uid).update({
                fcmToken: admin.firestore.FieldValue.delete(),
              });
            }
          }
        } else {
          // Marcar envío exitoso para no repetir en el mismo ciclo
          const meta = messageMeta[i + j];
          if (meta) {
            await db
              .collection("users")
              .doc(meta.uid)
              .collection("habits")
              .doc(meta.habitId)
              .update({ lastReminderKey: meta.reminderKey });
          }
        }
      }
    }

    console.log(`[Notify] Colombia=${colombiaHour}h | Enviadas: ${totalSent}, Fallidas: ${totalFailed}`);
    return NextResponse.json({ sent: totalSent, failed: totalFailed, colombiaHour, colombiaMinute, debug });
  } catch (err) {
    console.error("[Notify] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
