# ComLinkr Marketplace Authorization & Verification — Housing + Restaurants

> **Version:** 1.0  
> **Date:** March 3, 2026  
> **Parent Document:** [`BADGE_AUTHORIZATION_PLAN.md`](./BADGE_AUTHORIZATION_PLAN.md) v2.0  
> **Scope:** Mobile App (`apps/mobile/`) — Housing Listings, Rental Agreement Flow, Restaurant Listings  
> **Status:** Planning Phase  
> **Market Focus:** UK-first (expandable to other markets)

---

## How This Document Relates to the Badge Plan

The [BADGE_AUTHORIZATION_PLAN.md](./BADGE_AUTHORIZATION_PLAN.md) defines the **identity & role architecture** — WHO can do WHAT based on badges (Landlord 🏠, Restaurant Owner 🍽️, Agency 🏢). This document goes deeper into the **operational flows** — HOW housing and restaurant features actually work once a user has (or doesn't have) the right badge. Think of it as:

```
BADGE_AUTHORIZATION_PLAN.md  →  The "WHO" — roles, badges, permissions, gating
THIS DOCUMENT                →  The "HOW" — verification layers, rental agreements,
                                 UK agency integration, restaurant claim flow,
                                 property/restaurant verification pipelines
```

**Cross-references to Badge Plan sections are marked with `→ BP §X.X`** throughout this document.

---

## Table of Contents

1. [Questions This Document Answers](#1-questions-this-document-answers)
2. [Housing — Complete Authorization & Flow](#2-housing--complete-authorization--flow)
   - 2.1 [Who Can Post Listings (3-Tier Model)](#21-who-can-post-listings-3-tier-model)
   - 2.2 [UK Agency Flow & Companies House Integration](#22-uk-agency-flow--companies-house-integration)
   - 2.3 [Property Verification Pipeline (Is the Listing Real?)](#23-property-verification-pipeline-is-the-listing-real)
   - 2.4 [Listing Verification Badge Levels](#24-listing-verification-badge-levels)
   - 2.5 [Complete Rental Agreement Flow (8 Steps)](#25-complete-rental-agreement-flow-8-steps)
   - 2.6 [Digital Tenancy Agreement — UK AST Template](#26-digital-tenancy-agreement--uk-ast-template)
   - 2.7 [What ComLinkr Is NOT (Legal Boundaries)](#27-what-comlinkr-is-not-legal-boundaries)
3. [UK Agencies — Deep Integration](#3-uk-agencies--deep-integration)
   - 3.1 [Agency Dashboard & Multi-Agent Support](#31-agency-dashboard--multi-agent-support)
   - 3.2 [Agency Profile Page](#32-agency-profile-page)
   - 3.3 [Future: Rightmove/Zoopla Feed Import](#33-future-rightmovezoopla-feed-import)
4. [Restaurants — Complete Authorization & Flow](#4-restaurants--complete-authorization--flow)
   - 4.1 [Hybrid Model (Verified Owners + Community Recommendations)](#41-hybrid-model-verified-owners--community-recommendations)
   - 4.2 [Restaurant Verification Pipeline (UK)](#42-restaurant-verification-pipeline-uk)
   - 4.3 [The Claim Flow (Community Recommendation → Verified Listing)](#43-the-claim-flow-community-recommendation--verified-listing)
5. [Verification APIs & Data Sources (UK)](#5-verification-apis--data-sources-uk)
6. [Data Model Additions](#6-data-model-additions)
7. [New Screens & Components](#7-new-screens--components)
8. [Integration with Badge Plan — Permission Matrix Extension](#8-integration-with-badge-plan--permission-matrix-extension)
9. [Implementation Phases](#9-implementation-phases)
10. [Summary — The Complete ComLinkr Marketplace Model](#10-summary--the-complete-comlinkr-marketplace-model)

---

## 1. Questions This Document Answers

| # | Question | Section |
|---|----------|---------|
| Q1 | Who can post housing listings? Landlords? Agencies? Regular users? | [§2.1](#21-who-can-post-listings-3-tier-model) |
| Q2 | How do you verify that a listed property is real and not a scam? | [§2.3](#23-property-verification-pipeline-is-the-listing-real) |
| Q3 | When a tenant wants a property, what's the agreement flow? | [§2.5](#25-complete-rental-agreement-flow-8-steps) |
| Q4 | UK is agency-dominated — how do we handle both agencies and individual landlords? | [§2.2](#22-uk-agency-flow--companies-house-integration), [§3](#3-uk-agencies--deep-integration) |
| Q5 | Should any user add restaurants, or only verified owners? | [§4.1](#41-hybrid-model-verified-owners--community-recommendations) |

---

## 2. Housing — Complete Authorization & Flow

### 2.1 Who Can Post Listings (3-Tier Model)

> **Links to Badge Plan:** → BP §4.1 (Role vs Badge), → BP §5.1 (Landlord Badge), → BP §5.3 (Agency Badge), → BP §8.1 (Permission Matrix)

Three tiers of property posters, directly mapping to the badge system:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│  TIER 1: VERIFIED AGENCY 🏢                                                         │
│  ─────────────────────────                                                          │
│  Who: Lettings agencies (Foxtons, OpenRent, local agents, estate agents)             │
│                                                                                     │
│  Badge Required: "agency" → BP §5.3                                                 │
│                                                                                     │
│  Verification:                                                                      │
│  ├── Business license upload (scanned PDF/photo)                                    │
│  ├── Companies House registration number (CRN)                                      │
│  │   └── Auto-verified via Companies House API (free, public)                       │
│  ├── Agency website URL                                                             │
│  ├── ARLA Propertymark / NAEA membership number (optional, boosts trust)            │
│  └── Primary contact person (name, title, direct phone)                             │
│                                                                                     │
│  Posting Rights:                                                                    │
│  ├── Unlimited listings (no cap)                                                    │
│  ├── "Verified Agency" badge on all listings                                        │
│  ├── Priority placement in search results                                           │
│  ├── Bulk upload support (CSV/spreadsheet import)                                   │
│  ├── Agency branding (logo + name on every listing card)                            │
│  └── Multi-agent support (invite team members under agency account)                 │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  TIER 2: VERIFIED LANDLORD 🏠                                                       │
│  ───────────────────────────                                                        │
│  Who: Individual property owners listing their own properties                        │
│                                                                                     │
│  Badge Required: "landlord" → BP §5.1                                               │
│                                                                                     │
│  Verification:                                                                      │
│  ├── Government-issued ID (passport, driving licence, BRP card)                     │
│  ├── Proof of ownership (ONE of):                                                   │
│  │   ├── HM Land Registry title document                                            │
│  │   ├── Mortgage statement showing property address                                │
│  │   ├── Council tax bill in landlord's name                                        │
│  │   └── Landlord insurance certificate                                             │
│  ├── Address match (document address matches listed property)                        │
│  └── Phone number (mandatory, for tenant contact)                                   │
│                                                                                     │
│  Posting Rights:                                                                    │
│  ├── Can post their own properties (up to 5 active listings)                        │
│  ├── "Verified Landlord" badge on profile + listings                                │
│  ├── Access to "My Listings" management screen                                      │
│  └── Listing analytics (views, inquiries, favorites — future)                       │
│                                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  TIER 3: REGULAR USER 👤                                                             │
│  ────────────────────────                                                           │
│  Who: Any ComLinkr community member (the 99%)                                       │
│                                                                                     │
│  Badge Required: None                                                               │
│                                                                                     │
│  Capabilities:                                                                      │
│  ├── Browse all housing listings                                                    │
│  ├── Save/favourite properties                                                      │
│  ├── Send enquiry messages to landlords/agencies                                    │
│  ├── Schedule viewings (via in-app calendar)                                        │
│  ├── Submit rental applications                                                     │
│  ├── Leave reviews on properties & landlords (after tenancy)                        │
│  └── Report suspicious listings                                                     │
│                                                                                     │
│  CANNOT:                                                                            │
│  ├── Post property listings                                                         │
│  ├── Claim to be a landlord/agency without verification                             │
│  └── Access listing management features                                             │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Why this model prevents scam listings:** Only people who PROVE they own or manage properties can post them. Regular users are tenants/seekers only. Every listing traces back to a verified identity.

### 2.2 UK Agency Flow & Companies House Integration

> The UK rental market is dominated by lettings agencies, not individual landlords. ComLinkr handles both, with a specific agency onboarding path.

**Agency Sign-Up Flow:**

```
Agency representative visits ComLinkr
                │
                ▼
Signs up as regular user (standard flow)
                │
                ▼
Navigates to Profile → "Register as an Agency"
(or taps locked "Add Listing" in create-post)
                │
                ▼
        ┌───────────────────────────────────────────┐
        │  STEP 1: Agency Details                    │
        │                                            │
        │  • Agency name: [Foxtons Ltd            ] │
        │  • Companies House #: [12345678         ] │
        │  • Agency website: [foxtons.co.uk       ] │
        │  • ARLA membership #: [optional         ] │
        │  • Primary contact: [John Smith, Director]│
        │  • Business phone: [020 7000 0000       ] │
        │  • Business email: [john@foxtons.co.uk  ] │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  STEP 2: Auto-Verification                 │
        │                                            │
        │  ComLinkr queries Companies House API:     │
        │  GET /company/12345678                     │
        │                                            │
        │  ✅ Company exists                          │
        │  ✅ Company status: Active                  │
        │  ✅ Company name matches: "FOXTONS LTD"    │
        │  ✅ SIC code: 68310 (Real estate agencies) │
        │                                            │
        │  Auto-verification PASSED                  │
        │  (If failed → falls to manual review)      │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  STEP 3: Document Upload                   │
        │                                            │
        │  • Business registration certificate       │
        │  • Professional indemnity insurance proof   │
        │  • Client money protection certificate     │
        │    (required for UK agents holding          │
        │     tenant deposits)                       │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  STEP 4: Admin Review                      │
        │  (→ BP §10 Admin Verification Pipeline)    │
        │                                            │
        │  Admin sees:                               │
        │  • Companies House API result (auto)       │
        │  • Uploaded documents                      │
        │  • SIC code match                          │
        │  • Website cross-check                     │
        │                                            │
        │  → Approve / Reject / Request More Info    │
        └───────────────────┬───────────────────────┘
                            │
                       ✅ Approved
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  Agency gets:                              │
        │  • "Verified Agency" 🏢 badge              │
        │  • Agency Dashboard (bulk upload, manage)  │
        │  • Can post unlimited listings             │
        │  • Priority in search results              │
        │  • Can invite agents under the account     │
        └───────────────────────────────────────────┘
```

**Individual Landlord Flow (lighter verification):**

```
Landlord taps "I'm a Property Owner" → BP §9.2 (apply-badge.tsx)
                │
                ▼
Uploads: Gov ID + ONE proof of ownership
(Land Registry doc OR mortgage statement OR council tax bill)
                │
                ▼
Admin reviews documents (manual)
                │
                ▼
✅ Approved → "Verified Landlord" 🏠 badge
   Can post up to 5 active listings
```

### 2.3 Property Verification Pipeline (Is the Listing Real?)

> This is SEPARATE from verifying the person (§2.1). This verifies the PROPERTY itself.

**Multi-layer verification — each listing goes through these checks:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  LAYER 1: ADDRESS VALIDATION (Automatic)                                        │
│  ─────────────────────────────────────────                                      │
│                                                                                 │
│  • Landlord enters property postcode + address                                  │
│  • ComLinkr validates via:                                                      │
│    ├── UK Postcode API (postcodes.io — free, open source)                       │
│    │   └── Confirms postcode exists and matches region                          │
│    ├── Google Places API / Ordnance Survey Places API                           │
│    │   └── Confirms street address exists at that postcode                      │
│    └── Royal Mail PAF (Postcode Address File) — premium, most accurate          │
│                                                                                 │
│  Result: ✅ Address confirmed / ❌ Address not found (listing flagged)            │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 2: PHOTO VERIFICATION (Automatic + AI)                                   │
│  ──────────────────────────────────────────────                                 │
│                                                                                 │
│  • Landlord uploads property photos                                             │
│  • ComLinkr checks:                                                             │
│    ├── EXIF metadata extraction                                                 │
│    │   ├── GPS coordinates → do they match the listed address? (within 500m)    │
│    │   ├── Date taken → photos less than 6 months old?                          │
│    │   └── Camera model → consistent across photos?                             │
│    ├── Reverse image search (Google Vision API / TinEye API)                    │
│    │   └── Flag if photos appear on other listing sites (possible copy)         │
│    ├── AI stock photo detection                                                 │
│    │   └── Flag professional stock photography (too perfect = suspicious)       │
│    └── Duplicate detection                                                      │
│        └── Have these exact photos been used in another ComLinkr listing?       │
│                                                                                 │
│  Result: ✅ Photos appear original / ⚠️ Flagged for review / ❌ Stock detected   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 3: EPC CERTIFICATE CHECK (UK-Specific, Automatic)                        │
│  ────────────────────────────────────────────────────────                       │
│                                                                                 │
│  In the UK, every rental property MUST have an Energy Performance Certificate.  │
│  This is a legal requirement (The Energy Performance of Buildings Regulations). │
│                                                                                 │
│  • Landlord uploads EPC certificate or enters EPC reference number              │
│  • ComLinkr cross-checks against the public EPC Register:                       │
│    └── Open data from gov.uk: https://epc.opendatacommunities.org/             │
│                                                                                 │
│  Verification:                                                                  │
│  ├── EPC address matches listing address? ✅                                     │
│  ├── EPC is not expired? (valid for 10 years) ✅                                 │
│  ├── EPC rating extracted and displayed on listing (A–G scale) ✅                │
│  └── If no valid EPC → listing shows "⚠️ No EPC on file" warning                │
│                                                                                 │
│  This alone eliminates most scam listings — fake properties don't have EPCs.    │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 4: COMMUNITY FLAGGING (User-Driven)                                      │
│  ──────────────────────────────────────────                                     │
│                                                                                 │
│  • Any user can tap "Report" → "Suspicious Listing"                             │
│  • Report reasons:                                                              │
│    ├── "This property doesn't exist at this address"                            │
│    ├── "Photos don't match the actual property"                                 │
│    ├── "I was asked to pay before viewing"                                      │
│    ├── "Landlord asked for payment outside ComLinkr"                            │
│    ├── "This is a duplicate listing"                                            │
│    └── "Other concern" (free text)                                              │
│                                                                                 │
│  Threshold: If 3+ unique users flag a listing → auto-hidden + manual review     │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 5: VERIFIED VISIT (Premium / Optional)                                   │
│  ─────────────────────────────────────────────                                  │
│                                                                                 │
│  Physical verification — the gold standard.                                     │
│                                                                                 │
│  Option A: Self-Verification                                                    │
│  └── Landlord/agent takes geotagged photos/video from inside the property       │
│      using ComLinkr's in-app camera (enforces GPS + timestamp overlay)          │
│                                                                                 │
│  Option B: ComLinkr Partner Visit (future)                                      │
│  └── A local ComLinkr-verified partner physically visits the property,          │
│      takes photos, confirms it exists and matches the listing                   │
│                                                                                 │
│  Result: ⭐ "Physically Verified" stamp on listing — highest trust level         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Listing Verification Badge Levels

Each listing displays a verification level based on which checks have passed:

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  🔵 BASIC VERIFIED                                                     │
│  ─────────────────                                                     │
│  Requirements:                                                         │
│  ├── Poster is a verified landlord or agency (→ BP §5.1 / §5.3)       │
│  └── Address validation passed (Layer 1)                               │
│                                                                        │
│  Display: 🔵 "Basic Verified" pill on listing card                     │
│  Trust level: Standard — poster is legitimate, address exists           │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  🟢 VERIFIED                                                           │
│  ────────────                                                          │
│  Requirements:                                                         │
│  ├── All of Basic Verified, PLUS:                                      │
│  ├── Valid EPC certificate uploaded and cross-checked (Layer 3)        │
│  └── Photos pass automated checks (Layer 2) — no flags                 │
│                                                                        │
│  Display: 🟢 "Verified" pill on listing card + EPC rating shown        │
│  Trust level: High — property is real, documented, and photographed    │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ⭐ FULLY VERIFIED                                                     │
│  ──────────────────                                                    │
│  Requirements:                                                         │
│  ├── All of Verified, PLUS:                                            │
│  └── Physical visit confirmation (Layer 5) — geotagged evidence        │
│                                                                        │
│  Display: ⭐ "Fully Verified" gold pill + "Physically Inspected" tag   │
│  Trust level: Maximum — someone has physically been to this property    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**How verification levels appear on listing cards:**

```
┌──────────────────────────────────────────────┐
│  📸 [Property Photo]                          │
│  ┌────────────────────────────┐               │
│  │ ⭐ Fully Verified           │ ← Gold pill  │
│  └────────────────────────────┘               │
│                                               │
│  🏠 2 Bed Flat, Clapham SW4                   │
│  £1,650/mo  •  2🛏️  1🛁  •  EPC: C           │
│                                               │
│  Posted by: Foxtons ✅ Verified Agency         │
│  ──────────────────────────────               │
│  💬 Enquire  |  ❤️ Save  |  📅 Book Viewing   │
└──────────────────────────────────────────────┘
```

### 2.5 Complete Rental Agreement Flow (8 Steps)

> This is the end-to-end journey from discovering a property to moving in.

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  STEP 1: DISCOVERY                                                             ║
║  ─────────────────                                                             ║
║                                                                                ║
║  User browses Housing tab → filters by area, price, bedrooms                   ║
║  Finds a property they like → taps listing card to view details                ║
║  Taps "I'm Interested" button                                                  ║
║                                                                                ║
║  What happens:                                                                 ║
║  • Property saved to user's "Interested" list                                  ║
║  • Landlord/agency receives notification: "New interest in [property]"         ║
║  • Interest count visible to landlord (helps gauge demand)                     ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 2: ENQUIRY                                                               ║
║  ────────────────                                                              ║
║                                                                                ║
║  User taps "Send Enquiry" → in-app chat opens between user and landlord        ║
║                                                                                ║
║  What the landlord sees about the enquiring user:                              ║
║  ├── Profile photo + name + community score                                    ║
║  ├── How long they've been on ComLinkr                                         ║
║  ├── Verified identity status (if they have any badges)                        ║
║  ├── Number of communities they belong to                                      ║
║  └── Previous landlord ratings (if any — builds trust over time)               ║
║                                                                                ║
║  Chat features:                                                                ║
║  ├── Text messages                                                             ║
║  ├── Photo sharing (e.g., user sends current tenancy reference)                ║
║  ├── Quick replies: "When can I view?" / "Is this still available?"            ║
║  └── Chat is property-specific (appears under that listing)                    ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 3: VIEWING                                                               ║
║  ────────────────                                                              ║
║                                                                                ║
║  Landlord/user agree on a viewing time via chat                                ║
║  In-app calendar booking:                                                      ║
║  ├── Landlord sets available viewing slots                                     ║
║  ├── User picks a slot → both get calendar event + reminder                    ║
║  ├── Push notification 1 hour before viewing                                   ║
║  └── Map directions to property from user's current location                   ║
║                                                                                ║
║  After viewing, user updates status:                                           ║
║  ├── "Still Interested" → moves to Application stage                           ║
║  ├── "Not for me" → property removed from interest list                        ║
║  └── Optional: leave a note (visible only to themselves)                       ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 4: APPLICATION                                                           ║
║  ──────────────────                                                            ║
║                                                                                ║
║  User taps "Apply for this Property" → application form opens                  ║
║                                                                                ║
║  Application fields:                                                           ║
║  ├── Full legal name                                                           ║
║  ├── Current address                                                           ║
║  ├── Employment status (employed / self-employed / student / retired / other)   ║
║  ├── Employer name + contact (if employed)                                     ║
║  ├── Annual income (range selector, not exact — e.g., £25k–35k)               ║
║  ├── Number of occupants                                                       ║
║  ├── Do you have pets? (yes/no + type)                                         ║
║  ├── Do you smoke? (yes/no)                                                    ║
║  ├── Desired move-in date                                                      ║
║  ├── Budget confirmation ("I can afford £X/month" — matches listing price)     ║
║  ├── References (previous landlord name + contact — optional but recommended)  ║
║  └── Additional notes (free text)                                              ║
║                                                                                ║
║  Landlord receives application:                                                ║
║  ├── Sees full application details                                             ║
║  ├── Can Accept → moves to Offer stage                                         ║
║  ├── Can Reject → user receives notification with optional reason              ║
║  └── Can Request More Info → chat continues                                    ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 5: OFFER & NEGOTIATION                                                   ║
║  ────────────────────────────                                                  ║
║                                                                                ║
║  Landlord accepts application → sends formal "Offer" through app:              ║
║                                                                                ║
║  ┌─────────────────────────────────────────────────────┐                       ║
║  │  📋 RENTAL OFFER                                    │                       ║
║  │                                                     │                       ║
║  │  Property: 2 Bed Flat, 45 Clapham High St, SW4 7UR │                       ║
║  │                                                     │                       ║
║  │  Monthly rent:      £1,650                          │                       ║
║  │  Deposit:           £1,907 (5 weeks' rent)          │                       ║
║  │  Tenancy start:     1 April 2026                    │                       ║
║  │  Tenancy duration:  12 months                       │                       ║
║  │  Break clause:      After 6 months, 2 months notice │                       ║
║  │                                                     │                       ║
║  │  Conditions:                                        │                       ║
║  │  • No smoking inside the property                   │                       ║
║  │  • Small pets allowed with prior approval           │                       ║
║  │  • Professional cleaning required at end of tenancy │                       ║
║  │                                                     │                       ║
║  │  Bills included: Water only                         │                       ║
║  │  Furnished: Partly furnished                        │                       ║
║  │                                                     │                       ║
║  │  [ Accept ]  [ Negotiate ]  [ Decline ]             │                       ║
║  └─────────────────────────────────────────────────────┘                       ║
║                                                                                ║
║  If user taps "Negotiate":                                                     ║
║  ├── Chat opens with offer terms pre-loaded                                    ║
║  ├── User can propose changes (e.g., "Can we do £1,550/mo?")                  ║
║  ├── Landlord can revise and re-send offer                                     ║
║  └── Cycle continues until both agree or user declines                         ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 6: DIGITAL TENANCY AGREEMENT                                             ║
║  ──────────────────────────────────                                            ║
║                                                                                ║
║  Once both parties agree on the offer:                                         ║
║                                                                                ║
║  1. ComLinkr generates a Tenancy Agreement PDF                                 ║
║     ├── Based on UK Assured Shorthold Tenancy (AST) template                   ║
║     ├── Pre-filled with ALL agreed terms from the Offer                        ║
║     ├── Includes: landlord details, tenant details, property address,          ║
║     │   rent, deposit, duration, conditions, break clause                      ║
║     └── Includes standard UK AST clauses (repair obligations,                  ║
║         notice periods, tenant rights, etc.)                                   ║
║                                                                                ║
║  2. Both parties review the full agreement in-app                              ║
║     ├── Scrollable PDF viewer with zoom                                        ║
║     ├── Both can request amendments before signing                             ║
║     └── Each clause is expandable with plain-English explanation               ║
║                                                                                ║
║  3. E-Signature flow                                                           ║
║     ├── Tenant taps "I agree and sign" → draws signature or types name         ║
║     ├── Confirmation code sent via SMS or email (2FA)                          ║
║     ├── Landlord receives notification to counter-sign                         ║
║     ├── Landlord taps "I agree and sign" → same 2FA flow                      ║
║     └── Both signatures + timestamps recorded on document                      ║
║                                                                                ║
║  4. Signed agreement stored                                                    ║
║     ├── PDF stored in BOTH users' "My Documents" section                       ║
║     ├── Downloadable at any time                                               ║
║     ├── Tamper-proof hash stored (SHA-256 of signed document)                  ║
║     └── Version history maintained if agreement was amended                    ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 7: DEPOSIT & MOVE-IN                                                     ║
║  ─────────────────────────                                                     ║
║                                                                                ║
║  After agreement is signed:                                                    ║
║                                                                                ║
║  Deposit Protection Reminder:                                                  ║
║  ┌─────────────────────────────────────────────────────────────────┐            ║
║  │  ⚠️  UK LAW REMINDER                                           │            ║
║  │                                                                 │            ║
║  │  Under the Housing Act 2004, landlords MUST protect the         │            ║
║  │  tenant's deposit in a government-approved scheme within        │            ║
║  │  30 days of receiving it.                                       │            ║
║  │                                                                 │            ║
║  │  Approved schemes:                                              │            ║
║  │  • Deposit Protection Service (DPS)                             │            ║
║  │  • MyDeposits                                                   │            ║
║  │  • Tenancy Deposit Scheme (TDS)                                 │            ║
║  │                                                                 │            ║
║  │  Landlord: Please confirm which scheme you will use:            │            ║
║  │  [  DPS  ]  [  MyDeposits  ]  [  TDS  ]                        │            ║
║  └─────────────────────────────────────────────────────────────────┘            ║
║                                                                                ║
║  Move-in:                                                                      ║
║  ├── Move-in date appears on both users' in-app calendars                      ║
║  ├── Reminder notification 3 days before move-in                               ║
║  ├── Listing status changes to "Let Agreed" → removed from search              ║
║  ├── Listing shows "Let Agreed" label (not deleted — preserves history)        ║
║  └── Key collection details exchanged via chat                                 ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  STEP 8: POST MOVE-IN                                                          ║
║  ────────────────────                                                          ║
║                                                                                ║
║  After 30 days of tenancy:                                                     ║
║                                                                                ║
║  Tenant can:                                                                   ║
║  ├── Rate the PROPERTY (1–5 stars + review text)                               ║
║  │   └── Accuracy, condition, location, value for money                        ║
║  ├── Rate the LANDLORD (1–5 stars + review text)                               ║
║  │   └── Communication, responsiveness, fairness, maintenance                  ║
║  └── Upload photos of actual property (community benefit)                      ║
║                                                                                ║
║  Landlord can:                                                                 ║
║  ├── Rate the TENANT (1–5 stars — visible to future landlords)                 ║
║  │   └── Cleanliness, communication, payment reliability                       ║
║  └── This builds a "tenant reputation" system over time                        ║
║                                                                                ║
║  Ongoing:                                                                      ║
║  ├── Agreement accessible anytime in "My Documents"                            ║
║  ├── Rent reminders (optional push notification on due date)                   ║
║  ├── Maintenance request button (sends message to landlord)                    ║
║  └── Tenancy end date reminder (60 days before expiry)                         ║
║                                                                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

**Visual flow summary:**

```
Discovery → Enquiry → Viewing → Application → Offer → Agreement → Deposit → Post Move-In
    │          │         │           │           │         │           │          │
    ▼          ▼         ▼           ▼           ▼         ▼           ▼          ▼
 "I'm       In-app   Calendar    Form +      Terms +   E-signed    DPS/TDS    Rate &
Interested"  chat    booking    references  negotiate    PDF       confirm    review
```

### 2.6 Digital Tenancy Agreement — UK AST Template

The generated agreement follows the **Assured Shorthold Tenancy (AST)** structure, the most common tenancy type in England and Wales:

```
┌──────────────────────────────────────────────────────────┐
│            ASSURED SHORTHOLD TENANCY AGREEMENT            │
│                  Generated by ComLinkr                    │
│                                                          │
│  ── PARTIES ──                                           │
│  Landlord: [Name], [Address], [Contact]                  │
│  Tenant:   [Name], [Address], [Contact]                  │
│                                                          │
│  ── PROPERTY ──                                          │
│  Address: [Full property address + postcode]             │
│  Type: [Flat / House / Room / Studio]                    │
│  Furnished: [Furnished / Part-furnished / Unfurnished]   │
│                                                          │
│  ── TERM ──                                              │
│  Start date:  [DD/MM/YYYY]                               │
│  End date:    [DD/MM/YYYY]                               │
│  Duration:    [X months]                                 │
│  Break clause: [If applicable — terms]                   │
│                                                          │
│  ── RENT ──                                              │
│  Monthly rent: £[amount]                                 │
│  Payment due: [1st / 15th] of each month                 │
│  Payment method: Bank transfer                           │
│  First payment due: [date]                               │
│                                                          │
│  ── DEPOSIT ──                                           │
│  Deposit amount: £[amount]                               │
│  Protection scheme: [DPS / MyDeposits / TDS]             │
│  Must be protected within 30 days of receipt             │
│                                                          │
│  ── BILLS ──                                             │
│  Included: [Water / None / All]                          │
│  Tenant responsible for: [Council tax, gas, electric...] │
│                                                          │
│  ── CONDITIONS ──                                        │
│  [List of agreed conditions: pets, smoking, subletting]  │
│                                                          │
│  ── STANDARD CLAUSES ──                                  │
│  [Pre-populated UK AST clauses covering:]                │
│  • Landlord's obligations (repairs, gas safety, etc.)    │
│  • Tenant's obligations (rent, care of property, etc.)   │
│  • Notice periods (Section 21 / Section 8)               │
│  • Right to quiet enjoyment                              │
│  • Access for repairs (24h notice)                       │
│  • Inventory and check-in/check-out                      │
│                                                          │
│  ── SIGNATURES ──                                        │
│  Landlord: [signature]    Date: [DD/MM/YYYY HH:MM]      │
│  Tenant:   [signature]    Date: [DD/MM/YYYY HH:MM]      │
│                                                          │
│  Document ID: CLR-AST-2026-XXXXXX                        │
│  SHA-256 Hash: [tamper-proof verification hash]          │
└──────────────────────────────────────────────────────────┘
```

### 2.7 What ComLinkr Is NOT (Legal Boundaries)

| ComLinkr IS | ComLinkr is NOT |
|-------------|-----------------|
| A platform that connects tenants with verified landlords/agencies | A letting agent — no commission, no middleman fees |
| A digital agreement facilitator (generates and stores tenancy agreements) | A legal firm — the agreement is a written record of mutual terms, users should seek legal advice for complex situations |
| A property discovery and enquiry tool | A payment processor — rent and deposit are exchanged directly between tenant and landlord via bank transfer |
| A community trust builder (ratings, reviews, verified identities) | A guarantor or insurance provider — ComLinkr doesn't guarantee landlord or tenant behavior |
| A deposit protection reminder system | A deposit protection scheme — landlords must use DPS/MyDeposits/TDS directly |

**Important legal note:** The ComLinkr-generated AST IS a valid written agreement under English law. However, it is not a substitute for professional legal advice in complex situations (e.g., HMO licensing, commercial lets, company tenancies). ComLinkr recommends both parties review the agreement independently.

---

## 3. UK Agencies — Deep Integration

### 3.1 Agency Dashboard & Multi-Agent Support

> Since UK lettings are agency-dominated, agencies get a specialized experience.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  AGENCY DASHBOARD (accessible after agency badge verification)          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  🏢 Foxtons Ltd — Agency Dashboard                                │  │
│  │  ─────────────────────────────────                                │  │
│  │                                                                   │  │
│  │  📊 OVERVIEW                                                      │  │
│  │  ├── Active listings: 47                                          │  │
│  │  ├── Total enquiries this month: 312                              │  │
│  │  ├── Properties let this month: 8                                 │  │
│  │  ├── Average response time: 2.4 hours                             │  │
│  │  └── Agency rating: ⭐ 4.6 (89 reviews)                           │  │
│  │                                                                   │  │
│  │  🏠 LISTINGS MANAGEMENT                                           │  │
│  │  ├── [+ Add New Listing]                                          │  │
│  │  ├── [📤 Bulk Upload (CSV)]                                       │  │
│  │  ├── [View All Listings]  — filter by status, agent, area         │  │
│  │  └── [Let Agreed Archive] — historical completed lets             │  │
│  │                                                                   │  │
│  │  💬 ENQUIRIES                                                     │  │
│  │  ├── New enquiries (unread): 14                                   │  │
│  │  ├── In conversation: 23                                          │  │
│  │  ├── Application received: 5                                      │  │
│  │  └── Viewing scheduled: 8                                         │  │
│  │                                                                   │  │
│  │  👥 TEAM (Multi-Agent Support)                                    │  │
│  │  ├── [Invite Agent] — sends invite link                           │  │
│  │  ├── Active agents:                                               │  │
│  │  │   ├── Sarah Johnson (12 listings, 3 active enquiries)          │  │
│  │  │   ├── Mike Chen (8 listings, 7 active enquiries)               │  │
│  │  │   └── Emma Williams (15 listings, 4 active enquiries)          │  │
│  │  └── Each agent handles their assigned properties                 │  │
│  │                                                                   │  │
│  │  📈 ANALYTICS                                                     │  │
│  │  ├── Views per listing (chart)                                    │  │
│  │  ├── Enquiry-to-let conversion rate                               │  │
│  │  ├── Most popular areas                                           │  │
│  │  └── Response time trends                                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Multi-Agent Model:                                                     │
│  ├── One agency account, verified once via Companies House              │
│  ├── Account holder (admin) can invite agents via email                 │
│  ├── Each agent gets their own login under the agency umbrella          │
│  ├── Agents can only manage listings assigned to them                   │
│  ├── Agency admin sees ALL listings and enquiries across agents         │
│  └── Agents inherit the agency's "Verified Agency" badge               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Agency Profile Page

What tenants see when they tap on an agency name from a listing:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🏢 Foxtons Ltd                                              │
│  ✅ Verified Agency  •  Est. 1981  •  London                  │
│  ⭐ 4.6 (89 reviews)                                         │
│                                                              │
│  About:                                                      │
│  "London's leading estate agents, specializing in lettings   │
│   and sales across all London boroughs."                     │
│                                                              │
│  📍 Areas covered: Clapham, Battersea, Fulham, Chelsea ...   │
│  📞 020 7000 0000                                            │
│  🌐 foxtons.co.uk                                            │
│  🏷️ ARLA Propertymark member                                 │
│                                                              │
│  ── ACTIVE LISTINGS (47) ──                                  │
│  [Grid of property cards — all with "Foxtons" agency badge]  │
│                                                              │
│  ── REVIEWS ──                                               │
│  ⭐⭐⭐⭐⭐ "Quick and professional throughout"  — @sarah_t     │
│  ⭐⭐⭐⭐☆ "Good service but could respond faster" — @mike_r   │
│  [See all 89 reviews]                                        │
│                                                              │
│  ── AGENCY STATS ──                                          │
│  • Average response time: 2.4 hours                          │
│  • Properties let this year: 156                             │
│  • On ComLinkr since: January 2026                           │
│                                                              │
│  [ 💬 Contact Agency ]                                       │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Future: Rightmove/Zoopla Feed Import

```
Phase: FUTURE (post-launch enhancement)

Most UK agencies already syndicate their listings to Rightmove and Zoopla
using standardized XML/BLM feeds. ComLinkr can import these feeds:

┌──────────────────────────────────────────────────────────┐
│                                                          │
│  AGENCY API IMPORT FLOW                                  │
│                                                          │
│  Agency Dashboard → "Import Listings"                    │
│         │                                                │
│         ├── Option A: Upload BLM/XML file                │
│         │   └── Standard Rightmove/Zoopla export format  │
│         │                                                │
│         ├── Option B: API endpoint                       │
│         │   └── Agency provides their feed URL           │
│         │   └── ComLinkr fetches & parses automatically  │
│         │                                                │
│         └── Option C: Manual CSV upload                  │
│             └── Spreadsheet with columns:                │
│                 address, bedrooms, rent, description...   │
│                                                          │
│  All imported listings are:                              │
│  • Auto-tagged with the agency's branding                │
│  • Run through property verification pipeline (§2.3)    │
│  • Published immediately (agency is pre-verified)        │
│  • Synced daily if API endpoint is configured            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Restaurants — Complete Authorization & Flow

### 4.1 Hybrid Model (Verified Owners + Community Recommendations)

> **Links to Badge Plan:** → BP §5.2 (Restaurant Owner Badge), → BP §12 (Restaurant Two-Tier System)

This extends the two-tier system defined in BP §12 with a complete operational flow:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ACTION 1: ADD A RESTAURANT LISTING                                             │
│  ───────────────────────────────────                                            │
│                                                                                 │
│  Who: Only Verified Restaurant Owner/Manager                                    │
│  Badge: "restaurant_owner" (→ BP §5.2) — MUST be "verified"                    │
│                                                                                 │
│  How:                                                                           │
│  ├── Owner signs up as regular user                                             │
│  ├── Applies for "Restaurant Owner" badge (→ BP §9.2)                           │
│  ├── Uploads: business registration + food hygiene rating certificate            │
│  ├── Admin verifies (→ BP §10)                                                  │
│  ├── Once verified → can create full restaurant listing:                        │
│  │   ├── Restaurant name, cuisine type, price range                             │
│  │   ├── Full address with map pin                                              │
│  │   ├── Operating hours (per day, holiday hours)                               │
│  │   ├── Official photos (interior, exterior, dishes)                           │
│  │   ├── Full menu with prices + dietary tags (vegan, halal, gluten-free)       │
│  │   ├── Phone, email, website, social links                                   │
│  │   ├── Delivery options (dine-in, takeaway, delivery, Uber Eats/Deliveroo)   │
│  │   ├── Special offers / promotions (→ BP §12 Premium tier)                    │
│  │   └── Reply to customer reviews                                              │
│  └── Gets "Verified Business ✅" badge on listing                               │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ACTION 2: RECOMMEND A RESTAURANT                                               │
│  ─────────────────────────────────                                              │
│                                                                                 │
│  Who: ANY ComLinkr user (no badge required)                                     │
│                                                                                 │
│  How:                                                                           │
│  ├── User taps "Recommend a Place" on the Food tab                              │
│  ├── Fills in:                                                                  │
│  │   ├── Restaurant name                                                        │
│  │   ├── Approximate location (address or area)                                 │
│  │   ├── Cuisine type                                                           │
│  │   ├── Why they love it (free text, 50–500 chars)                             │
│  │   └── Optional: photo of the food/venue                                      │
│  ├── This creates a "Community Recommendation" — NOT a full listing             │
│  └── Shown with a 🗣️ "Community Pick" label                                     │
│                                                                                 │
│  Community Recommendation vs. Full Listing:                                     │
│  ┌────────────────────────────┬───────────────────────────────────┐              │
│  │ Community Recommendation   │ Verified Business Listing         │              │
│  ├────────────────────────────┼───────────────────────────────────┤              │
│  │ 🗣️ "Community Pick" label  │ ✅ "Verified Business" badge      │              │
│  │ Basic info only            │ Full menu, hours, photos          │              │
│  │ User-submitted photos      │ Official business photos          │              │
│  │ No owner control           │ Owner manages everything          │              │
│  │ Community reviews          │ Community reviews + owner replies │              │
│  │ No promotions              │ Special offers & promotions       │              │
│  │ Free                       │ Paid subscription (→ BP §12.1)   │              │
│  └────────────────────────────┴───────────────────────────────────┘              │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ACTION 3: REVIEW A RESTAURANT                                                  │
│  ─────────────────────────────                                                  │
│                                                                                 │
│  Who: ANY ComLinkr user (no badge required)                                     │
│                                                                                 │
│  How:                                                                           │
│  ├── User visits any restaurant page (full listing OR community recommendation) │
│  ├── Taps "Write a Review"                                                      │
│  ├── Fills in:                                                                  │
│  │   ├── Overall rating (1–5 stars)                                             │
│  │   ├── Category ratings: Food, Service, Ambience, Value                       │
│  │   ├── Review text (50–1000 chars)                                            │
│  │   ├── Photos (optional, up to 5)                                             │
│  │   └── Visit date                                                             │
│  └── Review appears on the restaurant's page                                    │
│                                                                                 │
│  Review integrity:                                                              │
│  ├── One review per user per restaurant (can edit, not duplicate)               │
│  ├── Reviews show user's community score + how long they've been on ComLinkr    │
│  ├── Flagging system: 3+ flags → review enters moderation queue                 │
│  └── Verified owners can reply to reviews (Tier 2 only)                         │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ACTION 4: CLAIM A RECOMMENDATION (Owner Claims User-Submitted Restaurant)      │
│  ────────────────────────────────────────────────────────────────────────        │
│                                                                                 │
│  Who: The actual restaurant owner                                               │
│                                                                                 │
│  Scenario: A user recommended "Mario's Kitchen" as a Community Pick.            │
│  Mario (the owner) sees it and wants to claim it as his official listing.       │
│                                                                                 │
│  Flow:                                                                          │
│  ├── Mario taps "Is this your business? Claim it" on the recommendation         │
│  ├── Mario goes through badge application flow (→ BP §9.2)                      │
│  │   ├── Uploads business registration                                          │
│  │   ├── Uploads food hygiene rating certificate                                │
│  │   └── Provides business details (address, phone, website)                    │
│  ├── Admin verifies Mario is the legitimate owner                               │
│  ├── Once verified:                                                             │
│  │   ├── Community Recommendation converts to Verified Business Listing         │
│  │   ├── All existing community reviews are preserved                           │
│  │   ├── Mario gets full control panel (menu, hours, photos, replies)           │
│  │   ├── "Community Pick" label replaced with "Verified Business ✅"            │
│  │   └── Original recommender gets a "Thanks! Mario claimed it" notification    │
│  └── Mario subscribes to a tier (→ BP §12.1) for premium features              │
│                                                                                 │
│  This is the EXACT model used by Google Maps, Yelp, TripAdvisor — proven.      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Why this hybrid model works:**

1. **Restaurant owners** get full control over their listing — menu, prices, photos, offers
2. **Users** can share hidden gems they discover — drives community engagement
3. **Prevents fake listings** — only verified owners manage the full listing
4. **Growth engine** — community recommendations generate inventory that owners then claim and upgrade

### 4.2 Restaurant Verification Pipeline (UK)

> Separate from person verification (→ BP §9). This verifies the RESTAURANT itself.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  LAYER 1: FOOD HYGIENE RATING (Automatic, UK-Specific)                          │
│  ──────────────────────────────────────────────────────                         │
│                                                                                 │
│  Every UK food business is inspected and rated by their local authority.         │
│  Ratings are public data via the Food Standards Agency (FSA) API.               │
│                                                                                 │
│  API: https://api.ratings.food.gov.uk/                                          │
│                                                                                 │
│  When owner claims a restaurant:                                                │
│  ├── ComLinkr queries FSA API by business name + postcode                       │
│  ├── Returns:                                                                   │
│  │   ├── Food hygiene rating (0–5 scale)                                        │
│  │   ├── Last inspection date                                                   │
│  │   ├── Local authority name                                                   │
│  │   └── Business type + address confirmation                                   │
│  ├── Rating displayed on restaurant listing automatically                       │
│  └── If rating ≤ 2: listing shows ⚠️ "Improvement Required" notice              │
│                                                                                 │
│  This proves the restaurant:                                                    │
│  ✅ Exists as a registered food business                                         │
│  ✅ Has been physically inspected by a government body                           │
│  ✅ Has a current food safety standard                                           │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 2: BUSINESS REGISTRATION (Manual/Semi-Automatic)                         │
│  ──────────────────────────────────────────────────────                         │
│                                                                                 │
│  Owner uploads ONE of:                                                          │
│  ├── Companies House registration number (for limited companies)                │
│  │   └── Auto-verified via Companies House API                                  │
│  ├── Business registration certificate (for sole traders/partnerships)          │
│  └── VAT registration number (optional, additional trust signal)                │
│                                                                                 │
│  Admin cross-checks:                                                            │
│  ├── Business name matches across documents                                     │
│  ├── Registered address is plausible for the restaurant location                │
│  └── SIC code matches food/hospitality (56101, 56102, 56301)                   │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 3: ADDRESS & PHONE VERIFICATION                                          │
│  ──────────────────────────────────────                                         │
│                                                                                 │
│  ├── Address: Verified via Google Places API (restaurant exists at location)    │
│  ├── Phone: Verification SMS/call sent to business phone number                 │
│  │   └── Owner enters 6-digit code received at the business phone              │
│  └── This confirms the claimant has physical access to the business             │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  LAYER 4: COMMUNITY FLAGGING (User-Driven)                                      │
│  ──────────────────────────────────────────                                     │
│                                                                                 │
│  Same as housing (§2.3 Layer 4):                                                │
│  ├── Users can report: "This restaurant is closed" / "Wrong info" / "Fake"     │
│  ├── 3+ flags → auto-hidden + manual review                                    │
│  └── Verified owners can respond to flags (dispute false reports)              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 The Claim Flow (Community Recommendation → Verified Listing)

**Visual step-by-step:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  BEFORE CLAIM                                                        │
│  ─────────────                                                       │
│                                                                      │
│  ┌──────────────────────────────────────────┐                        │
│  │  🗣️ Community Pick                       │                        │
│  │                                          │                        │
│  │  🍕 Mario's Kitchen                      │                        │
│  │  ⭐ 4.3 (12 community reviews)            │                        │
│  │  📍 Clapham High Street (approximate)    │                        │
│  │  🍝 Italian                               │                        │
│  │                                          │                        │
│  │  "Amazing homemade pasta, cozy vibe!"    │                        │
│  │  — recommended by @food_lover_sarah      │                        │
│  │                                          │                        │
│  │  🏪 Is this your business? [Claim it →]  │  ← Claim CTA          │
│  └──────────────────────────────────────────┘                        │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  CLAIM FLOW                                                          │
│  ──────────                                                          │
│                                                                      │
│  Owner taps "Claim it" →                                             │
│    Step 1: "I'm the owner/manager of Mario's Kitchen"                │
│    Step 2: Upload food hygiene certificate + business registration   │
│    Step 3: Phone verification (SMS to business number)               │
│    Step 4: Admin reviews + FSA API cross-check                       │
│    Step 5: ✅ Approved                                                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  AFTER CLAIM                                                         │
│  ───────────                                                         │
│                                                                      │
│  ┌──────────────────────────────────────────┐                        │
│  │  ✅ Verified Business                     │                        │
│  │                                          │                        │
│  │  🍕 Mario's Kitchen                      │                        │
│  │  ⭐ 4.3 (12 reviews)  •  🔵 Hygiene: 5   │                        │
│  │  📍 42 Clapham High St, SW4 7UR          │  ← Exact address      │
│  │  🍝 Italian  •  $$  •  0.2 mi            │                        │
│  │                                          │                        │
│  │  📋 Full Menu Available                   │  ← NEW: Full menu     │
│  │  🕐 Open until 10pm                       │  ← NEW: Live hours    │
│  │  📸 12 official photos                    │  ← NEW: Owner photos  │
│  │  🎁 "20% off pasta every Tuesday!"        │  ← NEW: Promotions   │
│  │                                          │                        │
│  │  [📋 Menu] [📞 Call] [📍 Directions] [💬] │                        │
│  └──────────────────────────────────────────┘                        │
│                                                                      │
│  All 12 community reviews are PRESERVED and appear below.            │
│  Owner can now REPLY to reviews.                                     │
│  Original recommender @food_lover_sarah gets notification:           │
│  "🎉 Mario claimed the restaurant you recommended!"                  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification APIs & Data Sources (UK)

| API / Data Source | Purpose | Cost | Endpoint |
|-------------------|---------|------|----------|
| **Companies House API** | Verify agencies & restaurant LTD companies | Free (public API) | `https://api.company-information.service.gov.uk/` |
| **Food Standards Agency (FSA) API** | Restaurant food hygiene ratings | Free (public API) | `https://api.ratings.food.gov.uk/` |
| **EPC Register (Open Data)** | Property energy performance certificates | Free (open data) | `https://epc.opendatacommunities.org/` |
| **Postcodes.io** | UK postcode validation & geolocation | Free (open source) | `https://api.postcodes.io/` |
| **Google Places API** | Address validation & restaurant existence | Pay-per-use (~$17/1000 requests) | `https://maps.googleapis.com/maps/api/place/` |
| **Ordnance Survey Places API** | UK address lookup (premium accuracy) | Free tier available (1000/mo) | `https://api.os.uk/search/places/` |
| **Google Vision API** | Reverse image search, photo verification | Pay-per-use (~$1.50/1000 images) | `https://vision.googleapis.com/` |
| **TinEye API** | Reverse image search (stock photo detection) | Pay-per-use | `https://api.tineye.com/` |
| **HM Land Registry** | Property ownership verification | £3 per title search | `https://www.gov.uk/search-property-information-land-registry` |
| **Twilio / AWS SNS** | SMS verification for phone numbers | ~$0.01 per SMS | Various |

**Cost estimate for verification pipeline:**

```
Per agency verification:    ~£0.05 (Companies House API = free, Google Places = ~£0.02)
Per landlord verification:  ~£3.05 (Land Registry = £3, postcodes.io = free)
Per property listing:       ~£0.10 (postcode check + photo check + EPC check)
Per restaurant claim:       ~£0.04 (FSA API = free, phone SMS = £0.01, Places = £0.02)
```

---

## 6. Data Model Additions

> These extend the data models defined in BP §15. New types specific to this document.

### 6.1 PropertyListing (Extended)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique listing ID |
| `landlordUserId` | `string` | Links to User.id of the poster |
| `agencyId` | `string?` | If posted by an agency agent |
| `agentId` | `string?` | Specific agent within agency |
| `verificationLevel` | `"basic" \| "verified" \| "fully_verified"` | Property verification badge |
| `addressValidated` | `boolean` | Layer 1 passed |
| `photosVerified` | `boolean` | Layer 2 passed |
| `epcCertificate` | `EPCData?` | Layer 3 data |
| `physicallyVerified` | `boolean` | Layer 5 passed |
| `communityFlags` | `number` | Number of user reports |
| `flagReasons` | `FlagReport[]` | Individual flag details |
| `status` | `"active" \| "let_agreed" \| "removed" \| "under_review"` | Listing lifecycle |

### 6.2 EPCData

| Field | Type | Description |
|-------|------|-------------|
| `reference` | `string` | EPC certificate reference number |
| `rating` | `"A" \| "B" \| "C" \| "D" \| "E" \| "F" \| "G"` | Energy rating |
| `validUntil` | `string` | ISO date — EPC expiry |
| `verified` | `boolean` | Cross-checked against gov.uk register |

### 6.3 RentalAgreement

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique agreement ID (CLR-AST-2026-XXXXXX) |
| `listingId` | `string` | Links to PropertyListing.id |
| `landlordUserId` | `string` | Landlord's User.id |
| `tenantUserId` | `string` | Tenant's User.id |
| `status` | `"offer_sent" \| "negotiating" \| "agreed" \| "signed" \| "active" \| "ended"` | Agreement lifecycle |
| `offer` | `RentalOffer` | The offer terms |
| `signatures` | `{ landlord: SignatureData?, tenant: SignatureData? }` | E-signatures |
| `documentHash` | `string` | SHA-256 tamper-proof hash |
| `documentUrl` | `string` | Stored PDF location |
| `depositScheme` | `"DPS" \| "MyDeposits" \| "TDS" \| null` | Deposit protection scheme |
| `createdAt` | `string` | ISO date |
| `signedAt` | `string?` | ISO date when both signed |

### 6.4 RentalOffer

| Field | Type | Description |
|-------|------|-------------|
| `monthlyRent` | `number` | Rent in GBP |
| `deposit` | `number` | Deposit amount in GBP |
| `tenancyStart` | `string` | ISO date |
| `tenancyEnd` | `string` | ISO date |
| `duration` | `string` | e.g., "12 months" |
| `breakClause` | `string?` | Break clause terms |
| `conditions` | `string[]` | Special conditions (pets, smoking, etc.) |
| `billsIncluded` | `string[]` | Which bills are included |
| `furnished` | `"furnished" \| "part_furnished" \| "unfurnished"` | Furnishing status |
| `paymentDueDay` | `number` | Day of month rent is due (1–28) |

### 6.5 SignatureData

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Who signed |
| `signedAt` | `string` | ISO timestamp |
| `method` | `"draw" \| "typed"` | How they signed |
| `signatureImage` | `string` | Base64 of drawn signature |
| `verified2FA` | `boolean` | SMS/email code confirmed |

### 6.6 RentalApplication

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique application ID |
| `listingId` | `string` | Property applied for |
| `applicantUserId` | `string` | Tenant's User.id |
| `fullName` | `string` | Legal name |
| `currentAddress` | `string` | Current residence |
| `employmentStatus` | `string` | Employed, self-employed, student, etc. |
| `employerName` | `string?` | If employed |
| `annualIncomeRange` | `string` | e.g., "£25k–35k" |
| `occupants` | `number` | Number of people |
| `hasPets` | `boolean` | Pet ownership |
| `petDetails` | `string?` | Type of pet if yes |
| `isSmoker` | `boolean` | Smoking status |
| `desiredMoveIn` | `string` | ISO date |
| `budgetConfirmation` | `number` | Monthly budget in GBP |
| `references` | `{ name: string, phone: string, email: string }[]` | Previous landlord refs |
| `additionalNotes` | `string?` | Free text |
| `status` | `"submitted" \| "under_review" \| "accepted" \| "rejected"` | Application status |
| `submittedAt` | `string` | ISO date |

### 6.7 RestaurantRecommendation

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique recommendation ID |
| `recommenderUserId` | `string` | Who recommended it |
| `restaurantName` | `string` | Name of the restaurant |
| `approximateLocation` | `string` | Area/address |
| `cuisineType` | `string` | Cuisine category |
| `reason` | `string` | Why they love it (50–500 chars) |
| `photo` | `string?` | Optional photo |
| `claimed` | `boolean` | Has an owner claimed this? |
| `claimedByUserId` | `string?` | Owner's User.id if claimed |
| `claimedAt` | `string?` | ISO date of claim |
| `communityReviews` | `number` | Number of reviews on this recommendation |
| `averageRating` | `number` | Aggregated star rating |
| `createdAt` | `string` | ISO date |

### 6.8 AgencyProfile (extends BusinessProfile from BP §15.8)

| Field | Type | Description |
|-------|------|-------------|
| `companiesHouseNumber` | `string` | CRN for auto-verification |
| `companiesHouseVerified` | `boolean` | API check passed |
| `sicCode` | `string` | Standard Industrial Classification |
| `arlaNumber` | `string?` | ARLA Propertymark membership |
| `agents` | `AgentProfile[]` | Team members under the agency |
| `totalListings` | `number` | Active listing count |
| `totalLet` | `number` | Historical let-agreed count |
| `averageResponseTime` | `number` | Hours (calculated) |
| `agencyRating` | `number` | Aggregated from reviews |
| `coverageAreas` | `string[]` | Areas the agency covers |

### 6.9 AgentProfile

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | Agent's User.id |
| `agencyId` | `string` | Parent agency |
| `name` | `string` | Agent's name |
| `title` | `string` | e.g., "Senior Letting Agent" |
| `phone` | `string` | Direct phone |
| `email` | `string` | Direct email |
| `assignedListings` | `string[]` | Listing IDs managed by this agent |
| `invitedAt` | `string` | ISO date when invited |
| `active` | `boolean` | Currently active |

---

## 7. New Screens & Components

> These supplement the screens listed in BP §14 (Appendix A).

| Screen / Component | File | Purpose |
|--------------------|------|---------|
| `rental-application.tsx` | `app/rental-application.tsx` | Tenant fills rental application form |
| `rental-offer.tsx` | `app/rental-offer.tsx` | View and respond to landlord's offer |
| `tenancy-agreement.tsx` | `app/tenancy-agreement.tsx` | View, review, and e-sign the AST |
| `my-documents.tsx` | `app/my-documents.tsx` | Access signed agreements and documents |
| `property-verification.tsx` | `app/property-verification.tsx` | Property verification status + upload EPC |
| `recommend-restaurant.tsx` | `app/recommend-restaurant.tsx` | Community recommendation form |
| `restaurant-reviews.tsx` | `app/restaurant-reviews.tsx` | Write/view restaurant reviews |
| `claim-restaurant.tsx` | `app/claim-restaurant.tsx` | Owner claims a community recommendation (exists in BP file map) |
| `agency-dashboard.tsx` | `app/agency-dashboard.tsx` | Agency bulk management, team, analytics |
| `agency-profile.tsx` | `app/agency-profile.tsx` | Public agency profile page |
| `invite-agent.tsx` | `app/invite-agent.tsx` | Agency admin invites team members |
| `booking-calendar.tsx` | `app/booking-calendar.tsx` | Schedule property viewings |
| `ViewingCard.tsx` | `components/ViewingCard.tsx` | Calendar viewing slot card |
| `VerificationBadgePill.tsx` | `components/VerificationBadgePill.tsx` | 🔵/🟢/⭐ badge pill on listings |
| `RentalOfferCard.tsx` | `components/RentalOfferCard.tsx` | Offer summary with Accept/Negotiate/Decline |
| `CommunityPickCard.tsx` | `components/CommunityPickCard.tsx` | Restaurant recommendation card |
| `ClaimBanner.tsx` | `components/ClaimBanner.tsx` | "Is this your business?" CTA |
| `EPCRating.tsx` | `components/EPCRating.tsx` | EPC energy rating display (A–G) |
| `DepositSchemeSelector.tsx` | `components/DepositSchemeSelector.tsx` | DPS/MyDeposits/TDS picker |
| `SignaturePad.tsx` | `components/SignaturePad.tsx` | Draw/type signature for e-signing |
| `FoodHygieneRating.tsx` | `components/FoodHygieneRating.tsx` | FSA hygiene rating display (0–5) |

---

## 8. Integration with Badge Plan — Permission Matrix Extension

> Extends BP §8.1 with the new actions defined in this document.

| Action | No Badge 👤 | 🏠 Landlord | 🍽️ Restaurant Owner | 🏢 Agency | Admin |
|--------|-----------|-------------|---------------------|-----------|-------|
| Browse all listings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send enquiry on listing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Schedule viewing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit rental application | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Post property listing** | ❌ | ✅ (up to 5) | ❌ | ✅ (unlimited) | ✅ |
| **Bulk upload listings** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Send rental offer** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Generate tenancy agreement** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Manage agency team** | ❌ | ❌ | ❌ | ✅ | ✅ |
| Rate property (post-tenancy) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rate landlord (post-tenancy) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rate tenant (post-tenancy) | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Recommend a restaurant** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Write restaurant review** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Add full restaurant listing** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Claim restaurant recommendation** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Reply to restaurant reviews** | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Run restaurant promotions** | ❌ | ❌ | ✅ (Premium+) | ❌ | ✅ |
| Report suspicious listing | ✅ | ✅ | ✅ | ✅ | ✅ |
| Report restaurant | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. Implementation Phases

> These integrate with the phases in BP §18.

### Phase M1: Housing Foundation (Weeks 1–3)

| Task | Description |
|------|-------------|
| Wire badge gating on "Add Listing" | Connect `usePermissions()` → landlord/agency badge check |
| Property verification — Layer 1 | Address validation via postcodes.io |
| Property verification — Layer 3 | EPC certificate upload + basic display |
| Community flagging UI | Report button + flag count tracking |
| Listing verification badges | 🔵 Basic / 🟢 Verified pill components |

### Phase M2: Rental Agreement Flow (Weeks 4–6)

| Task | Description |
|------|-------------|
| Rental application form | `rental-application.tsx` — full form + submission |
| Rental offer system | `rental-offer.tsx` — landlord creates, tenant reviews |
| Chat integration | Property-specific chat threads |
| Viewing calendar | `booking-calendar.tsx` — schedule + reminders |
| Offer negotiation | Accept/Negotiate/Decline flow in chat |

### Phase M3: Digital Agreement (Weeks 7–9)

| Task | Description |
|------|-------------|
| AST template engine | Generate pre-filled UK AST PDF |
| E-signature system | `SignaturePad.tsx` — draw/type + 2FA confirmation |
| My Documents | `my-documents.tsx` — store + view signed agreements |
| Deposit protection reminder | Scheme selector + legal notice display |
| Agreement hash generation | SHA-256 tamper-proof verification |

### Phase M4: UK Agency Integration (Weeks 10–12)

| Task | Description |
|------|-------------|
| Companies House API integration | Auto-verify agency CRN |
| Agency dashboard | `agency-dashboard.tsx` — bulk management, analytics |
| Multi-agent support | Invite agents, assign listings, team view |
| Agency profile page | Public-facing agency page with listings + reviews |
| Bulk upload (CSV) | Import multiple listings from spreadsheet |

### Phase M5: Restaurant Enhancements (Weeks 13–15)

| Task | Description |
|------|-------------|
| Community recommendations | "Recommend a Place" form + display |
| Restaurant reviews (Tier 1) | Write/read reviews on any restaurant |
| FSA API integration | Auto-fetch food hygiene ratings |
| Restaurant claim flow | Owner claims community recommendation |
| Claim conversion | Community Pick → Verified Business Listing |

### Phase M6: Advanced Verification (Weeks 16–18)

| Task | Description |
|------|-------------|
| Photo verification (Layer 2) | EXIF check, reverse image search, AI stock detection |
| Verified Visit (Layer 5) | In-app geotagged photo/video for physical verification |
| ⭐ Fully Verified badge | Premium listing verification level |
| Phone verification for restaurants | SMS code to business phone |
| HM Land Registry integration | Ownership document cross-check (£3/search) |

### Phase FUTURE: Agency Feed Import

| Task | Description |
|------|-------------|
| Rightmove BLM parser | Import standard Rightmove export format |
| Zoopla XML parser | Import standard Zoopla export format |
| Auto-sync scheduler | Daily sync from agency feed URL |
| Conflict resolution | Handle listing updates vs. manual edits |

---

## 10. Summary — The Complete ComLinkr Marketplace Model

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║  🏠 HOUSING                                                                    ║
║  ──────────                                                                    ║
║  POST = Verified Agencies (unlimited) & Verified Landlords (up to 5)           ║
║  BROWSE / APPLY / REVIEW = All users                                           ║
║  AGREEMENT = Digital AST between tenant & landlord (e-signed, PDF, stored)     ║
║                                                                                ║
║  VERIFY PERSON:                                                                ║
║  ├── Landlord: Gov ID + ownership proof (Land Registry / mortgage / CT bill)   ║
║  └── Agency: Companies House API + business registration + ARLA (optional)     ║
║                                                                                ║
║  VERIFY PROPERTY:                                                              ║
║  ├── Layer 1: Address validation (postcodes.io / Google Places)                ║
║  ├── Layer 2: Photo verification (EXIF, reverse image, AI stock detection)     ║
║  ├── Layer 3: EPC certificate cross-check (gov.uk open data)                  ║
║  ├── Layer 4: Community flagging (3+ flags → manual review)                    ║
║  └── Layer 5: Physical visit confirmation (geotagged evidence)                 ║
║                                                                                ║
║  LISTING TRUST LEVELS:                                                         ║
║  ├── 🔵 Basic Verified = person verified + address exists                       ║
║  ├── 🟢 Verified = Basic + EPC + photos pass checks                            ║
║  └── ⭐ Fully Verified = Verified + physical visit                              ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  🍽️ RESTAURANTS                                                                 ║
║  ──────────────                                                                ║
║  POST (full listing) = Verified Restaurant Owner only (with menu, hours, etc.) ║
║  RECOMMEND = Any user (community picks — lightweight recommendation)           ║
║  REVIEW = Any user (star rating + text + photos)                               ║
║  CLAIM = Owner claims a community recommendation → converts to full listing    ║
║                                                                                ║
║  VERIFY PERSON:                                                                ║
║  ├── Business registration / Companies House number                            ║
║  ├── Food hygiene rating certificate                                           ║
║  └── Phone verification (SMS to business number)                               ║
║                                                                                ║
║  VERIFY RESTAURANT:                                                            ║
║  ├── FSA food hygiene rating API (public data, automatic)                      ║
║  ├── Address validation (Google Places)                                        ║
║  ├── Phone verification (SMS code)                                             ║
║  └── Community flagging (3+ flags → review)                                    ║
║                                                                                ║
║  RESTAURANT TIERS (→ BP §12):                                                   ║
║  ├── Tier 1: Community Reviews (free, any user, Yelp-style)                    ║
║  └── Tier 2: Claimed Business Listing (paid subscription $29–99/mo)            ║
║                                                                                ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║                                                                                ║
║  🔗 BADGE PLAN INTEGRATION                                                      ║
║  ──────────────────────────                                                    ║
║  All authorization in this document flows through the badge system              ║
║  defined in BADGE_AUTHORIZATION_PLAN.md:                                       ║
║                                                                                ║
║  ├── Landlord posting rights    → "landlord" badge, "verified" status          ║
║  ├── Agency posting rights      → "agency" badge, "verified" status            ║
║  ├── Restaurant owner rights    → "restaurant_owner" badge, "verified" status  ║
║  ├── Badge application flow     → BP §9 (apply-badge.tsx)                      ║
║  ├── Admin verification         → BP §10 (web admin panel)                     ║
║  ├── Permission checks          → BP §8 (usePermissions hook)                  ║
║  └── Restaurant monetization    → BP §12 (two-tier subscription model)         ║
║                                                                                ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```

---

*This document is a companion to [BADGE_AUTHORIZATION_PLAN.md](./BADGE_AUTHORIZATION_PLAN.md) v2.0. Together they form the complete authorization, verification, and marketplace specification for the ComLinkr mobile app. All implementation work for housing, rental agreements, and restaurant features should reference both documents. Version 1.0 — Created March 3, 2026.*
