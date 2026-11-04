import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, MoreVertical } from "lucide-react";
import { chatMessages as initialMessages } from "../../../shared/data/mock/comlinkr.mock";
import ChatBubble from "../components/ChatBubble";
import { useToast } from "../../../shared/hooks/useToast";
import type { ChatMessage } from "../../../shared/types/chat";

type Message = ChatMessage;

const STORAGE_KEY = 'comlinkr_chat_messages';

export default function ChatThreadPage() {
	const { threadId } = useParams();
	const navigate = useNavigate();
	const { notify } = useToast();
	const [messages, setMessages] = useState<Message[]>([]);
	const [newMessage, setNewMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Load messages from localStorage
	useEffect(() => {
		const stored = localStorage.getItem(`${STORAGE_KEY}_${threadId}`);
		if (stored) {
			try {
				setMessages(JSON.parse(stored));
			} catch {
				setMessages(initialMessages);
			}
		} else {
			setMessages(initialMessages);
		}
	}, [threadId]);

	// Save messages to localStorage
	useEffect(() => {
		if (messages.length > 0) {
			localStorage.setItem(`${STORAGE_KEY}_${threadId}`, JSON.stringify(messages));
		}
	}, [messages, threadId]);

	// Auto-scroll to bottom
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = () => {
		if (!newMessage.trim()) return;

		const message: Message = {
			id: `m${Date.now()}`,
			text: newMessage.trim(),
			sender: {
				id: 'me',
				name: 'You',
				handle: 'you',
			},
			createdAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
			isMe: true,
		};

		setMessages([...messages, message]);
		setNewMessage("");
		notify("Message sent!");

		// Simulate response after 2 seconds (real-time ready)
		setTimeout(() => {
			const response: Message = {
				id: `m${Date.now()}`,
				text: "Got it! Thanks for the message.",
				sender: {
					id: 'other',
					name: 'User',
					handle: 'user',
					avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
				},
				createdAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
			};
			setMessages(prev => [...prev, response]);
		}, 2000);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex flex-col h-[calc(100vh-var(--header-height)-var(--bottom-nav-height))]">
			{/* Chat Header */}
			<div className="sticky top-0 z-10 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
				<button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-full transition">
					<ArrowLeft className="h-5 w-5 text-gray-700" />
				</button>
				<img 
					src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" 
					alt="Chat" 
					className="h-10 w-10 rounded-full object-cover"
				/>
				<div className="flex-1">
					<h2 className="font-semibold text-gray-900">Listing Chat</h2>
					<p className="text-xs text-gray-500">Active now</p>
				</div>
				<button className="p-1 hover:bg-gray-100 rounded-full transition">
					<MoreVertical className="h-5 w-5 text-gray-700" />
				</button>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
				{messages.map((msg) => (
					<ChatBubble key={msg.id} message={msg} />
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
				<div className="flex items-center gap-2">
					<input
						type="text"
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder="Type a message..."
						className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-[#0076EB] focus:outline-none focus:ring-2 focus:ring-[#0076EB]/20"
					/>
					<button
						onClick={handleSend}
						disabled={!newMessage.trim()}
						className="rounded-full bg-gradient-to-r from-[#0076EB] to-[#26B324] p-3 text-white shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Send className="h-5 w-5" />
					</button>
				</div>
			</div>
		</div>
	);
}