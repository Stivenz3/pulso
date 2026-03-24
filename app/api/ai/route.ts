import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface AIRequest {
  type:
    | "analyze_habit"
    | "trigger_suggestions"
    | "emotion_correlation"
    | "daily_insight"
    | "pattern_analysis"
    | "relapse_recovery";
  habitName?: string;
  habitType?: string;
  currentStreak?: number;
  recentTriggers?: string[];
  recentMoods?: string[];
  triggerCounts?: Record<string, number>;
  triggerNotes?: string[];
  totalTriggers?: number;
  totalMoods?: number;
  longestStreak?: number;
  // Relapse data
  totalRelapses?: number;
  relapseNotes?: string[];  // notas que el usuario escribió al reportar recaídas
  lastRelapseNote?: string;
}

async function groqChat(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set in environment");

  console.log("[AI Route] Calling Groq →", GROQ_MODEL, messages[0].content.slice(0, 80));

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[AI Route] Groq error →", res.status, err);
    throw new Error(`Groq ${res.status}: ${err}`);
  }

  const data = await res.json();
  const result = data.choices[0].message.content as string;
  console.log("[AI Route] Groq OK → result length:", result.length);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRequest = await req.json();
    console.log("[AI Route] Request type →", body.type);

    let result: string | string[];

    switch (body.type) {
      case "analyze_habit": {
        const triggerSummary = body.recentTriggers?.length
          ? body.recentTriggers.join(" | ")
          : "ninguno registrado";
        const moodSummary = body.recentMoods?.length
          ? body.recentMoods.join(", ")
          : "ninguno registrado";
        const relapseSummary = body.relapseNotes?.length
          ? `\nEl usuario ha escrito esto sobre sus recaídas pasadas: ${body.relapseNotes.join(" | ")}`
          : body.totalRelapses
          ? `\nEl usuario ha tenido ${body.totalRelapses} recaída(s) registradas.`
          : "";

        const prompt = `Eres un asistente de bienestar conductual para la app "Pulso". Analiza estos datos reales del usuario y da UN insight directo y accionable en español (máximo 2 oraciones). Sé empático pero honesto.

Hábito: "${body.habitName}" (tipo: ${body.habitType})
Racha actual: ${body.currentStreak} días
Racha más larga: ${body.longestStreak ?? 0} días
Triggers recientes (incluyen notas del usuario entre comillas): ${triggerSummary}
Estados de ánimo recientes: ${moodSummary}${relapseSummary}

Si hay notas de recaídas del usuario, úsalas para un consejo más personalizado. Responde SOLO con el insight. Sin prefijos ni comillas.`;

        result = await groqChat([{ role: "user", content: prompt }]);
        break;
      }

      case "trigger_suggestions": {
        const prompt = `Para alguien que está controlando su hábito de "${body.habitName}" (tipo: ${body.habitType}), lista exactamente 6 desencadenantes conductuales y emocionales que suelen causar recaídas, específicos para este hábito. En español. Responde SOLO con un JSON array: ["trigger1","trigger2","trigger3","trigger4","trigger5","trigger6"]. Sin texto adicional.`;

        const raw = await groqChat([{ role: "user", content: prompt }]);
        try {
          const start = raw.indexOf("[");
          const end = raw.lastIndexOf("]");
          result =
            start >= 0 && end > start
              ? JSON.parse(raw.slice(start, end + 1))
              : fallbackTriggers(body.habitName || "");
        } catch {
          result = fallbackTriggers(body.habitName || "");
        }
        break;
      }

      case "emotion_correlation": {
        const moodSummary = body.recentMoods?.join(", ") || "sin datos";
        // Los triggers ya vienen con notas entre comillas desde el cliente
        const triggerSummary = body.recentTriggers?.join(" | ") || "sin datos";

        const prompt = `Analiza el siguiente patrón emocional y de triggers de un usuario trabajando en control de hábitos. Identifica UNA correlación concreta y accionable (1-2 oraciones en español). Si los triggers tienen notas entre comillas, úsalas para dar contexto real.

Estados de ánimo registrados (mood + intensidad): ${moodSummary}
Triggers registrados (algunos con contexto del usuario entre comillas): ${triggerSummary}

Responde SOLO con la correlación personalizada. Sin prefijos.`;

        result = await groqChat([{ role: "user", content: prompt }]);
        break;
      }

      case "daily_insight": {
        const prompt = `Genera un mensaje motivacional corto, directo y personalizado en español para alguien que lleva ${body.currentStreak} días controlando su hábito "${body.habitName}". Máximo 1 oración poderosa. Sin comillas ni prefijos.`;

        result = await groqChat([{ role: "user", content: prompt }]);
        break;
      }

      case "pattern_analysis": {
        const triggerBreakdown = body.triggerCounts
          ? Object.entries(body.triggerCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => `${k}(${v}x)`)
              .join(", ")
          : "sin datos";
        const moodSummary = body.recentMoods?.join(", ") || "sin datos";
        const notesSummary = body.triggerNotes?.length
          ? `\nContexto adicional del usuario (sus propias palabras): ${body.triggerNotes.join(" | ")}`
          : "";

        const prompt = `Analiza el comportamiento real de este usuario en la app Pulso y da UN análisis de patrón directo en español (2-3 oraciones). Si hay notas del usuario, úsalas para personalizar el análisis.

Hábito: "${body.habitName}"
Racha actual: ${body.currentStreak} días
Total triggers registrados: ${body.totalTriggers ?? 0}
Distribución de triggers: ${triggerBreakdown}
Estados de ánimo recientes: ${moodSummary}
Total registros de ánimo: ${body.totalMoods ?? 0}${notesSummary}

Responde SOLO con el análisis personalizado. Sin prefijos.`;

        result = await groqChat([{ role: "user", content: prompt }]);
        break;
      }

      case "relapse_recovery": {
        // Called immediately after a relapse is recorded
        // Uses the user's own note to give a highly personalized recovery message
        const noteContext = body.lastRelapseNote
          ? `El usuario escribió esto al reportar la recaída: "${body.lastRelapseNote}".`
          : "El usuario no dejó nota sobre lo que pasó.";

        const prompt = `Eres un asistente de recuperación en la app "Pulso". El usuario acaba de reportar una recaída en su hábito "${body.habitName}" después de ${body.currentStreak} días limpio.

${noteContext}
Recaídas totales registradas: ${body.totalRelapses ?? 1}

Da un mensaje de recuperación en español: empático, directo, sin juzgar, que lo motive a empezar de nuevo HOY. Máximo 3 oraciones. Usa la nota del usuario si existe para personalizar el mensaje. Sin prefijos ni comillas.`;

        result = await groqChat([{ role: "user", content: prompt }]);
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI Route] FAILED →", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function fallbackTriggers(habitName: string): string[] {
  const lower = habitName.toLowerCase();
  if (lower.includes("alcohol") || lower.includes("drogas"))
    return ["Estrés laboral", "Presión social", "Soledad nocturna", "Ansiedad", "Celebraciones", "Conflictos"];
  if (lower.includes("nicotina") || lower.includes("cigarro"))
    return ["Estrés", "Café", "Alcohol", "Trabajo intenso", "Conducir", "Aburrimiento"];
  return ["Estrés", "Aburrimiento", "Soledad", "Ansiedad", "Presión social", "Insomnio"];
}
