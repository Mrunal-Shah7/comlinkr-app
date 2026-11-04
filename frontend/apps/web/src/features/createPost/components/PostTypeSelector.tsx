import { CalendarPlus, Newspaper } from "lucide-react";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";
import { PostType } from "../createPost.types";

export default function PostTypeSelector({
	value,
	onChange,
}: {
	value: PostType;
	onChange: (type: PostType) => void;
}) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<Card className="border-blue-100 bg-blue-50">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-semibold text-gray-900">Create News</p>
						<p className="text-xs text-gray-500">Share updates with the city.</p>
					</div>
					<Newspaper className="h-5 w-5 text-brand-blue" />
				</div>
				<Button
					variant={value === "news" ? "primary" : "outline"}
					tone="blue"
					size="sm"
					className="mt-3 w-full"
					onClick={() => onChange("news")}
				>
					{value === "news" ? "Selected" : "Choose"}
				</Button>
			</Card>

			<Card className="border-orange-100 bg-orange-50">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-semibold text-gray-900">Create Event</p>
						<p className="text-xs text-gray-500">Invite people to hang out.</p>
					</div>
					<CalendarPlus className="h-5 w-5 text-brand-orange" />
				</div>
				<Button
					variant={value === "event" ? "primary" : "outline"}
					tone="orange"
					size="sm"
					className="mt-3 w-full"
					onClick={() => onChange("event")}
				>
					{value === "event" ? "Selected" : "Choose"}
				</Button>
			</Card>
		</div>
	);
}
