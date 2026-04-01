/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "rgb(15 23 42 / 0.85)",
          muted: "rgb(30 41 59)",
        },
        accent: {
          DEFAULT: "rgb(34 197 94)",
          dim: "rgb(22 163 74)",
        },
      },
    },
  },
  plugins: [],
};
