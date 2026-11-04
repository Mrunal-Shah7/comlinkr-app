# Comlinkr — Product Overview

> "Community-First Housing & Lifestyle Discovery Platform" (Swagger title)

Comlinkr is a city-scoped community app for people settling into a new place — students, migrants,
diaspora communities and young professionals. It combines **finding a home** (rentals, spare rooms,
roommates) with **finding your people** (local news, events, stories, Q&A, food spots) in one app.

Almost everything is **scoped to the user's city** (`UserLocation.city`), set during onboarding or
picked as a guest. Guests can browse most public content; actions (save, post, connect, chat) require
an account (`useRequireAuth` on mobile, `@Public()`/`@OptionalAuth()` on backend).

## Platforms
- **Mobile app** (primary): Expo / React Native, `frontend/apps/mobile` — Android + iOS.
- **Web app**: `frontend/apps/web` (Vite). *Not under active UI work — mobile only.*
- **Backend**: NestJS + Prisma + PostgreSQL + Redis, `backend/`.
- Production API: `https://api.comlinkr.com/api`.

## Main navigation (mobile bottom tabs)

| Tab | Route | Purpose |
|-----|-------|---------|
| **Explore** | `app/(tabs)/feed/index.tsx` | City news (live Google-News RSS + community posts), events, stories, quests (challenges), would-you-rather polls, neighborhood mood |
| **Listings** | `app/(tabs)/housing/index.tsx` | Rental listings, "Rooms & Mates" (shared spaces + roommate matching), property applications |
| **Food** | `app/(tabs)/food/index.tsx` | Restaurants: open now / top rated / nearby / saved, reviews, reservations |
| **Community** | `app/(tabs)/community/index.tsx` | Local Q&A with upvotes, community polls, stats |

A shared `AppHeader` (top) gives access to the sidebar (profile, saved, my listings/posts/restaurants,
events, notifications, settings, admin), and a create button leads to `create-post.tsx` (one composer
for news posts, listings, shared spaces, restaurants, events, stories, challenges).

## Key concepts
- **Vibes / Interests / Communities** — chosen in onboarding; drive roommate matching and personalisation.
  Communities are diaspora / cultural groups (`CommunityCategory`).
- **Badges** — `LANDLORD`, `RESTAURANT_OWNER`, `AGENCY`, `LOCAL_REVIEWER`. Applied for with documents
  (`apply-badge.tsx`), approved by admins. Open-posting model: anyone may post; a badge marks content
  as *verified* and boosts trust (see `frontend/apps/mobile/docs/posting-authorization.md`). Landlord
  badge **is** required to decide property applications.
- **Roommate matching** — 0–100 compatibility score from shared vibes, interests, communities,
  location and lifestyle prefs. See [RoommateMatching.md](RoommateMatching.md).
- **Connections** — roommate "connect" creates a pending DIRECT conversation; accepting unlocks chat.
- **Property applications** — multi-step rental application → landlord decision → e-signature →
  deposit → generated tenancy agreement PDF (`property-agreement.tsx`).
- **Moderation** — reports on listings/restaurants/users/posts/questions, warnings, bans, admin audit log.

## Core user journeys
1. **Sign up** (email + OTP, Google, or Apple) → **onboarding**: location → vibes → interests →
   communities → agreement → complete.
2. **Find a home**: Listings → filter (type, price, beds, pets) → listing detail → enquire (chat with
   landlord) / save / mark interest / report → apply → sign agreement.
3. **Find a roommate**: Listings → Rooms & Mates → set preferences → browse matches sorted by score →
   connect → chat once accepted. Or list a spare room (shared space) / apply to one.
4. **Settle in**: Explore news and events, register for events (QR check-in), view/post stories,
   join quests, vote polls; Food for restaurants & reservations; Community to ask locals.
5. **Grow trust**: apply for a badge → verified listings / restaurants / reviews.
