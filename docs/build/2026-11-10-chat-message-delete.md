# 2026-11-10: Deleting your own chat message (TR-039, plan 09; TR-044)

Branch `feature/chat-delete`, from `fix/triage-leftovers`. Not merged.

## Problem

"Delete" on your own message only took it off your screen: the client's `deleteMessage` was a stub and the API had
no route, so the other person kept it and it came back on reopen ([plan 09](../plan/09-chat-message-delete.md)).
Open chats also ignored `message_removed`, so an admin's removal stayed on screen.

## Change

- **API:** `DELETE /conversations/:id/messages/:messageId` (`MessagingService.deleteOwnMessage`). A member who is
  not blocked, the sender only (403), a message of that conversation only (404); a second delete is 404.
- **Soft delete:** `Message.deletedAt`, migration `20261110140000_message_deleted_at`. Every member-facing read
  skips deleted rows: the thread, the three last-message previews, the five unread counts, reporting. The admin
  transcript keeps them and returns `deletedAt`, so Ban from chat on a report still finds the message. The admin's
  hard Remove now recomputes `lastMessageAt` from undeleted messages too.
- **Live:** `message_removed` to the conversation room; `conversation_updated` with `removed: true`, the new
  preview and each member's unread count to every accepted member.
- **App (`app/chat.tsx`, `src/api/chat.api.ts`):** long-press on your own text, photo or voice message (sent ones)
  asks "Delete message?", calls the API, and removes the message only on success ("Could not delete" otherwise).
  Open chats drop a message on `message_removed`; the list reloads on `removed: true`.
- **TR-044 (found on the walk):** a message arriving live was drawn as your own, because `normalizeGatewayMessage`
  kept the broadcast's `isOwn`, formatted for the sender. It is now decided from the sender's id.

## How it was checked

- Backend: `tsc`, lint of the messaging files, unit 115, e2e 51, including four new tests
  (`test/design-d/chat-message-delete.e2e-spec.ts`): delete and its effect on thread, preview, unread and
  `lastMessageAt`; 403 for the other member and an outsider; 404 across conversations and twice; the admin
  transcript; both socket events. The migration was applied locally and to `comlinkr_test`; the column was checked.
- Mobile: `pnpm typecheck`.
- Phone (OnePlus, Expo Go, local backend), signed in as a test account; the other side was a second test account
  driven through the local API with a one-hour local session (written to the local Redis as the e2e helper does):
  - long-press on the other person's message: nothing opens;
  - own message: dialog, Delete; with the old backend still running the API answered 404 and the app showed
    "Could not delete" and kept the message; after the rebuild it disappeared, the row has `deletedAt`, and
    `lastMessageAt` fell back;
  - the other person sends (drawn on their side after the TR-044 fix) and deletes while the chat is open: gone live;
  - the same while the phone shows the list: the preview and unread count fall back.
- The test conversation and its notifications were deleted afterwards.

Not checked: deleting a photo or voice message on the phone (no test media sent), iOS.

Found, not fixed: TR-043 (request banner stays after Accept until the chat is reopened).
