"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { logTrigger } from "@/lib/firestore";
import type { TriggerType } from "@/types";

const triggerOptions: { type: TriggerType; emoji: string; label: string }[] = [
  { type: "stress", emoji: "😤", label: "Estrés" },
  { type: "boredom", emoji: "😑", label: "Aburrimiento" },
  { type: "social", emoji: "🍻", label: "Social" },
  { type: "loneliness", emoji: "😔", label: "Soledad" },
  { type: "anxiety", emoji: "😰", label: "Ansiedad" },
  { type: "custom", emoji: "✏️", label: "Otro" },
];

interface TriggerLoggerProps {
  onLogged?: (type: TriggerType) => void;
}

export default function TriggerLogger({ onLogged }: TriggerLoggerProps) {
  const { user, activeHabit, moods } = useAppStore();
  const [selected, setSelected] = useState<TriggerType | null>(null);
  const [note, setNote] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [logged, setLogged] = useState(false);
  const [loading, setLoading] = useState(false);

  const habit = activeHabit();
  const lastMood = moods[0]?.mood ?? null;

  const handleLog = async () => {
    if (!selected || !user || !habit || loading) return;
    setLoading(true);

    try {
      const trigger = await logTrigger(user.uid, {
        habitId: habit.id,
        type: selected,
        customLabel: selected === "custom" ? customLabel.trim() || undefined : undefined,
        note: note.trim() || undefined,
        moodAtMoment: lastMood ?? undefined,
      });

      // El onSnapshot de Firestore actualiza la lista — no hacemos optimistic update
      // para evitar duplicados con la misma key
      onLogged?.(trigger.type);
      setLogged(true);

      setTimeout(() => {
        setLogged(false);
        setSelected(null);
        setNote("");
        setCustomLabel("");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#c6c4da]">
          Registrar Trigger
        </h3>
        <span className="text-[10px] text-[#3832f6]/60 font-bold">TAP PARA REGISTRAR</span>
      </div>

      <AnimatePresence mode="wait">
        {logged ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 bg-[#2a292e] rounded-2xl border border-white/5"
          >
            <p className="text-3xl mb-2">✓</p>
            <p className="text-[#22c55e] font-bold">Trigger registrado</p>
            <p className="text-[#908fa3] text-xs mt-1">Los patrones se analizan con IA</p>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {triggerOptions.map((opt) => (
                <motion.button
                  key={opt.type}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelected(opt.type)}
                  className={`flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 ${
                    selected === opt.type
                      ? "border-[#3832f6] bg-[#3832f6]/10 text-[#c1c1ff]"
                      : "border-white/5 bg-[#2a292e] text-[#e4e1e7]"
                  }`}
                >
                  <span className="text-2xl mb-2">{opt.emoji}</span>
                  <span className="font-[Space_Grotesk] font-bold text-sm">{opt.label}</span>
                </motion.button>
              ))}
            </div>

            {selected === "custom" && (
              <motion.input
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Describe el trigger..."
                className="w-full bg-[#353439] border border-white/10 rounded-xl px-4 py-3 text-[#e4e1e7] text-sm outline-none focus:border-[#3832f6]/50 placeholder:text-[#454557]"
              />
            )}

            <div className="bg-[#1f1f23] rounded-2xl p-1">
              <div className="bg-[#353439] rounded-xl p-4">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#c6c4da] block mb-2">
                  Contexto (opcional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="¿Qué pasó justo antes?"
                  rows={2}
                  className="w-full bg-transparent border-none outline-none text-[#e4e1e7] placeholder:text-[#908fa3]/50 text-sm resize-none font-[Manrope]"
                />
                <div className="flex justify-end mt-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleLog}
                    disabled={!selected || loading}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                      selected && !loading
                        ? "bg-[#3832f6] text-white"
                        : "bg-[#2a292e] text-[#908fa3] cursor-not-allowed"
                    }`}
                  >
                    {loading ? "Guardando..." : "Registrar"}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
