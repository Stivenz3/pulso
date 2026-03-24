"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { ACHIEVEMENTS } from "@/components/home/AchievementToast";
import Image from "next/image";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// Mensaje de motivación al desbloquear cada logro
const unlockMessages: Record<string, string> = {
  day_1:   "Completar el primer día es más difícil que cualquier otro. Tu cerebro ya está cambiando a nivel neurológico.",
  day_3:   "72 horas. Los primeros síntomas de abstinencia pasan. Tu cuerpo ya está limpiando lo que no necesita.",
  day_7:   "Una semana entera. Tu cerebro comenzó a restaurar los receptores de dopamina. Sientes las cosas más nítidas.",
  day_14:  "Dos semanas sin ceder. La neblina mental empieza a desaparecer. Tu sueño mejora. Tu energía es más estable.",
  day_30:  "Un mes. La ciencia dice que necesitas 21 días para romper un hábito. Tú llevás 30. Ya eres diferente.",
  day_60:  "Dos meses de constancia absoluta. La mayoría nunca llega aquí. Tú sí. Tu vida está cambiando de raíz.",
  day_90:  "90 días. El estándar clínico de recuperación. Lo que comenzó como una decisión se volvió una identidad.",
  day_180: "Medio año de pura voluntad. Has pasado por días buenos y malos, y aquí estás. Eso es lo que te define.",
  day_365: "Un año completo. 365 decisiones correctas. Cada mañana elegiste, y cada noche ganaste. Eres imparable.",
};

// Mensaje de motivación para logros aún bloqueados
const lockedMessages: Record<string, string> = {
  day_1:   "El camino empieza con un solo día. Solo tienes que llegar a esta noche.",
  day_3:   "Las primeras 72 horas son las más intensas. Después viene la claridad.",
  day_7:   "Una semana cambia cómo te sientes. Aguanta hasta el próximo lunes.",
  day_14:  "Dos semanas y verás diferencias físicas y mentales reales. Vale la pena.",
  day_30:  "Un mes transforma tu cerebro. Cada día que pasa, más fácil se vuelve.",
  day_60:  "A los 60 días ya no será un esfuerzo. Será simplemente quién eres.",
  day_90:  "90 días es el estándar para una recuperación real. Tú puedes llegar.",
  day_180: "Medio año. Imagina cómo te sentirás en ese punto. Sigue.",
  day_365: "Un año entero. Una versión de ti que jamás imaginaste. Está esperando.",
};

export default function AchievementsPage() {
  const { habits, activeHabitId } = useAppStore();
  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const currentStreak = activeHabit?.currentStreak ?? 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  const unlocked = ACHIEVEMENTS.filter((a) => currentStreak >= a.days);
  const locked = ACHIEVEMENTS.filter((a) => currentStreak < a.days);
  const nextAchievement = locked[0] ?? null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="pt-6 pb-8 space-y-8"
    >
      {/* Header */}
      <div className="px-5 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Tu progreso</p>
        <h1 className="font-[Space_Grotesk] font-bold text-3xl text-white">Logros</h1>
        <p className="text-[#908fa3] text-sm">
          {unlocked.length} de {ACHIEVEMENTS.length} desbloqueados
        </p>

        {/* Barra general */}
        <div className="pt-2">
          <div className="h-1.5 bg-[#252528] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(unlocked.length / ACHIEVEMENTS.length) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="h-full bg-[#3832f6] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Próximo logro destacado */}
      {nextAchievement && (
        <div className="px-5">
          <div className="relative overflow-hidden rounded-3xl bg-[#1a1a1e] border border-[#3832f6]/25 p-5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#3832f6]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mb-3">
              Próximo logro
            </p>
            <div className="flex items-center gap-4">
              <span className="text-5xl grayscale opacity-60">{nextAchievement.emoji}</span>
              <div className="flex-1">
                <h3 className="font-[Space_Grotesk] font-bold text-white text-xl">{nextAchievement.title}</h3>
                <p className="text-[#908fa3] text-sm mt-0.5">{nextAchievement.days} días</p>
                <div className="mt-2 h-1.5 bg-[#252528] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (currentStreak / nextAchievement.days) * 100)}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 }}
                    className="h-full bg-[#3832f6]/70 rounded-full"
                  />
                </div>
                <p className="text-[10px] text-[#908fa3] mt-1">
                  {currentStreak}/{nextAchievement.days} días · faltan {nextAchievement.days - currentStreak}
                </p>
              </div>
            </div>
            <p className="text-[#c6c4da] text-sm italic mt-4 leading-relaxed">
              &quot;{lockedMessages[nextAchievement.id]}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Carrusel — desbloqueados */}
      {unlocked.length > 0 && (
        <div className="space-y-3">
          <p className="px-5 text-[10px] font-bold uppercase tracking-widest text-[#c6c4da]">
            Desbloqueados
          </p>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory"
          >
            {[...unlocked].reverse().map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="shrink-0 snap-center w-[260px] bg-[#1a1a1e] border border-[#3832f6]/30 rounded-3xl p-6 flex flex-col gap-4"
              >
                {/* Emoji + badge */}
                <div className="flex items-start justify-between">
                  <motion.span
                    initial={{ rotate: -15, scale: 0.7 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 + i * 0.06 }}
                    className="text-5xl"
                  >
                    {a.emoji}
                  </motion.span>
                  <span className="text-[9px] font-bold bg-[#3832f6]/15 text-[#c1c1ff] px-2.5 py-1 rounded-full border border-[#3832f6]/25 uppercase tracking-widest">
                    ✓ Logrado
                  </span>
                </div>

                {/* Título y días */}
                <div>
                  <h3 className="font-[Space_Grotesk] font-bold text-white text-xl leading-tight">
                    {a.title}
                  </h3>
                  <p className="text-[#3832f6] text-sm font-bold mt-0.5">{a.days} días</p>
                </div>

                {/* Mensaje */}
                <p className="text-[#908fa3] text-sm leading-relaxed flex-1">
                  {unlockMessages[a.id]}
                </p>

                {/* Separador decorativo */}
                <div className="h-px bg-gradient-to-r from-[#3832f6]/30 via-[#3832f6]/10 to-transparent" />
                <p className="text-[10px] text-[#454557] italic">
                  &quot;{a.subtitle}&quot;
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Carrusel — por desbloquear */}
      {locked.length > 0 && (
        <div className="space-y-3">
          <p className="px-5 text-[10px] font-bold uppercase tracking-widest text-[#454557]">
            Por desbloquear
          </p>
          <div className="flex gap-4 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory">
            {locked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="shrink-0 snap-center w-[260px] bg-[#141416] border border-white/4 rounded-3xl p-6 flex flex-col gap-4 opacity-60"
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl grayscale">{a.emoji}</span>
                  <span className="text-[9px] font-bold bg-[#252528] text-[#454557] px-2.5 py-1 rounded-full border border-white/5 uppercase tracking-widest">
                    🔒 {a.days}d
                  </span>
                </div>

                <div>
                  <h3 className="font-[Space_Grotesk] font-bold text-[#908fa3] text-xl leading-tight">
                    {a.title}
                  </h3>
                  <p className="text-[#454557] text-sm font-bold mt-0.5">{a.days} días</p>
                </div>

                <p className="text-[#454557] text-sm leading-relaxed flex-1 italic">
                  &quot;{lockedMessages[a.id]}&quot;
                </p>

                <div className="h-px bg-[#252528]" />
                <p className="text-[10px] text-[#353439]">
                  Faltan {a.days - currentStreak} día{a.days - currentStreak !== 1 ? "s" : ""}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {unlocked.length === 0 && (
        <div className="px-5 text-center py-8 space-y-3">
          <Image src="/pulso.png" alt="" width={48} height={48} className="w-12 h-12 mx-auto opacity-20" />
          <p className="text-[#908fa3] text-sm">Completa tu primer día para desbloquear tu primer logro.</p>
        </div>
      )}
    </motion.div>
  );
}
