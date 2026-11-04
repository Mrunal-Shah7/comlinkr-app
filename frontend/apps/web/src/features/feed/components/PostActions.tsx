import { Bookmark, Share2, ThumbsUp } from "lucide-react";

export default function PostActions() {
	const items = [
		{ icon: ThumbsUp, label: "Like" },
		{ icon: Share2, label: "Share" },
		{ icon: Bookmark, label: "Save" },
	];

	return (
		<div className="flex items-center gap-3 text-xs text-gray-500">
			{items.map(({ icon: Icon, label }) => (
				<button key={label} type="button" className="inline-flex items-center gap-1">
					<Icon className="h-4 w-4" />
					{label}
				</button>
			))}
		</div>
	);
}
