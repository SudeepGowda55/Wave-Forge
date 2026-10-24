import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        soot: "#0d0b09",
        coal: "#17130f",
        ember: "#ff5b1f",
        amber: "#ffb648",
        molten: "#fff1dc",
        steel: "#8193a6",
        bone: "#efe6d8",
        ash: "#a3998b",
        line: "rgba(239,230,216,0.12)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
