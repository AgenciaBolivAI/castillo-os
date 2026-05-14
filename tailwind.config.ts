import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: "#00e5a0", dim: "#00b87d" },
        dark: "#080b09",
        surface: "#0e120f",
        card: "#121812",
        border: "#1a221b",
        "border-bright": "#243325",
        text: "#d4e0d5",
        muted: "#4a5e4c",
        muted2: "#2a352b",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
