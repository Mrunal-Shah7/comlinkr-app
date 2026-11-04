import { Star, Heart, ShieldCheck } from "lucide-react";
import Card from "../../../shared/ui/Card";
import { Restaurant } from "../../../shared/types/restaurant";
import RestaurantActions from "./RestaurantActions";
import { useToast } from "../../../shared/hooks/useToast";

type Props = {
	restaurant: Restaurant;
	isFavorite: boolean;
	onToggleFavorite: (id: string) => void;
};

export default function RestaurantCard({ restaurant, isFavorite, onToggleFavorite }: Props) {
	const { notify } = useToast();

	const handleFavorite = () => {
		onToggleFavorite(restaurant.id);
		notify(isFavorite ? 'Removed from favorites' : 'Added to favorites!');
	};

	const handleReview = () => {
		const review = prompt("Write your review:");
		if (review && review.trim()) {
			notify("Review posted! (In production, this would be saved to the backend)");
		}
	};

	return (
		<Card interactive className="overflow-hidden p-0 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.08)] transition-all duration-300 border border-gray-100/80">
			{restaurant.image ? (
				<div className="relative h-44 w-full bg-gray-100">
					<img src={restaurant.image} alt={restaurant.name} className="h-full w-full object-cover" />
					{/* Subtle gradient overlay at bottom */}
					<div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
					<button
						onClick={handleFavorite}
						className="absolute top-3 right-3 rounded-xl bg-white/90 backdrop-blur-md p-2 shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 border border-white/50"
					>
						<Heart className={`h-5 w-5 transition-colors ${
							isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-500'
						}`} />
					</button>
					<div className="absolute bottom-3 left-3 flex items-center gap-2">
						<span className="inline-flex items-center bg-white/90 backdrop-blur-md text-[#1a8a18] text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm border border-white/50">
							{restaurant.cuisine}
						</span>
						{restaurant.aiVerified && (
							<span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md text-emerald-600 text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm border border-white/50">
								<ShieldCheck className="h-3 w-3" /> Verified
							</span>
						)}
						{restaurant.aiVerified === false && (
							<span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md text-amber-600 text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm border border-white/50 animate-pulse">
								🔍 Scanning…
							</span>
						)}
					</div>
				</div>
			) : null}
			<div className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<h3 className="text-[15px] font-bold text-gray-900">{restaurant.name}</h3>
						<p className="mt-1 text-[13px] text-gray-500 flex items-center gap-2">
							<span>{restaurant.location.area}</span>
							<span className="text-gray-300">•</span>
							<span className="font-semibold text-[#1a8a18]">{restaurant.price}</span>
						</p>
					</div>
				</div>
				<div className="mt-3 flex items-center gap-3">
					<div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 border border-amber-100">
						<Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
						<span className="text-sm font-bold text-gray-900">{restaurant.rating}</span>
					</div>
					<span className="text-[12px] text-gray-400 font-medium">{restaurant.distance} away</span>
					<button
						onClick={handleReview}
						className="ml-auto text-[12px] font-semibold text-[#1a8a18] hover:text-[#157315] transition-colors"
					>
						Write Review
					</button>
				</div>
				<div className="mt-4">
					<RestaurantActions restaurantId={restaurant.id} restaurantName={restaurant.name} />
				</div>
			</div>
		</Card>
	);
}
