// src/utils/shareLinks.ts
// Builds shareable https:// links for content shared out of the app (WhatsApp, SMS, etc).
// These use the www.comlinkr.com domain configured as an iOS Associated Domain / Android App
// Link (see app.config.js `associatedDomains` / `intentFilters`), so tapping the link on a
// device with ComLinkr installed opens the app directly to that item. On a device without it,
// www.comlinkr.com proxies /app/* to the API, which renders a web fallback page.
//
// www, not the apex: comlinkr.com 307-redirects every path including /.well-known/*, and
// Apple does not follow redirects when fetching the AASA file, so the apex cannot verify.
// The /app prefix must stay in step with the AASA `paths` and the Android `pathPrefix`.

export type ShareContentType = "listing" | "restaurant" | "post" | "event" | "story" | "question" | "quest";

const TAB_FOR_TYPE: Record<ShareContentType, string> = {
  listing: "housing",
  restaurant: "food",
  post: "feed",
  event: "feed",
  quest: "feed",
  story: "feed",
  question: "community",
};

const PARAM_FOR_TYPE: Record<ShareContentType, string> = {
  listing: "openListing",
  restaurant: "openRestaurant",
  post: "openPost",
  event: "openEvent",
  quest: "openQuest",
  story: "openStory",
  question: "openQuestion",
};

function webBase(): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL || process.env.EXPO_PUBLIC_APP_URL;
  return (configured ? String(configured) : "https://www.comlinkr.com").replace(/\/$/, "");
}

/**
 * Builds a shareable universal link for a piece of content, e.g.
 * https://www.comlinkr.com/app/housing/abc123
 * Opens the matching tab and auto-opens that item's detail view on tap.
 */
// export function getShareLink(type: ShareContentType, id: string): string {
//   const tab = TAB_FOR_TYPE[type];
//   const param = PARAM_FOR_TYPE[type];
//   return `${webBase()}/${tab}?${param}=${encodeURIComponent(id)}`;
// }


// New:
export function getShareLink(type: ShareContentType, id: string): string {
  const base = webBase();

  if (type === "listing") {
    return `${base}/app/housing/${encodeURIComponent(id)}`;
  }

  const tab = TAB_FOR_TYPE[type];
  const param = PARAM_FOR_TYPE[type];
  return `${base}/app/${tab}?${param}=${encodeURIComponent(id)}`;
}