export const BRAND = {
  blue: "#0076EB",
  green: "#26B324",
  orange: "#FF7B00",
} as const;

export const GRADIENTS = {
  blueGreen: "linear-gradient(135deg, #0076EB, #26B324)",
  orangeRed: "linear-gradient(135deg, #FF7B00, #FF5722)",
  greenBlue: "linear-gradient(135deg, #26B324, #0076EB)",
} as const;

export type BrandColor = keyof typeof BRAND;