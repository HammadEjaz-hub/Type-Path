"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ALL_LESSONS, COMMON_WORDS, gameWordsFor } from "@/lib/curriculum";
import { sounds } from "@/lib/sound";
import type { StoreData } from "@/lib/store";

interface FallingWord {
  id: number;
  word: string;
  x: number; // percent
  y: number; // px from top
  hue: string;
  wobble: number;
}

interface Particle {
  dx: number;
  dy: number;
  color: string;
}

interface Burst {
  id: number;
  x: number;
  y: number;
  text: string;
  particles: Particle[];
}

const STAGE_H = 470;
const PASTELS = ["#fda4af", "#fdba74", "#fde047", "#86efac", "#7dd3fc", "#c4b5fd", "#f9a8d4"];

function comboMult(combo: number): number {
  if (combo >= 8) return 3;
  if (combo >= 4) return 2;
  return 1;
}

/** deterministic pseudo-random in [0,1) for ambient motes */
function seeded(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export default function GameView({
  store,
  recordGameBest,
  markActiveDay,
}: {
  store: StoreData;
  recordGameBest: (score: number) => void;
  markActiveDay: () => void;
}) {
  const [mode, setMode] = useState<"adaptive" | "free">("adaptive");
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [count, setCount] = useState<number | null>(null); // 3..1, 0 = GO!
  const [words, setWords] = useState<FallingWord[]>([]);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [missFlash, setMissFlash] = useState(0);
  const [shake, setShake] = useState(false);
  const [finalStats, setFinalStats] = useState({ popped: 0, maxCombo: 0 });

  const idRef = useRef(1);
  const wordsRef = useRef<FallingWord[]>([]);
  const inputRef = useRef("");
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const poppedRef = useRef(0);
  const maxComboRef = useRef(0);
  const startRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const rafRef = useRef<number>(0);

  const bank = useMemo(() => {
    if (mode === "free") return COMMON_WORDS.filter((w) => w.length >= 3 && w.length <= 7);
    const lastPassed = ALL_LESSONS.reduce(
      (acc, l, i) => ((store.lessons[l.id]?.stars ?? 0) > 0 ? i : acc),
      -1
    );
    const idx = Math.max(4, lastPassed); // at least home row
    return gameWordsFor(ALL_LESSONS[idx].keys);
  }, [mode, store.lessons]);

  const motes = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        left: 4 + seeded(i, 1) * 92,
        top: 8 + seeded(i, 2) * 55,
        size: 3 + seeded(i, 3) * 4,
        dur: 5 + seeded(i, 4) * 6,
        delay: -seeded(i, 5) * 6,
        opacity: 0.35 + seeded(i, 6) * 0.4,
      })),
    []
  );

  const endGame = useCallback(
    (finalScore: number) => {
      setPlaying(false);
      setCount(null);
      setOver(true);
      setFinalStats({ popped: poppedRef.current, maxCombo: maxComboRef.current });
      recordGameBest(finalScore);
      markActiveDay();
      cancelAnimationFrame(rafRef.current);
    },
    [recordGameBest, markActiveDay]
  );

  const start = useCallback(() => {
    wordsRef.current = [];
    inputRef.current = "";
    livesRef.current = 3;
    comboRef.current = 0;
    poppedRef.current = 0;
    maxComboRef.current = 0;
    idRef.current = 1;
    setWords([]);
    setInput("");
    setScore(0);
    setLives(3);
    setCombo(0);
    setBursts([]);
    setOver(false);
    setPlaying(false);
    setCount(3); // countdown takes it from here
  }, []);

  /* countdown: 3 · 2 · 1 · GO! → playing */
  useEffect(() => {
    if (count === null) return;
    const t = setTimeout(
      () => {
        if (count > 0) {
          setCount(count - 1);
        } else {
          setCount(null);
          startRef.current = performance.now();
          lastSpawnRef.current = 0;
          setPlaying(true);
        }
      },
      count === 0 ? 520 : 640
    );
    return () => clearTimeout(t);
  }, [count]);

  // game loop
  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      const elapsed = (t - startRef.current) / 1000;
      const speed = 34 + elapsed * 1.6; // px per second, ramps up
      const spawnEvery = Math.max(1150, 2300 - elapsed * 22);

      let list = wordsRef.current.map((w) => ({ ...w, y: w.y + speed * dt }));
      // misses
      const survivors: FallingWord[] = [];
      for (const w of list) {
        if (w.y > STAGE_H - 46) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          setMissFlash((f) => f + 1);
          setShake(true);
          comboRef.current = 0;
          setCombo(0);
          if (store.soundOn) sounds.fail();
          if (inputRef.current && w.word.startsWith(inputRef.current)) {
            inputRef.current = "";
            setInput("");
          }
        } else {
          survivors.push(w);
        }
      }
      list = survivors;

      if (livesRef.current <= 0) {
        wordsRef.current = list;
        setWords(list);
        setScore((s) => {
          endGame(s);
          return s;
        });
        return;
      }

      if (t - lastSpawnRef.current > spawnEvery && list.length < 6) {
        lastSpawnRef.current = t;
        const word = bank[Math.floor(Math.random() * bank.length)];
        list = [
          ...list,
          {
            id: idRef.current++,
            word,
            x: 4 + Math.random() * 82,
            y: -8,
            hue: PASTELS[Math.floor(Math.random() * PASTELS.length)],
            wobble: Math.random() * 6 - 3,
          },
        ];
      }
      wordsRef.current = list;
      setWords(list);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, bank, endGame]);

  // typing input
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        inputRef.current = inputRef.current.slice(0, -1);
        setInput(inputRef.current);
        return;
      }
      if (!/^[a-z]$/.test(e.key)) return;
      const candidate = inputRef.current + e.key;
      const list = wordsRef.current;
      const matches = list
        .filter((w) => w.word.startsWith(candidate))
        .sort((a, b) => b.y - a.y);
      if (matches.length > 0) {
        const target = matches[0];
        if (candidate === target.word) {
          wordsRef.current = list.filter((w) => w.id !== target.id);
          setWords(wordsRef.current);
          comboRef.current += 1;
          const c = comboRef.current;
          maxComboRef.current = Math.max(maxComboRef.current, c);
          poppedRef.current += 1;
          setCombo(c);
          const mult = comboMult(c);
          const points = target.word.length * 2 * mult;
          setScore((s) => s + points);
          if (store.soundOn) sounds.pop(Math.min(c, 10));
          const particles: Particle[] = Array.from({ length: 7 }, (_, i) => {
            const a = (i / 7) * Math.PI * 2 + Math.random() * 0.6;
            const d = 26 + Math.random() * 24;
            return {
              dx: Math.cos(a) * d,
              dy: Math.sin(a) * d - 12,
              color: PASTELS[i % PASTELS.length],
            };
          });
          const burst: Burst = {
            id: target.id,
            x: target.x,
            y: target.y,
            text: mult > 1 ? `+${points} ×${mult}` : `+${points}`,
            particles,
          };
          setBursts((b) => [...b.slice(-5), burst]);
          setTimeout(() => setBursts((b) => b.filter((x) => x.id !== burst.id)), 720);
          inputRef.current = "";
          setInput("");
        } else {
          inputRef.current = candidate;
          setInput(candidate);
        }
      } else if (inputRef.current) {
        // restart with just this letter if it starts another word
        if (list.some((w) => w.word.startsWith(e.key))) {
          inputRef.current = e.key;
          setInput(e.key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, store.soundOn]);

  const targetId = useMemo(() => {
    if (!input) return null;
    const m = words.filter((w) => w.word.startsWith(input)).sort((a, b) => b.y - a.y)[0];
    return m?.id ?? null;
  }, [words, input]);

  const mult = comboMult(combo);
  const busy = playing || count !== null;

  return (
    <div className="rise-in mx-auto max-w-4xl">
      <div className="mb-5 text-center">
        <h1 className="font-display text-[30px] font-bold tracking-tight text-gray-900">Falling Words 🎈</h1>
        <p className="mt-1 text-[14.5px] text-gray-500">
          Words are drifting down from the sky — type one completely to pop it before it lands. You have 3 lives.
        </p>
      </div>

      {/* HUD — glass pills */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2.5">
        <div className="glass-pill inline-flex items-center gap-1 p-1.5">
          {(["adaptive", "free"] as const).map((m) => (
            <button
              key={m}
              disabled={busy}
              onClick={() => setMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition-all duration-200 disabled:opacity-60 ${
                mode === m ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-pop" : "text-gray-500 hover:text-brand-700"
              }`}
            >
              {m === "adaptive" ? "🎓 My letters" : "🌍 All words"}
            </button>
          ))}
        </div>
        <Hud label="Score" value={String(score)} />
        <Hud label="Best" value={String(Math.max(store.gameBest, score))} />
        <div className="glass-pill flex items-center gap-1 px-3.5 py-2" aria-label={`${lives} lives left`}>
          {[1, 2, 3].map((i) =>
            i <= lives ? (
              <span key={i} className="text-[15px]">❤️</span>
            ) : (
              <span key={`lost-${i}`} className="heart-lost text-[15px]">💔</span>
            )
          )}
        </div>
        {combo >= 2 && (
          <div
            key={combo}
            className="glass-pill combo-pulse flex items-center gap-1.5 px-3.5 py-2"
            style={{ background: "rgba(255,251,235,.75)" }}
            aria-label={`Combo ${combo}, multiplier ${mult}`}
          >
            <span className="text-[14px]">🔥</span>
            <span className="font-display text-[14px] font-bold text-amber-600 tnum">×{mult}</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-500">{combo} combo</span>
          </div>
        )}
        {playing && (
          <button
            onClick={() => endGame(score)}
            className="glass-pill px-3.5 py-2 text-[12.5px] font-semibold text-gray-500 transition-colors hover:text-red-500"
          >
            End game
          </button>
        )}
      </div>

      {/* stage */}
      <div
        className={`relative overflow-hidden rounded-[1.75rem] border border-sky-200/70 shadow-glass-lg ${shake ? "stage-shake" : ""}`}
        style={{
          height: STAGE_H,
          background:
            "linear-gradient(180deg,#38bdf8 0%,#7dd3fc 32%,#bae6fd 58%,#a7f3d0 88%,#d1fae5 100%)",
        }}
        onAnimationEnd={() => setShake(false)}
      >
        {/* sun */}
        <div className="animate-float-slow absolute right-8 top-6 z-[1] h-16 w-16 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-[0_0_50px_18px_rgba(253,224,71,.5)]" />

        {/* ambient light motes */}
        {motes.map((m, i) => (
          <span
            key={i}
            className="mote z-[1]"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: m.size,
              height: m.size,
              opacity: m.opacity,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
            }}
          />
        ))}

        {/* clouds — far layer (slow, faint, reverse) */}
        {[
          { top: 108, dur: "95s", delay: "-30s", scale: 0.62 },
          { top: 178, dur: "110s", delay: "-72s", scale: 0.5 },
        ].map((c, i) => (
          <div
            key={`far-${i}`}
            className="cloud-drift-rev absolute left-0 z-[1] opacity-60"
            style={{ top: c.top, animationDuration: c.dur, animationDelay: c.delay, transform: `scale(${c.scale})` }}
          >
            <div className="relative h-10 w-32">
              <div className="absolute bottom-0 left-0 h-8 w-32 rounded-full bg-white/70" />
              <div className="absolute bottom-2 left-6 h-10 w-12 rounded-full bg-white/70" />
              <div className="absolute bottom-1 left-16 h-9 w-11 rounded-full bg-white/70" />
            </div>
          </div>
        ))}

        {/* clouds — near layer */}
        {[
          { top: 26, dur: "52s", delay: "-12s", scale: 1 },
          { top: 82, dur: "68s", delay: "-38s", scale: 0.7 },
          { top: 140, dur: "80s", delay: "-55s", scale: 0.85 },
        ].map((c, i) => (
          <div
            key={`near-${i}`}
            className="cloud-drift absolute left-0 z-[2]"
            style={{ top: c.top, animationDuration: c.dur, animationDelay: c.delay, transform: `scale(${c.scale})` }}
          >
            <div className="relative h-10 w-32">
              <div className="absolute bottom-0 left-0 h-8 w-32 rounded-full bg-white/90" />
              <div className="absolute bottom-2 left-6 h-10 w-12 rounded-full bg-white/90" />
              <div className="absolute bottom-1 left-16 h-9 w-11 rounded-full bg-white/90" />
            </div>
          </div>
        ))}

        {/* distant hills */}
        <div className="absolute -bottom-10 -left-28 z-[1] h-44 w-[430px] rounded-[100%] bg-emerald-200/50" />
        <div className="absolute -bottom-12 -right-24 z-[1] h-48 w-[460px] rounded-[100%] bg-emerald-300/40" />

        {/* falling words — glossy bubbles */}
        {words.map((w) => {
          const isTarget = w.id === targetId;
          const typed = isTarget ? input.length : 0;
          const progress = w.word.length ? typed / w.word.length : 0;
          return (
            <div
              key={w.id}
              className="absolute z-10"
              style={{ left: `${w.x}%`, top: w.y, transform: `rotate(${w.wobble}deg)` }}
            >
              <div className="bubble-sway" style={{ animationDuration: `${2.6 + (w.id % 5) * 0.35}s` }}>
                <div
                  className="relative overflow-hidden rounded-[1.35rem] border-2 px-4 py-2 font-display text-[17px] font-bold tracking-wide transition-shadow duration-200"
                  style={{
                    background: `linear-gradient(155deg, #ffffff 0%, ${w.hue} 145%)`,
                    borderColor: isTarget ? "#059669" : "rgba(255,255,255,.85)",
                    boxShadow: isTarget
                      ? `0 12px 26px -8px rgba(5,150,105,.5), 0 0 0 ${2 + progress * 3}px rgba(5,150,105,${0.2 + progress * 0.22}), inset 0 1px 0 rgba(255,255,255,.95)`
                      : "0 12px 24px -10px rgba(2,132,199,.4), inset 0 1px 0 rgba(255,255,255,.95), inset 0 -3px 6px rgba(255,255,255,.35)",
                  }}
                >
                  {/* glossy shine streak */}
                  <span className="pointer-events-none absolute left-2.5 top-1 h-3 w-9 rotate-[-10deg] rounded-full bg-white/85 blur-[3px]" />
                  <span className="relative text-brand-700">{w.word.slice(0, typed)}</span>
                  <span className="relative text-gray-700">{w.word.slice(typed)}</span>
                </div>
                <div className="mx-auto h-3 w-[2px] bg-white/60" />
              </div>
            </div>
          );
        })}

        {/* pop bursts — floater + particles */}
        {bursts.map((b) => (
          <div key={b.id} className="absolute z-20" style={{ left: `${b.x}%`, top: b.y }}>
            {b.particles.map((p, pi) => (
              <span
                key={pi}
                className="burst-particle"
                style={{
                  background: p.color,
                  ["--dx" as string]: `${p.dx}px`,
                  ["--dy" as string]: `${p.dy}px`,
                }}
              />
            ))}
            <span className="pop-score block font-display text-[19px] font-bold text-brand-700 [text-shadow:0_1px_0_rgba(255,255,255,.8)]">
              {b.text} ✨
            </span>
          </div>
        ))}

        {/* miss flash */}
        {missFlash > 0 && playing && (
          <div key={missFlash} className="pointer-events-none absolute inset-x-0 bottom-12 z-20 flex justify-center">
            <span className="glass-pill px-3 py-1 text-[12px] font-bold text-red-500" style={{ background: "rgba(254,242,242,.8)" }}>
              Missed! −1 life
            </span>
          </div>
        )}

        {/* glossy ground */}
        <div className="absolute inset-x-0 bottom-0 z-[3] h-10 bg-gradient-to-t from-emerald-600/85 via-emerald-400/70 to-emerald-300/55 shadow-[inset_0_2px_0_rgba(255,255,255,.55),inset_0_-8px_14px_rgba(6,78,59,.25)]" />
        <div className="absolute inset-x-0 bottom-0 z-[4] flex justify-around pb-1 text-[15px] opacity-85">
          <span>🌷</span><span>🌻</span><span>🌼</span><span>🌷</span><span>🌻</span>
        </div>

        {/* countdown overlay */}
        {count !== null && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <span
              key={count}
              className="count-pop font-display text-[96px] font-extrabold leading-none text-white [text-shadow:0_6px_32px_rgba(5,150,105,.55),0_2px_0_rgba(5,150,105,.35)]"
            >
              {count === 0 ? "GO!" : count}
            </span>
          </div>
        )}

        {/* start / game over overlays */}
        {!playing && count === null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/30 p-6 backdrop-blur-[3px]">
            <div className="glass-strong rise-in w-full max-w-sm rounded-3xl px-7 py-7 text-center">
              {over ? (
                <>
                  <div className="text-[38px]">🎉</div>
                  <h2 className="mt-1 font-display text-[26px] font-bold text-gray-900">Game over</h2>
                  <div className="mt-1 font-display text-[44px] font-bold leading-none text-brand-700 tnum">{score}</div>
                  <div className="mt-1 text-[12px] font-medium uppercase tracking-wider text-gray-400">points</div>
                  {score >= store.gameBest && score > 0 && (
                    <div className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-[12px] font-bold text-amber-700">
                      🏆 New personal best!
                    </div>
                  )}
                  <div className="mx-auto mt-5 grid max-w-[280px] grid-cols-3 gap-2.5">
                    <ModalStat label="Best" value={String(Math.max(store.gameBest, score))} />
                    <ModalStat label="Words popped" value={String(finalStats.popped)} />
                    <ModalStat label="Max combo" value={`×${comboMult(finalStats.maxCombo)}`} />
                  </div>
                  <div className="mt-6 flex justify-center gap-2.5">
                    <button
                      onClick={start}
                      className="hover-lift rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-2.5 text-[14px] font-bold text-white shadow-pop"
                    >
                      ↻ Play again
                    </button>
                    <button
                      onClick={() => setOver(false)}
                      className="glass hover-lift rounded-2xl px-5 py-2.5 text-[14px] font-semibold text-gray-600 hover:text-brand-700"
                    >
                      ← Back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[38px]">🎈</div>
                  <h2 className="mt-1 font-display text-[26px] font-bold text-gray-900">Ready when you are</h2>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-gray-600">
                    {mode === "adaptive"
                      ? "Words use only the letters you have learned so far — pure practice in disguise."
                      : "Any common English word can fall. How long can you last?"}
                  </p>
                  <button
                    onClick={start}
                    className="animate-pulse-ring hover-lift mt-5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-7 py-3 text-[15px] font-bold text-white shadow-pop"
                  >
                    ▶ Start game
                  </button>
                  <p className="mt-3 text-[12px] text-gray-500">Just type — no clicking needed while you play.</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* current input */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">You are typing</span>
        <span className="glass-pill min-w-24 px-4 py-2 text-center font-mono text-[17px] font-bold tracking-[0.2em] text-brand-700">
          {input || <span className="text-gray-300">···</span>}
        </span>
      </div>
    </div>
  );
}

function Hud({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-pill flex items-baseline gap-2 px-3.5 py-2">
      <span className="font-display text-[15px] font-bold text-gray-900 tnum">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
    </div>
  );
}

function ModalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-2 py-2.5">
      <div className="font-display text-[16px] font-bold leading-none text-gray-900 tnum">{value}</div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}
