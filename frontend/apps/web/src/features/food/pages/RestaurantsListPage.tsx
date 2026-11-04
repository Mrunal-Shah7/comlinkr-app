import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, UtensilsCrossed, Plus, Heart } from "lucide-react";
import SectionHeader from "../../../app/layout/SectionHeader";
import { restaurants as initialRestaurants } from "../../../shared/data/mock/comlinkr.mock";
import RestaurantCard from "../components/RestaurantCard";
import CuisineFilter from "../components/CuisineFilter";
import PriceFilter from "../components/PriceFilter";
import CreateRestaurantModal from "../components/CreateRestaurantModal";
import { Restaurant } from "../../../shared/types/restaurant";
import Button from "../../../shared/ui/Button";

const STORAGE_KEY = 'comlinkr_restaurants';
const FAVORITES_KEY = 'comlinkr_favorite_restaurants';

type SortOption = 'rating' | 'distance' | 'name';
type ViewFilter = 'all' | 'favorites';

export default function RestaurantsListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load restaurants and favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedFavorites = localStorage.getItem(FAVORITES_KEY);
    
    if (stored) {
      try {
        setRestaurants(JSON.parse(stored));
      } catch {
        setRestaurants(initialRestaurants);
      }
    } else {
      setRestaurants(initialRestaurants);
    }

    if (storedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(storedFavorites)));
      } catch {
        setFavorites(new Set());
      }
    }
  }, []);

  // Save restaurants to localStorage
  useEffect(() => {
    if (restaurants.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
    }
  }, [restaurants]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const toggleFavorite = (restaurantId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(restaurantId)) {
        newFavorites.delete(restaurantId);
      } else {
        newFavorites.add(restaurantId);
      }
      return newFavorites;
    });
  };

  // Filter and sort restaurants
  const filteredRestaurants = restaurants
    .filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (r.location.area ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCuisine = !selectedCuisine || r.cuisine.toLowerCase() === selectedCuisine.toLowerCase();
      const matchesPrice = !selectedPrice || r.price === selectedPrice;
      const matchesFavorites = viewFilter === 'all' || favorites.has(r.id);
      return matchesSearch && matchesCuisine && matchesPrice && matchesFavorites;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'distance':
          return parseFloat(a.distance) - parseFloat(b.distance);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCuisine(null);
    setSelectedPrice(null);
    setSortBy('rating');
    setViewFilter('all');
  };

  const hasActiveFilters = searchQuery || selectedCuisine || selectedPrice || sortBy !== 'rating' || viewFilter !== 'all';

  return (
    <div className="space-y-5 pb-20">
      {/* Premium Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#1a8a18] via-[#22a020] to-[#178a45] px-5 py-6 text-white shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-green-200">Food & Dining</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Discover Local Flavors</h2>
          <p className="mt-1 text-sm text-green-100/90">{restaurants.length} restaurants to explore</p>
          
          {/* View Toggle */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setViewFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewFilter === 'all' 
                  ? 'bg-white text-[#1a8a18] shadow-lg' 
                  : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewFilter('favorites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewFilter === 'favorites' 
                  ? 'bg-white text-[#1a8a18] shadow-lg' 
                  : 'bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/10'
              }`}
            >
              <Heart className={`h-4 w-4 ${viewFilter === 'favorites' ? 'fill-red-500 text-red-500' : ''}`} />
              Favorites ({favorites.size})
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          placeholder="Search restaurants, cuisines, or areas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm placeholder:text-gray-400 focus:border-[#1a8a18] focus:outline-none focus:ring-2 focus:ring-[#1a8a18]/15 transition-all shadow-sm"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4 text-gray-400" />
          Filters {hasActiveFilters && `(${[selectedCuisine, selectedPrice, sortBy !== 'rating' ? 'sorted' : null].filter(Boolean).length})`}
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm font-semibold text-[#1a8a18] hover:text-[#157315] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 animate-slideUp shadow-sm">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Cuisine Type</label>
            <CuisineFilter selected={selectedCuisine} onSelect={setSelectedCuisine} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Price Range</label>
            <PriceFilter selected={selectedPrice} onSelect={setSelectedPrice} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Sort By</label>
            <div className="flex gap-2">
              {(['rating', 'distance', 'name'] as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setSortBy(option)}
                  className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200 capitalize ${
                    sortBy === option
                      ? 'bg-[#1a8a18] text-white border-transparent shadow-md'
                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#1a8a18] hover:text-[#1a8a18]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <SectionHeader 
        title={`${filteredRestaurants.length} Restaurant${filteredRestaurants.length !== 1 ? 's' : ''}${hasActiveFilters ? ' · Filtered' : ''}`}
      />

      {/* Restaurant List */}
      <div className="space-y-4">
        {filteredRestaurants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-200" />
            <p className="mt-3 text-sm font-medium text-gray-400">
              {hasActiveFilters ? 'No restaurants match your filters' : 'No restaurants yet'}
            </p>
            {hasActiveFilters && (
              <Button 
                variant="primary" 
                className="mt-4 bg-[#1a8a18] hover:bg-[#157315]"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          filteredRestaurants.map((restaurant) => (
            <RestaurantCard 
              key={restaurant.id} 
              restaurant={restaurant}
              isFavorite={favorites.has(restaurant.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="fixed bottom-24 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1a8a18] text-white shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 hover:bg-[#157315] hover:scale-105 active:scale-95 transition-all duration-200"
        aria-label="Add restaurant"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Restaurant Modal */}
      <CreateRestaurantModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  );
}
