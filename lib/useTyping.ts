import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CharState {
  status: "pending" | "correct" | "wrong";
  typed: string;
}

export interface TypingStats {
  elapsedSec: number;
  correctChars: number;
  typedTotal: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  done: boolean;
}

export interface UseTypingOptions {
  /** seconds limit — session ends when the clock runs out */
  timeLimitSec?: number;
  onFinish?: (stats: TypingStats, errors: Record<string, number>) => void;
  /** called on every accepted keystroke */
  onKey?: (correct: boolean, expected: string) => void;
  /** Esc toggles pause when true */
  pausable?: boolean;
  onPauseChange?: (paused: boolean) => void;
}

const IGNORED_KEYS = new Set([
  "Control", "Alt", "Meta", "CapsLock", "Tab", "Enter",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End",
  "PageUp", "PageDown", "Insert", "Delete", "NumLock", "ScrollLock", "Pause",
  "ContextMenu", "Dead", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8",
  "F9", "F10", "F11", "F12",
]);

export function useTyping(target: string, opts: UseTypingOptions = {}) {
  const [states, setStates] = useState<CharState[]>([]);
  const [pos, setPos] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastWrongAt, setLastWrongAt] = useState(-1);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const keyTimesRef = useRef<number[]>([]);
  const errorsRef = useRef<Record<string, number>>({});
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const pauseStartRef = useRef(0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const reset = useCallback(() => {
    setStates(target.split("").map(() => ({ status: "pending" as const, typed: "" })));
    setPos(0);
    setStartedAt(null);
    setNowMs(0);
    setFinished(false);
    setPaused(false);
    pausedRef.current = false;
    setLastWrongAt(-1);
    setPressedKey(null);
    keyTimesRef.current = [];
    errorsRef.current = {};
    finishedRef.current = false;
  }, [target]);

  useEffect(() => {
    reset();
  }, [reset]);

  const setPause = useCallback(
    (p: boolean) => {
      if (finishedRef.current) return;
      if (p === pausedRef.current) return;
      if (p) {
        pauseStartRef.current = Date.now();
      } else if (pauseStartRef.current) {
        const drift = Date.now() - pauseStartRef.current;
        pauseStartRef.current = 0;
        setStartedAt((s) => (s ? s + drift : s));
        setNowMs(Date.now());
      }
      pausedRef.current = p;
      setPaused(p);
      optsRef.current.onPauseChange?.(p);
    },
    []
  );

  const stats = useMemo<TypingStats>(() => {
    const correctChars = states.filter((s) => s.status === "correct").length;
    const typedTotal = states.filter((s) => s.status !== "pending").length;
    const elapsedSec = startedAt ? Math.max(0, (nowMs - startedAt) / 1000) : 0;
    const minutes = elapsedSec / 60;
    const wpm = minutes > 0.02 ? correctChars / 5 / minutes : 0;
    const rawWpm = minutes > 0.02 ? typedTotal / 5 / minutes : 0;
    const accuracy = typedTotal > 0 ? (correctChars / typedTotal) * 100 : 100;
    const times = keyTimesRef.current;
    let consistency = 100;
    if (times.length > 4) {
      const intervals: number[] = [];
      for (let i = 1; i < times.length; i++) intervals.push(times[i] - times[i - 1]);
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (mean > 0) {
        const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
        const cv = Math.sqrt(variance) / mean;
        consistency = Math.max(0, Math.round(100 - cv * 100));
      }
    }
    return {
      elapsedSec,
      correctChars,
      typedTotal,
      wpm: Math.round(wpm),
      rawWpm: Math.round(rawWpm),
      accuracy: Math.round(accuracy * 10) / 10,
      consistency,
      done: finished,
    };
  }, [states, startedAt, nowMs, finished]);

  const finish = useCallback(
    (finalStates: CharState[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);
      const correctChars = finalStates.filter((s) => s.status === "correct").length;
      const typedTotal = finalStates.filter((s) => s.status !== "pending").length;
      const end = Date.now();
      setNowMs(end);
      setStartedAt((start) => {
        const elapsedSec = start ? (end - start) / 1000 : 0;
        const minutes = elapsedSec / 60;
        const finalStats: TypingStats = {
          elapsedSec: Math.round(elapsedSec * 10) / 10,
          correctChars,
          typedTotal,
          wpm: minutes > 0.02 ? Math.round(correctChars / 5 / minutes) : 0,
          rawWpm: minutes > 0.02 ? Math.round(typedTotal / 5 / minutes) : 0,
          accuracy:
            typedTotal > 0
              ? Math.round((correctChars / typedTotal) * 1000) / 10
              : 100,
          consistency: stats.consistency,
          done: true,
        };
        setTimeout(() => optsRef.current.onFinish?.(finalStats, { ...errorsRef.current }), 0);
        return start;
      });
    },
    [stats.consistency]
  );

  // ticking clock while typing (frozen while paused)
  useEffect(() => {
    if (!startedAt || finished || paused) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNowMs(n);
      if (optsRef.current.timeLimitSec && (n - startedAt) / 1000 >= optsRef.current.timeLimitSec) {
        setStates((s) => {
          finish(s);
          return s;
        });
      }
    }, 200);
    return () => clearInterval(t);
  }, [startedAt, finished, paused, finish]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && optsRef.current.pausable) {
        if (!finishedRef.current) setPause(!pausedRef.current);
        return;
      }
      if (finishedRef.current || pausedRef.current) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setLastWrongAt(-1);
        setPos((p) => {
          if (p <= 0) return p;
          const np = p - 1;
          setStates((s) => {
            const next = [...s];
            next[np] = { status: "pending", typed: "" };
            return next;
          });
          return np;
        });
        return;
      }
      if (IGNORED_KEYS.has(e.key) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1) return;
      e.preventDefault();
      if (e.repeat) return;

      const now = Date.now();
      setPressedKey(e.key);
      setTimeout(() => setPressedKey((k) => (k === e.key ? null : k)), 130);

      setPos((p) => {
        if (p >= target.length) return p;
        if (!startedAt) {
          setStartedAt(now);
          setNowMs(now);
        }
        keyTimesRef.current.push(now);
        const expected = target[p];
        const correct = e.key === expected;
        optsRef.current.onKey?.(correct, expected);
        if (!correct) {
          errorsRef.current[expected] = (errorsRef.current[expected] ?? 0) + 1;
          setLastWrongAt(p);
          setTimeout(() => setLastWrongAt((w) => (w === p ? -1 : w)), 180);
        }
        setStates((s) => {
          const next = [...s];
          next[p] = { status: correct ? "correct" : "wrong", typed: e.key };
          if (p + 1 >= target.length) finish(next);
          return next;
        });
        return p + 1;
      });
    },
    [target, startedAt, finish, setPause]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return { states, pos, stats, pressedKey, lastWrongAt, reset, paused, setPause, started: startedAt !== null };
}
