"use client";

import { memo, useMemo } from "react";
import type { CharState, TypingStats } from "@/lib/useTyping";

interface Props {
  target: string;
  states: CharState[];
  pos: number;
  stats: TypingStats;
  lastWrongAt: number;
  timeLeftSec?: number | null;
  size?: "lg" | "md";
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Performance pass: the card is split so the 200ms stats tick only    */
/* re-renders the tiny KPI row (and only when a displayed value        */
/* actually changes), while the character text is memoized down to     */
/* the individual span — a keystroke updates only the spans whose      */
/* status/caret changed, not the whole string.                         */
/* ------------------------------------------------------------------ */

const CharSpan = memo(function CharSpan({
  ch,
  status,
  isCurrent,
  flash,
}: {
  ch: string;
  status: CharState["status"];
  isCurrent: boolean;
  flash: boolean;
}) {
  return (
    <span className="relative">
      {isCurrent && (
        <span className="typing-caret pointer-events-none absolute -left-[1.5px] top-[0.12em] h-[1.15em] w-[2.5px] rounded bg-brand-500 shadow-[0_0_7px_rgba(16,185,129,0.85),0_0_2px_rgba(5,150,105,0.9)]" />
      )}
      <span
        className={`rounded-[3px] transition-colors duration-150 ${
          status === "correct"
            ? "text-brand-700"
            : status === "wrong"
              ? "bg-red-100 text-red-600"
              : "text-gray-400"
        } ${flash ? "shake-once inline-block" : ""}`}
      >
        {ch === " " ? " " : ch}
      </span>
    </span>
  );
});

const CharText = memo(function CharText({
  chars,
  states,
  pos,
  lastWrongAt,
  size,
}: {
  chars: string[];
  states: CharState[];
  pos: number;
  lastWrongAt: number;
  size: "lg" | "md";
}) {
  return (
    <div
      className={`relative select-none whitespace-pre-wrap font-mono leading-[1.9] tracking-[0.02em] text-gray-800 ${
        size === "lg" ? "text-[26px]" : "text-[21px]"
      }`}
      aria-label="Text to type"
    >
      {chars.map((ch, i) => (
        <CharSpan
          key={i}
          ch={ch}
          status={states[i]?.status ?? "pending"}
          isCurrent={i === pos}
          flash={i === lastWrongAt}
        />
      ))}
    </div>
  );
});

const KpiRow = memo(function KpiRow({
  wpm,
  accuracy,
  timeLabel,
  timeValue,
  correct,
  total,
}: {
  wpm: string;
  accuracy: string;
  timeLabel: string;
  timeValue: string;
  correct: number;
  total: number;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2.5">
      <KpiPill label="WPM" value={wpm} accent big />
      <KpiPill label="Accuracy" value={accuracy} />
      <KpiPill label={timeLabel} value={timeValue} />
      <span className="glass-pill ml-auto hidden items-center px-3.5 py-2 text-[12.5px] font-medium text-gray-500 sm:inline-flex">
        <span className="tnum">
          {correct} / {total} chars
        </span>
      </span>
    </div>
  );
});

export default function TypingCard({ target, states, pos, stats, lastWrongAt, timeLeftSec, size = "lg" }: Props) {
  const chars = useMemo(() => target.split(""), [target]);

  return (
    <div>
      {/* KPI glass pills — the only part fed by the ticking clock */}
      <KpiRow
        wpm={String(stats.wpm)}
        accuracy={`${stats.accuracy.toFixed(0)}%`}
        timeLabel={timeLeftSec != null ? "Time left" : "Time"}
        timeValue={fmtTime(timeLeftSec != null ? timeLeftSec : stats.elapsedSec)}
        correct={stats.correctChars}
        total={target.length}
      />

      {/* progress hairline with shimmer sweep */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-900/[0.06]">
        <div
          className="progress-fill h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 transition-[width] duration-300"
          style={{ width: `${target.length ? (pos / target.length) * 100 : 0}%` }}
        />
      </div>

      {/* text */}
      <CharText chars={chars} states={states} pos={pos} lastWrongAt={lastWrongAt} size={size} />
    </div>
  );
}

function KpiPill({
  label,
  value,
  accent = false,
  big = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  big?: boolean;
}) {
  return (
    <span className="glass-pill inline-flex items-baseline gap-2 px-4 py-2">
      <span
        className={`font-display font-bold leading-none tracking-tight tnum ${
          big ? "text-[27px]" : "text-[21px]"
        } ${accent ? "text-brand-700" : "text-gray-800"}`}
      >
        {value}
      </span>
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
    </span>
  );
}
