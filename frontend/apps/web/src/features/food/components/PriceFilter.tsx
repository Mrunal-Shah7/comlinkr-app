type Props = {
	selected: string | null;
	onSelect: (price: string | null) => void;
};

const PRICES = ["$", "$$", "$$$"];

export default function PriceFilter({ selected, onSelect }: Props) {
	return (
		<div className="flex gap-2">
			{PRICES.map((price) => (
				<button
					key={price}
					onClick={() => onSelect(selected === price ? null : price)}
					className={`rounded-lg border px-4 py-2 text-xs font-semibold transition-all duration-200 ${
						selected === price
							? 'bg-[#1a8a18] text-white border-transparent shadow-md'
							: 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#1a8a18] hover:text-[#1a8a18]'
					}`}
				>
					{price}
				</button>
			))}
		</div>
	);
}
