// ComLinkr brand colors — matches web app
export const Colors = {
  brand: {
    blue: "#0076EB",
    blueDark: "#0062CC",
    blueLight: "#E6F4FE",
    green: "#26B324",
    greenDark: "#1a8a18",
    greenLight: "#EAFBE9",
    orange: "#FF7B00",
    orangeLight: "#FFF3E6",
  },
  text: {
    primary: "#111827",
    secondary: "#6B7280",
    tertiary: "#9CA3AF",
    inverse: "#FFFFFF",
    link: "#0076EB",
    error: "#EF4444",
  },
  bg: {
    primary: "#FFFFFF",
    secondary: "#F9FAFB",
    tertiary: "#F3F4F6",
    overlay: "rgba(0,0,0,0.5)",
  },
  border: {
    light: "#E5E7EB",
    medium: "#D1D5DB",
    focus: "#0076EB",
  },
  gradient: {
    blueGreen: ["#0076EB", "#26B324"] as const,
    blueDeep: ["#0062CC", "#0076EB"] as const,
    greenFresh: ["#1a8a18", "#26B324"] as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;
