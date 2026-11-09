// src/features/housing/galleryStore.ts — hands a set of photos to the full-screen gallery route (app/gallery.tsx,
// TR-017). The photos are in memory on the screen that opens it (a listing, a restaurant, a card), so they are
// passed here instead of in the URL.
import { router } from "expo-router";

let current: { images: string[]; startIndex: number } | null = null;

/** Opens the full-screen gallery at `startIndex`. */
export function openGallery(images: string[], startIndex = 0) {
  const list = images.filter(Boolean);
  if (list.length === 0) return;
  current = { images: list, startIndex: Math.min(Math.max(0, startIndex), list.length - 1) };
  router.push("/gallery");
}

/** What the gallery route shows; null when it was opened without photos (a cold link). */
export function peekGallery() {
  return current;
}
