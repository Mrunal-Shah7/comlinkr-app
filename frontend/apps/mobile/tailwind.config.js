/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0076EB",
          "blue-dark": "#0062CC",
          "blue-light": "#E6F4FE",
          green: "#26B324",
          "green-dark": "#1a8a18",
          "green-light": "#EAFBE9",
          orange: "#FF7B00",
          "orange-light": "#FFF3E6",
        },
      },
      fontFamily: {
        "inter-thin": ["Inter_100Thin"],
        "inter-light": ["Inter_300Light"],
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        "inter-extrabold": ["Inter_800ExtraBold"],
        "inter-black": ["Inter_900Black"],
      },
      borderRadius: {
        "2xl": 16,
        "3xl": 24,
        "4xl": 32,
      },
    },
  },
  plugins: [],
};
