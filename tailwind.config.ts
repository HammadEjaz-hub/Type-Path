import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,.06), 0 8px 24px -12px rgba(5,150,105,.18)",
        pop: "0 12px 40px -12px rgba(5,150,105,.35)",
        key: "0 2px 0 rgba(16,24,40,.10), 0 4px 10px -4px rgba(16,24,40,.12)",
        glass:
          "0 1px 2px rgba(16,24,40,.05), 0 16px 40px -18px rgba(6,78,59,.16), inset 0 1px 0 rgba(255,255,255,.85)",
        "glass-lg":
          "0 2px 4px rgba(16,24,40,.05), 0 24px 56px -20px rgba(6,78,59,.22), inset 0 1px 0 rgba(255,255,255,.9)",
      },
      spacing: {
        "13": "3.25rem",
        "4.5": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
