"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import TriggerLogger from "@/components/triggers/TriggerLogger";
import { Clock, Zap, Brain, Trash2 } from "lucide-react";
import { getTriggerSuggestions } from "@/lib/ai";
import { toDate, deleteTrigger } from "@/lib/firestore";

const triggerEmojis: Record<string, string> = {
  stress: "😤",
  boredom: "😑",
  social: "🍻",
  loneliness: "😔",
  anxiety: "😰",
  custom: "✏️",
};

const triggerLabels: Record<string, string> = {
  stress: "Estrés",
  boredom: "Aburrimiento",
  social: "Presión social",
  loneliness: "Soledad",
  anxiety: "Ansiedad",
  custom: "Personalizado",
};

function getTriggerDisplay(trigger: { type: string; customLabel?: string | null }) {
  if (trigger.type === "custom" && trigger.customLabel) return trigger.customLabel;
  return triggerLabels[trigger.type] || trigger.type;
}

function formatRelativeTime(date: unknown): string {
  const diffMs = Date.now() - toDate(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return toDate(date).toLocaleDateString("es", { day: "numeric", month: "short" });
}

export default function TriggersPage() {
  const { triggers, habits, activeHabitId, moods, user } = useAppStore();
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [patternAnalysis, setPatternAnalysis] = useState<string>("");
  const [loadingPattern, setLoadingPattern] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteTrigger = async (triggerId: string) => {
    if (!user) return;
    setDeletingId(triggerId);
    await deleteTrigger(user.uid, triggerId).catch(() => {});
    setDeletingId(null);
  };

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const habitTriggers = triggers.filter((t) =>
    activeHabit ? t.habitId === activeHabit.id : true
  );
  const recentTriggers = [...habitTriggers]
    .sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime())
    .slice(0, 10);

  // Conteo real por tipo (usando label real para custom)
  const triggerCounts = habitTriggers.reduce<Record<string, number>>((acc, t) => {
    const label = getTriggerDisplay(t);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const topTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0];

  // Sugerencias de IA — caché por hábito
  useEffect(() => {
    if (!activeHabit) return;
    const cacheKey = `pulso_suggestions_${activeHabit.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { suggestions, ts } = JSON.parse(cached);
        if (Date.now() - ts < 24 * 3_600_000) { setAiSuggestions(suggestions); return; }
      }
    } catch { /* ignore */ }
    getTriggerSuggestions(activeHabit.name, activeHabit.type).then((s) => {
      setAiSuggestions(s);
      try { localStorage.setItem(cacheKey, JSON.stringify({ suggestions: s, ts: Date.now() })); } catch { /* ignore */ }
    });
  }, [activeHabit?.id]);

  // Análisis de patrón con IA — solo si cambian las métricas
  useEffect(() => {
    if (!activeHabit || habitTriggers.length < 2) return;

    // Huella digital: cambia solo si hay nuevos triggers, moods o cambió el hábito
    const fingerprint = `${activeHabit.id}:${habitTriggers.length}:${moods.length}:${activeHabit.currentStreak}`;
    const cacheKey = `pulso_pattern_${activeHabit.id}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { fp, analysis, ts } = JSON.parse(cached);
        if (fp === fingerprint && Date.now() - ts < 24 * 3_600_000) {
          setPatternAnalysis(analysis);
          return; // métricas sin cambios → usar caché
        }
      }
    } catch { /* ignore */ }

    setLoadingPattern(true);
    const recentMoods = moods.slice(0, 10).map((m) => `${m.mood}(intensidad:${m.intensity})`);
    const triggerCountsByType = habitTriggers.reduce<Record<string, number>>((acc, t) => {
      const label = getTriggerDisplay(t);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const triggerNotes = habitTriggers
      .filter((t) => t.note)
      .slice(0, 5)
      .map((t) => `${getTriggerDisplay(t)}: "${t.note}"`);

    fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "pattern_analysis",
        habitName: activeHabit.name,
        currentStreak: activeHabit.currentStreak,
        triggerCounts: triggerCountsByType,
        totalTriggers: habitTriggers.length,
        recentMoods,
        totalMoods: moods.length,
        triggerNotes,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.result) {
          setPatternAnalysis(d.result);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ fp: fingerprint, analysis: d.result, ts: Date.now() }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPattern(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitTriggers.length, moods.length, activeHabit?.id, activeHabit?.currentStreak]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-5 pt-6 pb-6 space-y-6"
    >
      {/* Pattern insight */}
      <section className="relative overflow-hidden rounded-2xl bg-[#1b1b1f] p-6 border border-white/5">
        <div className="pulse-glow absolute inset-0 z-0" />
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#c1c1ff]">
            Patrón detectado · IA
          </span>
          <h2 className="text-2xl font-[Space_Grotesk] font-bold text-white leading-tight">
            {topTrigger
              ? `"${topTrigger[0]}" es tu mayor desencadenante`
              : habitTriggers.length === 0
              ? "Registra triggers para detectar patrones"
              : "Analizando tus patrones..."}
          </h2>
          <p className="text-sm text-[#c6c4da]/80">
            {loadingPattern ? (
              <span className="animate-pulse">Analizando con IA...</span>
            ) : patternAnalysis ? (
              patternAnalysis
            ) : habitTriggers.length === 0 ? (
              "Cada registro nos ayuda a entender tu comportamiento y anticipar recaídas."
            ) : (
              `${habitTriggers.length} trigger${habitTriggers.length > 1 ? "s" : ""} registrado${habitTriggers.length > 1 ? "s" : ""}. Registra más para análisis completo.`
            )}
          </p>

          {/* Distribución de triggers */}
          {Object.keys(triggerCounts).length > 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(triggerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([label, count]) => (
                  <span
                    key={label}
                    className="text-[10px] font-bold bg-[#3832f6]/10 text-[#c1c1ff] border border-[#3832f6]/20 px-2.5 py-1 rounded-full"
                  >
                    {label} · {count}x
                  </span>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* AI suggestions */}
      {aiSuggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#3832f6]/5 border border-[#3832f6]/20 p-4 rounded-2xl"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} className="text-[#c1c1ff]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">
              IA · Triggers comunes para {activeHabit?.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((s, i) => (
              <span
                key={i}
                className="text-xs bg-[#3832f6]/10 text-[#c1c1ff] px-3 py-1.5 rounded-full border border-[#3832f6]/20 font-[Manrope]"
              >
                {s}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick logger */}
      <TriggerLogger />

      {/* Recent activity */}
      {recentTriggers.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c6c4da]">
              Actividad reciente
            </h3>
            <span className="text-[10px] text-[#908fa3]">{habitTriggers.length} total</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {recentTriggers.map((trigger, i) => (
                <motion.div
                  key={trigger.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-4 p-4 bg-[#1b1b1f] rounded-2xl border border-white/5"
                >
                  <div className="w-11 h-11 flex items-center justify-center bg-[#353439] rounded-full text-xl shrink-0">
                    {triggerEmojis[trigger.type] || "⚠️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">
                      {getTriggerDisplay(trigger)}
                    </p>
                    {trigger.moodAtMoment && (
                      <p className="text-[10px] text-[#3832f6] font-bold uppercase tracking-wide mt-0.5">
                        Ánimo: {trigger.moodAtMoment}
                      </p>
                    )}
                    {trigger.note && (
                      <p className="text-xs text-[#c6c4da] mt-0.5 truncate">{trigger.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[#908fa3]">
                      <Clock size={10} />
                      <p className="text-[10px] font-bold uppercase">
                        {formatRelativeTime(trigger.timestamp)}
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleDeleteTrigger(trigger.id)}
                      disabled={deletingId === trigger.id}
                      aria-label="Eliminar trigger"
                      title="Eliminar trigger"
                      className="text-[#454557] active:text-[#ffb4ab] hover:text-[#ffb4ab] transition-all p-1 disabled:opacity-40"
                    >
                      {deletingId === trigger.id ? (
                        <span className="text-[10px] animate-pulse">...</span>
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.section>
      ) : (
        <div className="text-center py-10 text-[#908fa3]">
          <Image src="/pulso.png" alt="" width={40} height={40} className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-[Manrope]">Sin triggers registrados aún</p>
          <p className="text-xs mt-1 opacity-60">
            Registra cuando sientas una urgencia para entender tus patrones
          </p>
        </div>
      )}

      {/* Zap icon for context */}
      {habitTriggers.length > 0 && (
        <div className="flex items-center gap-2 text-[#454557]">
          <Zap size={12} />
          <p className="text-[10px]">La IA mejora su análisis con cada registro</p>
        </div>
      )}
    </motion.div>
  );
}
