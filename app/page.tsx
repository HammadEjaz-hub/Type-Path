"use client";

import { useCallback, useMemo, useState } from "react";
import Dashboard from "@/components/Dashboard";
import GameView from "@/components/GameView";
import LessonsPath from "@/components/LessonsPath";
import Practice from "@/components/Practice";
import TestView from "@/components/TestView";
import { LESSON_INDEX } from "@/lib/curriculum";
import { useStore } from "@/lib/store";

type View = "lessons" | "test" | "games" | "dashboard" | "practice";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "lessons", label: "Lessons", icon: "🗺️" },
  { id: "test", label: "Typing Test", icon: "⏱️" },
  { id: "games", label: "Games", icon: "🎈" },
  { id: "dashboard", label: "Dashboard", icon: "📊" },
];

export default function Home() {
  const store = useStore();
  const [view, setView] = useState<View>("lessons");
  const [lessonId, setLessonId] = useState<string | null>(null);

  const openLesson = useCallback((id: string) => {
    setLessonId(id);
    setView("practice");
    window.scrollTo({ top: 0 });
  }, []);

  const goView = useCallback((v: View) => {
    setView(v);
    window.scrollTo({ top: 0 });
  }, []);

  const activeLesson = useMemo(
    () => (lessonId ? LESSON_INDEX[lessonId]?.lesson ?? null : null),
    [lessonId]
  );

  const totalStars = Object.values(store.data.lessons).reduce((a, r) => a + r.stars, 0);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* ambient mesh gradient backdrop */}
      <div className="mesh-bg" aria-hidden="true" />

      {/* ---------------- header ---------------- */}
      <header className="glass-bar sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <button onClick={() => goView("lessons")} className="flex items-center gap-2.5" aria-label="TypePath home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 font-display text-[17px] font-bold text-white shadow-pop">
              ⌨
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-bold tracking-tight text-gray-900">
                Type<span className="text-brand-600">Path</span>
              </span>
              <span className="block text-[10.5px] font-medium uppercase tracking-wider text-gray-400">
                Touch typing course
              </span>
            </span>
          </button>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => {
              const active = view === n.id || (n.id === "lessons" && view === "practice");
              return (
                <button
                  key={n.id}
                  onClick={() => goView(n.id)}
                  className={`rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-pop"
                      : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                  }`}
                >
                  <span className="mr-1.5">{n.icon}</span>
                  {n.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {totalStars > 0 && (
              <span className="glass-pill hidden items-center gap-1 px-3 py-1.5 text-[13px] font-bold text-amber-600 sm:flex" style={{ background: "rgba(255,251,235,.65)" }}>
                ★ {totalStars}
              </span>
            )}
            <button
              onClick={() => store.setSoundOn(!store.data.soundOn)}
              title={store.data.soundOn ? "Mute sounds" : "Unmute sounds"}
              aria-label={store.data.soundOn ? "Mute sounds" : "Unmute sounds"}
              className="glass-pill flex h-9 w-9 items-center justify-center text-[15px] transition-all duration-200 hover:-translate-y-px"
            >
              {store.data.soundOn ? "🔊" : "🔇"}
            </button>
          </div>
        </div>

        {/* mobile nav */}
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5 md:hidden" aria-label="Main mobile">
          {NAV.map((n) => {
            const active = view === n.id || (n.id === "lessons" && view === "practice");
            return (
              <button
                key={n.id}
                onClick={() => goView(n.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                  active ? "bg-brand-600 text-white shadow-pop" : "bg-white/60 text-gray-500"
                }`}
              >
                {n.icon} {n.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!store.hydrated ? (
          <div className="flex h-64 items-center justify-center text-gray-400">
            <span className="animate-pulse text-[14px]">Loading your course…</span>
          </div>
        ) : view === "practice" && activeLesson ? (
          <Practice
            key={activeLesson.id}
            lesson={activeLesson}
            store={store.data}
            onExit={() => goView("lessons")}
            onOpenLesson={openLesson}
            recordLesson={store.recordLesson}
            addKeyErrors={store.addKeyErrors}
            addPracticeTime={store.addPracticeTime}
          />
        ) : view === "test" ? (
          <TestView
            soundOn={store.data.soundOn}
            onResult={(stats, mode) =>
              store.recordTest({ ts: Date.now(), wpm: stats.wpm, acc: stats.accuracy, seconds: Math.round(stats.elapsedSec), mode })
            }
            addPracticeTime={store.addPracticeTime}
            addKeyErrors={store.addKeyErrors}
            onGoDashboard={() => goView("dashboard")}
          />
        ) : view === "games" ? (
          <GameView store={store.data} recordGameBest={store.recordGameBest} markActiveDay={store.markActiveDay} />
        ) : view === "dashboard" ? (
          <Dashboard
            store={store.data}
            onOpenLesson={openLesson}
            onGoTest={() => goView("test")}
            setDailyGoal={store.setDailyGoal}
            setSoundOn={store.setSoundOn}
          />
        ) : (
          <LessonsPath store={store.data} onOpenLesson={openLesson} />
        )}
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="border-t border-white/50 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <p className="text-[12.5px] text-gray-400">
            <span className="font-semibold text-gray-500">TypePath</span> — ten fingers, zero looking down.
          </p>
          <p className="text-[12.5px] text-gray-400">Your progress is saved privately on this device.</p>
        </div>
      </footer>
    </div>
  );
}
