import { useState, useEffect } from "react";
import { MapPin, ChevronDown, CheckCircle2 } from "lucide-react";
import { getProfile, setProfile } from "../../../shared/lib/storage";

const CITIES = [
	"New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
	"Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
	"Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte"
];

export default function HeroBanner() {
	const profile = getProfile();
	const [city, setCity] = useState(profile?.city || "New York");
	const [showDropdown, setShowDropdown] = useState(false);
	const [greeting, setGreeting] = useState("");
	const [onlineCount] = useState(() => Math.floor(Math.random() * 80) + 120);

	useEffect(() => {
		const h = new Date().getHours();
		if (h < 12) setGreeting("Good morning");
		else if (h < 17) setGreeting("Good afternoon");
		else setGreeting("Good evening");
	}, []);

	const handleCityChange = (newCity: string) => {
		setCity(newCity);
		setShowDropdown(false);
		const existing = getProfile();
		if (existing) {
			setProfile({ ...existing, city: newCity });
		} else {
			setProfile({ name: "ComLinkr User", city: newCity, culture: [], interests: [] });
		}
	};

	return (
		<div className="relative">
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0062CC] via-[#0076EB] to-[#26B324] p-5 text-white shadow-brand-lg">
				{/* Subtle background shapes */}
				<div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -mr-14 -mt-14" />
				<div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full -ml-10 -mb-10" />

				<div className="relative z-10">
					{/* City + online */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<MapPin className="h-4 w-4 text-white/80" />
							<span className="text-xs font-bold uppercase tracking-wider text-white/90">{city}</span>
						</div>
						<div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
							</span>
							<span className="text-[10px] font-semibold text-white/90">{onlineCount} online</span>
						</div>
					</div>

					{/* Greeting */}
					<p className="mt-3 text-xs text-white/70 font-medium">{greeting} 👋</p>
					<h2 className="text-xl font-extrabold leading-tight mt-0.5">
						What's new in {city}
					</h2>
					<p className="mt-1 text-[13px] text-white/80 leading-relaxed">
						Vote, discover tips, and celebrate your neighbors.
					</p>

					{/* Switch city */}
					<button onClick={() => setShowDropdown(!showDropdown)}
						className="mt-3.5 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-xs font-semibold hover:bg-white/30 transition">
						Switch City
						<ChevronDown className={`h-3.5 w-3.5 transition ${showDropdown ? "rotate-180" : ""}`} />
					</button>
				</div>
			</div>

			{/* City Dropdown */}
			{showDropdown && (
				<>
					<div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
					<div className="absolute left-4 right-4 top-full mt-2 bg-white rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto border border-gray-200">
						<div className="sticky top-0 bg-white px-4 py-2 border-b border-gray-100">
							<p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select City</p>
						</div>
						{CITIES.map((c) => (
							<button key={c} onClick={() => handleCityChange(c)}
								className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition ${city === c ? "bg-blue-50" : ""}`}>
								<div className="flex items-center gap-2">
									<MapPin className={`h-4 w-4 ${city === c ? "text-[#0076EB]" : "text-gray-300"}`} />
									<span className={`text-sm ${city === c ? "text-[#0076EB] font-bold" : "text-gray-700 font-medium"}`}>{c}</span>
								</div>
								{city === c && <CheckCircle2 className="w-5 h-5 text-[#0076EB]" />}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}
