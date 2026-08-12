import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "studio-ink": "var(--studio-ink)",
        "studio-paper": "var(--studio-paper)",
        "studio-canvas": "var(--studio-canvas)",
        "studio-sage": "var(--studio-sage)",
        "studio-accent": "var(--studio-accent)",
        "studio-muted": "var(--studio-muted)",
        "studio-line": "var(--studio-line)",
      },
    },
  },
  plugins: [],
};
export default config;
