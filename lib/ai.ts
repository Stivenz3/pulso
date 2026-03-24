"use client";

async function callAI(payload: Record<string, unknown>): Promise<string | string[]> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    console.error("[AI] callAI failed →", res.status, err);
    throw new Error(err.error || "AI request failed");
  }
  const data = await res.json();
  return data.result;
}

export async function analyzeHabit(
  habitName: string,
  habitType: string,
  currentStreak: number,
  recentTriggers: string[],
  recentMoods: string[],
  longestStreak = 0,
  totalRelapses = 0,
  relapseNotes: string[] = []
): Promise<string> {
  try {
    const result = await callAI({
      type: "analyze_habit",
      habitName,
      habitType,
      currentStreak,
      recentTriggers,
      recentMoods,
      longestStreak,
      totalRelapses,
      relapseNotes,
    });
    return result as string;
  } catch (err) {
    console.error("[AI] analyzeHabit fallback →", err);
    return `Llevas ${currentStreak} días con "${habitName}". Cada día que resistes construyes una versión más fuerte de ti.`;
  }
}

export async function getTriggerSuggestions(
  habitName: string,
  habitType: string
): Promise<string[]> {
  try {
    const result = await callAI({ type: "trigger_suggestions", habitName, habitType });
    return result as string[];
  } catch (err) {
    console.error("[AI] getTriggerSuggestions fallback →", err);
    return ["Estrés laboral", "Presión social", "Aburrimiento", "Ansiedad", "Soledad", "Insomnio"];
  }
}

export async function getEmotionCorrelation(
  recentMoods: string[],
  recentTriggers: string[]
): Promise<string> {
  try {
    const result = await callAI({ type: "emotion_correlation", recentMoods, recentTriggers });
    return result as string;
  } catch (err) {
    console.error("[AI] getEmotionCorrelation fallback →", err);
    return "Cuando estás estresado tu riesgo de recaída aumenta. Identifica ese momento antes de actuar.";
  }
}

export async function getDailyInsight(
  habitName: string,
  currentStreak: number
): Promise<string> {
  try {
    const result = await callAI({ type: "daily_insight", habitName, currentStreak });
    return result as string;
  } catch (err) {
    console.error("[AI] getDailyInsight fallback →", err);
    return "La disciplina es la forma más pura de amor propio. Cada minuto cuenta.";
  }
}
