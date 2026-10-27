"use client";

import { memo, useEffect, useState, type CSSProperties } from "react";
import { FINGERS, FINGER_ORDER, KEYBOARD_ROWS, fingerOf, type FingerId } from "@/lib/fingers";

interface Props {
  nextChar: string | null;
  pressedKey: string | null;
  /** last wrongly-pressed key — flashes red briefly */
  wrongKey?: string | null;
  compact?: boolean;
}

const SHADOW_TOP = "inset 0 1px 0 rgba(255,255,255,.65)";

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

interface CapPalette {
  light: string;
  fill: string;
  edge: string;
  deep: string;
}

/** Neutral glass-gray caps for keys the curriculum doesn't teach
    (Esc, F-row, Delete, Fn, Win, Alt, arrows). */
const NEUTRAL: CapPalette = { light: "#fcfcfd", fill: "#edf0f2", edge: "#c2cad1", deep: "#57616b" };

/** Muted pinky tones for the wide keys a pinky owns — same hue family as
    the letter keys, dialled back so they read as "support" keys. */
const MUTED_PINKY: Record<"l-pinky" | "r-pinky", CapPalette> = {
  "l-pinky": { light: "#fdf4f5", fill: "#f4e2e5", edge: "#e0b0b8", deep: "#9c5560" },
  "r-pinky": { light: "#fdf4f8", fill: "#f4e2eb", edge: "#e0b0c4", deep: "#9c5570" },
};

/** Standard touch-typing chart assignments for keys the finger map in
    lib/fingers.ts doesn't cover (it stops at the taught set). */
const FINGER_OVERRIDES: Record<string, FingerId> = {
  "`": "l-pinky",
  "-": "r-pinky",
  "=": "r-pinky",
  "\\": "r-pinky",
};

function fingerFor(ch: string): FingerId | null {
  return FINGER_OVERRIDES[ch] ?? fingerOf(ch);
}

/** Shifted symbol -> the physical base key that produces it. */
const SHIFTED_TO_BASE: Record<string, string> = {
  "~": "`", "!": "1", "@": "2", "#": "3", "$": "4", "%": "5", "^": "6",
  "&": "7", "*": "8", "(": "9", ")": "0", "_": "-", "+": "=", "{": "[",
  "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
};

function baseChar(ch: string): string {
  return SHIFTED_TO_BASE[ch] ?? ch;
}

function needsShift(ch: string): boolean {
  return /[A-Z]/.test(ch) || ch in SHIFTED_TO_BASE;
}

/** Which hand's Shift a character needs: the opposite of the hand that
    owns the character's finger. */
function shiftSideFor(ch: string): "left" | "right" | null {
  if (!needsShift(ch)) return null;
  const f = fingerFor(baseChar(ch).toLowerCase());
  if (!f || f === "thumb") return null;
  return f.startsWith("l-") ? "right" : "left";
}

/** Does a physical typed char (from pressedKey / wrongKey) belong to the
    cap that answers for `capChar`? Handles shifted variants (! -> 1). */
function charMatches(typed: string | null, capChar: string | undefined): boolean {
  if (typed === null || capChar === undefined) return false;
  if (typed === " " || capChar === " ") return typed === capChar;
  return typed.toLowerCase() === capChar || baseChar(typed) === capChar;
}

/* ------------------------------------------------------------------ */
/* Laptop layout — quarter-unit grid, 60 columns = 15u wide.           */
/* Every visual row sums to exactly 15u (60 quarter-units):            */
/*   F row    1 + 4 + ½ + 4 + ½ + 4 + 1            = 15u                */
/*   numbers  13×1 + Backspace 2                  = 15u                */
/*   Q row    Tab 1.5 + 10 + 1 + 1 + \| 1.5        = 15u                */
/*   home     Caps 1.75 + 9 + 1 + 1 + Enter 2.25  = 15u                */
/*   Z row    Shift 2.25 + 7 + 3 + Shift 2.75     = 15u                */
/*   bottom   1.25+1+1+1.25+5.5+1+1+1+1+1         = 15u                */
/* No numpad, no separate nav block — Delete sits on the F-row and     */
/* Home/End/PgUp/PgDn live on the arrow keys as Fn-legends, exactly    */
/* like a real Windows laptop. The bottom row maps to two half-height  */
/* grid rows so ↑ and ↓ can stack in their 1u column.                  */
/* ------------------------------------------------------------------ */

interface KeySpec {
  id: string;
  label: string;
  /** shifted legend printed small above the main legend */
  sub?: string;
  /** tiny secondary Fn-legend printed in a bottom corner (arrows) */
  corner?: string;
  /** width in quarter units (4 = 1u) */
  span: number;
  /** finger-zone colouring for taught keys */
  finger?: FingerId;
  /** muted pinky colouring for wide pinky-owned keys */
  muted?: "l-pinky" | "r-pinky";
  /** curriculum char this cap answers for (next/pressed/wrong matching) */
  char?: string;
  /** physical-press id for wide/special keys (see physIdsFor) */
  phys?: string;
  bump?: boolean;
  /** small text legend (F-row, wide keys) */
  texty?: boolean;
}

interface FullKey extends KeySpec {
  col: number;
  /** grid row start (the bottom row occupies grid rows 6-7) */
  grow: number;
  /** grid row span */
  gspan: number;
  /** F-row caps: shorter row, tighter radius */
  fnRow?: boolean;
}

/** Lay a visual row's keys left→right starting at column 1.
    A bare number in the list is an empty gap of that many quarter-units. */
function lay(
  grow: number,
  items: (KeySpec | number)[],
  opts: { gspan?: number; fnRow?: boolean } = {}
): FullKey[] {
  let c = 1;
  const out: FullKey[] = [];
  for (const item of items) {
    if (typeof item === "number") {
      c += item;
      continue;
    }
    out.push({ ...item, col: c, grow, gspan: opts.gspan ?? 1, fnRow: opts.fnRow });
    c += item.span;
  }
  return out;
}

/* small spec factories ------------------------------------------------ */

const zone = (ch: string): KeySpec => ({
  id: `k-${ch}`,
  label: ch.toUpperCase(),
  char: ch,
  span: 4,
  finger: fingerFor(ch) as FingerId,
  bump: ch === "f" || ch === "j",
});

const dual = (base: string, shifted: string, span = 4): KeySpec => ({
  id: `k-${base}`,
  label: base,
  sub: shifted,
  char: base,
  span,
  finger: fingerFor(base) as FingerId,
});

const neu = (id: string, label: string, span = 4, extra: Partial<KeySpec> = {}): KeySpec => ({
  id,
  label,
  span,
  phys: id,
  ...extra,
});

const widePinky = (
  id: string,
  label: string,
  span: number,
  side: "l-pinky" | "r-pinky"
): KeySpec => ({ id, label, span, muted: side, phys: id, texty: true });

const fnKey = (n: number): KeySpec => ({ ...neu(`f${n}`, `F${n}`), texty: true });

/* the board ----------------------------------------------------------- */

const LAPTOP_BOARD: FullKey[] = [
  // Row F — Esc · F1–F12 in 4/4/4 groups · Delete (grid row 1, 62% height)
  ...lay(
    1,
    [
      { ...neu("escape", "Esc"), texty: true },
      fnKey(1), fnKey(2), fnKey(3), fnKey(4),
      2,
      fnKey(5), fnKey(6), fnKey(7), fnKey(8),
      2,
      fnKey(9), fnKey(10), fnKey(11), fnKey(12),
      { ...neu("delete", "Delete"), texty: true },
    ],
    { fnRow: true }
  ),
  // Row 1 — numbers (grid row 2)
  ...lay(2, [
    dual("`", "~"),
    dual("1", "!"), dual("2", "@"), dual("3", "#"), dual("4", "$"),
    dual("5", "%"), dual("6", "^"), dual("7", "&"), dual("8", "*"),
    dual("9", "("), dual("0", ")"),
    dual("-", "_"), dual("=", "+"),
    widePinky("backspace", "Backspace", 8, "r-pinky"),
  ]),
  // Row 2 — Q row (grid row 3)
  ...lay(3, [
    widePinky("tab", "Tab", 6, "l-pinky"),
    ..."qwertyuiop".split("").map(zone),
    dual("[", "{"), dual("]", "}"), dual("\\", "|", 6),
  ]),
  // Row 3 — home row (grid row 4)
  ...lay(4, [
    widePinky("capslock", "Caps Lock", 7, "l-pinky"),
    ..."asdfghjkl".split("").map(zone),
    dual(";", ":"), dual("'", '"'),
    widePinky("enter", "Enter", 9, "r-pinky"),
  ]),
  // Row 4 — bottom letter row (grid row 5)
  ...lay(5, [
    widePinky("shift-l", "Shift", 9, "l-pinky"),
    ..."zxcvbnm".split("").map(zone),
    dual(",", "<"), dual(".", ">"), dual("/", "?"),
    widePinky("shift-r", "Shift", 11, "r-pinky"),
  ]),
  // Row 5 — bottom row (grid rows 6-7; regular caps span both half rows,
  // ↑ and ↓ stack inside their shared 1u column)
  ...lay(
    6,
    [
      widePinky("ctrl-l", "Ctrl", 5, "l-pinky"),
      { ...neu("fn", "Fn"), texty: true },
      { ...neu("win", "Win"), texty: true },
      { ...neu("alt-l", "Alt"), texty: true },
      { id: "space", label: "space", char: " ", span: 22, finger: "thumb" as FingerId },
      { ...neu("alt-r", "Alt"), texty: true },
      widePinky("ctrl-r", "Ctrl", 4, "r-pinky"),
      { ...neu("arrowleft", "←"), corner: "Home" },
    ],
    { gspan: 2 }
  ),
  // ↑ (top half of the arrow column) and ↓ / → (bottom half row)
  { ...neu("arrowup", "↑"), corner: "PgUp", col: 53, grow: 6, gspan: 1 },
  { ...neu("arrowdown", "↓"), corner: "PgDn", col: 53, grow: 7, gspan: 1 },
  { ...neu("arrowright", "→"), corner: "End", col: 57, grow: 6, gspan: 2 },
];

function paletteFor(key: KeySpec): CapPalette {
  if (key.muted) return MUTED_PINKY[key.muted];
  if (key.finger) return FINGERS[key.finger];
  return NEUTRAL;
}

/* ------------------------------------------------------------------ */
/* Physical presses of wide / special keys.                            */
/* pressedKey only carries printable chars, so the board listens for   */
/* the rest itself (purely cosmetic — mirrors what the hand is doing). */
/* On a laptop Home/End/PgUp/PgDn are Fn+arrow combos; the browser     */
/* reports the navigation keys, so they flash the arrow caps.          */
/* ------------------------------------------------------------------ */

function physIdsFor(e: KeyboardEvent): string[] {
  const loc = e.location; // 1 = left, 2 = right, 0 = standard
  switch (e.key) {
    case "Shift":
      return loc === 1 ? ["shift-l"] : loc === 2 ? ["shift-r"] : ["shift-l", "shift-r"];
    case "Control":
      return loc === 1 ? ["ctrl-l"] : loc === 2 ? ["ctrl-r"] : ["ctrl-l", "ctrl-r"];
    case "Alt":
      return loc === 1 ? ["alt-l"] : loc === 2 ? ["alt-r"] : ["alt-l", "alt-r"];
    case "Meta":
      return ["win"];
    case "Backspace": return ["backspace"];
    case "Tab": return ["tab"];
    case "CapsLock": return ["capslock"];
    case "Enter": return ["enter"];
    case "Escape": return ["escape"];
    case "Delete": return ["delete"];
    case "ArrowUp": return ["arrowup"];
    case "ArrowDown": return ["arrowdown"];
    case "ArrowLeft": return ["arrowleft"];
    case "ArrowRight": return ["arrowright"];
    case "Home": return ["arrowleft"];
    case "End": return ["arrowright"];
    case "PageUp": return ["arrowup"];
    case "PageDown": return ["arrowdown"];
    default:
      if (/^F\d{1,2}$/.test(e.key)) return [e.key.toLowerCase()];
      return [];
  }
}

function usePhysicalKeys(): ReadonlySet<string> {
  const [down, setDown] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const inField = (e: KeyboardEvent) =>
      (e.target as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable]") != null;
    const onDown = (e: KeyboardEvent) => {
      if (inField(e)) return;
      const ids = physIdsFor(e);
      if (!ids.length) return;
      setDown((prev) => {
        if (ids.every((id) => prev.has(id))) return prev;
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    };
    const onUp = (e: KeyboardEvent) => {
      const ids = physIdsFor(e);
      if (!ids.length) return;
      setDown((prev) => {
        if (!ids.some((id) => prev.has(id))) return prev;
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    };
    const onBlur = () => setDown(new Set());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
  return down;
}

/* ------------------------------------------------------------------ */
/* One keycap — memoized (performance pass). A keystroke changes the   */
/* state of only ~5 caps (old/new next, pressed, wrong, shift-glow),   */
/* so the other ~85 skip rendering entirely. All props are primitives  */
/* or module-stable references (LAPTOP_BOARD specs, finger palettes).  */
/* Transitions are scoped to transform + border-color: the pressed     */
/* shadow swap is instant instead of animating box-shadow every press. */
/* ------------------------------------------------------------------ */

interface KeyCapProps {
  k: FullKey;
  pal: CapPalette;
  isNext: boolean;
  isShiftNext: boolean;
  isPressed: boolean;
  isWrong: boolean;
}

const KeyCap = memo(function KeyCap({ k, pal, isNext, isShiftNext, isPressed, isWrong }: KeyCapProps) {
  const capStyle: CSSProperties = {
    gridColumn: `${k.col} / span ${k.span}`,
    gridRow: `${k.grow} / span ${k.gspan}`,
    background: isWrong
      ? "linear-gradient(180deg,#fff1f2 0%,#fecdd3 60%,#fda4af 100%)"
      : `linear-gradient(180deg, ${pal.light} 0%, ${pal.fill} 58%, ${pal.fill} 100%)`,
    borderColor: isWrong
      ? "#f43f5e"
      : isNext || isShiftNext
        ? "#059669"
        : "rgba(16,24,40,.07)",
    boxShadow: isPressed
      ? `inset 0 -1px 0 ${isWrong ? "#fb7185" : pal.edge}, ${SHADOW_TOP}, 0 1px 2px rgba(16,24,40,.14)`
      : `inset 0 -3px 0 ${isWrong ? "#fb7185" : pal.edge}, ${SHADOW_TOP}, 0 3px 7px -2px rgba(16,24,40,.22)`,
    transform: isPressed ? "translateY(2px)" : undefined,
    ["--edge" as string]: pal.edge,
  };
  return (
    <div
      className={`relative flex items-center justify-center border font-semibold transition-[transform,border-color] duration-100 ${
        k.fnRow ? "rounded-lg" : "rounded-xl"
      } ${
        k.id === "space"
          ? "text-[clamp(7px,0.85vw,11px)] uppercase tracking-[0.22em] text-gray-500"
          : k.texty
            ? "text-[clamp(7px,0.85vw,11px)] text-gray-600"
            : "text-[clamp(9px,1.15vw,15px)] text-gray-700"
      } ${isNext ? "keycap-next key-next-pulse z-10" : ""} ${
        isShiftNext ? "key-next-shift z-10" : ""
      } ${isWrong ? "keycap-wrong z-10" : ""}`}
      style={capStyle}
    >
      {k.sub ? (
        <span className="flex flex-col items-center gap-0 leading-none">
          <span className="text-[0.64em] font-semibold opacity-60">{k.sub}</span>
          <span className="mt-[0.14em]">{k.label}</span>
        </span>
      ) : (
        k.label
      )}
      {k.corner && (
        <span className="absolute bottom-[2px] right-[4px] text-[clamp(5px,0.55vw,7.5px)] font-medium leading-none text-gray-400">
          {k.corner}
        </span>
      )}
      {k.bump && (
        <span
          className="absolute bottom-[5px] left-1/2 h-[3px] w-3.5 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: pal.deep, opacity: 0.45 }}
        />
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function Keyboard({ nextChar, pressedKey, wrongKey = null, compact = false }: Props) {
  const physDown = usePhysicalKeys();

  const shiftSide = nextChar ? shiftSideFor(nextChar) : null;
  const hintFinger = nextChar ? fingerFor(baseChar(nextChar).toLowerCase()) : null;

  return (
    <div className="select-none" aria-hidden="true">
      {/* frosted glass deck */}
      <div
        className="glass-deck rounded-[1.75rem] px-3 py-4 sm:px-5 sm:py-5"
        style={{ ["--kh" as string]: compact ? "min(2.8vw, 36px)" : "min(3.6vw, 48px)" } as CSSProperties}
      >
        <div
          className="grid w-full gap-[clamp(3px,0.42vw,6px)]"
          style={{
            gridTemplateColumns: "repeat(60, minmax(0, 1fr))",
            gridTemplateRows:
              "calc(var(--kh) * 0.62) repeat(4, var(--kh)) calc(var(--kh) * 0.5) calc(var(--kh) * 0.5)",
          }}
        >
          {LAPTOP_BOARD.map((key) => {
            const pal = paletteFor(key);
            const isNext = charMatches(nextChar, key.char);
            const isShiftNext = shiftSide !== null && key.phys === `shift-${shiftSide === "left" ? "l" : "r"}`;
            const isPressed =
              charMatches(pressedKey, key.char) || (key.phys !== undefined && physDown.has(key.phys));
            const isWrong = charMatches(wrongKey, key.char);
            return (
              <KeyCap
                key={key.id}
                k={key}
                pal={pal}
                isNext={isNext}
                isShiftNext={isShiftNext}
                isPressed={isPressed}
                isWrong={isWrong}
              />
            );
          })}
        </div>

        {hintFinger && (
          <p className="mt-4 text-center text-[13px] text-gray-500">
            Next key uses your{" "}
            <span className="font-semibold" style={{ color: FINGERS[hintFinger].deep }}>
              {FINGERS[hintFinger].name.toLowerCase()}
            </span>
            {shiftSide && (
              <>
                {" "}— hold{" "}
                <span className="font-semibold text-gray-600">{shiftSide} Shift</span>{" "}
                with your {shiftSide} pinky
              </>
            )}
          </p>
        )}

        <div className="mt-3.5 border-t border-white/60 pt-3.5">
          <KeyboardLegend />
          <p className="mt-2 text-center text-[11px] text-gray-400">
            Pinkies also work the wide keys — Tab, Caps Lock, Shift, Ctrl, Enter &amp; Backspace.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Memoized: the 200ms stats tick in the parent re-renders Practice /
   TestView, but with unchanged props (nextChar / pressedKey / wrongKey
   are primitives) the whole board bails out. Internal physical-key
   state still re-renders from inside when special keys are pressed. */
export default memo(Keyboard);

export const KeyboardLegend = memo(function KeyboardLegend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {FINGER_ORDER.map((id) => (
        <span
          key={id}
          className="glass-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-gray-600"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full border"
            style={{
              background: `linear-gradient(180deg, ${FINGERS[id].light}, ${FINGERS[id].fill})`,
              borderColor: FINGERS[id].edge,
            }}
          />
          {FINGERS[id].short}
        </span>
      ))}
    </div>
  );
});

/** Small keyboard used for weak-keys display: keys with errors get a red depth. */
export function MiniKeyboard({ errors, highlight }: { errors: Record<string, number>; highlight?: string[] }) {
  const max = Math.max(1, ...Object.values(errors));
  return (
    <div className="flex flex-col items-center gap-1" aria-hidden="true">
      {KEYBOARD_ROWS.slice(1, 4).map((row, ri) => (
        <div key={ri} className="flex gap-1">
          {row.map((key) => {
            const ch = key.char ?? key.label.toLowerCase();
            const err = errors[ch] ?? 0;
            const info = FINGERS[key.finger];
            const isHi = highlight?.includes(ch);
            return (
              <div
                key={key.label}
                className="relative flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-medium text-gray-600"
                style={{
                  background:
                    err > 0
                      ? `rgba(220,38,38,${0.12 + (err / max) * 0.45})`
                      : `linear-gradient(180deg, ${info.light}, ${info.fill})`,
                  borderColor: isHi ? "#dc2626" : "rgba(16,24,40,.08)",
                  boxShadow: `inset 0 -2px 0 ${err > 0 ? "rgba(220,38,38,.35)" : info.edge}`,
                }}
                title={err > 0 ? `${key.label}: ${err} mistakes` : key.label}
              >
                {key.label}
                {err > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 px-0.5 text-[8px] font-bold text-white">
                    {err}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
