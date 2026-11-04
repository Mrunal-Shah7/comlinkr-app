import { useState, useEffect } from "react";
import { BarChart2, CheckCircle2, Sparkles } from "lucide-react";

interface Poll {
	id: string;
	question: string;
	options: { id: string; text: string; votes: number }[];
	totalVotes: number;
	expiresIn: string;
	category: string;
	createdBy: string;
}

const POLLS_KEY = "comlinkr_polls";
const VOTES_KEY = "comlinkr_poll_votes";

const DEFAULT_POLLS: Poll[] = [
	{
		id: "p1",
		question: "What should the city prioritize next?",
		options: [
			{ id: "p1a", text: "🚲 More bike lanes", votes: 234 },
			{ id: "p1b", text: "🌳 Public parks", votes: 187 },
			{ id: "p1c", text: "🚌 Better transit", votes: 312 },
			{ id: "p1d", text: "🏘️ Affordable housing", votes: 445 },
		],
		totalVotes: 1178,
		expiresIn: "2d left",
		category: "Community",
		createdBy: "City Council",
	},
	{
		id: "p2",
		question: "Best cuisine for a neighborhood food fest?",
		options: [
			{ id: "p2a", text: "🍕 Italian", votes: 156 },
			{ id: "p2b", text: "🌮 Mexican", votes: 203 },
			{ id: "p2c", text: "🍜 Asian Fusion", votes: 178 },
			{ id: "p2d", text: "🍔 American BBQ", votes: 134 },
		],
		totalVotes: 671,
		expiresIn: "5d left",
		category: "Food",
		createdBy: "Food Committee",
	},
	{
		id: "p3",
		question: "What type of events do you want more of?",
		options: [
			{ id: "p3a", text: "🎵 Live music nights", votes: 289 },
			{ id: "p3b", text: "🏋️ Fitness meetups", votes: 176 },
			{ id: "p3c", text: "🎨 Art & culture", votes: 213 },
			{ id: "p3d", text: "💻 Tech/networking", votes: 198 },
		],
		totalVotes: 876,
		expiresIn: "3d left",
		category: "Events",
		createdBy: "Community Board",
	},
];

export default function QuickPolls() {
	const [polls, setPolls] = useState<Poll[]>([]);
	const [myVotes, setMyVotes] = useState<Record<string, string>>({});
	const [activePoll, setActivePoll] = useState(0);
	const [animatingOption, setAnimatingOption] = useState<string | null>(null);

	useEffect(() => {
		const storedPolls = localStorage.getItem(POLLS_KEY);
		const storedVotes = localStorage.getItem(VOTES_KEY);
		if (storedPolls) {
			try { setPolls(JSON.parse(storedPolls)); } catch { setPolls(DEFAULT_POLLS); }
		} else {
			setPolls(DEFAULT_POLLS);
			localStorage.setItem(POLLS_KEY, JSON.stringify(DEFAULT_POLLS));
		}
		if (storedVotes) {
			try { setMyVotes(JSON.parse(storedVotes)); } catch { /* empty */ }
		}
	}, []);

	function handleVote(pollId: string, optionId: string) {
		const prev = myVotes[pollId];

		setAnimatingOption(optionId);
		setTimeout(() => setAnimatingOption(null), 600);

		if (prev === optionId) {
			const updatedPolls = polls.map(p => {
				if (p.id !== pollId) return p;
				return {
					...p,
					totalVotes: Math.max(0, p.totalVotes - 1),
					options: p.options.map(o =>
						o.id === optionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o
					),
				};
			});
			const { [pollId]: _removed, ...restVotes } = myVotes;
			setPolls(updatedPolls);
			setMyVotes(restVotes);
			localStorage.setItem(POLLS_KEY, JSON.stringify(updatedPolls));
			localStorage.setItem(VOTES_KEY, JSON.stringify(restVotes));
			return;
		}

		const updatedPolls = polls.map(p => {
			if (p.id !== pollId) return p;
			if (!prev) {
				return {
					...p,
					totalVotes: p.totalVotes + 1,
					options: p.options.map(o =>
						o.id === optionId ? { ...o, votes: o.votes + 1 } : o
					),
				};
			}
			return {
				...p,
				options: p.options.map(o => {
					if (o.id === optionId) return { ...o, votes: o.votes + 1 };
					if (o.id === prev) return { ...o, votes: Math.max(0, o.votes - 1) };
					return o;
				}),
			};
		});

		const updatedVotes = { ...myVotes, [pollId]: optionId };
		setPolls(updatedPolls);
		setMyVotes(updatedVotes);
		localStorage.setItem(POLLS_KEY, JSON.stringify(updatedPolls));
		localStorage.setItem(VOTES_KEY, JSON.stringify(updatedVotes));
	}

	if (polls.length === 0) return null;
	const poll = polls[activePoll % polls.length];
	const hasVoted = !!myVotes[poll.id];
	const maxVotes = Math.max(...poll.options.map(o => o.votes));

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-[#0076EB] to-[#0062CC] px-4 py-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<BarChart2 className="h-4 w-4 text-white" />
					<span className="text-sm font-bold text-white">Community Poll</span>
					<Sparkles className="h-3.5 w-3.5 text-yellow-300" />
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[10px] text-white/70 bg-white/20 px-2 py-0.5 rounded-full">{poll.expiresIn}</span>
					{/* Dots */}
					<div className="flex gap-1">
						{polls.map((_, i) => (
							<button key={i} onClick={() => setActivePoll(i)}
								className={`h-1.5 rounded-full transition-all ${i === activePoll % polls.length ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} />
						))}
					</div>
				</div>
			</div>

			<div className="p-4">
				<h3 className="text-base font-bold text-gray-900 mb-1">{poll.question}</h3>
				<p className="text-[11px] text-gray-400 mb-3">
					by {poll.createdBy} • {poll.totalVotes.toLocaleString()} votes • {poll.category}
				</p>

				<div className="space-y-2">
					{poll.options.map((option) => {
						const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
						const isMyVote = myVotes[poll.id] === option.id;
						const isWinning = option.votes === maxVotes && hasVoted;
						const isAnimating = animatingOption === option.id;

						return (
							<button key={option.id} onClick={() => handleVote(poll.id, option.id)}
								className={`relative w-full text-left rounded-xl border-2 overflow-hidden transition-all ${isAnimating ? "scale-[1.02]" : ""
									} ${isMyVote
										? "border-[#0076EB] bg-blue-50/50"
										: hasVoted
											? "border-gray-100 bg-gray-50/50"
											: "border-gray-200 hover:border-[#0076EB]/50 hover:bg-blue-50/30"
									}`}
							>
								{/* Progress bar fill */}
								{hasVoted && (
									<div className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-xl ${isWinning ? "bg-[#0076EB]/10" : "bg-gray-100/80"
										}`}
										style={{ width: `${pct}%` }} />
								)}

								<div className="relative flex items-center justify-between px-3.5 py-2.5">
									<div className="flex items-center gap-2">
										{isMyVote && (
											<CheckCircle2 className="h-4 w-4 text-[#0076EB] flex-shrink-0" />
										)}
										<span className={`text-sm ${isMyVote ? "font-bold text-[#0076EB]" : hasVoted ? "font-medium text-gray-600" : "font-medium text-gray-700"}`}>
											{option.text}
										</span>
									</div>
									{hasVoted && (
										<span className={`text-sm font-bold ${isWinning ? "text-[#0076EB]" : "text-gray-400"}`}>
											{pct}%
										</span>
									)}
								</div>
							</button>
						);
					})}
				</div>

				<p className="text-[10px] text-gray-400 mt-2.5 text-center">
					{hasVoted
						? "Tap another option to switch, or your pick again to remove your vote"
						: "Tap to vote • Results shown after voting"}
				</p>
			</div>
		</div>
	);
}
