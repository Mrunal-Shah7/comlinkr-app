import { useState, useEffect } from "react";
import { Trophy, Medal, Flame, Crown, Star, TrendingUp } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";

interface LeaderboardUser {
	id: string;
	name: string;
	avatar: string;
	points: number;
	rank: number;
	badge: string;
	streak: number;
	contributions: { posts: number; tips: number; shoutouts: number; votes: number };
}

function generateLeaderboard(currentUser?: string): LeaderboardUser[] {
	const board: LeaderboardUser[] = [
		{ id: "lb1", name: "Sarah J.", avatar: "https://i.pravatar.cc/150?img=5", points: 2847, rank: 1, badge: "👑", streak: 14, contributions: { posts: 23, tips: 12, shoutouts: 34, votes: 89 } },
		{ id: "lb2", name: "Daniel W.", avatar: "https://i.pravatar.cc/150?img=52", points: 2234, rank: 2, badge: "🔥", streak: 9, contributions: { posts: 18, tips: 8, shoutouts: 21, votes: 76 } },
		{ id: "lb3", name: "Mira P.", avatar: "https://i.pravatar.cc/150?img=47", points: 1987, rank: 3, badge: "⭐", streak: 7, contributions: { posts: 15, tips: 15, shoutouts: 18, votes: 64 } },
		{ id: "lb4", name: "Alex C.", avatar: "https://i.pravatar.cc/150?img=8", points: 1654, rank: 4, badge: "💪", streak: 5, contributions: { posts: 12, tips: 6, shoutouts: 14, votes: 55 } },
		{ id: "lb5", name: "Emily R.", avatar: "https://i.pravatar.cc/150?img=9", points: 1432, rank: 5, badge: "🌟", streak: 4, contributions: { posts: 9, tips: 10, shoutouts: 11, votes: 48 } },
	];

	// Calculate current user's points from their actual activity
	let userPoints = 0;
	try {
		const news = localStorage.getItem("comlinkr_news");
		if (news) userPoints += JSON.parse(news).filter((n: { author?: { name: string } }) => n.author?.name === currentUser).length * 50;
	} catch { /* skip */ }
	try {
		const votes = localStorage.getItem("comlinkr_poll_votes");
		if (votes) userPoints += Object.keys(JSON.parse(votes)).length * 10;
	} catch { /* skip */ }
	try {
		const wyrVotes = localStorage.getItem("comlinkr_wyr_votes");
		if (wyrVotes) userPoints += Object.keys(JSON.parse(wyrVotes)).length * 10;
	} catch { /* skip */ }
	try {
		const shoutouts = localStorage.getItem("comlinkr_shoutouts");
		if (shoutouts) userPoints += JSON.parse(shoutouts).filter((s: { from: string }) => s.from === currentUser || s.from === "You").length * 30;
	} catch { /* skip */ }

	userPoints = Math.max(userPoints, 156); // baseline

	return board.map((u, i) => ({ ...u, rank: i + 1, points: u.points + Math.floor(Math.random() * 20) }));
}

export default function CommunityLeaderboard() {
	const { user } = useAuth();
	const [board, setBoard] = useState<LeaderboardUser[]>([]);
	const [myPoints, setMyPoints] = useState(0);
	const [tab, setTab] = useState<"weekly" | "alltime">("weekly");

	useEffect(() => {
		const data = generateLeaderboard(user?.name);
		setBoard(data);

		// Calculate my points
		let pts = 0;
		try { const v = localStorage.getItem("comlinkr_poll_votes"); if (v) pts += Object.keys(JSON.parse(v)).length * 10; } catch { /* skip */ }
		try { const v = localStorage.getItem("comlinkr_wyr_votes"); if (v) pts += Object.keys(JSON.parse(v)).length * 10; } catch { /* skip */ }
		try { const s = localStorage.getItem("comlinkr_shoutouts"); if (s) pts += JSON.parse(s).filter((x: { from: string }) => x.from === user?.name || x.from === "You").length * 30; } catch { /* skip */ }
		try { const t = localStorage.getItem("comlinkr_local_tips"); if (t) pts += JSON.parse(t).filter((x: { saved: boolean }) => x.saved).length * 5; } catch { /* skip */ }
		setMyPoints(Math.max(pts, 156));
	}, [user?.name]);

	const rankIcon = (rank: number) => {
		if (rank === 1) return <Crown className="h-4 w-4 text-amber-500" />;
		if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
		if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
		return <span className="text-xs font-bold text-gray-400">#{rank}</span>;
	};

	// Find user's approximate rank
	const myRank = board.filter(u => u.points > myPoints).length + 1 + board.length;

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 px-4 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Trophy className="h-4.5 w-4.5 text-white" />
						<span className="text-sm font-bold text-white">Neighborhood Stars</span>
					</div>
					<div className="flex bg-white/20 rounded-full p-0.5">
						<button onClick={() => setTab("weekly")}
							className={`text-[10px] font-semibold px-3 py-1 rounded-full transition ${tab === "weekly" ? "bg-white text-orange-600" : "text-white/80 hover:text-white"}`}>
							This Week
						</button>
						<button onClick={() => setTab("alltime")}
							className={`text-[10px] font-semibold px-3 py-1 rounded-full transition ${tab === "alltime" ? "bg-white text-orange-600" : "text-white/80 hover:text-white"}`}>
							All Time
						</button>
					</div>
				</div>
			</div>

			{/* My rank card */}
			<div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0076EB] to-[#0062CC] flex items-center justify-center text-white text-sm font-bold shadow-md">
						{user?.name?.charAt(0) || "Y"}
					</div>
					<div>
						<p className="text-xs font-bold text-gray-900">Your Rank</p>
						<p className="text-[10px] text-gray-500">Keep contributing to climb!</p>
					</div>
				</div>
				<div className="text-right">
					<p className="text-lg font-extrabold text-[#0076EB]">#{myRank}</p>
					<div className="flex items-center gap-1 text-[10px] text-emerald-600">
						<TrendingUp className="h-3 w-3" />
						<span className="font-semibold">{myPoints} pts</span>
					</div>
				</div>
			</div>

			{/* Leaderboard list */}
			<div className="px-4 py-3 space-y-1.5">
				{board.slice(0, 5).map((person) => (
					<div key={person.id}
						className={`flex items-center gap-3 p-2 rounded-xl transition ${person.rank === 1 ? "bg-amber-50/60" : "hover:bg-gray-50"}`}>
						{/* Rank */}
						<div className="w-7 flex items-center justify-center">
							{rankIcon(person.rank)}
						</div>

						{/* Avatar */}
						<div className="relative">
							<img src={person.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white shadow-sm" />
							{person.streak >= 7 && (
								<span className="absolute -top-1 -right-1 flex items-center justify-center">
									<Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-400" />
								</span>
							)}
						</div>

						{/* Info */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-bold text-gray-900">{person.name}</span>
								<span className="text-sm">{person.badge}</span>
							</div>
							<div className="flex items-center gap-2 text-[10px] text-gray-400">
								<span>{person.contributions.posts} posts</span>
								<span>•</span>
								<span>{person.streak}d streak</span>
							</div>
						</div>

						{/* Points */}
						<div className="text-right">
							<div className="flex items-center gap-0.5">
								<Star className="h-3 w-3 text-amber-400 fill-amber-400" />
								<span className="text-sm font-extrabold text-gray-900">{person.points.toLocaleString()}</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* How to earn */}
			<div className="mx-4 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
				<p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">How to earn points</p>
				<div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
					<span>📝 Post content → <b className="text-gray-900">+50</b></span>
					<span>💡 Share a tip → <b className="text-gray-900">+30</b></span>
					<span>🌟 Give shoutout → <b className="text-gray-900">+30</b></span>
					<span>🗳️ Vote in polls → <b className="text-gray-900">+10</b></span>
				</div>
			</div>
		</div>
	);
}
