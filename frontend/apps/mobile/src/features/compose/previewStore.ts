// src/features/compose/previewStore.ts — hands the unsaved draft to the preview route (app/compose-preview.tsx,
// TR-017). The draft lives in PostForm's state, so it is passed here instead of in the URL.
import { router } from "expo-router";
import type { PostPreviewProps } from "./PostPreview";

let current: PostPreviewProps | null = null;

/** Opens the preview of the draft as it is now. */
export function openPreview(draft: PostPreviewProps) {
  current = draft;
  router.push("/compose-preview");
}

/** The draft the preview route shows; null when it was opened without one (a cold link). */
export function peekPreview() {
  return current;
}
