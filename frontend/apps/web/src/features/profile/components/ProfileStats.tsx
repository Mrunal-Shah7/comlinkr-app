import Card from "../../../shared/ui/Card";
import { ProfileStats as ProfileStatsType } from "../profile.types";

export default function ProfileStats({ stats }: { stats: ProfileStatsType }) {
	return (
		<Card className="grid grid-cols-3 gap-4 text-center py-4">
			<div>
				<p className="text-2xl font-bold text-gray-900">{stats.saved}</p>
				<p className="text-xs text-gray-600 font-medium mt-1">Saved</p>
			</div>
			<div>
				<p className="text-2xl font-bold text-gray-900">{stats.interested}</p>
				<p className="text-xs text-gray-600 font-medium mt-1">Interested</p>
			</div>
			<div>
				<p className="text-2xl font-bold text-gray-900">{stats.posts}</p>
				<p className="text-xs text-gray-600 font-medium mt-1">Posts</p>
			</div>
		</Card>
	);
}
