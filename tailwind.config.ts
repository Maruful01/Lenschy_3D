import type { Config } from "tailwindcss";

export default <Config>{
  content: [
    "./app.vue",
    "./components/**/*.{vue,js,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./composables/**/*.{js,ts}",
    "./plugins/**/*.{js,ts}",
    "./utils/**/*.{js,ts,css}",
    "./assets/**/*.{vue,js,ts,css}",
  ],
  theme: {
    extend: {
      colors: {
        "n-1": "#FFFFFF",
        "n-8": "#121212",  // Define your custom background color
        "n-6": "#444444",
        "n-7": "#222222",
        "stroke-1": "#555555",
      },
    },
  },
  plugins: [require('daisyui')],
};
