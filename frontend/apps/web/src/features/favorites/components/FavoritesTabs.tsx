const TABS = ["All", "Food", "Events", "Housing"];

export default function FavoritesTabs({
	active,
	onChange,
}: {
	active: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex gap-2 overflow-x-auto pb-1">
			{TABS.map((tab) => (
				<button
					key={tab}
					type="button"
					onClick={() => onChange(tab)}
					className={`rounded-full px-3 py-1 text-xs font-semibold ${
						active === tab ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
					}`}
				>
					{tab}
				</button>
			))}
		</div>
	);
}
