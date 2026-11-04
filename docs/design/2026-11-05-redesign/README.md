# Redesign proposals, 2026-11-05

Four clickable design proposals (D is C in the brand gradient, added on request) for every screen of the four sections (Explore, Listings, Food, Community) and
the screens they share (sign-in, onboarding, profile, messages, notifications, saved, settings, help, badges,
legal) and all the composers. The admin console is left out on purpose; it is restyled from the chosen design
later. Why each change is made: [the design review](../../review/2026-11-05-design-audit.md) (TR-005).

| File | In one line |
|---|---|
| [a-clarity.html](a-clarity.html) | Keeps the brand blue. Telegram-like: one accent, large titles that collapse into the bar, screens that slide, compact cards, a checklist composer with photos first |
| [b-paper.html](b-paper.html) | A local paper: warm paper and ink, Fraunces serif headlines, magazine layouts, a floating ink tab bar, a one-page composer where optional facts are "+" chips |
| [d-night-market-gradient.html](d-night-market-gradient.html) | Design C exactly, recoloured with the app's blue-to-green gradient (#1A6BAE → #257A86 → #30855B): violet becomes the blue, mint and pink become the green, the greys turn blue-grey. Nothing else differs |
| [c-night-market.html](c-night-market.html) | Dark, vivid and friendly: violet and mint, bento tiles, one + button for posting anything, screens that zoom in, a composer that asks one question at a time |

## How to look at them

Open a file in Chrome or Edge on a computer (double-click it). Each one is a single self-contained page.

- **Left:** every screen, grouped by section. Click one to jump to it. On a phone-width window this is the
  drop-down at the top instead.
- **Middle:** the phone. Tap through it as you would the app: tabs, cards, back buttons, sheets, the composers.
- **Right:** for the screen on show, what changes from today and the motion on that screen, written as
  Reanimated values (springs and durations) so a developer can build it.
- **Theme** switches light and dark; **Reduce motion** shows what people with that phone setting would see.

Things to try in each one:

- Drag the content of a tab sideways: the next tab follows your finger, as in the app today.
- Swipe from the phone's left edge to go back.
- Sign in → Create account → the code screen: type any 6 digits (000000 shows the wrong-code shake).
- Open a listing or a restaurant from its photo (A and C: the photo grows into the page).
- Post (the + or "Post" button) → "A whole place for rent", and compare the three composers.
- Drag a bottom sheet down to close it.

Photos come from picsum.photos and fonts from Google Fonts, so the files need an internet connection to look
right. People and places are made up.

## What is not decided yet

- Which design (or which mix). The plan (`docs/plan/`) is written after that choice.
- **Backend:** making a story "photo first, title optional" needs `title` and `category` to become optional in
  `CreateStoryDto` (or the app fills them in). Everything else in the composers works with today's API: the
  removed or hidden listing fields are already optional on the server, and the restaurant review picker uses the
  restaurant id the review endpoint already takes.
- **Terms:** the server records consent at onboarding (`acceptAgreement`), and Google or Apple sign-ups only
  see it there, so all three designs keep it as one tick-box on the last onboarding step. The tick-box on the
  email sign-up form is not sent to the server; whether to keep it is your call.
- Tab names: B and C rename tabs ("Today", "Homes", "Ask", "People") to show the idea; A keeps today's names.

## Changing them

The files are built from `src/`: a shared engine (`engine.js`: navigation, the tab pager, sheets, the OTP
field, the photo-to-page animation), shared content (`data.js`), notes (`notes.js`), icons, and one stylesheet
and set of screens per design (`a*.js`, `b*.js`, `c*.js`; B and C reuse A's detail screens in `a2.js`,
`a3.js` and `a4.js` and replace what differs; D is C's files plus `d.css`, which changes colours only). Rebuild with:

```bash
node docs/design/2026-11-05-redesign/src/build.js
```
