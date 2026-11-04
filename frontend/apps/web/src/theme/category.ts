import { BRAND } from "./brand";

export const CATEGORY = {
  news: { color: BRAND.blue, bg: "bg-blue-500", text: "text-blue-500", bgLight: "bg-blue-50" },
  events: { color: BRAND.orange, bg: "bg-orange-500", text: "text-orange-500", bgLight: "bg-orange-50" },
  food: { color: BRAND.green, bg: "bg-green-500", text: "text-green-500", bgLight: "bg-green-50" },
  housing: { color: BRAND.blue, bg: "bg-blue-500", text: "text-blue-500", bgLight: "bg-blue-50" },
  community: { color: "#111827", bg: "bg-gray-900", text: "text-gray-900", bgLight: "bg-gray-50" },
  chat: { color: "#374151", bg: "bg-gray-700", text: "text-gray-700", bgLight: "bg-gray-50" },
} as const;

export type CategoryType = keyof typeof CATEGORY;