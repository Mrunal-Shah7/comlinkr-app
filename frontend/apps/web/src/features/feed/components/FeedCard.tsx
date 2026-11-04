import { MapPin } from "lucide-react";
import Card from "../../../shared/ui/Card";
import SectionTag from "../../../shared/ui/SectionTag";
import { NewsPost } from "../../../shared/types/post";

export default function FeedCard({ post }: { post: NewsPost }) {
	return (
		<Card interactive className="overflow-hidden p-0">
			{post.image ? (
				<div className="h-32 w-full bg-gray-200">
					<img src={post.image} alt={post.title} className="h-full w-full object-cover" />
				</div>
			) : null}
			<div className="p-4">
				<div className="flex items-center justify-between">
					<SectionTag label="News" color="var(--brand-blue)" />
					<span className="text-xs text-gray-400">{post.time}</span>
				</div>
				<h3 className="mt-3 text-base font-semibold text-gray-900">{post.title}</h3>
				<p className="mt-1 text-sm text-gray-600">{post.summary}</p>
				<div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
					<MapPin className="h-4 w-4" />
					{post.location.city} · {post.location.area}
				</div>
			</div>
		</Card>
	);
}
