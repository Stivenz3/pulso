"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { getHabitEmoji } from "@/components/habits/CreateHabitModal";

interface StreakCardProps {
  days: number;
  habitName: string;
  motivationalMessage: string;
}

function useRealtimeClock() {
  // Cuenta regresiva hasta medianoche (próximo día de racha).
  // A las 19:00 muestra 05h 00m 00s — "faltan 5h para el día siguiente".
  const [remaining, setRemaining] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const totalSecs = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      setRemaining({ h, m, s });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function StreakCard({
  days,
  habitName,
  motivationalMessage,
}: StreakCardProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const displayRef = useRef<HTMLSpanElement>(null);
  const { h, m, s } = useRealtimeClock();

  useEffect(() => {
    const controls = animate(count, days, {
      duration: 1.4,
      ease: "easeOut",
    });
    return controls.stop;
  }, [days, count]);

  useEffect(() => {
    return rounded.on("change", (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = String(v);
      }
    });
  }, [rounded]);

  const emoji = getHabitEmoji(habitName);

  return (
    <section className="relative py-10 flex flex-col items-center text-center">
      <div className="absolute inset-0 pulse-glow -z-10" />

      {/* Habit badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 bg-[#2a292e] px-4 py-1.5 rounded-full mb-6 border border-white/5"
      >
        <span className="text-sm">{emoji}</span>
        <span className="font-[Manrope] text-[10px] font-bold uppercase tracking-widest text-[#c6c4da]">
          {habitName}
        </span>
      </motion.div>

      {/* Big day counter */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <span
          ref={displayRef}
          className="font-[Space_Grotesk] font-bold text-[7rem] leading-none text-white tracking-tighter block"
        >
          0
        </span>
        <h2 className="font-[Space_Grotesk] font-bold text-2xl tracking-tight text-[#e4e1e7] mt-[-1rem]">
          días firme
        </h2>
      </motion.div>

      {/* Countdown to next day */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-5 flex flex-col items-center gap-1"
      >
        <div className="flex items-center gap-1">
          {[
            { value: pad(h), label: "h" },
            { value: pad(m), label: "m" },
            { value: pad(s), label: "s" },
          ].map((unit, i) => (
            <span key={unit.label} className="flex items-baseline gap-0.5">
              {i > 0 && <span className="text-[#454557] font-bold text-lg mx-0.5">·</span>}
              <span className="font-[Space_Grotesk] font-bold text-2xl text-[#c1c1ff] tabular-nums">
                {unit.value}
              </span>
              <span className="text-[#454557] text-xs font-bold">{unit.label}</span>
            </span>
          ))}
        </div>
        <p className="text-[#454557] text-[10px] font-bold uppercase tracking-widest">
          {days === 0 ? "aguanta esta noche · día 1 mañana" : `para el día ${days + 1}`}
        </p>
      </motion.div>

      {/* Motivational quote */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-[#c6c4da] font-[Manrope] text-sm max-w-[280px] leading-relaxed italic"
      >
        &quot;{motivationalMessage}&quot;
      </motion.p>
    </section>
  );
}
