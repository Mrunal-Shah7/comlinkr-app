# 09. Deleting your own chat message

**Status: Built (2026-11-10) on `feature/chat-delete`, not merged.** Triage [TR-039](../triage.md), from the walkthrough
(S-05). The owner asked for every open triage row to be done and for plans to be built straight away; they review in
the pull request.

## Problem

Long-pressing your own text message offers "Delete", but it only drops the message from the screen. The API has no
delete call (the client's `deleteMessage` is a stub that rejects), so the message is still there for the other person
and comes back for you when the chat reopens. Voice and photo messages offer nothing.

The admin side already hard-deletes a reported message (`adminRemoveMessage`) and emits `message_removed` to the
conversation room, but the app never listens for that event, so an open chat keeps showing a removed message.

## What will change

- **API:** `DELETE /conversations/:id/messages/:messageId`. Only the sender may delete (403 otherwise), only a member
  of that conversation (403), and only a message of that conversation (404, so ids from another chat reveal nothing).
  Deleting twice answers 404.
- **Soft delete:** `Message.deletedAt` (migration). A deleted message disappears for the people in the chat: the
  thread, the list preview, unread counts, and reporting skip it. `Conversation.lastMessageAt` is recomputed from the
  newest message still shown.
- **Live:** the server emits `message_removed` to the conversation room and `conversation_updated` (with
  `removed: true` and the new preview) to each member's personal room.
- **App:** long-press on any of your own messages (text, photo, voice) offers Delete; it asks the API first and takes
  the message away only when the API agrees, otherwise it shows why. Open chats remove a message on
  `message_removed` (also fixing admin removals), and the chat list reloads on `removed: true`.

## Why soft, not hard

A reported message is read live by the admin side: Ban from chat looks up the reported message to find its sender, and
the transcript view shows it. If the sender could hard-delete it, they could send abuse, wait for the report, and
delete it; the ban would then fail with "Reported message not found". So the sender's delete hides the message from
the chat but keeps the row: admins still see it in the transcript, marked as deleted by the sender, and can act on the
report. The admin's own Remove stays a hard delete, as before.

## What will not change

- No "Message deleted" placeholder in the chat: the message is simply gone, as with an admin removal.
- No time limit, no editing, no "delete for me only".
- A deleted photo or voice file stays in storage while the row exists (moderation evidence); the admin's Remove
  deletes it.
- Push notifications already delivered stay on the other phone.

## How it will be checked

e2e: the sender deletes (200, gone from `GET :id/messages`, `lastMessageAt` moves back); the other member gets 403; a
message id under another conversation gets 404; a second delete gets 404; the admin transcript still shows it with
`deletedAt`. On the phone: delete your own text message, reopen the chat (still gone), the list preview falls back to
the previous message; the other member's view, checked by signing in as the second test account (one phone).

## Decided while building

- Other people's messages: long-press used to open a dialog with only Cancel; it now does nothing.
- The walk found a message arriving live drawn as your own (TR-044, an old bug); fixed on this branch because the
  live part of this plan could not be checked without it. TR-043 (request banner after Accept) is left open.
- One phone: the other member was a second test account driven through the local API (a local session), not
  signed in on a second device.
- Status: built, not merged. See the [build note](../build/2026-11-10-chat-message-delete.md).
