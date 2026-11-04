// src/data/appData.ts
// Single source of truth for all real app content data.
// Imported by both the main app screens AND the admin dashboard.

// ── Housing ───────────────────────────────────────────────────────────────────

export interface HousingListing {
  id: string;
  title: string;
  price: string;
  priceNote: string;
  deposit: string;
  type: string;
  beds: number;
  baths: number;
  sqft: string;
  floor: string;
  yearBuilt: string;
  location: string;
  address: string;
  available: string;
  petPolicy: string;
  parking: string;
  laundry: string;
  heating: string;
  cooling: string;
  utilities: string;
  leaseTerm: string;
  neighborhood: string;
  furnished: string;
  description: string;
  images: string[];
  verified: boolean;
  featured: boolean;
  isNew?: boolean;
  tags: string[];
  walkScore: number;
  transitInfo: string;
  landlord: {
    name: string;
    initials: string;
    since: string;
    rating: number;
    responseTime: string;
    color: string;
  };
}

export const HOUSING_LISTINGS: HousingListing[] = [
  {
    id: "1",
    title: "Modern 2BR in Downtown",
    price: "$2,400",
    priceNote: "/ month",
    deposit: "$4,800",
    type: "Apartment",
    beds: 2,
    baths: 1,
    sqft: "950",
    floor: "12th Floor",
    yearBuilt: "2018",
    location: "Downtown Manhattan",
    address: "45 West 23rd St, New York, NY 10010",
    available: "Mar 1, 2026",
    petPolicy: "Cats allowed",
    parking: "Street parking",
    laundry: "In-Unit Washer/Dryer",
    heating: "Central Heat",
    cooling: "Central A/C",
    utilities: "Tenant pays electric & gas",
    leaseTerm: "12 months",
    neighborhood: "Chelsea / Flatiron",
    furnished: "Unfurnished",
    description:
      "A stunning modern apartment in the heart of Downtown Manhattan. Floor-to-ceiling windows offer breathtaking city views. Recently renovated kitchen with stainless steel appliances and quartz countertops. Steps from multiple subway lines, world-class restaurants, and Hudson River Park.",
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
    ],
    verified: true,
    featured: true,
    isNew: true,
    walkScore: 98,
    transitInfo: "2 min to 6 train",
    tags: ["Pet Friendly", "Gym", "Doorman", "In-Unit Laundry", "Dishwasher", "A/C"],
    landlord: {
      name: "Sarah Johnson",
      initials: "SJ",
      since: "2019",
      rating: 4.9,
      responseTime: "< 1 hour",
      color: "#0076EB",
    },
  },
  {
    id: "2",
    title: "Cozy Studio Near Central Park",
    price: "$1,650",
    priceNote: "/ month",
    deposit: "$3,300",
    type: "Studio",
    beds: 0,
    baths: 1,
    sqft: "480",
    floor: "4th Floor",
    yearBuilt: "2005",
    location: "Midtown West",
    address: "212 W 56th St, New York, NY 10019",
    available: "Immediate",
    petPolicy: "No pets",
    parking: "Nearby garage",
    laundry: "Shared Laundry Room",
    heating: "Radiator",
    cooling: "Window A/C",
    utilities: "All utilities included",
    leaseTerm: "12 months",
    neighborhood: "Hell's Kitchen",
    furnished: "Furnished Option Available",
    description:
      "Charming studio apartment in a prime Midtown location, just 3 blocks from Central Park. All utilities included in rent. Bright and airy with excellent natural light. Perfect for a working professional or graduate student. Building has elevator and rooftop access.",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=80",
    ],
    verified: true,
    featured: false,
    walkScore: 95,
    transitInfo: "1 min to N/R/W",
    tags: ["Utilities Incl.", "Elevator", "Gym", "Rooftop Access", "Furnished Option"],
    landlord: {
      name: "Michael Torres",
      initials: "MT",
      since: "2021",
      rating: 4.7,
      responseTime: "< 2 hours",
      color: "#26B324",
    },
  },
  {
    id: "3",
    title: "Spacious 3BR Family Home",
    price: "$3,200",
    priceNote: "/ month",
    deposit: "$6,400",
    type: "House",
    beds: 3,
    baths: 2,
    sqft: "1,800",
    floor: "2 Stories",
    yearBuilt: "2002",
    location: "Forest Hills, Queens",
    address: "78 Ascan Ave, Forest Hills, NY 11375",
    available: "Apr 1, 2026",
    petPolicy: "Pets welcome",
    parking: "2-car garage",
    laundry: "Washer/Dryer in Basement",
    heating: "Forced Air",
    cooling: "Central A/C",
    utilities: "Tenant pays all utilities",
    leaseTerm: "12–24 months",
    neighborhood: "Forest Hills Gardens",
    furnished: "Unfurnished",
    description:
      "Beautiful family home with a private backyard in the quiet Forest Hills neighborhood. Newly renovated kitchen, hardwood floors throughout, finished basement, and central A/C. Located in a top-rated school district with easy access to the E, F, M, and R trains.",
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    ],
    verified: false,
    featured: false,
    walkScore: 72,
    transitInfo: "5 min to E/F/M/R",
    tags: ["Backyard", "2-Car Garage", "Pets OK", "Basement", "Central A/C", "Washer/Dryer"],
    landlord: {
      name: "Robert Kim",
      initials: "RK",
      since: "2018",
      rating: 4.5,
      responseTime: "< 4 hours",
      color: "#FF7B00",
    },
  },
  {
    id: "4",
    title: "Furnished Room in Shared Apt",
    price: "$900",
    priceNote: "/ month",
    deposit: "$900",
    type: "Room",
    beds: 1,
    baths: 1,
    sqft: "200",
    floor: "3rd Floor",
    yearBuilt: "1995",
    location: "East Village",
    address: "135 E 9th St, New York, NY 10003",
    available: "Immediate",
    petPolicy: "No pets",
    parking: "Street parking",
    laundry: "Laundry Nearby",
    heating: "Radiator",
    cooling: "Window A/C",
    utilities: "All bills included",
    leaseTerm: "6 months minimum",
    neighborhood: "Alphabet City",
    furnished: "Fully Furnished",
    description:
      "Fully furnished private room in a clean, well-maintained 3-bedroom shared apartment. All bills included — WiFi, electric, and water. Shared with 2 friendly working professionals. Prime East Village location with abundant restaurants, bars, and the L/6 train nearby.",
    images: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80",
    ],
    verified: true,
    featured: false,
    walkScore: 97,
    transitInfo: "1 min to L/6 train",
    tags: ["Furnished", "Bills Incl.", "WiFi", "Shared Kitchen", "Laundry Nearby"],
    landlord: {
      name: "Anna Petrov",
      initials: "AP",
      since: "2022",
      rating: 4.8,
      responseTime: "< 30 min",
      color: "#FF7B00",
    },
  },
  {
    id: "5",
    title: "Luxury Penthouse with City Views",
    price: "$5,500",
    priceNote: "/ month",
    deposit: "$11,000",
    type: "Apartment",
    beds: 3,
    baths: 2,
    sqft: "2,200",
    floor: "32nd Floor (PH)",
    yearBuilt: "2020",
    location: "Financial District",
    address: "1 Wall Street Ct, New York, NY 10005",
    available: "Mar 15, 2026",
    petPolicy: "Small pets ($200 fee)",
    parking: "1 spot included",
    laundry: "In-Unit Washer/Dryer",
    heating: "Central Heat",
    cooling: "Central A/C",
    utilities: "Water & trash included",
    leaseTerm: "12 months",
    neighborhood: "FiDi / Battery Park",
    furnished: "Unfurnished",
    description:
      "Breathtaking penthouse with panoramic views of Manhattan and the Hudson River. Chef's kitchen with Miele appliances, spa-inspired master bath, private wraparound terrace, and floor-to-ceiling glass walls. Building amenities include 24/7 concierge, resort-style pool, and world-class fitness center.",
    images: [
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1549517045-bc93de075e53?auto=format&fit=crop&w=800&q=80",
    ],
    verified: true,
    featured: true,
    isNew: true,
    walkScore: 100,
    transitInfo: "2 min to 4/5 train",
    tags: ["Doorman", "Private Terrace", "Pool", "Gym", "Concierge", "Parking", "Washer/Dryer"],
    landlord: {
      name: "Empire Realty Group",
      initials: "ER",
      since: "2015",
      rating: 4.6,
      responseTime: "< 1 hour",
      color: "#0A2540",
    },
  },
];

// ── Food / Restaurants ────────────────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  price: string;
  distance: string;
  image: string;
  verified: boolean;
  tags: string[];
  openNow: boolean;
  closingTime: string;
  services: string[];
  popularDishes: string[];
  waitTime: string | null;
}

export const RESTAURANTS: Restaurant[] = [
  { id: "1", name: "Bella Napoli", cuisine: "Italian", rating: 4.8, reviews: 234, price: "$$", distance: "0.3 mi", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=700&q=80", verified: true, tags: ["Pasta", "Pizza", "Wine"], openNow: true, closingTime: "11 PM", services: ["Dine-in", "Takeout"], popularDishes: ["Margherita Pizza", "Cacio e Pepe"], waitTime: "~15 min" },
  { id: "2", name: "Taqueria El Sol", cuisine: "Mexican", rating: 4.6, reviews: 189, price: "$", distance: "0.5 mi", image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=700&q=80", verified: true, tags: ["Tacos", "Burritos"], openNow: true, closingTime: "10 PM", services: ["Dine-in", "Takeout", "Delivery"], popularDishes: ["Al Pastor Tacos", "Carnitas Burrito"], waitTime: "~10 min" },
  { id: "3", name: "Sakura Sushi", cuisine: "Japanese", rating: 4.9, reviews: 312, price: "$$$", distance: "0.8 mi", image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=700&q=80", verified: true, tags: ["Sushi", "Omakase"], openNow: true, closingTime: "10:30 PM", services: ["Dine-in"], popularDishes: ["Omakase Set", "Dragon Roll"], waitTime: "~30 min" },
  { id: "4", name: "Thai Orchid", cuisine: "Thai", rating: 4.5, reviews: 156, price: "$$", distance: "1.2 mi", image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=700&q=80", verified: false, tags: ["Curry", "Pad Thai"], openNow: false, closingTime: "9 PM", services: ["Dine-in", "Delivery"], popularDishes: ["Pad Thai", "Green Curry"], waitTime: null },
  { id: "5", name: "Spice Route", cuisine: "Indian", rating: 4.7, reviews: 201, price: "$$", distance: "0.7 mi", image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=700&q=80", verified: true, tags: ["Curry", "Naan", "Biryani"], openNow: true, closingTime: "10 PM", services: ["Dine-in", "Takeout", "Delivery"], popularDishes: ["Butter Chicken", "Garlic Naan"], waitTime: "~20 min" },
  { id: "6", name: "Dragon Palace", cuisine: "Chinese", rating: 4.4, reviews: 178, price: "$", distance: "1.5 mi", image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=700&q=80", verified: false, tags: ["Dim Sum", "Noodles"], openNow: true, closingTime: "9:30 PM", services: ["Dine-in", "Takeout"], popularDishes: ["Dim Sum Basket", "BBQ Pork Buns"], waitTime: "~25 min" },
  { id: "7", name: "The Classic Diner", cuisine: "American", rating: 4.3, reviews: 145, price: "$", distance: "0.2 mi", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=80", verified: true, tags: ["Burgers", "Shakes"], openNow: true, closingTime: "Midnight", services: ["Dine-in", "Takeout", "Delivery"], popularDishes: ["Classic Cheeseburger", "Vanilla Milkshake"], waitTime: "~5 min" },
  { id: "8", name: "Olive & Vine", cuisine: "Mediterranean", rating: 4.6, reviews: 167, price: "$$", distance: "0.9 mi", image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=700&q=80", verified: false, tags: ["Hummus", "Falafel", "Kebab"], openNow: false, closingTime: "9 PM", services: ["Dine-in", "Takeout"], popularDishes: ["Mixed Mezze Platter", "Lamb Kebab"], waitTime: null },
];
