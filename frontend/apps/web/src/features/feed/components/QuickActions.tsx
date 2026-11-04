import { useNavigate } from "react-router-dom";
import { Home, Utensils, Calendar, MessageCircle, Users, Newspaper, PlusCircle, Zap } from "lucide-react";

const ACTIONS = [
	{ icon: Newspaper, label: "News", route: "/app/feed", color: "#0076EB", bg: "bg-blue-50" },
	{ icon: Home, label: "Housing", route: "/app/housing", color: "#0062CC", bg: "bg-blue-50" },
	{ icon: Utensils, label: "Food", route: "/app/food", color: "#26B324", bg: "bg-emerald-50" },
	{ icon: Calendar, label: "Events", route: "/app/feed", color: "#FF7B00", bg: "bg-orange-50" },
	{ icon: MessageCircle, label: "Chat", route: "/app/chat", color: "#8B5CF6", bg: "bg-purple-50" },
	{ icon: Users, label: "Community", route: "/app/community", color: "#EC4899", bg: "bg-pink-50" },
	{ icon: PlusCircle, label: "Create", route: "/app/create", color: "#0076EB", bg: "bg-blue-50" },
	{ icon: Zap, label: "Explore", route: "/app/feed", color: "#F59E0B", bg: "bg-amber-50" },
];

export default function QuickActions() {
	const navigate = useNavigate();

	return (
		<div className="grid grid-cols-4 gap-2">
			{ACTIONS.map((action) => {
				const Icon = action.icon;
				return (
					<button key={action.label} onClick={() => navigate(action.route)}
						className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95 group">
						<div className={`h-11 w-11 rounded-xl ${action.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
							<Icon className="h-5 w-5" style={{ color: action.color }} />
						</div>
						<span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 transition">{action.label}</span>
					</button>
				);
			})}
		</div>
	);
}
