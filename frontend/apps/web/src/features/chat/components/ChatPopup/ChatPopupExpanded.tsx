import Card from "../../../../shared/ui/Card";
import { chatMessages } from "../../../../shared/data/mock/comlinkr.mock";
import ChatBubble from "../ChatBubble";
import ChatHeader from "../ChatHeader";
import ChatInput from "../ChatInput";

export default function ChatPopupExpanded({ onClose }: { onClose: () => void }) {
	return (
		<Card className="w-[320px] rounded-3xl p-4 shadow-2xl">
			<ChatHeader title="Event Chat" onClose={onClose} />
			<div className="mt-3 flex max-h-64 flex-col gap-3 overflow-y-auto">
				{chatMessages.map((message) => (
					<ChatBubble key={message.id} message={message} />
				))}
			</div>
			<div className="mt-3">
				<ChatInput />
			</div>
		</Card>
	);
}
