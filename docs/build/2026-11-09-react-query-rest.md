# 2026-11-09: the rest of React Query, and the last keyboard taps (TR-014)

Branch `chore/react-query-rest`, from `main` after pull request 12. Run log:
[device-runs/2026-11-09-react-query-rest.md](../device-runs/2026-11-09-react-query-rest.md).

## Problem

After TR-013 an audit of every screen found two conventions still partly open:

- Four scrollers with text fields had no `keyboardShouldPersistTaps`, so the first tap with the keyboard open only
  closed it: the Food tab, the admin `FilterBar`, the admin All posts screen (three scrollers) and the story composer.
- React Query was not used by the 22 admin pages (all fed by `useAdmin.ts` and `useAdminListState.ts`), edit
  profile, the Settings blocked list, the event check-in gate, the event detail and its reviews, the story viewer,
  restaurant reviews, and a handful of one-off loads (feed links and comments, chat link and group info, community
  question link, compose edit load).

## Change

**Keyboard:** `keyboardShouldPersistTaps="handled"` on the six scrollers above.

**Admin** (`src/features/admin/`), no page changed:

- `api/adminQuery.ts` (new): `adminQueryFn` runs an admin fetch and rethrows as `AdminQueryError` with the message
  the screens show and the HTTP status (so the client's no-retry-on-4xx rule applies). A 403 still leaves the
  admin area, as before.
- `api/useAdminListState.ts`: `useInfiniteQuery` keyed `['admin', key, params]`; a filter change is a new key, page
  1. `loadMore` follows `meta.page < meta.totalPages`, the screen refetches stale data on focus. Same return shape.
- `hooks/useAdmin.ts`: `useAsyncData` is `useQuery` keyed `['admin', name, ...deps]`; every hook passes its own
  name, and lists scoped to an id carry it in the key (user warnings, ban history, conversation messages). Every
  admin mutation invalidates `['admin']`, so lists refresh after an action.

**User screens:**

| Screen | Now |
|---|---|
| Edit profile | `useQuery(['me','fullProfile'])`, fresh on every visit; the form is filled once from the first answer |
| Settings, blocked users | `useQuery(['settings','blocked'])`, only while the sheet is open |
| Event check-in | organiser check through `useQuery([...event(id),'check-in'])`, fresh each visit |
| Event detail (`EventDetail`) | detail and organiser attendees through `useQuery` under `queryKeys.event(id)` |
| Event reviews | pages and the detail refresh through `queryClient.fetchQuery`, then invalidate the event |
| Story viewer | story detail and like status through `useQuery`, per story, fresh |
| Restaurant reviews | `useQuery(['food','reviews',id])` |
| Feed (stats, comments, story links, comment post), chat (link, group info), community question link, compose edit load | through the cache with `fetchQuery` / `useQuery` |

What still fetches outside React Query on purpose: writes (mutations stay as calls with optimistic state), timers
and polls that already own their schedule, and the sidebar store.

## Found, not fixed (older than this change)

- `GET /admin/reports?status=PENDING` answers 400: the admin dashboard sends `status`, which
  `AdminReportsQueryDto` does not declare (whitelist validation rejects it).
- The admin Data privacy screen crashes on open: `DataPrivacyScreen.tsx:249` reads `req.user.username`, but the
  backend's `getPrivacyRequests` returns `snapshotUsername` / `snapshotEmail` and no `user`.

## Checked

- `pnpm typecheck` (mobile) passes.
- Walked on the OnePlus against the local backend as `ui_tester` (role raised to ADMIN for the walk, set back to
  USER after): every admin list and detail screen except Data privacy loads through the new hooks (200/304 in the
  backend log), audit log, chat moderation and analytics included; edit profile fills the form; an event detail
  loads detail and reviews; Settings and Food load. Run log has the requests.
- Not checked: the Food search tap with the keyboard open (the prop is the same one used on the other forms), the
  story viewer, iOS.
