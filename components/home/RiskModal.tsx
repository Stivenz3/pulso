"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wind, Shield, Heart } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { recordRelapse } from "@/lib/firestore";
import { notifyEvent } from "@/lib/notifyEvent";

interface RiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStreak: number;
  whyIStarted: string;
  habitName: string;
  habitId: string;
}

export default function RiskModal({
  isOpen, onClose, currentStreak, whyIStarted, habitName, habitId,
}: RiskModalProps) {
  const { user, updateHabitOptimistic, relapses } = useAppStore();
  const [phase, setPhase] = useState<"warning" | "breathing" | "choice" | "recovery">("warning");
  const [breathSeconds, setBreathSeconds] = useState(0);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [relapseNote, setRelapseNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const handleResist = useCallback(() => {
    if (user?.uid) notifyEvent(user.uid, "resist_win");
    onClose();
    setPhase("warning");
  }, [onClose, user]);

  const handleRelapse = async () => {
    if (!user || saving) return;
    setSaving(true);
    const note = relapseNote.trim();
    try {
      await recordRelapse(user.uid, { habitId, note: note || undefined });
      updateHabitOptimistic(habitId, { currentStreak: 0, lastRelapseDate: new Date() });

      // Fetch AI recovery message using the relapse note
      const totalRelapses = (relapses?.length ?? 0) + 1;
      fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "relapse_recovery",
          habitName,
          currentStreak,
          lastRelapseNote: note || null,
          totalRelapses,
        }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.result) setRecoveryMessage(d.result); })
        .catch(() => {});

      setPhase("recovery");
      // Notificación de recuperación — llega ~1 minuto después para no interrumpir el momento
      if (user?.uid) {
        setTimeout(() => notifyEvent(user!.uid, "relapse_recovery"), 60_000);
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (phase !== "breathing") return;
    const timer = setInterval(() => {
      setBreathSeconds((s) => {
        if (s >= 29) { clearInterval(timer); setPhase("choice"); return 30; }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const cycle = breathSeconds % 12;
    if (cycle < 4) setBreathPhase("inhale");
    else if (cycle < 7) setBreathPhase("hold");
    else setBreathPhase("exhale");
  }, [breathSeconds]);

  useEffect(() => {
    if (!isOpen) {
      setPhase("warning");
      setBreathSeconds(0);
      setRelapseNote("");
      setRecoveryMessage(null);
    }
  }, [isOpen]);

  const breathLabels = { inhale: "Inhala...", hold: "Sostén...", exhale: "Exhala..." };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[#0b0b0f]/95 backdrop-blur-xl flex flex-col items-center justify-center px-6"
        >
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white">
            <X size={24} />
          </motion.button>

          <AnimatePresence mode="wait">
            {phase === "warning" && (
              <motion.div key="warning" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm text-center space-y-6">
                <div className="inline-flex items-center gap-2 bg-[#a82700]/20 border border-[#a82700]/30 px-4 py-2 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#ffb4a1] animate-pulse" />
                  <span className="text-[#ffb4a1] text-xs font-bold uppercase tracking-widest">Modo Riesgo</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[#908fa3] text-xs uppercase tracking-widest font-bold">Recuerda por qué empezaste</p>
                  <p className="text-white text-xl font-[Space_Grotesk] font-bold leading-snug">
                    &quot;{whyIStarted}&quot;
                  </p>
                </div>
                <div className="bg-[#a82700]/10 border border-[#a82700]/20 rounded-2xl p-6">
                  <p className="text-[#908fa3] text-xs uppercase tracking-widest mb-2">Si caes hoy, pierdes</p>
                  <p className="text-[#ffb4a1] font-[Space_Grotesk] font-bold text-5xl">{currentStreak}</p>
                  <p className="text-[#ffb4a1] font-bold text-lg mt-1">días de {habitName}</p>
                </div>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setPhase("breathing")}
                  className="w-full flex items-center justify-center gap-3 bg-[#3832f6] text-white py-4 rounded-2xl font-bold text-base">
                  <Wind size={20} /> Ejercicio de respiración
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setPhase("choice")}
                  className="w-full text-[#908fa3] text-sm py-2">
                  Saltar respiración
                </motion.button>
              </motion.div>
            )}

            {phase === "breathing" && (
              <motion.div key="breathing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full max-w-sm text-center space-y-8">
                <p className="text-[#908fa3] text-xs uppercase tracking-widest font-bold">
                  Ciclo {Math.floor(breathSeconds / 12) + 1} — Respira
                </p>
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ scale: breathPhase === "inhale" ? 1.4 : breathPhase === "hold" ? 1.4 : 1 }}
                    transition={{ duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 3 : 5, ease: "easeInOut" }}
                    className="w-40 h-40 rounded-full bg-[#3832f6]/10 border-2 border-[#3832f6]/30 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-[#3832f6]/20 border border-[#3832f6]/50 flex items-center justify-center">
                      <Wind size={28} className="text-[#c1c1ff]" />
                    </div>
                  </motion.div>
                </div>
                <motion.p key={breathPhase} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="text-white font-[Space_Grotesk] font-bold text-3xl">
                  {breathLabels[breathPhase]}
                </motion.p>
                <div className="w-full h-1.5 bg-[#2a292e] rounded-full overflow-hidden">
                  <motion.div className="h-full bg-[#3832f6] rounded-full" style={{ width: `${(breathSeconds / 30) * 100}%` }} />
                </div>
                <p className="text-[#908fa3] text-sm">{30 - breathSeconds}s restantes</p>
              </motion.div>
            )}

            {phase === "choice" && (
              <motion.div key="choice" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="w-full max-w-sm text-center space-y-5">
                <Shield size={48} className="text-[#3832f6] mx-auto" />
                <div>
                  <h2 className="text-white font-[Space_Grotesk] font-bold text-2xl">Tienes la fuerza</h2>
                  <p className="text-[#908fa3] text-sm mt-2">
                    {currentStreak} días de trabajo no se borran fácilmente.
                  </p>
                </div>
                <motion.button whileTap={{ scale: 0.96 }} onClick={handleResist}
                  className="w-full bg-[#3832f6] text-white py-5 rounded-2xl font-[Space_Grotesk] font-bold text-lg shadow-[0_0_40px_rgba(56,50,246,0.3)]">
                  Resistir — Sigo firme
                </motion.button>
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <p className="text-[#454557] text-xs uppercase tracking-widest">¿Hubo recaída?</p>
                  <textarea value={relapseNote} onChange={(e) => setRelapseNote(e.target.value)}
                    placeholder="¿Qué pasó? (opcional)" rows={2}
                    className="w-full bg-[#1f1f23] border border-white/5 rounded-xl p-3 text-[#e4e1e7] text-sm resize-none outline-none placeholder:text-[#454557] font-[Manrope]" />
                  <button onClick={handleRelapse} disabled={saving}
                    className="w-full text-[#ffb4a1] text-sm py-2 hover:text-[#a82700] transition-colors disabled:opacity-50">
                    {saving ? "Registrando..." : "Reportar recaída y reiniciar racha"}
                  </button>
                </div>
              </motion.div>
            )}
            {phase === "recovery" && (
              <motion.div key="recovery" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full max-w-sm text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  <Heart size={52} className="text-[#ffb4a1] mx-auto" />
                </motion.div>
                <div className="space-y-2">
                  <p className="text-[#ffb4a1] text-xs font-bold uppercase tracking-widest">
                    Día 0 — Nuevo comienzo
                  </p>
                  <h2 className="text-white font-[Space_Grotesk] font-bold text-2xl leading-snug">
                    Caer no es fracasar.
                  </h2>
                </div>

                {/* Mensaje IA personalizado */}
                <div className="bg-[#1f1f23] border border-[#3832f6]/20 rounded-2xl p-5 text-left">
                  {recoveryMessage ? (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="text-[#c6c4da] text-sm leading-relaxed italic">
                      &quot;{recoveryMessage}&quot;
                    </motion.p>
                  ) : (
                    <p className="text-[#454557] text-sm animate-pulse">La IA está preparando tu mensaje...</p>
                  )}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mt-3">
                    ✦ Pulso IA
                  </p>
                </div>

                {relapseNote ? (
                  <div className="bg-[#1a1a1e] border border-white/5 rounded-xl p-3 text-left">
                    <p className="text-[10px] text-[#454557] uppercase tracking-widest mb-1">Lo que pasó</p>
                    <p className="text-[#908fa3] text-xs italic">&quot;{relapseNote}&quot;</p>
                  </div>
                ) : null}

                <motion.button whileTap={{ scale: 0.97 }} onClick={() => { onClose(); setPhase("warning"); }}
                  className="w-full bg-[#3832f6] text-white py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base">
                  Empezar de nuevo ahora
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
