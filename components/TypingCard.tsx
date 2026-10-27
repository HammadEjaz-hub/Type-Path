"use client";

import { useMemo } from "react";
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

export default function TypingCard({ target, states, pos, stats, lastWrongAt, timeLeftSec, size = "lg" }: Props) {
  const chars = useMemo(() => target.split(""), [target]);

  return (
    <div>
      {/* KPI glass pills */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <KpiPill label="WPM" value={String(stats.wpm)} accent big />
        <KpiPill label="Accuracy" value={`${stats.accuracy.toFixed(0)}%`} />
        <KpiPill
          label={timeLeftSec != null ? "Time left" : "Time"}
          value={fmtTime(timeLeftSec != null ? timeLeftSec : stats.elapsedSec)}
        />
        <span className="glass-pill ml-auto hidden items-center px-3.5 py-2 text-[12.5px] font-medium text-gray-500 sm:inline-flex">
          <span className="tnum">
            {stats.correctChars} / {target.length} chars
          </span>
        </span>
      </div>

      {/* progress hairline with shimmer sweep */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-gray-900/[0.06]">
        <div
          className="progress-fill h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 transition-all duration-300"
          style={{ width: `${target.length ? (pos / target.length) * 100 : 0}%` }}
        />
      </div>

      {/* text */}
      <div
        className={`relative select-none whitespace-pre-wrap font-mono leading-[1.9] tracking-[0.02em] text-gray-800 ${
          size === "lg" ? "text-[26px]" : "text-[21px]"
        }`}
        aria-label="Text to type"
      >
        {chars.map((ch, i) => {
          const st = states[i];
          const isCurrent = i === pos;
          const status = st?.status ?? "pending";
          return (
            <span key={i} className="relative">
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
                } ${i === lastWrongAt ? "shake-once inline-block" : ""}`}
              >
                {ch === " " ? " " : ch}
              </span>
            </span>
          );
        })}
      </div>
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
