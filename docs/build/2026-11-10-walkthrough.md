# 2026-11-10: fixes from the full walkthrough (TR-028, TR-024)

Branch `fix/walkthrough`, from `main` at `24c6878`. Merged as pull request 22 (commit `df3e344`, merge `38b5c39`).

## Problem

The owner asked for a walk through every feature of the four sections and the shared screens, from the UI, checking
the logic as well as the look, and fixing what was found, the API included. They also asked why Resend email did
not work locally. Every finding, with what was seen and what changed, is a row in
[the run log](../device-runs/2026-11-10-full-walkthrough.md). This note groups the changes by area and gives the cause of the
larger ones.

## Cause and change

**Uploads (E-07).** Since SDK 57 the global `fetch` is `expo/fetch`, which refuses React Native's
`{ uri, name, type }` FormData parts, so no upload in the app reached the API. `src/api/client.ts`
(`postFormData`) gives each such part a `bytes()` that reads the file with `expo-file-system`.

**Failed uploads leaving half-made content (E-21, E-22, E-30, L-08, L-09, S-04).** The API saved the row, then
uploaded the photos; a Cloudinary failure answered 500 but left the row. `storage.service.ts` checks files before
anything is written, removes a post and its uploaded photos when the upload fails, and answers 503 "Could not
upload your photos" with Cloudinary's reason logged. Deleting a post or an event now deletes its photos
(`feed.service.ts`, `events.service.ts`). Rooms, restaurants and events count as published when only their photos
failed, and say so.

**Resend (R-03, S-09).** The Resend SDK v6 returns `{ data, error }` instead of throwing, so `mail.service.ts`
never saw a refused email. The error is now logged, with the development OTP fallback. Locally, email only failed
because the documented setup empties `RESEND_API_KEY`; with the key, sign-up and reset emails are delivered.

**API gaps the app already called.**
- `GET /housing?pets=` (TR-024, L-01): `housing-query.dto.ts` takes `pets`; `housing.service.ts` matches the
  free-text `petPolicy`.
- `DELETE /community/questions/:id` and `DELETE /community/questions/:qid/answers/:aid` (C-04, C-05, C-13): author
  only; upvotes removed and the answer count lowered.
- `DELETE /challenges/:id` (S-03): author only.
- Withdraw an application (L-23): `property-applications.service.ts` allows it until the landlord approves
  (owner's decision) and notifies the landlord.
- Saved news (S-01): `saves.service.ts` lists news-article saves together with feed saves.
- News older than 30 days is dropped (`google-news-rss.util.ts`, E-16).

**Mobile, by area.**
- Explore: segmented labels (E-01), hot question (E-03), back after sign-in (E-04, `enterApp`), story composer
  (E-05, E-06, E-09), caches marked stale after publishing (E-08, E-11), news order (E-17), sheet above the
  keyboard (E-23, `SheetFrame.android.tsx`), relative times (E-24), "View" targets (E-29, L-10, F-07), quest days
  (E-35).
- Listings: room edit loads the description (L-12), own room (L-11), Cancel request calls `/cancel` (L-16),
  reapply opens your application (L-22), agreement ID and dividers (L-21), date picker `onValueChange` (L-24).
- Food: hours in both formats and city time zones (F-01, F-02, `src/utils/cityTimezone.ts`), My restaurants and
  Favourites read `data` (F-03), restaurant edit payload (F-04), sheets above the navigation bar (F-05), search
  (F-10), Nearby hidden (F-11), "Temporarily closed" override (F-13, owner's decision).
- Composer: "Discard your changes?" on leaving with something typed (F-14, owner's decision), required story label
  and default price (F-08, F-09).
- Community: block re-renders (C-03, also Feed), delete own question and answer (C-04, C-05), answer composer above
  the keyboard (C-06), saved-questions path (C-07), My posts counts (C-14).
- Shared: root layout waits for the stored session before routing (F-06); Saved news (S-01); My posts deletes
  (S-03); Follow hidden (S-06, TR-029); OTP boxes fit narrow phones (A-06, S-10); admin Users count hidden while
  loading (S-12); onboarding state search trimmed (A-07); the landlord dashboard says a badge is needed instead of
  "No applications yet" (S-14, TR-031); Favourites' empty state (S-16); the review composer's title (F-15) and the
  post editor's "Save changes" (E-26).

## Product changes decided in chat

L-23 (withdraw until the landlord approves), F-13 ("Temporarily closed") and F-14 (ask before discarding) change
what the product does. The owner decided each in chat during the walk; there is no `docs/plan/` file for them.

## Checked

- Backend: `npx tsc --noEmit` passes; unit tests 103 pass (new: `test/unit/walkthrough-fixes.spec.ts`, plus
  `property-applications.service.spec.ts`); e2e 47 pass against `comlinkr_test`.
- Backend lint: 27 errors, all already in the committed code (it has slightly more); this branch adds none.
- Mobile: `npx tsc --noEmit` passes.
- Walked on the OnePlus (Android 16, Expo Go) against the local backend, each fix with its way back (delete,
  cancel, unsave, withdraw, sign out). Not seen on the phone after the fix: S-04 (unit tested), S-12 while loading,
  E-26 and F-15.
- 60 rows of the run log are fixed bugs; Follow (S-06) is hidden, not fixed. Open findings are TR-029 to TR-040.
- Test data removed from the local database and Cloudinary; listed at the end of each section of the run log.
