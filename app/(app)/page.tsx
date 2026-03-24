"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  DollarSign,
  Heart,
  Zap,
  BookOpen,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import StreakCard from "@/components/home/StreakCard";
import RiskModal from "@/components/home/RiskModal";
import MoodTracker from "@/components/home/MoodTracker";
import AchievementToast, {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  getNextAchievement,
  type Achievement,
} from "@/components/home/AchievementToast";
import { useAppStore } from "@/lib/store";
import { getDailyInsight } from "@/lib/ai";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

export default function HomePage() {
  const router = useRouter();
  const { habits, activeHabitId, user, insights } = useAppStore();
  const [riskOpen, setRiskOpen] = useState(false);
  const [dailyInsight, setDailyInsight] = useState<string | null>(null);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);
  const prevStreakRef = useRef<number | null>(null);

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const currentStreak = activeHabit?.currentStreak ?? 0;
  const longestStreak = activeHabit?.longestStreak ?? 0;

  const nextMilestones = [30, 60, 90, 180, 365];
  const nextMilestone = nextMilestones.find((m) => m > currentStreak) ?? 365;
  const milestonePct = Math.min(100, Math.round((currentStreak / nextMilestone) * 100));
  const daysLeft = nextMilestone - currentStreak;

  const latestInsight = insights.find((i) => !i.isRead) || insights[0];

  // Detect newly unlocked achievements when streak increases
  useEffect(() => {
    if (!activeHabit) return;
    const prev = prevStreakRef.current;
    prevStreakRef.current = currentStreak;

    if (prev === null) return; // skip on first mount

    if (currentStreak > (prev ?? 0)) {
      const newlyUnlocked = ACHIEVEMENTS.find(
        (a) => a.days === currentStreak
      );
      if (newlyUnlocked) {
        setPendingAchievement(newlyUnlocked);
      }
    }
  }, [currentStreak, activeHabit]);

  const unlockedAchievements = getUnlockedAchievements(currentStreak);
  const nextAchievement = getNextAchievement(currentStreak);

  useEffect(() => {
    if (activeHabit && currentStreak >= 0) {
      getDailyInsight(activeHabit.name, currentStreak).then(setDailyInsight);
    }
  }, [activeHabit?.id, currentStreak]);

  // No habits yet
  if (!activeHabit) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180 }}
        >
          <Image src="/pulso.png" alt="Pulso" width={80} height={80} className="w-20 h-20 mx-auto opacity-80" />
        </motion.div>
        <div>
          <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white">
            Hola{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-[#908fa3] text-sm mt-2 leading-relaxed max-w-xs">
            Aún no tienes hábitos configurados. Crea tu primer hábito para empezar tu racha.
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/profile")}
          className="bg-[#3832f6] text-white px-8 py-4 rounded-2xl font-[Space_Grotesk] font-bold flex items-center gap-2 shadow-[0_8px_32px_rgba(56,50,246,0.3)]"
        >
          <Plus size={18} />
          Crear mi primer hábito
        </motion.button>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="px-5 space-y-6 pb-6"
      >
        {/* Streak hero */}
        <StreakCard
          days={currentStreak}
          habitName={activeHabit.name}
          motivationalMessage={
            dailyInsight || "La disciplina es la forma más pura de amor propio."
          }
        />

        {/* Risk button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setRiskOpen(true)}
          className="w-full bg-[#a82700] text-[#ffc0b0] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(168,39,0,0.2)] font-[Space_Grotesk] font-bold text-lg"
        >
          <AlertTriangle size={22} fill="rgba(255,176,160,0.2)" />
          Estoy en riesgo
        </motion.button>

        {/* Mood tracker */}
        <MoodTracker />

        {/* Stats bento */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#2a292e] p-5 rounded-2xl flex flex-col justify-between aspect-square border border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-[#3832f6]/10 flex items-center justify-center">
              <DollarSign size={20} className="text-[#c1c1ff]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-1">
                Racha más larga
              </p>
              <p className="font-[Space_Grotesk] font-bold text-2xl text-white">
                {longestStreak} días
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#2a292e] p-5 rounded-2xl flex flex-col justify-between aspect-square border border-white/5"
          >
            <div className="w-10 h-10 rounded-full bg-[#2e26d3]/30 flex items-center justify-center">
              <Heart size={20} className="text-[#c1c1ff]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-1">
                Días limpios total
              </p>
              <p className="font-[Space_Grotesk] font-bold text-2xl text-white">
                {activeHabit?.cleanDaysTotal ?? currentStreak}
              </p>
            </div>
          </motion.div>

          {/* Milestone card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 bg-gradient-to-br from-[#2a292e] to-[#0e0e12] p-6 rounded-2xl relative overflow-hidden border border-white/5"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3832f6]/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="relative z-10">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-1">
                    Próximo Hito
                  </p>
                  <h3 className="font-[Space_Grotesk] font-bold text-lg text-white">
                    {nextMilestone} Días
                  </h3>
                </div>
                <p className="font-[Manrope] text-sm text-[#c1c1ff] font-bold">
                  {daysLeft} días más
                </p>
              </div>
              <div className="w-full h-2 bg-[#1f1f23] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${milestonePct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                  className="h-full bg-[#3832f6] rounded-full"
                />
              </div>
              <p className="text-[#908fa3] text-xs mt-2">{milestonePct}% completado</p>
            </div>
          </motion.div>
        </div>

        {/* Reflection */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1b1b1f] p-5 rounded-2xl flex items-start gap-4 border border-white/5"
        >
          <div className="w-11 h-11 rounded-xl bg-[#353439] flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-[#c6c4da]" strokeWidth={1.8} />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="font-[Space_Grotesk] font-bold text-white text-sm">
              Bitácora de hoy
            </h4>
            <p className="font-[Manrope] text-xs text-[#908fa3] leading-relaxed">
              {currentStreak === 0
                ? "Hoy es el día 1. Todo gran cambio empieza aquí."
                : `¿Cómo te sientes en este día ${currentStreak}?`}
            </p>
            <button
              onClick={() => router.push("/triggers")}
              className="pt-2 text-[#c1c1ff] font-bold text-xs flex items-center gap-1 uppercase tracking-wider"
            >
              Registrar pulso <ArrowRight size={12} />
            </button>
          </div>
        </motion.div>

        {/* AI Insight */}
        {latestInsight && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#3832f6]/5 border border-[#3832f6]/20 p-5 rounded-2xl flex items-start gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-[#3832f6]/10 flex items-center justify-center shrink-0">
              <Zap size={20} className="text-[#c1c1ff]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mb-1">
                IA · Insight
              </p>
              <p className="text-[#e4e1e7] text-sm leading-relaxed">
                {latestInsight.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Logros — acceso rápido */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/achievements")}
          className="w-full bg-[#1b1b1f] border border-white/5 rounded-2xl p-4 flex items-center gap-4 text-left"
        >
          <div className="flex -space-x-1.5 shrink-0">
            {unlockedAchievements.slice(-3).map((a) => (
              <span key={a.id} className="text-xl w-8 h-8 flex items-center justify-center bg-[#252528] rounded-full border-2 border-[#1b1b1f]">
                {a.emoji}
              </span>
            ))}
            {unlockedAchievements.length === 0 && (
              <span className="text-xl w-8 h-8 flex items-center justify-center bg-[#252528] rounded-full border-2 border-[#1b1b1f] opacity-40">🏅</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-[Space_Grotesk] font-bold text-sm">
              {unlockedAchievements.length === 0
                ? "Sin logros aún"
                : `${unlockedAchievements.length} logro${unlockedAchievements.length > 1 ? "s" : ""} desbloqueado${unlockedAchievements.length > 1 ? "s" : ""}`}
            </p>
            <p className="text-[#908fa3] text-xs mt-0.5 truncate">
              {nextAchievement
                ? `Próximo: ${nextAchievement.emoji} ${nextAchievement.title} · ${nextAchievement.days - currentStreak}d`
                : "¡Todos los logros desbloqueados! 🌟"}
            </p>
          </div>
          <ArrowRight size={16} className="text-[#454557] shrink-0" />
        </motion.button>

        {/* Pulso brand watermark at bottom */}
        <div className="flex items-center justify-center gap-2 opacity-20 py-2">
          <Image src="/pulso.png" alt="" width={16} height={16} className="w-4 h-4" />
          <span className="font-[Space_Grotesk] font-black italic text-xs text-white">
            Pulso
          </span>
        </div>
      </motion.div>

      <RiskModal
        isOpen={riskOpen}
        onClose={() => setRiskOpen(false)}
        currentStreak={currentStreak}
        whyIStarted={activeHabit.reason || "Recuperar el control de mi vida, día a día."}
        habitName={activeHabit.name}
        habitId={activeHabit.id}
      />

      <AchievementToast
        achievement={pendingAchievement}
        onDone={() => setPendingAchievement(null)}
      />
    </>
  );
}
