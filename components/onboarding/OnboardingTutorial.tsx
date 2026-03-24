"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createHabit, updateUserDoc } from "@/lib/firestore";
import {
  ArrowRight, Home, TrendingUp, AlertTriangle, User,
  Plus, X, Flame, Brain, Smile,
} from "lucide-react";
import type { HabitType } from "@/types";

const HABIT_OPTIONS = [
  { name: "Alcohol", type: "sobriety" as HabitType, emoji: "🍷" },
  { name: "Nicotina", type: "sobriety" as HabitType, emoji: "🚬" },
  { name: "Drogas", type: "sobriety" as HabitType, emoji: "💊" },
  { name: "Pornografía", type: "sobriety" as HabitType, emoji: "🚫" },
  { name: "Procrastinación", type: "build" as HabitType, emoji: "⏳" },
  { name: "Redes sociales", type: "build" as HabitType, emoji: "📱" },
];

export default function OnboardingTutorial() {
  const router = useRouter();
  const { completeOnboarding, user, addHabitOptimistic } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState("");
  const [whyText, setWhyText] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleHabit = (name: string) =>
    setSelectedHabits((prev) =>
      prev.includes(name) ? prev.filter((h) => h !== name) : [...prev, name]
    );

  const handleFinish = async () => {
    if (!user || saving) return;
    setSaving(true);

    try {
      const habitsToCreate = [
        ...HABIT_OPTIONS.filter((h) => selectedHabits.includes(h.name)),
        ...(customHabit.trim()
          ? [{ name: customHabit.trim(), type: "build" as HabitType, emoji: "⚡" }]
          : []),
      ];

      for (const h of habitsToCreate) {
        const habit = await createHabit(user.uid, {
          name: h.name,
          type: h.type,
          targetType: h.type === "sobriety" ? "avoid" : "build",
          reason: whyText,
        });
        addHabitOptimistic(habit);
      }

      await updateUserDoc(user.uid, { onboardingCompleted: true });

      completeOnboarding();
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      id: "welcome",
      content: (
        <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="flex flex-col items-center text-center space-y-6">
          <motion.div initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}>
            <Image src="/pulso.png" alt="Pulso" width={96} height={96} className="w-24 h-24" />
          </motion.div>
          <div>
            <h2 className="font-[Space_Grotesk] font-black text-3xl text-white">
              Bienvenido a <span className="text-[#3832f6] italic">Pulso</span>
            </h2>
            <p className="text-[#908fa3] text-base mt-3 leading-relaxed max-w-xs">
              Tu sistema de control de hábitos. Aquí no hay juicios, solo progreso.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full pt-2">
            {[
              { icon: Flame, label: "Rachas", desc: "Día a día" },
              { icon: Brain, label: "IA", desc: "Insights" },
              { icon: Smile, label: "Estado", desc: "Emocional" },
            ].map((item) => (
              <div key={item.label} className="bg-[#1f1f23] border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-2">
                <item.icon size={20} className="text-[#3832f6]" strokeWidth={1.8} />
                <span className="text-white text-xs font-bold">{item.label}</span>
                <span className="text-[#908fa3] text-[10px]">{item.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ),
    },
    {
      id: "habit-select",
      content: (
        <motion.div key="habit-select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="space-y-5 w-full">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Paso 1 de 4</span>
            <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white mt-2">¿Qué quieres controlar?</h2>
            <p className="text-[#908fa3] text-sm mt-1">Selecciona uno o más hábitos</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {HABIT_OPTIONS.map((opt) => (
              <motion.button key={opt.name} whileTap={{ scale: 0.95 }} onClick={() => toggleHabit(opt.name)}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                  selectedHabits.includes(opt.name)
                    ? "bg-[#3832f6]/10 border-[#3832f6] text-white"
                    : "bg-[#1f1f23] border-white/8 text-[#908fa3]"
                }`}>
                <span className="text-2xl">{opt.emoji}</span>
                <span className="font-[Space_Grotesk] font-bold text-sm">{opt.name}</span>
                {selectedHabits.includes(opt.name) && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-[#3832f6] flex items-center justify-center">
                    <X size={8} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
          <div className="bg-[#1f1f23] border border-white/8 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Plus size={16} className="text-[#908fa3] shrink-0" />
            <input type="text" value={customHabit} onChange={(e) => setCustomHabit(e.target.value)}
              placeholder="Otro hábito personalizado..."
              className="flex-1 bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none font-[Manrope]" />
          </div>
        </motion.div>
      ),
    },
    {
      id: "why",
      content: (
        <motion.div key="why" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="space-y-5 w-full">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Paso 2 de 4</span>
            <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white mt-2">¿Por qué empiezas?</h2>
            <p className="text-[#908fa3] text-sm mt-1 leading-relaxed">
              Esta razón aparecerá cuando estés a punto de ceder.
            </p>
          </div>
          <div className="bg-[#1f1f23] border border-[#3832f6]/20 rounded-2xl p-5">
            <textarea value={whyText} onChange={(e) => setWhyText(e.target.value)}
              placeholder="Ej: Quiero estar presente para mis hijos y recuperar mi salud..."
              rows={4}
              className="w-full bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none italic leading-relaxed resize-none font-[Manrope]" />
          </div>
          {whyText.length > 20 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[#3832f6]/5 border border-[#3832f6]/20 rounded-2xl p-4 text-center">
              <p className="text-[#c1c1ff] text-sm italic">&quot;{whyText}&quot;</p>
              <p className="text-[#3832f6] text-[10px] font-bold uppercase tracking-widest mt-2">Esta es tu ancla</p>
            </motion.div>
          )}
        </motion.div>
      ),
    },
    {
      id: "tour",
      content: (
        <motion.div key="tour" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="space-y-5 w-full">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Paso 3 de 4 — Recorrido</span>
            <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white mt-2">Tu centro de control</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: Home, label: "Home", desc: "Tu racha actual, estado de ánimo y modo de emergencia." },
              { icon: TrendingUp, label: "Progress", desc: "Gráficas de tu evolución con proyecciones de IA." },
              { icon: AlertTriangle, label: "Triggers", desc: "Registra qué te lleva al límite. IA detecta patrones." },
              { icon: User, label: "Perfil", desc: "Gestiona hábitos, motivación y preferencias." },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl border bg-[#1f1f23] border-white/5">
                <div className="w-10 h-10 rounded-xl bg-[#3832f6]/10 flex items-center justify-center shrink-0">
                  <item.icon size={20} className="text-[#c1c1ff]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="font-[Space_Grotesk] font-bold text-white text-sm">{item.label}</p>
                  <p className="text-[#908fa3] text-xs mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ),
    },
    {
      id: "risk",
      content: (
        <motion.div key="risk" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="space-y-5 w-full">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Paso 4 de 4 — Función clave</span>
            <h2 className="font-[Space_Grotesk] font-bold text-2xl text-white mt-2">Modo Riesgo</h2>
            <p className="text-[#908fa3] text-sm mt-1 leading-relaxed">
              Cuando sientas que estás a punto de ceder, este botón te ayuda a resistir.
            </p>
          </div>
          <div className="bg-[#a82700]/10 border border-[#a82700]/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#a82700]/20 flex items-center justify-center">
                <AlertTriangle size={20} className="text-[#ffb4a1]" />
              </div>
              <div>
                <p className="font-[Space_Grotesk] font-bold text-[#ffb4a1]">Estoy en riesgo</p>
                <p className="text-[#908fa3] text-xs">Actívalo desde el Home</p>
              </div>
            </div>
            {["Muestra tu motivación original", "Calcula cuántos días perderías", "Guía de respiración de 30s", "Botón para resistir o reportar recaída"].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.2 }}
                className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3832f6]" />
                <p className="text-[#c6c4da] text-sm">{item}</p>
              </motion.div>
            ))}
          </div>
          <div className="bg-[#1f1f23] border border-white/5 rounded-2xl p-4 flex items-start gap-3">
            <Brain size={18} className="text-[#c1c1ff] shrink-0 mt-0.5" />
            <p className="text-[#908fa3] text-sm leading-relaxed">
              La IA analiza triggers y emociones para anticipar riesgo y enviarte alertas proactivas.
            </p>
          </div>
        </motion.div>
      ),
    },
    {
      id: "ready",
      content: (
        <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
          className="flex flex-col items-center text-center space-y-6">
          <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ delay: 0.5, duration: 0.6 }}>
            <Image src="/pulso.png" alt="Pulso" width={80} height={80} className="w-20 h-20" />
          </motion.div>
          <div className="space-y-3">
            <h2 className="font-[Space_Grotesk] font-black text-3xl text-white">¡Listo para empezar!</h2>
            <p className="text-[#908fa3] text-base leading-relaxed max-w-xs">
              No empiezas de cero, empiezas con determinación.
            </p>
          </div>
          <div className="bg-[#3832f6]/5 border border-[#3832f6]/20 rounded-2xl p-5 w-full">
            <p className="text-[#c1c1ff] text-sm italic leading-relaxed">
              &quot;La disciplina es la forma más pura de amor propio.&quot;
            </p>
          </div>
        </motion.div>
      ),
    },
  ];

  const isLastStep = step === steps.length - 1;
  const canAdvance = step === 1 ? selectedHabits.length > 0 || customHabit.trim().length > 0 : true;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-[#0b0b0f]/95 backdrop-blur-xl flex flex-col">
      {step < 2 && (
        <button onClick={() => {
            if (user) updateUserDoc(user.uid, { onboardingCompleted: true }).catch(() => {});
            completeOnboarding();
          }}
          className="absolute top-5 right-5 text-[#454557] text-xs font-bold uppercase tracking-widest hover:text-[#908fa3] z-10">
          Saltar
        </button>
      )}

      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1f1f23]">
        <motion.div animate={{ width: `${((step + 1) / steps.length) * 100}%` }} transition={{ duration: 0.4 }}
          className="h-full bg-[#3832f6]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-4 overflow-y-auto">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">{steps[step].content}</AnimatePresence>
        </div>
      </div>

      <div className="px-6 pb-10 pt-4 space-y-3 max-w-sm mx-auto w-full">
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-[#3832f6]" : i < step ? "w-1.5 bg-[#3832f6]/40" : "w-1.5 bg-[#353439]"
            }`} />
          ))}
        </div>

        {isLastStep ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleFinish} disabled={saving}
            className="w-full bg-[#3832f6] text-white py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(56,50,246,0.35)] disabled:opacity-60">
            {saving ? "Creando tu perfil..." : <><span>Empezar mi camino</span><ArrowRight size={18} /></>}
          </motion.button>
        ) : (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}
            className={`w-full py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 ${
              canAdvance ? "bg-[#3832f6] text-white" : "bg-[#1f1f23] text-[#454557]"
            }`}>
            Continuar <ArrowRight size={18} />
          </motion.button>
        )}

        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="w-full text-[#908fa3] text-sm py-2 hover:text-[#c6c4da]">
            Atrás
          </button>
        )}
      </div>
    </motion.div>
  );
}
