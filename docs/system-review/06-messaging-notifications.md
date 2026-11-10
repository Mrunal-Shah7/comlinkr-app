# 06. Messaging and notifications

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29) and the bug audit, which walked
Messages on the phone. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

Talking to landlords, roommates, restaurant owners and other users, and being told when something happens.

## Who uses it, and where

- `app/chat.tsx`: the conversation list and the thread in one screen [code].
- `app/notifications.tsx`: in-app notifications [code].
- Backend: `messaging` (REST and the Socket.IO gateway), `notifications` (in-app list, Expo push, broadcasts)
  [code].

## How it works

### Messaging

- DIRECT conversations, optionally with a context (listing, restaurant…), and pending requests (member status
  PENDING). Roommate connections use the same mechanism: connect creates a pending conversation, accept unlocks it
  [code].
- Socket.IO namespace `/chat` (`src/services/messagingSocket.ts`), connected once per signed-in session in
  `app/_layout.tsx`: join and leave rooms, send, typing indicators. History over REST [code].
- Block and mute (`block.store`, `mute.store`). An admin can ban a user from a conversation
  (`BlockProvenance.ADMIN_BAN`, review 07) [code].
- Message types: TEXT, IMAGE, SYSTEM and others [code].

### Notifications

- In-app list: mark read, read all, delete [code].
- Expo push: `registerForPushNotificationsAsync` → `POST /users/push-token`; tokens in `PushToken` and
  `PushDevice`; sent through `exp.host` [code].
- Types: EVENT_NEARBY, COMMENT, LIKE, MESSAGE, BADGE_UPDATE, SYSTEM, with a reference and an actor [code].
- Per-type preferences in Settings (review 01) [code].
- Admin broadcasts: priority, DRAFT / SCHEDULED / SENT / FAILED, audience all, city or selected users, sent by
  `admin.cron` [code].

## Rules it enforces

- Read ticks ("✓✓") show only when the current user sent the last message [observed].
- The "No conversations yet" empty state is hidden while the list loads [code].
- A pending conversation cannot be used for chat until accepted [code].

## Problems found

From the [bug audit](../build/2026-10-29-bug-audit.md), 2026-10-29. Both fixed.

| # | Problem | Seen on the phone after the fix |
|---|---|---|
| 1 | "✓✓" read ticks on every conversation without unread messages, including empty ones and ones where the other person wrote last (B2) | Yes: gone from the "No messages yet" row |
| 2 | "No conversations yet" showed under the spinner while loading (B3) | Code only; the list loaded too fast to catch |

## Questions

1. Do read ticks mean "read by the other person", or only "sent by me"? Today they mean the second. [question]

## How to test it

Checklist: none yet; the smoke checklist opens Messages. Two test accounts are needed for a real conversation
(one on the phone, one through the API).

## Not yet checked

Live delivery over the socket with two users; typing indicators; images in chat; block and mute; push on a
development build; broadcasts; notification preferences actually suppressing a type.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md).

- Messages for a user with no conversations: "No conversations yet", filters All / Listings / Events, each 0
  [observed]. Read ticks not checked: no conversations in the seed.
- Notifications: "No notifications yet", filters All / Unread (0) [observed].
- Expo Go shows "Push notifications are disabled in Expo Go. Use a development build." on every launch [observed].

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- Swipe a conversation left to remove it (hide for you), with Undo for about 4.5 seconds; the server has no archive. **[phone]**
- A conversation pins the home or event it is about under the bar; new messages pop in from their own side (not the ones already there). **[phone]**
- Toasts are a glass pill from the top; deletes in My posts and conversations offer Undo instead of a confirm dialog.
- Saved, Interested (homes) and Favourites (restaurants) are tabs of one screen; `/interested` and `/favorites` open those tabs. **[phone]**

## Update 2026-11-10: full walkthrough (TR-028, branch `fix/walkthrough`, not merged)

Walked on the phone; rows S- in the [run log](../device-runs/2026-11-10-full-walkthrough.md).
- Chat send (with accents), view profile, delete chat and the empty state work (S-05). Deleting one message is not offered.

## Update 2026-11-10: deleting your own message (plan 09, TR-039, branch `feature/chat-delete`, not merged)

- Long-press on your own sent message (text, photo, voice) asks "Delete message?" and calls
  `DELETE /conversations/:id/messages/:messageId`; it leaves the thread only when the API agrees. Other people's
  messages offer nothing on long-press. **[phone]**
- Soft delete (`Message.deletedAt`): the thread, list preview, unread counts and reporting skip it; the admin
  transcript still shows it with `deletedAt`, so a report on it can still be acted on. The admin's Remove is still a
  hard delete. [code, e2e]
- Live: `message_removed` to the conversation room (open chats drop the message, also for admin removals now) and
  `conversation_updated` with `removed: true` to each member (lists reload). **[phone]**
- A message arriving live is drawn as the receiver's, not as their own (TR-044). **[phone]**
- Open: after Accept on a request, the banner stays until the chat is reopened (TR-043).
- Saved → News lists saved news articles as well as posts (S-01); My posts deletes quests and stories too (S-03).
