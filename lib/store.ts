"use client";

import { create } from "zustand";
import type {
  HabitDoc,
  MoodLogDoc,
  TriggerDoc,
  AIInsightDoc,
  DailyStatDoc,
  LocalUser,
} from "@/types";

interface AppState {
  // Auth
  user: LocalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onboardingCompleted: boolean;
  onboardingChecked: boolean; // true once Firestore has confirmed the onboarding state

  // Active habit selector
  activeHabitId: string | null;

  // Firestore-synced collections (local cache)
  habits: HabitDoc[];
  moods: MoodLogDoc[];
  triggers: TriggerDoc[];
  insights: AIInsightDoc[];
  dailyStats: DailyStatDoc[];
  relapses: import("@/types").RelapseDoc[];

  // Mood rate-limit per habit (habitId -> timestamp ms)
  lastMoodTimestamp: Record<string, number>;

  // UI flags
  showCreateHabitModal: boolean;
  setShowCreateHabitModal: (val: boolean) => void;

  // Actions — auth
  setUser: (user: LocalUser | null) => void;
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  completeOnboarding: () => void;
  setOnboardingChecked: () => void;
  clearSession: () => void;

  // Actions — data (these just update the local cache;
  // callers must ALSO write to Firestore)
  setActiveHabit: (id: string) => void;
  setHabits: (habits: HabitDoc[]) => void;
  setMoods: (moods: MoodLogDoc[]) => void;
  setTriggers: (triggers: TriggerDoc[]) => void;
  setInsights: (insights: AIInsightDoc[]) => void;
  setDailyStats: (stats: DailyStatDoc[]) => void;
  setRelapses: (relapses: import("@/types").RelapseDoc[]) => void;

  // Optimistic updates (instant UI, Firestore confirms later)
  addHabitOptimistic: (habit: HabitDoc) => void;
  addMoodOptimistic: (mood: MoodLogDoc) => void;
  addTriggerOptimistic: (trigger: TriggerDoc) => void;
  addInsightOptimistic: (insight: AIInsightDoc) => void;
  markInsightReadOptimistic: (id: string) => void;
  updateHabitOptimistic: (id: string, delta: Partial<HabitDoc>) => void;

  // Derived helpers
  canLogMood: (habitId?: string) => boolean;
  activeHabit: () => HabitDoc | undefined;
}

const EMPTY_STATE = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  onboardingCompleted: false,
  onboardingChecked: false,
  activeHabitId: null,
  habits: [],
  moods: [],
  triggers: [],
  insights: [],
  dailyStats: [],
  lastMoodTimestamp: {},
  relapses: [],
  showCreateHabitModal: false,
};

export const useAppStore = create<AppState>()((set, get) => ({
  ...EMPTY_STATE,

  // ── UI flags ─────────────────────────────────────────────────────────────
  setShowCreateHabitModal: (val) => set({ showCreateHabitModal: val }),

  // ── Auth ──────────────────────────────────────────────────────────────────
  setUser: (user) => set({ user }),
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
  completeOnboarding: () => set({ onboardingCompleted: true, onboardingChecked: true }),
  setOnboardingChecked: () => set({ onboardingChecked: true }),
  clearSession: () => set({ ...EMPTY_STATE, isLoading: false }),

  // ── Data setters (replace full collection) ────────────────────────────────
  setActiveHabit: (id) => set({ activeHabitId: id }),
  setHabits: (habits) =>
    set((s) => ({
      habits,
      activeHabitId: s.activeHabitId ?? habits[0]?.id ?? null,
    })),
  setMoods: (moods) => set({ moods }),
  setTriggers: (triggers) => set({ triggers }),
  setInsights: (insights) => set({ insights }),
  setDailyStats: (dailyStats) => set({ dailyStats }),
  setRelapses: (relapses) => set({ relapses }),

  // ── Optimistic updates ────────────────────────────────────────────────────
  addHabitOptimistic: (habit) =>
    set((s) => ({
      habits: [...s.habits, habit],
      activeHabitId: s.activeHabitId ?? habit.id,
    })),
  addMoodOptimistic: (mood) =>
    set((s) => ({
      moods: [mood, ...s.moods],
      lastMoodTimestamp: mood.habitId
        ? { ...s.lastMoodTimestamp, [mood.habitId]: Date.now() }
        : s.lastMoodTimestamp,
    })),
  addTriggerOptimistic: (trigger) =>
    set((s) => ({ triggers: [trigger, ...s.triggers] })),
  addInsightOptimistic: (insight) =>
    set((s) => ({ insights: [insight, ...s.insights] })),
  markInsightReadOptimistic: (id) =>
    set((s) => ({
      insights: s.insights.map((i) => (i.id === id ? { ...i, isRead: true } : i)),
    })),
  updateHabitOptimistic: (id, delta) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...delta } : h)),
    })),

  // ── Derived ───────────────────────────────────────────────────────────────
  canLogMood: (habitId?: string) => {
    const map = get().lastMoodTimestamp;
    const key = habitId ?? get().activeHabitId ?? "__global__";
    const last = map[key];
    if (!last) return true;
    return Date.now() - last >= 2 * 60 * 60 * 1000;
  },
  activeHabit: () => {
    const { habits, activeHabitId } = get();
    return habits.find((h) => h.id === activeHabitId) ?? habits[0];
  },
}));
