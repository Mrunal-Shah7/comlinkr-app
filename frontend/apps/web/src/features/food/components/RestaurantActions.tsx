import { MapPin, Phone, Calendar, Menu } from "lucide-react";
import Button from "../../../shared/ui/Button";
import ShareButton from "../../../shared/ui/ShareButton";
import { useToast } from "../../../shared/hooks/useToast";

interface RestaurantActionsProps {
  restaurantId: string;
  restaurantName: string;
}

export default function RestaurantActions({ restaurantId, restaurantName }: RestaurantActionsProps) {
	const { notify } = useToast();

	const handleMap = () => {
		notify("Opening maps... (In production, this would open Google Maps)");
	};

	const handleCall = () => {
		notify("Calling restaurant... (In production, this would initiate a call)");
	};

	const handleReservation = () => {
		const time = prompt("When would you like to reserve? (e.g., 'Tonight 7 PM')");
		if (time && time.trim()) {
			notify(`Reservation request sent for ${time}! (In production, this would connect to a booking system)`);
		}
	};

	const handleMenu = () => {
		notify("Opening menu... (In production, this would show the full menu)");
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-2">
				<Button 
					variant="outline" 
					size="sm" 
					className="flex-1 border-[#26B324] text-[#26B324] hover:bg-[#26B324] hover:text-white"
					onClick={handleMap}
				>
					<MapPin className="h-4 w-4" />
					Map
				</Button>
				<Button 
					variant="primary" 
					size="sm" 
					className="flex-1 bg-gradient-to-r from-[#26B324] to-[#0076EB] hover:opacity-90"
					onClick={handleCall}
				>
					<Phone className="h-4 w-4" />
					Call
				</Button>
				<ShareButton 
					url={`${window.location.origin}/restaurant/${restaurantId}`}
					title={restaurantName}
					variant="icon"
				/>
			</div>
			<div className="flex gap-2">
				<Button 
					variant="outline" 
					size="sm" 
					className="flex-1 text-[#0076EB] border-[#0076EB] hover:bg-[#0076EB] hover:text-white"
					onClick={handleReservation}
				>
					<Calendar className="h-4 w-4" />
					Reserve
				</Button>
				<Button 
					variant="outline" 
					size="sm" 
					className="flex-1 hover:bg-gray-50"
					onClick={handleMenu}
				>
					<Menu className="h-4 w-4" />
					Menu
				</Button>
			</div>
		</div>
	);
}
