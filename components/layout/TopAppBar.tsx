"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getHabitEmoji } from "@/components/habits/CreateHabitModal";

export default function TopAppBar() {
  const router = useRouter();
  const { habits, activeHabitId, setActiveHabit, user, setShowCreateHabitModal } = useAppStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];
  const initial = user?.name?.[0]?.toUpperCase() || "P";

  return (
    <header className="fixed top-0 w-full z-50 bg-[#131317]/85 backdrop-blur-2xl border-b border-white/4 h-14 flex items-center px-4 gap-3">
      {/* Logo */}
      <button onClick={() => router.push("/")} aria-label="Ir al inicio" title="Inicio" className="shrink-0">
        <Image
          src="/pulso.png"
          alt="Pulso"
          width={28}
          height={28}
          className="w-7 h-7 object-contain"
          priority
        />
      </button>

      {/* Habit selector */}
      <div className="flex-1 relative">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 bg-[#1f1f23] border border-white/8 rounded-xl px-3 py-1.5 max-w-[200px]"
        >
          {activeHabit ? (
            <>
              <span className="text-base leading-none">
                {getHabitEmoji(activeHabit.name)}
              </span>
              <span className="text-white text-sm font-[Space_Grotesk] font-bold truncate">
                {activeHabit.name}
              </span>
            </>
          ) : (
            <span className="text-[#908fa3] text-sm font-[Manrope]">
              Sin hábito
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-[#908fa3] transition-transform shrink-0 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </motion.button>

        {/* Dropdown */}
        <AnimatePresence>
          {dropdownOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDropdownOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-2 w-56 bg-[#1f1f23] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
              >
                {habits.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[#908fa3] text-xs">Sin hábitos aún</p>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowCreateHabitModal(true);
                      }}
                      className="mt-2 text-[#3832f6] text-xs font-bold flex items-center gap-1 mx-auto"
                    >
                      <Plus size={12} /> Agregar hábito
                    </button>
                  </div>
                ) : (
                  <div className="py-1">
                    {habits.map((habit) => (
                      <button
                        key={habit.id}
                        onClick={() => {
                          setActiveHabit(habit.id);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <span className="text-lg">{getHabitEmoji(habit.name)}</span>
                        <span className="flex-1 text-[#e4e1e7] text-sm font-[Manrope] font-medium">
                          {habit.name}
                        </span>
                        {habit.id === activeHabitId && (
                          <Check size={14} className="text-[#3832f6]" />
                        )}
                      </button>
                    ))}
                    <div className="border-t border-white/5 mt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setShowCreateHabitModal(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-[#3832f6]"
                      >
                        <Plus size={14} />
                        <span className="text-sm font-bold">Agregar hábito</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Profile avatar */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => router.push("/profile")}
        className="w-8 h-8 rounded-full bg-[#3832f6]/20 border-2 border-[#3832f6]/30 flex items-center justify-center shrink-0 text-[#c1c1ff] text-xs font-bold font-[Space_Grotesk]"
      >
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="perfil"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </motion.button>
    </header>
  );
}
