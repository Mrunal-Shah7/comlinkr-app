// src/services/cache/queryKeys.ts
//
// Every React Query key in one place. A list's key carries everything its result depends on (city, filters,
// signed-in user), so a change to any of them is a new query rather than stale data under the old key.

type Filters = Record<string, unknown> | undefined;

export const queryKeys = {
  notifications: () => ['notifications'] as const,
  event: (id: string) => ['events', 'detail', id] as const,
  eventsList: (filters: Filters) => ['events', 'list', filters ?? {}] as const,
  publicProfile: (userId: string) => ['users', 'public', userId] as const,
  verification: () => ['me', 'verification'] as const,
  myListings: () => ['me', 'listings'] as const,
  myRestaurants: () => ['me', 'restaurants'] as const,
  myPosts: () => ['me', 'posts'] as const,
  follows: (kind: 'followers' | 'following' | 'requests') => ['me', 'follows', kind] as const,
  saved: () => ['me', 'saved'] as const,
  landlordDashboard: () => ['me', 'landlord'] as const,
  restaurantPicker: (city: string | null | undefined) => ['restaurants', 'picker', city ?? ''] as const,
  housing: (city: string | null | undefined, filters: Filters) => ['housing', city ?? '', filters ?? {}] as const,
  food: (city: string | null | undefined, filters: Filters) => ['food', city ?? '', filters ?? {}] as const,
  community: (city: string | null | undefined, filters: Filters) => ['community', city ?? '', filters ?? {}] as const,
  feed: (tab: string, city: string | null | undefined, filters: Filters) => ['feed', tab, city ?? '', filters ?? {}] as const,
  conversations: () => ['chat', 'conversations'] as const,
};
