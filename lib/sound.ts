/**
 * Tiny WebAudio sound kit — no audio files. All tones are short, soft
 * oscillators kept at low gain so they never startle.
 */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine"
) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

export const sounds = {
  /** short soft click for a correct keystroke */
  click() {
    tone(660, 0, 0.055, 0.045, "triangle");
  },
  /** gentle low tick for a mistake */
  error() {
    tone(196, 0, 0.07, 0.035, "sine");
  },
  /** two-note success chime on pass */
  success() {
    tone(523.25, 0, 0.16, 0.05, "sine");
    tone(783.99, 0.11, 0.24, 0.05, "sine");
  },
  /** soft thud for a failed attempt */
  fail() {
    tone(262, 0, 0.16, 0.04, "sine");
    tone(220, 0.12, 0.22, 0.04, "sine");
  },
  /** game pop — pitch climbs (in semitones) as the combo grows */
  pop(pitchSteps = 0) {
    const f = Math.pow(2, Math.min(12, Math.max(0, pitchSteps)) / 12);
    tone(880 * f, 0, 0.07, 0.05, "triangle");
    tone(1320 * f, 0.03, 0.09, 0.035, "triangle");
  },
};
