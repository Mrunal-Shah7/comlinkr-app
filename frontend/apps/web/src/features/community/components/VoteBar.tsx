import { ArrowBigUp } from "lucide-react";

type Props = {
	votes: number;
	onVote: () => void;
	hasVoted?: boolean;
};

export default function VoteBar({ votes, onVote, hasVoted = false }: Props) {
	return (
		<button
			onClick={onVote}
			className={`flex flex-col items-center justify-center rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
				hasVoted 
					? 'bg-gradient-to-br from-[#0076EB] to-[#26B324] text-white shadow-md' 
					: 'bg-gray-100 text-gray-600 hover:bg-gradient-to-br hover:from-[#0076EB] hover:to-[#26B324] hover:text-white hover:shadow-md'
			}`}
			title={hasVoted ? "You voted" : "Vote up"}
		>
			<ArrowBigUp className={`h-4 w-4 transition-transform ${
				hasVoted ? 'scale-110' : 'group-hover:scale-110'
			}`} />
			{votes}
		</button>
	);
}
