type NotifyType = "milestone" | "relapse_recovery" | "resist_win" | "inactivity";

export async function notifyEvent(
  uid: string,
  type: NotifyType,
  data?: Record<string, string | number>
): Promise<void> {
  try {
    await fetch("/api/notify/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, type, data }),
    });
  } catch {
    // Notificaciones son best-effort — no bloquear el flujo principal
  }
}
