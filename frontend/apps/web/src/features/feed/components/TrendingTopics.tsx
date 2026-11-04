import { useState, useEffect } from "react";
import { TrendingUp, Flame, Hash, ArrowRight, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TrendingTopic {
	id: string;
	tag: string;
	label: string;
	posts: number;
	trend: "up" | "hot" | "new";
	category: "news" | "events" | "food" | "housing" | "community";
	color: string;
}

const TRENDS_KEY = "comlinkr_trending";

function generateTrends(city: string): TrendingTopic[] {
	return [
		{ id: "t1", tag: "NewCoffeeSpot", label: `New café openings in ${city}`, posts: 47, trend: "hot", category: "food", color: "#26B324" },
		{ id: "t2", tag: "WeekendEvents", label: "Weekend plans & meetups", posts: 89, trend: "hot", category: "events", color: "#FF7B00" },
		{ id: "t3", tag: "ApartmentHunting", label: "Housing tips & deals", posts: 34, trend: "up", category: "housing", color: "#0076EB" },
		{ id: "t4", tag: "SafetyAlert", label: "Neighborhood safety updates", posts: 23, trend: "new", category: "news", color: "#EF4444" },
		{ id: "t5", tag: "FoodDeals", label: "Restaurant deals near you", posts: 56, trend: "up", category: "food", color: "#26B324" },
		{ id: "t6", tag: "CommunityHelp", label: "Neighbors helping neighbors", posts: 31, trend: "new", category: "community", color: "#8B5CF6" },
	];
}

export default function TrendingTopics() {
	const navigate = useNavigate();
	const [trends, setTrends] = useState<TrendingTopic[]>([]);
	const [showAll, setShowAll] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem(TRENDS_KEY);
		if (stored) {
			try { setTrends(JSON.parse(stored)); return; } catch { /* fallback */ }
		}
		const city = (() => {
			try { const p = localStorage.getItem("comlinkr_profile"); return p ? JSON.parse(p).city : "your city"; } catch { return "your city"; }
		})();
		const data = generateTrends(city);
		setTrends(data);
		localStorage.setItem(TRENDS_KEY, JSON.stringify(data));
	}, []);

	const displayed = showAll ? trends : trends.slice(0, 3);

	function handleTopicClick(topic: TrendingTopic) {
		// Navigate to relevant section
		const routes: Record<string, string> = {
			news: "/app/feed", events: "/app/feed", food: "/app/food",
			housing: "/app/housing", community: "/app/community",
		};
		navigate(routes[topic.category] || "/app/feed");
	}

	const trendIcon = (trend: string) => {
		if (trend === "hot") return <Flame className="h-3.5 w-3.5 text-orange-500" />;
		if (trend === "new") return <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">NEW</span>;
		return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
	};

	return (
		<div className="bg-white rounded-2xl shadow-brand-md p-4">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
						<BarChart3 className="h-4 w-4 text-white" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-gray-900">Trending Now</h3>
						<p className="text-[10px] text-gray-400">What your city is talking about</p>
					</div>
				</div>
				<button onClick={() => setShowAll(!showAll)} className="text-xs text-[#0076EB] font-semibold hover:underline flex items-center gap-1">
					{showAll ? "Show less" : "See all"} <ArrowRight className="h-3 w-3" />
				</button>
			</div>

			<div className="space-y-2">
				{displayed.map((topic, i) => (
					<button key={topic.id} onClick={() => handleTopicClick(topic)}
						className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all group text-left">
						<span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
						<div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
							style={{ backgroundColor: `${topic.color}15` }}>
							<Hash className="h-4 w-4" style={{ color: topic.color }} />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold text-gray-900 truncate">#{topic.tag}</span>
								{trendIcon(topic.trend)}
							</div>
							<p className="text-[11px] text-gray-500 truncate">{topic.label}</p>
						</div>
						<span className="text-xs text-gray-400 font-medium">{topic.posts} posts</span>
					</button>
				))}
			</div>
		</div>
	);
}
