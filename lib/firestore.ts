import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  UserDoc,
  HabitDoc,
  MoodLogDoc,
  TriggerDoc,
  RelapseDoc,
  AIInsightDoc,
  DailyStatDoc,
  MoodType,
  TriggerType,
  HabitType,
  TargetType,
  InsightType,
} from "@/types";

// ─── Paths ────────────────────────────────────────────────────────────────────
const userRef = (uid: string) => doc(db, "users", uid);
const habitsCol = (uid: string) => collection(db, "users", uid, "habits");
const habitRef = (uid: string, hid: string) => doc(db, "users", uid, "habits", hid);
const moodCol = (uid: string) => collection(db, "users", uid, "moodLogs");
const triggerCol = (uid: string) => collection(db, "users", uid, "triggers");
const relapseCol = (uid: string) => collection(db, "users", uid, "relapses");
const insightCol = (uid: string) => collection(db, "users", uid, "aiInsights");
const dailyCol = (uid: string) => collection(db, "users", uid, "dailyStats");

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function toDate(ts: unknown): Date {
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (ts && typeof ts === "object" && "seconds" in ts) {
    return new Date((ts as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

function newId(): string {
  return crypto.randomUUID();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentHourBlock(): number {
  return Math.floor(new Date().getHours() / 2);
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export async function createUserDoc(
  uid: string,
  name: string,
  email: string,
  photoURL?: string
): Promise<void> {
  const ref = userRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Firestore no acepta undefined — omitir campos opcionales vacíos
    const data: Record<string, unknown> = {
      uid,
      name,
      email,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      settings: { notificationsEnabled: true, theme: "dark" },
    };
    if (photoURL) data.photoURL = photoURL;
    await setDoc(ref, data);
  } else {
    await updateDoc(ref, { lastLogin: serverTimestamp(), name, email });
  }
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserDoc;
}

export async function updateUserDoc(
  uid: string,
  data: Partial<Pick<UserDoc, "name" | "settings" | "onboardingCompleted">>
): Promise<void> {
  await updateDoc(userRef(uid), data as Record<string, unknown>);
}

export async function saveFcmToken(uid: string, token: string): Promise<void> {
  await updateDoc(userRef(uid), { fcmToken: token, fcmUpdatedAt: serverTimestamp() });
}

export async function removeFcmToken(uid: string): Promise<void> {
  const { deleteField } = await import("firebase/firestore");
  await updateDoc(userRef(uid), { fcmToken: deleteField() });
}

// ─── HABITS ──────────────────────────────────────────────────────────────────
export async function createHabit(
  uid: string,
  data: {
    name: string;
    type: HabitType;
    targetType: TargetType;
    reason?: string;
    aiCategory?: string;
  }
): Promise<HabitDoc> {
  const id = newId();
  const habit: Record<string, unknown> = {
    name: data.name,
    type: data.type,
    targetType: data.targetType,
    createdAt: serverTimestamp(),
    currentStreak: 0,
    longestStreak: 0,
    startDate: serverTimestamp(),
    lastRelapseDate: null,
    isActive: true,
    reason: data.reason || "",
    aiCategory: data.aiCategory || "",
    cleanDaysTotal: 0,
    relapsesAvoided: 0,
    reminderHour: null,
  };
  console.log("[Firestore] createHabit →", { uid, id, name: data.name });
  try {
    await setDoc(doc(habitsCol(uid), id), habit);
    console.log("[Firestore] createHabit OK →", id);
  } catch (err) {
    console.error("[Firestore] createHabit FAILED →", err);
    throw err;
  }
  return { id, ...(habit as Omit<HabitDoc, "id">) };
}

export async function getHabits(uid: string): Promise<HabitDoc[]> {
  const snap = await getDocs(query(habitsCol(uid), where("isActive", "==", true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitDoc));
}

export async function updateHabit(
  uid: string,
  habitId: string,
  data: Partial<HabitDoc>
): Promise<void> {
  const { id, ...rest } = data;
  void id;
  await updateDoc(habitRef(uid, habitId), rest as Record<string, unknown>);
}

export async function deleteHabit(uid: string, habitId: string): Promise<void> {
  await updateDoc(habitRef(uid, habitId), { isActive: false });
}

export function subscribeHabits(
  uid: string,
  callback: (habits: HabitDoc[]) => void
): Unsubscribe {
  const q = query(habitsCol(uid), where("isActive", "==", true));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HabitDoc)));
  });
}

// ─── STREAK LOGIC ─────────────────────────────────────────────────────────────
export async function incrementStreak(uid: string, habitId: string): Promise<void> {
  await updateDoc(habitRef(uid, habitId), {
    currentStreak: increment(1),
    cleanDaysTotal: increment(1),
  });
  const snap = await getDoc(habitRef(uid, habitId));
  if (snap.exists()) {
    const h = snap.data() as HabitDoc;
    if (h.currentStreak > h.longestStreak) {
      await updateDoc(habitRef(uid, habitId), { longestStreak: h.currentStreak });
    }
  }
}

/**
 * Called once per session (on auth). For each active habit, checks if today's
 * calendar day (in the user's local timezone) has already been counted.
 * Uses `lastStreakDate` (stored as "YYYY-MM-DD") to avoid double-counting.
 */
export async function checkAndIncrementDailyStreak(uid: string): Promise<void> {
  const todayStr = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local TZ
  const snap = await getDocs(query(habitsCol(uid), where("isActive", "==", true)));

  const updates = snap.docs.map(async (d) => {
    const h = d.data() as HabitDoc & { lastStreakDate?: string };
    if (h.lastStreakDate === todayStr) return; // already counted today

    const habitCreatedAt = h.createdAt instanceof Date
      ? h.createdAt
      : h.createdAt && typeof h.createdAt === "object" && "seconds" in h.createdAt
      ? new Date((h.createdAt as { seconds: number }).seconds * 1000)
      : h.createdAt && typeof h.createdAt === "object" && "toDate" in h.createdAt
      ? (h.createdAt as { toDate: () => Date }).toDate()
      : new Date();

    const createdDateStr = habitCreatedAt.toLocaleDateString("en-CA");

    // Don't count the creation day itself as "day 1" until the next day
    if (createdDateStr === todayStr && (h.currentStreak ?? 0) === 0) {
      // First time: just record today so tomorrow we increment to day 1
      await updateDoc(doc(habitsCol(uid), d.id), { lastStreakDate: todayStr });
      return;
    }

    // Increment streak for today
    const newStreak = (h.currentStreak ?? 0) + 1;
    await updateDoc(doc(habitsCol(uid), d.id), {
      currentStreak: newStreak,
      cleanDaysTotal: increment(1),
      lastStreakDate: todayStr,
      ...(newStreak > (h.longestStreak ?? 0) ? { longestStreak: newStreak } : {}),
    });
  });

  await Promise.all(updates);
}

// ─── MOOD LOGS ────────────────────────────────────────────────────────────────
// Control de 2h manejado en cliente via store.lastMoodTimestamp
// Esta función ya no hace query a Firestore para evitar índices compuestos
export function canLogMoodNow(lastMoodTimestamp: number | null): boolean {
  if (!lastMoodTimestamp) return true;
  return Date.now() - lastMoodTimestamp >= 2 * 60 * 60 * 1000;
}

export async function getRecentMoods(uid: string, count = 10): Promise<MoodLogDoc[]> {
  const snap = await getDocs(
    query(moodCol(uid), orderBy("timestamp", "desc"), limit(count))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MoodLogDoc));
}

export function subscribeMoods(
  uid: string,
  callback: (moods: MoodLogDoc[]) => void
): Unsubscribe {
  const q = query(moodCol(uid), orderBy("timestamp", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as MoodLogDoc)));
  });
}

// ─── TRIGGERS ────────────────────────────────────────────────────────────────
export async function logMood(
  uid: string,
  data: {
    mood: MoodType;
    intensity: number;
    habitId?: string;
    note?: string;
  }
): Promise<MoodLogDoc> {
  const id = newId();
  const entry: Record<string, unknown> = {
    habitId: data.habitId || null,
    mood: data.mood,
    timestamp: serverTimestamp(),
    hourBlock: currentHourBlock(),
    note: data.note || null,
    intensity: data.intensity,
  };
  console.log("[Firestore] logMood →", { uid, path: `users/${uid}/moodLogs/${id}`, mood: data.mood });
  await setDoc(doc(moodCol(uid), id), entry);
  console.log("[Firestore] logMood OK ✓");
  await updateDailyStat(uid, { moods: 1 });
  return { id, ...(entry as Omit<MoodLogDoc, "id">) };
}

// ─── TRIGGERS ────────────────────────────────────────────────────────────────
export async function logTrigger(
  uid: string,
  data: {
    habitId: string;
    type: TriggerType;
    customLabel?: string;
    note?: string;
    moodAtMoment?: MoodType;
    aiGenerated?: boolean;
  }
): Promise<TriggerDoc> {
  const id = newId();
  console.log("[Firestore] logTrigger →", { uid, path: `users/${uid}/triggers/${id}`, type: data.type });
  const entry: Omit<TriggerDoc, "id"> = {
    habitId: data.habitId,
    type: data.type,
    customLabel: data.customLabel || null,
    note: data.note || null,
    timestamp: serverTimestamp() as TriggerDoc["timestamp"],
    aiGenerated: data.aiGenerated || false,
    moodAtMoment: data.moodAtMoment || null,
  };
  await setDoc(doc(triggerCol(uid), id), entry);
  console.log("[Firestore] logTrigger OK ✓");
  await updateDoc(habitRef(uid, data.habitId), { relapsesAvoided: increment(1) });
  await updateDailyStat(uid, { triggers: 1 });
  return { id, ...entry };
}

export async function deleteTrigger(uid: string, triggerId: string): Promise<void> {
  await deleteDoc(doc(triggerCol(uid), triggerId));
}

export async function getRecentTriggers(uid: string, count = 20): Promise<TriggerDoc[]> {
  const snap = await getDocs(
    query(triggerCol(uid), orderBy("timestamp", "desc"), limit(count))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TriggerDoc));
}

export function subscribeTriggers(
  uid: string,
  callback: (triggers: TriggerDoc[]) => void
): Unsubscribe {
  const q = query(triggerCol(uid), orderBy("timestamp", "desc"), limit(30));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TriggerDoc)));
  });
}

// ─── RELAPSES ────────────────────────────────────────────────────────────────
export async function recordRelapse(
  uid: string,
  data: {
    habitId: string;
    triggerId?: string;
    moodBefore?: MoodType;
    note?: string;
  }
): Promise<RelapseDoc> {
  // Get current streak before resetting
  const habitSnap = await getDoc(habitRef(uid, data.habitId));
  const habit = habitSnap.data() as HabitDoc;
  const lostStreak = habit?.currentStreak ?? 0;

  const id = newId();
  const entry: Omit<RelapseDoc, "id"> = {
    habitId: data.habitId,
    timestamp: serverTimestamp() as RelapseDoc["timestamp"],
    triggerId: data.triggerId || null,
    moodBefore: data.moodBefore || null,
    note: data.note || null,
    lostStreak,
  };
  await setDoc(doc(relapseCol(uid), id), entry);

  // Reset streak, clear lastStreakDate so today can be re-counted as day 0 start
  const todayStr = new Date().toLocaleDateString("en-CA");
  await updateDoc(habitRef(uid, data.habitId), {
    currentStreak: 0,
    lastRelapseDate: serverTimestamp(),
    lastStreakDate: todayStr, // mark today so we don't auto-increment back to 1 today
    longestStreak:
      lostStreak > (habit?.longestStreak ?? 0) ? lostStreak : habit?.longestStreak ?? 0,
  });

  await updateDailyStat(uid, { relapses: 1 });
  return { id, ...entry };
}

// ─── AI INSIGHTS ─────────────────────────────────────────────────────────────
export async function saveInsight(
  uid: string,
  data: {
    habitId: string;
    type: InsightType;
    message: string;
    confidence?: number;
  }
): Promise<AIInsightDoc> {
  const id = newId();
  const entry: Omit<AIInsightDoc, "id"> = {
    habitId: data.habitId,
    type: data.type,
    message: data.message,
    confidence: data.confidence ?? 0.8,
    createdAt: serverTimestamp() as AIInsightDoc["createdAt"],
    isRead: false,
  };
  await setDoc(doc(insightCol(uid), id), entry);
  return { id, ...entry };
}

export async function markInsightRead(uid: string, insightId: string): Promise<void> {
  await updateDoc(doc(insightCol(uid), insightId), { isRead: true });
}

export async function getRecentInsights(uid: string, count = 10): Promise<AIInsightDoc[]> {
  const snap = await getDocs(
    query(insightCol(uid), orderBy("createdAt", "desc"), limit(count))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIInsightDoc));
}

export function subscribeInsights(
  uid: string,
  callback: (insights: AIInsightDoc[]) => void
): Unsubscribe {
  const q = query(insightCol(uid), orderBy("createdAt", "desc"), limit(10));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AIInsightDoc)));
  });
}

export function subscribeRelapses(
  uid: string,
  callback: (relapses: RelapseDoc[]) => void
): Unsubscribe {
  const q = query(relapseCol(uid), orderBy("timestamp", "desc"), limit(20));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RelapseDoc)));
  });
}

// ─── DAILY STATS ─────────────────────────────────────────────────────────────
async function updateDailyStat(
  uid: string,
  delta: { moods?: number; triggers?: number; relapses?: number }
): Promise<void> {
  const dateKey = today();
  const ref = doc(dailyCol(uid), dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      date: dateKey,
      moods: delta.moods ?? 0,
      triggers: delta.triggers ?? 0,
      relapses: delta.relapses ?? 0,
      dominantMood: null,
      riskLevel: "low",
    });
  } else {
    const upd: Record<string, unknown> = {};
    if (delta.moods) upd.moods = increment(delta.moods);
    if (delta.triggers) upd.triggers = increment(delta.triggers);
    if (delta.relapses) upd.relapses = increment(delta.relapses);
    await updateDoc(ref, upd);
  }
}

export async function getDailyStats(uid: string, days = 30): Promise<DailyStatDoc[]> {
  const snap = await getDocs(
    query(dailyCol(uid), orderBy("date", "desc"), limit(days))
  );
  return snap.docs.map((d) => d.data() as DailyStatDoc);
}

export async function updateRiskLevel(
  uid: string,
  riskLevel: "low" | "medium" | "high",
  dominantMood: MoodType | null
): Promise<void> {
  const ref = doc(dailyCol(uid), today());
  await setDoc(ref, { riskLevel, dominantMood }, { merge: true });
}
