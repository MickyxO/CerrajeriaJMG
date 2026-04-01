/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Segoe UI", "Tahoma", "sans-serif"],
        display: ["Sora", "Plus Jakarta Sans", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 16px 42px rgba(34, 63, 76, 0.16)",
      },
      keyframes: {
        "page-enter": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.992)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" },
        },
      },
      animation: {
        "page-enter": "page-enter 320ms ease-out",
        drift: "drift 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

