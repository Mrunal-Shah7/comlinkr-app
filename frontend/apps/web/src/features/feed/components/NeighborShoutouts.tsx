import { useState, useEffect } from "react";
import { Heart, Award, Sparkles, Send, ChevronRight } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";

interface Shoutout {
	id: string;
	from: string;
	fromAvatar: string;
	to: string;
	message: string;
	emoji: string;
	timeAgo: string;
	likes: number;
	liked: boolean;
}

const SHOUTOUTS_KEY = "comlinkr_shoutouts";

const DEFAULT_SHOUTOUTS: Shoutout[] = [
	{ id: "sh1", from: "Mira P.", fromAvatar: "https://i.pravatar.cc/150?img=47", to: "Sarah J.", message: "Thanks for organizing the community cleanup last weekend! The park looks amazing now 💚", emoji: "🌟", timeAgo: "1h", likes: 24, liked: false },
	{ id: "sh2", from: "Daniel W.", fromAvatar: "https://i.pravatar.cc/150?img=52", to: "Alex C.", message: "Your restaurant recommendations are always on point. The ramen place was 🔥", emoji: "🍜", timeAgo: "3h", likes: 18, liked: false },
	{ id: "sh3", from: "Emily R.", fromAvatar: "https://i.pravatar.cc/150?img=9", to: "Community Board", message: "The new bike lane on 5th Ave makes my commute so much safer. Thank you!", emoji: "🚲", timeAgo: "5h", likes: 41, liked: false },
	{ id: "sh4", from: "Jules M.", fromAvatar: "https://i.pravatar.cc/150?img=11", to: "Maria Chen", message: "Best landlord ever — fixed our heating in 2 hours on a Sunday!", emoji: "🏠", timeAgo: "8h", likes: 33, liked: false },
];

export default function NeighborShoutouts() {
	const { user } = useAuth();
	const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [newTo, setNewTo] = useState("");
	const [newMsg, setNewMsg] = useState("");

	useEffect(() => {
		const stored = localStorage.getItem(SHOUTOUTS_KEY);
		if (stored) {
			try { setShoutouts(JSON.parse(stored)); return; } catch { /* fallback */ }
		}
		setShoutouts(DEFAULT_SHOUTOUTS);
		localStorage.setItem(SHOUTOUTS_KEY, JSON.stringify(DEFAULT_SHOUTOUTS));
	}, []);

	function handleLike(id: string) {
		const updated = shoutouts.map(s =>
			s.id === id ? { ...s, liked: !s.liked, likes: s.liked ? s.likes - 1 : s.likes + 1 } : s
		);
		setShoutouts(updated);
		localStorage.setItem(SHOUTOUTS_KEY, JSON.stringify(updated));
	}

	function handleSubmit() {
		if (!newTo.trim() || !newMsg.trim()) return;
		const emojis = ["🌟", "💪", "❤️", "🎉", "👏", "🙌", "✨"];
		const newShoutout: Shoutout = {
			id: `sh_${Date.now()}`,
			from: user?.name || "You",
			fromAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "U")}&background=0076EB&color=fff`,
			to: newTo,
			message: newMsg,
			emoji: emojis[Math.floor(Math.random() * emojis.length)],
			timeAgo: "Just now",
			likes: 0,
			liked: false,
		};
		const updated = [newShoutout, ...shoutouts];
		setShoutouts(updated);
		localStorage.setItem(SHOUTOUTS_KEY, JSON.stringify(updated));
		setNewTo("");
		setNewMsg("");
		setShowForm(false);
	}

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="px-4 pt-4 pb-2 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-sm">
						<Award className="h-4.5 w-4.5 text-white" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-gray-900">Neighbor Shoutouts</h3>
						<p className="text-[10px] text-gray-400">Appreciate someone in your community</p>
					</div>
				</div>
				<button onClick={() => setShowForm(!showForm)}
					className="text-[11px] font-bold text-[#0076EB] bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition flex items-center gap-1">
					<Sparkles className="h-3 w-3" /> Give Shoutout
				</button>
			</div>

			{/* Create form */}
			{showForm && (
				<div className="mx-4 mb-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl space-y-2">
					<input value={newTo} onChange={e => setNewTo(e.target.value)} placeholder="Who's the shoutout for?"
						className="w-full text-sm bg-white rounded-lg px-3 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-[#0076EB]/30 placeholder-gray-400" />
					<div className="flex gap-2">
						<input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="What did they do? 💬"
							className="flex-1 text-sm bg-white rounded-lg px-3 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-[#0076EB]/30 placeholder-gray-400"
							onKeyDown={e => e.key === "Enter" && handleSubmit()} />
						<button onClick={handleSubmit}
							className="h-9 w-9 rounded-lg bg-[#0076EB] text-white flex items-center justify-center hover:bg-[#0062CC] transition">
							<Send className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}

			{/* Shoutout cards */}
			<div className="px-4 pb-4 space-y-2.5">
				{shoutouts.slice(0, 3).map(s => (
					<div key={s.id} className="flex gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition group">
						<img src={s.fromAvatar} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm" />
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-bold text-gray-900">{s.from}</span>
								<ChevronRight className="h-3 w-3 text-gray-300" />
								<span className="text-xs font-bold text-[#0076EB]">{s.to}</span>
								<span className="text-base leading-none">{s.emoji}</span>
							</div>
							<p className="text-[12px] text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{s.message}</p>
							<div className="flex items-center gap-3 mt-1.5">
								<button onClick={() => handleLike(s.id)}
									className={`flex items-center gap-1 text-[11px] transition ${s.liked ? "text-rose-500 font-bold" : "text-gray-400 hover:text-rose-400"}`}>
									<Heart className={`h-3.5 w-3.5 ${s.liked ? "fill-rose-500" : ""}`} />
									{s.likes}
								</button>
								<span className="text-[10px] text-gray-300">{s.timeAgo} ago</span>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
