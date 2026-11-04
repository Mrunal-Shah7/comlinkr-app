const OPTIONS = [
	{ id: "housing", label: "Housing" },
	{ id: "food", label: "Food" },
	{ id: "community", label: "Community" },
	{ id: "events", label: "Events" },
];

export default function StepLifestyle({
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
			<h2 className="text-xl font-semibold text-gray-900">Choose your interests</h2>
			<p className="text-sm text-gray-500">We’ll highlight the sections you care about.</p>
			<div className="grid gap-3 sm:grid-cols-2">
				{OPTIONS.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={() => toggle(option.id)}
						className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
							selected.includes(option.id)
								? "border-gray-900 bg-gray-900 text-white"
								: "border-gray-200 bg-white text-gray-700"
						}`}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}
