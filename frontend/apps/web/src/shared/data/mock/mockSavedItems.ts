import { SavedItem } from "../../lib/storage";

export const mockSavedItems: SavedItem[] = [
  {
    id: "s1",
    type: "food",
    title: "Green Fork",
    subtitle: "Healthy bowls · 0.6 mi",
    image: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=800&q=80",
    meta: "4.7 ★",
  },
  {
    id: "s2",
    type: "event",
    title: "Rooftop Sunset Mixer",
    subtitle: "Sat, Feb 10 · Chelsea",
    image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    meta: "32 going",
  },
  {
    id: "s3",
    type: "housing",
    title: "SoHo Studio Loft",
    subtitle: "$2,100 · 1 bed",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
    meta: "12 min walk",
  },
];
