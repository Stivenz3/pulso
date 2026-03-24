"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { onAuthChange } from "@/lib/auth";
import {
  subscribeHabits,
  subscribeMoods,
  subscribeTriggers,
  subscribeInsights,
  subscribeRelapses,
  getDailyStats,
  getUserDoc,
  checkAndIncrementDailyStreak,
} from "@/lib/firestore";
import { getFirebaseMessaging } from "@/lib/firebase";
import { onMessage } from "firebase/messaging";
import { notifyEvent } from "@/lib/notifyEvent";
import type { Unsubscribe } from "firebase/firestore";

/**
 * Mounts once at the root. Listens to Firebase Auth state and,
 * when authenticated, opens real-time Firestore subscriptions for
 * all subcollections. Tears everything down on logout.
 */
export default function FirestoreProvider({ children }: { children: React.ReactNode }) {
  const {
    setUser,
    setAuthenticated,
    setLoading,
    clearSession,
    completeOnboarding,
    setOnboardingChecked,
    setHabits,
    setMoods,
    setTriggers,
    setInsights,
    setDailyStats,
    setRelapses,
  } = useAppStore();

  const updateLastMoodTimestamp = (moods: import("@/types").MoodLogDoc[]) => {
    if (moods.length === 0) return;
    // Build a per-habit map of the most recent mood timestamp
    const map: Record<string, number> = {};
    for (const m of moods) {
      if (!m.habitId || !m.timestamp) continue;
      const ts =
        m.timestamp instanceof Date
          ? m.timestamp.getTime()
          : (m.timestamp as { seconds: number }).seconds * 1000;
      if (!map[m.habitId] || ts > map[m.habitId]) {
        map[m.habitId] = ts;
      }
    }
    useAppStore.setState({ lastMoodTimestamp: map });
  };

  // Keep refs to unsubscribe functions so we can clean up
  const unsubs = useRef<Unsubscribe[]>([]);
  const prevStreaksRef = useRef<Record<string, number>>({});
  const MILESTONE_DAYS = new Set([1, 3, 7, 14, 30, 60, 90, 180, 365]);

  const checkMilestones = (
    uid: string,
    habits: import("@/types").HabitDoc[]
  ) => {
    for (const habit of habits) {
      const prev = prevStreaksRef.current[habit.id] ?? -1;
      const curr = habit.currentStreak;
      if (prev === -1) { prevStreaksRef.current[habit.id] = curr; continue; }
      if (curr > prev && MILESTONE_DAYS.has(curr)) {
        notifyEvent(uid, "milestone", { days: curr });
      }
      prevStreaksRef.current[habit.id] = curr;
    }
  };

  // Foreground FCM message handler — muestra notificación nativa cuando la app está abierta
  useEffect(() => {
    let unsubFcm: (() => void) | undefined;
    const seenKeys = new Set<string>();
    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsubFcm = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "Pulso";
        const body = payload.notification?.body ?? "Mantén tu racha.";
        const reminderKey = payload.data?.reminderKey;
        if (reminderKey && seenKeys.has(reminderKey)) return;
        if (reminderKey) seenKeys.add(reminderKey);
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: "/icons/icon-192.png",
            tag: reminderKey || "pulso-foreground",
          });
        }
      });
    });
    return () => unsubFcm?.();
  }, []);

  const teardown = () => {
    unsubs.current.forEach((u) => u());
    unsubs.current = [];
  };

  useEffect(() => {
    setLoading(true);

    const unsubAuth = onAuthChange(async (authUser) => {
      teardown();

      if (!authUser) {
        console.log("[FirestoreProvider] No user → clearSession");
        clearSession();
        return;
      }

      console.log("[FirestoreProvider] User authenticated →", authUser.uid);
      setUser({ uid: authUser.uid, name: authUser.name, email: authUser.email, photoURL: authUser.photoURL });
      setAuthenticated(true);
      setLoading(false);

      const uid = authUser.uid;

      // Increment streak for today (calendar day) if not already done
      checkAndIncrementDailyStreak(uid).catch(() => {});

      // Restore onboarding state from Firestore so it survives page refreshes
      // Always call setOnboardingChecked so the tutorial never flashes
      getUserDoc(uid).then((doc) => {
        if (doc?.onboardingCompleted) {
          completeOnboarding();
        } else {
          setOnboardingChecked();
        }
      }).catch(() => {
        setOnboardingChecked(); // fail-safe: if Firestore fails, allow tutorial
      });

      try {
        console.log("[FirestoreProvider] Opening Firestore listeners...");
        unsubs.current.push(
          subscribeHabits(uid, (h) => { console.log("[FirestoreProvider] habits →", h.length); setHabits(h); checkMilestones(uid, h); }),
          subscribeMoods(uid, (m) => { console.log("[FirestoreProvider] moods →", m.length); setMoods(m); updateLastMoodTimestamp(m); }),
          subscribeTriggers(uid, (t) => { console.log("[FirestoreProvider] triggers →", t.length); setTriggers(t); }),
          subscribeInsights(uid, (i) => { console.log("[FirestoreProvider] insights →", i.length); setInsights(i); }),
          subscribeRelapses(uid, (r) => { console.log("[FirestoreProvider] relapses →", r.length); setRelapses(r); })
        );
        getDailyStats(uid, 30).then((s) => { console.log("[FirestoreProvider] dailyStats →", s.length); setDailyStats(s); });
      } catch (err) {
        console.error("[FirestoreProvider] Error opening listeners →", err);
      }
    });

    return () => {
      unsubAuth();
      teardown();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
