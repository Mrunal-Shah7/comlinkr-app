# 2026-11-19: iOS fixes walked on Android

Motorola edge 40 neo (the OnePlus has no Expo Go; the owner chose this phone), Expo Go, local backend on 4000
(email off), Metro on 8083 with the local API, as the demo account `rohan@demo.comlinkr.test`. Branch
`fix/ios-ui-batch` ([build note](../build/2026-11-19-ios-ui-batch.md)).

| Row | What | Result |
|---|---|---|
| TR-058 | Header word mark | Pass. The header reads "ComLinkr" on Explore and Q&A |
| TR-059 | Ask sheet on Q&A with the keyboard open | Pass on Android: title, field, topics and Ask above the keyboard. Closed without posting. iOS not checked |
| TR-060 | Day labels in a chat | Pass. The seeded chat shows "Saturday" and "Sunday"; a new message got "Today". Deleting it (long-press, Delete) removed the message and its "Today" label |
| TR-062 | Room form currency | Pass. "$" with "Prices in USD"; after typing "United Kingdom" as the country, both fields show "£" and "Prices in GBP" |
| TR-061 | Looking for (optional) | Pass. Published "Walk test room uit" with a 76-character community; saved as `GBP`, `communityPreference` set. The detail shows "Looking for: ..." over two lines and no "Open to anyone". A seeded room with no community still shows "Open to anyone". The test room was deleted from its Delete button |
| TR-057 | Tab bar over cards | iOS only; not checked |

## Seen, not fixed

- The room detail priced the GBP room "$650 /mo": room prices use the viewer's currency (Rohan is in the US), not
  the room's. Not part of this change.
- MCPier typed "Café" as "Cafe" this time (it worked in earlier runs).
