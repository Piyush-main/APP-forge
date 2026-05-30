import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
      colors: {
        forge: {
          bg:      "#0a0a0f",
          bg2:     "#111118",
          bg3:     "#1a1a24",
          bg4:     "#22222f",
          border:  "#2a2a3a",
          border2: "#3a3a50",
          accent:  "#6c63ff",
          accent2: "#a78bfa",
          accent3: "#38bdf8",
        },
      },
      animation: {
        "fade-in":    "fadeIn .2s ease",
        "slide-up":   "slideUp .25s ease",
        "pulse-slow": "pulse 3s infinite",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
