import { useState, useEffect } from "react";
import EnhancedListingCard from "../components/EnhancedListingCard";
import { mockListings } from "../../../shared/data/mock/mockListings";
import { Filter } from "lucide-react";
import { useToast } from "../../../shared/ui/Toast";
import { Listing } from "../housing.types";

const STORAGE_KEY = "comlinkr_listings";

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const { notify } = useToast();

  // Load listings from localStorage, fall back to mock data
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setListings(JSON.parse(stored));
      } catch {
        setListings(mockListings);
      }
    } else {
      setListings(mockListings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockListings));
    }
  }, []);

  // Listen for storage events (when new listing is created)
  useEffect(() => {
    function handleStorageChange() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setListings(JSON.parse(stored));
        } catch { /* ignore */ }
      }
    }

    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-tab updates
    window.addEventListener("listings-updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("listings-updated", handleStorageChange);
    };
  }, []);

  function handleFilterClick() {
    notify("🔍 Filter options coming soon!");
  }

  return (
    <div className="space-y-5">
      {/* Premium Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0062CC] via-[#0076EB] to-[#004AAD] p-5 text-white shadow-xl overflow-hidden">
        {/* Decorative accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-200 mb-1">Housing</p>
            <h1 className="text-2xl font-bold tracking-tight">Find Your Home</h1>
            <p className="text-sm text-blue-100/90 mt-1">{listings.length} properties available</p>
          </div>
          <button 
            onClick={handleFilterClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all duration-200 shadow-lg border border-white/15 hover:scale-105 active:scale-95"
            aria-label="Filter listings"
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {[...listings].sort((a, b) => {
          if (a.aiVerified === true && b.aiVerified !== true) return -1;
          if (a.aiVerified !== true && b.aiVerified === true) return 1;
          return 0;
        }).map((listing) => (
          <EnhancedListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
