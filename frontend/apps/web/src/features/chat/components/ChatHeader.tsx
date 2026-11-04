import { X } from "lucide-react";

export default function ChatHeader({ title, onClose }: { title: string; onClose?: () => void }) {
	return (
		<div className="flex items-center justify-between border-b border-gray-200 pb-2">
			<div>
				<p className="text-sm font-semibold text-gray-900">{title}</p>
				<p className="text-xs text-gray-500">Active now</p>
			</div>
			<button type="button" onClick={onClose} className="text-gray-400">
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
