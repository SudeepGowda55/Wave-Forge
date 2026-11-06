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
        // cyan = sound / signal, violet = the AI listening, amber = a voice speaking / live, rose = something failed
        void: "#05060b",
        panel: "#0b0f1a",
        fg: "#e6f1ff",
        cyan: "#6bf6ff",
        violet: "#b18cff",
        amber: "#ffb547",
        rose: "#ff5c7a",
        // older names kept so app pages restyle with the theme: ink/cream are foreground, rec is the signal accent
        ink: "#e6f1ff",
        cream: "#e6f1ff",
        rec: "#6bf6ff",
      },
      fontFamily: {
        title: ["var(--font-title)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        read: ["var(--font-read)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
