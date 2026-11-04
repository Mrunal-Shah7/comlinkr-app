import { useState, useEffect } from "react";
import { Zap, ArrowLeft, ArrowRight, Users, BarChart3 } from "lucide-react";

interface WouldYouRatherQ {
	id: string;
	optionA: string;
	optionB: string;
	votesA: number;
	votesB: number;
	category: string;
}

const WYR_KEY = "comlinkr_wyr";
const WYR_VOTES_KEY = "comlinkr_wyr_votes";

const DEFAULT_QUESTIONS: WouldYouRatherQ[] = [
	{ id: "wyr1", optionA: "Live in a tiny studio in the city center", optionB: "Live in a big house 1 hour away", votesA: 432, votesB: 367, category: "Housing" },
	{ id: "wyr2", optionA: "Only eat street food for a year", optionB: "Only eat home-cooked meals for a year", votesA: 289, votesB: 512, category: "Food" },
	{ id: "wyr3", optionA: "Know every neighbor by name", optionB: "Have complete privacy from neighbors", votesA: 623, votesB: 341, category: "Community" },
	{ id: "wyr4", optionA: "Free public transit forever", optionB: "Free food delivery forever", votesA: 556, votesB: 478, category: "Life" },
	{ id: "wyr5", optionA: "Live near the best restaurants", optionB: "Live near the best parks", votesA: 345, votesB: 498, category: "Lifestyle" },
	{ id: "wyr6", optionA: "Always find parking instantly", optionB: "Never wait in line at any restaurant", votesA: 401, votesB: 389, category: "Daily life" },
];

export default function WouldYouRather() {
	const [questions, setQuestions] = useState<WouldYouRatherQ[]>([]);
	const [myVotes, setMyVotes] = useState<Record<string, "A" | "B">>({});
	const [current, setCurrent] = useState(0);
	const [animating, setAnimating] = useState<"A" | "B" | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(WYR_KEY);
		const storedVotes = localStorage.getItem(WYR_VOTES_KEY);
		if (stored) {
			try { setQuestions(JSON.parse(stored)); } catch { setQuestions(DEFAULT_QUESTIONS); }
		} else {
			setQuestions(DEFAULT_QUESTIONS);
			localStorage.setItem(WYR_KEY, JSON.stringify(DEFAULT_QUESTIONS));
		}
		if (storedVotes) {
			try { setMyVotes(JSON.parse(storedVotes)); } catch { /* skip */ }
		}
	}, []);

	function vote(choice: "A" | "B") {
		const q = questions[current];
		const prev = myVotes[q.id];

		setAnimating(choice);
		setTimeout(() => setAnimating(null), 500);

		if (prev === choice) {
			const updated = questions.map(item => {
				if (item.id !== q.id) return item;
				return {
					...item,
					votesA: choice === "A" ? Math.max(0, item.votesA - 1) : item.votesA,
					votesB: choice === "B" ? Math.max(0, item.votesB - 1) : item.votesB,
				};
			});
			const { [q.id]: _removed, ...restVotes } = myVotes;
			setQuestions(updated);
			setMyVotes(restVotes);
			localStorage.setItem(WYR_KEY, JSON.stringify(updated));
			localStorage.setItem(WYR_VOTES_KEY, JSON.stringify(restVotes));
			return;
		}

		const updated = questions.map(item => {
			if (item.id !== q.id) return item;
			if (!prev) {
				return {
					...item,
					votesA: choice === "A" ? item.votesA + 1 : item.votesA,
					votesB: choice === "B" ? item.votesB + 1 : item.votesB,
				};
			}
			return {
				...item,
				votesA: item.votesA + (choice === "A" ? 1 : 0) - (prev === "A" ? 1 : 0),
				votesB: item.votesB + (choice === "B" ? 1 : 0) - (prev === "B" ? 1 : 0),
			};
		});
		const updatedVotes = { ...myVotes, [q.id]: choice };
		setQuestions(updated);
		setMyVotes(updatedVotes);
		localStorage.setItem(WYR_KEY, JSON.stringify(updated));
		localStorage.setItem(WYR_VOTES_KEY, JSON.stringify(updatedVotes));
	}

	function goNext() { setCurrent(i => (i + 1) % questions.length); }
	function goPrev() { setCurrent(i => (i - 1 + questions.length) % questions.length); }

	if (questions.length === 0) return null;
	const q = questions[current];
	const hasVoted = !!myVotes[q.id];
	const totalVotes = q.votesA + q.votesB;
	const pctA = totalVotes > 0 ? Math.round((q.votesA / totalVotes) * 100) : 50;
	const pctB = 100 - pctA;
	const myChoice = myVotes[q.id];

	return (
		<div className="bg-white rounded-2xl shadow-brand-md overflow-hidden">
			{/* Header */}
			<div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Zap className="h-4 w-4 text-yellow-300" />
					<span className="text-sm font-bold text-white">Would You Rather</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[10px] text-white/70 bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
						<Users className="h-3 w-3" /> {totalVotes.toLocaleString()} votes
					</span>
					<div className="flex gap-1">
						<button onClick={goPrev} className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
							<ArrowLeft className="h-3 w-3 text-white" />
						</button>
						<button onClick={goNext} className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition">
							<ArrowRight className="h-3 w-3 text-white" />
						</button>
					</div>
				</div>
			</div>

			<div className="p-4">
				<p className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-3">
					{q.category} • Question {current + 1} of {questions.length}
				</p>

				{/* Options */}
				<div className="space-y-2.5">
					{/* Option A */}
					<button onClick={() => vote("A")}
						className={`relative w-full text-left rounded-xl overflow-hidden transition-all ${animating === "A" ? "scale-[1.02]" : ""
							} ${myChoice === "A"
								? "ring-2 ring-violet-500 bg-violet-50"
								: hasVoted ? "bg-gray-50" : "bg-gray-50 hover:bg-violet-50 hover:ring-2 hover:ring-violet-200"
							}`}>
						{hasVoted && (
							<div className="absolute inset-y-0 left-0 bg-violet-100 transition-all duration-700 ease-out rounded-xl"
								style={{ width: `${pctA}%` }} />
						)}
						<div className="relative px-4 py-3.5 flex items-center justify-between">
							<div className="flex items-center gap-2.5 flex-1 min-w-0">
								<span className="h-7 w-7 rounded-full bg-violet-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">A</span>
								<span className={`text-sm leading-snug ${myChoice === "A" ? "font-bold text-violet-700" : "font-medium text-gray-700"}`}>
									{q.optionA}
								</span>
							</div>
							{hasVoted && (
								<span className={`text-base font-extrabold flex-shrink-0 ml-2 ${pctA >= pctB ? "text-violet-600" : "text-gray-400"}`}>
									{pctA}%
								</span>
							)}
						</div>
					</button>

					{/* VS divider */}
					<div className="flex items-center gap-3 px-2">
						<div className="flex-1 h-px bg-gray-200" />
						<span className="text-xs font-extrabold text-gray-300 uppercase">or</span>
						<div className="flex-1 h-px bg-gray-200" />
					</div>

					{/* Option B */}
					<button onClick={() => vote("B")}
						className={`relative w-full text-left rounded-xl overflow-hidden transition-all ${animating === "B" ? "scale-[1.02]" : ""
							} ${myChoice === "B"
								? "ring-2 ring-emerald-500 bg-emerald-50"
								: hasVoted ? "bg-gray-50" : "bg-gray-50 hover:bg-emerald-50 hover:ring-2 hover:ring-emerald-200"
							}`}>
						{hasVoted && (
							<div className="absolute inset-y-0 left-0 bg-emerald-100 transition-all duration-700 ease-out rounded-xl"
								style={{ width: `${pctB}%` }} />
						)}
						<div className="relative px-4 py-3.5 flex items-center justify-between">
							<div className="flex items-center gap-2.5 flex-1 min-w-0">
								<span className="h-7 w-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">B</span>
								<span className={`text-sm leading-snug ${myChoice === "B" ? "font-bold text-emerald-700" : "font-medium text-gray-700"}`}>
									{q.optionB}
								</span>
							</div>
							{hasVoted && (
								<span className={`text-base font-extrabold flex-shrink-0 ml-2 ${pctB >= pctA ? "text-emerald-600" : "text-gray-400"}`}>
									{pctB}%
								</span>
							)}
						</div>
					</button>
				</div>

				<p className="text-[10px] text-gray-400 mt-3 text-center">
					{hasVoted
						? "Tap the other side to switch, or the same side again to clear your vote"
						: "Tap your choice — see what your neighbors think!"}
				</p>
				{hasVoted && (
					<div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-gray-400">
						<BarChart3 className="h-3 w-3" />
						<span>{totalVotes.toLocaleString()} neighbors voted</span>
						<span>•</span>
						<button type="button" onClick={goNext} className="text-violet-500 font-semibold hover:underline">Next question →</button>
					</div>
				)}
			</div>
		</div>
	);
}
