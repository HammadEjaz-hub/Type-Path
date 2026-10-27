"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LESSON_INDEX,
  generateDrill,
  generateTestText,
  generateWordText,
  type LessonDef,
} from "@/lib/curriculum";
import { FINGERS, fingerOf } from "@/lib/fingers";
import { sounds } from "@/lib/sound";
import type { StoreData } from "@/lib/store";
import { useTyping, type TypingStats } from "@/lib/useTyping";
import Hands from "./Hands";
import Keyboard, { MiniKeyboard } from "./Keyboard";
import TypingCard from "./TypingCard";

interface Props {
  lesson: LessonDef;
  store: StoreData;
  onExit: () => void;
  onOpenLesson: (lessonId: string) => void;
  recordLesson: (id: string, stars: number, wpm: number, acc: number) => void;
  addKeyErrors: (errors: Record<string, number>) => void;
  addPracticeTime: (seconds: number) => void;
}

type Stage = "intro" | number | "report"; // number = index into lesson.stages

const PREF_KB = "typepath-show-keyboard";
const PREF_HANDS = "typepath-show-hands";

export function starsFor(lesson: LessonDef, wpm: number, acc: number): number {
  if (acc < 90 || wpm < lesson.minWpm) return 0;
  if (acc >= 98 && wpm >= Math.ceil(lesson.minWpm * 1.5)) return 3;
  if (acc >= 95) return 2;
  return 1;
}

export default function Practice({
  lesson,
  store,
  onExit,
  onOpenLesson,
  recordLesson,
  addKeyErrors,
  addPracticeTime,
}: Props) {
  const meta = LESSON_INDEX[lesson.id];
  const [stage, setStage] = useState<Stage>("intro");
  const [attempt, setAttempt] = useState(0);
  const [showKb, setShowKb] = useState(true);
  const [showHands, setShowHands] = useState(true);
  const [report, setReport] = useState<{
    stats: TypingStats;
    errors: Record<string, number>;
    stars: number;
    passed: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      setShowKb(window.localStorage.getItem(PREF_KB) !== "0");
      setShowHands(window.localStorage.getItem(PREF_HANDS) !== "0");
    } catch { /* ignore */ }
  }, []);

  const stageIdx = typeof stage === "number" ? stage : -1;
  const stageKind = stageIdx >= 0 ? lesson.stages[stageIdx] : null;
  const isTestStage = stageKind === "test";

  const target = useMemo(() => {
    if (stage === "intro" || stage === "report") return " ";
    if (stageKind === "drill") return generateDrill(lesson, attempt);
    if (stageKind === "words") return generateWordText(lesson, attempt);
    return generateTestText(lesson, attempt);
  }, [stage, stageKind, lesson, attempt]);

  const onFinish = useCallback(
    (stats: TypingStats, errors: Record<string, number>) => {
      addKeyErrors(errors);
      addPracticeTime(Math.round(stats.elapsedSec));
      if (!isTestStage) {
        // drill / words stage complete — move on automatically
        const next = stageIdx + 1;
        if (next < lesson.stages.length) {
          setStage(next);
          setAttempt((a) => a + 1);
        }
        return;
      }
      const stars = starsFor(lesson, stats.wpm, stats.accuracy);
      const passed = stars > 0;
      if (passed) {
        recordLesson(lesson.id, stars, stats.wpm, stats.accuracy);
        if (store.soundOn) sounds.success();
      } else if (store.soundOn) {
        sounds.fail();
      }
      setReport({ stats, errors, stars, passed });
      setStage("report");
    },
    [isTestStage, stageIdx, lesson, recordLesson, addKeyErrors, addPracticeTime, store.soundOn]
  );

  const typing = useTyping(target, {
    onFinish,
    pausable: true,
    onKey: (correct) => {
      if (!store.soundOn) return;
      if (correct) sounds.click();
      else sounds.error();
    },
  });

  const nextChar = stage === "intro" || stage === "report" ? null : (target[typing.pos] ?? null);
  const activeFinger = nextChar ? fingerOf(nextChar) : null;

  /* last wrongly-pressed key, for the keycap red flash */
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const pressedRef = useRef<string | null>(null);
  pressedRef.current = typing.pressedKey;
  useEffect(() => {
    if (typing.lastWrongAt < 0) return;
    const k = pressedRef.current;
    if (!k) return;
    setWrongKey(k);
    const t = setTimeout(() => setWrongKey(null), 280);
    return () => clearTimeout(t);
  }, [typing.lastWrongAt]);

  const nextLesson = (() => {
    const all = Object.values(LESSON_INDEX).sort((a, b) => a.globalIdx - b.globalIdx);
    const nxt = all[meta.globalIdx + 1];
    return nxt?.lesson ?? null;
  })();

  const toggleKb = () => {
    setShowKb((v) => {
      try { window.localStorage.setItem(PREF_KB, v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };
  const toggleHands = () => {
    setShowHands((v) => {
      try { window.localStorage.setItem(PREF_HANDS, v ? "0" : "1"); } catch { /* ignore */ }
      return !v;
    });
  };

  /* ------------------------------ intro ------------------------------ */
  if (stage === "intro") {
    return (
      <div className="rise-in mx-auto max-w-3xl">
        <button onClick={onExit} className="mb-5 text-[13px] font-medium text-gray-500 transition-colors hover:text-brand-700">
          ← Back to path
        </button>
        <div className="glass-strong rounded-3xl p-7 sm:p-9">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-brand-600">
            {meta.module.title} · Lesson {meta.globalIdx + 1}
          </div>
          <h1 className="mt-2 font-display text-[30px] font-bold tracking-tight text-gray-900">
            {lesson.title}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-600">{lesson.intro}</p>

          {lesson.newKeys.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                {lesson.newKeys.length === 1 ? "New key" : "New keys"}
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson.newKeys.map((k) => {
                  const f = fingerOf(k);
                  return (
                    <span
                      key={k}
                      className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[14px] font-semibold text-gray-700 shadow-sm"
                      style={{
                        background: f
                          ? `linear-gradient(180deg, ${FINGERS[f].light}, ${FINGERS[f].fill})`
                          : "#f3f4f6",
                        borderColor: "rgba(16,24,40,.08)",
                        boxShadow: f ? `inset 0 -2px 0 ${FINGERS[f].edge}` : undefined,
                      }}
                    >
                      <span className="font-mono text-[16px]">{k === " " ? "Space" : k.toUpperCase()}</span>
                      {f && <span className="text-[12px] font-medium text-gray-500">{FINGERS[f].name}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className="glass mt-7 rounded-2xl p-4 text-[13.5px] leading-relaxed text-brand-900"
            style={{ background: "rgba(236,253,245,.55)" }}
          >
            <strong className="font-semibold">How this lesson works:</strong>{" "}
            {lesson.stages.map((s) => (s === "drill" ? "finger drills" : s === "words" ? "word practice" : "a pass test")).join(" → ")}.
            To pass, score at least <strong>90% accuracy</strong> and <strong>{lesson.minWpm}+ WPM</strong> on the test.
          </div>

          <div className="mt-7 hidden md:block">
            <Hands active={lesson.newKeys.length ? fingerOf(lesson.newKeys[0]) : null} />
          </div>

          <button
            onClick={() => { setStage(0); setAttempt((a) => a + 1); }}
            className="animate-pulse-ring hover-lift mt-8 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-7 py-3 text-[15px] font-semibold text-white shadow-pop"
          >
            Start lesson →
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ report ------------------------------ */
  if (stage === "report" && report) {
    const topErrors = Object.entries(report.errors).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return (
      <div className="rise-in mx-auto max-w-3xl">
        <div className="glass-strong rounded-3xl p-7 text-center sm:p-9">
          <div className="flex items-end justify-center gap-1.5" aria-label={`${report.stars} of 3 stars`}>
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`star-pop ${i <= report.stars ? "text-amber-400" : "text-gray-200"}`}
                style={{ animationDelay: `${(i - 1) * 0.14}s`, fontSize: i === 2 ? 44 : 34 }}
              >
                ★
              </span>
            ))}
          </div>
          <h2 className="mt-3 font-display text-[26px] font-bold tracking-tight text-gray-900">
            {report.passed ? "Lesson passed!" : "Not quite yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[14px] text-gray-500">
            {report.passed
              ? "Great work — the next lesson is unlocked. Keep the streak going."
              : `You need 90% accuracy and ${lesson.minWpm}+ WPM to pass. Accuracy first — speed follows.`}
          </p>

          <div className="mx-auto mt-7 grid max-w-lg grid-cols-4 gap-3">
            <ReportStat label="WPM" value={String(report.stats.wpm)} />
            <ReportStat label="Accuracy" value={`${report.stats.accuracy.toFixed(0)}%`} />
            <ReportStat label="Time" value={`${Math.round(report.stats.elapsedSec)}s`} />
            <ReportStat label="Chars" value={String(report.stats.typedTotal)} />
          </div>

          {topErrors.length > 0 ? (
            <div className="mx-auto mt-7 max-w-md">
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-gray-400">
                Trickier keys this time
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {topErrors.map(([ch, n]) => (
                  <span key={ch} className="glass-pill px-2.5 py-1 font-mono text-[13px] font-semibold text-red-600" style={{ background: "rgba(254,242,242,.7)" }}>
                    {ch === " " ? "space" : ch} × {n}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex justify-center">
                <MiniKeyboard errors={report.errors} />
              </div>
            </div>
          ) : (
            <p className="mt-6 text-[14px] font-medium text-brand-700">Flawless — not a single mistake. 🎯</p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { setReport(null); setStage(0); setAttempt((a) => a + 1); }}
              className="glass hover-lift rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-brand-700"
            >
              ↻ Retry lesson
            </button>
            {report.passed && nextLesson && (
              <button
                onClick={() => onOpenLesson(nextLesson.id)}
                className="hover-lift rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop"
              >
                Next lesson →
              </button>
            )}
            <button
              onClick={onExit}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-800"
            >
              Back to path
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ practice ------------------------------ */
  return (
    <div className="rise-in mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={onExit} className="text-[13px] font-medium text-gray-500 transition-colors hover:text-brand-700">
          ← Path
        </button>
        <div className="text-[14px] font-semibold text-gray-800">{lesson.title}</div>
        <div className="flex items-center gap-1.5">
          {lesson.stages.map((s, i) => (
            <span
              key={i}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors duration-200 ${
                i === stageIdx
                  ? "bg-brand-600 text-white shadow-pop"
                  : i < stageIdx
                    ? "bg-brand-100 text-brand-700"
                    : "bg-white/60 text-gray-400"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ControlBtn onClick={() => typing.setPause(!typing.paused)} title="Pause / resume (Esc)">
            {typing.paused ? "▶ Resume" : "⏸ Pause"}
          </ControlBtn>
          <ControlBtn
            onClick={() => { typing.reset(); setAttempt((a) => a + 1); }}
            title="Restart this stage"
          >
            ↻ Restart
          </ControlBtn>
          <ControlBtn onClick={toggleKb} active={showKb} title="Show or hide the keyboard guide">
            ⌨ Keyboard
          </ControlBtn>
          <ControlBtn onClick={toggleHands} active={showHands} title="Show or hide the hands guide">
            ✋ Hands
          </ControlBtn>
        </div>
      </div>

      <p className="glass mb-4 rounded-xl px-4 py-2.5 text-[13px] text-amber-800 sm:hidden" style={{ background: "rgba(255,251,235,.65)" }}>
        📱 Typing lessons work best with a physical keyboard — you can look around, but grab a keyboard to really practice.
      </p>

      <div className="glass-strong relative rounded-3xl p-6 sm:p-8">
        <TypingCard
          target={target}
          states={typing.states}
          pos={typing.pos}
          stats={typing.stats}
          lastWrongAt={typing.lastWrongAt}
        />
        {typing.paused && (
          <div className="glass-strong absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl" style={{ background: "rgba(255,255,255,.78)" }}>
            <div className="font-display text-[24px] font-bold text-gray-800">Paused</div>
            <button
              onClick={() => typing.setPause(false)}
              className="hover-lift rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition-colors duration-200 hover:bg-brand-700"
            >
              ▶ Resume (Esc)
            </button>
          </div>
        )}
      </div>

      {showKb && (
        <div className="mt-5 hidden md:block">
          <Keyboard nextChar={nextChar} pressedKey={typing.pressedKey} wrongKey={wrongKey} />
        </div>
      )}
      {!showKb && showHands && <div className="mt-5 hidden md:block" />}

      {showHands && (
        <div className="mt-5 hidden justify-center md:flex">
          <Hands active={activeFinger} />
        </div>
      )}

      <p className="mt-4 text-center text-[12.5px] text-gray-400">
        Just start typing — the timer begins with your first key. Esc pauses. Backspace fixes a letter.
      </p>
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`glass-pill px-3 py-1.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-px ${
        active === undefined
          ? "text-gray-600 hover:text-brand-700"
          : active
            ? "!border-brand-300 text-brand-700"
            : "text-gray-400 hover:text-gray-600"
      }`}
      style={
        active
          ? { background: "rgba(236,253,245,.75)" }
          : undefined
      }
    >
      {children}
    </button>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-3 py-3">
      <div className="font-display text-[22px] font-bold leading-none text-gray-900 tnum">{value}</div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
