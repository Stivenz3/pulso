"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Plus, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { createHabit, saveInsight } from "@/lib/firestore";
import { analyzeHabit } from "@/lib/ai";
import type { HabitType } from "@/types";

// Función: emoji inteligente basado en nombre
export function getHabitEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/alcohol|trago|cerveza|vino|copa|beber|bebida/.test(n)) return "🍷";
  if (/nicotina|cigarr|tabaco|fumar|vapear|vaper/.test(n)) return "🚬";
  if (/droga|cocaína|heroína|marihuana|cannabis|metanfetamina|fentanilo/.test(n)) return "💊";
  if (/pornografía|porno/.test(n)) return "🔞";
  if (/procrastinación|procrastinar|pereza/.test(n)) return "⏳";
  if (/redes|instagram|tiktok|twitter|facebook|youtube/.test(n)) return "📱";
  if (/ejercicio|gym|deporte|correr|entrenar|pesas/.test(n)) return "💪";
  if (/meditar|meditación|mindfulness/.test(n)) return "🧘";
  if (/leer|lectura|libro/.test(n)) return "📚";
  if (/dormir|sueño|insomnio/.test(n)) return "😴";
  if (/azúcar|dulce|comida|comer|dieta/.test(n)) return "🍰";
  if (/juegos|videojuegos|gaming/.test(n)) return "🎮";
  if (/compras|gastar|dinero/.test(n)) return "💸";
  if (/café|cafeína|energizante/.test(n)) return "☕";
  if (/estudio|estudiar|aprender/.test(n)) return "📖";
  if (/gratitud|diario|escritura/.test(n)) return "✍️";
  if (/agua|hidratación/.test(n)) return "💧";
  return "⚡";
}

const PRESET_BAD: { name: string; type: HabitType }[] = [
  { name: "Alcohol", type: "sobriety" },
  { name: "Nicotina", type: "sobriety" },
  { name: "Drogas", type: "sobriety" },
  { name: "Pornografía", type: "sobriety" },
  { name: "Redes sociales", type: "sobriety" },
  { name: "Azúcar", type: "sobriety" },
];

const PRESET_GOOD: { name: string; type: HabitType }[] = [
  { name: "Ejercicio", type: "build" },
  { name: "Meditación", type: "build" },
  { name: "Lectura", type: "build" },
  { name: "Hidratación", type: "build" },
  { name: "Diario", type: "build" },
  { name: "Estudio", type: "build" },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "select" | "motivation";

export default function CreateHabitModal({ isOpen, onClose }: Props) {
  const { user } = useAppStore();

  const [step, setStep] = useState<Step>("select");
  const [selectedPreset, setSelectedPreset] = useState<{ name: string; type: HabitType } | null>(null);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<HabitType>("sobriety");
  const [motivation, setMotivation] = useState("");
  const [saving, setSaving] = useState(false);

  const habitName = selectedPreset?.name || customName.trim();
  const habitType = selectedPreset?.type || customType;
  const emoji = habitName ? getHabitEmoji(habitName) : "⚡";

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("select");
      setSelectedPreset(null);
      setCustomName("");
      setMotivation("");
      setSaving(false);
    }, 300);
  };

  const goToMotivation = () => {
    if (!habitName) return;
    setStep("motivation");
  };

  const handleCreate = async () => {
    if (!habitName || !user || saving) return;
    setSaving(true);
    try {
      await createHabit(user.uid, {
        name: habitName,
        type: habitType,
        targetType: habitType === "sobriety" ? "avoid" : "build",
        reason: motivation.trim(),
      });

      // Análisis inicial de IA al crear el hábito
      analyzeHabit(habitName, habitType, 0, [], [], 0)
        .then((message) => {
          if (message) {
            saveInsight(user.uid, {
              habitId: "",   // se actualizará cuando el snapshot traiga el id real
              type: "encouragement",
              message,
              confidence: 0.9,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-200 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1a1a1e] border border-white/8 rounded-3xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                {step === "motivation" && (
                  <button onClick={() => setStep("select")} className="text-[#908fa3] hover:text-white">
                    ←
                  </button>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">
                    {step === "select" ? "Nuevo hábito" : "Tu motivación"}
                  </p>
                  <h3 className="font-[Space_Grotesk] font-bold text-lg text-white">
                    {step === "select" ? "¿Qué quieres controlar?" : `${emoji} ${habitName}`}
                  </h3>
                </div>
              </div>
              <button onClick={handleClose} className="text-[#908fa3] hover:text-white p-1" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-5 pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === "select" ? (
                  <motion.div key="select" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
                    {/* Presupuestos — dejar */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#ffb4a1] mb-2">
                        🚫 Quiero dejar
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_BAD.map((p) => (
                          <motion.button
                            key={p.name}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setSelectedPreset(p); setCustomName(""); }}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition-all ${
                              selectedPreset?.name === p.name
                                ? "border-[#3832f6] bg-[#3832f6]/10 text-white"
                                : "border-white/8 bg-[#252528] text-[#908fa3] hover:border-white/20"
                            }`}
                          >
                            <span>{getHabitEmoji(p.name)}</span>
                            <span className="truncate">{p.name}</span>
                            {selectedPreset?.name === p.name && <Check size={12} className="text-[#3832f6] ml-auto shrink-0" />}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Presupuestos — construir */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#86efac] mb-2">
                        ✅ Quiero construir
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_GOOD.map((p) => (
                          <motion.button
                            key={p.name}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { setSelectedPreset(p); setCustomName(""); }}
                            className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-bold transition-all ${
                              selectedPreset?.name === p.name
                                ? "border-[#22c55e] bg-[#22c55e]/10 text-white"
                                : "border-white/8 bg-[#252528] text-[#908fa3] hover:border-white/20"
                            }`}
                          >
                            <span>{getHabitEmoji(p.name)}</span>
                            <span className="truncate">{p.name}</span>
                            {selectedPreset?.name === p.name && <Check size={12} className="text-[#22c55e] ml-auto shrink-0" />}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Custom */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3]">
                        ✏️ Personalizado
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => { setCustomName(e.target.value); setSelectedPreset(null); }}
                          placeholder="Nombre del hábito..."
                          className="flex-1 bg-[#252528] border border-white/8 rounded-xl px-3 py-3 text-[#e4e1e7] text-sm outline-none focus:border-[#3832f6]/50 placeholder:text-[#454557]"
                        />
                        {customName && !selectedPreset && (
                          <div className="flex items-center gap-1">
                            {(["sobriety", "build"] as HabitType[]).map((t) => (
                              <button
                                key={t}
                                onClick={() => setCustomType(t)}
                                className={`px-2 py-3 rounded-xl text-[10px] font-bold border transition-all ${
                                  customType === t ? "border-[#3832f6] bg-[#3832f6]/10 text-[#c1c1ff]" : "border-white/8 bg-[#252528] text-[#908fa3]"
                                }`}
                              >
                                {t === "sobriety" ? "Dejar" : "Hacer"}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={goToMotivation}
                      disabled={!habitName}
                      className={`w-full py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 transition-all ${
                        habitName ? "bg-[#3832f6] text-white shadow-[0_8px_24px_rgba(56,50,246,0.3)]" : "bg-[#252528] text-[#454557]"
                      }`}
                    >
                      Continuar <ArrowRight size={18} />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div key="motivation" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
                    <div className="bg-[#252528] border border-white/8 rounded-2xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-2">
                        ¿Por qué quieres {habitType === "sobriety" ? "dejar" : "construir"} este hábito?
                      </p>
                      <textarea
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        placeholder={
                          habitType === "sobriety"
                            ? "Ej: Quiero recuperar mi salud y estar presente para mi familia..."
                            : "Ej: Quiero sentirme con más energía y disciplina cada día..."
                        }
                        rows={4}
                        className="w-full bg-transparent text-[#e4e1e7] text-sm placeholder:text-[#454557] outline-none italic leading-relaxed resize-none font-[Manrope]"
                      />
                    </div>

                    {motivation.length > 15 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#3832f6]/5 border border-[#3832f6]/20 rounded-2xl p-4 text-center"
                      >
                        <p className="text-[#c1c1ff] text-sm italic leading-relaxed">
                          &quot;{motivation}&quot;
                        </p>
                        <p className="text-[#3832f6] text-[10px] font-bold uppercase tracking-widest mt-2">
                          Esta será tu ancla
                        </p>
                      </motion.div>
                    )}

                    <p className="text-[#454557] text-xs text-center">
                      Puedes dejarlo vacío y añadirlo después desde tu perfil
                    </p>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleCreate}
                      disabled={saving}
                      className="w-full bg-[#3832f6] text-white py-4 rounded-2xl font-[Space_Grotesk] font-bold text-base flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(56,50,246,0.3)] disabled:opacity-60"
                    >
                      {saving ? (
                        <span className="animate-pulse">Creando...</span>
                      ) : (
                        <><Plus size={18} /> Crear {emoji} {habitName}</>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
