export type FingerId =
  | "l-pinky"
  | "l-ring"
  | "l-middle"
  | "l-index"
  | "r-index"
  | "r-middle"
  | "r-ring"
  | "r-pinky"
  | "thumb";

export interface FingerInfo {
  id: FingerId;
  name: string;
  short: string;
  /** soft pastel fill used on key caps + fingertips */
  fill: string;
  /** palest tone — top of the keycap gradient */
  light: string;
  /** saturated tone — the keycap's 3px bottom edge */
  edge: string;
  /** slightly deeper tone for borders / text on the fill */
  deep: string;
}

export const FINGERS: Record<FingerId, FingerInfo> = {
  "l-pinky": { id: "l-pinky", name: "Left pinky", short: "L pinky", fill: "#ffe4e6", light: "#fff5f6", edge: "#fda4af", deep: "#be123c" },
  "l-ring": { id: "l-ring", name: "Left ring", short: "L ring", fill: "#ffedd5", light: "#fff8f0", edge: "#fdba74", deep: "#c2410c" },
  "l-middle": { id: "l-middle", name: "Left middle", short: "L middle", fill: "#fef9c3", light: "#fefef0", edge: "#fde047", deep: "#a16207" },
  "l-index": { id: "l-index", name: "Left index", short: "L index", fill: "#dcfce7", light: "#f2fdf5", edge: "#86efac", deep: "#15803d" },
  "r-index": { id: "r-index", name: "Right index", short: "R index", fill: "#e0f2fe", light: "#f3faff", edge: "#7dd3fc", deep: "#0369a1" },
  "r-middle": { id: "r-middle", name: "Right middle", short: "R middle", fill: "#e0e7ff", light: "#f2f4ff", edge: "#a5b4fc", deep: "#4338ca" },
  "r-ring": { id: "r-ring", name: "Right ring", short: "R ring", fill: "#ede9fe", light: "#f7f5ff", edge: "#c4b5fd", deep: "#6d28d9" },
  "r-pinky": { id: "r-pinky", name: "Right pinky", short: "R pinky", fill: "#fce7f3", light: "#fef5fa", edge: "#f9a8d4", deep: "#be185d" },
  thumb: { id: "thumb", name: "Thumbs", short: "Thumb", fill: "#e5e7eb", light: "#fafafa", edge: "#9ca3af", deep: "#4b5563" },
};

/** Which finger owns a character (lowercase a-z, digits, common punctuation). */
const CHAR_FINGER: Record<string, FingerId> = {};

function assign(chars: string, finger: FingerId) {
  for (const c of chars) CHAR_FINGER[c] = finger;
}

assign("aqz", "l-pinky");
assign("swx", "l-ring");
assign("dec", "l-middle");
assign("rfvgtb", "l-index");
assign("ujmyhn", "r-index");
assign("ik,", "r-middle");
assign("ol.", "r-ring");
assign("p;/'[]", "r-pinky");
assign(" ", "thumb");
// digits follow the letter columns
assign("1", "l-pinky");
assign("2", "l-ring");
assign("3", "l-middle");
assign("45", "l-index");
assign("67", "r-index");
assign("8", "r-middle");
assign("9", "r-ring");
assign("0", "r-pinky");

export function fingerOf(ch: string): FingerId | null {
  if (!ch) return null;
  const lower = ch.toLowerCase();
  return CHAR_FINGER[lower] ?? null;
}

/** Capital letters are typed with the opposite hand's pinky on Shift. */
export function shiftHandFor(ch: string): "left" | "right" | null {
  if (!/[A-Z]/.test(ch)) return null;
  const f = fingerOf(ch);
  if (!f) return null;
  return f.startsWith("l-") ? "right" : "left";
}

export const FINGER_ORDER: FingerId[] = [
  "l-pinky",
  "l-ring",
  "l-middle",
  "l-index",
  "r-index",
  "r-middle",
  "r-ring",
  "r-pinky",
  "thumb",
];

export interface KeyDef {
  label: string;
  finger: FingerId;
  /** relative width units (1 = normal key) */
  w?: number;
  bump?: boolean;
  char?: string; // char produced (defaults to label lowercase)
}

export const KEYBOARD_ROWS: KeyDef[][] = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => ({
    label: d,
    finger: fingerOf(d) as FingerId,
  })),
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map((c) => ({
    label: c.toUpperCase(),
    char: c,
    finger: fingerOf(c) as FingerId,
  })),
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"].map((c) => ({
    label: c === ";" ? ";" : c.toUpperCase(),
    char: c,
    finger: fingerOf(c) as FingerId,
    bump: c === "f" || c === "j",
  })),
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"].map((c) => ({
    label: c,
    char: c,
    finger: fingerOf(c) as FingerId,
  })),
  [{ label: "Space", char: " ", finger: "thumb" as FingerId, w: 6 }],
];

/** Lookup: char -> its KeyDef (for highlight / flash). */
export const KEY_BY_CHAR: Record<string, KeyDef> = {};
for (const row of KEYBOARD_ROWS) {
  for (const k of row) {
    const ch = k.char ?? k.label.toLowerCase();
    KEY_BY_CHAR[ch] = k;
    KEY_BY_CHAR[ch.toUpperCase()] = k;
  }
}
