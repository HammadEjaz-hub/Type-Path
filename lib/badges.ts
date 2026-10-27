import { ALL_LESSONS, MODULES } from "./curriculum";
import { computeStreak, type StoreData } from "./store";

export interface BadgeDef {
  id: string;
  name: string;
  hint: string;
  icon: string;
  earned: (s: StoreData) => boolean;
}

function modulesCompleted(s: StoreData): number {
  return MODULES.filter((m) => m.lessons.every((l) => (s.lessons[l.id]?.stars ?? 0) > 0)).length;
}

function lessonsPassed(s: StoreData): number {
  return ALL_LESSONS.filter((l) => (s.lessons[l.id]?.stars ?? 0) > 0).length;
}

function bestTestWpm(s: StoreData): number {
  return s.tests.reduce((m, t) => Math.max(m, t.wpm), 0);
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-steps",
    name: "First Steps",
    hint: "Pass your first lesson",
    icon: "👣",
    earned: (s) => lessonsPassed(s) >= 1,
  },
  {
    id: "home-row-hero",
    name: "Home Row Hero",
    hint: "Finish Module 1 — Home Row",
    icon: "⌂",
    earned: (s) => MODULES[0].lessons.every((l) => (s.lessons[l.id]?.stars ?? 0) > 0),
  },
  {
    id: "sharp-shooter",
    name: "Sharp Shooter",
    hint: "Finish a lesson with 100% accuracy",
    icon: "🎯",
    earned: (s) => Object.values(s.lessons).some((r) => r.bestAcc >= 100),
  },
  {
    id: "speed-25",
    name: "Speed Club 25",
    hint: "Score 25+ WPM on a typing test",
    icon: "🚀",
    earned: (s) => bestTestWpm(s) >= 25,
  },
  {
    id: "speed-40",
    name: "Speed Club 40",
    hint: "Score 40+ WPM on a typing test",
    icon: "⚡",
    earned: (s) => bestTestWpm(s) >= 40,
  },
  {
    id: "speed-60",
    name: "Speed Club 60",
    hint: "Score 60+ WPM on a typing test",
    icon: "🔥",
    earned: (s) => bestTestWpm(s) >= 60,
  },
  {
    id: "streak-3",
    name: "3-Day Streak",
    hint: "Practice 3 days in a row",
    icon: "📅",
    earned: (s) => computeStreak(s.days) >= 3,
  },
  {
    id: "streak-7",
    name: "7-Day Streak",
    hint: "Practice 7 days in a row",
    icon: "🗓️",
    earned: (s) => computeStreak(s.days) >= 7,
  },
  {
    id: "halfway",
    name: "Halfway There",
    hint: "Complete 3 of the 6 modules",
    icon: "🧭",
    earned: (s) => modulesCompleted(s) >= 3,
  },
  {
    id: "graduate",
    name: "Graduate",
    hint: "Complete all 6 modules",
    icon: "🎓",
    earned: (s) => modulesCompleted(s) >= MODULES.length,
  },
  {
    id: "star-collector",
    name: "Star Collector",
    hint: "Earn 30 stars across lessons",
    icon: "⭐",
    earned: (s) => Object.values(s.lessons).reduce((a, r) => a + r.stars, 0) >= 30,
  },
  {
    id: "game-ace",
    name: "Game Ace",
    hint: "Score 30+ in Falling Words",
    icon: "🎮",
    earned: (s) => s.gameBest >= 30,
  },
];
