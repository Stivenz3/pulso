"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { Trophy, Shield, AlertTriangle, TrendingUp, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getEmotionCorrelation } from "@/lib/ai";
import { toDate } from "@/lib/firestore";

const triggerLabels: Record<string, string> = {
  stress: "Estrés",
  boredom: "Aburrimiento",
  social: "Presión social",
  loneliness: "Soledad",
  anxiety: "Ansiedad",
  custom: "Personalizado",
};

function getTriggerDisplay(t: { type: string; customLabel?: string | null }) {
  return t.type === "custom" && t.customLabel ? t.customLabel : (triggerLabels[t.type] ?? t.type);
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { value: number }[] }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#2a292e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold shadow-xl">
        {payload[0].value} días
      </div>
    );
  }
  return null;
};

export default function ProgressPage() {
  const router = useRouter();
  const { habits, activeHabitId, triggers, moods, relapses } = useAppStore();
  const [correlation, setCorrelation] = useState<string | null>(null);

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const currentStreak = activeHabit?.currentStreak ?? 0;
  const longestStreak = activeHabit?.longestStreak ?? 0;
  const isBuild = activeHabit?.type === "build";

  // Filtrar TODOS los datos por el hábito activo
  const habitTriggers = triggers.filter((t) => t.habitId === activeHabit?.id);
  const habitMoods = moods.filter((m) => m.habitId === activeHabit?.id);
  const habitRelapses = relapses.filter((r) => r.habitId === activeHabit?.id);

  const recentTriggers = habitTriggers.slice(0, 5).map((t) => t.type);
  const recentMoods = habitMoods.slice(0, 5).map((m) => `${m.mood}(${m.intensity})`);

  useEffect(() => {
    if (habitMoods.length >= 3) {
      getEmotionCorrelation(recentMoods, recentTriggers).then(setCorrelation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habitMoods.length]);

  // Streak chart — evolución semanal simulada desde la racha actual
  const chartData = Array.from({ length: 8 }, (_, i) => ({
    week: `S${i + 1}`,
    dias: i === 7 ? currentStreak : Math.max(0, currentStreak - (7 - i) * 3),
  }));

  // Recaídas reales agrupadas por mes
  const relapseByMonth: Record<string, number> = {};
  for (const r of habitRelapses) {
    const d = toDate(r.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    relapseByMonth[key] = (relapseByMonth[key] || 0) + 1;
  }
  const last3Months = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (2 - i));
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    return {
      month: d.toLocaleDateString("es", { month: "short" }),
      relapses: relapseByMonth[key] ?? 0,
    };
  });

  const totalClean = currentStreak;
  const relapsesCount = habitRelapses.length;

  if (!activeHabit) {
    return (
      <motion.div
        variants={pageVariants} initial="initial" animate="animate"
        className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center space-y-6"
      >
        <Image src="/pulso.png" alt="Pulso" width={64} height={64} className="w-16 h-16 opacity-50" />
        <div>
          <h2 className="font-[Space_Grotesk] font-bold text-xl text-white">Sin datos aún</h2>
          <p className="text-[#908fa3] text-sm mt-2">Crea un hábito para empezar a ver tu progreso.</p>
        </div>
        <button
          onClick={() => router.push("/profile")}
          className="bg-[#3832f6] text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Crear hábito
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-5 pt-6 pb-6 space-y-6"
    >
      {/* Hero */}
      <section className="relative py-8 flex flex-col items-center justify-center">
        <div className="pulse-glow absolute inset-0 -z-10" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mb-2">
          {activeHabit.name} · {isBuild ? "Racha de práctica" : "Pulso actual"}
        </span>
        <div className="flex items-baseline gap-2">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="font-[Space_Grotesk] font-bold text-7xl tracking-tighter text-white"
          >
            {currentStreak}
          </motion.span>
          <span className="font-[Manrope] text-xl text-[#908fa3]">Días</span>
        </div>
        {currentStreak > 0 && (
          <div className="mt-4 px-4 py-1.5 bg-[#3832f6]/10 rounded-full border border-[#3832f6]/20">
            <p className="text-[10px] font-bold text-[#3832f6] tracking-wide uppercase">
              {isBuild ? "Sigue practicando 💪" : "Sigue así 💪"}
            </p>
          </div>
        )}
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-2 gap-4">
        {[
          { icon: Trophy, label: "Racha más larga", value: `${longestStreak} Días`, color: "#c1c1ff" },
          {
            icon: Shield,
            label: isBuild ? "Interrupciones" : "Recaídas",
            value: String(relapsesCount),
            color: "#ffb4a1",
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#2a292e] rounded-2xl p-5 flex flex-col justify-between h-36 border border-white/5"
          >
            <item.icon size={22} style={{ color: item.color }} strokeWidth={1.8} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-1">{item.label}</p>
              <p className="font-[Space_Grotesk] text-2xl font-bold text-white">{item.value}</p>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-2 bg-[#2a292e] rounded-2xl p-5 flex items-center justify-between border border-white/5"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#908fa3] mb-1">
              {isBuild ? "Días de práctica" : "Días totales limpio"}
            </p>
            <p className="font-[Space_Grotesk] text-3xl font-bold text-white">{totalClean}</p>
          </div>
          <div className="flex items-end gap-1 h-12">
            {chartData.slice(-7).map((d, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(8, (d.dias / Math.max(1, currentStreak || 1)) * 100)}%` }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                style={{ opacity: 0.2 + (i / 6) * 0.8 }}
                className="w-2.5 bg-[#3832f6] rounded-t-sm"
              />
            ))}
          </div>
        </motion.div>
      </section>

      {/* Projection */}
      {currentStreak > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#3832f6] rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 opacity-10">
            <TrendingUp size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <h3 className="font-[Space_Grotesk] text-xl font-bold text-white mb-2">Proyección de Impulso</h3>
            <p className="font-[Manrope] text-sm text-white/70 mb-5">
              {isBuild ? "Si mantienes la práctica, llegas a tu próximo hito." : "Si mantienes este ritmo, estás en camino a tu próximo hito."}
            </p>
            <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md rounded-xl p-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Meta</span>
                <span className="font-[Space_Grotesk] font-bold text-white text-lg">
                  {[30, 60, 90, 180, 365].find((m) => m > currentStreak) ?? 365} Días
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">Días restantes</span>
                <span className="font-[Space_Grotesk] font-bold text-white text-lg">
                  {([30, 60, 90, 180, 365].find((m) => m > currentStreak) ?? 365) - currentStreak}
                </span>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Area chart */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#1b1b1f] rounded-2xl p-5 space-y-4 border border-white/5"
      >
        <div>
          <h3 className="font-[Space_Grotesk] text-base font-bold text-white">Consistencia de Racha</h3>
          <p className="text-xs text-[#908fa3]">Evolución semanal</p>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="streakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3832f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3832f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: "#908fa3", fontSize: 10, fontFamily: "Manrope" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="dias" stroke="#3832f6" strokeWidth={2} fill="url(#streakGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Relapse / interruption chart */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-[#1b1b1f] rounded-2xl p-5 space-y-4 border border-white/5"
      >
        <div>
          <h3 className="font-[Space_Grotesk] text-base font-bold text-white">
            {isBuild ? "Interrupciones por Mes" : "Recaídas por Mes"}
          </h3>
          <p className="text-xs text-[#908fa3]">
            {last3Months.every((d) => d.relapses === 0)
              ? isBuild ? "Sin interrupciones registradas — excelente 🎉" : "Sin recaídas registradas — excelente 🎉"
              : "Datos reales del historial"}
          </p>
        </div>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last3Months} barSize={28}>
              <XAxis dataKey="month" tick={{ fill: "#908fa3", fontSize: 10, fontFamily: "Manrope" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="bg-[#2a292e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold">
                      {payload[0].value} {isBuild ? "interrupciones" : "recaídas"}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="relapses" radius={[6, 6, 0, 0]}>
                {last3Months.map((entry, index) => (
                  <Cell key={index} fill={entry.relapses === 0 ? "#3832f6" : "#a82700"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.section>

      {/* Recent triggers — solo del hábito activo */}
      {habitTriggers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1b1b1f] rounded-2xl overflow-hidden border border-white/5"
        >
          <div className="p-5 border-b border-white/5">
            <h3 className="font-[Space_Grotesk] text-base font-bold text-white">
              {isBuild ? "Obstáculos registrados" : "Prevención de Recaídas"}
            </h3>
            <p className="text-xs text-[#908fa3]">
              Últimos triggers · {activeHabit.name}
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {habitTriggers.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#93000a]/20 flex items-center justify-center">
                    <AlertTriangle size={14} className="text-[#ffb4ab]" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{getTriggerDisplay(t)}</p>
                    {t.note && <p className="text-[10px] text-[#908fa3]">{t.note}</p>}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#3832f6] uppercase">
                  {isBuild ? "Superado" : "Superado"}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* AI correlation */}
      {correlation && (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-[#3832f6]/5 border border-[#3832f6]/20 p-5 rounded-2xl"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6] mb-2">IA · Correlación Emocional</p>
          <p className="text-[#e4e1e7] text-sm leading-relaxed">{correlation}</p>
        </motion.div>
      )}

      <div className="flex items-center justify-center gap-2 opacity-20 py-2">
        <Image src="/pulso.png" alt="" width={14} height={14} className="w-3.5 h-3.5" />
        <span className="font-[Space_Grotesk] font-black italic text-xs text-white">Pulso</span>
      </div>
    </motion.div>
  );
}
