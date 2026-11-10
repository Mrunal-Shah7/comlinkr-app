# 2026-11-10: The last walkthrough findings: a steady bento, preferences from the list (TR-040: E-14, L-18)

Branch `fix/walk-leftovers`, from `fix/chat-keyboard`. Not merged.

## Problem

Two findings from the [walkthrough](../device-runs/2026-11-10-full-walkthrough.md) were still open after
[triage leftovers](2026-11-10-triage-leftovers.md):
- **E-14:** Explore's "Homes in …" card appeared a moment after the rest of the bento and pushed the stories and
  everything under them down.
- **L-18:** on Listings → Roommates, the roommate preferences could be edited only from the empty state, so someone
  with matches had to go through Profile.

The brand's spelling, the third item left in TR-040, was settled in TR-046.

## Cause

- **E-14:** the homes count and the next event come from the same hero request (`loadExploreEvents`). The bento's
  two-column row drew only what had arrived, so on the first load it was empty, then grew.

## Change

- **`ExploreBento.tsx`, `app/(tabs)/feed/index.tsx`:** while the hero loads (`heroLoading`, from
  `exploreEventsLoading`), empty tiles hold the next event's place (246 high) and the homes card's place (118). They
  are hidden from the screen reader. Once loaded, the row shows what exists, as before.
- **`app/(tabs)/housing/index.tsx`:** the roommate list's count line gets a "Your preferences" link on the right. It
  opens the same preferences sheet as the empty state.
- **`app/create-post.tsx`:** found while walking F-15. The post form read `mode` only when it mounted, so a link to
  review mode opened in owner mode after another composer had been open. The form is now keyed by type, mode and id,
  and a reused route gets a new form.

## How it was checked

- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`, in Los Angeles:
  - **Cold start**, with screenshots every 2 s:
    - the placeholders showed, then Homes and the hot question in their place;
    - the stories card stayed at the same height;
    - Los Angeles has no upcoming event, so Homes then spans the row.
  - **Listings → Roommates:**
    - "Your preferences" sits beside "12 people in Los Angeles …";
    - tapping it opened Roommate Preferences;
    - nothing was saved.
  - **TR-009, checked again** (a sheet stuck after a deep link): with the preferences sheet open, a deep link to
    Community showed Community with no sheet over it; back on Listings, the sheet was closed.
  - **The composer:**
    - before the fix, the news composer then a link to `create-post?type=restaurant&mode=review` opened "My
      restaurant" with "Add Restaurant";
    - after it, the same steps opened "A review" with "Submit Review".
- **The other loose ends walked** are in the [run log](../device-runs/2026-11-10-loose-ends.md).

## Not checked

- A city with an upcoming event: the left placeholder then becomes the event's tile, which is the same height.
- iOS.
