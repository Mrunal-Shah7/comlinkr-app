type Props = {
	selected: string | null;
	onSelect: (cuisine: string | null) => void;
};

const CUISINES = ["italian", "korean", "japanese", "mexican", "chinese", "healthy", "vegan", "american"];

export default function CuisineFilter({ selected, onSelect }: Props) {
	return (
		<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
			{CUISINES.map((cuisine) => (
				<button
					key={cuisine}
					onClick={() => onSelect(selected === cuisine ? null : cuisine)}
					className={`shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-200 capitalize ${
						selected === cuisine
							? 'bg-[#1a8a18] text-white border-transparent shadow-md'
							: 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#1a8a18] hover:text-[#1a8a18]'
					}`}
				>
					{cuisine}
				</button>
			))}
		</div>
	);
}
