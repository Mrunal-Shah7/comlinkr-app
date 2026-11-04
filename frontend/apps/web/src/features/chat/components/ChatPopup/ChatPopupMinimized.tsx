import { MessageCircle } from "lucide-react";

export default function ChatPopupMinimized({ onOpen }: { onOpen: () => void }) {
	return (
		<button
			type="button"
			onClick={onOpen}
			className="btn-active flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl"
		>
			<MessageCircle className="h-6 w-6" />
		</button>
	);
}
