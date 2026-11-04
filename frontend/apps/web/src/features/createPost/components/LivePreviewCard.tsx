import Card from "../../../shared/ui/Card";
import SectionTag from "../../../shared/ui/SectionTag";

export default function LivePreviewCard() {
	return (
		<Card className="bg-gray-900 text-white">
			<div className="flex items-center justify-between">
				<SectionTag label="Preview" color="#ffffff" />
				<span className="text-xs text-white/70">Live</span>
			</div>
			<h3 className="mt-3 text-base font-semibold">Neighborhood Meetup</h3>
			<p className="mt-1 text-sm text-white/70">Sat, Feb 10 · 6:30 PM · Chelsea</p>
		</Card>
	);
}
