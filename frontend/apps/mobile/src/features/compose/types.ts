// Split out of app/create-post.tsx (TR-013, point 9b).
import { Alert } from "react-native";
import { type FeedCategory } from "../../api/feed.api";

export type AttachedMedia = {
  uri: string;
  name: string;
  mediaType: "photo" | "video";
  duration?: number;
  mimeType?: string; // SPRINT-42: validate listing image type before upload.
  fileSize?: number; // SPRINT-42: enforce the 5 MiB listing image limit client-side.
};

export const SPRINT_42_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // SPRINT-42: mirror the backend per-image limit.
export const SPRINT_42_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]); // SPRINT-42: mirror accepted backend formats.
export const FEED_TO_NEWS_LABEL: Record<FeedCategory, string> = { COMMUNITY: "Community", ANNOUNCEMENT: "Announcement", JOBS: "Jobs", ALERT: "Alert", DISCUSSION: "Discussion", QUESTION: "Question", TIP: "Tip" }; // SPRINT-42: prefill the existing category selector from API enums.
