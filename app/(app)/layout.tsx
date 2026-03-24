"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import BottomNavbar from "@/components/layout/BottomNavbar";
import TopAppBar from "@/components/layout/TopAppBar";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
import CreateHabitModal from "@/components/habits/CreateHabitModal";

function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#131317] flex flex-col items-center justify-center gap-4">
      <Image src="/pulso.png" alt="Pulso" width={64} height={64} className="w-16 h-16 animate-pulse" priority />
      <p className="text-[#3832f6] font-[Space_Grotesk] font-black italic text-xl">Pulso</p>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    isAuthenticated, isLoading, habitsReady, isHabitSwitching,
    onboardingCompleted, onboardingChecked,
    showCreateHabitModal, setShowCreateHabitModal,
  } = useAppStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Splash: mientras Firebase resuelve auth O mientras llegan los hábitos de Firestore
  if (isLoading || (isAuthenticated && !habitsReady)) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#131317] text-[#e4e1e7] pb-32 overflow-x-hidden">
      <TopAppBar />

      {/* Mini overlay al cambiar hábito en el dropdown */}
      <AnimatePresence>
        {isHabitSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-[#131317]/70 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <Image src="/pulso.png" alt="" width={36} height={36} className="w-9 h-9 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      <main className="pt-14 max-w-2xl mx-auto">{children}</main>
      <BottomNavbar />
      {onboardingChecked && !onboardingCompleted && <OnboardingTutorial />}
      <CreateHabitModal
        isOpen={showCreateHabitModal}
        onClose={() => setShowCreateHabitModal(false)}
      />
    </div>
  );
}
