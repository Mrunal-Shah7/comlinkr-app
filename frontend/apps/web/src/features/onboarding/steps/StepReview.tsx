export default function StepReview({
	city,
	culture,
	interests,
}: {
	city: string;
	culture: string[];
	interests: string[];
}) {
	return (
		<div className="space-y-3">
			<h2 className="text-xl font-semibold text-gray-900">You’re ready</h2>
			<p className="text-sm text-gray-500">Here’s a quick summary before we start.</p>
			<div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
				<p className="font-semibold text-gray-900">City</p>
				<p className="mb-3 text-sm text-gray-600">{city}</p>
				<p className="font-semibold text-gray-900">Culture</p>
				<p className="mb-3 text-sm text-gray-600">{culture.join(", ")}</p>
				<p className="font-semibold text-gray-900">Interests</p>
				<p className="text-sm text-gray-600">{interests.join(", ")}</p>
			</div>
		</div>
	);
}
