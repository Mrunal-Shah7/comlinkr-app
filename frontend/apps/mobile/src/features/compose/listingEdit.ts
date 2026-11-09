// Split out of app/create-post.tsx (TR-013, point 9b).
import { type UpdateListingPayload } from "../../api/housing.api";
import { File } from "expo-file-system";
import { parseFlexibleDateToIsoDate } from "./mappers";
import { SPRINT_42_IMAGE_MIMES, SPRINT_42_MAX_IMAGE_BYTES } from "./types";

export function propertyTypeToLabel(value: string): string { // SPRINT-42: prefill listing property type chips.
  return value === "HOUSE" ? "House" : value === "STUDIO" ? "Studio" : value === "ROOM" ? "Room" : "Apartment"; // SPRINT-42: map canonical backend enum to UI label.
} // SPRINT-42: end property type mapping.

export function normalizeAvailableDateValue(value: unknown): string | undefined { // SPRINT-42: compare and PATCH availability as YYYY-MM-DD only.
  if (value == null || value === "") return undefined; // SPRINT-42: treat null/empty as unset.
  const raw = String(value).trim(); // SPRINT-42: accept ISO timestamps or date-only strings.
  if (!raw) return undefined; // SPRINT-42: blank after trim is unset.
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/); // SPRINT-42: strip time portion from API ISO strings.
  if (isoPrefix) return isoPrefix[1]; // SPRINT-42: keep the calendar date only.
  return parseFlexibleDateToIsoDate(raw) || undefined; // SPRINT-42: parse flexible UI date strings consistently.
} // SPRINT-42: end available-date normalizer.

export function normalizeListingCompareValue(value: unknown): unknown { // SPRINT-42: make null/undefined/empty optional fields compare equal.
  if (value === null || value === undefined) return undefined; // SPRINT-42: collapse nullish empties.
  if (typeof value === "string" && value.trim() === "") return undefined; // SPRINT-42: collapse blank strings.
  if (Array.isArray(value) && value.length === 0) return undefined; // SPRINT-42: collapse empty arrays.
  return value; // SPRINT-42: keep concrete values.
} // SPRINT-42: end listing compare normalizer.

export function listingFieldsEqual(a: unknown, b: unknown): boolean { // SPRINT-42: dirty-check with normalized empties.
  return JSON.stringify(normalizeListingCompareValue(a)) === JSON.stringify(normalizeListingCompareValue(b)); // SPRINT-42: structural compare after normalization.
} // SPRINT-42: end listing field equality helper.

export function buildDirtyListingPayload(current: UpdateListingPayload, original: Record<string, unknown>): UpdateListingPayload { // SPRINT-42: emit only real changes with JSON-safe values.
  const dirty: Record<string, unknown> = {}; // SPRINT-42: accumulate present dirty keys only.
  for (const [key, value] of Object.entries(current)) { // SPRINT-42: walk every normalized current field.
    const prior = original[key]; // SPRINT-42: read the loaded baseline value.
    if (listingFieldsEqual(value, prior)) continue; // SPRINT-42: skip untouched fields including null vs undefined empties.
    if (value !== undefined && value !== null) { // SPRINT-42: keep concrete dirty values.
      dirty[key] = value; // SPRINT-42: include the changed field.
      continue; // SPRINT-42: next field.
    } // SPRINT-42: finish concrete dirty branch.
    if (typeof prior === "string" || (typeof normalizeListingCompareValue(prior) === "string")) { // SPRINT-42: clear prior string fields with an empty string the DTO accepts.
      dirty[key] = ""; // SPRINT-42: send an explicit clear rather than an omitted key.
    } else if (Array.isArray(prior)) { // SPRINT-42: clear prior array fields with an empty array.
      dirty[key] = []; // SPRINT-42: send an explicit empty amenities/tags clear.
    } // SPRINT-42: numeric clears are omitted because PartialType ignores undefined.
  } // SPRINT-42: finish dirty walk.
  return dirty as UpdateListingPayload; // SPRINT-42: return a body safe for JSON.stringify.
} // SPRINT-42: end dirty listing payload builder.

export async function resolveListingImageByteSize(asset: { uri: string; fileSize?: number | null }): Promise<number | null> { // SPRINT-42: never assume zero when picker size is missing.
  if (typeof asset.fileSize === "number" && Number.isFinite(asset.fileSize) && asset.fileSize > 0) { // SPRINT-42: trust a positive picker-reported size.
    return asset.fileSize; // SPRINT-42: use the picker size.
  } // SPRINT-42: finish picker-size branch.
  try { // SPRINT-42: fall back to expo-file-system File metadata.
    const file = new File(asset.uri); // SPRINT-42: open the local picked URI.
    if (!file.exists) return null; // SPRINT-42: cannot measure a missing file safely.
    const size = file.size; // SPRINT-42: read bytes; 0 means unread/unreadable per expo-file-system.
    if (!size || size <= 0) return null; // SPRINT-42: surface inability instead of treating unread as zero.
    return size; // SPRINT-42: return measured bytes.
  } catch { // SPRINT-42: treat filesystem failures as undetermined.
    return null; // SPRINT-42: caller must reject undetermined size.
  } // SPRINT-42: finish filesystem size lookup.
} // SPRINT-42: end image byte-size resolver.

export async function sprint42ImageError(asset: { uri: string; mimeType?: string | null; fileSize?: number | null }): Promise<string | null> { // SPRINT-42: validate selected listing media before multipart upload.
  const mime = asset.mimeType?.toLowerCase() || mimeForListingImage(asset.uri); // SPRINT-42: infer a MIME only when the picker omits it.
  if (!SPRINT_42_IMAGE_MIMES.has(mime)) return "Only JPEG, PNG, and WebP images are supported."; // SPRINT-42: reject unsupported image formats.
  const bytes = await resolveListingImageByteSize(asset); // SPRINT-42: require a real measured size before upload.
  if (bytes == null) return "Could not determine this image’s size. Please choose another photo."; // SPRINT-42: do not assume zero when size is unknown.
  if (bytes > SPRINT_42_MAX_IMAGE_BYTES) return "Each image must be 5 MiB or smaller."; // SPRINT-42: reject oversized images before network work.
  return null; // SPRINT-42: accept a valid image.
} // SPRINT-42: end listing image validation.

// Listing photo tile that drags sideways to reorder. Gesture Handler + Reanimated keep the drag on the UI thread;
// the drop is turned into a move once, on release. A tile is about 98 points wide with its gap.
export function mimeForListingImage(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}
