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
        // klein = the medium (screen, signal path), cream = picture / paper, rec = sound, ink = structure
        klein: "#1b2fe0",
        deep: "#1222a8",
        cream: "#f4eedc",
        rec: "#ff3d2e",
        ink: "#0c0f2a",
        haze: "rgba(244,238,220,0.62)",
        rule: "rgba(244,238,220,0.22)",
      },
      fontFamily: {
        title: ["var(--font-title)", "Impact", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        read: ["var(--font-read)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
