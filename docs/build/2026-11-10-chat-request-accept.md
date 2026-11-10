# 2026-11-10: Accepting a message request (TR-043)

Branch `fix/chat-request-accept`, from `feature/follow`. Merged as pull request 35 (merge `7c0bf94`), reaching `main` with PR 24.

## Problem

From the phone walk of plan 09: after Accept on a message request, the chat kept the "New message request" banner
and a disabled composer until it was closed and reopened. The request was accepted on the server, and the
"Conversation request accepted." line appeared in the thread.

## Cause

`Thread` in `app/chat.tsx` decides `isPending` from the `row` prop. That row is a snapshot the screen takes when the
thread opens (`selectedRow`). Accept refreshes the inbox (`conversations`), but nothing copied the new status into
`selectedRow`, so the open thread kept reading "pending".

## Change

`app/chat.tsx`:
- **In the thread:** a successful Accept sets `acceptedHere`, so the banner goes and the composer is enabled at once.
  The flag resets when another conversation opens.
- **In the screen:** when the refreshed inbox has a different status for the open conversation, it is copied into
  `selectedRow`.

## How it was checked

- **Mobile:** `pnpm typecheck`.
- **Phone** (OnePlus, Expo Go, local backend), as `uit_gps1`:
  - `uit_diego4` started a chat through the local API and sent a message. The phone's account was `PENDING`.
  - The thread showed "New message request" with Accept and Decline.
  - Accept: the banner went at once, the composer became the normal "Message" field, and "Conversation request
    accepted." showed. The database had both members `ACCEPTED`.
  - A reply ("Thanks, accepted") was sent from the composer straight away and reached the server.
- The test conversation, its messages, members and notification were deleted.

## Found while walking

- **Not fixed (TR-045):** with the keyboard up on Android, the composer sits half under the keyboard. The thread
  lifts by the keyboard event's height, about 130 px short. Tried: `behavior="padding"` (no change), and Reanimated's
  `useAnimatedKeyboard` (the field ended fully covered). Both were reverted. It is the same on a chat that was never
  a request.

## Not checked

- **Decline.** It is unchanged.
- **The sender's side seeing the accept live.**
- **iOS.**
