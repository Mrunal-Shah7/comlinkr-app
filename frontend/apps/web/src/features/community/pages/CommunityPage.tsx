import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import SectionHeader from "../../../app/layout/SectionHeader";
import Button from "../../../shared/ui/Button";
import { communityQuestions as initialQuestions } from "../../../shared/data/mock/comlinkr.mock";
import AskQuestionSheet from "../components/AskQuestionSheet";
import QACard from "../components/QACard";
import TopicChips from "../components/TopicChips";
import { CommunityQuestion } from "../community.types";

const STORAGE_KEY = 'comlinkr_community_questions';

export default function CommunityPage() {
	const [showAskModal, setShowAskModal] = useState(false);
	const [questions, setQuestions] = useState<CommunityQuestion[]>([]);
	const [activeFilter, setActiveFilter] = useState<string | null>(null);

	// Load questions from localStorage on mount
	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				setQuestions(JSON.parse(stored));
			} catch {
				setQuestions(initialQuestions);
			}
		} else {
			setQuestions(initialQuestions);
		}
	}, []);

	// Save to localStorage whenever questions change
	useEffect(() => {
		if (questions.length > 0) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
		}
	}, [questions]);

	const handleAddQuestion = (newQuestion: CommunityQuestion) => {
		setQuestions([newQuestion, ...questions]);
		setShowAskModal(false);
	};

	const handleVote = (questionId: string) => {
		setQuestions(questions.map(q => 
			q.id === questionId ? { ...q, votes: q.votes + 1 } : q
		));
	};

	const handleAnswer = (questionId: string) => {
		setQuestions(questions.map(q => 
			q.id === questionId ? { ...q, answers: q.answers + 1 } : q
		));
	};

	const filteredQuestions = activeFilter 
		? questions.filter(q => q.tags.includes(activeFilter))
		: questions;

	return (
		<>
			<div className="space-y-5">
				<div className="rounded-3xl bg-gradient-to-br from-[#0076EB] via-blue-500 to-[#26B324] px-5 py-6 text-white shadow-lg">
					<p className="text-xs font-semibold uppercase tracking-wide text-white/80">Community Q&A</p>
					<h2 className="mt-2 text-2xl font-bold">Ask. Answer. Connect.</h2>
					<p className="mt-1 text-sm text-white/90">Get local tips from people around you.</p>
					<button 
						onClick={() => setShowAskModal(true)}
						className="mt-4 w-full flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-3.5 text-left shadow-md hover:bg-white transition group"
					>
						<div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0076EB] to-[#26B324] flex items-center justify-center flex-shrink-0">
							<MessageCircle className="h-4 w-4 text-white" />
						</div>
						<span className="text-gray-500 text-sm flex-1">What do you need help with?</span>
						<span className="text-[#0076EB] text-xs font-semibold group-hover:underline">Ask</span>
					</button>
				</div>

				<TopicChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />

				<SectionHeader 
					title={activeFilter ? `Questions about ${activeFilter}` : "Latest Questions"} 
					action={activeFilter ? (
						<button 
							onClick={() => setActiveFilter(null)}
							className="text-xs text-[#0076EB] font-semibold hover:underline"
						>
							Clear filter
						</button>
					) : undefined}
				/>
				<div className="space-y-4">
					{filteredQuestions.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
							<MessageCircle className="mx-auto h-12 w-12 text-gray-300" />
							<p className="mt-3 text-sm font-medium text-gray-500">
								{activeFilter ? `No questions found for "${activeFilter}"` : "No questions yet"}
							</p>
							<Button 
								variant="primary" 
								tone="blue" 
								className="mt-4"
								onClick={() => setShowAskModal(true)}
							>
								Be the first to ask
							</Button>
						</div>
					) : (
						filteredQuestions.map((question) => (
							<QACard 
								key={question.id} 
								question={question} 
								onVote={handleVote}
								onAnswer={handleAnswer}
							/>
						))
					)}
				</div>
			</div>

			{showAskModal && (
				<AskQuestionSheet 
					onClose={() => setShowAskModal(false)}
					onSubmit={handleAddQuestion}
				/>
			)}
		</>
	);
}
