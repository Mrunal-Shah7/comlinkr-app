# 2026-11-10: Loose ends from the walkthrough, walked on the phone

OnePlus, Expo Go, local backend (4003, email off), as `uit_gps1`, with `uit_hannah5` acting through the API. The
fixes from the [full walkthrough](2026-11-10-full-walkthrough.md) that were not walked again, and flows never walked.

| Row | What | Result |
|---|---|---|
| S-04 | Deleting an event removes its photo from Cloudinary | No longer applies: since plan 15, "Cancel event" keeps the event and its photos |
| E-26 | The post editor says "Save changes" when editing | Pass. Published "Walk test pos…" from the app; Edit from its menu showed "Save changes" |
| E-27 | "View" after publishing opens the post's section | Pass. News › Neighbours was selected, with the new post first |
| F-15 | The review composer's title says "A review" | Pass after a fix. The title reads "A review". But after another composer was open, a link to review mode opened in owner mode: the form read `mode` only when it mounted. It is now keyed by type, mode and id ([build note](../build/2026-11-10-walk-leftovers.md)) |
| TR-009 | A sheet stays over another tab after a deep link | Pass. With roommate preferences open, a deep link to Community showed no sheet; back on Listings it was closed |
| Decline a message request | Hannah starts a chat; Decline on the phone | Pass. No confirm; Messages opened, empty. The member is `BLOCKED`, and the chat is gone from the list. Hannah can still send into it and nothing tells her (a silent decline, by design) |
| Block while following | Follows both ways, then Block from Hannah's profile | Pass. Both follows were deleted. Settings → Blocked people → Unblock (with a confirm) put it back to "No blocked users" |

## Not walked, and why

- **Door check-in:** it scans a ticket's QR code with the camera. e2e covers the server, including a cancelled event.
- **Badge submission, story comments, L-06** (the status bar after the story viewer): each needs a photo or video
  uploaded to Cloudinary, a real service.
- **403 gating after a real sign-up:** it needs a new account with an emailed code; the local backend logs the code.
  Left for a session that sets up a fresh test account.
- **The location dialogs:** they are the phone's own permission prompts. Expo Go keeps the permission granted in
  plan 08, so the first-time prompt cannot be shown without changing the phone's settings.

## Clean-up

- The test post, the two test chats, the follows, the block and the follow notices were deleted.
- No phone setting was changed.
