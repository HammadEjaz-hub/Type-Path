"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PARAGRAPHS } from "@/lib/curriculum";
import { fingerOf } from "@/lib/fingers";
import { sounds } from "@/lib/sound";
import { useTyping, type TypingStats } from "@/lib/useTyping";
import Hands from "./Hands";
import Keyboard from "./Keyboard";
import TypingCard from "./TypingCard";

interface Props {
  soundOn: boolean;
  onResult: (stats: TypingStats, mode: number) => void;
  addPracticeTime: (seconds: number) => void;
  addKeyErrors: (errors: Record<string, number>) => void;
  onGoDashboard: () => void;
}

type Mode = 1 | 3 | 5 | 0; // 0 = custom text

function useCountUp(value: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);
  return display;
}

function gradeFor(wpm: number): { label: string; classes: string } {
  if (wpm >= 55) return { label: "Elite Typist", classes: "bg-amber-100 text-amber-700 border-amber-200" };
  if (wpm >= 40) return { label: "Pro Typist", classes: "bg-brand-100 text-brand-800 border-brand-200" };
  if (wpm >= 28) return { label: "Rising Typist", classes: "bg-sky-100 text-sky-700 border-sky-200" };
  if (wpm >= 15) return { label: "Steady Typist", classes: "bg-violet-100 text-violet-700 border-violet-200" };
  return { label: "Getting Started", classes: "bg-gray-100 text-gray-600 border-gray-200" };
}

export default function TestView({ soundOn, onResult, addPracticeTime, addKeyErrors, onGoDashboard }: Props) {
  const [mode, setMode] = useState<Mode>(1);
  const [round, setRound] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [customText, setCustomText] = useState<string | null>(null);
  const [result, setResult] = useState<TypingStats | null>(null);
  const [pace, setPace] = useState<number[]>([]);
  const [finalPace, setFinalPace] = useState<number[]>([]);

  const timedText = useMemo(() => {
    const picks: string[] = [];
    let i = round % PARAGRAPHS.length;
    let len = 0;
    while (len < 900) {
      picks.push(PARAGRAPHS[i % PARAGRAPHS.length]);
      len += PARAGRAPHS[i % PARAGRAPHS.length].length;
      i++;
    }
    return picks.join(" ");
  }, [round]);

  const isCustom = mode === 0;
  const target = isCustom ? (customText ?? "") : timedText;
  const timeLimit = isCustom ? undefined : mode * 60;

  const typing = useTyping(target, {
    timeLimitSec: timeLimit,
    onKey: (correct) => {
      if (!soundOn) return;
      if (correct) sounds.click();
      else sounds.error();
    },
    onFinish: (stats, errors) => {
      addKeyErrors(errors);
      addPracticeTime(Math.round(stats.elapsedSec));
      onResult(stats, mode);
      setResult(stats);
      if (soundOn) sounds.success();
    },
  });

  /* ---- live pace sampling (WPM every ~2s) ---- */
  const statsRef = useRef(typing.stats);
  statsRef.current = typing.stats;
  const paceRef = useRef<number[]>([]);
  useEffect(() => {
    paceRef.current = [];
    setPace([]);
  }, [round, mode, customText]);
  useEffect(() => {
    if (!typing.started || typing.stats.done || result) return;
    const t = setInterval(() => {
      paceRef.current = [...paceRef.current.slice(-120), statsRef.current.wpm];
      setPace(paceRef.current);
    }, 2000);
    return () => clearInterval(t);
  }, [typing.started, typing.stats.done, result]);
  useEffect(() => {
    if (result) setFinalPace(paceRef.current);
  }, [result]);

  /* ---- last wrong key (keycap flash) ---- */
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

  const nextChar = target ? (target[typing.pos] ?? null) : null;
  const timeLeft =
    timeLimit && typing.started && !typing.stats.done
      ? Math.max(0, timeLimit - typing.stats.elapsedSec)
      : timeLimit ?? null;

  const startCustom = () => {
    const clean = customInput.replace(/\s+/g, " ").trim();
    if (clean.length < 20) return;
    setCustomText(clean.slice(0, 1200));
    setResult(null);
    setRound((r) => r + 1);
  };

  const showAnalytics = !result && !(isCustom && !customText);

  return (
    <div className="rise-in mx-auto max-w-4xl">
      <div className="mb-6 text-center">
        <h1 className="font-display text-[30px] font-bold tracking-tight text-gray-900">Typing Test</h1>
        <p className="mt-1 text-[14.5px] text-gray-500">
          Measure your real speed. Pick a duration — or paste your own text and practice on that.
        </p>
      </div>

      {/* segmented glass mode control */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
        <div className="glass-pill inline-flex items-center gap-1 p-1.5">
          {([1, 3, 5] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setResult(null); setRound((r) => r + 1); }}
              className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-all duration-200 ${
                mode === m
                  ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-pop"
                  : "text-gray-500 hover:text-brand-700"
              }`}
            >
              {m} min{m > 1 ? "s" : ""}
            </button>
          ))}
          <button
            onClick={() => { setMode(0); setResult(null); }}
            className={`rounded-full px-4 py-1.5 text-[13.5px] font-semibold transition-all duration-200 ${
              isCustom
                ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-pop"
                : "text-gray-500 hover:text-brand-700"
            }`}
          >
            ✎ Your own text
          </button>
        </div>
        {!isCustom && (
          <button
            onClick={() => { setResult(null); setRound((r) => r + 1); }}
            className="glass-pill hover-lift px-4 py-2 text-[13.5px] font-semibold text-gray-500 hover:text-brand-700"
          >
            ↻ New text
          </button>
        )}
      </div>

      {isCustom && !customText ? (
        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <label className="mb-2 block text-[13px] font-semibold text-gray-700">
            Paste any text — an article, a paragraph from a book, your own writing
          </label>
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            rows={6}
            placeholder="Paste at least a sentence or two here…"
            className="w-full resize-y rounded-2xl border border-white/60 bg-white/60 p-4 text-[14.5px] leading-relaxed text-gray-800 shadow-inner outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:bg-white/85"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px] text-gray-400">{customInput.trim().length} characters (min 20)</span>
            <button
              onClick={startCustom}
              disabled={customInput.replace(/\s+/g, " ").trim().length < 20}
              className="hover-lift rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              Start typing →
            </button>
          </div>
        </div>
      ) : result ? (
        <ResultCard
          stats={result}
          pace={finalPace}
          isCustom={isCustom}
          onAgain={() => { setResult(null); setRound((r) => r + 1); if (isCustom) setCustomText(null); }}
          onNewText={() => { setResult(null); setRound((r) => r + 3); if (isCustom) setCustomText(null); }}
          onDashboard={onGoDashboard}
        />
      ) : (
        <>
          <div className="glass-strong rounded-3xl p-6 sm:p-8">
            <TypingCard
              target={target}
              states={typing.states}
              pos={typing.pos}
              stats={typing.stats}
              lastWrongAt={typing.lastWrongAt}
              timeLeftSec={isCustom ? null : timeLeft}
            />
          </div>

          {/* live analytics row */}
          {showAnalytics && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div className="glass rounded-3xl p-5 lg:col-span-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Live pace</h3>
                  <span className="text-[12.5px] font-medium text-gray-400">
                    now <span className="font-bold text-brand-700 tnum">{typing.stats.wpm} WPM</span>
                  </span>
                </div>
                {pace.length >= 2 ? (
                  <PaceChart data={pace} height={86} />
                ) : (
                  <div className="flex h-[86px] items-center justify-center text-[13px] text-gray-400">
                    {typing.started ? "Collecting your pace…" : "Start typing — your speed curve appears here."}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                <div className="glass flex items-center gap-3.5 rounded-3xl p-4">
                  <AccuracyRing pct={typing.stats.accuracy} size={54} />
                  <div>
                    <div className="font-display text-[19px] font-bold leading-none text-gray-900 tnum">
                      {typing.stats.accuracy.toFixed(0)}%
                    </div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">Accuracy</div>
                  </div>
                </div>
                <div className="glass flex items-center gap-3.5 rounded-3xl p-4">
                  <div className="font-display text-[26px] leading-none">🎯</div>
                  <div>
                    <div className="font-display text-[19px] font-bold leading-none text-gray-900 tnum">
                      {typing.stats.consistency}%
                    </div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">Consistency</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 hidden md:block">
            <Keyboard nextChar={nextChar} pressedKey={typing.pressedKey} wrongKey={wrongKey} />
          </div>
          <div className="mt-5 hidden justify-center md:flex">
            <Hands active={nextChar ? fingerOf(nextChar) : null} />
          </div>
          {isCustom && (
            <p className="mt-4 text-center">
              <button onClick={() => { setCustomText(null); setResult(null); }} className="text-[13px] font-medium text-gray-500 hover:text-brand-700">
                ← Use different text
              </button>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- pace area chart ---------------- */

export function PaceChart({ data, height = 110 }: { data: number[]; height?: number }) {
  const w = 560;
  const h = height;
  const pad = 8;
  const max = Math.max(30, ...data) * 1.2;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const points = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${pad},${h - pad} ${points} ${x(data.length - 1)},${h - pad}`;
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" role="img" aria-label="Pace chart" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.33, 0.66].map((f) => (
        <line key={f} x1={pad} x2={w - pad} y1={h * f} y2={h * f} stroke="#065f46" strokeOpacity="0.07" strokeDasharray="3 5" />
      ))}
      <polygon points={area} fill="url(#paceFill)" />
      <polyline points={points} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(data.length - 1)} cy={y(last)} r="4" fill="#fff" stroke="#059669" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------------- accuracy ring ---------------- */

function AccuracyRing({ pct, size = 54 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(16,24,40,.07)" strokeWidth="5" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#059669"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (clamped / 100) * c}
        className="transition-all duration-500"
      />
    </svg>
  );
}

/* ---------------- results analytics panel ---------------- */

function ResultCard({
  stats,
  pace,
  isCustom,
  onAgain,
  onNewText,
  onDashboard,
}: {
  stats: TypingStats;
  pace: number[];
  isCustom: boolean;
  onAgain: () => void;
  onNewText: () => void;
  onDashboard: () => void;
}) {
  const wpm = useCountUp(stats.wpm);
  const acc = useCountUp(Math.round(stats.accuracy));
  const grade = gradeFor(stats.wpm);
  const errors = Math.max(0, stats.typedTotal - stats.correctChars);
  return (
    <div className="glass-strong rise-in rounded-3xl p-8 sm:p-10">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-brand-600">
          {isCustom ? "Custom practice complete" : "Test complete"}
        </span>
        <span className={`rounded-full border px-3 py-1 text-[12px] font-bold ${grade.classes}`}>🏅 {grade.label}</span>
      </div>

      <div className="mt-4 flex items-end justify-center gap-2">
        <span className="font-display text-[68px] font-bold leading-none tracking-tight text-gray-900 tnum">{wpm}</span>
        <span className="pb-2 text-[15px] font-semibold text-gray-400">WPM</span>
      </div>

      <div className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        <ResultTile label="Accuracy" value={`${acc}%`} />
        <ResultTile label="Consistency" value={`${stats.consistency}%`} />
        <ResultTile label="Raw WPM" value={String(stats.rawWpm)} />
        <ResultTile label="Chars typed" value={String(stats.typedTotal)} />
        <ResultTile label="Correct" value={String(stats.correctChars)} />
        <ResultTile label="Errors" value={String(errors)} danger={errors > 0} />
      </div>

      {pace.length >= 2 && (
        <div className="glass mx-auto mt-5 max-w-xl rounded-3xl p-5">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Your pace through the run</div>
          <PaceChart data={pace} height={96} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={onAgain}
          className="hover-lift rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-pop"
        >
          ↻ Retake test
        </button>
        {!isCustom && (
          <button onClick={onNewText} className="glass hover-lift rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-brand-700">
            New text
          </button>
        )}
        <button onClick={onDashboard} className="glass hover-lift rounded-xl px-6 py-2.5 text-sm font-semibold text-gray-700 hover:text-brand-700">
          📊 Dashboard
        </button>
      </div>
      <p className="mt-3 text-center text-[12.5px] text-gray-400">Saved to your dashboard history.</p>
    </div>
  );
}

function ResultTile({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="glass rounded-2xl px-3 py-3.5 text-center">
      <div className={`font-display text-[21px] font-bold tnum ${danger ? "text-red-500" : "text-gray-900"}`}>{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
