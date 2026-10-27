"use client";

import { MODULES, type LessonDef } from "@/lib/curriculum";
import type { StoreData } from "@/lib/store";

interface Props {
  store: StoreData;
  onOpenLesson: (lessonId: string) => void;
}

function Stars({ n, size = 15 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ fontSize: size }} className={i <= n ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

const MODULE_TINTS = [
  "rgba(236,253,245,.8)", // mint
  "rgba(240,249,255,.8)", // sky
  "rgba(255,251,235,.8)", // amber
  "rgba(245,243,255,.8)", // lavender
  "rgba(236,253,245,.8)",
  "rgba(253,242,248,.8)", // rose whisper
];

export default function LessonsPath({ store, onOpenLesson }: Props) {
  // global lesson order for locking
  let globalIdx = -1;
  const firstUnpassed = (() => {
    let count = 0;
    for (const m of MODULES) {
      for (const l of m.lessons) {
        if ((store.lessons[l.id]?.stars ?? 0) === 0) return count;
        count++;
      }
    }
    return count;
  })();

  return (
    <div className="rise-in mx-auto max-w-5xl">
      <div className="mb-8 text-center">
        <h1 className="font-display text-[32px] font-bold tracking-tight text-gray-900">
          Learn touch typing, <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">step by step</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-gray-500">
          Start on the home row — <span className="font-mono font-semibold text-gray-700">asdf · jkl;</span> — and add a few keys at a
          time. Pass a lesson at 90% accuracy to unlock the next.
        </p>
      </div>

      <div className="space-y-8">
        {MODULES.map((mod, mi) => {
          const done = mod.lessons.filter((l) => (store.lessons[l.id]?.stars ?? 0) > 0).length;
          const moduleLocked = mi > 0 && MODULES[mi - 1].lessons.some((l) => (store.lessons[l.id]?.stars ?? 0) === 0);
          return (
            <section key={mod.id} className="glass-tint rounded-3xl p-6 sm:p-7">
              <div className="mb-1 flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-[22px] font-bold text-brand-700 shadow-sm"
                  style={{ background: MODULE_TINTS[mi % MODULE_TINTS.length] }}
                >
                  {mod.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h2 className="font-display text-[20px] font-bold tracking-tight text-gray-900">
                      Module {mi + 1} · {mod.title}
                    </h2>
                    <span className="text-[12.5px] font-medium text-gray-400">
                      {done}/{mod.lessons.length} passed
                    </span>
                  </div>
                  <p className="mt-0.5 text-[13.5px] text-gray-500">{mod.tagline}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-900/[0.06]">
                    <div
                      className="progress-fill h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                      style={{ width: `${(done / mod.lessons.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mod.lessons.map((lesson) => {
                  globalIdx++;
                  const rec = store.lessons[lesson.id];
                  const passed = (rec?.stars ?? 0) > 0;
                  const locked = globalIdx > firstUnpassed;
                  const isNext = globalIdx === firstUnpassed;
                  return (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      number={globalIdx + 1}
                      passed={passed}
                      locked={locked}
                      isNext={isNext}
                      stars={rec?.stars ?? 0}
                      bestWpm={rec?.bestWpm ?? 0}
                      onOpen={() => onOpenLesson(lesson.id)}
                    />
                  );
                })}
              </div>
              {moduleLocked && (
                <p className="mt-4 text-[12.5px] text-gray-400">🔒 Finish the previous module to unlock these lessons.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function LessonCard({
  lesson,
  number,
  passed,
  locked,
  isNext,
  stars,
  bestWpm,
  onOpen,
}: {
  lesson: LessonDef;
  number: number;
  passed: boolean;
  locked: boolean;
  isNext: boolean;
  stars: number;
  bestWpm: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      disabled={locked}
      className={`group relative rounded-2xl p-4 text-left ${
        locked
          ? "glass cursor-not-allowed opacity-60"
          : isNext
            ? "glass hover-lift !border-brand-300"
            : "glass hover-lift"
      }`}
      style={isNext ? { background: "rgba(236,253,245,.6)" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg font-display text-[13px] font-bold ${
            passed
              ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-pop"
              : locked
                ? "bg-gray-200/80 text-gray-400"
                : "bg-brand-100 text-brand-700"
          }`}
        >
          {locked ? "🔒" : number}
        </span>
        {passed ? <Stars n={stars} /> : isNext ? (
          <span className="animate-pulse-ring rounded-full bg-brand-600 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
            Next up
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[14.5px] font-semibold leading-snug text-gray-800">{lesson.title}</div>
      <div className="mt-1 flex items-center gap-2 text-[12px] text-gray-400">
        {lesson.newKeys.length > 0 ? (
          <span>
            New:{" "}
            <span className="font-mono font-semibold text-gray-500">
              {lesson.newKeys.map((k) => (k === " " ? "␣" : k.toUpperCase())).join(" ")}
            </span>
          </span>
        ) : (
          <span>Review & build speed</span>
        )}
        {passed && bestWpm > 0 && <span className="ml-auto font-medium text-brand-600">best {bestWpm} WPM</span>}
      </div>
    </button>
  );
}
