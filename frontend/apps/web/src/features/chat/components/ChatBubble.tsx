import { ChatMessage } from "../chat.types";

export default function ChatBubble({ message }: { message: ChatMessage }) {
	return (
		<div className={`flex ${message.isMe ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
					message.isMe ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"
				}`}
			>
				<p>{message.text}</p>
				<span className="mt-1 block text-[10px] text-gray-400">{message.createdAt}</span>
			</div>
		</div>
	);
}
