import type { Listing } from "../../../features/housing/housing.types";

export const mockListings: Listing[] = [
  {
    id: "l1",
    title: "SoHo Studio Loft",
    description: "Bright and modern studio in the heart of SoHo. Walking distance to restaurants, shops, and galleries. Perfect for young professionals.",
    price: 2100,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 650,
    address: "123 Prince St",
    neighborhood: "SoHo",
    city: "New York",
    type: "studio",
    amenities: ["WiFi", "Laundry", "Elevator", "Gym", "Doorman"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
    ],
    landlord: {
      name: "Maria Chen",
      avatar: "https://i.pravatar.cc/150?img=32",
      verified: true,
      email: "maria.chen@example.com",
      phone: "(555) 123-4567"
    },
    available: true,
    availability: "Available Now",
    postedDate: "2 days ago",
    featured: true
  },
  {
    id: "l2",
    title: "Brooklyn Heights Room",
    description: "Cozy room in a shared apartment near Brooklyn Bridge Park. Quiet neighborhood with great views.",
    price: 1350,
    bedrooms: 1,
    bathrooms: 1,
    address: "45 Hicks St",
    neighborhood: "Brooklyn Heights",
    city: "New York",
    type: "room",
    amenities: ["WiFi", "Kitchen", "Near Park"],
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1556912167-f556f1f39faa?auto=format&fit=crop&w=800&q=80"
    ],
    landlord: {
      name: "John Smith",
      avatar: "https://i.pravatar.cc/150?img=12",
      verified: true,
      email: "john.smith@example.com",
      phone: "(555) 234-5678"
    },
    available: true,
    availability: "Available March 1",
    postedDate: "5 days ago"
  },
  {
    id: "l3",
    title: "Williamsburg 2BR",
    description: "Spacious 2-bedroom apartment with modern kitchen and living room. Close to subway and nightlife.",
    price: 3200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    address: "88 Bedford Ave",
    neighborhood: "Williamsburg",
    city: "New York",
    type: "apartment",
    amenities: ["WiFi", "Dishwasher", "Washer/Dryer", "Balcony", "Pet Friendly"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80"
    ],
    landlord: {
      name: "Sarah Johnson",
      avatar: "https://i.pravatar.cc/150?img=5",
      verified: true,
      email: "sarah.j@example.com",
      phone: "(555) 345-6789"
    },
    available: true,
    availability: "Available Now",
    postedDate: "1 week ago",
    featured: true
  },
  {
    id: "l4",
    title: "East Village Studio",
    description: "Charming studio with exposed brick and hardwood floors. Vibrant neighborhood with endless dining options.",
    price: 1900,
    bedrooms: 0,
    bathrooms: 1,
    sqft: 500,
    address: "12 St Marks Pl",
    neighborhood: "East Village",
    city: "New York",
    type: "studio",
    amenities: ["WiFi", "Heating", "Laundry in Building"],
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80"
    ],
    landlord: {
      name: "David Lee",
      avatar: "https://i.pravatar.cc/150?img=68",
      verified: false,
      email: "david.lee@example.com",
      phone: "(555) 456-7890"
    },
    available: true,
    availability: "Available Feb 15",
    postedDate: "3 days ago"
  },
  {
    id: "l5",
    title: "Upper West Side 3BR",
    description: "Elegant 3-bedroom apartment near Central Park. Perfect for families or roommates. Recently renovated.",
    price: 4500,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    address: "200 West 79th St",
    neighborhood: "Upper West Side",
    city: "New York",
    type: "apartment",
    amenities: ["WiFi", "Doorman", "Gym", "Elevator", "Dishwasher", "Central AC"],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80"
    ],
    landlord: {
      name: "Emily Rodriguez",
      avatar: "https://i.pravatar.cc/150?img=9",
      verified: true,
      email: "emily.r@example.com",
      phone: "(555) 567-8901"
    },
    available: true,
    availability: "Available Now",
    postedDate: "4 days ago",
    featured: true
  }
];
