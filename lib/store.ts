import { useCallback, useEffect, useState } from "react";

export interface LessonRecord {
  stars: number; // 0 = not passed, 1-3 = passed with stars
  bestWpm: number;
  bestAcc: number;
}

export interface TestResult {
  ts: number; // epoch ms
  wpm: number;
  acc: number;
  seconds: number;
  mode: number; // minutes (1/3/5) or 0 = custom text
}

export interface StoreData {
  lessons: Record<string, LessonRecord>;
  tests: TestResult[];
  /** yyyy-mm-dd strings of days with any typing activity */
  days: string[];
  /** per-char error counts (target char -> mistakes made on it) */
  keyErrors: Record<string, number>;
  gameBest: number;
  /** yyyy-mm-dd -> seconds practiced that day */
  practiceByDay: Record<string, number>;
  /** daily practice goal, minutes */
  dailyGoalMin: number;
  /** sound effects on/off */
  soundOn: boolean;
}

const KEY = "typepath-store-v1";

export const EMPTY_STORE: StoreData = {
  lessons: {},
  tests: [],
  days: [],
  keyErrors: {},
  gameBest: 0,
  practiceByDay: {},
  dailyGoalMin: 10,
  soundOn: true,
};

function load(): StoreData {
  if (typeof window === "undefined") return EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_STORE;
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    return { ...EMPTY_STORE, ...parsed };
  } catch {
    return EMPTY_STORE;
  }
}

export function todayStr(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Consecutive-day streak ending today (or yesterday, if today not started yet). */
export function computeStreak(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(todayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(todayStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function useStore() {
  const [data, setData] = useState<StoreData>(EMPTY_STORE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(load());
    setHydrated(true);
  }, []);

  const update = useCallback((fn: (prev: StoreData) => StoreData) => {
    setData((prev) => {
      const next = fn(prev);
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in-memory state */
      }
      return next;
    });
  }, []);

  const markActiveDay = useCallback(() => {
    update((prev) => {
      const t = todayStr();
      if (prev.days.includes(t)) return prev;
      return { ...prev, days: [...prev.days, t].slice(-400) };
    });
  }, [update]);

  const addPracticeTime = useCallback(
    (seconds: number) => {
      if (seconds <= 0) return;
      markActiveDay();
      update((prev) => {
        const t = todayStr();
        return {
          ...prev,
          practiceByDay: {
            ...prev.practiceByDay,
            [t]: (prev.practiceByDay[t] ?? 0) + seconds,
          },
        };
      });
    },
    [update, markActiveDay]
  );

  const addKeyErrors = useCallback(
    (errors: Record<string, number>) => {
      if (Object.keys(errors).length === 0) return;
      update((prev) => {
        const merged = { ...prev.keyErrors };
        for (const [k, v] of Object.entries(errors)) {
          merged[k] = (merged[k] ?? 0) + v;
        }
        return { ...prev, keyErrors: merged };
      });
    },
    [update]
  );

  const recordLesson = useCallback(
    (lessonId: string, stars: number, wpm: number, acc: number) => {
      markActiveDay();
      update((prev) => {
        const old = prev.lessons[lessonId];
        return {
          ...prev,
          lessons: {
            ...prev.lessons,
            [lessonId]: {
              stars: Math.max(old?.stars ?? 0, stars),
              bestWpm: Math.max(old?.bestWpm ?? 0, wpm),
              bestAcc: Math.max(old?.bestAcc ?? 0, acc),
            },
          },
        };
      });
    },
    [update, markActiveDay]
  );

  const recordTest = useCallback(
    (result: TestResult) => {
      markActiveDay();
      update((prev) => ({ ...prev, tests: [...prev.tests, result].slice(-300) }));
    },
    [update, markActiveDay]
  );

  const recordGameBest = useCallback(
    (score: number) => {
      update((prev) => ({ ...prev, gameBest: Math.max(prev.gameBest, score) }));
    },
    [update]
  );

  const setDailyGoal = useCallback(
    (min: number) => update((prev) => ({ ...prev, dailyGoalMin: min })),
    [update]
  );

  const setSoundOn = useCallback(
    (on: boolean) => update((prev) => ({ ...prev, soundOn: on })),
    [update]
  );

  return {
    data,
    hydrated,
    recordLesson,
    recordTest,
    recordGameBest,
    markActiveDay,
    addPracticeTime,
    addKeyErrors,
    setDailyGoal,
    setSoundOn,
  };
}
