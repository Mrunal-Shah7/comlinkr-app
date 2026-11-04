import { useState, useEffect } from "react";
import { Lightbulb, ThumbsUp, Bookmark, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

interface Tip {
	id: string;
	author: string;
	avatar: string;
	area: string;
	tip: string;
	category: string;
	categoryEmoji: string;
	upvotes: number;
	upvoted: boolean;
	saved: boolean;
}

const TIPS_KEY = "comlinkr_local_tips";

const DEFAULT_TIPS: Tip[] = [
	{ id: "tip1", author: "Sarah J.", avatar: "https://i.pravatar.cc/150?img=5", area: "Midtown", tip: "The farmers market on Saturdays has a hidden stall in the back that sells the best homemade pasta for half the price.", category: "Food", categoryEmoji: "🍝", upvotes: 67, upvoted: false, saved: false },
	{ id: "tip2", author: "Daniel W.", avatar: "https://i.pravatar.cc/150?img=52", area: "Brooklyn Heights", tip: "If you're apartment hunting, check listings on Tuesday mornings — landlords post new ones over the weekend.", category: "Housing", categoryEmoji: "🏠", upvotes: 123, upvoted: false, saved: false },
	{ id: "tip3", author: "Mira P.", avatar: "https://i.pravatar.cc/150?img=47", area: "Chelsea", tip: "The library on 23rd St has free coworking space with power outlets and fast WiFi. Way better than any café.", category: "Life hack", categoryEmoji: "💡", upvotes: 89, upvoted: false, saved: false },
	{ id: "tip4", author: "Emily R.", avatar: "https://i.pravatar.cc/150?img=9", area: "SoHo", tip: "Download the transit app and set alerts for your bus. The 8:15 AM bus is always 3 minutes late — you can sleep in a bit 😄", category: "Transit", categoryEmoji: "🚌", upvotes: 45, upvoted: false, saved: false },
	{ id: "tip5", author: "Alex C.", avatar: "https://i.pravatar.cc/150?img=8", area: "East Village", tip: "Best view of the sunset is from the pedestrian bridge near Riverside. Bring a blanket, thank me later 🌅", category: "Hidden gem", categoryEmoji: "✨", upvotes: 156, upvoted: false, saved: false },
	{ id: "tip6", author: "Jules M.", avatar: "https://i.pravatar.cc/150?img=11", area: "Upper West", tip: "The dog park at 72nd has an unofficial meetup every Sunday at 10 AM. Great way to meet neighbors (and dogs)!", category: "Social", categoryEmoji: "🐕", upvotes: 78, upvoted: false, saved: false },
];

const CATEGORY_COLORS: Record<string, string> = {
	"Food": "#26B324",
	"Housing": "#0076EB",
	"Life hack": "#8B5CF6",
	"Transit": "#F59E0B",
	"Hidden gem": "#EC4899",
	"Social": "#FF7B00",
};

export default function LocalWisdom() {
	const [tips, setTips] = useState<Tip[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);

	useEffect(() => {
		const stored = localStorage.getItem(TIPS_KEY);
		if (stored) {
			try { setTips(JSON.parse(stored)); return; } catch { /* fallback */ }
		}
		setTips(DEFAULT_TIPS);
		localStorage.setItem(TIPS_KEY, JSON.stringify(DEFAULT_TIPS));
	}, []);

	function handleUpvote(id: string) {
		const updated = tips.map(t =>
			t.id === id ? { ...t, upvoted: !t.upvoted, upvotes: t.upvoted ? t.upvotes - 1 : t.upvotes + 1 } : t
		);
		setTips(updated);
		localStorage.setItem(TIPS_KEY, JSON.stringify(updated));
	}

	function handleSave(id: string) {
		const updated = tips.map(t =>
			t.id === id ? { ...t, saved: !t.saved } : t
		);
		setTips(updated);
		localStorage.setItem(TIPS_KEY, JSON.stringify(updated));
	}

	function next() { setCurrentIndex(i => (i + 1) % tips.length); }
	function prev() { setCurrentIndex(i => (i - 1 + tips.length) % tips.length); }

	if (tips.length === 0) return null;
	const tip = tips[currentIndex];
	const catColor = CATEGORY_COLORS[tip.category] || "#0076EB";

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="px-4 pt-4 pb-2 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
						<Lightbulb className="h-4.5 w-4.5 text-white" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-gray-900">Local Wisdom</h3>
						<p className="text-[10px] text-gray-400">Tips & secrets from your neighbors</p>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<button onClick={prev} className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
						<ChevronLeft className="h-3.5 w-3.5 text-gray-500" />
					</button>
					<span className="text-[10px] text-gray-400 font-medium w-10 text-center">{currentIndex + 1}/{tips.length}</span>
					<button onClick={next} className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
						<ChevronRight className="h-3.5 w-3.5 text-gray-500" />
					</button>
				</div>
			</div>

			{/* Tip card */}
			<div className="px-4 pb-4">
				<div className="relative p-4 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-100">
					{/* Category badge */}
					<div className="flex items-center justify-between mb-3">
						<span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${catColor}12`, color: catColor }}>
							{tip.categoryEmoji} {tip.category}
						</span>
						<div className="flex items-center gap-1 text-[10px] text-gray-400">
							<MapPin className="h-3 w-3" />
							{tip.area}
						</div>
					</div>

					{/* Tip text */}
					<p className="text-[14px] text-gray-800 leading-relaxed font-medium">{tip.tip}</p>

					{/* Author + actions */}
					<div className="flex items-center justify-between mt-4">
						<div className="flex items-center gap-2">
							<img src={tip.avatar} alt="" className="h-7 w-7 rounded-full object-cover ring-2 ring-white shadow-sm" />
							<span className="text-[11px] font-semibold text-gray-600">— {tip.author}</span>
						</div>
						<div className="flex items-center gap-2">
							<button onClick={() => handleUpvote(tip.id)}
								className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition ${tip.upvoted
									? "bg-blue-100 text-[#0076EB] font-bold"
									: "bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-[#0076EB]"
								}`}>
								<ThumbsUp className={`h-3.5 w-3.5 ${tip.upvoted ? "fill-[#0076EB]" : ""}`} />
								{tip.upvotes}
							</button>
							<button onClick={() => handleSave(tip.id)}
								className={`h-7 w-7 rounded-full flex items-center justify-center transition ${tip.saved
									? "bg-amber-100 text-amber-500"
									: "bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500"
								}`}>
								<Bookmark className={`h-3.5 w-3.5 ${tip.saved ? "fill-amber-500" : ""}`} />
							</button>
						</div>
					</div>
				</div>

				{/* Progress dots */}
				<div className="flex justify-center gap-1 mt-3">
					{tips.map((_, i) => (
						<button key={i} onClick={() => setCurrentIndex(i)}
							className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-5 bg-[#0076EB]" : "w-1.5 bg-gray-200"}`} />
					))}
				</div>
			</div>
		</div>
	);
}
