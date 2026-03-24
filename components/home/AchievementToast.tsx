"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Achievement {
  id: string;
  days: number;
  emoji: string;
  title: string;
  subtitle: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "day_1",   days: 1,   emoji: "🌅", title: "Primera noche",      subtitle: "El primer día siempre es el más difícil." },
  { id: "day_3",   days: 3,   emoji: "🔥", title: "72 horas",           subtitle: "La tormenta más dura ya pasó." },
  { id: "day_7",   days: 7,   emoji: "⚡", title: "Una semana limpio",  subtitle: "Tu cerebro ya empieza a sanar." },
  { id: "day_14",  days: 14,  emoji: "💎", title: "Dos semanas",        subtitle: "El hábito se está rompiendo de verdad." },
  { id: "day_30",  days: 30,  emoji: "🏆", title: "Un mes completo",    subtitle: "30 días que cambian todo." },
  { id: "day_60",  days: 60,  emoji: "🦅", title: "El punto de quiebre", subtitle: "Ya eres otra persona." },
  { id: "day_90",  days: 90,  emoji: "👑", title: "90 días",            subtitle: "La ciencia dice que ya es un hábito. Tú lo lograste." },
  { id: "day_180", days: 180, emoji: "🌍", title: "Medio año",          subtitle: "Seis meses de pura voluntad." },
  { id: "day_365", days: 365, emoji: "🌟", title: "Un año entero",      subtitle: "Un año completo. Eres imparable." },
];

export function getUnlockedAchievements(streak: number): Achievement[] {
  return ACHIEVEMENTS.filter((a) => streak >= a.days);
}

export function getNextAchievement(streak: number): Achievement | null {
  return ACHIEVEMENTS.find((a) => a.days > streak) ?? null;
}

interface Props {
  achievement: Achievement | null;
  onDone: () => void;
}

export default function AchievementToast({ achievement, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievement) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 400);
    }, 4500);
    return () => clearTimeout(t);
  }, [achievement]);

  return (
    <AnimatePresence>
      {visible && achievement && (
        <motion.div
          initial={{ opacity: 0, y: -80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -60, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="fixed top-16 left-4 right-4 z-[300] max-w-sm mx-auto"
        >
          <div className="bg-[#1a1a1e] border border-[#3832f6]/40 rounded-3xl p-5 shadow-[0_20px_60px_rgba(56,50,246,0.35)] flex items-center gap-4">
            {/* Emoji pulsante */}
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl shrink-0"
            >
              {achievement.emoji}
            </motion.div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mb-0.5">
                🏅 Logro desbloqueado
              </p>
              <h3 className="font-[Space_Grotesk] font-bold text-white text-lg leading-tight">
                {achievement.title}
              </h3>
              <p className="text-[#908fa3] text-xs mt-0.5 leading-relaxed">
                {achievement.subtitle}
              </p>
            </div>

            {/* Partículas de fondo */}
            <motion.div
              className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-[#3832f6]/60"
                  initial={{ x: "50%", y: "100%", opacity: 0 }}
                  animate={{
                    x: `${20 + i * 14}%`,
                    y: `${10 + (i % 3) * 30}%`,
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
                />
              ))}
            </motion.div>
          </div>

          {/* Barra de progreso de auto-cierre */}
          <motion.div
            className="mt-1 h-0.5 bg-[#3832f6]/40 rounded-full mx-5"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4.5, ease: "linear" }}
            style={{ transformOrigin: "left" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
