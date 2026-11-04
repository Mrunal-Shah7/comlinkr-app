const OPTIONS = ["Coffee", "Art", "Fitness", "Nightlife", "Family", "Wellness"];

export default function StepDietary({
	selected,
	onChange,
}: {
	selected: string[];
	onChange: (next: string[]) => void;
}) {
	const toggle = (value: string) => {
		if (selected.includes(value)) {
			onChange(selected.filter((item) => item !== value));
		} else {
			onChange([...selected, value]);
		}
	};

	return (
		<div className="space-y-3">
			<h2 className="text-xl font-semibold text-gray-900">Cultural preferences</h2>
			<p className="text-sm text-gray-500">Pick a few topics you enjoy.</p>
			<div className="flex flex-wrap gap-2">
				{OPTIONS.map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => toggle(option)}
						className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
							selected.includes(option) ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
						}`}
					>
						{option}
					</button>
				))}
			</div>
		</div>
	);
}
