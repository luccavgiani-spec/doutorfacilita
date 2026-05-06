import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ────────────────────────────────────────────────────────
      // Paleta Google da nó
      // ────────────────────────────────────────────────────────
      colors: {
        // Cores primárias
        blue: {
          DEFAULT: "#4285F4",
          light: "#e8f0fe",
          dark: "#1a73e8",
        },
        red: {
          DEFAULT: "#EA4335",
          light: "#fce8e6",
        },
        yellow: {
          DEFAULT: "#FBBC04",
          light: "#fef9e3",
        },
        green: {
          DEFAULT: "#34A853",
          light: "#e6f4ea",
          dark: "#2d8a45",
        },
        // Neutros
        dark: "#1a1a1a",
        mid: "#5f6368",
        light: "#f8f9fa",
        bg: {
          DEFAULT: "#f4f6f9",
          2: "#ffffff",
          3: "#f0f2f5",
          4: "#e8eaed",
        },
        txt: {
          DEFAULT: "#1a1a1a",
          2: "#5f6368",
          3: "#9aa0a6",
        },
        border: {
          DEFAULT: "#e3e6ea",
          h: "rgba(0,0,0,0.08)",
          h2: "rgba(0,0,0,0.14)",
        },
        // Mevo (parceiro de prescrição)
        mevo: {
          purple: "#5a2a82",
          "purple-l": "#f3ecfb",
        },
      },
      // ────────────────────────────────────────────────────────
      // Tipografia: DM Sans (texto) + Caveat (acento manuscrito)
      // ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-dm-sans)", "Helvetica Neue", "system-ui", "sans-serif"],
        accent: ["var(--font-caveat)", "cursive"],
      },
      // ────────────────────────────────────────────────────────
      // Animações
      // ────────────────────────────────────────────────────────
      keyframes: {
        pulse: {
          "0%": { transform: "scale(.8)", opacity: "1" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "pulse-sm": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".4" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        pulse: "pulse 1.6s ease-out infinite",
        "pulse-sm": "pulse-sm 1.6s infinite",
        fade: "fade 0.3s ease",
      },
    },
  },
  plugins: [],
};

export default config;
