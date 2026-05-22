import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== Palette T-ERP =====
        primary: {
          DEFAULT: "#A855F7", // = 500, pour `bg-primary` / `text-primary` / `border-primary`
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C084FC",
          500: "#A855F7", // base brand
          600: "#9333EA",
          700: "#7E22CE",
          800: "#6B21A8",
          900: "#581C87",
        },
        sidebar: {
          bg: "#2A1B3D",
          hover: "rgba(255,255,255,.08)",
          text: "rgba(255,255,255,.78)",
        },
        ink: {
          DEFAULT: "#1F2A3D",
          2: "#374151",
          3: "#6B7280",
          4: "#9CA3AF",
        },
        line: {
          DEFAULT: "#E5E7EB",
          2: "#D1D5DB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F9FAFB",
        },
        // Statuts
        success: "#15803D",
        warning: "#B45309",
        danger: "#B91C1C",
        info: "#0369A1",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg,#A855F7 0%,#C084FC 100%)",
        "brand-gradient-dark": "linear-gradient(135deg,#2A1B3D 0%,#7E22CE 100%)",
      },
      boxShadow: {
        "brand": "0 4px 12px rgba(168,85,247,.3)",
        "brand-lg": "0 8px 20px rgba(168,85,247,.12)",
        "card": "0 1px 3px rgba(0,0,0,.06)",
      },
      animation: {
        "screen-fade-in": "screenFadeIn .25s ease-out",
        "modal-slide-up": "modalSlideUp .22s cubic-bezier(.2,.8,.2,1)",
        "nav-progress": "navProgress .55s ease-out",
        "shimmer": "shimmer 1.5s infinite",
      },
      keyframes: {
        screenFadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        modalSlideUp: {
          from: { opacity: "0", transform: "translateY(20px) scale(.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        navProgress: {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(450%)", opacity: ".3" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "200px 0" },
        },
      },
      screens: {
        // Breakpoints du prototype
        "xl-compact": "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
