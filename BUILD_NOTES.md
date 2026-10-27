# TypePath — Phase 1 Build Notes

A professional touch-typing web app. Pure frontend (Next.js 14 App Router +
Tailwind + TypeScript, `output: 'export'`), no backend, no external APIs.
All progress lives in the browser's localStorage (`typepath-store-v1`).

## Design

Copies the Sitemap URL Extractor's clean LIGHT design language — white
background, gray-800 text, Inter (+ Plus Jakarta Sans display, JetBrains Mono
for typing text), rounded cards, soft tinted shadows, airy spacing, styled
scrollbars, reduced-motion support — with the accent swapped from violet to
**emerald** (#059669 primary, #047857/#065F46 deep, #ECFDF5 tint). One accent
across the app; the only colorful screen is the game (user-approved).

## What's built

### Curriculum engine (data-driven, `lib/curriculum.ts`)
- **6 modules, 35 lessons**, sequential unlock: a lesson opens only when the
  previous one is passed (≥90% accuracy + module min-WPM on the test stage).
- Stars: 1 = pass, 2 = ≥95% accuracy, 3 = ≥98% accuracy + WPM ≥ 1.5× target.
- Modules: (1) Home Row — F+J → D+K → S+L → A+; → G/H mix → home-row words;
  (2) Top Row — E+I → R+U → T+Y → W+O → Q+P → mixed words; (3) Bottom Row —
  V+N → B+M → C+, → X+. → Z+/ → all-rows review; (4) Full Keyboard — the
  ~200 most common English words in 3 sets → sentence banks; (5) Capitals
  (Shift, opposite-hand rule taught), number row in pairs, punctuation in
  sentences; (6) Speed & Paragraphs — 7 full-paragraph challenges at 25 WPM.
- Drills are generated deterministically (seeded) from each lesson's allowed
  key set, weighted toward the newest keys; word stages use curated lists.
- Content banks: ~200 common words, 17 practice sentences, 6 capital
  sentences, 6 punctuation sentences, 7 paragraphs.

### Practice screen
- Large typing card: per-character states (gray → emerald correct → red wrong
  with a micro-shake), smooth blinking caret, live WPM / accuracy / time,
  progress hairline.
- **Color-coded keyboard**: every key cap is filled with its finger-zone
  pastel (8 fingers + gray spacebar), F/J have bump marks, the next key gets
  an emerald ring + pulse, physical presses animate the cap, and a caption
  names the finger to use. A legend maps color → finger.
- **Hands diagram**: two stylized hands whose fingertips use the same zone
  colors; the needed finger lifts and rings in emerald.
- Controls: pause/resume (Esc or button, clock truly freezes), restart stage,
  show/hide keyboard and hands guides (preferences remembered).
- Mobile: polite "best with a physical keyboard" note (layout still renders).

### Typing Test
- 1 / 3 / 5-minute timed tests over the paragraph bank (results: WPM,
  accuracy, consistency from keystroke-interval variance, correct chars —
  with animated count-up result card), saved to history.
- **Custom practice**: paste any text (≥20 chars) and type it with the same
  engine and results.

### Dashboard
- Continue-learning card (next unlocked lesson), module progress bars,
  total stars, lessons passed, best test WPM, day streak.
- **Daily goal**: 5/10/15-minute setting with today's practiced minutes and a
  progress ring (practice time accrues from lessons, tests, and the game).
- WPM-over-time SVG chart from test history; weakest keys from accumulated
  per-key error counts, shown on a mini keyboard with error badges.
- **Achievements**: 12 badges (First Steps, Home Row Hero, Sharp Shooter,
  Speed Club 25/40/60, 3-/7-Day Streak, Halfway There, Graduate, Star
  Collector, Game Ace) — earned in emerald, locked grayed with the condition.
- Sound toggle (also in the header).

### Game — Falling Words
- Sky-gradient cartoon stage (drifting clouds, sun, flower ground): words
  fall, type one fully to pop it (+score burst), a miss costs one of 3 lives,
  fall speed and spawn rate ramp up, game-over panel with score + best.
- Two modes: **Adaptive** (words built only from letters learned so far) and
  **Free** (any common word). Max 6 words on screen; rAF loop.

### Sound (extra)
- WebAudio-generated, no files: soft key click, gentle error tick, success
  chime, fail tone, game pop. Default ON at low volume; toggle in header and
  dashboard; preference persisted.

### End-of-lesson report (extra)
- Stars with pop animation, WPM / accuracy / time / chars, top problem keys
  as chips plus a mini keyboard heat view, and Retry / Next Lesson / Back to
  Path actions.

## Run / build / deploy

```bash
npm install
npm run dev        # local dev at http://localhost:3000
npm run build      # produces the static site in out/
```

Deploy the `out/` folder to any static host (Vercel: import the repo — the
build command is `npm run build`, output `out`). No environment variables,
no server, nothing sleeps.

Local link for a quick look: after `npm run build`, run
`npx serve out` (or any static server) and open the printed localhost URL.

## Design v2 (Oct 26, 2026) — glass + mesh + game juice

A presentation-layer overhaul in response to user feedback ("glass everywhere,
mesh gradient in the back, keyboard feels fake, test feels plain, game isn't
fun"). **No functional changes**: curriculum, game rules, sounds and the
localStorage model (`typepath-store-v1` and the keyboard/hands prefs) are
untouched.

- **Ambient mesh background**: a fixed layer of four very soft radial blobs
  (emerald 10% top-left, sky 8% top-right, amber 5% bottom-left, lavender 5%
  bottom-right) over an off-white `#FAFCFB` base, drifting slowly (24s,
  transform-only). Emerald stays the only brand colour; the tints appear
  sparingly in the mesh, icon chips and chart fills.
- **Glass design system** (`globals.css`): `.glass`, `.glass-strong`,
  `.glass-deck`, `.glass-pill`, `.glass-bar` — frosted surfaces with
  backdrop blur, white borders, layered soft shadows and an inset top
  highlight — applied to the header, hero/module panels, lesson cards,
  stat tiles, test panels, dashboard tiles, game HUD and modals.
- **Motion**: view entrances are fade + 12px rise at 250–350ms on
  `cubic-bezier(.22,.61,.36,1)`; lesson/badge grids stagger in per card;
  interactive cards lift −2px with a deepening shadow; progress bars carry a
  soft shimmer sweep. All transform/opacity, all reduced-motion safe.
- **Practice — premium keyboard**: keys are real keycaps now — a vertical
  gradient in the finger-zone pastel (new `light`/`edge` tones in
  `lib/fingers.ts`), a 3px bottom edge in the zone colour, and a mechanical
  press (translateY 2px, edge collapses, shadow shrinks) — sitting on a
  frosted glass deck. The next key gets an emerald ring + breathing halo;
  a wrong press flashes the cap red. The finger legend is glass chips, the
  hands sit in glass tiles with gradient fingertips, the typing card is
  glass-strong with KPI pills and a glowing caret.
- **Typing Test — SaaS analytics**: segmented glass mode control; live KPI
  tiles (accuracy ring + consistency) and a **live pace sparkline** that
  samples WPM every ~2s into an emerald-gradient area chart. Results are an
  analytics panel: animated WPM count-up, a grade chip (Getting Started →
  Elite Typist), six stat tiles, the pace chart of the whole run, and
  Retake / New text / Dashboard actions.
- **Dashboard — bento glass grid**: 2-wide continue-learning hero tile and
  daily-goal tile (goal ring now uses an emerald→sky gradient stroke),
  four stat tiles (streak flame, stars, best WPM, lessons passed), modules
  and speed-chart tiles, and a full-width achievements tile whose badges
  pop in as glass chips.
- **Falling Words — proper game feel**: richer layered sky (emerald-to-sky
  depth), two parallax cloud layers, floating light motes, hill
  silhouettes and a glossy ground strip. Words ride in glossy bubbles
  (gradient fill, shine streak, gentle sway) that grow an emerald glow as
  you type them. Pops burst into 7 particles with a score floater; a
  **combo system** builds ×2/×3 multipliers with a fiery glass pill and a
  pop sound that climbs in pitch (`sounds.pop(pitchSteps)`). Misses shake
  the stage and crack a heart to grey. Starts run a 3·2·1·GO countdown;
  game over is a glass modal with a stats grid (score, best, words
  popped, max combo).

## Design v2.1 (Oct 26, 2026) — mesh + glass made VISIBLE

User verdict on v2: "glass aur mesh tho nhi bana" — the effects were too
faint to see. He was right: flat white glass at 0.68 alpha over a
near-white base, with mesh blobs at **0.05–0.10 alpha**, reads as plain
white cards. v2.1 changes only the strength of the two effects;
everything else from v2 (keycaps, analytics, bento, game juice) is
untouched.

- **Mesh — before → after**: four blobs at emerald 0.10 / sky 0.08 /
  amber 0.05 / lavender 0.05, ~500px, no blur → **seven large blobs
  (40–58vw) under a 70px blur** on a `#F6FAF7` base: emerald
  `rgba(16,185,129,0.28)` top-left, mint `rgba(110,231,183,0.30)`
  centre-left, sky `rgba(56,189,248,0.22)` top-right, teal
  `rgba(45,212,191,0.18)` bottom-right, amber `rgba(251,191,36,0.10)`
  bottom-left, lavender `rgba(167,139,250,0.12)` mid-right, plus a
  focal emerald glow `rgba(16,185,129,0.18)` centred behind the hero
  headline. Slow 24s drift kept; reduced-motion still disables it.
  Structure audited: the fixed mesh layer's ancestors (root wrapper,
  `main`) paint no background, and the body colour sits on the canvas
  behind the layer — nothing opaque covers the mesh.
- **Glass — before → after**: flat `rgba(255,255,255,0.68–0.86)` fills,
  `blur(18–22px) saturate(1.45–1.5)`, white border 0.65–0.70 → a true
  frosted recipe: `background: linear-gradient(135deg,
  rgba(255,255,255,0.72), rgba(255,255,255,0.42))`,
  `backdrop-filter: blur(18px) saturate(160%)`, border
  `rgba(255,255,255,0.75)`, and shadows `inset 0 1px 0
  rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.25),
  0 24px 48px -24px rgba(6,78,59,0.25)`. `.glass-strong` runs the same
  recipe hotter (0.82→0.55, blur 22px, saturate 170%); the header bar is
  a 0.84→0.74 gradient at blur 20px so scrolled content visibly blurs
  beneath it. A new `.glass-tint` (one stop `rgba(236,253,245,0.48)`)
  is used on the module panels so the frosting picks up the emerald
  behind them. Hover now brightens the border and adds a faint emerald
  edge glow (`0 0 0 1px rgba(16,185,129,0.25)`) on top of the lift.


## Full keyboard (Oct 26, 2026) — the real 104/105-key board

User feedback: the learning-only keyboard looked incomplete/toy-like.
The `Keyboard` component now renders a complete standard full-size
board on the same v2.1 glass deck with the same premium keycap styling
(zone gradients, 3px bottom edge, mechanical press). `MiniKeyboard`
and the finger legend are unchanged; no lesson/engine/store changes.

**Layout** — one CSS grid, 94 quarter-unit columns (main 15u · 3-col
gap · nav 3u · 3-col gap · numpad 4u), 6 rows:

- Row 0 (62% height): Esc, F1–F12 in the usual 4/4/4 groups,
  PrtSc / ScrLk / Pause over the nav cluster
- Number row: dual-legend `~` … `=+`, Backspace 2u · Ins/Home/PgUp ·
  Num Lock / * −
- Q row: Tab 1.5u, [{ ]} \| 1.5u · Del/End/PgDn · numpad 7 8 9, + (2-row span)
- Home row: Caps Lock 1.75u, Enter 2.25u · numpad 4 5 6
- Bottom letters: Shift 2.25u / 2.75u, ↑ over the nav cluster ·
  numpad 1 2 3, numpad Enter (2-row span)
- Bottom row: Ctrl/Win/Alt 1.25u, Space 6.25u, Alt/Win/Menu/Ctrl ·
  ← ↓ → · numpad 0 (2u) and .

Dual legends (shifted char small above the main char) on the whole
number row and every punctuation key, exactly like a real board.
F / J bump marks kept.

**Colouring rules** (the learning map stays honest):

- Taught keys (letters, digits, punctuation) keep their finger-zone
  pastel gradients — including `` ` ``, `-`, `=`, `\`, which follow the
  standard chart (pinkies) via local overrides; `lib/fingers.ts` is
  untouched.
- Pinky-owned wide keys get a MUTED pinky pastel: Tab / Caps Lock /
  left Shift / left Ctrl (left pinky), Backspace / Enter / right
  Shift / right Ctrl (right pinky).
- Everything else — Esc, F-row, PrtSc/ScrLk/Pause, nav cluster,
  arrows, Win, Alt, Menu, the whole numpad — is neutral glass-gray;
  Space keeps the thumbs' neutral gray.

**Shift-highlight upgrade:** when the next char is a capital or a
shifted symbol (! ? : " …), the correct opposite-hand Shift cap now
glows with the same halo treatment as the next key (twin class
`key-next-shift`, sharing the `.keycap-next` visuals — exactly one
element still carries the literal `key-next-pulse`, the character key
itself). The hint line also spells it out ("hold right Shift with
your right pinky").

**Physical presses:** `pressedKey` only ever carries printable chars,
so the board also listens for keydown/keyup itself and animates the
wide/special caps when physically pressed (Shift/Ctrl/Alt side-aware
via `KeyboardEvent.location`, numpad keys via location 3, Enter main
vs numpad, F-keys, arrows, nav cluster…). Purely cosmetic; ignored
while typing in a form field.

**Sizing:** key height = `min(3.4vw, 44px)` (compact: `min(2.6vw,
32px)`), F-row at 62%. Widths come from the 1fr grid, so the board
always fills — never overflows — its container at any viewport;
legends scale with `clamp()` fonts. Used by Practice and Test as
before.


## Laptop keyboard (Oct 26, 2026) — correction: laptop, not desktop

User feedback: he works on a **laptop**, so the 104/105-key desktop
board above is replaced by a standard Windows **laptop chiclet**
layout — no numpad, no separate Ins/Del nav block, bigger keys.
Same component, same glass deck, keycaps, colouring rules and
behaviour contracts (`key-next-pulse` on exactly one cap,
`key-next-shift` twin, physical-press animation, F/J bumps, legend +
pinky note). `MiniKeyboard` unchanged (still built from
`lib/fingers.ts` letter rows).

**Grid:** 60 quarter-unit columns = **15u wide**; every row sums to
exactly 15u (verified):

- **F row** (62% height): Esc 1u · F1–F4 · ½u gap · F5–F8 · ½u gap ·
  F9–F12 · **Delete 1u** = 15u
- **Numbers:** `` ` `` + ten digits + `-` + `=` (13 × 1u) + Backspace
  2u = 15u — dual legends as before
- **Q row:** Tab 1.5u + Q–P 10u + `[` `]` 2u + `\` 1.5u = 15u
- **Home:** Caps Lock 1.75u + A–L 9u + `;` `'` 2u + Enter 2.25u = 15u
- **Z row:** left Shift 2.25u + Z–M 7u + `,` `.` `/` 3u + right Shift
  2.75u = 15u
- **Bottom:** Ctrl 1.25u + Fn 1u + Win 1u + Alt 1.25u + Space 5.5u +
  Alt 1u + Ctrl 1u + ← 1u + ↑↓ 1u (two half-height caps stacked) +
  → 1u = 15u

**Authentic details:** Delete on the F-row covers the old nav block;
the arrows carry tiny secondary Fn-legends in the corner (← Home,
→ End, ↑ PgUp, ↓ PgDn, 7–8px gray), like real laptop caps.

**Colouring (unchanged rules):** taught keys keep zone pastels;
pinky wide keys (Tab / Caps / Shifts / Enter / Backspace / Ctrls)
muted pinky; Esc, F1–F12, Delete, Fn, Win, Alt and the arrows are
neutral glass-gray; Space thumb-neutral.

**Physical presses:** the board's own listener drops numpad/nav ids;
side-aware Shift/Ctrl/Alt (via `KeyboardEvent.location`), Fn-row,
Delete and arrows flash cosmetically, and Home/End/PgUp/PgDn (what a
laptop reports for Fn+arrow) flash the matching arrow caps.

**Sizing:** key height = `min(3.6vw, 48px)` (compact: `min(2.8vw,
36px)`), F-row at 62%; the bottom row maps to two half-height grid
rows for the stacked ↑/↓. 1fr grid + clamp() legends — fills its
container, never overflows.


## Performance pass (Oct 27, 2026) — smoothness fix

User deployed to Vercel (type-path.vercel.app) and reported the site
felt laggy on his laptop. Root causes were our own design choices:
an ANIMATED mesh behind heavy backdrop-blur surfaces, and full-tree
re-renders on every keystroke / 200ms stats tick. Fixes, in impact
order — the look (colours, glass impression, layout) is unchanged:

1. **Static mesh.** The 24s `mesh-drift` animation and its
   `will-change: transform` are gone. Same 7 blobs, same alphas,
   same 70px blur — but a static background composites once instead
   of forcing every glass surface to repaint every frame. This is
   the one deliberate visual tradeoff: the background no longer
   moves.
2. **Glass tiers** (globals.css). "Live glass" keeps real
   backdrop-filter (`.glass-strong` 22px, `.glass-bar` 20px,
   `.glass-pill` 14px) — small/overlay surfaces only: header, pills,
   modals/report, game HUD, segmented control. "Static glass" for
   the large surfaces: `.glass` raised to a 0.88→0.78 white gradient
   with blur cut 18px→10px; `.glass-tint` (module panels),
   `.glass-deck` (keyboard deck) and the new `.glass-static` (typing
   card in Practice + TestView) drop backdrop-filter entirely and
   fake the frost with the gradient + bright border + emerald tint
   stop over the now-static mesh.
3. **Keyboard render.** Keycaps extracted into a memoized `KeyCap`
   component — a keystroke re-renders only the ~5 caps whose state
   changed (old/new next, pressed, wrong, shift-glow) instead of
   all ~90. `Keyboard` and `KeyboardLegend` are `React.memo` too,
   so the 200ms tick (unchanged primitive props) bails out. Cap
   transitions are scoped to `transform, border-color`; the
   pressed-state shadow swap is instant.
4. **Typing views.** `TypingCard` is split into a memoized char
   text (per-span memoized `CharSpan` — a keystroke updates O(1)
   spans) and a memoized KPI row fed by formatted primitives, so
   the ticking clock re-renders only the tiny stat pills, and only
   when a displayed value changes. TestView's live analytics moved
   into a memoized `LiveAnalytics` component fed by primitives;
   `Hands` is memoized (its `active` prop is a primitive).
5. **Game.** Verified: moving layers (bubbles, clouds, motes,
   particles) use gradients only — no backdrop-filter anywhere in
   the stage. HUD pills keep their small blur; the only
   backdrop-blur in the game remains the static game-over overlay.
6. **Sweep.** Remaining continuous animations are all composited
   (transform/opacity: shimmer sweeps, caret blink) or scoped to a
   single small element (next-key halo, one pulse-ring button).
   No `will-change`, no large-area box-shadow/width animations.

Build clean; exported CSS 47,265 bytes. Interactions remain
build-verified + code-reviewed; the live before/after feel check
happens on the deployed site after the user re-uploads.


## Phase 2 ideas (not in this build)

- More games (word race, sentence sprint, balloon pop)
- Urdu typing mode ( Nastaliq layout + Urdu finger curriculum)
- Optional accounts (Supabase) to sync progress across devices
- Printable/shareable result certificates, per-finger accuracy drills
