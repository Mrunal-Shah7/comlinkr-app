# 02. Explore: news, events, stories, quests, polls

_2026-11-04. Made from the earlier section doc (written from code, 2026-10-29), the bug audit and the UI change
notes of 2026-10-29. Not walked by checklist yet. Marks: see [README.md](README.md)._

## Planned changes

| ID | Kind | What will change | Triage | Plan |
|---|---|---|---|---|
| — | | None yet | | |

## What it is for

What is happening in the user's city: live news, posts from locals, events to attend, short-lived stories,
challenges ("quests"), would-you-rather polls and a daily neighbourhood mood.

## Who uses it, and where

- Screen: `frontend/apps/mobile/app/(tabs)/feed/index.tsx` (about 7k lines), styles in
  `src/styles/feedScreen.styles.ts` [code].
- Event detail `app/events/[id]/index.tsx` (`EventDetail`, with save, RSVP, the registration sheet and message
  host; opened by cards in Explore and Events, Saved, chat and links, [detail routes note](../build/2026-11-09-detail-routes.md)), organiser QR check-in `events/[id]/check-in.tsx`, list and management
  `app/events.tsx`; story viewer `app/story-viewer.tsx` [code].
- Guests see public content for their picked city; liking, saving, commenting, posting and joining need an account
  [code].
- Backend: `feed`, `news`, `events`, `stories`, `challenges`, community polls, neighbourhood mood [code].

## How it works

One vertical `ScrollView` with a top tab bar: **News · Events · Stories · Quests · Polls** (`FEED_TABS`). Without
a city the user gets the choose-city state [code].

- **News.** Hero with city, greeting and a Live Activity Ticker built from recent events, stories and posts
  (`buildHeroTickerRows`) [code]. Sub-tabs:
  - **Live News**: Google News RSS per city and country (`GET /news/explore`), refreshed on the server every
    4 minutes by `news.cron`. Category chips, expandable cards, like, save, comment and share on
    `NewsArticle*` tables, an article route (`/news/[id]`, TR-017) with "visit source" and comments in the native
    sheet. Placeholder images (`newsImageUrl`) when the RSS item
    has none [code].
  - **Community**: `FeedPost`s from locals (`GET /feed?city=`), category filter, like, comment, save, detail with
    comment thread, owner edit and delete, report [code].
  - Neighbourhood mood vote (`GET/POST /feed/mood`) [code].
- **Events.** Featured card and `EventRowCard`s (`GET /events`); registration through `EventRegistrationModal`
  (free or paid tickets, attendee info); QR check-in by the organiser [code].
- **Stories.** Active stories (`GET /stories?city=`), category filter (Events, Food, Housing, Culture, Local News),
  sort, cards with save, like, comment, delete own. Stories expire hourly (`stories.cron`) [code].
- **Quests.** `GET /challenges`; cards with type, duration, goal, reward, max participants, progress; **Join**
  (`POST /challenges/:id/join`). Challenges end every 6 hours by `challenges.cron` [code].
- **Polls.** Would-you-rather cards built from community polls (`GET /community/polls`,
  `POST /community/polls/:id/vote`); default polls are created per city [code].

### Data loading

Three `useFocusEffect`s: live news (only while that sub-tab shows), community posts, and events plus stories in the
background. Each loader fetches through the React Query cache (`queryClient.fetchQuery`, keyed by tab, city, country,
state and user): an entry younger than 10 minutes (2 for news) answers without a request and is not re-applied;
pull to refresh forces a fetch ([React Query note](../build/2026-11-09-react-query.md)) [code]. A remounted tab now
refetches instead of showing an empty list for up to 10 minutes (fixed 2026-10-29) [observed].

## Rules it enforces

- Everything is scoped to the city [code].
- Stories expire; challenges end on their own [code].
- One mood vote per user per city per day [code] [question: per day, or replaceable during the day?].

## Problems found

| # | Problem | Status |
|---|---|---|
| 1 | Pausing a photo story (hold, or open comments) restarted its timer from 0 | Fixed 2026-10-29, verified in code only (no stories in local data). [Bug audit](../build/2026-10-29-bug-audit.md) B4 |
| 2 | A remounted Explore tab could show empty lists for up to 10 minutes (fetch gate skipped the refetch) | Fixed 2026-10-29. [UI changes](../build/2026-10-29-ui-navigation-gestures-theme.md) |

## Questions

1. Is a paid event ticket charged anywhere, or only recorded? [question]
2. Mood vote: once per day, or changeable? [question]

## How to test it

Checklist: none yet; the smoke checklist covers opening each Explore tab. The local data has 14 feed posts and no
events, stories, quests or polls, so a seed is needed before this module can be walked.

## Not yet checked

Events registration and QR check-in; stories with real content (photo and video); quests join and end; polls;
news engagement; the composer for news posts, events, stories and challenges; a city with no content.

## Update 2026-11-04: smoke run on the phone

[Run log](../device-runs/2026-11-04-00-smoke.md).

- All five top tabs render with the local data: News shows live Google News for Los Angeles; Events "No upcoming
  events"; Stories "No stories in your area yet"; Quests "No Active Quests Yet"; Polls a default would-you-rather
  poll [observed].
- The hero greeting follows the city's time ("Good afternoon" at 02:30 IST, which is afternoon in Los Angeles);
  with no city, the phone's time ("Good morning") [observed].
- After sign-out with no city chosen, the "Recent activity" ticker still shows Los Angeles posts [observed]
  [question: TR-003].

## Update 2026-11-06: design D (plan 01, branch `feature/design-d`, not merged)

From [the full-match build note](../build/2026-11-06-design-d-full-match.md); **[code]** unless marked
**[phone]**.

- RSVP: one sheet; name and email come from the profile (Change opens the fields); ticket count stepper; the ticket flips in with the QR. **[phone]**
- Door check-in: D page; counts roll up after an admission; outcomes show over the scanner. Scanning not walked.
- All events opens the shared event detail and RSVP sheet (its own older copies are removed).
- Stories can be posted without a title or a category (server: empty title, category `GENERAL`, shown as General / Story). The story composer is a black screen, media first. **[phone]** (not posted)
- Quest composer: Start from templates fill the title, goal, reward and length.
- News composer: tags as chips; your city as a location chip.

## Update 2026-11-10: a cancelled event is kept (plan 15, TR-047, branch `feature/event-cancelled`, not merged)

- Cancel (the event's page, or My posts) no longer deletes: `DELETE /events/:id` sets `Event.cancelledAt` and keeps
  registrations, saves, chat and photos. Everyone registered is told once, and the notice opens the event. A second
  cancel sends nothing. [e2e] **[phone]**
- The event's page says "You cancelled this event." or "The host cancelled this event."; Edit, Cancel event, Door
  check-in, RSVP and reviews are gone, and the bottom bar says Cancelled. **[phone]**
- A cancelled event leaves Explore's list and the story strip; it stays, marked Cancelled, in My posts (with no Edit
  or Cancel), the registered list and Saved. [e2e] **[phone]** (My posts)
- Registering, editing, adding photos, reviewing, saving and the ticket answer 409 `EVENT_CANCELLED`; unsaving and
  unregistering still work. The door scan answers `EVENT_CANCELLED` (not admitted). [e2e]
- Event notifications (changed, cancelled, new nearby) now open the event in the app; before, tapping them did
  nothing. **[phone]**
- My posts shows an event's date as its calendar day ("Nov 15, 2026"), not converted through the phone's zone
  ("5:30 AM" in India) (rule B10). **[phone]**

## Update 2026-11-10: editing and cancelling an event; the city's day (plan 11, TR-037, branch `feature/event-edit`, not merged)

- The host sees **Edit** and **Cancel event** on the event's page. Edit (`/events/[id]/edit`) changes the title,
  description, date, start and end time, venue, capacity and price; the city, category, format and photos are fixed.
  Back with changes asks before discarding. **[phone]**
- `PATCH /events/:id` makes create's checks: a paid event needs a price above 0, the date may not be before today in
  the event's city, the capacity may not go below the number registered; a `city` in the body is ignored. [e2e]
- A change of date, time or place notifies everyone registered ("<title> has changed", what changed); a title-only
  edit tells nobody. Cancel is confirmed, removes the event (as delete in My posts) and notifies everyone registered
  ("<title> was cancelled", with no link, since the event is gone). **[phone]** Plan 15 replaces this: the event is
  kept, marked Cancelled.
- An event's day is read in its city's zone (`common/utils/city-day.ts`): upcoming means from today in the city, the
  day filter is that calendar day, create refuses a day before today in the city, reviews open after the end time
  in the city. An event dated today stays in Explore all day. [e2e]
- The app shows an event's date from its date part (`utils/eventDay.ts`), not through the phone's zone, which showed
  the day before west of UTC (rule B10). **[phone]**

## Update 2026-11-10: a quest's own page (plan 10, TR-038, branch `feature/quest-detail`, not merged)

- Tapping a quest card opens `/quest/[id]` (also `comlinkr://quest/:id` and `/app/feed?openQuest=<id>`): type, who
  started it, details, goal, reward, time left, place, tags, the first ten people with the count. Join; Leave
  (confirmed); "This quest is full", "This quest has ended", or "You started this quest" for the host. **[phone]**
- `DELETE /challenges/:id/join` leaves; the count moves only when a membership is removed; refused to the author
  and on an ended quest; leaving a full quest frees the place. [e2e]
- Explore's quest list refetches when you return after joining or leaving on the page. **[phone]**
- The cards read the API's `participantCount` (they read `participantsCount`, which the API never sent, so the count
  and bar showed only after joining). **[phone]**
- The app says "quest" everywhere a user reads it; the code and API keep `challenge`. The empty Quests tab shows
  one "Start a quest". **[phone]**
- Progress per person (check-ins, completion) does not exist; the page shows time left and how many joined. Changed by plan 17, below.

## Update 2026-11-10: full walkthrough (TR-028, branch `fix/walkthrough`, not merged)

Walked on the phone; rows E- in the [run log](../device-runs/2026-11-10-full-walkthrough.md).
- Uploads work again (E-07, `expo/fetch` FormData); a failed photo upload no longer leaves the post (E-21), and a deleted post's photos leave Cloudinary (E-22).
- New stories, posts, events and quests show at once (E-08, E-11); "View" after publishing opens the new item (E-09, E-29).
- News older than 30 days is dropped (E-16); cards keep their place when the full list arrives (E-17).
- Open: E-12, E-13, E-14, E-18, E-19, E-25 to E-27, E-31 to E-33, E-36, E-37.

## Update 2026-11-10: marking a quest done (TR-052, plan 17, branch `feature/quest-progress`, not merged)

From the [build note](../build/2026-11-10-quest-progress.md).
- **Members mark a quest done themselves** while it runs (self-reported, no proof), and can undo it. The host
  counts as a member. **[phone]**, [e2e]
- **Who can:** non-members get 403. After the end, the record is fixed. [e2e]
- **The quest page:**
  - reads "N joined · M done";
  - marks each person who is done;
  - its footer offers "Mark as done" or "Done · Undo".

  **[phone]**
- **Explore's card** adds "· M done", and its button reads Done once you finished. **[phone]**
- **Leaving** removes the "done" with the membership; the confirm says so. **[phone]**
- **No notice** goes to the host when someone finishes.
