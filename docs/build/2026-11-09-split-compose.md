# 2026-11-09: compose screen split into a feature folder (TR-013, point 9b)

Branch `chore/split-compose`, stacked on `chore/react-query`. Run log:
[device-runs/2026-11-09-split-compose.md](../device-runs/2026-11-09-split-compose.md).

## Problem

`app/create-post.tsx` was one file of about 5,000 lines: the type picker, every form (news, listing, shared space,
restaurant, event, story, challenge), the preview, the media picker, listing-edit helpers and 500 lines of styles.
The Expo Router convention is that `app/` holds routes only; components and helpers live outside it.

## Change

No behaviour change. The route keeps the screen component (94 lines); everything else moved, unchanged, to
`src/features/compose/`:

| File | Holds |
|---|---|
| `PostForm.tsx` | the form for every post type (2,800 lines; still large, split by type is a later step) |
| `PreviewModal.tsx` | the preview |
| `MediaPickerSheet.tsx` | the photo / video source sheet and `SectionLabel` |
| `ChipSelect.tsx`, `ImageThumbnailStrip.tsx`, `AttachedFile.tsx`, `DraggableListingImage.tsx` | form pieces |
| `postTypes.ts`, `types.ts`, `constants.ts` | the type list, shared types, grid sizes |
| `mappers.ts`, `listingEdit.ts` | API payload mapping and listing-edit dirty checks |
| `styles.ts` | the shared stylesheet |

The move was done by a script (declarations cut at top-level boundaries, imports recomputed per file), so no line of
logic was retyped.

## Commit

`ad1e0c8`.

## How it was checked

`pnpm typecheck`. On the phone against the local backend: news composer, preview, publish (`POST /api/feed` 201),
the post in My posts, delete + Undo (restored, no request), delete for real (`DELETE /api/feed/:id` 200, database
count 0), listing composer opens. Not checked: the event, restaurant, story and challenge forms end to end, media
upload, iOS.
