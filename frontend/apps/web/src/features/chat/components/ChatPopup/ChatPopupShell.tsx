import { useState } from "react";
import ChatPopupExpanded from "./ChatPopupExpanded";
import ChatPopupMinimized from "./ChatPopupMinimized";

export default function ChatPopupShell() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="fixed bottom-[calc(var(--bottom-nav-height)+16px)] right-4 z-40">
			{isOpen ? (
				<ChatPopupExpanded onClose={() => setIsOpen(false)} />
			) : (
				<ChatPopupMinimized onOpen={() => setIsOpen(true)} />
			)}
		</div>
	);
}
