export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  address: string;
  neighborhood: string;
  city: string;
  type: "apartment" | "room" | "house" | "studio";
  amenities: string[];
  images: string[];
  landlord: {
    name: string;
    avatar?: string;
    verified: boolean;
    email?: string;
    phone?: string;
  };
  available: boolean;
  availability?: string;
  postedDate: string;
  featured?: boolean;
  aiVerified?: boolean;
}

export interface ListingFilter {
  priceMin?: number;
  priceMax?: number;
  bedrooms?: number;
  type?: string;
  neighborhood?: string;
}