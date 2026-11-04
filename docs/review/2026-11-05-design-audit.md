# Design review: every screen of the four sections, and posting

_2026-11-05. Triage [TR-005](../triage.md). Written before the design overhaul, so the plan that follows can say what
changes. Seen on the phone (OnePlus Nord CE4, Android 16, Expo Go, local backend, signed in as `ui_tester`, dark
theme) and read in code. Screenshots stay in the session scratchpad: they show seeded test data only, but are not
needed in the repository._

The three design proposals made from this review are in
[`docs/design/2026-11-05-redesign/`](../design/2026-11-05-redesign/README.md).

## What the app looks like today

- **Four tabs** (Explore, Listings, Food, Community) that swipe sideways with the finger (`SwipeTabs`), a bottom tab
  bar with a springy pill behind the active icon, haptics on tab press, long-press a tab to post. This part already
  feels good and should stay.
- **A shared header** on every tab: menu button, the "ComLinkr / WE FIND FOR YOU" wordmark in a blue-green gradient,
  and a messages button. The wordmark takes the space where a screen title would tell people where they are.
- **A hero card on top of each tab**, each in its own colour: blue (Explore), navy (Listings), green (Food),
  blue-to-green (Community), orange (Quests), blue-to-green again (Stories, "Have a spare room?").
- **Dark theme by default**, deep navy (`#0B1526`) with lighter navy cards and thin borders.

## Problems found

Numbered so the plan can refer to them.

### Navigation and structure

1. **Three levels of tabs.** Explore: News / Events / Stories / Quests / Polls, then Live News / Community, then All /
   Local / National / World. Listings: Listings / Rooms & Mates, then Available Rooms / Find Roommates, then
   property-type chips. People lose track of where they are, and the content starts halfway down the screen.
2. **The hero card repeats what the tab bar says** ("Find Your Perfect Home — Rental listings in Los Angeles") and
   pushes the first item below the fold. On Listings the first price is at 70 % of the screen height.
3. **No screen title.** The brand wordmark is shown on every tab instead.
4. **"Add Listing" and "List a Space"** sit side by side in the composer with no clear difference for a newcomer
   (a whole property versus a room in a shared home).
5. **The greeting follows the city's clock, not the phone's** ("Good afternoon" at 01:49 in India, 12:19 in Los
   Angeles; `app/(tabs)/feed/index.tsx:1605-1607`). Intended, but a newcomer travelling there may find it odd;
   the designs keep it and show the city time next to it.

### Visual consistency

6. **A different accent per section and per card** (blue, green, orange, red, gradient), and a rainbow of icon tiles
   in the side menu and profile. Nothing tells the user what is tappable or important.
7. **Report flags in red on every card** (Community, listings, food). Red reads as an error or a danger, and it is
   the loudest thing on a question card. Reporting belongs in an overflow menu.
8. **Very tall listing cards**: one card fills the screen (image, owner row with three buttons, title, deposit and
   date pills, a four-tile stats box, a "View Full Details" button). Only one listing is visible at a time.
9. **Empty headings**: "Amenities & Features" and "Tags" headings with nothing under them; "Available Services" with
   "No services listed".
10. **Missing data shown as a bad value**, against the B6 rule: "Deposit N/A", "N/A Floor", "N/A Wait Time",
    "— Distance unavailable", "US$0–US$0/mo" budget on the profile, "Hours not provided" as a pill on every
    restaurant photo (TR-001).
11. **Raw timestamps** such as "29/10/2026, 01:26:51" on a community post, next to "2h ago" and "29 Oct" elsewhere.
12. **"Your Journey" stepper** on a listing shows "Exploring → Enquired → Viewing" already filled for a listing the
    user never contacted.
13. **A broken-image placeholder** fills the top half of a text-only community post.
14. **Inconsistent empty states**: some have an icon in a circle, some a dashed box, some plain text.

### Motion

15. Screen pushes use the platform default; the leaving screen goes blank for about 0.3 s (review 08, problem 2).
16. No feedback motion on the OTP field, form errors, saves, likes or posting. Lists appear all at once after a
    spinner, with no skeleton on most screens.
17. Opening a listing or restaurant jumps to a new screen; there is no sense of the card becoming the page.

## Posting is hard work

Required fields below are those the backend's create DTOs require (`backend/src/modules/*/dto/create-*.dto.ts`).
Anything marked **backend** needs a server change if the chosen design drops it.

| Composer | Today (`app/create-post.tsx`) | Proposed |
|---|---|---|
| **Listing** | About 30 fields over 4 steps; **photos are step 4** (line 3265). City, state and country typed by hand. Walk score (0–100) and year built are typed by the owner | **Photos first** (they make or break a listing). Then title, type, rent, beds, baths, address in one screen. City, state, country and currency **prefilled from the profile**. Year built, heating, cooling, laundry, parking, transit, walk score, lease term, pet policy behind one **"More details (optional)"** row. Amenities as tap chips. Deposit optional. Description stays required by the backend; offer a one-tap starter text built from the facts already entered |
| **Room in a shared home** ("List a Space") | Currency is a free-text field (line 3452); rooms, baths, occupants and spots as four number boxes; address, city, state, country typed | Currency derived from the country. Steppers (– 1 +) for the four counts. City and country prefilled. House rules as chips plus "other" |
| **Restaurant (owner)** | An explainer card, then two "Verified owner" banners, then 20 fields; services, signature dishes, story, opening hours as free text | One line: "Owners get a badge after verification. Learn more". Name, cuisine, price, address, photos first; hours with a time picker; the rest optional. `priceRange` and `availableServices` are required by the backend: default them ($$ and Dine-in) instead of asking |
| **Restaurant review** | The user types the **exact restaurant name**, which is then matched by search; a near match fails with "Restaurant not found" (lines 2631-2646) | **Search picker** of restaurants in the city, then stars and text. The review endpoint already takes a restaurant id, so this is app-only |
| **Event** | Date typed as free text and parsed ("Mar 15, 2026 or 2026-03-15", line 2445); times typed | Date and time **pickers**. City from the profile (already). Capacity optional |
| **Story** | Title and category required before the media; hashtags as comma-separated text | **Media first** (camera roll opens at once), then an optional caption. **Backend**: `title` and `category` are required by `CreateStoryDto`; make them optional or derive them (caption's first words, category "General") |
| **Quest** | Goal condition and reward required, free text | Templates ("Photo challenge", "Visit 5 places") that prefill both |
| **News post** | Title, content, category; tags and location optional; tags comma-separated | Chip input for tags; location chip from the profile city |
| **Community question** | One line in the hero, then a sheet | Keep; add category chips with a guess from the words typed |
| **Sign-up** | A terms checkbox on the email form only; it is not sent to the server, and Google or Apple sign-up never shows it | Keep for now; whether to drop it is a question for the owner (consent is recorded at onboarding) |
| **Onboarding** | 6 steps; step 5 "Agreement" is a whole screen, and it is where the server records acceptance (`acceptAgreement` sets `agreementAcceptedAt` and `termsAcceptedVersion`, `backend/src/modules/onboarding/onboarding.service.ts:171-179`); it is the only consent Google and Apple sign-ups give | **Fold the Agreement into the last step** as one required tick-box (5 steps, same API call). Communities already skippable. Prefill location from the phone's region |

Across all composers:

- Comma-separated tags and hashtags become a **chip input** (type, press space or comma, the chip appears).
- **Save as draft** on leaving instead of losing the form (none of the composers keeps a draft today).
- Errors shown **next to the field** with a shake, not in an alert after pressing Post.
- A **preview** that is the real card, not a separate screen.

## Inspiration

- **Telegram** (the owner's reference): consistent chrome on every screen, horizontal pane slides that follow the
  finger, a large title that collapses into the bar on scroll, OTP digits that pop in and shake on a wrong code,
  bottom sheets with a spring.
- **Mobbin** (real mobile apps): [Vestiaire Collective, adding photos and listing an item](https://mobbin.com/flows/4052da5d-e81d-4899-80a3-a07c282b9efb)
  ("4 steps left" checklist, photos as numbered slots, "Optional info" collapsed, Save draft) and
  [Depop, listing an item](https://mobbin.com/flows/9f6278f3-41a4-4e03-9e3f-0db7cc5bcac7) (one page, optional
  facts as "+ Category" chips, Save to drafts next to Post).
- **Awwwards** (websites, so used for mood, type and motion rather than layout): Telescope ("real
  recommendations by real people": warm off-white `#F4F3F0`, lime `#E3F794`, scattered photo collage), Concrete
  (stacking cards, warm grey `#DDD9C8` on near-black `#141416`), Superconscious (near-black `#0C0B0C` with violet
  `#7322F2`), Flashquad (events app, vivid green `#34C404` and red-orange `#FF3600`). The Awwwards motion records
  were not available for these sites, so the motion values in the designs are this review's own, written in
  Reanimated terms.

## The proposals

All three: one accent colour for the whole app, a real title on every screen, at most one row of tabs under the
title, missing data hidden (never "N/A"), report in an overflow menu, dark and light themes, the composer fixes
above, and every motion honouring the phone's reduce-motion setting.

| | A. Clarity | B. Paper | C. Night Market |
|---|---|---|---|
| Palette | Brand blue `#0076EB`, green only for "available / open / success"; navy dark theme, cool white light theme | Warm paper `#F5F1E8`, ink `#1B1A17`, tomato `#E5542B`, lime highlight `#DDF07A`; warm charcoal dark theme | Near-black `#0D0C12`, violet `#7C5CFF`, mint `#3DDC97`; a soft lavender light theme |
| Type | Onest, large collapsing titles (Telegram, iOS) | Fraunces serif headlines, Instrument Sans body; editorial | Bricolage Grotesque headings, Manrope body; rounded and friendly |
| Navigation | Large title collapsing into the bar; one segmented control; tab bar with a sliding pill; messages and profile in the bar | Floating capsule tab bar; text tabs with a sliding underline; city as a dateline under the title | A "Today" bento home per section; tab bar with a central **+** that opens one compose sheet for everything |
| Cards | Compact rows (photo left, facts right) for lists; a 16:10 photo card for listings | Magazine: full-width photos, numbered lists, hairline dividers instead of boxes | Bento tiles with rounded 24 px corners and glass surfaces |
| Composer | A checklist ("3 of 5 done") with photos first and "More details" collapsed (Vestiaire) | One page; optional facts as "+ add" chips (Depop) | One question per screen, keyboard first, with smart defaults and a progress bar |
| Motion signature | Telegram-like: springy horizontal pane slides, card-to-detail expand, OTP pop and shake | Calm: text rises in with a stagger, the underline slides, cards stack on scroll | Playful: the + morphs into the sheet, liquid tab indicator, a small burst on success |

**D. Night Market in the brand gradient** (added 2026-11-05 at the owner's request; the owner likes C best): C
unchanged except colour. The violet accent becomes the gradient's blue `#1A6BAE`, mint and pink become its green
`#30855B`, every two-colour gradient becomes the full band `#1A6BAE → #257A86 → #30855B` (sampled from the
owner's screenshot), and the violet-tinted greys become blue-grey. Text on green fills is white. Link text in
the dark theme uses a lighter blue (`#7DB4E2`) so it stays readable; people's avatar colours and the heart
stay as in C.
