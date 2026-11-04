import { Link2, Send, Share2 } from "lucide-react";
import Button from "../../../shared/ui/Button";
import Card from "../../../shared/ui/Card";

export default function ShareSheet() {
	return (
		<Card className="bg-gray-50">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-semibold text-gray-900">Share this update</p>
					<p className="text-xs text-gray-500">Send to friends or copy link.</p>
				</div>
				<Share2 className="h-5 w-5 text-gray-400" />
			</div>
			<div className="mt-3 flex gap-2">
				<Button variant="outline" tone="gray" size="sm" className="flex-1">
					<Link2 className="h-4 w-4" />
					Copy Link
				</Button>
				<Button variant="primary" tone="blue" size="sm" className="flex-1">
					<Send className="h-4 w-4" />
					Share
				</Button>
			</div>
		</Card>
	);
}
