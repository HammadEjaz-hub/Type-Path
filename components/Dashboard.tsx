"use client";

import { useMemo } from "react";
import { BADGES } from "@/lib/badges";
import { ALL_LESSONS, LESSON_INDEX, MODULES } from "@/lib/curriculum";
import { computeStreak, todayStr, type StoreData } from "@/lib/store";
import { MiniKeyboard } from "./Keyboard";

interface Props {
  store: StoreData;
  onOpenLesson: (lessonId: string) => void;
  onGoTest: () => void;
  setDailyGoal: (min: number) => void;
  setSoundOn: (on: boolean) => void;
}

export default function Dashboard({ store, onOpenLesson, onGoTest, setDailyGoal, setSoundOn }: Props) {
  const totalStars = Object.values(store.lessons).reduce((a, r) => a + r.stars, 0);
  const maxStars = ALL_LESSONS.length * 3;
  const passedCount = ALL_LESSONS.filter((l) => (store.lessons[l.id]?.stars ?? 0) > 0).length;
  const bestWpm = store.tests.reduce((m, t) => Math.max(m, t.wpm), 0);
  const streak = computeStreak(store.days);
  const nextLesson = ALL_LESSONS.find((l) => (store.lessons[l.id]?.stars ?? 0) === 0) ?? null;

  const todaySec = store.practiceByDay[todayStr()] ?? 0;
  const todayMin = todaySec / 60;
  const goalPct = Math.min(100, (todayMin / store.dailyGoalMin) * 100);

  const weakest = useMemo(() => {
    return Object.entries(store.keyErrors)
      .filter(([k]) => k.length === 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [store.keyErrors]);

  const earnedBadges = BADGES.filter((b) => b.earned(store)).length;

  return (
    <div className="rise-in mx-auto max-w-5xl">
      <div className="mb-7">
        <h1 className="font-display text-[30px] font-bold tracking-tight text-gray-900">Your progress</h1>
        <p className="mt-1 text-[14.5px] text-gray-500">Small steps every day — that is how fast typists are made.</p>
      </div>

      {/* bento grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* continue hero — 2 wide */}
        <div
          className="glass hover-lift rounded-3xl p-6 sm:col-span-2"
          style={{ background: "linear-gradient(135deg, rgba(236,253,245,.85), rgba(255,255,255,.6) 55%, rgba(240,249,255,.5))" }}
        >
          <div className="text-[12px] font-semibold uppercase tracking-wider text-brand-600">Continue learning</div>
          {nextLesson ? (
            <>
              <div className="mt-2 font-display text-[21px] font-bold leading-snug text-gray-900">{nextLesson.title}</div>
              <div className="mt-1 text-[13px] text-gray-500">
                {LESSON_INDEX[nextLesson.id].module.title} · lesson {LESSON_INDEX[nextLesson.id].globalIdx + 1} of {ALL_LESSONS.length}
              </div>
              <button
                onClick={() => onOpenLesson(nextLesson.id)}
                className="hover-lift mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop"
              >
                Continue →
              </button>
            </>
          ) : (
            <>
              <div className="mt-2 font-display text-[21px] font-bold text-gray-900">Course complete! 🎓</div>
              <div className="mt-1 text-[13px] text-gray-500">You passed every lesson. Keep sharpening speed with the typing test.</div>
              <button
                onClick={onGoTest}
                className="hover-lift mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-pop"
              >
                Take a speed test →
              </button>
            </>
          )}
        </div>

        {/* daily goal — 2 wide */}
        <div className="glass hover-lift flex items-center gap-5 rounded-3xl p-6 sm:col-span-2">
          <GoalRing pct={goalPct} />
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Daily goal</div>
            <div className="mt-1 font-display text-[20px] font-bold text-gray-900">
              {Math.floor(todayMin)} of {store.dailyGoalMin} min
            </div>
            <div className="mt-0.5 text-[12.5px] text-gray-500">
              {goalPct >= 100 ? "Goal reached — well done! 🎉" : "practiced today"}
            </div>
            <div className="mt-3 flex gap-1.5">
              {[5, 10, 15].map((g) => (
                <button
                  key={g}
                  onClick={() => setDailyGoal(g)}
                  className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-all duration-200 ${
                    store.dailyGoalMin === g ? "bg-brand-600 text-white shadow-pop" : "bg-white/60 text-gray-500 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {g} min
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* quick stat tiles */}
        <MiniStat label="Day streak" value={streak ? `${streak}` : "0"} icon="🔥" tint="rgba(255,251,235,.9)" suffix={streak === 1 ? "day" : "days"} />
        <MiniStat label="Total stars" value={`${totalStars} / ${maxStars}`} icon="⭐" tint="rgba(254,249,195,.7)" />
        <MiniStat label="Best test WPM" value={bestWpm ? String(bestWpm) : "—"} icon="⚡" tint="rgba(240,249,255,.9)" />
        <MiniStat label="Lessons passed" value={`${passedCount} / ${ALL_LESSONS.length}`} icon="✓" tint="rgba(236,253,245,.9)" />
      </div>

      {/* modules + chart row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="glass hover-lift rounded-3xl p-6">
          <h3 className="font-display text-[16px] font-bold text-gray-900">Modules</h3>
          <div className="mt-4 space-y-4">
            {MODULES.map((m) => {
              const done = m.lessons.filter((l) => (store.lessons[l.id]?.stars ?? 0) > 0).length;
              return (
                <div key={m.id}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
                    <span className="font-medium text-gray-700">
                      {m.icon} {m.title}
                    </span>
                    <span className="text-gray-400 tnum">
                      {done}/{m.lessons.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-900/[0.06]">
                    <div
                      className="progress-fill h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                      style={{ width: `${(done / m.lessons.length) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-t border-white/60 pt-5">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-gray-700">Sound effects</h4>
              <button
                onClick={() => setSoundOn(!store.soundOn)}
                role="switch"
                aria-checked={store.soundOn}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${store.soundOn ? "bg-brand-600" : "bg-gray-300/70"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${store.soundOn ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
            </div>
            <p className="mt-1 text-[12.5px] text-gray-400">Soft clicks while you type, a chime when you pass. Stored on this device.</p>
          </div>
        </div>

        <div className="glass hover-lift rounded-3xl p-6">
          <h3 className="font-display text-[16px] font-bold text-gray-900">Speed over time</h3>
          {store.tests.length >= 2 ? (
            <WpmChart tests={store.tests} />
          ) : (
            <div className="flex h-[170px] flex-col items-center justify-center text-center">
              <p className="max-w-[240px] text-[13.5px] leading-relaxed text-gray-400">
                Take at least two typing tests and your speed graph will appear here.
              </p>
              <button onClick={onGoTest} className="mt-3 text-[13px] font-semibold text-brand-700 hover:text-brand-800">
                Take a test →
              </button>
            </div>
          )}

          <div className="mt-5 border-t border-white/60 pt-5">
            <h4 className="text-[13px] font-semibold text-gray-700">Keys that need love</h4>
            {weakest.length > 0 ? (
              <>
                <div className="mt-3 flex justify-start">
                  <MiniKeyboard errors={store.keyErrors} highlight={weakest.map(([k]) => k)} />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-gray-400">
                  Most mistakes on{" "}
                  {weakest.map(([k, n]) => (
                    <span key={k} className="font-mono font-semibold text-red-500">
                      {k === " " ? "space" : k} ({n}){" "}
                    </span>
                  ))}
                  — the lessons drill these automatically.
                </p>
              </>
            ) : (
              <p className="mt-2 text-[13px] text-gray-400">No mistakes recorded yet — finish a lesson and we will track your tricky keys here.</p>
            )}
          </div>
        </div>
      </div>

      {/* badges */}
      <div className="glass mt-4 rounded-3xl p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[16px] font-bold text-gray-900">Achievements</h3>
          <span className="text-[12.5px] font-medium text-gray-400">
            {earnedBadges} of {BADGES.length} earned
          </span>
        </div>
        <div className="stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const earned = b.earned(store);
            return (
              <div
                key={b.id}
                className={`rounded-2xl p-4 text-center ${
                  earned ? "glass badge-pop" : "glass opacity-55 grayscale"
                }`}
                style={earned ? { background: "linear-gradient(150deg, rgba(236,253,245,.9), rgba(255,255,255,.55))" } : undefined}
              >
                <div className="text-[26px] leading-none">{b.icon}</div>
                <div className="mt-2 text-[13.5px] font-bold text-gray-800">{b.name}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-gray-400">{b.hint}</div>
                <div className={`mt-2 text-[10.5px] font-bold uppercase tracking-wide ${earned ? "text-brand-600" : "text-gray-400"}`}>
                  {earned ? "✓ Earned" : "🔒 Locked"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GoalRing({ pct }: { pct: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[84px] w-[84px] shrink-0">
      <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="goalGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(16,24,40,.06)" strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke="url(#goalGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-bold text-gray-900 tnum">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  tint,
  suffix,
}: {
  label: string;
  value: string;
  icon: string;
  tint: string;
  suffix?: string;
}) {
  return (
    <div className="glass hover-lift rounded-3xl p-4">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-xl text-[15px] leading-none shadow-sm"
        style={{ background: tint }}
      >
        {icon}
      </div>
      <div className="mt-2.5 font-display text-[20px] font-bold leading-none text-gray-900 tnum">
        {value}
        {suffix && <span className="ml-1 text-[12px] font-semibold text-gray-400">{suffix}</span>}
      </div>
      <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</div>
    </div>
  );
}

function WpmChart({ tests }: { tests: StoreData["tests"] }) {
  const data = tests.slice(-14);
  const w = 340;
  const h = 150;
  const pad = 14;
  const max = Math.max(40, ...data.map((t) => t.wpm)) * 1.15;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const points = data.map((t, i) => `${x(i)},${y(t.wpm)}`).join(" ");
  const area = `${pad},${h - pad} ${points} ${x(data.length - 1)},${h - pad}`;
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="WPM over time chart">
        <defs>
          <linearGradient id="wpmFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#wpmFill)" />
        <polyline points={points} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((t, i) => (
          <circle key={i} cx={x(i)} cy={y(t.wpm)} r="3.5" fill="#fff" stroke="#059669" strokeWidth="2">
            <title>{`${t.wpm} WPM — ${new Date(t.ts).toLocaleDateString()}`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400">
        <span>{new Date(data[0].ts).toLocaleDateString()}</span>
        <span>latest {data[data.length - 1].wpm} WPM</span>
        <span>{new Date(data[data.length - 1].ts).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
