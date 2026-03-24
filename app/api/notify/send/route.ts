import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import admin from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotifyType =
  | "milestone"
  | "relapse_recovery"
  | "resist_win"
  | "inactivity";

interface NotifyPayload {
  uid: string;
  type: NotifyType;
  data?: Record<string, string | number>;
}

const MILESTONE_MESSAGES: Record<number, { title: string; body: string }> = {
  1:   { title: "🌅 Primera noche superada",   body: "El día más difícil ya es historia. Esto es real." },
  3:   { title: "🔥 72 horas. Sin rendirse.",   body: "La tormenta más dura ya pasó. Siente la diferencia." },
  7:   { title: "⚡ Una semana limpio",         body: "Tu cerebro ya empieza a sanar. Una semana de pura voluntad." },
  14:  { title: "💎 Dos semanas",               body: "El hábito se está rompiendo de verdad. Sigue." },
  30:  { title: "🏆 Un mes completo",           body: "30 días que cambian todo. Eres diferente ahora." },
  60:  { title: "🦅 El punto de quiebre",       body: "60 días. Ya eres otra persona. No te detengas." },
  90:  { title: "👑 90 días — logro épico",     body: "La ciencia dice que ya es un hábito. Tú lo lograste." },
  180: { title: "🌍 Medio año",                 body: "Seis meses de pura voluntad. Eres un ejemplo." },
  365: { title: "🌟 Un año entero",             body: "365 días. Imparable. No hay vuelta atrás." },
};

function buildMessage(
  token: string,
  type: NotifyType,
  name: string,
  data?: Record<string, string | number>
): admin.messaging.Message {
  let title = "Pulso";
  let body = "Mantén tu racha.";

  switch (type) {
    case "milestone": {
      const days = Number(data?.days ?? 0);
      const msg = MILESTONE_MESSAGES[days];
      if (msg) { title = msg.title; body = msg.body; }
      else { title = `🎯 ¡${days} días!`; body = `${days} días limpio, ${name}. Sigue así.`; }
      break;
    }
    case "relapse_recovery":
      title = `${name}, vuelves a empezar`;
      body = "Una recaída no es el final — es información. Hoy es día 1 y eso también es valiente.";
      break;
    case "resist_win":
      title = `💪 Lo resististe, ${name}`;
      body = "Acabas de ganarle a tu peor momento. Eso no lo puede quitarte nadie.";
      break;
    case "inactivity": {
      const days = Number(data?.streak ?? 0);
      title = `${name}, ¿sigues ahí?`;
      body = days > 0
        ? `Llevas ${days} días. Abre Pulso y confirma tu racha antes de que el tiempo cuente en contra.`
        : "Hace tiempo que no te ves por aquí. Hoy puede ser el día 1.";
      break;
    }
  }

  return {
    token,
    notification: { title, body },
    webpush: {
      notification: {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `pulso-${type}`,
        requireInteraction: type === "milestone",
      },
      fcmOptions: { link: "/" },
    },
  };
}

export async function POST(req: NextRequest) {
  if (!admin.apps.length) {
    return NextResponse.json({ error: "Firebase Admin no inicializado" }, { status: 503 });
  }

  let body: NotifyPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { uid, type, data } = body;
  if (!uid || !type) {
    return NextResponse.json({ error: "uid y type son requeridos" }, { status: 400 });
  }

  try {
    const db = admin.firestore();
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const userData = userSnap.data()!;
    const token: string | undefined = userData.fcmToken;
    const name: string = userData.name || "amigo";
    const notifEnabled: boolean = userData.settings?.notificationsEnabled !== false;

    if (!token) return NextResponse.json({ sent: false, reason: "sin token FCM" });
    if (!notifEnabled) return NextResponse.json({ sent: false, reason: "notificaciones desactivadas" });

    const message = buildMessage(token, type, name, data);
    await admin.messaging().send(message);

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[notify/send]", err);
    return NextResponse.json({ error: "Error enviando notificación" }, { status: 500 });
  }
}
