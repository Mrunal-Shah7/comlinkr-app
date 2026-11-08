// ComLinkr brand colors — design D (plan 01): the app's blue→green gradient replaces the old bright blue and
// green. Names are kept so every screen that reads Colors.brand.* picks up the new palette.
export const Colors = {
  brand: {
    blue: "#1A6BAE",
    blueDark: "#155A93",
    blueLight: "#E3EDF6",
    green: "#30855B",
    greenDark: "#256B49",
    greenLight: "#E3F1EA",
    // The old orange becomes the gradient's middle teal (design D has no orange).
    orange: "#257A86",
    orangeLight: "#E2F0F1",
  },
  text: {
    primary: "#0F1A21",
    secondary: "#4F6470",
    tertiary: "#8A9DA8",
    inverse: "#FFFFFF",
    link: "#1A6BAE",
    error: "#EF4444",
  },
  bg: {
    primary: "#FFFFFF",
    secondary: "#F2F6F8",
    tertiary: "#E7EFF2",
    overlay: "rgba(0,0,0,0.42)",
  },
  border: {
    light: "#E1E9ED",
    medium: "#CFDBE1",
    focus: "#1A6BAE",
  },
  gradient: {
    blueGreen: ["#1A6BAE", "#30855B"] as const,
    blueDeep: ["#155A93", "#1A6BAE"] as const,
    greenFresh: ["#256B49", "#30855B"] as const,
    // The full band sampled from the app: blue → teal → green.
    brand: ["#1A6BAE", "#257A86", "#30855B"] as const,
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
