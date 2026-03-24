"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { logoutUser } from "@/lib/auth";
import { updateHabit, deleteHabit, updateUserDoc } from "@/lib/firestore";
import {
  Settings, Bell, Lock, LogOut,
  ChevronRight, Trash2, Zap, Shield, X,
} from "lucide-react";
import { getHabitEmoji } from "@/components/habits/CreateHabitModal";

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, habits, clearSession, updateHabitOptimistic, setHabits, activeHabitId, setShowCreateHabitModal } = useAppStore();
  const activeHabit = habits.find((h) => h.id === activeHabitId) || habits[0];

  const [whyText, setWhyText] = useState(activeHabit?.reason || "");
  const [editingWhy, setEditingWhy] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string; streak: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const saveWhy = async () => {
    if (user && activeHabit) {
      await updateHabit(user.uid, activeHabit.id, { reason: whyText }).catch(() => {});
      updateHabitOptimistic(activeHabit.id, { reason: whyText });
    }
    setEditingWhy(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    clearSession();
    router.push("/login");
  };

  const toggleNotifications = async () => {
    const next = !notifications;
    setNotifications(next);
    if (user) {
      await updateUserDoc(user.uid, {
        settings: { notificationsEnabled: next, theme: "dark" },
      }).catch(() => {});
    }
  };

  const confirmDeleteHabit = async () => {
    if (!habitToDelete || !user || deleting) return;
    setDeleting(true);
    try {
      await deleteHabit(user.uid, habitToDelete.id);
      setHabits(habits.filter((h) => h.id !== habitToDelete.id));
      setHabitToDelete(null);
    } catch (err) {
      console.error("Error deleting habit:", err);
    } finally {
      setDeleting(false);
    }
  };

  const initial = user?.name?.[0]?.toUpperCase() || "P";

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-5 pt-6 pb-6 space-y-6"
    >
      {/* User header */}
      <section className="flex flex-col items-center text-center py-4 space-y-1">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-[#3832f6]/40 flex items-center justify-center bg-[#3832f6]/10 text-3xl font-[Space_Grotesk] font-bold text-[#c1c1ff]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="perfil" className="w-full h-full rounded-full object-cover" />
            ) : initial}
          </div>
          <div className="absolute bottom-0 right-0 bg-[#3832f6] text-white p-1.5 rounded-full">
            <Settings size={11} />
          </div>
        </div>
        <h2 className="font-[Space_Grotesk] text-2xl font-bold text-white">{user?.name || "Usuario"}</h2>
        <p className="text-[#908fa3] text-sm">{user?.email}</p>
        <div className="flex items-center gap-1.5 bg-[#3832f6]/10 border border-[#3832f6]/20 px-3 py-1.5 rounded-full mt-2">
          <Zap size={12} className="text-[#c1c1ff]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#c1c1ff]">IA Activa</span>
        </div>
      </section>

      {/* Why I started */}
      <section className="bg-[#1b1b1f] rounded-2xl p-5 space-y-3 border border-white/5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3832f6]">Mi Motivación</span>
          <button
            onClick={() => setEditingWhy(!editingWhy)}
            aria-label={editingWhy ? "Cancelar" : "Editar motivación"}
            title={editingWhy ? "Cancelar" : "Editar motivación"}
            className="text-[#908fa3] hover:text-[#c1c1ff] transition-colors p-1"
          >
            <Settings size={15} />
          </button>
        </div>
        <AnimatePresence mode="wait">
          {editingWhy ? (
            <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <textarea
                value={whyText}
                onChange={(e) => setWhyText(e.target.value)}
                placeholder="¿Por qué empezaste este camino?"
                rows={3}
                className="w-full bg-[#353439] border border-white/10 rounded-xl p-3 text-[#e4e1e7] text-sm outline-none resize-none font-[Manrope] italic placeholder:text-[#454557]"
                aria-label="Mi motivación"
              />
              <div className="flex gap-2">
                <button onClick={saveWhy} className="flex-1 bg-[#3832f6] text-white py-2 rounded-xl text-sm font-bold">Guardar</button>
                <button onClick={() => setEditingWhy(false)} className="px-4 py-2 text-[#908fa3] text-sm">Cancelar</button>
              </div>
            </motion.div>
          ) : (
            <motion.p key="display" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[#e4e1e7] text-sm italic leading-relaxed">
              {activeHabit?.reason || whyText || "Toca el ícono para añadir tu motivación..."}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Habits */}
      <section className="space-y-3">
        <h3 className="font-[Space_Grotesk] text-xl font-bold text-white">Mis Hábitos</h3>
        <div className="space-y-2">
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex items-center gap-3 p-4 bg-[#1b1b1f] rounded-2xl border border-white/5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#2a292e] flex items-center justify-center text-xl shrink-0">
                {getHabitEmoji(habit.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-[Manrope] font-bold text-white truncate">{habit.name}</h4>
                <p className="text-xs text-[#908fa3] uppercase tracking-wide">
                  {habit.type === "sobriety" ? "Dejar · " : "Construir · "}
                  <span className="text-[#c1c1ff]">{habit.currentStreak}d racha</span>
                </p>
              </div>
              <button
                aria-label={`Eliminar hábito ${habit.name}`}
                title={`Eliminar ${habit.name}`}
                onClick={() => setHabitToDelete({ id: habit.id, name: habit.name, streak: habit.currentStreak })}
                className="text-[#353439] active:text-[#ffb4ab] hover:text-[#ffb4ab] transition-all p-2 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}

          {habits.length === 0 && (
            <div className="bg-[#1b1b1f] border border-dashed border-[#454557]/50 p-8 rounded-2xl flex flex-col items-center gap-3 text-center">
              <p className="text-[#908fa3] text-sm">Sin hábitos aún</p>
              <button
                onClick={() => setShowCreateHabitModal(true)}
                className="text-[#c1c1ff] text-xs font-bold flex items-center gap-1"
              >
                + Crear mi primer hábito
              </button>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCreateHabitModal(true)}
            className="w-full border border-dashed border-[#454557]/50 p-4 rounded-2xl flex items-center justify-center gap-2 text-[#908fa3] hover:text-[#c1c1ff] hover:border-[#3832f6]/30 transition-all"
          >
            <span className="text-lg">+</span>
            <span className="font-[Manrope] text-sm font-bold">Agregar hábito</span>
          </motion.button>
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-3">
        <h3 className="font-[Space_Grotesk] text-xl font-bold text-white">Preferencias</h3>
        <div className="bg-[#1b1b1f] rounded-2xl divide-y divide-white/5 border border-white/5 overflow-hidden">
          {/* Notifications */}
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Bell size={18} className={notifications ? "text-[#c1c1ff]" : "text-[#908fa3]"} strokeWidth={1.8} />
              <div>
                <span className="font-[Manrope] text-sm font-medium text-[#e4e1e7]">Recordatorios diarios</span>
                <p className="text-[10px] text-[#908fa3]">{notifications ? "Activos" : "Desactivados"}</p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              aria-label={notifications ? "Desactivar recordatorios" : "Activar recordatorios"}
              className={`w-11 h-6 rounded-full relative flex items-center px-1 transition-colors duration-300 ${notifications ? "bg-[#3832f6]" : "bg-[#353439]"}`}
            >
              <motion.div
                animate={{ x: notifications ? 18 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="w-4 h-4 bg-white rounded-full shadow-md"
              />
            </button>
          </div>

          {/* Privacy */}
          <button
            onClick={() => setShowPrivacy(true)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-[#908fa3]" strokeWidth={1.8} />
              <span className="font-[Manrope] text-sm font-medium text-[#e4e1e7]">Privacidad y datos</span>
            </div>
            <ChevronRight size={16} className="text-[#908fa3]" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Image src="/pulso.png" alt="Pulso" width={18} height={18} className="opacity-40" />
        <span className="font-[Space_Grotesk] font-black italic text-xs text-[#454557]">Pulso v1.0</span>
      </div>

      {/* Sign out */}
      <section className="pb-4">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-[#a82700] hover:bg-[#ffb4a1]/5 py-4 rounded-2xl transition-colors border border-[#a82700]/20"
        >
          <LogOut size={16} strokeWidth={2} />
          <span className="font-[Manrope] text-sm font-bold uppercase tracking-widest">Cerrar sesión</span>
        </motion.button>
      </section>

      {/* Delete Habit Confirmation */}
      <AnimatePresence>
        {habitToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setHabitToDelete(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1f1f23] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-[#a82700]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={24} className="text-[#ffb4a1]" />
                </div>
                <h3 className="font-[Space_Grotesk] font-bold text-xl text-white">
                  ¿Eliminar &quot;{habitToDelete.name}&quot;?
                </h3>
                <p className="text-[#908fa3] text-sm leading-relaxed">
                  Perderás tu racha de{" "}
                  <span className="text-[#ffb4a1] font-bold">{habitToDelete.streak} días</span>{" "}
                  y todos los datos asociados a este hábito.
                </p>
                <p className="text-[#454557] text-xs">Esta acción no se puede deshacer.</p>
              </div>
              <div className="space-y-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={confirmDeleteHabit} disabled={deleting}
                  className="w-full bg-[#a82700] text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <span className="animate-pulse">Eliminando...</span> : <><Trash2 size={16} /> Sí, eliminar</>}
                </motion.button>
                <button onClick={() => setHabitToDelete(null)} className="w-full text-[#908fa3] text-sm py-3 font-bold">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-200 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1f1f23] border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield size={20} className="text-[#c1c1ff]" />
                  <h3 className="font-[Space_Grotesk] font-bold text-lg text-white">Privacidad y datos</h3>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="text-[#908fa3]" aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              {[
                { title: "Tus datos", desc: "Toda tu información se guarda de forma segura en Firebase Firestore con cifrado en tránsito y en reposo." },
                { title: "Inteligencia Artificial", desc: "Los análisis de IA se procesan en servidores de Groq. Solo se envían tus hábitos, triggers y estados de ánimo (sin datos personales identificables)." },
                { title: "Sin terceros", desc: "No vendemos ni compartimos tus datos con terceros. Pulso no tiene publicidad." },
                { title: "Eliminar cuenta", desc: "Para eliminar tu cuenta y todos tus datos, contáctanos desde la configuración de Firebase." },
              ].map((item) => (
                <div key={item.title} className="space-y-1">
                  <p className="text-[#c1c1ff] text-sm font-bold">{item.title}</p>
                  <p className="text-[#908fa3] text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
