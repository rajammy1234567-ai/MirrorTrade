/** @type {import('tailwindcss').Config} */
module.exports = {
  // Required for NativeWind web (avoids darkMode "media" crash in css-interop)
  darkMode: "class",
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        mt: {
          bg: "#0B0E14",
          surface: "#12161F",
          card: "#151A24",
          elevated: "#1A2030",
          border: "#252B3A",
          muted: "#8B93A7",
          text: "#F4F6FB",
          primary: "#5B6CFF",
          primaryEnd: "#8B5CF6",
          profit: "#00D084",
          loss: "#FF3B5C",
          warn: "#F5A524",
        },
      },
    },
  },
  plugins: [],
};
