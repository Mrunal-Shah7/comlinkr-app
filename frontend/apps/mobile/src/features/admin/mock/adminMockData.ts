// SPRINT-41: Types-only module — all seeded mock arrays removed.
// SPRINT-41: Retained because non-eight admin screens import these types (Feed, Food, Community, Roommates).
// SPRINT-41: Formerly held MOCK_* fixtures; those arrays are gone so admin UI cannot fall back to them.

export interface FeedPost {
  id: string;
  title: string;
  author: string;
  authorId: string;
  type: 'news' | 'story' | 'poll' | 'event' | 'challenge';
  status: 'published' | 'pending' | 'flagged' | 'removed';
  date: string;
  likes: number;
  comments: number;
  views: number;
  reports: number;
  featured: boolean;
  tags: string[];
  /** SPRINT-42: full post body — dropped by the card view but needed for the detail modal. */
  content?: string;
  /** SPRINT-42: raw ISO createdAt (in addition to the pre-formatted `date`). */
  createdAt?: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  author: string;
  authorId: string;
  category: 'question' | 'discussion' | 'tip' | 'announcement';
  status: 'published' | 'pending' | 'flagged' | 'removed';
  date: string;
  upvotes: number;
  answers: number;
  views: number;
  reports: number;
  pinned: boolean;
  tags: string[];
  /** SPRINT-42: full question/post body — dropped by the card view but needed for the detail modal. */
  content?: string;
  /** SPRINT-42: raw ISO createdAt (in addition to the pre-formatted `date`). */
  createdAt?: string;
}

export interface RoommateProfile {
  id: string;
  name: string;
  age: number;
  occupation: string;
  budget: string;
  location: string;
  moveInDate: string;
  status: 'active' | 'pending' | 'matched' | 'suspended';
  verified: boolean;
  gender: string;
  genderPref: string;
  lookingFor: 'room' | 'roommate';
  submittedDate: string;
  views: number;
  matches: number;
  reports: number;
  /** SPRINT-42: full bio text — `occupation` above is truncated to 48 chars for the card. */
  bio?: string;
  /** SPRINT-42: avatar / profile photo URL, when available. */
  avatarUrl?: string;
  /** SPRINT-42: roommate lifestyle preferences, when the user has set them. */
  preferences?: {
    sleepSchedule?: string;
    cleanliness?: string;
    noiseLevel?: string;
    guestPolicy?: string;
    petFriendly?: boolean;
    smoking?: boolean;
    workFromHome?: boolean;
  } | null;
  interests?: string[];
  languages?: string[];
  username?: string;
}

/** @deprecated Prefer AdminSupportTicketView from useAdmin — category/priority not on backend */
export interface SupportTicket {
  id: string;
  userName: string;
  email: string;
  category?: 'billing' | 'technical' | 'listing' | 'account' | 'abuse' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'replied' | 'closed' | 'in_progress' | 'resolved';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  adminResponse?: string;
}

/** @deprecated Prefer AdminSessionItem from admin.api */
export interface AuthSession {
  id: string;
  userId: string;
  userName: string;
  email: string;
  device?: 'mobile' | 'web';
  os?: string;
  ip?: string;
  location?: string;
  loginTime?: string;
  lastActive?: string;
  status?: 'active' | 'expired' | 'revoked';
  suspicious?: boolean;
}

export interface FoodListing {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  price: string;
  verified: boolean;
  openNow: boolean;
  status: 'active' | 'pending' | 'suspended';
  reports: number;
  services: string[];
  /** SPRINT-42: full restaurant profile fields — not shown on the card, needed for the detail view. */
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  images?: string[];
}
