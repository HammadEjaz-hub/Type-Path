export type LessonStage = "drill" | "words" | "test";

export interface LessonDef {
  id: string;
  title: string;
  /** keys this lesson introduces (display) */
  newKeys: string[];
  /** full allowed letter set for generated drills up to & including this lesson */
  keys: string;
  intro: string;
  stages: LessonStage[];
  /** min WPM required (with >=90% accuracy) to pass the test stage */
  minWpm: number;
  /** curated word list for the words stage (falls back to generated if empty) */
  words?: string[];
  /** fixed text for test stage (sentences/paragraphs); drills otherwise */
  testText?: string;
}

export interface ModuleDef {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  lessons: LessonDef[];
}

/* ------------------------------------------------------------------ */
/* Content banks                                                       */
/* ------------------------------------------------------------------ */

export const COMMON_WORDS: string[] = [
  "the", "of", "and", "a", "to", "in", "is", "you", "that", "it",
  "he", "was", "for", "on", "are", "as", "with", "his", "they", "i",
  "at", "be", "this", "have", "from", "or", "one", "had", "by", "word",
  "but", "not", "what", "all", "were", "we", "when", "your", "can", "said",
  "there", "use", "an", "each", "which", "she", "do", "how", "their", "will",
  "up", "other", "about", "out", "many", "then", "them", "these", "so", "some",
  "her", "would", "make", "like", "him", "into", "time", "has", "look", "two",
  "more", "write", "go", "see", "number", "no", "way", "could", "people", "my",
  "than", "first", "water", "been", "call", "who", "oil", "its", "now", "find",
  "long", "down", "day", "did", "get", "come", "made", "may", "part", "over",
  "new", "sound", "take", "only", "little", "work", "know", "place", "year", "live",
  "me", "back", "give", "most", "very", "after", "thing", "our", "just", "name",
  "good", "sentence", "man", "think", "say", "great", "where", "help", "through", "much",
  "before", "line", "right", "too", "mean", "old", "any", "same", "tell", "boy",
  "follow", "came", "want", "show", "also", "around", "form", "three", "small", "set",
  "put", "end", "does", "another", "well", "large", "must", "big", "even", "such",
  "because", "turn", "here", "why", "ask", "went", "men", "read", "need", "land",
  "different", "home", "us", "move", "try", "kind", "hand", "picture", "again", "change",
  "off", "play", "spell", "air", "away", "animal", "house", "point", "page", "letter",
  "mother", "answer", "found", "study", "still", "learn", "should", "world", "high", "every",
];

export const SENTENCES: string[] = [
  "the quick brown fox jumps over the lazy dog",
  "practice a little every day and your fingers will learn the way",
  "she sells fresh bread at the small shop near the river",
  "we should finish the work before the sun goes down",
  "good typing comes from calm hands and steady eyes",
  "the children played in the garden until it was time for lunch",
  "he walks to the market every morning to buy fresh fruit",
  "learning to type without looking is a skill that lasts for life",
  "the river flows gently between the green hills and quiet farms",
  "please remember to bring your book when you come tomorrow",
  "a journey of a thousand miles begins with a single step",
  "the old man told stories about the sea and the ships he had sailed",
  "keep your wrists relaxed and let your fingers do the work",
  "winter rain tapped softly against the window all night long",
  "they planted rows of corn and wheat across the wide field",
  "success is the sum of small efforts repeated day after day",
  "the library stays open late for students who love to read",
];

export const CAPITAL_SENTENCES: string[] = [
  "Ali and Sara visited Lahore on Friday.",
  "My name is Ahmed and I live in Karachi.",
  "Pakistan won the match in June last year.",
  "Dr. Khan works at City Hospital on Mondays.",
  "We read English, Urdu, and Math at school.",
  "The Indus River flows through Sindh and Punjab.",
];

export const PUNCT_SENTENCES: string[] = [
  "wait, what did he say? i can't believe it!",
  "it's a bright day; let's go for a walk.",
  "she asked, 'are you ready?' and smiled.",
  "first, wash your hands. then, sit down to eat.",
  "well done! you finished the lesson, didn't you?",
  "the list is simple: pens, paper, ink, and a ruler.",
];

export const PARAGRAPHS: string[] = [
  "The morning sun rose over the quiet village, painting the fields in gold. Farmers walked to their land with hope in their hearts, ready for another honest day of work. In the distance, children laughed as they hurried along the dusty path to school, their books held close and their dreams held closer still.",
  "Reading is one of the finest habits a person can build. A good book can carry you across oceans and centuries without ever leaving your chair. It teaches you new words, new ideas, and new ways of seeing the world you thought you already knew.",
  "Technology has changed the way we work, learn, and speak to one another. A message that once took weeks to cross a country now arrives in a single second. With this great power comes a simple duty: use it wisely, speak kindly, and keep learning every single day.",
  "The garden behind our house is small, but it is full of life. In spring, roses open beside the lemon tree, and bees hum softly from flower to flower. My grandmother tends it with patient hands, and she says every plant grows at its own perfect pace.",
  "Long ago, sailors crossed the wide ocean guided only by the stars. They had no maps of the deep and no promise of safe return, yet they sailed on with courage. Their stories remind us that every great journey begins with a brave first step into the unknown.",
  "A healthy life is built on simple things done well. Drink clean water, eat fresh food, walk a little each day, and sleep before the night grows too old. These small acts, repeated with care, protect the body and keep the mind clear and strong.",
  "When the rain finally came, the whole town seemed to smile. Dust washed from the rooftops, the dry fields drank deeply, and children ran outside to feel the cool drops on their faces. By evening, the air smelled of wet earth and every heart felt lighter.",
];

/* ------------------------------------------------------------------ */
/* Deterministic drill generation                                      */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickN<T>(rnd: () => number, arr: T[], n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(rnd() * arr.length)]);
  return out;
}

/**
 * Build a drill string from the lesson's key set: chunks of 2-4 chars that
 * feel like keybr-style pseudo words, weighted toward the newest keys.
 */
export function generateDrill(lesson: LessonDef, variant = 0, length = 110): string {
  const rnd = rng(hashStr(lesson.id) + variant * 7919);
  const keys = lesson.keys.replace(/ /g, "");
  const fresh = lesson.newKeys.map((k) => k.toLowerCase()).filter((k) => keys.includes(k));
  const pool: string[] = [];
  for (const c of keys) pool.push(c, c);
  for (const c of fresh) pool.push(c, c, c); // emphasise new keys
  const chunks: string[] = [];
  let total = 0;
  while (total < length) {
    const len = 2 + Math.floor(rnd() * 3);
    let chunk = "";
    for (let i = 0; i < len; i++) chunk += pool[Math.floor(rnd() * pool.length)];
    chunks.push(chunk);
    total += chunk.length + 1;
  }
  return chunks.join(" ");
}

/** Word-stage text: curated words shuffled deterministically (or generated pseudo words). */
export function generateWordText(lesson: LessonDef, variant = 0, count = 26): string {
  const rnd = rng(hashStr(lesson.id + "-words") + variant * 104729);
  if (lesson.words && lesson.words.length > 0) {
    return pickN(rnd, lesson.words, count).join(" ");
  }
  // pseudo words from the key set
  const keys = lesson.keys.replace(/ /g, "");
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 3 + Math.floor(rnd() * 3);
    let w = "";
    for (let j = 0; j < len; j++) w += keys[Math.floor(rnd() * keys.length)];
    words.push(w);
  }
  return words.join(" ");
}

/** Text for the pass-test stage. */
export function generateTestText(lesson: LessonDef, variant = 0): string {
  if (lesson.testText) return lesson.testText;
  if (lesson.stages.includes("words") && lesson.words && lesson.words.length > 0) {
    return generateWordText(lesson, variant + 13, 30);
  }
  return generateDrill(lesson, variant + 13, 120);
}

/** Falling Words bank: words formable from the learned letters (+ real words). */
export function gameWordsFor(learnedKeys: string): string[] {
  const set = new Set(learnedKeys.replace(/ /g, "").split(""));
  const ok = (w: string) => w.split("").every((c) => set.has(c));
  const fromCommon = COMMON_WORDS.filter((w) => w.length >= 3 && ok(w));
  const extras = CURATED_GAME_WORDS.filter(ok);
  const merged = Array.from(new Set([...fromCommon, ...extras]));
  return merged.length >= 12 ? merged : COMMON_WORDS.filter((w) => w.length >= 3 && w.length <= 6);
}

const CURATED_GAME_WORDS = [
  "as", "ask", "sad", "fad", "dad", "lad", "fall", "glad", "half", "hall",
  "salad", "flask", "glass", "flag", "dash", "lass", "add", "all", "gas",
  "has", "had", "jag", "lag", "gala", "salsa", "elf", "self", "sell",
];

/* ------------------------------------------------------------------ */
/* Curriculum                                                          */
/* ------------------------------------------------------------------ */

const HOME = "asdfghjkl;";
const HOME_TOP = HOME + "qwertyuiop";
const ALL_ROWS = HOME_TOP + "zxcvbnm,./";

export const MODULES: ModuleDef[] = [
  {
    id: "m1",
    title: "Home Row",
    tagline: "Your home base — the middle row where your fingers live.",
    icon: "⌂",
    lessons: [
      {
        id: "m1l1",
        title: "Index fingers: F & J",
        newKeys: ["f", "j"],
        keys: "fj",
        intro:
          "Place your left index finger on F and your right index finger on J. Feel the small bumps on those keys — they help you find home without looking. Everything in touch typing starts here.",
        stages: ["drill", "test"],
        minWpm: 8,
      },
      {
        id: "m1l2",
        title: "Middle fingers: D & K",
        newKeys: ["d", "k"],
        keys: "fjdk",
        intro:
          "Your middle fingers own D (left) and K (right). Keep your index fingers resting on F and J while the middle fingers reach one key over.",
        stages: ["drill", "test"],
        minWpm: 8,
      },
      {
        id: "m1l3",
        title: "Ring fingers: S & L",
        newKeys: ["s", "l"],
        keys: "fj dksl".replace(" ", ""),
        intro:
          "Now the ring fingers: S on the left, L on the right. Six keys are yours already — notice how each finger always returns to its home key.",
        stages: ["drill", "test"],
        minWpm: 8,
      },
      {
        id: "m1l4",
        title: "Pinky fingers: A & ;",
        newKeys: ["a", ";"],
        keys: "asdfjkl;",
        intro:
          "The pinkies take A and the semicolon key. Pinkies feel weak at first — that is normal. Slow, accurate taps will train them quickly.",
        stages: ["drill", "test"],
        minWpm: 8,
      },
      {
        id: "m1l5",
        title: "Home row mix + G & H",
        newKeys: ["g", "h"],
        keys: HOME,
        intro:
          "The index fingers stretch inward for G and H. Mix everything on the home row now — rhythm matters more than speed.",
        stages: ["drill", "words", "test"],
        minWpm: 8,
        words: [
          "as", "ask", "sad", "fad", "dad", "lad", "lass", "fall", "glad", "dash",
          "half", "hall", "salad", "flask", "salsa", "gala", "flag", "glass", "add",
          "all", "gas", "had", "has", "jag", "lag", "ash", "shag", "gal", "hag",
        ],
      },
      {
        id: "m1l6",
        title: "Home row words",
        newKeys: [],
        keys: HOME,
        intro:
          "Real words using only the home row. Type them as whole words now, not letter by letter — read one word ahead while your fingers finish the current one.",
        stages: ["words", "test"],
        minWpm: 10,
        words: [
          "salad", "flask", "glass", "glad", "fall", "dash", "half", "hall", "salsa",
          "gala", "flag", "lass", "shall", "ash", "jag", "lag", "hag", "gas", "ask",
          "sad", "dad", "fad", "lad", "add", "all", "had", "has", "gag", "gal",
        ],
      },
    ],
  },
  {
    id: "m2",
    title: "Top Row",
    tagline: "Reach up — QWERTY row, one finger pair at a time.",
    icon: "↟",
    lessons: [
      {
        id: "m2l1",
        title: "E & I — middle fingers reach up",
        newKeys: ["e", "i"],
        keys: HOME + "ei",
        intro:
          "Your middle fingers reach up from D and K to E and I. The move is short — slide up, tap, and return home every single time.",
        stages: ["drill", "words", "test"],
        minWpm: 12,
        words: ["side", "idea", "file", "like", "life", "dike", "lied", "isle", "seek", "feed", "seed", "deal", "idea", "else", "said", "dial", "sail", "fail", "laid", "dead"],
      },
      {
        id: "m2l2",
        title: "R & U — index fingers reach up",
        newKeys: ["r", "u"],
        keys: HOME + "eiru",
        intro:
          "Index fingers reach up-left for R and up-right for U. These two keys appear in a huge number of English words — they are worth the practice.",
        stages: ["drill", "words", "test"],
        minWpm: 12,
        words: ["sure", "rude", "rule", "rural", "fur", "jar", "jug", "rug", "dull", "full", "girl", "surf", "urge", "user", "true", "red", "rid", "sir", "fur", "guru"],
      },
      {
        id: "m2l3",
        title: "T & Y — index fingers stretch",
        newKeys: ["t", "y"],
        keys: HOME + "eiruty",
        intro:
          "T and Y ask your index fingers to stretch sideways as they reach up. Keep the stretch small and your wrists still.",
        stages: ["drill", "words", "test"],
        minWpm: 12,
        words: ["stay", "try", "yet", "type", "year", "your", "yell", "duty", "tray", "grey", "tyre", "rust", "dust", "just", "city", "easy", "lady", "day", "say", "ray"],
      },
      {
        id: "m2l4",
        title: "W & O — ring fingers reach up",
        newKeys: ["w", "o"],
        keys: HOME + "eirutywo",
        intro:
          "Ring fingers reach up to W and O. Words start to feel like real English now — keep your eyes on the screen, not your hands.",
        stages: ["drill", "words", "test"],
        minWpm: 12,
        words: ["work", "word", "wood", "wolf", "slow", "show", "low", "row", "owe", "wool", "door", "look", "good", "food", "who", "two", "how", "now", "grow", "flow"],
      },
      {
        id: "m2l5",
        title: "Q & P — pinkies reach up",
        newKeys: ["q", "p"],
        keys: HOME_TOP,
        intro:
          "The pinkies finish the top row with Q and P. You now own the whole top row — mix it freely with the home row below.",
        stages: ["drill", "words", "test"],
        minWpm: 12,
        words: ["quip", "quit", "quip", "pup", "pop", "pipe", "poet", "poetry", "equip", "quote", "quest", "quite", "quiet", "pepper", "people", "upper", "type", "wipe", "rope", "hope"],
      },
      {
        id: "m2l6",
        title: "Top row words",
        newKeys: [],
        keys: HOME_TOP,
        intro:
          "A full mix of home and top row words. Aim for an even rhythm — the same time between every keystroke, like a metronome.",
        stages: ["words", "test"],
        minWpm: 14,
        words: ["power", "tower", "write", "quite", "quiet", "people", "purple", "yellow", "follow", "window", "winter", "summer", "letter", "pretty", "sister", "water", "paper", "tiger", "river", "happy"],
      },
    ],
  },
  {
    id: "m3",
    title: "Bottom Row",
    tagline: "Reach down — the bottom row completes the alphabet.",
    icon: "↡",
    lessons: [
      {
        id: "m3l1",
        title: "V & N — index fingers reach down",
        newKeys: ["v", "n"],
        keys: HOME_TOP + "vn",
        intro:
          "Index fingers curl down to V and N. N is one of the most common letters in English — after this lesson whole new worlds of words open up.",
        stages: ["drill", "words", "test"],
        minWpm: 15,
        words: ["van", "vent", "vine", "oven", "even", "never", "seven", "given", "river", "novel", "envy", "navy", "knee", "know", "nine", "noon", "soon", "ten", "pen", "hen"],
      },
      {
        id: "m3l2",
        title: "B & M — index fingers stretch down",
        newKeys: ["b", "m"],
        keys: HOME_TOP + "vnbm",
        intro:
          "B and M complete the index fingers' territory. Stretch across the bottom row while your other fingers stay close to home.",
        stages: ["drill", "words", "test"],
        minWpm: 15,
        words: ["mob", "bomb", "amber", "number", "member", "remember", "maybe", "become", "combine", "bamboo", "me", "my", "many", "man", "men", "map", "moon", "bloom", "beam", "team"],
      },
      {
        id: "m3l3",
        title: "C & comma — middle fingers reach down",
        newKeys: ["c", ","],
        keys: HOME_TOP + "vnbm" + "c,",
        intro:
          "Middle fingers curl down for C and the comma. The comma is your first punctuation key — a small pause inside the flow of typing.",
        stages: ["drill", "words", "test"],
        minWpm: 15,
        words: ["cat", "can", "car", "care", "case", "come", "call", "city", "clean", "climb", "cabin", "candy", "catch", "center", "certain", "chance", "check", "chess", "chicken", "circle"],
      },
      {
        id: "m3l4",
        title: "X & full stop — ring fingers reach down",
        newKeys: ["x", "."],
        keys: HOME_TOP + "vnbmc," + "x.",
        intro:
          "Ring fingers take X and the full stop. The full stop ends every sentence — give it a clean, confident tap.",
        stages: ["drill", "words", "test"],
        minWpm: 15,
        words: ["box", "fox", "six", "fix", "mix", "taxi", "exit", "exam", "next", "text", "oxen", "extra", "exactly", "exercise", "explain", "express", "extend", "expert", "expect", "excite"],
      },
      {
        id: "m3l5",
        title: "Z & slash — pinkies reach down",
        newKeys: ["z", "/"],
        keys: ALL_ROWS,
        intro:
          "The pinkies finish the keyboard with Z and the slash. You now own every letter on the keyboard — the full alphabet is under your fingers.",
        stages: ["drill", "words", "test"],
        minWpm: 15,
        words: ["zoo", "zip", "zero", "zone", "zebra", "lazy", "crazy", "frozen", "dozen", "puzzle", "jazz", "buzz", "size", "prize", "amaze", "breeze", "freeze", "sneeze", "bronze", "glaze"],
      },
      {
        id: "m3l6",
        title: "All rows review",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "Every row, every finger. This review mixes the whole alphabet — accuracy first, and let speed follow on its own.",
        stages: ["words", "test"],
        minWpm: 17,
        words: ["quick", "brown", "jumps", "lazy", "dogs", "vivid", "waltz", "nymph", "glyph", "fjord", "quest", "zebra", "monkey", "puzzle", "winter", "summer", "garden", "market", "planet", "bridge"],
      },
    ],
  },
  {
    id: "m4",
    title: "Full Keyboard",
    tagline: "Real words, real sentences — typing becomes reading.",
    icon: "✎",
    lessons: [
      {
        id: "m4l1",
        title: "Common words I",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "The most common English words make up most of everyday writing. Master these and everyday typing starts to feel effortless.",
        stages: ["words", "test"],
        minWpm: 20,
        words: COMMON_WORDS.slice(0, 60),
      },
      {
        id: "m4l2",
        title: "Common words II",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "More of the words you will type every single day. Keep a steady beat — do not rush the easy words and stumble on the hard ones.",
        stages: ["words", "test"],
        minWpm: 20,
        words: COMMON_WORDS.slice(60, 130),
      },
      {
        id: "m4l3",
        title: "Common words III",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "The final set of core words. By now your fingers should be finding keys on their own — trust them and keep your eyes up.",
        stages: ["words", "test"],
        minWpm: 20,
        words: COMMON_WORDS.slice(130),
      },
      {
        id: "m4l4",
        title: "First sentences",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "Full sentences at last. Think of each sentence as a stream of words you already know — read ahead and let your fingers follow.",
        stages: ["test"],
        minWpm: 20,
        testText: SENTENCES.slice(0, 4).join(" "),
      },
      {
        id: "m4l5",
        title: "Sentence flow",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "Longer stretches of real text. If you make a mistake, keep going — stopping to stare at errors is the biggest speed killer.",
        stages: ["test"],
        minWpm: 22,
        testText: SENTENCES.slice(4, 9).join(" "),
      },
    ],
  },
  {
    id: "m5",
    title: "Capitals, Numbers & Marks",
    tagline: "Shift, the number row, and the punctuation that finishes sentences.",
    icon: "§",
    lessons: [
      {
        id: "m5l1",
        title: "Capital letters with Shift",
        newKeys: ["Shift"],
        keys: ALL_ROWS,
        intro:
          "Hold Shift with the pinky of the OPPOSITE hand: left-hand letters use the right Shift, right-hand letters use the left Shift. The letter finger taps while the pinky holds.",
        stages: ["test"],
        minWpm: 20,
        testText: CAPITAL_SENTENCES.slice(0, 3).join(" "),
      },
      {
        id: "m5l2",
        title: "Capital sentences",
        newKeys: [],
        keys: ALL_ROWS,
        intro:
          "Names, places, and sentence starts. The Shift rhythm becomes automatic quickly — one hand holds, the other taps.",
        stages: ["test"],
        minWpm: 20,
        testText: CAPITAL_SENTENCES.slice(3).join(" "),
      },
      {
        id: "m5l3",
        title: "Number row: 1–5",
        newKeys: ["1", "2", "3", "4", "5"],
        keys: ALL_ROWS + "12345",
        intro:
          "The left hand takes the first half of the number row, each finger reaching up from its home column: 1 pinky, 2 ring, 3 middle, 4 and 5 index.",
        stages: ["drill", "test"],
        minWpm: 18,
      },
      {
        id: "m5l4",
        title: "Number row: 6–0",
        newKeys: ["6", "7", "8", "9", "0"],
        keys: ALL_ROWS + "1234567890",
        intro:
          "The right hand mirrors the left: 6 and 7 index, 8 middle, 9 ring, 0 pinky. Numbers in real text are short — accuracy beats speed here.",
        stages: ["drill", "test"],
        minWpm: 18,
      },
      {
        id: "m5l5",
        title: "Punctuation in sentences",
        newKeys: ["?", "!", "'"],
        keys: ALL_ROWS + "1234567890",
        intro:
          "Question marks, exclamations, and apostrophes — the marks that give sentences their voice. Each one is Shift plus a key you already know.",
        stages: ["test"],
        minWpm: 20,
        testText: PUNCT_SENTENCES.join(" "),
      },
    ],
  },
  {
    id: "m6",
    title: "Speed & Paragraphs",
    tagline: "Full paragraphs against the clock — build real-world speed.",
    icon: "⚡",
    lessons: PARAGRAPHS.map((p, i) => ({
      id: `m6l${i + 1}`,
      title: `Paragraph challenge ${i + 1}`,
      newKeys: [] as string[],
      keys: ALL_ROWS + "1234567890",
      intro:
        i === 0
          ? "Type the whole paragraph as one flowing piece. This is your graduation module — every key, every finger, real text. Target: 25 WPM at 90% accuracy or better."
          : "Another full paragraph. Stay loose, breathe, and keep the rhythm even from the first word to the last.",
      stages: ["test"] as LessonStage[],
      minWpm: 25,
      testText: p,
    })),
  },
];

export const ALL_LESSONS: LessonDef[] = MODULES.flatMap((m) => m.lessons);
export const LESSON_INDEX: Record<string, { lesson: LessonDef; module: ModuleDef; globalIdx: number }> = {};
ALL_LESSONS.forEach((lesson, i) => {
  const mod = MODULES.find((m) => m.lessons.some((l) => l.id === lesson.id)) as ModuleDef;
  LESSON_INDEX[lesson.id] = { lesson, module: mod, globalIdx: i };
});

/** All letters learned once every lesson up to (and including) this one is considered. */
export function learnedKeysUpTo(globalIdx: number): string {
  let keys = "";
  for (let i = 0; i <= globalIdx && i < ALL_LESSONS.length; i++) {
    keys = ALL_LESSONS[i].keys;
  }
  return keys;
}
