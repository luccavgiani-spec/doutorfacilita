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
      // Paleta da marca — Plantão Digital
      // ────────────────────────────────────────────────────────
      colors: {
        // Marca
        blue: {
          DEFAULT: "#1E5AE8",
          light: "#E8F0FF",
          dark: "#123FBF",
        },
        red: {
          DEFAULT: "#EF4444",
          light: "#FEE2E2",
        },
        yellow: {
          DEFAULT: "#F59E0B",
          light: "#FEF3C7",
        },
        green: {
          DEFAULT: "#10B981",
          light: "#ECFDF5",
          dark: "#0E9F6E",
        },
        // Neutros
        dark: "#0B1B3A",
        mid: "#55647E",
        light: "#f8f9fa",
        bg: {
          DEFAULT: "#f4f6f9",
          2: "#ffffff",
          3: "#f0f2f5",
          4: "#e8eaed",
        },
        txt: {
          DEFAULT: "#0B1B3A",
          2: "#55647E",
          3: "#8B97AD",
        },
        border: {
          DEFAULT: "#E6ECF8",
          h: "rgba(11,27,58,0.08)",
          h2: "rgba(11,27,58,0.14)",
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
        serif: ["Instrument Serif", "Georgia", "serif"],
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
