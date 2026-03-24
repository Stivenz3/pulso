"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import BottomNavbar from "@/components/layout/BottomNavbar";
import TopAppBar from "@/components/layout/TopAppBar";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
import CreateHabitModal from "@/components/habits/CreateHabitModal";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, onboardingCompleted, onboardingChecked, showCreateHabitModal, setShowCreateHabitModal } = useAppStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Splash screen while Firebase resolves auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131317] flex flex-col items-center justify-center gap-4">
        <Image
          src="/pulso.png"
          alt="Pulso"
          width={64}
          height={64}
          className="w-16 h-16 animate-pulse"
          priority
        />
        <p className="text-[#3832f6] font-[Space_Grotesk] font-black italic text-xl">
          Pulso
        </p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#131317] text-[#e4e1e7] pb-32 overflow-x-hidden">
      <TopAppBar />
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
