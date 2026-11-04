# ComLinkr Badge-Based Authorization, Monetization & Content System

> **Version:** 2.0  
> **Date:** March 3, 2026  
> **Previous Version:** 1.0 (March 2, 2026)  
> **Scope:** Mobile App (`apps/mobile/`) + Web Admin (`apps/web/`)  
> **Status:** Planning Phase — Expanded with Monetization, Stories & Challenges

### What Changed in v2.0
- ✅ Added **Stories** post type (free for all users)
- ✅ Added **Challenges/Quests** post type (free for all users)
- ✅ Added **Event Monetization Strategy** (5-step funnel, 8% ticket fee, review queue)
- ✅ Added **Restaurant Two-Tier System** (free community reviews vs. paid claimed listings)
- ✅ Updated POST_TYPES from 4 → 6, grid from 2×2 → 3×2
- ✅ Added **Quests** tab to feed with community challenge cards
- ✅ Updated Implementation Phases with monetization rollout
- ✅ Updated Permission Matrix, Data Model, and File Map

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Design Principles](#3-design-principles)
4. [Identity & Role Architecture](#4-identity--role-architecture)
5. [Badge System Deep Dive](#5-badge-system-deep-dive)
6. [Stories & Challenges — New Content Types](#6-stories--challenges--new-content-types)
7. [Complete User Journey Flows](#7-complete-user-journey-flows)
8. [Permission Matrix](#8-permission-matrix)
9. [Badge Application Flow](#9-badge-application-flow)
10. [Admin Verification Pipeline](#10-admin-verification-pipeline)
11. [Event Monetization Strategy](#11-event-monetization-strategy)
12. [Restaurant Two-Tier System](#12-restaurant-two-tier-system)
13. [Impact on Existing Screens](#13-impact-on-existing-screens)
14. [New Screens & Components](#14-new-screens--components)
15. [Data Model Changes](#15-data-model-changes)
16. [Storage & Persistence Strategy](#16-storage--persistence-strategy)
17. [Admin Panel Scope (Web Only)](#17-admin-panel-scope-web-only)
18. [Implementation Phases](#18-implementation-phases)
19. [Edge Cases & Error Handling](#19-edge-cases--error-handling)
20. [Future Considerations](#20-future-considerations)

---

## 1. Executive Summary

ComLinkr is a **community-first** mobile application. The four main tabs — **Explore (Feed)**, **Listings (Housing)**, **Food**, and **Community** — serve all users equally. Housing and Food are features within the community, not standalone real-estate or restaurant platforms.

The current system has **no role or permission model**. Every user who completes signup and onboarding gets the exact same capabilities, including posting property listings and registering restaurants — actions that should be restricted to verified landlords, restaurant owners, and agencies.

This document defines a **badge-based capability system** that layers on top of the existing community user without splitting users into separate tracks or changing the onboarding flow.

### Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              EVERY USER IS A COMMUNITY MEMBER               │
│                                                             │
│   ✅ Browse feed, housing, food, community                  │
│   ✅ Post news articles & create events                     │
│   ✅ Chat, favorites, interested, notifications             │
│   ✅ Join cultural & lifestyle communities                  │
│                                                             │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│   │ 🏠 LANDLORD   │ │ 🍽️ RESTAURANT │ │ 🏢 AGENCY     │    │
│   │   BADGE       │ │ OWNER BADGE   │ │   BADGE       │    │
│   │               │ │               │ │               │    │
│   │ Post listings │ │ List & manage │ │ Post listings │    │
│   │ Manage props  │ │ restaurants   │ │ for clients   │    │
│   │ Verified tag  │ │ Verified tag  │ │ Multi-prop    │    │
│   └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                             │
│   Badges are ADDITIVE — a user can hold multiple badges     │
│   Badges require ADMIN VERIFICATION before activation       │
│   Badges are applied for FROM the profile/settings screen   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Current State Audit

### 2.1 What Exists Today

| Component | File | Current Behavior | Problem |
|-----------|------|-----------------|---------|
| **User type** | `src/store/auth.store.ts` | Fields: `id, name, username, email, onboardingDone, country, stateProvince, city, culture, interests, communities` | **No `role`, no `badges`, no `verificationStatus`** |
| **Auth Store** | `src/store/auth.store.ts` | Zustand store with `login`, `signup`, `logout`, `hydrate`, `updateOnboarding` | **No permission-aware methods** |
| **Onboarding** | `app/(auth)/onboarding.tsx` | 6 steps: Location → Culture → Interests → Community → Agreement → Ready | **No account type selection** (this is correct — onboarding is community-focused) |
| **Create Post** | `app/create-post.tsx` | 4 post types: News, Event, Listing, Restaurant — all shown to everyone | **No role checks — any user can post a listing or restaurant** |
| **Posts Store** | `src/store/posts.store.ts` | `addPost()` accepts any post type | **No authorization validation** |
| **Profile** | `app/profile.tsx` | Shows user info, culture, communities | **No badge display, no "become a landlord" option** |
| **Settings** | `app/settings.tsx` | General app settings, logout, delete account | **No business/verification section** |
| **Tabs Layout** | `app/(tabs)/_layout.tsx` | Auth gate via `useAuthStore.isAuthed` | **Only checks if logged in, not roles** |
| **Root Layout** | `app/_layout.tsx` | Hydrates auth, shows splash | **No role-aware routing** |

### 2.2 Current Auth Flow (Unchanged — Works Fine)

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────┐
│  App     │────▶│  Hydrate │────▶│ Has stored   │──Y──▶│  (tabs)  │
│  Launch  │     │  auth    │     │ auth + done? │     │  /feed   │
└──────────┘     └──────────┘     └──────┬───────┘     └──────────┘
                                         │ N
                                         ▼
                                  ┌──────────────┐
                                  │  (auth)/     │
                                  │  login or    │
                                  │  signup      │
                                  └──────┬───────┘
                                         │ after signup
                                         ▼
                                  ┌──────────────┐
                                  │  (auth)/     │
                                  │  onboarding  │
                                  │  (6 steps)   │
                                  └──────┬───────┘
                                         │ finish
                                         ▼
                                  ┌──────────────┐
                                  │  (tabs)/feed │
                                  └──────────────┘
```

**This flow does NOT change.** The badge system is layered on top, not injected into onboarding.

### 2.3 Create Post Flow — What Was vs. What Is Now

**Before (v1.0) — The Problem:**
```
User taps "+" ──▶ create-post.tsx ──▶ Sees ALL 4 types:
                                       ├── 📰 News Post       ← Everyone should have this
                                       ├── 🎉 Create Event    ← Everyone should have this
                                       ├── 🏠 Add Listing     ← ⚠️ SHOULD BE RESTRICTED
                                       └── 🍽️ List Restaurant ← ⚠️ SHOULD BE RESTRICTED

User picks "Add Listing" ──▶ Fills form ──▶ handlePost() ──▶ addPost()
                                              │
                                              └── NO role check. No verification.
                                                  Anyone can list a property.
```

**After (v2.0) — Updated UI (already implemented):**
```
User taps "+" ──▶ create-post.tsx ──▶ Sees 3×2 grid with 6 types:
                                       ├── 📰 Write News      ← ✅ Free for all
                                       ├── 📅 Add Event       ← ✅ Free (paid tickets = 8% fee)
                                       ├── 🏠 Add Listing     ← 🔒 Badge-gated (landlord/agency)
                                       ├── 🍽️ List Restaurant ← 🔒 Badge-gated (restaurant owner)
                                       ├── 📖 Add Story       ← ✅ Free for all (NEW)
                                       └── 🏆 Create Challenge← ✅ Free for all (NEW)

TODO: Wire up usePermissions() to gate listing/restaurant cards.
      Story + Challenge forms already built with type-specific PreviewModal.
```

---

## 3. Design Principles

### 3.1 Community First, Always

- Every user is a **community member** first and foremost
- Onboarding is about **personalizing the community experience** — city, culture, interests, communities
- Roles and badges are **never part of onboarding** — they are opt-in capabilities applied for later
- A user with zero badges has the **exact same browsing experience** as a verified landlord

### 3.2 Badges Are Additive, Not Exclusive

- A single user can hold **multiple badges simultaneously**
- Example: A user can be both a `landlord` AND a `restaurant_owner`
- Badges **unlock capabilities** — they don't change the base user experience
- Removing a badge revokes the capability but keeps the user account intact

### 3.3 Verification Is Mandatory

- No badge becomes active without **admin approval**
- Users apply → Admin reviews → Admin approves or rejects
- Until approved, the badge is in `pending` state and the capability remains locked
- This prevents spam listings, fake restaurants, and unverified property claims

### 3.4 Graceful Degradation

- If a user has a `pending` badge, they see a **status indicator**, not an error
- If a badge is `rejected`, they see the **reason** and can **re-apply**
- Locked features show a clear **path to unlocking** (not just a dead end)

### 3.5 No Routing Changes

- The existing tab structure (Feed, Listings, Food, Community) stays identical
- There are no "landlord-only tabs" or "admin tabs" in mobile
- New screens are standard Expo Router stack screens (like `chat.tsx`, `settings.tsx`)

---

## 4. Identity & Role Architecture

### 4.1 Role vs Badge vs Verification — The Three Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  LAYER 1: SYSTEM ROLE                                               │
│  ─────────────────                                                  │
│  Determines platform-level access.                                  │
│  Set by super-admin only. Cannot be self-assigned.                  │
│                                                                     │
│  Values: "user" | "admin" | "superadmin"                            │
│                                                                     │
│  • "user"       → Normal community member (99% of users)            │
│  • "admin"      → Can access web admin panel, verify badges         │
│  • "superadmin" → Can manage admins, system-wide config             │
│                                                                     │
│  NOTE: Admin panel is WEB ONLY. No admin UI in mobile app.          │
│        Admins use the mobile app as normal community members.        │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LAYER 2: CAPABILITY BADGES                                         │
│  ──────────────────────────                                         │
│  Opt-in capabilities that unlock specific post types.               │
│  User applies for a badge → Admin verifies → Badge activates.       │
│  A user can hold ZERO or MULTIPLE badges.                           │
│                                                                     │
│  Badge Types:                                                       │
│  • "landlord"         → Can post & manage housing listings          │
│  • "restaurant_owner" → Can list & manage restaurants               │
│  • "agency"           → Can post listings on behalf of clients      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LAYER 3: VERIFICATION STATUS (per badge)                           │
│  ─────────────────────────────────────────                          │
│  Each badge has its own independent verification lifecycle.         │
│                                                                     │
│  Statuses: "none" | "pending" | "verified" | "rejected"             │
│                                                                     │
│  • "none"     → User has not applied for this badge                 │
│  • "pending"  → Application submitted, awaiting admin review        │
│  • "verified" → Admin approved — capability is ACTIVE               │
│  • "rejected" → Admin denied — user can see reason & re-apply       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 How the Three Layers Interact

```
                    ┌───────────────────┐
                    │   User signs up   │
                    │   & completes     │
                    │   onboarding      │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │  role: "user"     │
                    │  badges: []       │
                    │  verification: {} │
                    │                   │
                    │  CAN: browse,     │
                    │  post news/events │
                    │  chat, favorites  │
                    │                   │
                    │  CANNOT: post     │
                    │  listings or      │
                    │  restaurants      │
                    └────────┬──────────┘
                             │
                    User wants to post a listing
                             │
                             ▼
                    ┌───────────────────┐
                    │  Taps locked      │
                    │  "Add Listing"    │
                    │  card in          │
                    │  create-post      │
                    └────────┬──────────┘
                             │
                             ▼
                    ┌───────────────────┐
                    │  Badge Application│
                    │  Screen opens     │
                    │  (apply-badge)    │
                    └────────┬──────────┘
                             │
                    User fills business info
                    & submits application
                             │
                             ▼
                    ┌───────────────────┐
                    │  role: "user"     │
                    │  badges:          │
                    │   ["landlord"]    │
                    │  verification:    │
                    │   landlord:       │
                    │    "pending"      │
                    └────────┬──────────┘
                             │
                    Admin reviews on web panel
                             │
                    ┌────────┴──────────┐
                    │                   │
                    ▼                   ▼
           ┌──────────────┐   ┌──────────────┐
           │  APPROVED    │   │  REJECTED    │
           │              │   │              │
           │  verification│   │  verification│
           │  landlord:   │   │  landlord:   │
           │  "verified"  │   │  "rejected"  │
           │              │   │  + reason    │
           │  ✅ Can now  │   │              │
           │  post        │   │  ❌ Can      │
           │  listings    │   │  re-apply    │
           └──────────────┘   └──────────────┘
```

---

## 5. Badge System Deep Dive

### 5.1 Badge Type: Landlord 🏠

**Who it's for:** Individual property owners who want to list their properties on ComLinkr.

**What it unlocks:**
- Ability to create housing listings via the "Add Listing" post type
- "Verified Landlord" visual badge on their profile and on their listings
- Access to "My Listings" management screen (edit, deactivate, delete own listings)
- Listing analytics (views, inquiries, favorites count — future)

**Requirements to apply:**
- Full legal name (as on ID)
- Business or property ownership document (photo upload)
- Phone number (mandatory, for tenant contact)
- At least one property address they intend to list

**Verification criteria (for admin):**
- Name matches uploaded document
- Document appears legitimate (not obviously fake)
- Phone number is provided and formatted correctly
- No prior bans or violations on the account

### 5.2 Badge Type: Restaurant Owner 🍽️

**Who it's for:** Restaurant/café/bar owners or managers who want to register their establishment on ComLinkr.

**What it unlocks:**
- Ability to create restaurant entries via the "List My Restaurant" post type
- "Verified Business" visual badge on their profile and restaurant cards
- Access to "My Restaurants" management screen
- Ability to update menu, hours, photos for their listed restaurants

**Requirements to apply:**
- Restaurant/business name
- Owner or authorized manager name
- Business license or registration number
- Business phone number
- Business email address
- Physical address of the restaurant

**Verification criteria (for admin):**
- Business name and license number are consistent
- Physical address is plausible (not obviously fake)
- The applicant appears to be the owner or authorized representative

### 5.3 Badge Type: Agency 🏢

**Who it's for:** Property management companies, real estate agencies, or brokerages that manage multiple properties on behalf of landlords.

**What it unlocks:**
- Everything the Landlord badge unlocks, plus:
- Ability to post listings on behalf of property owners
- Higher listing limits (future: e.g., up to 50 active listings vs 5 for individual landlords)
- Agency branding on listings (company logo, agency name)
- Team management (future: invite agents under the agency account)

**Requirements to apply:**
- Registered company/agency name
- Business registration certificate (photo upload)
- Agency license number (if applicable in jurisdiction)
- Primary contact person name and title
- Business phone and email
- Company website or social media presence (optional but helps verification)
- Number of properties currently managed

**Verification criteria (for admin):**
- Company appears to be a legitimate registered entity
- License numbers are plausible for the jurisdiction
- Contact information is professional and complete
- No prior bans or violations

### 5.4 Badge Lifecycle State Machine

```
            User has never
            applied for this badge
                    │
                    ▼
            ┌──────────────┐
            │              │
            │    "none"    │◀──────────────────────────────────┐
            │              │         (admin revokes badge)     │
            └──────┬───────┘                                   │
                   │                                           │
          User submits                                         │
          application                                          │
                   │                                           │
                   ▼                                           │
            ┌──────────────┐                                   │
            │              │                                   │
            │  "pending"   │                                   │
            │              │                                   │
            └──────┬───────┘                                   │
                   │                                           │
          ┌───────┴────────┐                                   │
          │                │                                   │
     Admin approves   Admin rejects                            │
          │                │                                   │
          ▼                ▼                                   │
   ┌──────────────┐ ┌──────────────┐                           │
   │              │ │              │                           │
   │  "verified"  │ │  "rejected"  │                           │
   │              │ │              │                           │
   │  ✅ Active   │ │  ❌ Denied   │                           │
   │  capability  │ │  + reason    │                           │
   │              │ │              │                           │
   └──────┬───────┘ └──────┬───────┘                           │
          │                │                                   │
          │           User re-applies                          │
          │           (new application)                        │
          │                │                                   │
          │                ▼                                   │
          │         ┌──────────────┐                           │
          │         │  "pending"   │ (cycle repeats)           │
          │         └──────────────┘                           │
          │                                                    │
     Admin revokes ────────────────────────────────────────────┘
     (violation, etc.)
```

---

## 6. Stories & Challenges — New Content Types

### 6.1 Stories Post Type

**Access:** Free for ALL users (no badge required)  
**Purpose:** Engagement driver — encourage users to share daily life, local highlights, and community moments  
**Feed Location:** Dedicated "Stories" tab in feed  

#### Story Form Fields (in create-post.tsx)

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `mediaType` | `"reel"` \| `"photo"` \| `"video"` | ✅ | Content format selector |
| `category` | Dropdown | ✅ | Story category (Daily Life, Food & Drink, Local Spotlight, Culture, etc.) |
| `description` | Text | ✅ | Story description |
| `hashtags` | Text | Optional | Comma-separated hashtags |
| `duration` | Dropdown | ✅ | Visibility duration (1 hour, 6 hours, 12 hours, 24 hours, permanent) |
| `location` | Text | Optional | Location tag |

#### Story Preview Card (in PreviewModal)
```
┌──────────────────────────────────────┐
│ [Full-width image/video placeholder] │
│                                      │
│  📖 Your Story                       │
│  @username                           │
│                                      │
│  "Story description text..."         │
│                                      │
│  #hashtag1 #hashtag2                 │
│  📍 Location • ⏱️ 24h               │
│                                      │
│  ❤️ 0   💬 0   🔗 Share              │
└──────────────────────────────────────┘
```

### 6.2 Challenges / Quests Post Type

**Access:** Free for ALL users (no badge required)  
**Purpose:** Community engagement — gamify local participation through photo challenges, fitness goals, food quests, etc.  
**Feed Location:** Dedicated "Quests" tab in feed  

#### Challenge Form Fields (in create-post.tsx)

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `challengeType` | Dropdown | ✅ | Photo, Fitness, Food, Explore, Social, Creative, Green |
| `details` | Text | ✅ | Challenge description and rules |
| `duration` | Dropdown | ✅ | Challenge duration (1 day, 3 days, 1 week, 2 weeks, 1 month) |
| `goal` | Text | Optional | Specific goal (e.g., "Visit 5 local cafes") |
| `reward` | Text | Optional | Reward/prize description |
| `maxParticipants` | Number | Optional | Maximum participants (0 = unlimited) |
| `location` | Text | Optional | Location tag |

#### Challenge Type Metadata

| Type | Emoji | Colors (gradient) | Description |
|------|-------|--------------------|-------------|
| 📸 Photo | 📸 | `#FF6B6B` → `#FF8E8E` | Photography challenges |
| 💪 Fitness | 💪 | `#4ECDC4` → `#44B09E` | Exercise & movement |
| 🍔 Food | 🍔 | `#FF9A56` → `#FFAD56` | Culinary adventures |
| 🗺️ Explore | 🗺️ | `#667EEA` → `#764BA2` | Local discovery |
| 👋 Social | 👋 | `#F093FB` → `#F5576C` | Meet & connect |
| 🎨 Creative | 🎨 | `#4FACFE` → `#00F2FE` | Art & creative |
| 🌱 Green | 🌱 | `#43E97B` → `#38F9D7` | Sustainability |

#### Challenge Card UI (in Quests tab)
```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │  [Gradient header by type]       │ │
│ │  📸 PHOTO CHALLENGE              │ │
│ │  "Challenge Title"               │ │
│ └──────────────────────────────────┘ │
│                                      │
│  Challenge description text...       │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Progress: ████████░░ 73%    │    │
│  │  42/58 participants          │    │
│  └──────────────────────────────┘    │
│                                      │
│  ⏱️ 5 days left  🏆 "Local badge"   │
│  📍 Downtown Area                    │
│                                      │
│  [Join Challenge]  ❤️ 24  💬 8       │
└──────────────────────────────────────┘
```

### 6.3 Stories & Challenges — Strategic Rationale

| Dimension | Stories | Challenges/Quests |
|-----------|---------|-------------------|
| **Revenue** | Indirect (engagement → retention → ad revenue) | Indirect (engagement → retention) |
| **Badge Required** | No | No |
| **Moderation** | Light (community flagging) | Light (community flagging) |
| **Expiry** | Configurable (1h–permanent) | Challenge duration (1d–1mo) |
| **Competitive Moat** | Hyperlocal stories (unlike Instagram/TikTok) | Gamified local quests (unique to ComLinkr) |
| **Future Monetization** | Sponsored stories, promoted placement | Sponsored challenges by businesses |

---

## 7. Complete User Journey Flows

### 7.1 Journey A: Normal Community Member (No Badges)

```
Signup ──▶ Onboarding (6 steps) ──▶ Feed

Day-to-day usage:
├── Browse Feed (news, events from community)
├── Browse Listings (housing tab — view only, contact landlords)
├── Browse Food (restaurant tab — view only, find places to eat)
├── Browse Community (local groups, posts)
├── Create Post:
│   ├── ✅ News Post (allowed)
│   ├── ✅ Create Event (allowed)
│   ├── 🔒 Add Listing (locked — shows "Become a Verified Landlord")
│   └── 🔒 List Restaurant (locked — shows "Register Your Business")
├── Chat with other users
├── Save favorites & interested items
└── Profile, Settings, Notifications
```

### 7.2 Journey B: User Becomes a Verified Landlord

```
Normal user ──▶ Profile screen ──▶ Taps "Become a Verified Landlord"
                                         │
                                         ▼
                                  ┌──────────────────┐
                                  │  apply-badge.tsx  │
                                  │                   │
                                  │  Step 1: Badge    │
                                  │  type = landlord  │
                                  │  (pre-selected)   │
                                  │                   │
                                  │  Step 2: Business │
                                  │  details form     │
                                  │  • Full name      │
                                  │  • Phone number   │
                                  │  • Property docs  │
                                  │  • Address        │
                                  │                   │
                                  │  Step 3: Upload   │
                                  │  verification     │
                                  │  documents        │
                                  │                   │
                                  │  Step 4: Review   │
                                  │  & submit         │
                                  └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  Application      │
                                  │  Submitted!       │
                                  │                   │
                                  │  Status: ⏳       │
                                  │  Pending review   │
                                  │  (48 hrs typical) │
                                  └────────┬─────────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                              ▼                         ▼
                     ┌──────────────┐          ┌──────────────┐
                     │  ✅ Approved │          │  ❌ Rejected │
                     │              │          │              │
                     │  Push notif: │          │  Push notif: │
                     │  "You're     │          │  "Application│
                     │  verified!"  │          │  not approved│
                     │              │          │  Reason: ..." │
                     │  Profile now │          │              │
                     │  shows 🏠    │          │  Can re-apply│
                     │  badge       │          │  after fixing│
                     │              │          │  issues      │
                     │  Create Post │          └──────────────┘
                     │  now shows   │
                     │  "Add Listing│
                     │  UNLOCKED    │
                     └──────────────┘
                              │
                              ▼
                     User creates first listing
                              │
                              ▼
                     ┌──────────────────────┐
                     │  Listing posted!     │
                     │  Shows in Housing    │
                     │  tab with            │
                     │  "✅ Verified        │
                     │   Landlord" badge    │
                     │                      │
                     │  Accessible from     │
                     │  "My Listings" on    │
                     │  profile             │
                     └──────────────────────┘
```

### 7.3 Journey C: User Tries to Post Listing Without Badge

```
User taps "+" ──▶ create-post.tsx
                       │
                       ▼
              ┌──────────────────────────────────────┐
              │  Post Type Selection Grid:            │
              │                                      │
              │  ┌────────────┐  ┌────────────┐      │
              │  │ 📰 News   │  │ 🎉 Event  │      │
              │  │ Post       │  │ Create    │      │
              │  │ [ACTIVE]   │  │ [ACTIVE]  │      │
              │  └────────────┘  └────────────┘      │
              │                                      │
              │  ┌────────────┐  ┌────────────┐      │
              │  │ 🔒 Add    │  │ 🔒 List   │      │
              │  │ Listing   │  │ Restaurant │      │
              │  │ [LOCKED]  │  │ [LOCKED]   │      │
              │  │ "Verify   │  │ "Register  │      │
              │  │ as        │  │ business   │      │
              │  │ landlord" │  │ to unlock" │      │
              │  └─────┬──────┘  └────────────┘      │
              └────────┼─────────────────────────────┘
                       │
              User taps locked card
                       │
                       ▼
              ┌────────────────────┐
              │  apply-badge.tsx   │
              │  (landlord         │
              │   pre-selected)    │
              └────────────────────┘
```

### 7.4 Journey D: Verified Landlord with Pending Restaurant Badge

```
A user who is already a verified landlord wants to also list their restaurant.

Profile shows:
┌──────────────────────────────────────────┐
│  👤 John Smith                           │
│  📍 New York City, NY, USA              │
│                                          │
│  Badges:                                 │
│  ┌───────────────────────┐               │
│  │ 🏠 Verified Landlord  │ ← Active     │
│  └───────────────────────┘               │
│  ┌───────────────────────┐               │
│  │ 🍽️ Restaurant Owner   │               │
│  │    ⏳ Pending Review   │ ← Applied    │
│  └───────────────────────┘               │
│                                          │
│  Create Post shows:                      │
│  ✅ News | ✅ Event | ✅ Listing         │
│  🔒 Restaurant (pending verification)    │
└──────────────────────────────────────────┘
```

### 7.5 Journey E: Any User Posts a Story

```
User opens Create Post
        │
        ▼
Sees 3×2 grid with 6 post types
(news, event, listing🔒, restaurant🔒, story, challenge)
        │
        ▼
Taps "📖 Add Story" (UNLOCKED — no badge required)
        │
        ▼
Story creation form appears:
• Select media type (reel/photo/video)
• Choose category
• Write description
• Add hashtags (optional)
• Set duration (1h–permanent)
• Tag location (optional)
        │
        ▼
Taps "Preview" → Type-specific Story preview card
(shows full-width media, username, description, hashtags, duration)
        │
        ▼
Taps "Share Story" → Published to Stories tab
Appears in feed under Stories tab
Expires based on selected duration
```

### 7.6 Journey F: Any User Creates a Challenge

```
User opens Create Post
        │
        ▼
Sees 3×2 grid with 6 post types
        │
        ▼
Taps "🏆 Create Challenge" (UNLOCKED — no badge required)
        │
        ▼
Challenge creation form appears:
• Select challenge type (Photo/Fitness/Food/Explore/Social/Creative/Green)
• Write challenge details & rules
• Set duration (1 day–1 month)
• Define goal (optional)
• Describe reward/prize (optional)
• Set max participants (optional, 0=unlimited)
• Tag location (optional)
        │
        ▼
Taps "Preview" → Type-specific Challenge preview card
(shows gradient header matching type, progress bar, join button)
        │
        ▼
Taps "Launch Challenge" → Published to Quests tab
Appears in Quests tab with:
• Gradient header by challenge type
• Progress bar (0% initially)
• Join button
• Participant count, time remaining
• Engagement metrics (likes, comments)
```

### 7.7 Journey G: Event Creator with Paid Tickets

```
User opens Create Post → taps "📅 Add Event"
        │
        ▼
STEP 1 — VERIFICATION WALL (first time only):
If user hasn't agreed to event terms:
"To create events, please verify your identity"
• Full name (required)
• Phone number (required)
• Agree to Event Creator Terms ☐
        │
        ▼
STEP 2 — EVENT DETAILS (mandatory fields):
• Event title (required)
• Date & time (required)
• Location (required)
• Category (required: Music, Food, Sports, Tech, Community, etc.)
• Description (required, min 50 chars)
• Cover image (required)
• Expected attendance (required)
        │
        ▼
STEP 3 — TICKET TYPE:
• Free event → Skip to Step 5
• Paid event → Set ticket tiers:
  ┌─────────────────────────────────────┐
  │  General Admission: $__.__          │
  │  VIP (optional):    $__.__          │
  │  Early Bird (opt):  $__.__          │
  │                                     │
  │  Platform fee: 8% per ticket        │
  │  Example: $25 ticket → you get $23  │
  │           ComLinkr fee: $2          │
  └─────────────────────────────────────┘
        │
        ▼
STEP 4 — TERMS AGREEMENT:
☐ I agree to ComLinkr Event Creator Terms
☐ I agree to handle refunds per ComLinkr policy
☐ I understand the 8% platform fee for paid tickets
        │
        ▼
STEP 5 — REVIEW & SUBMIT:
• Free events < 100 people → Auto-published ✅
• Free events ≥ 100 people → Review queue ⏳
• All paid events → Review queue ⏳ (admin reviews within 24h)
        │
        ▼
If review required:
"Your event is under review. We'll notify you within 24 hours."
Admin checks: legitimate organizer, realistic pricing, proper description
        │
        ▼
Approved → Published to Events tab
Rejected → Notified with reason, can edit & resubmit
```

---

## 8. Permission Matrix

### 8.1 What Each Badge Combination Can Do

| Action | No Badge | 🏠 Landlord (verified) | 🍽️ Restaurant Owner (verified) | 🏢 Agency (verified) | Admin |
|--------|----------|----------------------|-------------------------------|---------------------|-------|
| Browse feed | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse listings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse restaurants | ✅ | ✅ | ✅ | ✅ | ✅ |
| Browse community | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post news | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create event (free) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create event (paid tickets)** | **✅ (after verification wall)** | **✅** | **✅** | **✅** | **✅** |
| **Post story** | **✅** | **✅** | **✅** | **✅** | **✅** |
| **Post challenge/quest** | **✅** | **✅** | **✅** | **✅** | **✅** |
| **Join challenges** | **✅** | **✅** | **✅** | **✅** | **✅** |
| **Write restaurant review** | **✅** | **✅** | **✅** | **✅** | **✅** |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Save favorites | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Post listing** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Post restaurant (claimed)** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Manage own listings** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Manage own restaurants** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Reply to restaurant reviews** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Run restaurant promotions** | ❌ | ❌ | ✅ (Premium+) | ❌ | ✅ |
| **"Verified" badge on profile** | ❌ | ✅ | ✅ | ✅ | ✅ |
| Apply for badge | ✅ | ✅ | ✅ | ✅ | N/A |
| Access web admin panel | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Review paid events** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Review restaurant claims** | ❌ | ❌ | ❌ | ❌ | ✅ |

### 8.2 Verification Status vs. Capability

| Badge Status | Can See Locked Card? | Can Open Application? | Can Post? | Profile Badge? |
|-------------|---------------------|----------------------|-----------|---------------|
| `"none"` | Yes (with "Apply" CTA) | Yes | ❌ | None |
| `"pending"` | Yes (with "Pending" label) | No (already applied) | ❌ | ⏳ Pending |
| `"verified"` | No (card is unlocked) | No (already verified) | ✅ | ✅ Verified |
| `"rejected"` | Yes (with "Re-apply" CTA) | Yes (new application) | ❌ | ❌ Rejected |

---

## 9. Badge Application Flow

### 9.1 Entry Points (How Users Reach the Application Screen)

```
Entry Point 1: Profile Screen
─────────────────────────────
Profile ──▶ "Become a Verified Landlord" button
        ──▶ "Register My Restaurant" button
        ──▶ "Register as an Agency" button

Entry Point 2: Create Post Screen (Locked Card)
────────────────────────────────────────────────
Create Post ──▶ Tap locked "Add Listing" card
            ──▶ Tap locked "List Restaurant" card

Entry Point 3: Settings Screen
──────────────────────────────
Settings ──▶ "Business & Verification" section
         ──▶ "Apply for Badge" / "Check Status"

Entry Point 4: Housing Tab (Optional Enhancement)
──────────────────────────────────────────────────
Housing tab ──▶ "Are you a landlord? List your property"
                banner (for users without landlord badge)
```

### 9.2 Application Screen Flow (apply-badge.tsx)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  STEP 1: SELECT BADGE TYPE                                  │
│  (skipped if pre-selected from entry point)                 │
│                                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │ 🏠 I'm a Property Owner / Landlord          │            │
│  │    List and manage your rental properties    │            │
│  └─────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────┐            │
│  │ 🍽️ I Own / Manage a Restaurant               │            │
│  │    Register your restaurant on ComLinkr      │            │
│  └─────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────┐            │
│  │ 🏢 I'm a Property Agency                     │            │
│  │    Manage listings for multiple owners        │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 2: BUSINESS DETAILS                                   │
│  (form fields vary by badge type — see 8.3)                │
│                                                             │
│  Common fields:                                             │
│  • Full legal name ────────────── [________________]        │
│  • Business phone ─────────────── [________________]        │
│  • Business email ─────────────── [________________]        │
│                                                             │
│  Landlord-specific:                                         │
│  • Property address ───────────── [________________]        │
│  • Ownership type (own/manage) ── [  dropdown     ▼]        │
│                                                             │
│  Restaurant-specific:                                       │
│  • Restaurant name ────────────── [________________]        │
│  • Cuisine type ───────────────── [________________]        │
│  • Restaurant address ─────────── [________________]        │
│                                                             │
│  Agency-specific:                                           │
│  • Company name ───────────────── [________________]        │
│  • Agency license # ───────────── [________________]        │
│  • Number of properties ───────── [________________]        │
│  • Company website ────────────── [________________]        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 3: DOCUMENT UPLOAD                                    │
│                                                             │
│  Upload verification documents:                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  📄 Business License / Registration          │            │
│  │     [Choose File]                            │            │
│  └─────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────┐            │
│  │  🪪 Government-Issued ID                     │            │
│  │     [Choose File]                            │            │
│  └─────────────────────────────────────────────┘            │
│  ┌─────────────────────────────────────────────┐            │
│  │  📸 Property/Business Photo (optional)       │            │
│  │     [Choose File]                            │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
│  Accepted formats: JPG, PNG, PDF                            │
│  Max file size: 10MB each                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 4: REVIEW & SUBMIT                                    │
│                                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │  Summary of application:                     │            │
│  │                                              │            │
│  │  Badge: 🏠 Landlord                          │            │
│  │  Name: John Smith                            │            │
│  │  Phone: +1 (555) 123-4567                    │            │
│  │  Property: 123 Main St, New York, NY         │            │
│  │  Documents: 2 files uploaded                  │            │
│  │                                              │            │
│  │  ☐ I confirm all information is accurate     │            │
│  │    and I agree to ComLinkr's Landlord        │            │
│  │    Terms of Service                          │            │
│  │                                              │            │
│  │  [Submit Application]                        │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STEP 5: CONFIRMATION                                       │
│                                                             │
│  ┌─────────────────────────────────────────────┐            │
│  │         🎉                                   │            │
│  │  Application Submitted!                      │            │
│  │                                              │            │
│  │  Your landlord verification is now           │            │
│  │  under review. We'll notify you within       │            │
│  │  48 hours.                                   │            │
│  │                                              │
│  │  What happens next:                          │            │
│  │  1. Our team reviews your documents          │            │
│  │  2. You'll get a push notification           │            │
│  │  3. Once approved, you can post listings     │            │
│  │                                              │            │
│  │  [Check Status]  [Back to Home]              │            │
│  └─────────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Form Fields by Badge Type

| Field | 🏠 Landlord | 🍽️ Restaurant Owner | 🏢 Agency |
|-------|------------|---------------------|----------|
| Full legal name | ✅ Required | ✅ Required | ✅ Required |
| Business phone | ✅ Required | ✅ Required | ✅ Required |
| Business email | Optional | ✅ Required | ✅ Required |
| Property/restaurant address | ✅ Required | ✅ Required | Optional |
| Business/restaurant name | Optional | ✅ Required | ✅ Required |
| Ownership type (own/manage) | ✅ Required | Optional | N/A |
| Cuisine type | N/A | ✅ Required | N/A |
| Agency license number | N/A | N/A | ✅ Required |
| Number of properties | Optional | N/A | ✅ Required |
| Company website | N/A | Optional | Optional |
| Business license upload | ✅ Required | ✅ Required | ✅ Required |
| Government ID upload | ✅ Required | ✅ Required | ✅ Required |
| Property/business photo | Optional | Optional | Optional |

---

## 10. Admin Verification Pipeline

### 10.1 Overview (Web Admin Only)

The verification pipeline lives **entirely in the web admin panel** (`apps/web/src/features/admin/`). The mobile app only submits applications and displays status — all review and approval happens on web.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ADMIN WEB PANEL — /admin/verifications                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📋 Verification Queue                               │    │
│  │                                                      │    │
│  │  Filter: [All ▼] [Landlord ▼] [Restaurant ▼]        │    │
│  │          [Agency ▼] [Pending ▼]                      │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐    │    │
│  │  │  👤 John Smith                                │    │    │
│  │  │  Badge: 🏠 Landlord                           │    │    │
│  │  │  Applied: Feb 28, 2026 (2 days ago)           │    │    │
│  │  │  Status: ⏳ Pending                            │    │    │
│  │  │                                               │    │    │
│  │  │  Business: Smith Properties                   │    │    │
│  │  │  Phone: +1 (555) 123-4567                     │    │    │
│  │  │  Property: 123 Main St, New York, NY          │    │    │
│  │  │                                               │    │    │
│  │  │  Documents:                                   │    │    │
│  │  │  📄 business-license.pdf  [View]              │    │    │
│  │  │  🪪 government-id.jpg     [View]              │    │    │
│  │  │                                               │    │    │
│  │  │  [✅ Approve]  [❌ Reject]  [💬 Request Info] │    │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐    │    │
│  │  │  🏢 Metro Realty Group                        │    │    │
│  │  │  Badge: 🏢 Agency                             │    │    │
│  │  │  Applied: Feb 27, 2026 (3 days ago)           │    │    │
│  │  │  ...                                          │    │    │
│  │  └──────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Admin Actions

```
┌─────────────────────────────────────────────────────────────┐
│  APPROVE                                                    │
│  ────────                                                   │
│  • Sets user's verification status to "verified"            │
│  • Records: verifiedAt timestamp + verifiedBy admin ID      │
│  • Triggers push notification to user's mobile device       │
│  • Badge becomes visible on user's profile                  │
│  • Corresponding post type unlocks in create-post           │
│  • Entry logged in admin audit trail                        │
├─────────────────────────────────────────────────────────────┤
│  REJECT                                                     │
│  ────────                                                   │
│  • Sets user's verification status to "rejected"            │
│  • Admin must provide a rejection reason (mandatory)        │
│  • Triggers push notification with reason to user           │
│  • User can view reason on verification-status screen       │
│  • User can re-apply (creates a new application)            │
│  • Entry logged in admin audit trail                        │
├─────────────────────────────────────────────────────────────┤
│  REQUEST MORE INFO                                          │
│  ─────────────────                                          │
│  • Status stays "pending"                                   │
│  • Admin sends a message/note to the user                   │
│  • User sees the note on verification-status screen         │
│  • User can update their application with new info          │
│  • Does NOT count as a rejection                            │
├─────────────────────────────────────────────────────────────┤
│  REVOKE (post-approval)                                     │
│  ────────                                                   │
│  • Sets verification status back to "none"                  │
│  • Removes badge from user's badges array                   │
│  • All active listings by this user become "delisted"       │
│  • Triggers push notification explaining revocation         │
│  • Admin must provide a reason (mandatory)                  │
│  • Entry logged in admin audit trail                        │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Admin Verification Decision Flow

```
                    ┌──────────────┐
                    │  Application │
                    │  arrives in  │
                    │  queue       │
                    └──────┬───────┘
                           │
                    Admin opens application
                           │
                           ▼
                    ┌──────────────┐
                    │  Review      │
                    │  documents   │
                    │  & details   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         Everything    Missing info   Red flags /
         checks out    or unclear     obviously fake
              │            │            │
              ▼            ▼            ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │  APPROVE  │ │  REQUEST  │ │  REJECT   │
       │           │ │  INFO     │ │           │
       │  Badge    │ │           │ │  Provide  │
       │  activates│ │  User     │ │  reason   │
       │  ────     │ │  notified │ │  ────     │
       │  User     │ │  to       │ │  User     │
       │  notified │ │  provide  │ │  notified │
       │           │ │  more     │ │  can      │
       │           │ │  details  │ │  re-apply │
       └───────────┘ └───────────┘ └───────────┘
```

---

## 11. Event Monetization Strategy

### 11.1 Overview

Events are a **primary revenue driver** for ComLinkr. The strategy uses a 5-step creation funnel that balances ease-of-use for free events with monetization controls for paid events.

### 11.2 The 5-Step Event Creation Funnel

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: VERIFICATION WALL (one-time)                       │
│  ─────────────────────────────                              │
│  First-time event creators must provide:                    │
│  • Full legal name                                          │
│  • Phone number                                             │
│  • Agree to Event Creator Terms of Service                  │
│                                                             │
│  This data is stored once. Returning creators skip Step 1.  │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: MANDATORY EVENT DETAILS                            │
│  ─────────────────────────────                              │
│  All fields required (no skipping):                         │
│  • Event title                                              │
│  • Date & time (start + end)                                │
│  • Location (address or virtual link)                       │
│  • Category (Music, Food, Sports, Tech, Community, etc.)    │
│  • Description (minimum 50 characters)                      │
│  • Cover image (at least one)                               │
│  • Expected attendance number                               │
├─────────────────────────────────────────────────────────────┤
│  STEP 3: TICKET TYPE SELECTION                              │
│  ───────────────────────────                                │
│                                                             │
│  ○ Free Event                                               │
│    └─ Skip to Step 5                                        │
│                                                             │
│  ○ Paid Event                                               │
│    └─ Set ticket tiers:                                     │
│       • General Admission: $__.__                           │
│       • VIP (optional):    $__.__                           │
│       • Early Bird (opt):  $__.__                           │
│                                                             │
│    Platform fee breakdown shown in real-time:               │
│    ┌───────────────────────────────────────┐                │
│    │  Ticket Price:   $25.00               │                │
│    │  Platform Fee:   -$2.00 (8%)          │                │
│    │  You Receive:    $23.00               │                │
│    └───────────────────────────────────────┘                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  STEP 4: TERMS AGREEMENT                                    │
│  ──────────────────────                                     │
│                                                             │
│  ☐ I agree to ComLinkr Event Creator Terms                  │
│  ☐ I will handle refunds per ComLinkr Refund Policy         │
│  ☐ I understand the 8% platform fee on paid tickets         │
│                                                             │
│  All three checkboxes mandatory for paid events.            │
│  Free events only require the first checkbox.               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  STEP 5: REVIEW QUEUE LOGIC                                 │
│  ────────────────────────                                   │
│                                                             │
│  Auto-publish (no review needed):                           │
│  • Free events with < 100 expected attendees                │
│                                                             │
│  Sent to admin review queue:                                │
│  • ALL paid events (regardless of size)                     │
│  • Free events with ≥ 100 expected attendees                │
│  • Events flagged by content filters                        │
│                                                             │
│  Review SLA: Admin responds within 24 hours                 │
│  Outcomes: Approve ✅ | Reject ❌ | Request Changes 💬     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Fee Structure

| Revenue Stream | Fee | Who Pays | When |
|---------------|-----|----------|------|
| **Ticket platform fee** | 8% per ticket | Deducted from organizer payout | At ticket purchase |
| **Promoted events** (future) | $5–25/day | Event organizer | Upfront |
| **Featured placement** (future) | $10–50 one-time | Event organizer | Before event date |

### 11.4 Event Review Queue (Admin Side)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN: /admin/event-review                                  │
│                                                              │
│  Filter: [All ▼] [Paid ▼] [Free-Large ▼] [Flagged ▼]       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📅 "Summer Music Festival"                            │  │
│  │  Creator: Jane Doe (verified: ✅)                      │  │
│  │  Date: July 15, 2026                                   │  │
│  │  Location: Central Park                                │  │
│  │  Expected: 500 attendees                               │  │
│  │  Ticket: $25 General / $75 VIP                         │  │
│  │  Platform Revenue: ~$2,000 (est.)                      │  │
│  │                                                        │  │
│  │  [✅ Approve]  [❌ Reject]  [💬 Request Changes]      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.5 Event Monetization Phased Rollout

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Phase E1** | Week 1–2 | Verification wall + mandatory fields + terms agreement in create-post event flow |
| **Phase E2** | Week 3–4 | Ticket type selection UI + 8% fee calculator + Stripe integration for payments |
| **Phase E3** | Week 5–6 | Admin event review queue + approval/rejection flow + notifications |
| **Phase E4** | Week 7–8 | Organizer payout dashboard + refund handling + analytics |
| **Phase E5** | Future | Promoted events + featured placement (paid advertising) |

---

## 12. Restaurant Two-Tier System

### 12.1 Overview

Restaurants on ComLinkr operate under a **two-tier model** that balances community-driven content with business monetization:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  TIER 1: COMMUNITY REVIEWS (Free)                           │
│  ─────────────────────────────                              │
│                                                             │
│  • ANY user can write a restaurant review                   │
│  • No badge required                                        │
│  • Think: Yelp-style community reviews                      │
│  • Reviews appear on the restaurant's page                  │
│  • Star ratings aggregated from community                   │
│  • Photo uploads by diners                                  │
│  • Basic info: name, location, cuisine type                 │
│                                                             │
│  Revenue: None (engagement driver)                          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TIER 2: CLAIMED BUSINESS LISTING (Paid)                    │
│  ─────────────────────────────────                          │
│                                                             │
│  • Requires VERIFIED Restaurant Owner badge                 │
│  • Owner "claims" their restaurant on ComLinkr              │
│  • Gets control panel to manage listing                     │
│  • Premium features:                                        │
│    - Official business description                          │
│    - Full menu with prices                                  │
│    - Operating hours management                             │
│    - Photo gallery (official photos)                        │
│    - Reply to reviews                                       │
│    - Special offers / promotions                            │
│    - "Verified Business" badge on listing                   │
│    - Analytics (views, clicks, direction requests)           │
│    - Priority in search results                             │
│                                                             │
│  Monthly Subscription Tiers:                                │
│  ┌─────────────────────────────────────────┐                │
│  │  🥉 Basic:   $29/mo                     │                │
│  │     Claimed listing + reply to reviews   │                │
│  │                                          │                │
│  │  🥈 Premium: $59/mo                      │                │
│  │     + Promotions + analytics + priority  │                │
│  │                                          │                │
│  │  🥇 Elite:   $99/mo                      │                │
│  │     + Featured placement + dedicated     │                │
│  │       account manager                    │                │
│  └─────────────────────────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 How It Works on the Food Tab

```
User browses Food tab
        │
        ▼
Sees restaurant cards:
┌──────────────────────────────────┐
│  🍽️ Mario's Italian Kitchen      │
│  ⭐ 4.7 (128 reviews)  ✅ Claimed │  ← Tier 2 (verified owner)
│  🇮🇹 Italian • $$ • 0.3 mi       │
│  📸 Official photos               │
│  🎁 "20% off pasta this week"     │  ← Only claimed restaurants
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  🍽️ Joe's Burger Shack           │
│  ⭐ 4.2 (34 reviews)              │  ← Tier 1 (community only)
│  🍔 American • $ • 0.8 mi        │
│  📸 Community photos               │
│  (No special offers)              │
└──────────────────────────────────┘
```

### 12.3 Restaurant Two-Tier Phased Rollout

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **Phase R1** | Week 1–2 | Community reviews feature (any user can review any restaurant) |
| **Phase R2** | Week 3–4 | Restaurant claim flow (badge application → verification → claimed listing) |
| **Phase R3** | Week 5–6 | Basic subscription tier ($29/mo) via Stripe — claimed listing + reply to reviews |
| **Phase R4** | Week 7–8 | Premium tier ($59/mo) — promotions, analytics, priority placement |
| **Phase R5** | Future | Elite tier ($99/mo) — featured placement, dedicated support |

---

## 13. Impact on Existing Screens

### 13.1 Screens That CHANGE

| Screen | File | What Changes |
|--------|------|-------------|
| **create-post.tsx** | `app/create-post.tsx` | **Already updated to 6 post types** (news, event, listing, restaurant, story, challenge) in a 3×2 grid. The grid filters listing/restaurant types based on `usePermissions()`. Locked types show a locked card with a CTA to apply for the relevant badge. Story and challenge types are always unlocked. The type-specific `PreviewModal` renders each post type matching its real feed card UI. The `handlePost()` function adds a double-check validation before submitting listing/restaurant posts, and includes the event monetization funnel for paid events. |
| **profile.tsx** | `app/profile.tsx` | Add a "My Badges" section showing active/pending/rejected badges. Add "Become a Verified Landlord" / "Register My Restaurant" / "Register as Agency" CTAs for badges the user hasn't applied for. Show a ✅ verified indicator next to the user's name if they hold any verified badge. |
| **settings.tsx** | `app/settings.tsx` | Add a "Business & Verification" section that shows current badge statuses and links to `apply-badge.tsx` or `verification-status.tsx`. |
| **auth.store.ts** | `src/store/auth.store.ts` | Expand the `User` interface to include `role`, `badges`, `verificationStatus`, and `businessProfile`. Update `signup()` and `login()` to initialize these new fields with defaults. Add new methods: `applyForBadge()`, `updateBadgeStatus()`. |
| **posts.store.ts** | `src/store/posts.store.ts` | The `addPost()` method adds a permission check — refuses to add listing/restaurant posts if the user lacks the required verified badge. |
| **_layout.tsx** | `app/_layout.tsx` | Register new stack screens: `apply-badge`, `verification-status`, `my-listings`, `my-restaurants`. |

### 13.2 Screens That CHANGE (Newly Identified)

| Screen | File | What Changes |
|--------|------|-------------|
| **Feed tab** | `app/(tabs)/feed/index.tsx` | **Already updated**: Added "Stories" tab and "Quests" tab. Quests tab renders community challenge cards with gradient headers, progress bars, type filters, and join buttons. Feed tabs now: News, Events, Stories, My Area, Polls, Quests, Trending. |
| **Food tab** | `app/(tabs)/food/index.tsx` | Will add two-tier display: "Verified Business" badge for claimed restaurants, special offer banners for Tier 2, community review submission for all users. |

### 13.3 Screens That DO NOT Change

| Screen | File | Why No Change |
|--------|------|--------------|
| **onboarding.tsx** | `app/(auth)/onboarding.tsx` | Onboarding is about community preferences. Badge applications happen later from profile/settings. The 6-step flow remains untouched. |
| **login.tsx** | `app/(auth)/login.tsx` | Login flow stays the same. Badge data comes from the stored user object during hydration. |
| **signup.tsx** | `app/(auth)/signup.tsx` | Signup creates a basic user. New fields are initialized with defaults (role: "user", badges: [], etc.). |
| **Housing tab** | `app/(tabs)/housing/index.tsx` | Everyone can BROWSE listings. The restriction is only on CREATING them. |
| **Community tab** | `app/(tabs)/community/index.tsx` | No badge-related changes. |
| **Tabs layout** | `app/(tabs)/_layout.tsx` | Tabs stay the same for all users. No tab hiding/showing based on role. |
| **chat.tsx** | `app/chat.tsx` | Chat is available to all users. |
| **favorites.tsx** | `app/favorites.tsx` | Favorites work the same for all users. |
| **notifications.tsx** | `app/notifications.tsx` | Notifications are for all users (will also deliver badge status updates). |

---

## 14. New Screens & Components

### 14.1 New Screens

| Screen | File Path | Purpose |
|--------|-----------|---------|
| **Badge Application** | `app/apply-badge.tsx` | Multi-step form for applying for a badge (landlord, restaurant owner, or agency). Accepts a `badgeType` param to pre-select the badge. |
| **Verification Status** | `app/verification-status.tsx` | Shows the current status of all badge applications — pending, verified, or rejected with reason. |
| **My Listings** | `app/my-listings.tsx` | Dashboard for verified landlords/agencies to view, edit, deactivate, and delete their own listings. Only accessible to users with verified landlord or agency badge. |
| **My Restaurants** | `app/my-restaurants.tsx` | Dashboard for verified restaurant owners to manage their listed restaurants. Only accessible to users with verified restaurant_owner badge. |
| **Event Verification** | `app/event-creator-verify.tsx` | **NEW** — One-time verification wall for first-time event creators (name, phone, terms agreement). |
| **My Events** | `app/my-events.tsx` | **NEW** — Dashboard for event creators to view their events, ticket sales, revenue, and payout status. |
| **Claim Restaurant** | `app/claim-restaurant.tsx` | **NEW** — Flow for verified restaurant owners to claim an existing community-reviewed restaurant as their business. |
| **Restaurant Dashboard** | `app/restaurant-dashboard.tsx` | **NEW** — Management dashboard for claimed restaurants: edit listing, view analytics, manage promotions, reply to reviews. |
| **Restaurant Review** | `app/write-review.tsx` | **NEW** — Community review form for any user to rate and review a restaurant. |

### 14.2 New Shared Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **BadgeIndicator** | `components/BadgeIndicator.tsx` | Small visual badge (🏠 / 🍽️ / 🏢) shown on profile, listing cards, and restaurant cards for verified users. |
| **LockedPostCard** | `components/LockedPostCard.tsx` | Card shown in create-post for post types the user cannot access. Shows the lock icon, description, and a CTA to apply. |
| **VerificationBanner** | `components/VerificationBanner.tsx` | Reusable banner shown on profile and relevant screens. Shows "⏳ Pending verification" or "✅ Verified Landlord" status. |

### 14.3 New Hook

| Hook | File Path | Purpose |
|------|-----------|---------|
| **usePermissions** | `src/shared/hooks/usePermissions.ts` | Central permission-checking hook. Reads from auth store and returns boolean flags: `canPostListing`, `canPostRestaurant`, `isVerifiedLandlord`, `isPending(badge)`, `hasBadge(badge)`, etc. All permission checks in the app go through this single hook. |

---

## 15. Data Model Changes

### 15.1 Expanded User Interface

The current `User` interface in `src/store/auth.store.ts` needs these additions:

```
CURRENT User Interface                  NEW Fields to Add
─────────────────────                   ─────────────────
id: string                              role: UserRole
name: string                            badges: UserBadge[]
username: string                        verificationStatus: Record<UserBadge, VerificationStatus>
email: string                           businessProfile?: BusinessProfile
onboardingDone: boolean
country?: string
stateProvince?: string
city?: string
culture?: string[]
interests?: string[]
communities?: string[]
```

### 15.2 New Types

| Type | Values | Purpose |
|------|--------|---------|
| `UserRole` | `"user"` \| `"admin"` \| `"superadmin"` | System-level access control |
| `UserBadge` | `"landlord"` \| `"restaurant_owner"` \| `"agency"` | Capability badges |
| `VerificationStatus` | `"none"` \| `"pending"` \| `"verified"` \| `"rejected"` | Per-badge verification state |

### 15.3 New Types for Stories, Challenges & Events (v2.0)

| Type | Values | Purpose |
|------|--------|--------|
| `PostType` | `"news"` \| `"event"` \| `"listing"` \| `"restaurant"` \| `"story"` \| `"challenge"` | All 6 post types in create-post |
| `StoryMediaType` | `"reel"` \| `"photo"` \| `"video"` | Story content format |
| `ChallengeType` | `"photo"` \| `"fitness"` \| `"food"` \| `"explore"` \| `"social"` \| `"creative"` \| `"green"` | Challenge categories |
| `TicketType` | `"free"` \| `"paid"` | Event ticket classification |
| `EventReviewStatus` | `"auto_published"` \| `"pending_review"` \| `"approved"` \| `"rejected"` | Event review queue status |
| `RestaurantTier` | `"community"` \| `"basic"` \| `"premium"` \| `"elite"` | Restaurant listing tier |

### 15.4 Story Interface

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique story ID |
| `authorId` | `string` | User who posted |
| `mediaType` | `StoryMediaType` | reel, photo, or video |
| `category` | `string` | Story category |
| `description` | `string` | Story text |
| `hashtags` | `string[]` | Associated hashtags |
| `duration` | `string` | Visibility duration |
| `location` | `string?` | Optional location |
| `createdAt` | `string` | ISO date |
| `expiresAt` | `string` | ISO date when story expires |
| `likes` | `number` | Like count |
| `comments` | `number` | Comment count |

### 15.5 CommunityChallenge Interface

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique challenge ID |
| `authorId` | `string` | User who created |
| `title` | `string` | Challenge title |
| `type` | `ChallengeType` | Challenge category |
| `details` | `string` | Description and rules |
| `duration` | `string` | Active duration |
| `goal` | `string?` | Specific goal |
| `reward` | `string?` | Prize description |
| `maxParticipants` | `number` | Max participants (0=unlimited) |
| `currentParticipants` | `number` | Current join count |
| `location` | `string?` | Optional location |
| `createdAt` | `string` | ISO date |
| `endsAt` | `string` | ISO date when challenge ends |
| `progress` | `number` | Completion percentage (0–100) |
| `likes` | `number` | Like count |
| `comments` | `number` | Comment count |

### 15.6 EventTicket Interface (v2.0)

| Field | Type | Description |
|-------|------|-------------|
| `ticketType` | `TicketType` | Free or paid |
| `tiers` | `TicketTier[]` | Array of ticket tiers |
| `platformFeePercent` | `number` | 8 (fixed) |
| `totalRevenue` | `number` | Calculated total revenue |
| `platformRevenue` | `number` | ComLinkr's 8% cut |
| `organizerPayout` | `number` | Organizer receives (92%) |
| `reviewStatus` | `EventReviewStatus` | Review queue status |

### 15.7 TicketTier Interface

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Tier name (General, VIP, Early Bird) |
| `price` | `number` | Ticket price in dollars |
| `quantity` | `number` | Available tickets |
| `sold` | `number` | Tickets sold |
| `description` | `string?` | Tier description |

### 15.8 BusinessProfile Object

| Field | Type | Required For | Description |
|-------|------|-------------|-------------|
| `businessName` | `string` | Restaurant, Agency | Legal business name |
| `businessLicense` | `string` | All badges | License/registration document reference |
| `businessPhone` | `string` | All badges | Business contact phone number |
| `businessEmail` | `string` | Restaurant, Agency | Business email address |
| `ownershipType` | `"own"` \| `"manage"` | Landlord | Whether user owns or manages the property |
| `propertyAddress` | `string` | Landlord | Address of property to be listed |
| `cuisineType` | `string` | Restaurant | Type of cuisine served |
| `restaurantAddress` | `string` | Restaurant | Physical restaurant address |
| `agencyLicense` | `string` | Agency | Agency-specific license number |
| `propertiesManaged` | `number` | Agency | Number of properties under management |
| `companyWebsite` | `string` | Agency | Company website URL |
| `documentRefs` | `string[]` | All badges | References to uploaded verification documents |
| `appliedAt` | `string` | All badges | ISO date of application submission |
| `verifiedAt` | `string` | Post-approval | ISO date when admin approved |
| `verifiedBy` | `string` | Post-approval | Admin user ID who approved |
| `rejectionReason` | `string` | Post-rejection | Reason provided by admin |

### 15.9 Expanded Listing Authorship

Currently a listing's `landlord` field is just a display object. It needs to reference the actual user account:

```
CURRENT landlord object              ADDITIONS
───────────────────                  ─────────
name: string                         userId: string        ← links to User.id
avatar?: string                      businessName?: string ← from BusinessProfile
verified: boolean                    agencyId?: string     ← if posted by agent
email?: string
phone?: string
```

The `verified` boolean should be **derived from** the user's `verificationStatus`, not manually set.

---

## 16. Storage & Persistence Strategy

### 16.1 Current Storage (No Change to Mechanism)

The app currently uses a cross-platform storage abstraction in `auth.store.ts`:

| Platform | Technology | Key |
|----------|-----------|-----|
| Native (iOS/Android) | `expo-secure-store` | `comlinkr_auth` |
| Web fallback | `localStorage` | `comlinkr_auth` |

### 16.2 Additional Storage Keys

| Key | Content | Purpose |
|-----|---------|---------|
| `comlinkr_auth` | Full `User` object (now includes role, badges, verification) | Existing — expanded with new fields |
| `comlinkr_users` | Array of all registered users | Existing — expanded with new fields |
| `comlinkr_badge_applications` | Array of badge application records | **NEW** — stores submitted applications for admin pickup |
| `comlinkr_user_listings` | Array of listings created by the current user | **NEW** — for the "My Listings" screen |
| `comlinkr_user_restaurants` | Array of restaurants created by the current user | **NEW** — for the "My Restaurants" screen |
| `comlinkr_user_stories` | Array of stories created by the current user | **NEW (v2.0)** — for story management |
| `comlinkr_user_challenges` | Array of challenges created by the current user | **NEW (v2.0)** — for challenge management |
| `comlinkr_user_events` | Array of events created by the current user | **NEW (v2.0)** — for "My Events" screen, includes ticket sales data |
| `comlinkr_event_creator_profile` | Event creator verification data (name, phone, terms agreed) | **NEW (v2.0)** — one-time verification wall data |
| `comlinkr_restaurant_reviews` | Array of community restaurant reviews | **NEW (v2.0)** — for the two-tier restaurant system |

### 16.3 Default Values for New Fields

When existing users log in or the app hydrates, any missing new fields must be initialized with safe defaults:

| Field | Default | Reason |
|-------|---------|--------|
| `role` | `"user"` | All existing users are normal users |
| `badges` | `[]` | No existing user has any badge |
| `verificationStatus` | `{ landlord: "none", restaurant_owner: "none", agency: "none" }` | No existing user has applied for anything |
| `businessProfile` | `undefined` | No existing user has business info |

This ensures **backward compatibility** — existing users won't break when the new fields are introduced.

---

## 17. Admin Panel Scope (Web Only)

The admin panel is NOT part of the mobile app. It lives in `apps/web/src/features/admin/` and is accessed via browser. Here's what needs to be **added** to the existing web admin panel to support the badge system, event monetization, and restaurant two-tier system:

### 17.1 New Admin Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Verification Queue** | `/admin/verifications` | Primary workspace for reviewing badge applications. Filterable by badge type, status, and date. Shows all application details and documents. |
| **Polls Management** | `/admin/polls` | Create and manage community polls. Set target audience (by city, community, interest). Set duration and visibility. |
| **Trending Curation** | `/admin/trending` | Manually boost or suppress content. Pin important posts. Set trending topics for specific regions. |
| **Property Verification** | `/admin/properties` | Review individual listings for accuracy. Verify photos match property. Check pricing legitimacy. Flag suspicious listings. |
| **Restaurant Verification** | `/admin/restaurants` | Verify restaurant ownership claims. Check business details. Review menu and photo accuracy. |
| **Event Review Queue** | `/admin/event-review` | **NEW (v2.0)** — Review paid and large free events before publishing. Shows creator details, ticket pricing, fee calculations, expected attendance. Approve/Reject/Request Changes. |
| **Event Analytics** | `/admin/event-analytics` | **NEW (v2.0)** — Platform-wide event revenue dashboard: total ticket sales, platform fees collected, top events by revenue, organizer payouts pending/completed. |
| **Restaurant Claims** | `/admin/restaurant-claims` | **NEW (v2.0)** — Review restaurant claim applications. Verify ownership documents. Approve/Reject claims. Manage subscription tiers. |
| **Restaurant Reviews** | `/admin/restaurant-reviews` | **NEW (v2.0)** — Moderate community restaurant reviews. Handle flagged reviews, fake review detection. |
| **Audit Log** | `/admin/audit` | Immutable log of all admin actions. Who approved/rejected which badge/event/claim. Who moderated which content. Full accountability trail. |

### 17.2 Enhancements to Existing Admin Pages

| Existing Page | Enhancement |
|---------------|-------------|
| **User Management** (`/admin/users`) | Add columns for: role, active badges, verification status. Add ability to change user role (user/admin). Add ability to revoke badges. |
| **Content Moderation** (`/admin/content`) | Add badge-related filters (e.g., show only listings from unverified users). Add "auto-flag" for listings posted by users whose badge was recently revoked. |
| **Analytics** (`/admin/analytics`) | Add metrics: badge applications per day, approval rate, time-to-verify, listings per landlord, restaurants per owner. |
| **Admin Dashboard** (`/admin`) | Add verification queue summary card showing pending count. Add badge distribution pie chart. |

---

## 18. Implementation Phases

### ── TRACK A: Badge & Authorization System ──

### Phase A1: Foundation (Estimated: 1–2 days)

**Goal:** Establish the data model and permission checking infrastructure.

| Task | File | Description |
|------|------|-------------|
| A1.1 | `src/store/auth.store.ts` | Add new types: `UserRole`, `UserBadge`, `VerificationStatus`, `BusinessProfile`. Expand `User` interface. Update `signup()` and `login()` to initialize defaults. Add migration logic in `hydrate()` for backward compatibility. |
| A1.2 | `src/shared/hooks/usePermissions.ts` | Create the central permissions hook that reads from auth store and returns capability booleans. |
| A1.3 | `src/store/auth.store.ts` | Add new methods: `applyForBadge()` and `updateBadgeStatus()`. |

### Phase A2: Create Post Gating (Estimated: 1 day)

**Goal:** Restrict listing and restaurant post types to verified badge holders.

| Task | File | Description |
|------|------|-------------|
| A2.1 | `app/create-post.tsx` | Filter `POST_TYPES` based on `usePermissions()`. Show locked cards for listing/restaurant types. Story and challenge types remain always unlocked. |
| A2.2 | `app/create-post.tsx` | Add authorization check in `handlePost()` as a safety net. |
| A2.3 | `components/LockedPostCard.tsx` | Create the locked card component with CTA to apply-badge screen. |

### Phase A3: Badge Application Flow (Estimated: 2–3 days)

**Goal:** Build the complete badge application experience.

| Task | File | Description |
|------|------|-------------|
| A3.1 | `app/apply-badge.tsx` | Build the multi-step badge application screen with form validation. |
| A3.2 | `app/verification-status.tsx` | Build the status check screen showing all badge application statuses. |
| A3.3 | `app/_layout.tsx` | Register new stack screens. |

### Phase A4: Profile & Settings Integration (Estimated: 1 day)

**Goal:** Surface badge information and application entry points in existing screens.

| Task | File | Description |
|------|------|-------------|
| A4.1 | `app/profile.tsx` | Add "My Badges" section, verified indicator, and "Become a Landlord" CTAs. |
| A4.2 | `app/settings.tsx` | Add "Business & Verification" section with links to apply-badge and verification-status. |
| A4.3 | `components/BadgeIndicator.tsx` | Create the reusable badge visual component. |
| A4.4 | `components/VerificationBanner.tsx` | Create the status banner component. |

### Phase A5: Listing & Restaurant Management (Estimated: 2 days)

**Goal:** Give verified badge holders tools to manage their own content.

| Task | File | Description |
|------|------|-------------|
| A5.1 | `app/my-listings.tsx` | Build landlord/agency listing management dashboard. |
| A5.2 | `app/my-restaurants.tsx` | Build restaurant owner management dashboard. |
| A5.3 | `app/profile.tsx` | Add links to my-listings and my-restaurants for relevant badge holders. |

### Phase A6: Web Admin — Verification Queue (Estimated: 2–3 days)

**Goal:** Build the admin interface for reviewing and actioning badge applications.

| Task | File (web) | Description |
|------|-----------|-------------|
| A6.1 | `apps/web/src/features/admin/pages/VerificationQueue.tsx` | Build the verification queue page with filters and action buttons. |
| A6.2 | `apps/web/src/features/admin/layout/AdminLayout.tsx` | Add "Verifications" to admin sidebar navigation. |
| A6.3 | `apps/web/src/app/routes/routePaths.ts` | Add new admin route paths. |
| A6.4 | `apps/web/src/app/routes/AppRoutes.tsx` | Wire up new admin routes. |

### Phase A7: Web Admin — Extended Modules (Estimated: 3–5 days)

**Goal:** Build remaining admin capabilities.

| Task | Description |
|------|-------------|
| A7.1 | Polls management page |
| A7.2 | Trending curation page |
| A7.3 | Property verification page |
| A7.4 | Restaurant verification page |
| A7.5 | Audit log page |
| A7.6 | Enhance user management with role/badge columns |
| A7.7 | Enhance analytics with badge-related metrics |

---

### ── TRACK B: Event Monetization ──

### Phase B1: Event Creator Verification Wall (Estimated: 2 days)

**Goal:** Require first-time event creators to verify their identity.

| Task | File | Description |
|------|------|-------------|
| B1.1 | `app/event-creator-verify.tsx` | Build the one-time verification wall screen (full name, phone, terms agreement). |
| B1.2 | `app/create-post.tsx` | Integrate verification wall check before event creation form. If not verified, redirect to `event-creator-verify.tsx`. |
| B1.3 | `src/store/auth.store.ts` | Add `eventCreatorProfile` to User interface and storage. Add `verifyEventCreator()` method. |

### Phase B2: Mandatory Event Fields & Terms (Estimated: 1 day)

**Goal:** Enforce comprehensive event details for all events.

| Task | File | Description |
|------|------|-------------|
| B2.1 | `app/create-post.tsx` | Make all event fields mandatory (title, date, time, location, category, description 50+ chars, cover image, expected attendance). |
| B2.2 | `app/create-post.tsx` | Add terms agreement checkboxes before event submission. Free events: 1 checkbox. Paid events: 3 checkboxes. |

### Phase B3: Ticket Type Selection & Fee Calculator (Estimated: 3–4 days)

**Goal:** Enable paid ticket creation with transparent fee display.

| Task | File | Description |
|------|------|-------------|
| B3.1 | `app/create-post.tsx` | Add ticket type selector (free/paid) to event creation form. |
| B3.2 | `app/create-post.tsx` | Build ticket tier form (General/VIP/Early Bird) with real-time 8% fee calculator. |
| B3.3 | `src/store/events.store.ts` | **NEW** — Create events store with ticket management, fee calculations, and event CRUD. |
| B3.4 | Integration | Stripe Connect integration for organizer payouts (placeholder for backend). |

### Phase B4: Event Review Queue (Estimated: 2–3 days)

**Goal:** Admin review pipeline for paid and large events.

| Task | File | Description |
|------|------|-------------|
| B4.1 | `app/create-post.tsx` | Implement review queue routing logic: auto-publish for small free events, queue for paid/large events. |
| B4.2 | `apps/web/src/features/admin/pages/EventReview.tsx` | Build admin event review queue with approve/reject/request-changes actions. |
| B4.3 | `app/my-events.tsx` | Build event creator dashboard showing event status, ticket sales, and revenue. |

### Phase B5: Event Monetization Advanced Features (Estimated: 3–5 days)

**Goal:** Organizer payouts, refunds, and promoted events.

| Task | Description |
|------|-------------|
| B5.1 | Organizer payout dashboard (view earnings, request payouts, transaction history) |
| B5.2 | Refund handling flow (organizer-initiated, attendee-requested, auto-refund on cancellation) |
| B5.3 | Promoted events advertising system ($5–25/day for boosted visibility) |
| B5.4 | Admin event analytics dashboard (platform revenue, fee collection, top organizers) |

---

### ── TRACK C: Restaurant Two-Tier System ──

### Phase C1: Community Reviews (Estimated: 2–3 days)

**Goal:** Allow any user to write restaurant reviews.

| Task | File | Description |
|------|------|-------------|
| C1.1 | `app/write-review.tsx` | Build community review form (star rating, text review, photo upload). |
| C1.2 | `app/(tabs)/food/index.tsx` | Add review count, aggregate rating, and "Write Review" CTA to restaurant cards. |
| C1.3 | `src/store/restaurants.store.ts` | Expand with review submission and aggregation methods. |

### Phase C2: Restaurant Claiming (Estimated: 2–3 days)

**Goal:** Allow verified restaurant owners to claim their business.

| Task | File | Description |
|------|------|-------------|
| C2.1 | `app/claim-restaurant.tsx` | Build restaurant claim flow (select restaurant → verify ownership → badge application). |
| C2.2 | `app/(tabs)/food/index.tsx` | Add "✅ Claimed" badge and "Verified Business" indicator to claimed restaurant cards. |
| C2.3 | `apps/web/src/features/admin/pages/RestaurantClaims.tsx` | Admin review queue for restaurant claim applications. |

### Phase C3: Basic Subscription Tier — $29/mo (Estimated: 3–4 days)

**Goal:** Launch first paid restaurant tier.

| Task | File | Description |
|------|------|-------------|
| C3.1 | `app/restaurant-dashboard.tsx` | Build claimed restaurant management dashboard (edit listing, reply to reviews). |
| C3.2 | Integration | Stripe subscription billing for $29/mo Basic tier. |
| C3.3 | `app/(tabs)/food/index.tsx` | Differentiate Tier 1 (community) vs. Tier 2 (claimed) in restaurant cards. |

### Phase C4: Premium & Elite Tiers (Estimated: 3–5 days)

**Goal:** Launch advanced paid tiers.

| Task | Description |
|------|-------------|
| C4.1 | Premium tier ($59/mo): promotions, analytics, priority placement |
| C4.2 | Elite tier ($99/mo): featured placement, dedicated account manager |
| C4.3 | Admin restaurant analytics dashboard |
| C4.4 | Subscription management (upgrade/downgrade/cancel) |

---

### ── TRACK D: Content Types (✅ ALREADY IMPLEMENTED IN UI) ──

> **Note:** Stories and Challenges UI has already been built in the current sprint.
> The following tracks are for backend integration and polish.

### Phase D1: Stories Backend Integration (Estimated: 1–2 days)

| Task | Status | Description |
|------|--------|-------------|
| D1.1 | ✅ DONE | Story post type in create-post.tsx (media type, category, description, hashtags, duration, location) |
| D1.2 | ✅ DONE | Story preview card in PreviewModal |
| D1.3 | ✅ DONE | Stories tab in feed |
| D1.4 | Pending | Stories store (`src/store/stories.store.ts`) with expiry logic |
| D1.5 | Pending | Story feed rendering with actual data from store |
| D1.6 | Pending | Story expiry handling (auto-hide expired stories) |

### Phase D2: Challenges/Quests Backend Integration (Estimated: 2–3 days)

| Task | Status | Description |
|------|--------|-------------|
| D2.1 | ✅ DONE | Challenge post type in create-post.tsx (type, details, duration, goal, reward, max participants) |
| D2.2 | ✅ DONE | Challenge preview card in PreviewModal |
| D2.3 | ✅ DONE | Quests tab in feed with gradient headers, progress bars, type filters, join buttons |
| D2.4 | Pending | Challenges store (`src/store/challenges.store.ts`) with join/leave/progress logic |
| D2.5 | Pending | Challenge feed rendering with actual data from store |
| D2.6 | Pending | Challenge completion tracking and reward distribution |
| D2.7 | Pending | Challenge leaderboard |

---

## 19. Edge Cases & Error Handling

### 19.1 Backward Compatibility

| Scenario | Handling |
|----------|---------|
| Existing user logs in (no role/badges fields in storage) | `hydrate()` applies safe defaults: `role: "user"`, `badges: []`, `verificationStatus: { landlord: "none", restaurant_owner: "none", agency: "none" }` |
| Existing user had posted listings before badge system | Those listings remain visible. Future listing creation requires badge. Consider a grace period or migration notice. |

### 19.2 Application Edge Cases

| Scenario | Handling |
|----------|---------|
| User applies for same badge twice while pending | Blocked — show "You already have a pending application" message |
| User applies for badge, gets rejected, re-applies | Allowed — creates a fresh application. Old rejection reason is kept in history. |
| User has verified landlord badge, applies for agency | Allowed — badges are independent. Each has its own verification pipeline. |
| User logs out while application is pending | Application persists. On next login, badge status is restored from stored user data. |
| Admin revokes a badge from a user who has active listings | All that user's listings are marked as "delisted" / hidden. User is notified with reason. |

### 19.3 Event Monetization Edge Cases (v2.0)

| Scenario | Handling |
|----------|----------|
| Event creator sets $0 price on a "paid" ticket tier | Validation error — price must be > $0 for paid events. Suggest switching to free. |
| Paid event is rejected after tickets already sold | Cannot happen — review happens before event goes live and tickets become available. |
| Event is cancelled after tickets sold | Organizer must process refunds (automated full refund). Platform fee is refunded to organizer. |
| Organizer disputes 8% fee | Fee is non-negotiable and agreed upon in Step 4 terms. No exceptions. |
| Free event changes to paid after publishing | Not allowed — must create a new event. Prevents bait-and-switch. |
| Stripe integration unavailable | Paid events temporarily disabled. Only free events can be created. Show banner explaining. |

### 19.4 Restaurant Two-Tier Edge Cases (v2.0)

| Scenario | Handling |
|----------|----------|
| Restaurant already claimed by another user | Show "This restaurant has already been claimed" with contact support link. |
| Subscription lapses (non-payment) | Downgrade to community tier. Claimed features disabled. 7-day grace period before removal. |
| User writes fake review | Community flagging + admin moderation. Pattern detection for review bombing. |
| Restaurant owner disputes a community review | Owner can report review for admin review. Cannot directly delete community reviews. |
| Multiple claim applications for same restaurant | Admin reviews all applications. Only one can be approved. Others rejected with reason. |

### 19.5 Stories & Challenges Edge Cases (v2.0)

| Scenario | Handling |
|----------|----------|
| Story duration expires while user is viewing it | Story remains visible until user navigates away. Then removed from feed on next refresh. |
| Challenge max participants reached | "Challenge Full" state. Waitlist optional (future feature). |
| Challenge creator wants to extend duration | Allowed — extends `endsAt` date. Participants notified. |
| Inappropriate story/challenge content | Community flagging → admin moderation. Same content moderation pipeline as news posts. |

### 19.6 Error Handling in create-post

| Scenario | Handling |
|----------|---------|
| UI shows unlocked listing card but user's badge was revoked between screen open and post attempt | `handlePost()` does a fresh permission check from the store before submitting. Shows alert if permission is revoked. |
| Storage write fails during badge application | Show retry prompt. Do not mark application as submitted. Keep form state so user can retry without re-entering data. |
| Document upload fails | Show specific error for the failed upload. Allow user to retry individual file uploads without restarting the entire application. |

---

## 20. Future Considerations

### 20.1 Backend Integration

This entire plan currently works with local storage (matching the current app architecture). When a backend is added:

- Badge applications become API calls (`POST /api/badges/apply`)
- Verification status is fetched from server (`GET /api/badges/status`)
- Admin actions are server-side mutations (`POST /api/admin/badges/:id/approve`)
- Push notifications for status changes come from server
- Document uploads go to cloud storage (S3/Azure Blob) via signed URLs

### 20.2 Real-Time Status Updates

- When backend is available, use WebSocket or polling to update badge status in real-time
- User opens app → check for status changes → update local state → show notification if status changed

### 20.3 Badge Analytics for Badge Holders

- Landlords: listing views, inquiry count, favorites count per property
- Restaurant owners: menu views, direction requests, review count
- Agencies: portfolio performance, response time metrics

### 20.4 Badge Tiers (Future)

- Landlord Bronze (1–3 listings) → Silver (4–10) → Gold (10+)
- Higher tiers = priority placement in search, premium badge icon
- Tiers unlock based on volume + positive ratings

### 20.5 Team/Agent Support Under Agency Badge

- Agency account holder can invite agents (sub-accounts)
- Each agent can post listings under the agency umbrella
- Agency owner sees all listings posted by their agents
- Requires a separate team management screen (future scope)

### 20.6 Automated Verification (AI-Assisted)

- OCR on uploaded business license documents
- Cross-reference business registration numbers with public databases
- AI flags suspicious applications (fake documents, known scam patterns)
- Admin still makes final decision but AI pre-screens to speed up the queue

### 20.7 Sponsored Stories & Challenges (Future Monetization)

- Businesses can create "Sponsored Stories" — paid placement in Stories tab
- Businesses can sponsor community challenges ("Brought to you by Local Café")
- Challenge sponsors get brand placement in challenge card gradient header
- Pricing: $10–50/day for sponsored stories, $25–100 per sponsored challenge
- Revenue from sponsored content goes 100% to ComLinkr

### 20.8 Event Ecosystem Expansion

- Recurring events (weekly/monthly automatic re-creation)
- Event series (multi-day festivals, conference tracks)
- Co-hosted events (multiple organizers, split revenue)
- Event ticketing QR codes for check-in at the door
- Attendee networking features (who else is going?)
- Post-event reviews and ratings of organizers

### 20.9 Restaurant Ecosystem Expansion

- Online ordering integration (partner with delivery services)
- Table reservation system
- Digital menu with QR code generation
- Loyalty programs for claimed restaurants
- Restaurant-to-restaurant partnerships (food trails, neighborhood guides)

---

## Appendix A: File Map Summary

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx                 ← No changes
│   │   ├── signup.tsx                ← No changes
│   │   └── onboarding.tsx            ← No changes
│   ├── (tabs)/
│   │   ├── feed/index.tsx            ← ✅ MODIFIED: Added Stories + Quests tabs
│   │   ├── housing/index.tsx         ← No changes (browse is open)
│   │   ├── food/index.tsx            ← MODIFY: Add two-tier display + reviews
│   │   ├── community/index.tsx       ← No changes
│   │   └── _layout.tsx               ← No changes
│   ├── create-post.tsx               ← ✅ MODIFIED: 6 post types (3×2 grid),
│   │                                    type-specific PreviewModal, story +
│   │                                    challenge forms. TODO: badge gating,
│   │                                    event monetization funnel
│   ├── profile.tsx                   ← MODIFY: Add badges section & CTAs
│   ├── settings.tsx                  ← MODIFY: Add business/verification section
│   ├── apply-badge.tsx               ← NEW: Badge application flow
│   ├── verification-status.tsx       ← NEW: Badge status checker
│   ├── my-listings.tsx               ← NEW: Landlord listing management
│   ├── my-restaurants.tsx            ← NEW: Restaurant management
│   ├── event-creator-verify.tsx      ← NEW (v2.0): Event creator verification wall
│   ├── my-events.tsx                 ← NEW (v2.0): Event creator dashboard
│   ├── claim-restaurant.tsx          ← NEW (v2.0): Restaurant claim flow
│   ├── restaurant-dashboard.tsx      ← NEW (v2.0): Claimed restaurant management
│   ├── write-review.tsx              ← NEW (v2.0): Community restaurant review
│   └── _layout.tsx                   ← MODIFY: Register all new screens
├── components/
│   ├── BadgeIndicator.tsx            ← NEW: Visual badge component
│   ├── LockedPostCard.tsx            ← NEW: Locked post type card
│   └── VerificationBanner.tsx        ← NEW: Status banner
└── src/
    ├── store/
    │   ├── auth.store.ts             ← MODIFY: Expand User, add badge methods,
    │   │                                event creator profile
    │   ├── posts.store.ts            ← MODIFY: Add permission check in addPost
    │   ├── events.store.ts           ← NEW (v2.0): Event ticketing & monetization
    │   ├── stories.store.ts          ← NEW (v2.0): Story lifecycle & expiry
    │   ├── challenges.store.ts       ← NEW (v2.0): Challenge join/progress/completion
    │   └── restaurants.store.ts      ← MODIFY (v2.0): Add reviews, claiming, tiers
    └── shared/
        └── hooks/
            └── usePermissions.ts     ← NEW: Central permission hook
```

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Badge** | An additive capability token attached to a user account. Unlocks specific post types and management features. |
| **Verification** | The admin-driven process of reviewing and approving a badge application. |
| **Role** | System-level access designation (user, admin, superadmin). Separate from badges. |
| **Capability** | A specific action a user can perform, gated by badge + verification status. |
| **Gating** | The practice of showing locked UI elements for features the user cannot access yet, with a clear path to unlocking them. |
| **Badge Holder** | A user who has been verified for at least one badge type. |
| **Pending** | A badge application that has been submitted but not yet reviewed by an admin. |
| **Revocation** | Admin removal of a previously verified badge, typically due to policy violations. |
| **Story** | Short-form content (photo/video/reel) with configurable expiry duration. Free for all users. |
| **Challenge/Quest** | Gamified community activity with goals, progress tracking, and optional rewards. Free for all users. |
| **Verification Wall** | One-time identity verification required for event creators before they can create events. |
| **Review Queue** | Admin pipeline where paid events and large free events wait for approval before publishing. |
| **Platform Fee** | 8% fee deducted from paid event ticket sales, retained by ComLinkr as revenue. |
| **Community Review** | Free restaurant review written by any user (Tier 1). No badge required. |
| **Claimed Listing** | Restaurant officially claimed and managed by a verified restaurant owner (Tier 2). Requires badge + paid subscription. |
| **Two-Tier System** | Restaurant architecture with free community reviews (Tier 1) and paid claimed business listings (Tier 2). |

---

*This document is the single source of truth for the badge-based authorization, monetization, and content system in the ComLinkr mobile app. All implementation work should reference this plan. Version 2.0 — Updated March 3, 2026.*
