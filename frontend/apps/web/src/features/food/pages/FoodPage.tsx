import { useState, useEffect, useMemo } from "react";
import { Utensils, Search, SlidersHorizontal, UtensilsCrossed, Plus, Heart, Star, MapPin, Clock, Award } from "lucide-react";
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
type ViewTab = 'all' | 'favorites' | 'top-rated' | 'nearby';

export default function FoodPage() {
	const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
	const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<SortOption>('rating');
	const [showFilters, setShowFilters] = useState(false);
	const [favorites, setFavorites] = useState<Set<string>>(new Set());
	const [activeTab, setActiveTab] = useState<ViewTab>('all');
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

	// Listen for restaurant updates from create pages
	useEffect(() => {
		function handleRestaurantsUpdate() {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				try { setRestaurants(JSON.parse(stored)); } catch { /* ignore */ }
			}
		}
		window.addEventListener("restaurants-updated", handleRestaurantsUpdate);
		window.addEventListener("storage", handleRestaurantsUpdate);
		return () => {
			window.removeEventListener("restaurants-updated", handleRestaurantsUpdate);
			window.removeEventListener("storage", handleRestaurantsUpdate);
		};
	}, []);

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
	const filteredRestaurants = useMemo(() => {
		return restaurants
			.filter(r => {
				const matchesSearch = !searchQuery ||
					r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(r.location.area ?? '').toLowerCase().includes(searchQuery.toLowerCase());
				const matchesCuisine = !selectedCuisine || r.cuisine.toLowerCase() === selectedCuisine.toLowerCase();
				const matchesPrice = !selectedPrice || r.price === selectedPrice;
				const matchesTab = (() => {
					switch (activeTab) {
						case 'favorites': return favorites.has(r.id);
						case 'top-rated': return r.rating >= 4.5;
						case 'nearby': return parseFloat(r.distance) <= 2;
						default: return true;
					}
				})();
				return matchesSearch && matchesCuisine && matchesPrice && matchesTab;
			})
			.sort((a, b) => {
				switch (sortBy) {
					case 'rating': return b.rating - a.rating;
					case 'distance': return parseFloat(a.distance) - parseFloat(b.distance);
					case 'name': return a.name.localeCompare(b.name);
					default: return 0;
				}
			});
	}, [restaurants, searchQuery, selectedCuisine, selectedPrice, sortBy, activeTab, favorites]);

	const clearFilters = () => {
		setSearchQuery("");
		setSelectedCuisine(null);
		setSelectedPrice(null);
		setSortBy('rating');
	};

	const hasActiveFilters = searchQuery || selectedCuisine || selectedPrice || sortBy !== 'rating';

	const TABS: { key: ViewTab; label: string; icon: typeof Star; count?: number }[] = [
		{ key: 'all', label: 'All', icon: Utensils, count: restaurants.length },
		{ key: 'top-rated', label: 'Top Rated', icon: Award, count: restaurants.filter(r => r.rating >= 4.5).length },
		{ key: 'nearby', label: 'Nearby', icon: MapPin, count: restaurants.filter(r => parseFloat(r.distance) <= 2).length },
		{ key: 'favorites', label: 'Favorites', icon: Heart, count: favorites.size },
	];

	return (
		<div className="space-y-5 pb-20">
			{/* Compact Hero */}
			<div className="relative rounded-2xl bg-gradient-to-br from-[#1a8a18] via-[#22a020] to-[#178a45] px-5 py-5 text-white shadow-xl overflow-hidden">
				<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
				<div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
				<div className="relative">
					<div className="flex items-center gap-2 mb-1.5">
						<Utensils className="h-4 w-4 text-green-200" />
						<p className="text-[11px] font-semibold uppercase tracking-widest text-green-200">Food & Dining</p>
					</div>
					<h1 className="text-[22px] font-bold tracking-tight">Discover Local Flavors</h1>
					<p className="mt-0.5 text-[13px] text-green-100/90">{restaurants.length} restaurants, cafes & eateries near you</p>
				</div>
			</div>

			{/* Search Bar */}
			<div className="relative">
				<Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-300" />
				<input
					type="text"
					placeholder="Search restaurants, cuisines, or areas..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm placeholder:text-gray-400 focus:border-[#1a8a18] focus:outline-none focus:ring-2 focus:ring-[#1a8a18]/15 transition-all shadow-sm"
				/>
			</div>

			{/* View Tabs */}
			<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
				{TABS.map(tab => (
					<button
						key={tab.key}
						onClick={() => setActiveTab(tab.key)}
						className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${
							activeTab === tab.key
								? 'bg-[#1a8a18] text-white shadow-md shadow-green-600/20'
								: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
						}`}
					>
						<tab.icon className={`h-3.5 w-3.5 ${
							activeTab === tab.key && tab.key === 'favorites' ? 'fill-white' : ''
						}`} />
						{tab.label}
						{tab.count !== undefined && (
							<span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
								activeTab === tab.key
									? 'bg-white/20 text-white'
									: 'bg-gray-200/80 text-gray-500'
							}`}>
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Cuisine Quick Scroll */}
			<div>
				<CuisineFilter selected={selectedCuisine} onSelect={setSelectedCuisine} />
			</div>

			{/* Filter & Sort Row */}
			<div className="flex items-center justify-between">
				<button
					onClick={() => setShowFilters(!showFilters)}
					className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition-all shadow-sm ${
						showFilters
							? 'bg-[#1a8a18]/5 border-[#1a8a18]/30 text-[#1a8a18]'
							: 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
					}`}
				>
					<SlidersHorizontal className="h-4 w-4" />
					Price & Sort
					{hasActiveFilters && (
						<span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a8a18] text-[10px] text-white font-bold">
							{[selectedPrice, sortBy !== 'rating' ? 1 : null].filter(Boolean).length}
						</span>
					)}
				</button>

				<p className="text-[13px] text-gray-400 font-medium">
					{filteredRestaurants.length} result{filteredRestaurants.length !== 1 ? 's' : ''}
					{hasActiveFilters && (
						<button onClick={clearFilters} className="ml-2 text-[#1a8a18] font-semibold hover:text-[#157315] transition-colors">
							Clear
						</button>
					)}
				</p>
			</div>

			{/* Filter Panel */}
			{showFilters && (
				<div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 animate-slideUp shadow-sm">
					<div>
						<label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Price Range</label>
						<PriceFilter selected={selectedPrice} onSelect={setSelectedPrice} />
					</div>
					<div>
						<label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Sort By</label>
						<div className="flex gap-2">
							{([
								{ key: 'rating' as SortOption, label: 'Top Rated', icon: Star },
								{ key: 'distance' as SortOption, label: 'Nearest', icon: MapPin },
								{ key: 'name' as SortOption, label: 'Name A-Z', icon: Clock },
							]).map((option) => (
								<button
									key={option.key}
									onClick={() => setSortBy(option.key)}
									className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
										sortBy === option.key
											? 'bg-[#1a8a18] text-white border-transparent shadow-md'
											: 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#1a8a18] hover:text-[#1a8a18]'
									}`}
								>
									<option.icon className="h-3.5 w-3.5" />
									{option.label}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Restaurant List */}
			<div className="space-y-4">
				{filteredRestaurants.length === 0 ? (
					<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
						<UtensilsCrossed className="mx-auto h-12 w-12 text-gray-200" />
						<p className="mt-3 text-sm font-medium text-gray-400">
							{activeTab === 'favorites' && favorites.size === 0
								? 'No favorites yet — tap the ❤️ on any restaurant'
								: activeTab === 'top-rated'
								? 'No restaurants with 4.5+ rating found'
								: activeTab === 'nearby'
								? 'No restaurants within 2 km'
								: hasActiveFilters
								? 'No restaurants match your filters'
								: 'No restaurants yet'}
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
					[...filteredRestaurants].sort((a, b) => {
						if (a.aiVerified === true && b.aiVerified !== true) return -1;
						if (a.aiVerified !== true && b.aiVerified === true) return 1;
						return 0;
					}).map((restaurant) => (
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
