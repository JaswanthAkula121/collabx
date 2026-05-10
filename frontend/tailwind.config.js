/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        codex: {
          bg:       "#0f0a1e",
          surface:  "#1e1340",
          surface2: "#231748",
          border:   "rgba(139,92,246,0.25)",
        },
      },
      animation: {
        "pulse-dot": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
    },
  },
  plugins: [],
};
