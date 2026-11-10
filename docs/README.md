# Comlinkr docs

*Index. Every change in what the product does has a plan, and each plan's first lines give its status. Build notes
record how each change was built and checked; reviews record what was found; device runs record what was seen on
the phone.*

Start with the [system map](system-map.md): the profile, the parts, the data, how it runs locally, how it is
tested and how it deploys. Then [handover.md](handover.md) for where the work stopped.

## How the pieces fit

| File or folder | Holds | Written when |
|---|---|---|
| `../CLAUDE.md` | The rules every session follows | A rule changes, or production teaches one |
| `../README.md` | Layout and naming | The layout or naming changes |
| [system-map.md](system-map.md) | Profile, parts, data, running, testing, deploying | Any of those changes |
| [system-review/](system-review/README.md) | How each module behaves: the source of truth | Before and with every change to the module |
| [system-review/checklists/](system-review/checklists/README.md) | Hands-on test scripts | With the review; when a row is missing |
| [device-testing.md](device-testing.md) | How Claude tests on the phone | The tools or setup change |
| [device-runs/](device-runs/README.md) | One log per checklist run | After each run |
| [triage.md](triage.md) | Every incoming task, sorted | Before any work |
| [review/](review/README.md), [plan/](plan/README.md) | Current behaviour, then the change | Before building a change in behaviour |
| [build/](build/README.md) | How each change was built and checked | With every fix or feature |
| [production-lessons.md](production-lessons.md) | What reached people and the rule from it | After a production incident |
| [handover.md](handover.md) | "In progress" branches and the latest five sessions | When a branch is cut or merges; at the end of every session |
| [handover-archive.md](handover-archive.md) | Older handover entries | When handover.md passes five entries |
| `../scripts/check-docs.mjs` | Checks the docs against git (run by the hooks in `../.claude/settings.json`) | When a check is wrong or missing |
| [reference/](reference/) | Product overview, architecture, API summary, data model, roommate matching | When they drift from the code |

## System review (`system-review/`)

| # | Module | Status |
|---|---|---|
| 01 | [Account, sign-in, onboarding, badges, settings](system-review/01-account-onboarding-settings.md) | From code (2026-10-29 docs). Not walked. 2 questions |
| 02 | [Explore](system-review/02-explore.md) | From code; all five tabs seen in the 2026-11-04 smoke run. 2 problems, both fixed. Local data lacks events, stories, quests, polls. 2 questions; TR-003 |
| 03 | [Listings, rooms and roommates](system-review/03-listings-rooms-roommates.md) | Partly walked in the 2026-10-29 audit; fixes 2, 3, 4, 8 seen again 2026-11-04. 9 problems, all fixed. Checklist written. 2 questions; TR-001 |
| 04 | [Food](system-review/04-food.md) | Seen in the smoke run; the documented chips are not rendered (corrected). 1 problem, fixed. 3 questions; TR-001 |
| 05 | [Community Q&A](system-review/05-community.md) | From code; tab opened in the audit. 2 problems, fixed. 1 question |
| 06 | [Messaging and notifications](system-review/06-messaging-notifications.md) | Messages walked in the audit. 2 problems, fixed. 1 question |
| 07 | [Admin console](system-review/07-admin.md) | From code only. 2 questions |
| 08 | [Platform](system-review/08-platform.md) | From code; guard list corrected 2026-11-04; no white flash on Back, measured in the smoke run. 4 problems (1 open). 2 questions; TR-002, TR-004 |

## Questions for the team

Every open question, grouped by topic. The number in brackets is the review (and question) with the details.
When answered: write the answer into that review, mark the statement **[confirmed]**, and remove the line here.

**Running and deploying** (from the [system map](system-map.md#questions-for-the-team))

1. Who may run `eas update --branch production`, and from which branch?
2. Which Prisma migrations have run on production?
3. Remove the unused JWT settings from both `.env.example` files?
4. Keep, freeze or remove the web app?

**Account and settings**

5. What happens to a deleted user's listings, restaurants, chats and applications after the 30-day window? (01-1)
6. Can a user with a pending deletion sign in and cancel it? (01-2)

**Explore**

7. Is a paid event ticket charged anywhere? (02-1)
8. Neighbourhood mood: one vote a day, or changeable? (02-2)

**Listings**

9. Should "Available" on a listing describe its status or its move-in date? (03-1)
10. Is a property-application deposit ever charged? (03-2, system map 1)

**Food**

11. Which heart does the app use, `RestaurantFavorite` or `RestaurantSave`? (04-1)
12. Are owners and guests told about reservations and their outcome? (04-2)
12a. The Food segments (Open Now, Top Rated, Nearby, Saved), cuisine chips and sort are defined but not rendered:
     bring them back or remove the code? (04-3)
12b. Missing values show as "N/A" (floor, deposit, year built, heating, cooling, utilities, wait time): hide them,
     or say "Not provided"? (TR-001)

**Community and messaging**

13. Should the API, not only the phone, leave out blocked users' questions? (05-1)
14. Do read ticks mean "read by the other person" or "sent by me"? (06-1)

**Admin and platform**

15. Are views of badge and rental documents audited, or only changes? (07-1)
16. May an admin use the normal app with the same account? (07-2)
17. Show the hidden `Uncaught (in promise` warnings again in development? (08-1)
18. Move data fetching to React Query? (08-2)

## Later work (agreed, not scheduled)

Each gets a plan in `plan/` when it is picked up.

| Task | What | Why |
|---|---|---|
| T-001 | Move the backend deploy workflow to `.github/workflows/` at the root, run only for `backend/**`, run the unit tests first; switch the VPS from the old backend clone to this repository | The workflow does not run from here, and today it deploys and migrates with no tests |
| T-002 | A local build path that cannot reach production: an EAS `local` profile or a documented `expo run:android`, and a native build workaround that works at this path | Every EAS profile points at production; the old workaround was left in `code/` |
| T-003 | A seed for every module (events, stories, quests, polls, applications, badges, admin data, restaurant hours, conversations) with `.test` emails, and a reset script that uses the test-database guard | Most modules cannot be walked with today's data; the smoke run could not check open or closed (S-09) or read ticks (S-11) |
| T-004 | ~~Set up phone testing and run the smoke checklist~~ Done 2026-11-04 through MCPier's `android` server. Still open: read the scrcpy-mcp source behind it | It has a shell on the phone |
| T-005 | ~~Create the GitHub repository~~ Done (pull requests 1 to 20 merged there). Still open: a `development` branch and branch protection; until then pull requests go straight to `main` | Pull requests need somewhere to go |
| T-006 | Fix the mobile type check (`expo-modules-core` import in `audioPlayback.ts`) | `pnpm typecheck` fails |
| T-007 | Decide where the signing keystores live (EAS credentials or a password manager), and whether the old repository's history needs them removed | They were committed in the old frontend repository |

## Plans (`plan/`)

- [01. Build design D](plan/01-design-d.md) (TR-005): Building, phase 1 (look and motion).
- [02. Native tabs, screen transitions and controls](plan/02-native-navigation.md) (TR-012): built; replaces plan 01's tab
  pager, floating tab bar, zoom transitions and custom controls.
- [04. Hide the Android navigation bar](plan/04-immersive-navigation-bar.md) (TR-021): built.
- [05. Back returns to the previous state](plan/05-back-history.md) (TR-023): built.
- [06. Three product changes decided during the walkthrough](plan/06-walkthrough-decisions.md) (TR-028): done.
- [07. Sheets and dialogs drawn in the app's own window](plan/07-in-window-sheets.md) (TR-041): building.
- [08. The city comes from the phone's location](plan/08-gps-city.md) (TR-042): building.
- [09. Deleting your own chat message](plan/09-chat-message-delete.md) (TR-039): built.
- [10. A quest's own page](plan/10-quest-detail.md) (TR-038): built.
- [11. Editing and cancelling an event; event days in the city's time](plan/11-event-edit-and-city-time.md) (TR-037): built.
- [12. The move-in date and the order of the offer](plan/12-move-in-and-offer-order.md) (TR-036): built.
- [13. Nearby in Food](plan/13-nearby.md) (TR-032): built.
- [14. Follow](plan/14-follow.md) (TR-029): built.

## Reviews (`review/`)

- 2026-11-05: [Design review of the four sections and posting](review/2026-11-05-design-audit.md) (TR-005): problems
  in navigation, consistency and motion, the posting fields that can go, and three proposals. The proposals are
  clickable prototypes in [design/2026-11-05-redesign/](design/2026-11-05-redesign/README.md). Waiting for the
  owner to pick one; a plan follows.

## Device runs (`device-runs/`)

- 2026-11-04: [Smoke checklist](device-runs/2026-11-04-00-smoke.md), OnePlus Nord CE4 (Android 16), wireless,
  Expo Go, local backend: 13 of 14 pass (S-07 with a note; S-11 with its read-tick check blocked, no conversations
  in the seed), 1 partial (S-09, no restaurant hours in the seed). Found TR-001 to TR-004 and the unrendered Food
  chips.

- 2026-11-10: [Full walkthrough](device-runs/2026-11-10-full-walkthrough.md), OnePlus (Android 16), Expo Go, local
  backend with the Resend key: every section, shared screens and admin. Found TR-029 to TR-040; fixes in the build
  note below.

## Build notes (`build/`)

- 2026-11-10: [The brand is spelled "ComLinkr"](build/2026-11-10-brand-spelling.md) (TR-046).
- 2026-11-10: [Accepting a message request](build/2026-11-10-chat-request-accept.md) (TR-043): the banner and the
  disabled composer go at once.
- 2026-11-10: [Follow](build/2026-11-10-follow.md) (TR-029): follow and unfollow, counts, the Follows screen, a
  notification to the person followed.
- 2026-11-10: [Nearby in Food](build/2026-11-10-nearby.md) (TR-032): restaurant addresses geocoded on the server;
  Nearby measures from the phone's position, which stays on the phone.
- 2026-11-10: [The move-in date and the order of the offer](build/2026-11-10-move-in-rules.md) (TR-036): no
  move-in before the home is available; the offer after the landlord approves.
- 2026-11-10: [Editing and cancelling an event](build/2026-11-10-event-edit.md) (TR-037): edit and cancel from
  the page, the people registered told, event days in the city's time.
- 2026-11-10: [A quest's own page](build/2026-11-10-quest-detail.md) (TR-038): page, leaving, the real count,
  one word for quests.
- 2026-11-10: [Deleting your own chat message](build/2026-11-10-chat-message-delete.md) (TR-039, TR-044): soft
  delete for the sender, live removal, live messages drawn on the right side.
- 2026-11-10: [Triage leftovers](build/2026-11-10-triage-leftovers.md) (TR-035, TR-040): requests wait for
  onboarding, the Explore news retry loop, ten small walkthrough findings, randomuser.me removed, backend lint clean.
- 2026-11-10: [The city comes from the phone's location](build/2026-11-10-gps-city.md) (TR-042, plan 08): GPS sets
  the city in onboarding, Settings and Edit profile; admins can override it.
- 2026-11-10: [Sheets and dialogs in the app's window](build/2026-11-10-in-window-sheets.md) (TR-041, TR-019, TR-020,
  plan 07): the Android navigation bar stays hidden while a sheet, dialog or modal is open.
- 2026-11-10: [First triage sweep](build/2026-11-10-triage-sweep.md) (TR-003, 007, 009, 030, 033, 035): Explore
  without a city, Saved, the Listings sheet after a deep link, role changes, restaurant time zones, sidebar 403s.
- 2026-11-10: [Fixes from the full walkthrough](build/2026-11-10-walkthrough.md) (TR-028, TR-024): uploads work again
  under `expo/fetch`, failed uploads no longer leave half-made posts, Resend errors are logged, missing API routes
  (pets filter, question, answer and quest deletes, withdraw, saved news), and 60 fixes in all across the four sections,
  shared screens and admin (Follow hidden).
- 2026-11-09: [Colour palette](build/2026-11-09-color-tokens.md) (TR-013, point 6): about 3,000 hex literals in
  123 files read from a named `src/theme/palette.ts`; values unchanged. Walked on Android, light and dark.
- 2026-11-09: [iOS conventions](build/2026-11-09-ios-conventions.md) (TR-013, point 8): `Link.Preview` and
  `Link.Menu` on listing, room, event and restaurant cards (iOS only), continuous corners. Not walked on iOS.
- 2026-11-09: [Detail routes](build/2026-11-09-detail-routes.md) (TR-013, point 7, plan 03): listing, roommate,
  shared space, restaurant and event details are routes (`/listing/[id]` and the rest) seeded from the list cache;
  `DismissibleSheet` and the event hero flight deleted. Walked on Android.
- 2026-11-09: [Compose split](build/2026-11-09-split-compose.md) (TR-013, point 9b): `app/create-post.tsx` cut
  from 5,000 lines to the route alone; forms, preview, media picker and helpers moved to `src/features/compose/`.
  No behaviour change; publish, delete and Undo walked on Android.
- 2026-11-09: [Docs checks and tooling rules](build/2026-11-09-docs-tooling.md) (TR-025): Tools and After-a-merge
  rules, `scripts/check-docs.mjs` with session-start and pre-push hooks, handover archive, stale triage rows fixed.
- 2026-11-09: [Back returns to the previous state](build/2026-11-09-back-history.md) (TR-023, plan 05): tab history,
  and `useBackState` so Android Back undoes sections, filters and searches on 28 screens before leaving. Walked on
  Android with the Back button.
- 2026-11-09: [Hide the Android navigation bar](build/2026-11-09-immersive-navigation-bar.md) (TR-021, plan 04):
  `expo-navigation-bar` hides the bar; a swipe up from the bottom edge shows it for a moment. Walked on Android.
- 2026-11-09: [Palette colours in dark mode](build/2026-11-09-dark-mode-palette.md) (TR-017, point 1): a lightness
  fallback in `createThemedStyles`, 15 screens' styles moved onto it (colour only), and `usePaletteColor()` for
  colours passed as props. Walked on Android, including a toggle with screens left mounted.
- 2026-11-09: [Native sheets](build/2026-11-09-native-sheets.md) (TR-017, point 2): React Native sheet modals
  moved to `DSheet`; on Android `DSheet` now sizes to its content and opens fully; the post preview and the photo
  gallery are modal routes. Walked on Android.
- 2026-11-09: [News article route](build/2026-11-09-news-article-route.md) (TR-017, point 4): `GET /news/articles/:id`
  and `/news/[id]` replace the article modal; news comments in the native sheet. Walked on Android.
- 2026-11-09: [E2e listing visibility](build/2026-11-09-e2e-listing-visibility.md) (TR-016): the sprint54 moderation
  test expects SEC-04's "not found" for a rejected listing; the e2e suite passes in full (45/45).
- 2026-11-09: [Admin reports and privacy](build/2026-11-09-admin-reports-privacy.md) (TR-015): `/admin/reports` takes
  `status`; `/admin/privacy-requests` takes `status`, `type` and `limit`; the Data privacy screen reads the real API
  shape and no longer crashes. E2e tests added; walked on Android.
- 2026-11-09: [React Query, the rest](build/2026-11-09-react-query-rest.md) (TR-014): admin pages through React Query
  (same hook shapes), edit profile, Settings, event, story and one-off loads; the last four keyboard-tap screens.
  Walked on Android; two older admin bugs reported.
- 2026-11-09: [React Query](build/2026-11-09-react-query.md) (TR-013, point 3): screens read server data through
  React Query keyed by city and filters; `listFetchCache` replaced by stale times and focus refetch. Feed and chat
  loaders use the cache; forms, timers and admin pages listed as not converted. Walked on Android.
- 2026-11-09: [Expo conventions](build/2026-11-09-expo-conventions.md) (TR-013, points 1, 2, 4, 5, 9a): `keyboardShouldPersistTaps` on forms, one HTTP client (axios removed), `useWindowDimensions`, `EXPO_OS`, onboarding
  dots without layout animation. Walked the auth journeys on Android.
- 2026-11-09: [Native navigation](build/2026-11-09-native-navigation.md) (TR-012, plan 02): `NativeTabs` with a Post
  trigger for the compose sheet, the native stack, `@expo/ui` switches, segmented control and bottom sheet. Tab swipe,
  zoom transitions and tab long-press are gone. Walked on Android; iOS not checked.
- 2026-11-08: [Expo skills audit](build/2026-11-08-expo-skills-audit.md) (TR-011): every rule of the installed Expo
  skills checked; one lock file, SDK 57 patch bumps, shared values on `.get()`/`.set()`, `expo-image` and
  `expo-status-bar` everywhere, 120 fps key for iOS. Reported: `Dimensions.get`, `Platform.OS`, forms without
  `keyboardShouldPersistTaps`, axios, hex colours.
- 2026-11-08: [Expo review](build/2026-11-08-expo-review.md) (TR-010): no React Query retry on a 4xx, a 30 s request
  timeout, no components under `app/`, about 45 unused files deleted, gallery / story / photo-reorder gestures on
  Gesture Handler and Reanimated. Walked on the phone; pinch not testable over adb.
- 2026-11-07: [Animation timing](build/2026-11-07-animation-timing.md): every spring now names mass (Reanimated 4's
  default is 4), shorter reveals, ring, hero and back; no flicker on the guide card; the Explore glow stops off-screen;
  the roommate profile opens at once. Measured on a phone from screen recordings.

- 2026-11-06: [Release APK on D:](build/2026-11-06-release-apk-on-d-drive.md): `scripts/build-release-apk.cmd`
  builds the standalone APK with the JDK, SDK, Gradle cache and build output on D:.
- 2026-11-04: [TR-002 guest menu 401s](build/2026-11-04-TR-002-guest-menu-401s.md): the side menu refreshes its
  data only when signed in; guest menu opens now send no requests. Checked on the phone; not committed.
- 2026-11-06: [Design D, full match](build/2026-11-06-design-d-full-match.md): the remaining screens,
  the missing motion and the behaviour changes; two optional API fields and a story enum migration.
- 2026-11-05: [Design D, phase 1](build/2026-11-05-design-d-phase-1.md): the D look and motion on every screen, a
  shared base coat for the rest, one commit per screen on `feature/design-d`.
- 2026-11-04: [One repository for backend and frontend](build/2026-11-04-combined-repository.md): moved into
  `comlinkr-app`, fresh git repository, nothing committed; dependencies reinstalled; docs system written.
- 2026-10-29: [Bug audit](build/2026-10-29-bug-audit.md): B1 to B10 found and fixed (roommate filter, dates, read
  ticks, story timer, listing pills, floor ordinals, a stale sort, the wildcard route).
- 2026-10-29: [UI navigation, gestures and theme](build/2026-10-29-ui-navigation-gestures-theme.md): pager tabs,
  swipe-back, sheets, theme polish, the white flash on back.
- 2026-10-29: [UI performance, tab jank](build/2026-10-29-ui-performance-tab-jank.md): causes measured and fixed;
  virtualised lists; pager-style tabs.

## Production lessons

[production-lessons.md](production-lessons.md). None yet.

## App docs kept with the code

- `backend/docs/API_ENDPOINTS.md`: every endpoint with its request fields (255 endpoints).
- `frontend/apps/mobile/docs/`: build and deploy (`BUILD_AND_DEPLOY.md`), posting authorization, badge and
  marketplace authorization plans, guest-mode endpoints, country scalability, the user guide, and the privacy
  policy and delete-account pages.
- `frontend/apps/mobile/EAS_DEPLOYMENT_GUIDE.md`.
