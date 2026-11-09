# Handover

_Where the work stopped and how to pick it up. Newest first; the next session reads the top entry before anything
else. Keep old entries short: what was done and where it is written._

Older entries are in [handover-archive.md](handover-archive.md).

## In progress

_One line per open branch: branch, task, what is left. Removed when the branch merges._

(none)

## 2026-11-09 - docs checks and tooling rules (TR-025, PR 21)

- Merged into `main` as PR 21.
- `CLAUDE.md`: Tools (MCPier `android` for the phone, adb fallback, Claude in Chrome for PRs since `gh` is not
  installed), After a merge, "In progress" in this file, "Slowed down by:" on every entry, removing stale rules,
  and Checks on the docs ([build note](build/2026-11-09-docs-tooling.md)).
- `scripts/check-docs.mjs`, run by hooks at session start and before `git push`. Its first run found five merged
  tasks still marked built and three build notes without their PR; all fixed.
- Older handover entries moved to [handover-archive.md](handover-archive.md).
- Slowed down by: finding how earlier PRs were opened (`gh` missing, searched the old session log); now in Tools.

## 2026-11-09 - back history (TR-023, PR 20)

- Merged into `main` as PR 20 (`0ec3a44`): tab history and in-screen undo on Android Back
  ([build note](build/2026-11-09-back-history.md)).
- Edge swipe not confirmed: injected swipes (adb and scrcpy) do not trigger the system gesture. Try it by hand.
- Not walked: admin screens, chat, events, help, landlord dashboard, my posts, my listings, notifications, check-in.
- Found: TR-024, the Listings Pets filter returns 400.
- Phone back on three-button navigation. Backend and Metro still running at the time of writing.

## 2026-11-09 (earlier) - the three open Expo-skill points (TR-017)

- All three merged into `main`:
  - PR 16, point 4: the news article as a route with `GET /news/articles/:id`
    ([build note](build/2026-11-09-news-article-route.md)).
  - PR 17, point 2: sheets moved to `DSheet`, which now sizes itself on Android; the post preview and the photo
    gallery are modal routes ([build note](build/2026-11-09-native-sheets.md)).
  - PR 18, point 1: palette colours follow dark mode through a fallback in `createThemedStyles`, 15 stylesheets moved
    onto it (colour only) and `usePaletteColor()` ([build note](build/2026-11-09-dark-mode-palette.md)).
- Logged for later: TR-018 (editing a room overwrites its description), TR-019 (ten files still render `Modal`),
  TR-020 (first tap after a sheet closes is lost).
- Not walked: iOS for all three; the login, sign-up and forgot-password screens in dark mode (the `ui_tester`
  password is not in the repository); pinch zoom in the gallery.
- `ui_tester` is USER and in light mode. Metro and the backend stopped at the end.

## 2026-11-09 (earlier) - admin reports filter and Data privacy crash (TR-015)

- `fix/admin-reports-privacy`: `/admin/reports` accepts `status` (default PENDING); `/admin/privacy-requests`
  filters by `status` / `type`; the Data privacy screen uses the API's snapshot fields and real enums.
  [Build note](build/2026-11-09-admin-reports-privacy.md).
- E2e `sprint54/stories-listing-reason` was out of date against SEC-04; updated on `chore/e2e-listing-visibility`
  (TR-016, [build note](build/2026-11-09-e2e-listing-visibility.md)). The backend e2e suite now passes 45/45.
- `ui_tester` back to USER; servers stopped.

## 2026-11-09 (earlier) - React Query on the rest, keyboard taps (TR-014)

- PRs 7-12 (TR-013) merged into `main`. Then `chore/react-query-rest`: the 22 admin pages, edit profile, Settings,
  event, story and one-off loads on React Query; the last four keyboard-tap screens.
  [Build note](build/2026-11-09-react-query-rest.md).
- Follow-ups found (older bugs): admin dashboard sends `status` to `/admin/reports` (400); admin Data privacy crashes
  on `req.user.username` (backend sends `snapshotUsername`).
- Still partial from the audit: iOS previews only on some cards, the news article modal, palette colours not
  dark-aware.
- `ui_tester` set back to USER. Servers stopped at the end.

## 2026-11-09 (earlier) - the nine Expo conventions (TR-013)

- All nine points done, one stacked pull request per group, each on the one before:
  `chore/expo-conventions` (keyboard taps, window size, `EXPO_OS`, onboarding dots, axios dropped) →
  `chore/react-query` → `chore/split-compose` → `chore/detail-routes` ([plan 03](plan/03-detail-routes.md)) →
  `chore/ios-conventions` → `chore/color-tokens`. Build notes dated 2026-11-09 in `build/`, run logs in `device-runs/`.
- Merge them in order; each later PR shows only its own commits once the one below is merged.
- **Not checked on iOS** (no iPhone here): the link previews and context menus (`DetailLink`), continuous corners,
  the iOS edge swipe on the detail routes. Walk them on an iPhone before a release.
- Not checked on Android: shared space detail (none in the seed), roommate connect / accept, review and reservation
  end to end, every admin screen after the colour codemod.
- Follow-ups: move screens from `palette` onto the dark-mode-aware theme (`tc`) one screen at a time; the news
  article stays a modal until there is an article by-id endpoint.
- Servers: Metro and the backend stopped at the end. Test saves made in the walks removed; dark mode switched back
  off for `ui_tester`.
