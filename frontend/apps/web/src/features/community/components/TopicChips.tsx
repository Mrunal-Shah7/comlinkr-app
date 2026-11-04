type Props = {
	activeFilter: string | null;
	onFilterChange: (filter: string | null) => void;
};

const TOPICS = ["housing", "food", "events", "social", "safety", "work", "sports", "tech"];

export default function TopicChips({ activeFilter, onFilterChange }: Props) {
	return (
		<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
			<button
				onClick={() => onFilterChange(null)}
				className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all ${
					activeFilter === null
						? 'bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white border-transparent shadow-md'
						: 'border-gray-200 bg-white text-gray-700 hover:border-[#0076EB]'
				}`}
			>
				All Topics
			</button>
			{TOPICS.map((topic) => (
				<button
					key={topic}
					onClick={() => onFilterChange(topic)}
					className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-all capitalize ${
						activeFilter === topic
							? 'bg-gradient-to-r from-[#0076EB] to-[#26B324] text-white border-transparent shadow-md'
							: 'border-gray-200 bg-white text-gray-700 hover:border-[#0076EB]'
					}`}
				>
					{topic}
				</button>
			))}
		</div>
	);
}
