import type { Timestamp } from "firebase/firestore";

// ─── Firestore timestamp alias ────────────────────────────────────────────────
export type FSTimestamp = Timestamp | Date;

// ─── users/{userId} ───────────────────────────────────────────────────────────
export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: FSTimestamp;
  lastLogin: FSTimestamp;
  onboardingCompleted?: boolean;
  settings: {
    notificationsEnabled: boolean;
    theme: "dark";
  };
}

// ─── users/{userId}/habits/{habitId} ─────────────────────────────────────────
export type HabitType = "sobriety" | "build";
export type TargetType = "avoid" | "build";

export interface HabitDoc {
  id: string; // set client-side for convenience
  name: string;
  type: HabitType;
  createdAt: FSTimestamp;

  currentStreak: number;
  longestStreak: number;
  startDate: FSTimestamp;
  lastRelapseDate: FSTimestamp | null;

  isActive: boolean;
  targetType: TargetType;

  reason: string;
  aiCategory: string;

  cleanDaysTotal: number;
  relapsesAvoided: number;
  reminderHour?: number | null; // hora local 0-23 para recordatorio personalizado
  reminderMinute?: number | null; // minuto local 0-59 para recordatorio personalizado
  lastReminderKey?: string | null; // evita envíos duplicados en el mismo ciclo
  lastStreakDate?: string; // "YYYY-MM-DD" in local timezone — used to detect if today was already counted
}

// ─── users/{userId}/moodLogs/{moodId} ────────────────────────────────────────
export type MoodType = "focused" | "stressed" | "bored" | "motivated" | "anxious" | "calm";

export interface MoodLogDoc {
  id: string;
  habitId: string | null;
  mood: MoodType;
  timestamp: FSTimestamp;
  hourBlock: number; // 0-11 (every 2h block of the day)
  note: string | null;
  intensity: number; // 1-5
}

// ─── users/{userId}/triggers/{triggerId} ─────────────────────────────────────
export type TriggerType = "stress" | "boredom" | "social" | "loneliness" | "anxiety" | "custom";

export interface TriggerDoc {
  id: string;
  habitId: string;
  type: TriggerType;
  customLabel: string | null;
  note: string | null;
  timestamp: FSTimestamp;
  aiGenerated: boolean;
  moodAtMoment: MoodType | null;
}

// ─── users/{userId}/relapses/{relapseId} ─────────────────────────────────────
export interface RelapseDoc {
  id: string;
  habitId: string;
  timestamp: FSTimestamp;
  triggerId: string | null;
  moodBefore: MoodType | null;
  note: string | null;
  lostStreak: number;
}

// ─── users/{userId}/aiInsights/{insightId} ────────────────────────────────────
export type InsightType = "pattern" | "prediction" | "suggestion" | "warning" | "encouragement";

export interface AIInsightDoc {
  id: string;
  habitId: string;
  type: InsightType;
  message: string;
  confidence: number; // 0-1
  createdAt: FSTimestamp;
  isRead: boolean;
}

// ─── users/{userId}/dailyStats/{date} ────────────────────────────────────────
export type RiskLevel = "low" | "medium" | "high";

export interface DailyStatDoc {
  date: string; // "YYYY-MM-DD"
  moods: number;
  triggers: number;
  relapses: number;
  dominantMood: MoodType | null;
  riskLevel: RiskLevel;
}

// ─── Local UI state (not Firestore) ──────────────────────────────────────────
export interface LocalUser {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
}
