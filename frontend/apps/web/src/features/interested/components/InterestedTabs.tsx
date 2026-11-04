const TABS = ["Upcoming", "Past"]; 

export default function InterestedTabs() {
	return (
		<div className="flex gap-2">
			{TABS.map((tab, index) => (
				<button
					key={tab}
					type="button"
					className={`rounded-full px-3 py-1 text-xs font-semibold ${
						index === 0 ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
					}`}
				>
					{tab}
				</button>
			))}
		</div>
	);
}
