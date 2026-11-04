import { Send } from "lucide-react";

export default function ChatInput() {
	return (
		<div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2">
			<input
				className="flex-1 text-sm text-gray-700 outline-none"
				placeholder="Write a message..."
			/>
			<button type="button" className="text-gray-900">
				<Send className="h-4 w-4" />
			</button>
		</div>
	);
}
