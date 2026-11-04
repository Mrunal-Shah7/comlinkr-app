import { useState, useEffect } from "react";
import { Activity, MapPin, ChefHat, Home, Calendar, MessageCircle, Users, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PulseItem {
	id: string;
	type: "listing" | "news" | "event" | "food" | "chat" | "join";
	icon: string;
	text: string;
	timeAgo: string;
	area: string;
	link: string;
}

function generatePulseItems(): PulseItem[] {
	// Build from actual localStorage data
	const items: PulseItem[] = [];

	// Listings
	try {
		const raw = localStorage.getItem("comlinkr_listings");
		if (raw) {
			const listings = JSON.parse(raw);
			listings.slice(0, 2).forEach((l: { id: string; title: string; neighborhood?: string; price?: number }, i: number) => {
				items.push({
					id: `pulse_l_${l.id}`,
					type: "listing",
					icon: "🏠",
					text: `New listing: ${l.title}${l.price ? ` — $${l.price.toLocaleString()}/mo` : ""}`,
					timeAgo: `${(i + 1) * 3}m ago`,
					area: l.neighborhood || "Nearby",
					link: `/app/housing/${l.id}`,
				});
			});
		}
	} catch { /* skip */ }

	// News
	try {
		const raw = localStorage.getItem("comlinkr_news");
		if (raw) {
			const news = JSON.parse(raw);
			news.slice(0, 2).forEach((n: { id: string; title: string; location?: string }, i: number) => {
				items.push({
					id: `pulse_n_${n.id}`,
					type: "news",
					icon: "📰",
					text: n.title,
					timeAgo: `${(i + 1) * 7}m ago`,
					area: n.location || "Local",
					link: "/app/feed",
				});
			});
		}
	} catch { /* skip */ }

	// Events
	try {
		const raw = localStorage.getItem("comlinkr_events");
		if (raw) {
			const events = JSON.parse(raw);
			events.slice(0, 2).forEach((e: { id: string; title: string; location?: { area?: string }; attendees?: unknown[] }, i: number) => {
				items.push({
					id: `pulse_e_${e.id}`,
					type: "event",
					icon: "🎉",
					text: `${e.title}${e.attendees?.length ? ` — ${e.attendees.length} going` : ""}`,
					timeAgo: `${(i + 1) * 12}m ago`,
					area: e.location?.area || "Nearby",
					link: "/app/feed",
				});
			});
		}
	} catch { /* skip */ }

	// Restaurants
	try {
		const raw = localStorage.getItem("comlinkr_restaurants");
		if (raw) {
			const restaurants = JSON.parse(raw);
			restaurants.slice(0, 1).forEach((r: { id: string; name: string; cuisine?: string; rating?: number; location?: { area?: string } }) => {
				items.push({
					id: `pulse_r_${r.id}`,
					type: "food",
					icon: "🍕",
					text: `${r.name}${r.rating ? ` rated ★${r.rating}` : ""} — ${r.cuisine || "Great food"}`,
					timeAgo: "18m ago",
					area: r.location?.area || "Nearby",
					link: "/app/food",
				});
			});
		}
	} catch { /* skip */ }

	// Add some dynamic social items
	items.push(
		{ id: `pulse_social_1`, type: "join", icon: "👋", text: "3 new neighbors joined Comlinkr", timeAgo: "5m ago", area: "Your Area", link: "/app/community" },
		{ id: `pulse_social_2`, type: "chat", icon: "💬", text: "12 messages in Rooftop Mixer chat", timeAgo: "2m ago", area: "Chelsea", link: "/app/chat" },
	);

	// Shuffle and add time variation
	return items.sort(() => Math.random() - 0.5).map((item, i) => ({
		...item,
		timeAgo: `${Math.max(1, (i + 1) * 2 + Math.floor(Math.random() * 5))}m ago`,
	}));
}

const typeIconMap: Record<string, React.ReactNode> = {
	listing: <Home className="h-3.5 w-3.5" />,
	news: <TrendingUp className="h-3.5 w-3.5" />,
	event: <Calendar className="h-3.5 w-3.5" />,
	food: <ChefHat className="h-3.5 w-3.5" />,
	chat: <MessageCircle className="h-3.5 w-3.5" />,
	join: <Users className="h-3.5 w-3.5" />,
};

const typeColorMap: Record<string, string> = {
	listing: "#0076EB",
	news: "#0062CC",
	event: "#FF7B00",
	food: "#26B324",
	chat: "#8B5CF6",
	join: "#EC4899",
};

export default function NeighborhoodPulse() {
	const navigate = useNavigate();
	const [items, setItems] = useState<PulseItem[]>([]);
	const [showAll, setShowAll] = useState(false);
	const [liveCount, setLiveCount] = useState(0);

	useEffect(() => {
		const data = generatePulseItems();
		setItems(data);
		setLiveCount(data.length);
	}, []);

	// Simulated "live" counter that ticks up occasionally
	useEffect(() => {
		const timer = setInterval(() => {
			setLiveCount(c => c + Math.floor(Math.random() * 2));
		}, 15000);
		return () => clearInterval(timer);
	}, []);

	const displayed = showAll ? items : items.slice(0, 5);

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="px-4 pt-4 pb-2 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
						<Activity className="h-4 w-4 text-white" />
						{/* Live pulse dot */}
						<span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center">
							<span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
						</span>
					</div>
					<div>
						<h3 className="text-sm font-bold text-gray-900">Neighborhood Pulse</h3>
						<p className="text-[10px] text-gray-400 flex items-center gap-1">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
							{liveCount}+ activities right now
						</p>
					</div>
				</div>
				<span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
					<Clock className="h-3 w-3" /> LIVE
				</span>
			</div>

			{/* Activity items */}
			<div className="px-4 pb-3">
				<div className="space-y-1">
					{displayed.map((item, i) => (
						<button key={item.id} onClick={() => navigate(item.link)}
							className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all text-left group"
							style={{ animationDelay: `${i * 100}ms` }}>
							{/* Icon */}
							<div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
								style={{ backgroundColor: `${typeColorMap[item.type]}15` }}>
								<span className="text-lg">{item.icon}</span>
							</div>

							{/* Text */}
							<div className="flex-1 min-w-0">
								<p className="text-[13px] font-medium text-gray-800 truncate group-hover:text-[#0076EB] transition">
									{item.text}
								</p>
								<div className="flex items-center gap-2 text-[10px] text-gray-400">
									<span className="flex items-center gap-0.5" style={{ color: typeColorMap[item.type] }}>
										{typeIconMap[item.type]}
									</span>
									<MapPin className="h-2.5 w-2.5" />
									<span>{item.area}</span>
									<span>•</span>
									<span>{item.timeAgo}</span>
								</div>
							</div>
						</button>
					))}
				</div>

				{items.length > 5 && (
					<button onClick={() => setShowAll(!showAll)}
						className="w-full text-center text-xs text-[#0076EB] font-semibold py-2 mt-1 hover:underline">
						{showAll ? "Show less" : `Show all ${items.length} activities`}
					</button>
				)}
			</div>
		</div>
	);
}
