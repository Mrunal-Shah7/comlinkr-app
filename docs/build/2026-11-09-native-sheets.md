# 2026-11-09: React Native modals to the native sheet (TR-017, point 2)

Branch `chore/native-sheets`, from `main` after pull request 16.

## Problem

The expo-ui skill asks for `@expo/ui`'s native bottom sheet wherever a sheet is needed. The TR-017 audit counted
15 files importing React Native's `Modal` for sheets. Walking `DSheet` (the app's wrapper around the native sheet) on
the phone also showed that it never sized itself to its content on Android. This was already the case on `main`:

- A content-sized sheet opened half-way. The filter sheet's "Clear all / Show results" sat under the navigation bar,
  and the Post sheet's last items ("A quest", "A question") could not be reached without dragging the sheet up.
- Dragged up, every content-sized sheet showed a blank band below its content. The two-row media picker filled the
  screen.

## Cause

In Expo Go (SDK 57) on Android, Material's `ModalBottomSheet` always takes the full screen height. Measured with
`onLayout` on the filter sheet: the React Native content was 435 dp, the native host stayed at 676 to 712 dp. Three
attempts to size the native sheet did not move it:

- `matchContents` on one axis or both;
- a fixed `height()` on the host (the sheet shrank but stayed pinned to the top);
- the `@expo/ui` community bottom sheet, used as a control.

The universal `BottomSheet` also leaves Material's half-open state on for content-sized sheets. So a "full-height"
sheet rested at half the screen.

## Change

**`DSheet` on Android** (`src/shared/d/SheetFrame.android.tsx`, new):
- Builds on Compose's `ModalBottomSheet` with `skipPartiallyExpanded`, kept full height and transparent.
- Draws the visible card (rounded top, handle, content) in React Native at the bottom of that sheet. Tapping the space
  above the card closes it. Material still gives the scrim, drag to dismiss and Back.
- On the keyboard: the native sheet gives up the keyboard's height itself, so the card has `flexShrink` and no
  keyboard arithmetic.
- The card already ends above the navigation bar, so `DSheet` no longer adds the bottom inset on Android.

**`DSheet` on iOS** (`src/shared/d/SheetFrame.tsx`): the same universal `BottomSheet` as before. Its `Host` moved into
this file, and the content width is now a number instead of `'100%'`. Not walked on iOS.

**Converted to `DSheet`:**
- the four admin detail sheets (Community, Feed, Roommates, Stories), which keep their last item while the sheet
  slides away (`src/hooks/useLastNonNull.ts`);
- the post report sheet (`PostCard.tsx`);
- report listing; edit shared space (full height);
- the Listings filters (TR-009: the filter is now the native sheet) and roommate preferences (full height);
- the feed's post comments (full height);
- the compose media picker. It closes first, then opens the library or camera after 250 ms.
- `ListYourSpaceModal`, which nothing opens (`showListModal` is never set to true). It was converted but is dead code.
- The report listing form's `ScrollView` had `flex: 1` inside a content-sized parent and collapsed to nothing. It now
  shrinks with the sheet and scrolls to the details field when that field is focused.
- Unused `Modal` imports removed from `GuestCityBanner.tsx` and `foodShared.tsx`.

**Kept as React Native `Modal` on purpose:**
- `PreviewModal`: a full-screen draft preview, not a sheet.
- `ImageViewer`: full screen, and it pinch-zooms with gesture-handler, which does not run inside the native sheet.

**Missed by the audit (TR-019):** ten more files render `Modal`, with imports split over several lines, so the
first count missed them:
- `app/edit-profile.tsx`, `app/restaurant/[id].tsx`, `app/settings.tsx`, `app/story-viewer.tsx`;
- the admin `AllPostsScreen`, `SupportRequestsScreen`, `UserManagementScreen` (four) and `VerificationsScreen`;
- `src/shared/ui/Dialogs.tsx` (four);
- `components/OAuthUsernamePickerModal.tsx`.

They are not in this pull request.

## Checked

- `pnpm typecheck` passes.
- Walked on the OnePlus (Android 16, Expo Go) against the local backend as `ui_tester`:
  - **Listings filters:** opens sized to its content with the footer visible. With the keyboard up, Min price sits
    above it. "Show results" filtered the list; "Clear all" reset it. Tap outside, drag down and Back all close it.
  - **Post sheet:** 88% of the screen; the list scrolls to its last item.
  - **News comments** (`DSheet` from pull request 16): sized to content; the input sits above the keyboard.
  - **Edit shared space** (full height), on a test room inserted for the walk: the header and Save stay visible with
    the keyboard up. Save sent `PATCH /shared-spaces/:id` 200, and the database read 1250. The room was then deleted
    from the app (confirm dialog), and the database row count is 0.
  - **Report listing:** the form shows and scrolls. With the keyboard up, the details field and the header are
    visible. Cancel closed it, and no `ListingReport` row was written.
  - **Media picker:** sized to its rows. "Photo Library" opened the system photo picker after the sheet closed; Back
    returned to the form with nothing attached.
  - **Admin sheets**, with `ui_tester` raised to ADMIN and set back to USER afterwards: the Feed, Community and
    Roommates detail sheets open and close (✕, Back). The content stays in place while the sheet slides away.
- **Not walked:**
  - Stories moderation: no stories in the local database.
  - Roommate preferences: opens only from the "no matches" empty state.
  - The post report sheet and the feed's post comments: the Explore feed showed only news cards on this walk.
  - List your space: nothing opens it.
  - iOS.

## Found on the way

- TR-018: Edit shared space puts the room's title into Description and saves it over the real description
  (`roommateModel.ts:474` maps `apartmentDesc` from `title`).
- TR-020: the first tap right after a sheet closes often does nothing. It happens on `main`'s `DSheet` too.
