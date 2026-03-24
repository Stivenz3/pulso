"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { analyzeHabit, getEmotionCorrelation } from "@/lib/ai";
import { saveInsight } from "@/lib/firestore";
import { Zap, Brain, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { HabitDoc } from "@/types";

import type { InsightType } from "@/types";

const insightTypeColors: Record<InsightType, { label: string; color: string; bg: string; border: string }> = {
  pattern: { label: "Patrón", color: "#c1c1ff", bg: "rgba(56,50,246,0.08)", border: "rgba(56,50,246,0.2)" },
  warning: { label: "Alerta", color: "#ffb4a1", bg: "rgba(168,39,0,0.08)", border: "rgba(168,39,0,0.2)" },
  encouragement: { label: "Ánimo", color: "#86efac", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)" },
  suggestion: { label: "Sugerencia", color: "#fde68a", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.2)" },
  prediction: { label: "Predicción", color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
};

interface AIInsightsPanelProps {
  habit?: HabitDoc;
  currentStreak?: number;
}

export default function AIInsightsPanel({
  habit,
  currentStreak = 0,
}: AIInsightsPanelProps) {
  const { user, insights, triggers, moods, relapses, addInsightOptimistic, markInsightReadOptimistic } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [correlationInsight, setCorrelationInsight] = useState<string | null>(null);

  const requestInsight = async () => {
    if (!habit || !user || loading) return;
    setLoading(true);
    try {
      // Construir descripción rica de cada trigger: label + nota si existe
      const recentTriggers = triggers.slice(0, 8).map((t) => {
        const label = t.type === "custom" && t.customLabel ? t.customLabel : t.type;
        return t.note ? `${label} ("${t.note}")` : label;
      });
      const recentMoods = moods.slice(0, 8).map((m) => `${m.mood}(intensidad:${m.intensity})`);
      // Include relapse notes for deeper AI personalization
      const habitRelapses = relapses?.filter((r) => r.habitId === habit.id) ?? [];
      const relapseNotes = habitRelapses
        .filter((r) => r.note)
        .slice(0, 5)
        .map((r) => r.note as string);

      const message = await analyzeHabit(
        habit.name,
        habit.type,
        currentStreak,
        recentTriggers,
        recentMoods,
        habit.longestStreak,
        habitRelapses.length,
        relapseNotes
      );
      // Guardar en Firestore Y en store local
      const saved = await saveInsight(user.uid, {
        habitId: habit.id,
        type: "suggestion",
        message,
        confidence: 0.85,
      });
      addInsightOptimistic(saved);
    } finally {
      setLoading(false);
    }
  };

  const requestCorrelation = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const recentMoods = moods.slice(0, 10).map((m) => `${m.mood}(intensidad:${m.intensity})`);
      // Incluir customLabel + nota de cada trigger
      const recentTriggers = triggers.slice(0, 8).map((t) => {
        const label = t.type === "custom" && t.customLabel ? t.customLabel : t.type;
        return t.note ? `${label} ("${t.note}")` : label;
      });
      const result = await getEmotionCorrelation(recentMoods, recentTriggers);
      setCorrelationInsight(result);
      // Guardar correlación como insight de tipo "pattern"
      const saved = await saveInsight(user.uid, {
        habitId: habit?.id ?? "",
        type: "pattern",
        message: result,
        confidence: 0.8,
      });
      addInsightOptimistic(saved);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = insights.filter((i) => !i.isRead).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[#c1c1ff]"
        >
          <Zap size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">IA Insights</span>
          {unreadCount > 0 && (
            <span className="bg-[#3832f6] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={requestCorrelation}
            disabled={loading}
            className="text-[10px] font-bold uppercase tracking-wide text-[#908fa3] hover:text-[#c1c1ff] px-3 py-1.5 bg-[#2a292e] rounded-full"
          >
            Correlación
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={requestInsight}
            disabled={loading || !habit}
            className="text-[10px] font-bold uppercase tracking-wide text-white bg-[#3832f6] px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            {loading ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />}
            Analizar
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {correlationInsight && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#eab308]/5 border border-[#eab308]/20 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <Brain size={12} className="text-[#fde68a]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#eab308]">
                Correlación Emocional
              </p>
            </div>
            <p className="text-[#e4e1e7] text-sm leading-relaxed">{correlationInsight}</p>
          </motion.div>
        )}

        {expanded &&
          insights.slice(0, 5).map((insight, i) => {
            const colors = insightTypeColors[insight.type] || insightTypeColors.suggestion;
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => markInsightReadOptimistic(insight.id)}
                className="rounded-2xl p-4 border cursor-pointer"
                style={{ backgroundColor: colors.bg, borderColor: colors.border }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.color }}>
                    {colors.label}
                  </span>
                  {!insight.isRead && (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.color }} />
                  )}
                </div>
                <p className="text-[#e4e1e7] text-sm leading-relaxed">{insight.message}</p>
              </motion.div>
            );
          })}
      </AnimatePresence>

      {insights.length === 0 && (
        <p className="text-[#908fa3] text-xs text-center py-2">
          Pulsa &quot;Analizar&quot; para obtener tu primer insight personalizado
        </p>
      )}
    </div>
  );
}
