"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, TrendingUp, AlertTriangle, User, Trophy } from "lucide-react";

const tabs = [
  { id: "home",         label: "Inicio",    icon: Home,          path: "/" },
  { id: "progress",     label: "Progreso",  icon: TrendingUp,    path: "/progress" },
  { id: "triggers",     label: "Triggers",  icon: AlertTriangle, path: "/triggers" },
  { id: "achievements", label: "Logros",    icon: Trophy,        path: "/achievements" },
  { id: "profile",      label: "Perfil",    icon: User,          path: "/profile" },
];

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 pb-7 pt-3 bg-[#131317]/85 backdrop-blur-3xl rounded-t-4xl border-t border-white/5 shadow-[0_-20px_40px_rgba(56,50,246,0.08)]">
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;
        const Icon = tab.icon;

        return (
          <motion.button
            key={tab.id}
            onClick={() => router.push(tab.path)}
            whileTap={{ scale: 0.88 }}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 relative"
          >
            {/* Active pill background */}
            {isActive && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 bg-[#3832f6]/12 rounded-2xl"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            <Icon
              size={20}
              strokeWidth={isActive ? 2.5 : 1.8}
              className={`transition-colors relative z-10 ${isActive ? "text-[#3832f6]" : "text-[#454557]"}`}
            />
            <span
              className={`font-[Manrope] text-[9px] font-bold uppercase tracking-widest relative z-10 transition-colors ${
                isActive ? "text-[#3832f6]" : "text-[#454557]"
              }`}
            >
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
