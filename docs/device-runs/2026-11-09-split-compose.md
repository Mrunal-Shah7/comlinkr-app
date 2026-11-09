# 2026-11-09: compose split (TR-013, point 9b)

Build: Expo Go on the OnePlus (Android 16), `chore/split-compose` at `ad1e0c8`, Metro with
`EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api`, local backend with `RESEND_API_KEY=` empty, `ui_tester`.

| ID | Result | Note |
|---|---|---|
| P-01 | pass | `create-post?type=news` opens "News for neighbours"; Preview renders the draft |
| P-02 | pass | Publish: `POST /api/feed` 201, "Post Published!" dialog |
| P-03 | pass | My posts shows the post (All · 1, News · 1) |
| P-04 | pass | Delete, then Undo within the toast: the post comes back and no `DELETE` is sent |
| P-05 | pass | Delete without Undo: `DELETE /api/feed/:id` 200 after the toast, empty state, no posts left in the database |
| P-06 | pass | `create-post?type=listing` opens the photo step ("1 of 7") |
| P-07 | not checked | Event, restaurant, story, challenge forms end to end; media upload; iOS |

A first Undo attempt failed because the tap landed after the toast had gone (screenshot delay); repeated with a
direct tap and it passed.

Put back: both test posts deleted.
