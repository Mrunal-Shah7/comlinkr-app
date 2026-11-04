import { useState } from "react";
import { MessageCircle } from "lucide-react";
import Card from "../../../shared/ui/Card";
import { CommunityQuestion } from "../community.types";
import VoteBar from "./VoteBar";
import { useToast } from "../../../shared/hooks/useToast";

type Props = {
	question: CommunityQuestion;
	onVote: (questionId: string) => void;
	onAnswer: (questionId: string) => void;
};

export default function QACard({ question, onVote, onAnswer }: Props) {
	const [hasVoted, setHasVoted] = useState(false);
	const { notify } = useToast();

	const handleVote = () => {
		if (hasVoted) {
			notify("You've already voted on this question");
			return;
		}
		onVote(question.id);
		setHasVoted(true);
		notify("Vote recorded!");
	};

	const handleAnswer = () => {
		const answer = prompt("Write your answer:");
		if (answer && answer.trim()) {
			onAnswer(question.id);
			notify("Answer posted! (In production, this would be saved to the backend)");
		}
	};

	return (
		<Card className="flex gap-4 hover:shadow-md transition-shadow bg-white border-2 border-gray-100">
			<VoteBar votes={question.votes} onVote={handleVote} hasVoted={hasVoted} />
			<div className="flex-1">
				<h3 className="text-sm font-semibold text-gray-900">{question.title}</h3>
				<p className="mt-1 text-xs text-gray-600 leading-relaxed">{question.excerpt}</p>
				{question.tags.length > 0 && (
					<div className="mt-3 flex flex-wrap gap-2">
						{question.tags.map((tag) => (
							<span key={tag} className="rounded-full bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 px-3 py-1 text-[10px] font-semibold text-blue-700">
								{tag}
							</span>
						))}
					</div>
				)}
				<div className="mt-4 flex items-center justify-between text-xs">
					<button
						onClick={handleAnswer}
						className="flex items-center gap-1 text-[#0076EB] hover:text-[#26B324] font-semibold transition-colors"
					>
						<MessageCircle className="h-3.5 w-3.5" />
						{question.answers} {question.answers === 1 ? 'answer' : 'answers'}
					</button>
					<span className="text-gray-500">
						{question.author} · {question.time}
					</span>
				</div>
			</div>
		</Card>
	);
}
