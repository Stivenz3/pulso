"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { logMood } from "@/lib/firestore";
import type { MoodType } from "@/types";

const moods: { type: MoodType; emoji: string; label: string }[] = [
  { type: "focused", emoji: "🎯", label: "Enfocado" },
  { type: "motivated", emoji: "⚡", label: "Motivado" },
  { type: "stressed", emoji: "😤", label: "Estresado" },
  { type: "anxious", emoji: "😰", label: "Ansioso" },
  { type: "bored", emoji: "😑", label: "Aburrido" },
  { type: "calm", emoji: "😌", label: "Tranquilo" },
];

export default function MoodTracker() {
  const { user, activeHabit, canLogMood } = useAppStore();
  const [selected, setSelected] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);

  const habit = activeHabit();
  const canLog = canLogMood(habit?.id);

  const handleLog = async () => {
    if (!selected || !user || loading || !canLog || !habit?.id) return;

    setLoading(true);
    try {
      await logMood(user.uid, {
        mood: selected,
        intensity,
        habitId: habit.id,
      });
      // Update per-habit rate-limit map immediately for instant UI feedback
      useAppStore.setState((s) => ({
        lastMoodTimestamp: { ...s.lastMoodTimestamp, [habit.id]: Date.now() },
      }));
      setLogged(true);
      setTimeout(() => {
        setLogged(false);
        setSelected(null);
        setIntensity(3);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#1b1b1f] rounded-2xl p-5 space-y-4 border border-white/5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-[Space_Grotesk] font-bold text-base text-white">¿Cómo estás ahora?</h3>
          <p className="text-[#908fa3] text-xs mt-0.5">
            {habit
              ? canLog
                ? `Estado para "${habit.name}"`
                : `Próximo registro en "${habit.name}" en 2h`
              : "Selecciona un hábito primero"}
          </p>
        </div>
        {!canLog && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] bg-[#3832f6]/10 px-3 py-1 rounded-full">
            Registrado
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {logged ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-4"
          >
            <p className="text-2xl mb-1">✓</p>
            <p className="text-[#22c55e] font-bold text-sm">Estado registrado</p>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {moods.map((mood) => (
                <motion.button
                  key={mood.type}
                  whileTap={{ scale: 0.94 }}
                  disabled={!canLog}
                  onClick={() => setSelected(mood.type)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${
                    selected === mood.type
                      ? "border-[#3832f6] bg-[#3832f6]/10"
                      : "border-white/5 bg-[#2a292e]"
                  } ${!canLog ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span className="text-xl">{mood.emoji}</span>
                  <span className="text-[10px] font-bold text-[#c6c4da] uppercase tracking-wide">
                    {mood.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {selected && canLog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-[#908fa3] uppercase tracking-widest">
                      Intensidad
                    </p>
                    <span className="text-[#c1c1ff] font-bold text-sm">{intensity}/5</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={intensity}
                    onChange={(e) => setIntensity(Number(e.target.value))}
                    aria-label="Intensidad del estado de ánimo"
                    title="Intensidad"
                    className="w-full accent-[#3832f6]"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLog}
                  disabled={loading}
                  className="w-full bg-[#3832f6] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Registrar estado"}
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
