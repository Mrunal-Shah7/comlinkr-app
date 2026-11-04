# Comlinkr — Country & Verification Scalability Guide

This document describes how the badge verification system is structured with respect to markets/countries, what is currently supported, and exactly where code changes are needed when adding new countries or updating legal/document requirements.

---

## 1. Current State — What is Supported

### Markets (active)
| Market Code | Country | Notes |
|---|---|---|
| `US` | United States | Default fallback for unmapped countries |
| `UK` | United Kingdom | Explicit entry in `COUNTRY_TO_MARKET` |

All other countries (Canada, Australia, India, Germany…) fall back to US market treatment until their market code is added to `COUNTRY_TO_MARKET` in `auth.store.ts`.

### Countries in Onboarding / Location Picker
15 countries are available in the location picker (onboarding + city picker). These are independent of the verification market system:
```
United States, Canada, United Kingdom, Australia, Germany, France,
India, Brazil, Mexico, Japan, Singapore, New Zealand, South Africa, UAE, Ireland
```

### Badge Types
| Badge | Market-specific guidance |
|---|---|
| `landlord` | Ownership proofs, compliance certs differ by market |
| `restaurant_owner` | Business registration authority differs by market |
| `agency` | Regulatory body (ARLA/NAEA vs. state broker license) differs |
| `local_reviewer` | ID only — minimal market difference |

---

## 2. Architecture — How Country Detection Works (current)

### COUNTRY_TO_MARKET (auth.store.ts)
```ts
export const COUNTRY_TO_MARKET: Record<string, MarketCode> = {
  "United States": "US",
  "United Kingdom": "UK",
  // "Canada":   "CA",   ← uncomment + add docs to enable a new market
  // "Australia":"AU",
};

export function getMarketCode(country?: string): MarketCode {
  return COUNTRY_TO_MARKET[country ?? ""] ?? "US"; // "US" is the safe fallback
}
```
**Adding a new country = one commented line to uncomment** (plus the docs/labels entries below).

### marketFocus stored on BadgeApplication (auth.store.ts)
```ts
export interface BadgeApplication {
  marketFocus: MarketCode; // e.g. "US", "UK", "CA"
  // ...
}
// In applyForBadge:
marketFocus: getMarketCode(user.country), // auto-derived from user's country
```

### market + labels in apply-badge.tsx
```ts
const market = getMarketCode(user?.country);            // e.g. "UK"
const labels: MarketLabels = MARKET_LABELS[market] ?? MARKET_LABELS["US"]; // safe fallback
```
Everything in the UI (field labels, docs card, upload row text) reads from `labels`. New country → new entry in `MARKET_LABELS`.

---

## 3. The Three Config Objects to Update per New Country

All market-specific data lives in three places in `apps/mobile/app/apply-badge.tsx`. Everything else in the app is market-agnostic.

### A. MARKET_DOCS
```ts
const MARKET_DOCS: Record<string, Record<UserBadge, DocSection[]>> = {
  US: { landlord: [...], restaurant_owner: [...], agency: [...], local_reviewer: [...] },
  UK: { landlord: [...], restaurant_owner: [...], agency: [...], local_reviewer: [...] },
  // CA: { ... },  ← add here for Canada
};
```
- Each key is a `MarketCode` string
- Each badge type gets an array of `{ section: string; items: string[] }` groups
- Shown on Step 3 (document upload) as a collapsible accepted-docs card
- **If a market has NO entry here, no docs card is shown (graceful degradation)**

### B. MARKET_LABELS
```ts
type MarketLabels = {
  govIdDoc: string;              // label for government ID upload row
  agencyLicenseLabel: string;    // field label for agency license number
  agencyLicensePlaceholder: string;
  optionalDoc: string;           // label for optional document upload row
  landlordOptionalDoc?: string;  // if set, used for landlord badge optional doc
  marketDisplayName: string;     // shown in review summary ("United Kingdom")
  docsCardTitle: string;         // heading of the accepted-docs card
  docsCardNote?: string;         // optional footnote inside the docs card
  docsCardGradient: [string, string]; // color of the market flag badge
};

const MARKET_LABELS: Record<string, MarketLabels> = {
  US: { ... },
  UK: { ... },
  // CA: { ... },  ← add here for Canada
};
```
- Falls back to `MARKET_LABELS["US"]` if the user's market code is not in the map
- Controls ALL text that differs between markets in the UI

### C. BADGE_CONFIG marketNotes
```ts
const BADGE_CONFIG: Record<UserBadge, {
  marketNotes: Record<string, string>; // key = MarketCode, value = one-line guidance text
  // ...
}> = {
  landlord: {
    marketNotes: {
      US: "Accepted: Driver's license, passport...",
      UK: "Accepted: Passport, driving licence...",
      // CA: "Accepted: Provincial driver's licence...",
    },
  },
  // ...
};
```
- Shown on Step 1 (requirements) under the "Market" flag
- Falls back to `marketNotes["US"]` if the user's market code has no entry

---

## 4. Step-by-Step: Adding a New Country

**Example: Adding Canada (market code `"CA"`)**

### Step 1 — auth.store.ts (1 line)
```ts
export const COUNTRY_TO_MARKET: Record<string, MarketCode> = {
  "United States": "US",
  "United Kingdom": "UK",
  "Canada": "CA",   // ← uncomment / add this line
};
```

### Step 2 — apply-badge.tsx: BADGE_CONFIG marketNotes (4 entries, one per badge)
```ts
landlord: {
  marketNotes: {
    US: "...",
    UK: "...",
    CA: "Accepted: Provincial driver's licence or passport. For ownership: property deed, mortgage statement, or MPAC assessment.",
  },
},
// repeat for restaurant_owner, agency, local_reviewer
```

### Step 3 — apply-badge.tsx: MARKET_DOCS (document lists per badge)
```ts
const MARKET_DOCS = {
  US: { ... },
  UK: { ... },
  CA: {
    landlord: [
      { section: "Photo ID (one required)", items: ["Canadian passport", "Provincial driver's licence", "PR Card"] },
      { section: "Proof of Ownership (one required)", items: ["Property deed", "Mortgage statement", "MPAC assessment"] },
    ],
    restaurant_owner: [ ... ],
    agency: [ ... ],
    local_reviewer: [ ... ],
  },
};
```

### Step 4 — apply-badge.tsx: MARKET_LABELS (UI labels)
```ts
const MARKET_LABELS = {
  US: { ... },
  UK: { ... },
  CA: {
    govIdDoc: "Passport, Provincial ID, or PR Card",
    agencyLicenseLabel: "Provincial Real Estate Council License",
    agencyLicensePlaceholder: "e.g. RECA or RECO license number",
    optionalDoc: "Property / Business Photo (optional)",
    marketDisplayName: "Canada",
    docsCardTitle: "CA Accepted Documents",
    docsCardGradient: ["#FF0000", "#D80000"],
  },
};
```

### Step 5 — locationData.ts (only if country not already in the picker)
```ts
// COUNTRY_INFO
"Canada": { flag: "🇨🇦", code: "+1" },  // already present

// STATES_BY_COUNTRY — already present for Canada
// CITIES_BY_STATE — add cities for any Canadian provinces not yet covered
```

That's it. 4 config entries + 1 mapping line. No logic changes needed anywhere.

---

## 5. Updating Legal / Document Requirements (Existing Markets)

| What changed | Where to edit | Scope |
|---|---|---|
| Accepted document types for a badge (e.g. new UK regulation) | `MARKET_DOCS["UK"][badge]` | add/remove/rename items in the array |
| One-line guidance summary on requirements screen | `BADGE_CONFIG[badge].marketNotes["UK"]` | single string |
| Government ID upload row label | `MARKET_LABELS["UK"].govIdDoc` | single string |
| Optional document label (non-landlord) | `MARKET_LABELS["UK"].optionalDoc` | single string |
| Optional document label (landlord only) | `MARKET_LABELS["UK"].landlordOptionalDoc` | single string |
| Footer note inside docs card | `MARKET_LABELS["UK"].docsCardNote` | single string |
| Fraud / safety guidelines | `FRAUD_GUIDELINES` array (top of apply-badge.tsx) | add/edit items — applies to all markets |
| Badge requirements checklist (Step 1) | `BADGE_CONFIG[badge].requirements` | add/edit items — applies to all markets |
| Badge unlock features list | `BADGE_CONFIG[badge].unlocks` | add/edit items — applies to all markets |

---

## 6. File Reference — What is Market-Aware vs. Not

### Market-aware (touch these when adding/updating a country)
| File | What it contains |
|---|---|
| `auth.store.ts` | `COUNTRY_TO_MARKET`, `getMarketCode`, `BadgeApplication.marketFocus` |
| `app/apply-badge.tsx` | `MARKET_DOCS`, `MARKET_LABELS`, `BADGE_CONFIG.marketNotes` |
| `src/data/locationData.ts` | Country/state/city data for onboarding + city picker |

### NOT market-aware (no changes needed for new countries)
| File | Why |
|---|---|
| `src/shared/hooks/usePermissions.ts` | Badge status logic — no market branching |
| `app/create-post.tsx` | Lock/unlock uses badge status only |
| `app/profile.tsx` | Badge display rows — no market branching |
| `app/(tabs)/_layout.tsx`, feed, food, community | No market logic |

---

## 7. Summary Table — Scenarios vs. Files

| Scenario | Files to touch |
|---|---|
| Add country to location picker only | `src/data/locationData.ts` |
| Add country to verification system | `auth.store.ts` (1 line) + `apply-badge.tsx` (3 config entries) + `locationData.ts` if needed |
| Update accepted docs for one badge in one market | `apply-badge.tsx` → `MARKET_DOCS[market][badge]` |
| Update one-line requirement summary for a market | `apply-badge.tsx` → `BADGE_CONFIG[badge].marketNotes[market]` |
| Update UI field label for a market | `apply-badge.tsx` → `MARKET_LABELS[market]` |
| Add a new badge type | `auth.store.ts`, `usePermissions.ts`, `apply-badge.tsx` (BADGE_CONFIG + MARKET_DOCS all markets + MARKET_LABELS no change needed), `profile.tsx`, `create-post.tsx` |
| Change fraud/safety guidelines (all markets) | `apply-badge.tsx` → `FRAUD_GUIDELINES` array |
