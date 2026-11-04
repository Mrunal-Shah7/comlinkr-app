import { Building2, Compass, Soup, Users } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROUTES } from "../routes/routePaths";

const NAV_ITEMS = [
	{ label: "Explore", to: ROUTES.feed, icon: Compass },
	{ label: "Listings", to: ROUTES.housing, icon: Building2 },
	{ label: "Food", to: ROUTES.food, icon: Soup },
	{ label: "Community", to: ROUTES.community, icon: Users },
];

export default function BottomNav() {
	return (
		<nav className="fixed bottom-0 z-20 w-full max-w-[430px] border-t border-gray-200 bg-white/90 px-2 pb-[var(--safe-bottom)] backdrop-blur">
			<div className="flex h-[var(--bottom-nav-height)] items-center justify-between">
				{NAV_ITEMS.map(({ label, to, icon: Icon }) => (
					<NavLink
						key={label}
						to={to}
						className={({ isActive }) =>
							`flex flex-1 flex-col items-center gap-1 text-xs font-medium transition ${
								isActive ? "text-gray-900" : "text-gray-400"
							}`
						}
					>
						<Icon className="h-5 w-5" />
						<span>{label}</span>
					</NavLink>
				))}
			</div>
		</nav>
	);
}
